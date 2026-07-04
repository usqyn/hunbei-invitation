import * as fabric from 'fabric'
import { ref, shallowRef, computed, onMounted, onBeforeUnmount } from 'vue'
import type {
  AnyCanvasElement,
  TextElement,
  ImageElement,
  StickerElement,
  CanvasBackground,
  CanvasSize,
  CanvasDraft,
} from '../types/canvas'
import {
  createId,
  DEFAULT_CANVAS_SIZE,
  DEFAULT_BACKGROUND,
} from '../types/canvas'

/**
 * 画布核心 composable
 *
 * 提供：
 *   - 画布初始化、尺寸、背景配置
 *   - 增加文字/图片/贴纸元素
 *   - 选中元素（被选中元素 → 右侧属性面板）
 *   - 更新选中元素属性
 *   - 撤销/重做：pushHistory() / undo() / redo()
 *   - 序列化：getDraft() / loadDraft()
 */

export interface UseCanvasOptions {
  canvasRef: { value: HTMLCanvasElement | null }
  initialSize?: CanvasSize
  onSelectionChange?: (el: AnyCanvasElement | null) => void
  onBackgroundChange?: (bg: CanvasBackground) => void
}

// 最大历史快照数
const MAX_HISTORY = 50

// 复制缓冲区
let clipboard: AnyCanvasElement | null = null

export function useCanvas(opts: UseCanvasOptions) {
  // 对外暴露的响应式状态
  const canvasSize = ref<CanvasSize>(opts.initialSize ?? { ...DEFAULT_CANVAS_SIZE })
  const background = ref<CanvasBackground>({ ...DEFAULT_BACKGROUND })
  const selectedId = ref<string | null>(null)
  const zoom = ref(1)
  const elements = ref<AnyCanvasElement[]>([])
  const canUndo = ref(false)
  const canRedo = ref(false)

  // 内部 Fabric 实例（用 shallowRef，避免 Vue 响应式包装底层对象）
  const fabricCanvas = shallowRef<fabric.Canvas | null>(null)
  const history = ref<CanvasDraft[]>([])
  const historyIdx = ref(-1)
  let suppressHistory = false

  // 网格与吸附
  const showGrid = ref(false)
  const snapToGrid = ref(false)
  const gridSize = ref(10)
  const guideLines = ref<fabric.Line[]>([])

  // 计算属性：当前选中的元素
  const selectedElement = computed<AnyCanvasElement | null>(() => {
    if (!selectedId.value) return null
    return elements.value.find(e => e.id === selectedId.value) || null
  })

  // ---- 初始化 ----
  function init() {
    if (!opts.canvasRef.value) return

    const canvas = new fabric.Canvas(opts.canvasRef.value, {
      width: canvasSize.value.width,
      height: canvasSize.value.height,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: true,
      controlsAboveOverlay: true,
    })

    fabricCanvas.value = canvas

    // 选中事件 → 同步到 Vue
    canvas.on('selection:created', syncSelectionFromFabric)
    canvas.on('selection:updated', syncSelectionFromFabric)
    canvas.on('selection:cleared', () => {
      selectedId.value = null
      opts.onSelectionChange?.(null)
    })

    // 内联编辑文字退出时 → 同步文字内容到 model
    canvas.on('editing:exited', () => {
      syncTextFromFabric()
      pushHistory('edit text')
    })

    // 对象变更 → push 到历史栈
    canvas.on('object:added', pushHistoryIfNeeded)
    canvas.on('object:removed', pushHistoryIfNeeded)
    canvas.on('object:modified', pushHistoryIfNeeded)

    // 拖拽吸附 + 对齐参考线
    canvas.on('object:moving', (e: any) => {
      const target = e.target
      if (!target) return

      // 网格吸附
      if (snapToGrid.value) {
        const gs = gridSize.value
        target.set({
          left: Math.round(target.left / gs) * gs,
          top: Math.round(target.top / gs) * gs,
        })
      }

      // 对齐参考线（中心线 + 边缘对齐）
      clearGuideLines()
      const w = canvasSize.value.width
      const h = canvasSize.value.height
      const cx = target.left + (target.width * (target.scaleX || 1)) / 2
      const cy = target.top + (target.height * (target.scaleY || 1)) / 2
      const threshold = 5
      const guides: fabric.Line[] = []

      // 画布中心对齐
      if (Math.abs(cx - w / 2) < threshold) {
        target.set({ left: w / 2 - (target.width * (target.scaleX || 1)) / 2 })
        guides.push(new fabric.Line([w / 2, 0, w / 2, h], { stroke: '#e84a6e', strokeWidth: 1, strokeDashArray: [4, 4], selectable: false, evented: false, opacity: 0.8 } as any))
      }
      if (Math.abs(cy - h / 2) < threshold) {
        target.set({ top: h / 2 - (target.height * (target.scaleY || 1)) / 2 })
        guides.push(new fabric.Line([0, h / 2, w, h / 2], { stroke: '#e84a6e', strokeWidth: 1, strokeDashArray: [4, 4], selectable: false, evented: false, opacity: 0.8 } as any))
      }

      // 与其他对象边缘对齐
      canvas.getObjects().forEach((obj: any) => {
        if (obj === target || (obj as any).isGuide) return
        const oLeft = obj.left
        const oTop = obj.top
        const oRight = obj.left + (obj.width * (obj.scaleX || 1))
        const oBottom = obj.top + (obj.height * (obj.scaleY || 1))
        const oCx = (oLeft + oRight) / 2
        const oCy = (oTop + oBottom) / 2
        const tLeft = target.left
        const tTop = target.top
        const tRight = target.left + (target.width * (target.scaleX || 1))
        const tBottom = target.top + (target.height * (target.scaleY || 1))

        if (Math.abs(tLeft - oLeft) < threshold) {
          target.set({ left: oLeft })
          guides.push(new fabric.Line([oLeft, 0, oLeft, h], { stroke: '#42a5f5', strokeWidth: 1, strokeDashArray: [4, 4], selectable: false, evented: false, opacity: 0.6 } as any))
        }
        if (Math.abs(tRight - oRight) < threshold) {
          target.set({ left: oRight - (target.width * (target.scaleX || 1)) })
          guides.push(new fabric.Line([oRight, 0, oRight, h], { stroke: '#42a5f5', strokeWidth: 1, strokeDashArray: [4, 4], selectable: false, evented: false, opacity: 0.6 } as any))
        }
        if (Math.abs(tTop - oTop) < threshold) {
          target.set({ top: oTop })
          guides.push(new fabric.Line([0, oTop, w, oTop], { stroke: '#42a5f5', strokeWidth: 1, strokeDashArray: [4, 4], selectable: false, evented: false, opacity: 0.6 } as any))
        }
        if (Math.abs(tBottom - oBottom) < threshold) {
          target.set({ top: oBottom - (target.height * (target.scaleY || 1)) })
          guides.push(new fabric.Line([0, oBottom, w, oBottom], { stroke: '#42a5f5', strokeWidth: 1, strokeDashArray: [4, 4], selectable: false, evented: false, opacity: 0.6 } as any))
        }
      })

      if (guides.length) {
        guides.forEach((g: any) => { g.isGuide = true })
        canvas.add(...guides)
        guideLines.value = guides
        canvas.renderAll()
      }
    })

    canvas.on('object:modified', () => {
      clearGuideLines()
    })

    // 初始化背景
    applyBackground(background.value)

    // 初始化：push 空草稿到历史
    pushHistory('initial')
  }

  function syncSelectionFromFabric() {
    const canvas = fabricCanvas.value
    if (!canvas) return
    const active = canvas.getActiveObject()
    if (!active) {
      selectedId.value = null
      opts.onSelectionChange?.(null)
      return
    }
    const id = (active as any).id as string | undefined
    if (id) {
      selectedId.value = id
      const el = elements.value.find(e => e.id === id) || null
      opts.onSelectionChange?.(el)
    }
  }

  // ---- 画布尺寸 ----
  function setSize(size: CanvasSize) {
    canvasSize.value = size
    const canvas = fabricCanvas.value
    if (!canvas) return
    canvas.setDimensions({ width: size.width, height: size.height })
    canvas.renderAll()
    pushHistory('set size')
  }

  // ---- 背景 ----
  function setBackground(bg: Partial<CanvasBackground>) {
    background.value = { ...background.value, ...bg }
    applyBackground(background.value)
    opts.onBackgroundChange?.(background.value)
    pushHistory('set background')
  }

  function applyBackground(bg: CanvasBackground) {
    const canvas = fabricCanvas.value
    if (!canvas) return

    // 纯色
    if (bg.type === 'solid') {
      canvas.backgroundColor = bg.color1
      canvas.set('backgroundImage' as any, null)
      canvas.renderAll()
      return
    }

    // 渐变：用 Fabric 的 Gradient
    if (bg.type === 'linear-gradient' || bg.type === 'radial-gradient') {
      const angle = bg.angle ?? 0
      const rad = (angle * Math.PI) / 180
      const w = canvasSize.value.width
      const h = canvasSize.value.height
      const x1 = w / 2 - (h / 2) * Math.sin(rad)
      const y1 = h / 2 - (h / 2) * Math.cos(rad)
      const x2 = w / 2 + (h / 2) * Math.sin(rad)
      const y2 = h / 2 + (h / 2) * Math.cos(rad)

      const gradient = new fabric.Gradient({
        type: bg.type === 'radial-gradient' ? 'radial' : 'linear',
        coords: bg.type === 'radial-gradient'
          ? { x1: w / 2, y1: h / 2, r1: 0, x2: w / 2, y2: h / 2, r2: Math.max(w, h) / 2 }
          : { x1, y1, x2, y2, r1: 0, r2: 0 },
        colorStops: [
          { offset: 0, color: bg.color1 },
          { offset: 1, color: bg.color2 || bg.color1 },
        ],
      } as any)

      canvas.backgroundColor = gradient as any
      canvas.set('backgroundImage' as any, null)
      canvas.renderAll()
      return
    }

    // 图片背景
    if (bg.type === 'image' && bg.imageUrl) {
      const imgEl = new Image()
      imgEl.crossOrigin = 'anonymous'
      imgEl.src = bg.imageUrl
      imgEl.onload = () => {
        const img = new fabric.FabricImage(imgEl)
        const w = canvasSize.value.width
        const h = canvasSize.value.height
        const scale = bg.imageScale === 'cover'
          ? Math.max(w / imgEl.naturalWidth, h / imgEl.naturalHeight)
          : bg.imageScale === 'contain'
            ? Math.min(w / imgEl.naturalWidth, h / imgEl.naturalHeight)
            : 1
        img.set({
          left: w / 2,
          top: h / 2,
          originX: 'center',
          originY: 'center',
          scaleX: scale,
          scaleY: scale,
          opacity: bg.imageOpacity ?? 1,
          selectable: false,
          evented: false,
        })
        canvas.backgroundColor = '#ffffff'
        canvas.backgroundImage = img
        canvas.renderAll()
      }
      imgEl.onerror = () => {
        console.error('Background image failed to load:', bg.imageUrl?.slice(0, 80))
      }
    }
  }

  // ---- 元素增删 ----
  function addText(partial?: Partial<TextElement>) {
    const canvas = fabricCanvas.value
    if (!canvas) return

    const el: TextElement = {
      id: createId('text'),
      type: 'text',
      name: '文字',
      x: canvasSize.value.width / 2,
      y: canvasSize.value.height / 2,
      width: 240,
      height: 40,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      zIndex: elements.value.length,
      editable: true,
      dataKey: undefined,
      content: '点击编辑文字',
      fontFamily: '思源宋体, serif',
      fontSize: 24,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#333333',
      textAlign: 'center',
      lineHeight: 1.5,
      letterSpacing: 2,
      strokeColor: 'transparent',
      strokeWidth: 0,
      shadowColor: 'transparent',
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      shadowBlur: 0,
      textDecoration: 'none',
      ...partial,
    }

    const text = new fabric.IText(el.content, {
      left: el.x,
      top: el.y,
      originX: 'center',
      originY: 'center',
      fontFamily: el.fontFamily,
      fontSize: el.fontSize,
      fontWeight: el.fontWeight as any,
      fontStyle: el.fontStyle as any,
      fill: el.color,
      textAlign: el.textAlign,
      lineHeight: el.lineHeight,
      charSpacing: el.letterSpacing * 10,
      stroke: el.strokeColor,
      strokeWidth: el.strokeWidth,
      opacity: el.opacity,
      angle: el.rotation,
      ...(el.shadowColor && el.shadowColor !== 'transparent'
        ? { shadow: new fabric.Shadow({ color: el.shadowColor, blur: el.shadowBlur, offsetX: el.shadowOffsetX, offsetY: el.shadowOffsetY }) }
        : {}),
      lockRotation: el.locked,
      lockMovementX: el.locked,
      lockMovementY: el.locked,
    })
    ;(text as any).id = el.id
    ;(text as any).elementType = 'text'

    canvas.add(text)
    canvas.setActiveObject(text)
    elements.value.push(el)
    selectedId.value = el.id
    return el
  }

  function addImage(src: string, partial?: Partial<ImageElement>) {
    const canvas = fabricCanvas.value
    if (!canvas) return Promise.resolve<ImageElement | null>(null)

    const isDataUrl = src.startsWith('data:')
    const loadOpts = isDataUrl ? {} : { crossOrigin: 'anonymous' }

    return fabric.FabricImage.fromURL(src, loadOpts).then(img => {
      if (!img) {
        console.warn('addImage: FabricImage.fromURL returned null for', src.slice(0, 64))
        return null
      }

      const maxWidth = canvasSize.value.width * 0.8
      const scale = Math.min(1, maxWidth / (img.width || maxWidth))

      const el: ImageElement = {
        id: createId('image'),
        type: 'image',
        name: '图片',
        x: canvasSize.value.width / 2,
        y: canvasSize.value.height / 2,
        width: (img.width || 200) * scale,
        height: (img.height || 200) * scale,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        zIndex: elements.value.length,
        editable: true,
        dataKey: undefined,
        src,
        scale: 'cover',
        mask: 'rect',
        borderRadius: 0,
        borderColor: 'transparent',
        borderWidth: 0,
        brightness: 100,
        contrast: 0,
        blur: 0,
        grayscale: 0,
        saturate: 100,
        ...partial,
      }

      img.set({
        left: el.x,
        top: el.y,
        originX: 'center',
        originY: 'center',
        scaleX: scale,
        scaleY: scale,
        opacity: el.opacity,
        lockRotation: el.locked,
      })
      ;(img as any).id = el.id
      ;(img as any).elementType = 'image'
      ;(img as any).srcUrl = src

      canvas.add(img)
      canvas.setActiveObject(img)
      elements.value.push(el)
      selectedId.value = el.id
      return el
    }).catch(err => {
      console.error('addImage failed:', err, 'src:', src.slice(0, 80))
      return null
    })
  }

  // 删除选中元素
  function deleteSelected() {
    const canvas = fabricCanvas.value
    if (!canvas) return
    const active = canvas.getActiveObject()
    if (!active) return
    const id = (active as any).id as string
    canvas.remove(active)
    elements.value = elements.value.filter(e => e.id !== id)
    selectedId.value = null
  }

  // 通过 id 删除
  function deleteElement(id: string) {
    const canvas = fabricCanvas.value
    if (!canvas) return
    const obj = canvas.getObjects().find(o => (o as any).id === id)
    if (!obj) return
    canvas.remove(obj)
    elements.value = elements.value.filter(e => e.id !== id)
    if (selectedId.value === id) selectedId.value = null
  }

  // 切换隐藏/锁定
  function toggleVisibility(id: string) {
    const canvas = fabricCanvas.value
    const el = elements.value.find(e => e.id === id)
    if (!canvas || !el) return
    el.visible = !el.visible
    const obj = canvas.getObjects().find(o => (o as any).id === id)
    if (obj) {
      obj.set('visible', el.visible)
      canvas.renderAll()
    }
  }

  function toggleLock(id: string) {
    const canvas = fabricCanvas.value
    const el = elements.value.find(e => e.id === id)
    if (!canvas || !el) return
    el.locked = !el.locked
    const obj = canvas.getObjects().find(o => (o as any).id === id)
    if (obj) {
      obj.set({
        lockMovementX: el.locked,
        lockMovementY: el.locked,
        lockRotation: el.locked,
        lockScalingX: el.locked,
        lockScalingY: el.locked,
        selectable: !el.locked,
        evented: !el.locked,
      })
      canvas.renderAll()
    }
  }

  // ---- 图层顺序操作（Fabric v6 无原生方法，通过 insertAt 实现）----
  function bringToFront(id: string) {
    const canvas = fabricCanvas.value
    if (!canvas) return
    const obj = canvas.getObjects().find(o => (o as any).id === id)
    if (obj) {
      canvas.remove(obj)
      canvas.add(obj)
      updateZIndexFromFabric()
      pushHistory('bring to front')
    }
  }

  function sendToBack(id: string) {
    const canvas = fabricCanvas.value
    if (!canvas) return
    const obj = canvas.getObjects().find(o => (o as any).id === id)
    if (obj) {
      canvas.remove(obj)
      canvas.insertAt(0, obj)
      updateZIndexFromFabric()
      pushHistory('send to back')
    }
  }

  function bringForward(id: string) {
    const canvas = fabricCanvas.value
    if (!canvas) return
    const obj = canvas.getObjects().find(o => (o as any).id === id)
    if (obj) {
      const objects = canvas.getObjects()
      const idx = objects.indexOf(obj)
      if (idx < objects.length - 1) {
        canvas.remove(obj)
        canvas.insertAt(idx + 1, obj)
        updateZIndexFromFabric()
        pushHistory('bring forward')
      }
    }
  }

  function sendBackwards(id: string) {
    const canvas = fabricCanvas.value
    if (!canvas) return
    const obj = canvas.getObjects().find(o => (o as any).id === id)
    if (obj) {
      const objects = canvas.getObjects()
      const idx = objects.indexOf(obj)
      if (idx > 0) {
        canvas.remove(obj)
        canvas.insertAt(idx - 1, obj)
        updateZIndexFromFabric()
        pushHistory('send backwards')
      }
    }
  }

  function updateZIndexFromFabric() {
    const canvas = fabricCanvas.value
    if (!canvas) return
    canvas.getObjects().forEach((obj, index) => {
      const el = elements.value.find(e => e.id === (obj as any).id)
      if (el) {
        el.zIndex = index
      }
    })
  }

  // ---- 复制/粘贴 ----
  function copySelected() {
    if (!selectedId.value) return
    const el = elements.value.find(e => e.id === selectedId.value)
    if (!el) return
    clipboard = JSON.parse(JSON.stringify(el))
  }

  function pasteFromClipboard() {
    if (!clipboard) return

    const newEl: AnyCanvasElement = JSON.parse(JSON.stringify(clipboard))
    newEl.id = createId(newEl.type)
    newEl.x += 20
    newEl.y += 20

    const canvas = fabricCanvas.value
    if (!canvas) return

    if (newEl.type === 'text') {
      const t = new fabric.IText(newEl.content, {
        left: newEl.x, top: newEl.y,
        originX: 'center', originY: 'center',
        fontFamily: newEl.fontFamily, fontSize: newEl.fontSize,
        fontWeight: newEl.fontWeight as any, fontStyle: newEl.fontStyle as any,
        fill: newEl.color, textAlign: newEl.textAlign,
        lineHeight: newEl.lineHeight, charSpacing: newEl.letterSpacing * 10,
        stroke: newEl.strokeColor, strokeWidth: newEl.strokeWidth,
        opacity: newEl.opacity, angle: newEl.rotation,
        lockRotation: newEl.locked, selectable: !newEl.locked,
      })
      ;(t as any).id = newEl.id
      ;(t as any).elementType = 'text'
      canvas.add(t)
      canvas.setActiveObject(t)
      elements.value.push(newEl)
      selectedId.value = newEl.id
    } else if (newEl.type === 'image') {
      const ie = newEl as ImageElement
      fabric.FabricImage.fromURL(ie.src, { crossOrigin: 'anonymous' }).then(img => {
        const sx = ie.width / (img.width || 1)
        const sy = ie.height / (img.height || 1)
        img.set({
          left: ie.x, top: ie.y,
          originX: 'center', originY: 'center',
          scaleX: sx, scaleY: sy,
          opacity: ie.opacity, angle: ie.rotation,
          lockRotation: ie.locked, selectable: !ie.locked,
        })
        ;(img as any).id = ie.id
        ;(img as any).elementType = 'image'
        ;(img as any).srcUrl = ie.src
        canvas.add(img)
        canvas.setActiveObject(img)
        elements.value.push(newEl)
        selectedId.value = newEl.id
        canvas.renderAll()
      })
    }

    pushHistory('paste')
  }

  // ---- 对齐功能 ----
  function alignLeft(id: string) {
    const canvas = fabricCanvas.value
    if (!canvas) return
    const obj = canvas.getObjects().find(o => (o as any).id === id)
    if (obj) {
      const boundingRect = obj.getBoundingRect()
      obj.set('left', boundingRect.width / 2)
      canvas.renderAll()
      pushHistory('align left')
    }
  }

  function alignCenter(id: string) {
    const canvas = fabricCanvas.value
    if (!canvas) return
    const obj = canvas.getObjects().find(o => (o as any).id === id)
    if (obj) {
      obj.set('left', canvasSize.value.width / 2)
      canvas.renderAll()
      pushHistory('align center')
    }
  }

  function alignRight(id: string) {
    const canvas = fabricCanvas.value
    if (!canvas) return
    const obj = canvas.getObjects().find(o => (o as any).id === id)
    if (obj) {
      const boundingRect = obj.getBoundingRect()
      obj.set('left', canvasSize.value.width - boundingRect.width / 2)
      canvas.renderAll()
      pushHistory('align right')
    }
  }

  function alignTop(id: string) {
    const canvas = fabricCanvas.value
    if (!canvas) return
    const obj = canvas.getObjects().find(o => (o as any).id === id)
    if (obj) {
      const boundingRect = obj.getBoundingRect()
      obj.set('top', boundingRect.height / 2)
      canvas.renderAll()
      pushHistory('align top')
    }
  }

  function alignMiddle(id: string) {
    const canvas = fabricCanvas.value
    if (!canvas) return
    const obj = canvas.getObjects().find(o => (o as any).id === id)
    if (obj) {
      obj.set('top', canvasSize.value.height / 2)
      canvas.renderAll()
      pushHistory('align middle')
    }
  }

  function alignBottom(id: string) {
    const canvas = fabricCanvas.value
    if (!canvas) return
    const obj = canvas.getObjects().find(o => (o as any).id === id)
    if (obj) {
      const boundingRect = obj.getBoundingRect()
      obj.set('top', canvasSize.value.height - boundingRect.height / 2)
      canvas.renderAll()
      pushHistory('align bottom')
    }
  }

  function selectElement(id: string | null) {
    const canvas = fabricCanvas.value
    if (!canvas) return
    if (!id) {
      canvas.discardActiveObject()
      canvas.renderAll()
      selectedId.value = null
      opts.onSelectionChange?.(null)
      return
    }
    const obj = canvas.getObjects().find(o => (o as any).id === id)
    if (obj) {
      canvas.setActiveObject(obj)
      canvas.renderAll()
      selectedId.value = id
    }
  }

  // ---- 更新选中元素属性 ----
  function updateSelected(patch: Partial<TextElement> | Partial<ImageElement>) {
    const canvas = fabricCanvas.value
    if (!canvas || !selectedId.value) return

    const el = elements.value.find(e => e.id === selectedId.value)
    if (!el) return

    const obj = canvas.getObjects().find(o => (o as any).id === selectedId.value)
    if (!obj) return

    // 更新我们自己的数据模型
    Object.assign(el, patch)

    // 同步到 Fabric 对象
    if (el.type === 'text') {
      const t = el as TextElement
      const textObj = obj as fabric.IText
      textObj.set({
        text: patch.content ?? t.content,
        fontFamily: patch.fontFamily ?? t.fontFamily,
        fontSize: patch.fontSize ?? t.fontSize,
        fontWeight: (patch.fontWeight ?? t.fontWeight) as any,
        fontStyle: (patch.fontStyle ?? t.fontStyle) as any,
        fill: patch.color ?? t.color,
        textAlign: (patch.textAlign ?? t.textAlign) as any,
        lineHeight: patch.lineHeight ?? t.lineHeight,
        charSpacing: (patch.letterSpacing ?? t.letterSpacing) * 10,
        stroke: patch.strokeColor ?? t.strokeColor,
        strokeWidth: patch.strokeWidth ?? t.strokeWidth,
        opacity: patch.opacity ?? t.opacity,
        angle: patch.rotation ?? t.rotation,
      } as any)
      if (patch.shadowColor !== undefined || patch.shadowBlur !== undefined) {
        if (t.shadowColor && t.shadowColor !== 'transparent' && t.shadowBlur > 0) {
          ;(textObj as any).set('shadow', new fabric.Shadow({
            color: t.shadowColor, blur: t.shadowBlur, offsetX: t.shadowOffsetX, offsetY: t.shadowOffsetY,
          }))
        } else {
          ;(textObj as any).set('shadow', null)
        }
      }
    }

    if (el.type === 'image') {
      obj.set({
        opacity: (patch as Partial<ImageElement>).opacity ?? (el as ImageElement).opacity,
        angle: (patch as Partial<ImageElement>).rotation ?? (el as ImageElement).rotation,
      } as any)
    }

    canvas.renderAll()
    opts.onSelectionChange?.(el)
  }

  // ---- 从 Fabric 反向同步（拖拽/缩放后）----
  function syncTextFromFabric() {
    const canvas = fabricCanvas.value
    if (!canvas) return
    canvas.getObjects().forEach(obj => {
      const id = (obj as any).id as string
      const el = elements.value.find(e => e.id === id)
      if (!el || el.type !== 'text') return
      el.content = (obj as any).text ?? el.content
    })
  }

  function syncFromFabricToModel() {
    const canvas = fabricCanvas.value
    if (!canvas) return
    canvas.getObjects().forEach(obj => {
      const id = (obj as any).id as string
      const el = elements.value.find(e => e.id === id)
      if (!el) return
      const o = obj as any
      const scaleX = Math.abs(obj.scaleX || 1)
      const scaleY = Math.abs(obj.scaleY || 1)
      el.x = (o.left ?? 0) + (el.type === 'text' ? 0 : 0)
      el.y = (o.top ?? 0)
      el.rotation = (o.angle ?? 0)
      el.opacity = (o.opacity ?? 1)
      if (el.type === 'text') {
        el.content = o.text ?? el.content
      }
      if (el.type === 'image') {
        el.width = (obj.width || el.width) * scaleX
        el.height = (obj.height || el.height) * scaleY
      }
    })
  }

  // ---- 历史栈 ----
  function getDraft(): CanvasDraft {
    syncFromFabricToModel()
    return {
      canvasSize: { ...canvasSize.value },
      background: { ...background.value },
      elements: JSON.parse(JSON.stringify(elements.value)),
      orientation: canvasSize.value.width > canvasSize.value.height ? 'landscape' : 'portrait',
    }
  }

  function loadDraft(draft: CanvasDraft) {
    const canvas = fabricCanvas.value
    if (!canvas) return

    // 清空
    canvas.getObjects().forEach(o => canvas.remove(o))
    canvas.discardActiveObject()

    canvasSize.value = { ...draft.canvasSize }
    canvas.setDimensions({ width: draft.canvasSize.width, height: draft.canvasSize.height })
    background.value = { ...draft.background }
    applyBackground(draft.background)
    opts.onBackgroundChange?.(draft.background)

    elements.value = []
    selectedId.value = null

    // 按 zIndex 排序
    const sorted = [...draft.elements].sort((a, b) => a.zIndex - b.zIndex)

    const addTasks: Array<() => void> = []
    sorted.forEach(el => {
      if (el.type === 'text') {
        const t = new fabric.IText(el.content, {
          left: el.x, top: el.y,
          originX: 'center', originY: 'center',
          fontFamily: el.fontFamily, fontSize: el.fontSize,
          fontWeight: el.fontWeight as any, fontStyle: el.fontStyle as any,
          fill: el.color, textAlign: el.textAlign,
          lineHeight: el.lineHeight, charSpacing: el.letterSpacing * 10,
          stroke: el.strokeColor, strokeWidth: el.strokeWidth,
          opacity: el.opacity, angle: el.rotation,
          lockRotation: el.locked, selectable: !el.locked,
        })
        ;(t as any).id = el.id
        ;(t as any).elementType = 'text'
        addTasks.push(() => canvas.add(t))
      } else if (el.type === 'image') {
        const ie = el as ImageElement
        addTasks.push(() => {
          fabric.FabricImage.fromURL(ie.src, { crossOrigin: 'anonymous' }).then(img => {
            const sx = ie.width / (img.width || 1)
            const sy = ie.height / (img.height || 1)
            img.set({
              left: ie.x, top: ie.y,
              originX: 'center', originY: 'center',
              scaleX: sx, scaleY: sy,
              opacity: ie.opacity, angle: ie.rotation,
              lockRotation: ie.locked, selectable: !ie.locked,
            })
            ;(img as any).id = ie.id
            ;(img as any).elementType = 'image'
            ;(img as any).srcUrl = ie.src
            canvas.add(img)
            canvas.renderAll()
          })
        })
      }
      elements.value.push(el as any)
    })

    addTasks.forEach(fn => fn())
    canvas.renderAll()
  }

  function pushHistory(description = 'change') {
    if (suppressHistory) return
    const draft = getDraft()

    // 如果当前不在栈顶（已回退过），截断之后的历史
    if (historyIdx.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIdx.value + 1)
    }

    history.value.push(draft)
    if (history.value.length > MAX_HISTORY) history.value.shift()
    historyIdx.value = history.value.length - 1
    updateCanUndoRedo()
  }

  // throttle：避免高频事件每一次都压栈
  let pushTimer: ReturnType<typeof setTimeout> | null = null
  function pushHistoryIfNeeded() {
    if (suppressHistory) return
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = setTimeout(() => {
      pushHistory('modify')
    }, 300)
  }

  function undo() {
    if (historyIdx.value <= 0) return
    historyIdx.value -= 1
    const draft = history.value[historyIdx.value]
    suppressHistory = true
    loadDraft(draft)
    suppressHistory = false
    updateCanUndoRedo()
  }

  function redo() {
    if (historyIdx.value >= history.value.length - 1) return
    historyIdx.value += 1
    const draft = history.value[historyIdx.value]
    suppressHistory = true
    loadDraft(draft)
    suppressHistory = false
    updateCanUndoRedo()
  }

  function updateCanUndoRedo() {
    canUndo.value = historyIdx.value > 0
    canRedo.value = historyIdx.value < history.value.length - 1
  }

  // ---- 缩放 ----
  function setZoom(z: number) {
    zoom.value = Math.max(0.3, Math.min(3, z))
  }

  // ---- 清理 ----
  function dispose() {
    const canvas = fabricCanvas.value
    if (canvas) {
      canvas.dispose()
      fabricCanvas.value = null
    }
    if (pushTimer) clearTimeout(pushTimer)
  }

  // ---- 清空画布（供外部调用）----
  function clearCanvas() {
    const canvas = fabricCanvas.value
    if (!canvas) return
    canvas.getObjects().forEach(o => canvas.remove(o))
    canvas.discardActiveObject()
    elements.value = []
    selectedId.value = null
  }

  // ---- 网格与参考线 ----
  function clearGuideLines() {
    const canvas = fabricCanvas.value
    if (!canvas || !guideLines.value.length) return
    guideLines.value.forEach(g => canvas.remove(g))
    guideLines.value = []
    canvas.renderAll()
  }

  function drawGrid() {
    const canvas = fabricCanvas.value
    if (!canvas) return
    canvas.getObjects().forEach((obj: any) => {
      if (obj.isGrid) canvas.remove(obj)
    })
    if (!showGrid.value) {
      canvas.renderAll()
      return
    }
    const w = canvasSize.value.width
    const h = canvasSize.value.height
    const gs = gridSize.value
    const lines: fabric.Line[] = []
    for (let x = gs; x < w; x += gs) {
      lines.push(new fabric.Line([x, 0, x, h], { stroke: 'rgba(0,0,0,0.05)', strokeWidth: 1, selectable: false, evented: false } as any))
    }
    for (let y = gs; y < h; y += gs) {
      lines.push(new fabric.Line([0, y, w, y], { stroke: 'rgba(0,0,0,0.05)', strokeWidth: 1, selectable: false, evented: false } as any))
    }
    lines.forEach((l: any) => { l.isGrid = true })
    canvas.add(...lines)
    canvas.renderAll()
  }

  function toggleGrid() {
    showGrid.value = !showGrid.value
    snapToGrid.value = !snapToGrid.value
    drawGrid()
  }

  // 组件挂载/卸载钩子
  onMounted(() => init())
  onBeforeUnmount(() => dispose())

  return {
    // 状态
    canvasSize,
    background,
    selectedId,
    selectedElement,
    elements,
    zoom,
    canUndo,
    canRedo,
    fabricCanvas,
    showGrid,
    snapToGrid,
    gridSize,

    // 操作
    init,
    setSize,
    setBackground,
    addText,
    addImage,
    deleteSelected,
    deleteElement,
    toggleVisibility,
    toggleLock,
    selectElement,
    updateSelected,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackwards,
    copySelected,
    pasteFromClipboard,
    alignLeft,
    alignCenter,
    alignRight,
    alignTop,
    alignMiddle,
    alignBottom,

    // 历史
    pushHistory,
    undo,
    redo,

    // 其他
    setZoom,
    getDraft,
    loadDraft,
    clearCanvas,
    dispose,
    clearGuideLines,
    drawGrid,
    toggleGrid,
  }
}
