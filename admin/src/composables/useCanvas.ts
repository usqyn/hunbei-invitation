import * as fabric from 'fabric'
import { loadSVGFromString, util as fabricUtil } from 'fabric'
import { ref, shallowRef, computed, onMounted, onBeforeUnmount, watch, watchEffect, nextTick } from 'vue'
import type {
  AnyCanvasElement,
  TextElement,
  ImageElement,
  StickerElement,
  CanvasBackground,
  CanvasSize,
  CanvasDraft,
} from '../types/canvas'
import type { PsdLayerPreview } from '../utils/psd-import'
import { PLACEHOLDER_DEFS } from '../constants/placeholder-defs'
import { createId, DEFAULT_CANVAS_SIZE, DEFAULT_BACKGROUND } from '../types/canvas'
import { uploadImages } from './useApi'

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
  /** 双击图片元素时触发，用于通知外部弹出文件选择器替换图片 */
  onImageReplace?: (obj: any) => void
}

// 最大历史快照数
const MAX_HISTORY = 50

// RTL 字符检测正则
const RTL_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

// 占位符注册表驱动的模块级常量（避免每次刷新/保存重复编译正则、重建映射）
const PLACEHOLDER_TOKEN_RE = new RegExp(`\\{(${PLACEHOLDER_DEFS.map(d => d.key).join('|')})\\}`)
const PLACEHOLDER_PREVIEW_VALUES: Record<string, string> = Object.fromEntries(PLACEHOLDER_DEFS.map(d => [d.key, d.preview]))

/**
 * 统一解析文本元素的 RTL 属性（GitHub bidi-shaper 方案在 Fabric.js IText 场景的对称实现）。
 *
 * 解决 admin 画布编辑态与 element-serializer.ts 不一致的死代码：
 * - direction: 'auto' 根据 content 自动判定（原实现仅 el.direction || 'ltr'）
 * - RTL 文本 charSpacing 强制为 0（连写要求）
 * - 字体不再强制替换：尊重用户选择（导入 PSD 时对话框默认哈萨克字体；
 *   用户显式选择其他字体时按所选渲染，可能不连写/缺字形，由用户权衡）
 */
function resolveRtlTextOptions(el: {
  direction?: string
  content?: string
  fontFamily?: string
  letterSpacing?: number
}): {
  direction: 'rtl' | 'ltr'
  fontFamily: string | undefined
  charSpacing: number
} {
  const content = el.content || ''
  const containsRtl = RTL_REGEX.test(content)
  // 检测哈语占位符：占位符本身是 ASCII，但替换后会变成哈语文本（RTL）
  // 预标记为 RTL，保证 admin 编辑态字体格式与最终小程序渲染一致
  const KZ_PLACEHOLDER_RE = /\{(kzDate|kzWeekday|kzWeekdayParen|kzTime|kzGroomName|kzBrideName|kzGroomFullName|kzBrideFullName|kzFatherName|kzMotherName|kzWitnessName|kzGroomsmanName|kzBridesmaidName|kzChildName|kzInviter|kzInvitee|kzClockTime|kzLocation|kzPhone|kzAddress)\}/
  const containsKzPlaceholder = KZ_PLACEHOLDER_RE.test(content)
  const isRtl = containsRtl || containsKzPlaceholder
  const rawDirection = el.direction || 'auto'
  const direction: 'rtl' | 'ltr' = rawDirection === 'auto'
    ? (isRtl ? 'rtl' : 'ltr')
    : (rawDirection as 'rtl' | 'ltr')
  const fontFamily = el.fontFamily
  const charSpacing = direction === 'rtl' ? 0 : (el.letterSpacing ?? 2) * 10
  return { direction, fontFamily, charSpacing }
}

// RTL 文本渲染字体栈：用户所选字体在前 + KazakhSoftAsilya 兜底。
// 中文/拉丁部分用所选字体渲染，哈萨克字符回退哈萨克字体连写；
// 不再强制替换用户选择（数据层 el.fontFamily 始终保留用户所选值）。
function rtlRenderFontStack(fontFamily: string | undefined, isRtl: boolean): string | undefined {
  if (!isRtl) return fontFamily
  if (!fontFamily) return "'KazakhSoftAsilya'"
  return fontFamily.includes('KazakhSoftAsilya') ? fontFamily : `${fontFamily}, 'KazakhSoftAsilya'`
}

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
  // history 改用 shallowRef：历史快照体积大且整体替换，无需深响应式
  const history = shallowRef<CanvasDraft[]>([])
  const historyIdx = ref(-1)
  let suppressHistory = false
  // loadDraft 期间阻止历史记录：图片异步加载完成时 suppressHistory 可能已恢复为 false，
  // 此标志确保 loadDraft 的所有异步任务结束前都不记录多余历史
  let isLoadDrafting = false
  // loadDraft 嵌套计数：快速连续 undo/redo 时，前一次 loadDraft 的图片加载完成
  // 不能提前关闭后一次 loadDraft 的保护标志（否则 object:added 会把撤销后的状态压回历史栈）
  let loadDraftCount = 0
  // 画布世代计数：每次清空/重建画布时自增，用于丢弃跨世代迟到的异步图片加载结果
  // （防止上一页/上一状态的图片加载完成后把对象 push 进当前 model、add 到当前 canvas 造成失步）
  let canvasEpoch = 0

  // 复制缓冲区
  const clipboard = ref<AnyCanvasElement | null>(null)

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
    syncCanvasCssSize()

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

    // 对象变更 → push 到历史栈。
    // 结构变更（add/remove）立即入历史；属性变更（拖拽/缩放）走 300ms 防抖合并
    canvas.on('object:added', pushHistoryStructural)
    canvas.on('object:removed', pushHistoryStructural)
    canvas.on('object:modified', pushHistoryIfNeeded)

    // 拖拽吸附 + 对齐参考线（节流：20fps 对齐检测，避免每次 mousemove 都计算）
    function doAlignCheck(e: any) {
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
        guides.push(new fabric.Line([w / 2, 0, w / 2, h], { stroke: '#e84a6e', strokeWidth: 1, strokeDashArray: [4, 4], selectable: false, evented: false, opacity: 0.8 }))
      }
      if (Math.abs(cy - h / 2) < threshold) {
        target.set({ top: h / 2 - (target.height * (target.scaleY || 1)) / 2 })
        guides.push(new fabric.Line([0, h / 2, w, h / 2], { stroke: '#e84a6e', strokeWidth: 1, strokeDashArray: [4, 4], selectable: false, evented: false, opacity: 0.8 }))
      }

      // 与其他对象边缘对齐
      canvas.getObjects().forEach((obj: any) => {
        if (obj === target || obj.isGuide) return
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
          guides.push(new fabric.Line([oLeft, 0, oLeft, h], { stroke: '#42a5f5', strokeWidth: 1, strokeDashArray: [4, 4], selectable: false, evented: false, opacity: 0.6 }))
        }
        if (Math.abs(tRight - oRight) < threshold) {
          target.set({ left: oRight - (target.width * (target.scaleX || 1)) })
          guides.push(new fabric.Line([oRight, 0, oRight, h], { stroke: '#42a5f5', strokeWidth: 1, strokeDashArray: [4, 4], selectable: false, evented: false, opacity: 0.6 }))
        }
        if (Math.abs(tTop - oTop) < threshold) {
          target.set({ top: oTop })
          guides.push(new fabric.Line([0, oTop, w, oTop], { stroke: '#42a5f5', strokeWidth: 1, strokeDashArray: [4, 4], selectable: false, evented: false, opacity: 0.6 }))
        }
        if (Math.abs(tBottom - oBottom) < threshold) {
          target.set({ top: oBottom - (target.height * (target.scaleY || 1)) })
          guides.push(new fabric.Line([0, oBottom, w, oBottom], { stroke: '#42a5f5', strokeWidth: 1, strokeDashArray: [4, 4], selectable: false, evented: false, opacity: 0.6 }))
        }
      })

      if (guides.length) {
        guides.forEach((g: any) => { g.isGuide = true })
        canvas.add(...guides)
        guideLines.value = guides
        canvas.renderAll()
      }
    }

    canvas.on('object:moving', (e: any) => {
      pendingAlignEvent = e
      if (alignCheckTimer) return
      alignCheckTimer = setTimeout(() => {
        alignCheckTimer = null
        if (pendingAlignEvent) {
          doAlignCheck(pendingAlignEvent)
          pendingAlignEvent = null
        }
      }, 50) // 20fps 对齐检测
    })

    canvas.on('object:modified', () => {
      clearGuideLines()
    })

    // mouse:up 兜底清理参考线，防止 object:modified 未触发时残留
    canvas.on('mouse:up', () => {
      clearGuideLines()
    })

    // 双击图片元素 → 触发图片替换（通知外部弹出文件选择器）
    canvas.on('mouse:dblclick', (opt: any) => {
      const obj = opt.target
      if (obj && obj.type === 'image') {
        opts.onImageReplace?.(obj)
      }
    })

    // 初始化背景
    applyBackground(background.value)

    // 初始化：push 空草稿到历史
    pushHistory('initial')
  }

  // fabric 的 setDimensions 会直接写 canvas 元素内联样式（style.width/height），
  // 与 Vue 的 :style 绑定冲突，导致模板加载后画布保持全尺寸。这里强制同步为 canvasSize × zoom。
  function syncCanvasCssSize() {
    const canvas = fabricCanvas.value
    if (!canvas) return
    const w = (canvasSize.value.width * zoom.value) + 'px'
    const h = (canvasSize.value.height * zoom.value) + 'px'
    const els: Array<HTMLCanvasElement | undefined> = [
      (canvas as any).lowerCanvasEl,
      (canvas as any).upperCanvasEl,
    ]
    els.forEach(el => {
      if (el) {
        el.style.width = w
        el.style.height = h
      }
    })
  }

  // zoom / canvasSize 变化时保持画布 CSS 尺寸正确
  watchEffect(syncCanvasCssSize)

  function syncSelectionFromFabric() {
    const canvas = fabricCanvas.value
    if (!canvas) return
    const active = canvas.getActiveObject()
    if (!active) {
      selectedId.value = null
      opts.onSelectionChange?.(null)
      return
    }
    const id = active.id as string | undefined
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
    syncCanvasCssSize()
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
      canvas.backgroundImage = null
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
      })

      canvas.backgroundColor = gradient
      canvas.backgroundImage = null
      canvas.renderAll()
      return
    }

    // 图片背景
    if (bg.type === 'image' && (bg.image || bg.imageUrl)) {
      const imgSrc = bg.image || bg.imageUrl as string
      const imgEl = new Image()
      imgEl.crossOrigin = 'anonymous'
      imgEl.src = imgSrc
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
        console.error('Background image failed to load:', imgSrc.slice(0, 80))
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
      direction: 'auto',
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

    const { direction: resolvedDirection, fontFamily: resolvedFontFamily, charSpacing: resolvedCharSpacing } = resolveRtlTextOptions(el)
    // el.fontFamily 保留用户所选值（属性面板显示）；画布渲染用哈萨克兜底字体栈
    const renderFontFamily = rtlRenderFontStack(resolvedFontFamily, resolvedDirection === 'rtl')

    const text = new fabric.IText(el.content, {
      left: el.x,
      top: el.y,
      originX: 'center',
      originY: 'center',
      fontFamily: renderFontFamily,
      fontSize: el.fontSize,
      fontWeight: el.fontWeight,
      fontStyle: el.fontStyle,
      fill: el.color,
      textAlign: el.textAlign,
      lineHeight: el.lineHeight,
      charSpacing: resolvedCharSpacing,
      stroke: el.strokeColor,
      strokeWidth: el.strokeWidth,
      opacity: el.opacity,
      angle: el.rotation,
      direction: resolvedDirection,
      ...(el.shadowColor && el.shadowColor !== 'transparent'
        ? { shadow: new fabric.Shadow({ color: el.shadowColor, blur: el.shadowBlur, offsetX: el.shadowOffsetX, offsetY: el.shadowOffsetY }) }
        : {}),
      lockRotation: el.locked,
      lockMovementX: el.locked,
      lockMovementY: el.locked,
    })
    ;text.id = el.id
    ;text.elementType = 'text'

    // 先同步 model 再 add：保证 object:added 触发历史快照时元素已在 model 中
    elements.value.push(el)
    // 用 insertAt 按 zIndex 精确落位（而非 canvas.add 默认堆到顶层），
    // 修复 PSD 导入时异步图片层被加在文字之上导致“图片盖住文字”
    canvas.insertAt(el.zIndex, text)
    canvas.setActiveObject(text)
    selectedId.value = el.id
    return el
  }

  function addImage(src: string, partial?: Partial<ImageElement>) {
    const canvas = fabricCanvas.value
    if (!canvas) return Promise.resolve<ImageElement | null>(null)

    // 记录发起加载时的画布世代：若加载完成前画布已被清空/重建，丢弃迟到结果
    const epoch = canvasEpoch
    const isSvgDataUrl = src.startsWith('data:image/svg+xml')

    if (isSvgDataUrl) {
      // SVG data URL: 使用 loadSVGFromString 加载
      const svgString = atob(src.split(',')[1])
      return loadSVGFromString(svgString).then((result: any) => {
        if (epoch !== canvasEpoch || canvas !== fabricCanvas.value) return null
        const obj = fabricUtil.groupSVGElements(result.objects, result.options)
        if (!obj) return null

        const el: ImageElement = {
          id: createId('image'),
          type: 'image',
          name: '图片',
          x: canvasSize.value.width / 2,
          y: canvasSize.value.height / 2,
          width: (obj.width || 200),
          height: (obj.height || 200),
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

        const maxWidth = canvasSize.value.width * 0.8
        const sc = Math.min(1, maxWidth / (obj.width || maxWidth))

        obj.set({
          left: el.x,
          top: el.y,
          originX: 'center',
          originY: 'center',
          scaleX: sc,
          scaleY: sc,
          opacity: el.opacity,
          lockRotation: el.locked,
        })
        ;obj.id = el.id
        ;obj.elementType = 'image'
        ;obj.srcUrl = src

        elements.value.push(el)
        canvas.insertAt(el.zIndex, obj)
        canvas.setActiveObject(obj)
        selectedId.value = el.id
        return el
      }).catch((err: any) => {
        console.error('addImage SVG failed:', err, 'src:', src.slice(0, 80))
        return null
      })
    }

    const isDataUrl = src.startsWith('data:')
    const loadOpts = isDataUrl ? {} : { crossOrigin: 'anonymous' }

    return fabric.FabricImage.fromURL(src, loadOpts).then(img => {
      // 画布已进入新世代（清空/翻页/切模式/撤销重做）时丢弃迟到结果，避免 model 与画布失步
      if (epoch !== canvasEpoch || canvas !== fabricCanvas.value) return null
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
      ;img.id = el.id
      ;img.elementType = 'image'
      ;img.srcUrl = src

      elements.value.push(el)
      canvas.insertAt(el.zIndex, img)
      canvas.setActiveObject(img)
      selectedId.value = el.id
      return el
    }).catch(err => {
      console.error('addImage failed:', err, 'src:', src.slice(0, 80))
      return null
    })
  }

  // 批量导入 PSD 图层（bottom-to-top 顺序 = z-index 顺序，由 flattenPsdLayers 保证）
  // 文字层复用 addText 标准链路（direction 由 PSD 提取时按内容判定并显式传入，
  // 哈萨克阿拉伯文 RTL 文本已在导入时转为逻辑序 + rtl），
  // data URL → File 转换（用于 PSD 图片上传）
  function dataURLtoFile(dataUrl: string, name: string): File | null {
    try {
      const arr = dataUrl.split(',')
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
      const bstr = atob(arr[1])
      let n = bstr.length
      const u8arr = new Uint8Array(n)
      while (n--) u8arr[n] = bstr.charCodeAt(n)
      return new File([u8arr], name, { type: mime })
    } catch {
      return null
    }
  }

  // 图片层按图层原始坐标/尺寸精确定位（不做 80% 收缩），支持透明 PNG。
  // PSD 图片先批量上传到服务器换远程 URL，避免 base64 data URL 塞进 elements 超 15MB 保存上限。
  async function importPsdLayers(layers: PsdLayerPreview[]) {
    const canvas = fabricCanvas.value
    if (!canvas) return { imported: 0, failed: 0 }
    let imported = 0
    let failed = 0

    // 批量上传图片：收集所有 data URL → File → uploadImages → Map<dataUrl, remoteUrl>
    const imageLayers = layers.filter(l => l.type === 'image' && l.dataUrl)
    const dataUrlToRemote = new Map<string, string>()
    if (imageLayers.length > 0) {
      const files: File[] = []
      const fileDataUrls: string[] = []
      for (const layer of imageLayers) {
        const file = dataURLtoFile(layer.dataUrl!, `psd-${layer.name || Date.now()}.png`)
        if (file) {
          files.push(file)
          fileDataUrls.push(layer.dataUrl!)
        }
      }
      if (files.length > 0) {
        try {
          const urls = await uploadImages(files)
          for (let i = 0; i < fileDataUrls.length; i++) {
            if (urls[i]) dataUrlToRemote.set(fileDataUrls[i], urls[i])
          }
        } catch (err) {
          console.warn('[PSD] 批量上传图片失败，降级使用本地 data URL:', err)
        }
      }
    }

    // 批量导入期间抑制中间结构历史，完成后统一压入一条历史
    suppressHistory = true
    // 关键修复：forEach 不会 await async 回调，图片层 addImage 是异步的，
    // 若用 canvas.add 默认堆到顶层，所有图片会在文字之后加入画布，导致图片盖住文字。
    // 因此这里只负责分配正确的 zIndex，真正的画布插入交给 addText/addImage 用
    // canvas.insertAt(zIndex, obj) 精确落位，无论异步与否都在正确层级。
    // layers 保持 ag-psd 原始 children 顺序（实测 bottom→top：最底层「背景」在前）。
    // 先过滤掉组容器条目再编号，保证 zIndex 连续且不含组的占位偏移。
    const realLayers = layers.filter((l) => l.type !== 'group')
    let idx = 0
    for (const layer of realLayers) {
      const zIndex = idx++
      try {
        if (layer.type === 'text' && layer.text && layer.text.length > 0) {
          // editable 决定导入后是否锁定：默认 false（锁定，用户不可拖动/修改），勾选才解锁。
          // 自动识别出的占位符层（dataKey 非空）默认解锁，方便设计师微调，且 dataKey 已绑定，
          // 用户在小程序端填信息后仍会正确回填。
          const autoDetected = !!layer.dataKey
          const editable = layer.editable ?? autoDetected
          addText({
            id: createId('text'),
            type: 'text',
            name: layer.name || '文字',
            x: layer.left + layer.width / 2,
            y: layer.top + layer.height / 2,
            width: layer.width,
            height: layer.height,
            rotation: layer.rotation || 0,
            opacity: layer.opacity ?? 1,
            locked: !editable,
            visible: true,
            zIndex,
            editable,
            dataKey: layer.dataKey,
            defaults: layer.defaults,
            content: layer.text,
            fontFamily: layer.mappedFont || '思源宋体, serif',
            fontSize: layer.fontSize && layer.fontSize > 0 ? layer.fontSize : 24,
            fontWeight: 'normal',
            fontStyle: 'normal',
            color: layer.color || '#333333',
            textAlign: layer.textAlign || 'center',
            direction: layer.direction || 'auto',
            lineHeight: layer.lineHeight ?? 1.5,
            letterSpacing: layer.letterSpacing ?? 0,
            strokeColor: layer.strokeColor || 'transparent',
            strokeWidth: layer.strokeWidth ?? 0,
            shadowColor: layer.shadowColor || 'transparent',
            shadowOffsetX: layer.shadowOffsetX ?? 0,
            shadowOffsetY: layer.shadowOffsetY ?? 0,
            shadowBlur: layer.shadowBlur ?? 0,
            textDecoration: 'none',
          })
          imported++
          continue
        }
        if (layer.type === 'image' && layer.dataUrl) {
          // 优先用远程 URL，上传失败降级 data URL
          const src = dataUrlToRemote.get(layer.dataUrl) || layer.dataUrl
          // editable 决定导入后是否锁定：默认 false（锁定），勾选才解锁
          const editable = layer.editable ?? false
          const el = await addImage(src, {
            id: createId('image'),
            type: 'image',
            name: layer.name || '图片',
            x: layer.left + layer.width / 2,
            y: layer.top + layer.height / 2,
            width: layer.width,
            height: layer.height,
            rotation: layer.rotation || 0,
            opacity: layer.opacity ?? 1,
            locked: !editable,
            visible: true,
            zIndex,
            editable,
          })
          if (!el) {
            failed++
            continue
          }
          // addImage 会按画布宽度 80% 收缩，导入需精确尺寸：移除收缩缩放
          const obj = canvas.getObjects().find(o => o.id === el.id)
          if (obj && obj.width && obj.height) {
            obj.set({
              scaleX: layer.width / obj.width,
              scaleY: layer.height / obj.height,
              angle: layer.rotation || 0,
            })
          }
          imported++
          continue
        }
        failed++
      } catch (err) {
        console.error('PSD 图层导入失败:', layer.name, err)
        failed++
      }
    }
    canvas.discardActiveObject()
    canvas.renderAll()
    updateZIndexFromFabric()
    suppressHistory = false
    pushHistory('psd-import')
    return { imported, failed }
    }

  // 删除选中元素
  function deleteSelected() {
    const canvas = fabricCanvas.value
    if (!canvas) return
    const active = canvas.getActiveObject()
    if (!active) return
    const id = active.id as string
    // 先同步 model 再 remove：保证 object:removed 触发历史快照时元素已不在 model 中
    elements.value = elements.value.filter(e => e.id !== id)
    canvas.remove(active)
    selectedId.value = null
    updateZIndexFromFabric()
  }

  // 通过 id 删除
  function deleteElement(id: string) {
    const canvas = fabricCanvas.value
    if (!canvas) return
    const obj = canvas.getObjects().find(o => o.id === id)
    if (!obj) return
    elements.value = elements.value.filter(e => e.id !== id)
    canvas.remove(obj)
    if (selectedId.value === id) selectedId.value = null
    updateZIndexFromFabric()
  }

  // 切换隐藏/锁定
  function toggleVisibility(id: string) {
    const canvas = fabricCanvas.value
    const el = elements.value.find(e => e.id === id)
    if (!canvas || !el) return
    el.visible = !el.visible
    const obj = canvas.getObjects().find(o => o.id === id)
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
    const obj = canvas.getObjects().find(o => o.id === id)
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
    const obj = canvas.getObjects().find(o => o.id === id)
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
    const obj = canvas.getObjects().find(o => o.id === id)
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
    const obj = canvas.getObjects().find(o => o.id === id)
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
    const obj = canvas.getObjects().find(o => o.id === id)
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
      const el = elements.value.find(e => e.id === obj.id)
      if (el) {
        el.zIndex = index
      }
    })
  }

  // ---- 图层拖拽排序：将 fromId 元素移动到 toId 元素所在的位置 ----
  function reorderElements(fromId: string, toId: string) {
    const canvas = fabricCanvas.value
    if (!canvas) return
    if (fromId === toId) return
    const fromObj = canvas.getObjects().find(o => o.id === fromId)
    const toObj = canvas.getObjects().find(o => o.id === toId)
    if (!fromObj || !toObj) return

    // 先移除被拖拽元素，再根据目标元素当前位置插入
    canvas.remove(fromObj)
    const toIdx = canvas.getObjects().indexOf(toObj)
    // 插入到目标元素所在位置（将其置于目标元素紧后方，即图层列表中目标元素的下方）
    canvas.insertAt(toIdx, fromObj)
    updateZIndexFromFabric()
    canvas.renderAll()
    pushHistory('reorder layers')
  }

  // ---- 复制/粘贴 ----
  function copySelected() {
    if (!selectedId.value) return
    const el = elements.value.find(e => e.id === selectedId.value)
    if (!el) return
    clipboard.value = JSON.parse(JSON.stringify(el))
  }

  function pasteFromClipboard() {
    if (!clipboard.value) return

    const newEl: AnyCanvasElement = JSON.parse(JSON.stringify(clipboard.value))
    newEl.id = createId(newEl.type)
    newEl.x += 20
    newEl.y += 20

    const canvas = fabricCanvas.value
    if (!canvas) return

    if (newEl.type === 'text') {
      const rtlPaste = resolveRtlTextOptions(newEl)
      // newEl.fontFamily 保留用户所选值；渲染用哈萨克兜底字体栈

      const t = new fabric.IText(newEl.content, {
        left: newEl.x, top: newEl.y,
        originX: 'center', originY: 'center',
        fontFamily: rtlRenderFontStack(rtlPaste.fontFamily, rtlPaste.direction === 'rtl'), fontSize: newEl.fontSize,
        fontWeight: newEl.fontWeight, fontStyle: newEl.fontStyle,
        fill: newEl.color, textAlign: newEl.textAlign,
        lineHeight: newEl.lineHeight,
        charSpacing: rtlPaste.charSpacing,
        stroke: newEl.strokeColor, strokeWidth: newEl.strokeWidth,
        opacity: newEl.opacity, angle: newEl.rotation,
        direction: rtlPaste.direction,
        lockRotation: newEl.locked, selectable: !newEl.locked,
      })
      ;t.id = newEl.id
      ;t.elementType = 'text'
      elements.value.push(newEl)
      canvas.add(t)
      canvas.setActiveObject(t)
      selectedId.value = newEl.id
      updateZIndexFromFabric()
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
        ;img.id = ie.id
        ;img.elementType = 'image'
        ;img.srcUrl = ie.src
        elements.value.push(newEl)
        canvas.add(img)
        canvas.setActiveObject(img)
        selectedId.value = newEl.id
        updateZIndexFromFabric()
        canvas.renderAll()
      }).catch(() => {
        // 粘贴图片加载失败时静默处理
      })
    }

    pushHistory('paste')
  }

  // ---- 对齐功能 ----
  function alignLeft(id: string) {
    const canvas = fabricCanvas.value
    if (!canvas) return
    const obj = canvas.getObjects().find(o => o.id === id)
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
    const obj = canvas.getObjects().find(o => o.id === id)
    if (obj) {
      obj.set('left', canvasSize.value.width / 2)
      canvas.renderAll()
      pushHistory('align center')
    }
  }

  function alignRight(id: string) {
    const canvas = fabricCanvas.value
    if (!canvas) return
    const obj = canvas.getObjects().find(o => o.id === id)
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
    const obj = canvas.getObjects().find(o => o.id === id)
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
    const obj = canvas.getObjects().find(o => o.id === id)
    if (obj) {
      obj.set('top', canvasSize.value.height / 2)
      canvas.renderAll()
      pushHistory('align middle')
    }
  }

  function alignBottom(id: string) {
    const canvas = fabricCanvas.value
    if (!canvas) return
    const obj = canvas.getObjects().find(o => o.id === id)
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
    const obj = canvas.getObjects().find(o => o.id === id)
    if (obj) {
      canvas.setActiveObject(obj)
      canvas.renderAll()
      selectedId.value = id
    }
  }

  // ---- 文字特效应用（供 updateSelected 与 loadDraft 复用）----
  // 基于 model 元素（el）无条件应用渐变/阴影/长阴影/霓虹/下划线，
  // 保证撤销/重做/加载草稿重建对象时特效不丢失
  function applyTextFxToObject(textObj: fabric.IText, el: TextElement) {
    const tAny = el as any

    // 渐变填充
    const gf = tAny.gradientFill as { c1: string; c2: string } | undefined
    let fillValue: any = el.color
    if (gf) {
      fillValue = new fabric.Gradient({
        type: 'linear',
        coords: { x1: 0, y1: 0, x2: (textObj.width || 200), y2: 0 },
        colorStops: [
          { offset: 0, color: gf.c1 },
          { offset: 1, color: gf.c2 },
        ],
      } as any)
    }
    textObj.set('fill', fillValue)

    // 阴影 / 长阴影 / 霓虹
    if (tAny.neonGlow) {
      // 霓虹发光：外发光
      const neonColor = tAny.neonColor || el.color
      textObj.set('shadow', new fabric.Shadow({
        color: neonColor, blur: 15, offsetX: 0, offsetY: 0,
      }))
    } else if (tAny.longShadow) {
      // 长阴影特效
      const lsColor = tAny.longShadowColor || el.color
      const lsBlur = tAny.longShadowBlur || 0
      const lsLen = tAny.longShadowLength || 8
      textObj.set('shadow', new fabric.Shadow({
        color: lsColor, blur: lsBlur, offsetX: lsLen, offsetY: lsLen,
      }))
    } else if (el.shadowColor && el.shadowColor !== 'transparent' && el.shadowBlur > 0) {
      // 普通阴影
      textObj.set('shadow', new fabric.Shadow({
        color: el.shadowColor, blur: el.shadowBlur, offsetX: el.shadowOffsetX, offsetY: el.shadowOffsetY,
      }))
    } else {
      textObj.set('shadow', null)
    }

    // 下划线 / 删除线
    textObj.set('textDecoration', el.textDecoration ?? 'none')
  }

  // ---- 图片特效应用（滤镜/圆角/边框，供 updateSelected 与 loadDraft 复用）----
  function applyImageFxToObject(imgObj: any, el: ImageElement) {
    // CSS filter 滤镜
    const brightness = el.brightness ?? 100
    const contrast = el.contrast ?? 0
    const saturate = el.saturate ?? 100
    const blur = el.blur ?? 0
    const grayscale = el.grayscale ?? 0
    const cssFilter = `brightness(${brightness}%) contrast(${100 + contrast}%) saturate(${saturate}%) blur(${blur}px) grayscale(${grayscale}%)`
    imgObj.set('filters', [])
    imgObj.set('dirty', true)
    // 使用 CSS filter 通过样式注入
    try {
      const imgEl = imgObj._element
      if (imgEl && imgEl.style) {
        imgEl.style.filter = cssFilter
      }
    } catch (e) {
      console.warn('Failed to apply CSS filter:', e)
    }
    // borderRadius → clipPath
    const br = el.borderRadius ?? 0
    if (br > 0) {
      imgObj.set('clipPath', new fabric.Rect({
        absolutePositioned: true,
        width: imgObj.width,
        height: imgObj.height,
        rx: br,
        ry: br,
        originX: 'left',
        originY: 'top',
      }))
    } else {
      imgObj.set('clipPath', null)
    }
    // border
    const bw = el.borderWidth ?? 0
    const bc = el.borderColor
    if (bw > 0 && bc) {
      imgObj.set('stroke', bc)
      imgObj.set('strokeWidth', bw)
    } else {
      imgObj.set('stroke', undefined)
      imgObj.set('strokeWidth', 0)
    }
  }

  // ---- 更新选中元素属性 ----
  function updateSelected(patch: Partial<TextElement> | Partial<ImageElement>) {
    const canvas = fabricCanvas.value
    if (!canvas || !selectedId.value) return

    const el = elements.value.find(e => e.id === selectedId.value)
    if (!el) return

    const obj = canvas.getObjects().find(o => o.id === selectedId.value)
    if (!obj) return

    // 属性面板/格式刷修改不触发 fabric 事件：先冲刷挂起的防抖历史（拖拽/删除等），
    // 让本次修改成为历史栈中的独立一条，避免撤销时一次回退多个操作
    flushPendingHistory()

    // 更新我们自己的数据模型
    Object.assign(el, patch)

    // 同步到 Fabric 对象
    if (el.type === 'text') {
      const t = el as TextElement
      const textObj = obj as fabric.IText

      // GitHub bidi-shaper 对称实现：updateSelected 时也要解析 RTL 字体
      // 用 patch 应用后的最新 t（已经 Object.assign 过）来判断 direction / fontFamily
      const rtlUpdate = resolveRtlTextOptions(t)
      // t.fontFamily 保留用户所选值（属性面板显示）；渲染用哈萨克兜底字体栈
      const effectiveFontFamily = rtlRenderFontStack(patch.fontFamily ?? t.fontFamily, rtlUpdate.direction === 'rtl')
      const effectiveCharSpacing = rtlUpdate.direction === 'rtl' ? 0 : (patch.letterSpacing ?? t.letterSpacing) * 10

      textObj.set({
        text: patch.content ?? t.content,
        fontFamily: effectiveFontFamily,
        fontSize: patch.fontSize ?? t.fontSize,
        fontWeight: patch.fontWeight ?? t.fontWeight,
        fontStyle: patch.fontStyle ?? t.fontStyle,
        textAlign: patch.textAlign ?? t.textAlign,
        lineHeight: patch.lineHeight ?? t.lineHeight,
        charSpacing: effectiveCharSpacing,
        stroke: patch.strokeColor ?? t.strokeColor,
        strokeWidth: patch.strokeWidth ?? t.strokeWidth,
        opacity: patch.opacity ?? t.opacity,
        angle: patch.rotation ?? t.rotation,
        textDecoration: patch.textDecoration ?? t.textDecoration,
        direction: rtlUpdate.direction,
      })

      // 目标对象可能被拖拽缩放（scale ≠ 1）：显式设置字号时重置缩放，
      // 让 fontSize 直接等于视觉字号，避免刷过去的字号被目标 scale 放大/缩小
      if (patch.fontSize !== undefined) {
        textObj.set({ scaleX: 1, scaleY: 1 })
      }

      // 渐变 / 阴影 / 长阴影 / 霓虹 / 下划线：基于合并后的 t 无条件应用。
      // 格式刷"源带特效 → 刷上""源无特效 → 清掉目标特效"均正确（el 已合并 patch 的值）
      applyTextFxToObject(textObj, t)
    }

    if (el.type === 'image') {
      const img = el as ImageElement
      const imgPatch = patch as Partial<ImageElement>
      
      if (imgPatch.src && imgPatch.src !== img.src) {
        const newSrc = imgPatch.src
        const isSvgDataUrl = newSrc.startsWith('data:image/svg+xml')
        
        if (isSvgDataUrl) {
          const svgString = atob(newSrc.split(',')[1])
          loadSVGFromString(svgString).then((result: any) => {
            const newObj = fabricUtil.groupSVGElements(result.objects, result.options)
            if (!newObj || !fabricCanvas.value) return
            const scaleX = (obj.width || 1) / (newObj.width || 1)
            const scaleY = (obj.height || 1) / (newObj.height || 1)
            newObj.set({
              left: obj.left,
              top: obj.top,
              originX: 'center',
              originY: 'center',
              scaleX,
              scaleY,
              opacity: obj.opacity,
              angle: obj.angle,
            })
            ;(newObj as any).id = (obj as any).id
            ;(newObj as any).elementType = 'image'
            ;(newObj as any).srcUrl = newSrc
            const canvas = fabricCanvas.value
            canvas.remove(obj)
            canvas.add(newObj)
            canvas.setActiveObject(newObj)
            canvas.renderAll()
          }).catch((err: any) => {
            console.error('updateSelected: SVG image replace failed:', err)
          })
        } else {
          const isDataUrl = newSrc.startsWith('data:')
          const loadOpts = isDataUrl ? {} : { crossOrigin: 'anonymous' }
          fabric.FabricImage.fromURL(newSrc, loadOpts).then(newImg => {
            if (!newImg || !fabricCanvas.value) return
            // 保持宽高比：用统一缩放因子，使新图片适配旧图片的包围框
            const oldW = obj.width || 1
            const oldH = obj.height || 1
            const newW = newImg.width || 1
            const newH = newImg.height || 1
            const scale = Math.min(oldW / newW, oldH / newH)
            newImg.set({
              left: obj.left,
              top: obj.top,
              originX: 'center',
              originY: 'center',
              scaleX: scale,
              scaleY: scale,
              opacity: obj.opacity,
              angle: obj.angle,
            })
            ;(newImg as any).id = (obj as any).id
            ;(newImg as any).elementType = 'image'
            ;(newImg as any).srcUrl = newSrc
            const canvas = fabricCanvas.value
            canvas.remove(obj)
            canvas.add(newImg)
            canvas.setActiveObject(newImg)
            canvas.renderAll()
          }).catch(err => {
            console.error('updateSelected: image replace failed:', err)
          })
        }
      }
      
      obj.set({
        opacity: imgPatch.opacity ?? img.opacity,
        angle: imgPatch.rotation ?? img.rotation,
      })
      // 图片特效（CSS filter / 圆角 clipPath / 边框）：基于合并后的 img 无条件应用
      applyImageFxToObject(obj, img)
    }

    canvas.renderAll()

    // 本次样式修改作为独立历史条目（去重会拦截与栈顶相同的重复压栈）
    pushHistory('update style')
    opts.onSelectionChange?.(el)
  }

  // ---- 从 Fabric 反向同步（拖拽/缩放后）----
  function syncTextFromFabric() {
    const canvas = fabricCanvas.value
    if (!canvas) return
    canvas.getObjects().forEach(obj => {
      const id = obj.id as string
      const el = elements.value.find(e => e.id === id)
      if (!el || el.type !== 'text') return
      el.content = (obj as any).text ?? el.content
    })
  }

  function syncFromFabricToModel() {
    const canvas = fabricCanvas.value
    if (!canvas) return
    canvas.getObjects().forEach(obj => {
      const o = obj as any
      if (o.isGuide || o.isGrid) return
      const id = obj.id as string
      const el = elements.value.find(e => e.id === id)
      if (!el) return
      const scaleX = Math.abs(obj.scaleX || 1)
      const scaleY = Math.abs(obj.scaleY || 1)
      el.x = (o.left ?? 0)
      el.y = (o.top ?? 0)
      el.rotation = (o.angle ?? 0)
      el.opacity = (o.opacity ?? 1)
      // 同步所有元素类型的宽高（Fabric 对象的实际尺寸 = 原始尺寸 × scale）
      el.width = (obj.width || el.width) * scaleX
      el.height = (obj.height || el.height) * scaleY
      if (el.type === 'text') {
        // 占位符元素（defaults 非空 或 content 含注册表 token）保持模型 token 态：
        // Fabric 对象上的文本已被 refreshAllPlaceholders 替换为预览值，若回写会固化
        // 预览文本、丢失 {key} token，导致小程序端无法识别该字段
        const isPlaceholderElement = (el.defaults && typeof el.defaults === 'object' && Object.keys(el.defaults).length > 0) || PLACEHOLDER_TOKEN_RE.test(el.content || '')
        if (!isPlaceholderElement) {
          el.content = o.text ?? el.content
        }
        // 字号归一化：把对象缩放折算进 fontSize 并重置 scale，
        // 保证模型 fontSize = 视觉字号（格式刷/属性面板/序列化取到的都是正确值）
        const displayFontSize = (o.fontSize || el.fontSize || 24) * scaleX
        if (Math.abs(displayFontSize - el.fontSize) > 0.5) {
          el.fontSize = Math.round(displayFontSize)
          o.set({ scaleX: 1, scaleY: 1 })
        }
      }
    })
  }

  // ---- 历史栈 ----
  function getDraft(): CanvasDraft {
    syncFromFabricToModel()
    const validTypes = ['text', 'image', 'sticker']
    const validElements = elements.value.filter(el => validTypes.includes(el.type))
    return {
      canvasSize: { ...canvasSize.value },
      background: { ...background.value },
      elements: JSON.parse(JSON.stringify(validElements)),
      orientation: canvasSize.value.width > canvasSize.value.height ? 'landscape' : 'portrait',
    }
  }

  // ---- 日期占位符实时预览 ----
  /**
   * 全量占位符实时预览（注册表驱动）：
   * 覆盖全部 17 个中文/哈语 token，预览值优先级：元素 defaults（标记/识别回填的原文）> dateValues > 注册表示例值。
   * 新增占位符只需在 constants/placeholder-defs.ts 注册表追加一行，本函数零改动。
   */
  function refreshAllPlaceholders(dateValues: Record<string, string | undefined>) {
    const canvas = fabricCanvas.value
    if (!canvas) return
    const objMap = new Map(canvas.getObjects().map(o => [o.id, o]))
    elements.value.forEach(el => {
      if (el.type !== 'text') return
      const t = el as TextElement
      if (!PLACEHOLDER_TOKEN_RE.test(t.content)) return
      let resolved = t.content
      for (const def of PLACEHOLDER_DEFS) {
        const token = `{${def.key}}`
        if (!resolved.includes(token)) continue
        const value = (t.defaults && t.defaults[def.key]) || dateValues[def.key] || PLACEHOLDER_PREVIEW_VALUES[def.key]
        if (value) resolved = resolved.split(token).join(value)
      }
      const obj = objMap.get(el.id)
      if (!obj) return
      const textObj = obj as fabric.IText
      textObj.set('text', resolved)
      // 替换后重新解析 RTL：哈萨克字符用用户字体渲染、哈萨克字体兜底（不再强制替换所选字体）
      const containsRtl = RTL_REGEX.test(resolved)
      if (containsRtl) {
        const rtlDraft = resolveRtlTextOptions({ ...t, content: resolved } as TextElement)
        textObj.set({
          fontFamily: rtlRenderFontStack(rtlDraft.fontFamily, true),
          charSpacing: rtlDraft.charSpacing,
          direction: rtlDraft.direction,
          textAlign: t.textAlign || 'right',
        })
      }
    })
    canvas.renderAll()
  }

  async function loadDraft(draft: CanvasDraft, loadOpts?: { resetHistory?: boolean }) {
    const canvas = fabricCanvas.value
    if (!canvas) return

    suppressHistory = true
    // loadDraft 期间阻止异步图片加载触发多余历史记录
    loadDraftCount++
    isLoadDrafting = true

    // 清空：进入新画布世代，丢弃跨世代迟到的异步图片/贴纸加载结果
    canvasEpoch++
    const epoch = canvasEpoch
    canvas.getObjects().forEach(o => canvas.remove(o))
    canvas.discardActiveObject()

    canvasSize.value = { ...draft.canvasSize }
    canvas.setDimensions({ width: draft.canvasSize.width, height: draft.canvasSize.height })
    syncCanvasCssSize()
    background.value = { ...draft.background }
    applyBackground(draft.background)
    opts?.onBackgroundChange?.(draft.background)

    selectedId.value = null

    // 按 zIndex 排序
    const sorted = [...draft.elements].sort((a, b) => a.zIndex - b.zIndex)

    // 先收集到本地数组，循环结束后一次性赋值，减少响应式触发次数
    const loadedElements: AnyCanvasElement[] = []

    // Step 1: 文字层同步添加（按 zIndex 顺序 insertAt 精确落位）
    for (const el of sorted) {
      if (el.type === 'text') {
        const et = el as TextElement
        const rtlDraft = resolveRtlTextOptions(et)
        // et.fontFamily 保留数据值（属性面板显示用户所选字体）；渲染用哈萨克兜底字体栈

        const t = new fabric.IText(el.content, {
          left: el.x, top: el.y,
          originX: 'center', originY: 'center',
          fontFamily: rtlRenderFontStack(rtlDraft.fontFamily, rtlDraft.direction === 'rtl'), fontSize: el.fontSize,
          fontWeight: el.fontWeight, fontStyle: el.fontStyle,
          fill: el.color, textAlign: el.textAlign,
          lineHeight: el.lineHeight, charSpacing: rtlDraft.charSpacing,
          stroke: el.strokeColor, strokeWidth: el.strokeWidth,
          opacity: el.opacity, angle: el.rotation,
          direction: rtlDraft.direction,
          visible: el.visible !== false,
          lockRotation: el.locked, selectable: !el.locked,
        })
        // 恢复文字特效（渐变/阴影/长阴影/霓虹/下划线），撤销/重做/加载草稿时不丢失
        applyTextFxToObject(t, et)
        ;t.id = el.id
        ;t.elementType = 'text'
        canvas.insertAt(el.zIndex, t)
        loadedElements.push(el)
      }
    }

    // Step 2: 图片/贴纸层串行加载（await 逐个完成，insertAt 精确落位，避免并发位置偏移）
    for (const el of sorted) {
      if (el.type === 'image') {
        const ie = el as ImageElement
        try {
          const img = await fabric.FabricImage.fromURL(ie.src, { crossOrigin: 'anonymous' })
          // 画布已进入新世代（清空/翻页/切模式/撤销重做）时丢弃迟到结果，避免污染当前 model 与画布
          if (epoch !== canvasEpoch || canvas !== fabricCanvas.value) continue
          const sx = ie.width / (img.width || 1)
          const sy = ie.height / (img.height || 1)
          img.set({
            left: el.x, top: el.y,
            originX: 'center', originY: 'center',
            scaleX: sx, scaleY: sy,
            opacity: ie.opacity, angle: ie.rotation,
            visible: ie.visible !== false,
            lockRotation: ie.locked, selectable: !ie.locked,
          })
          // 恢复图片特效（CSS filter / 圆角 clipPath / 边框）
          applyImageFxToObject(img, ie)
          ;img.id = ie.id
          ;img.elementType = 'image'
          ;img.srcUrl = ie.src
          canvas.insertAt(ie.zIndex, img)
          loadedElements.push(el)
        } catch {
          // loadDraft 时图片加载失败不中断其他元素
        }
      } else if (el.type === 'sticker') {
        const se = el as StickerElement
        // 防御性：PSD 导入等场景可能产生 sticker 类型，尝试以 SVG 形式渲染上画布，
        // 避免撤销/重做后贴纸元素只存在于 model、画布上消失
        if (se.svgContent) {
          try {
            const result: any = await loadSVGFromString(se.svgContent)
            // 画布已进入新世代（清空/翻页/切模式/撤销重做）时丢弃迟到结果
            if (epoch !== canvasEpoch || canvas !== fabricCanvas.value) continue
            const svgObj = fabricUtil.groupSVGElements(result.objects, result.options)
            if (!svgObj) continue
            const sx = se.width / (svgObj.width || 1)
            const sy = se.height / (svgObj.height || 1)
            svgObj.set({
              left: se.x, top: se.y,
              originX: 'center', originY: 'center',
              scaleX: sx, scaleY: sy,
              opacity: se.opacity, angle: se.rotation,
              visible: se.visible !== false,
              lockRotation: se.locked, selectable: !se.locked,
            })
            ;(svgObj as any).id = se.id
            ;(svgObj as any).elementType = 'sticker'
            canvas.insertAt(se.zIndex, svgObj)
            loadedElements.push(el)
          } catch {
            // 贴纸 SVG 加载失败不中断其他元素
          }
        }
      }
    }

    // 循环结束后一次性赋值模型元素列表
    elements.value = loadedElements

    // 所有对象已就位（文字同步插入 + 图片/贴纸串行加载完成），此时同步 zIndex
    updateZIndexFromFabric()
    canvas.renderAll()

    // 默认清空历史栈并推入初始记录；undo/redo 调用时传入 resetHistory:false 以保留历史。
    // pushHistory 在 isLoadDrafting 期间会被拦截，这里手动压入完整草稿作为初始历史
    if (loadOpts?.resetHistory !== false) {
      const initialDraft = getDraft()
      history.value = [initialDraft]
      historyIdx.value = 0
      updateCanUndoRedo()
      suppressHistory = false
    } else {
      // undo/redo 场景：保留历史栈，仅恢复 suppressHistory 状态
      suppressHistory = false
    }

    // 等待所有异步图片加载完成后，关闭 isLoadDrafting 标志
    // 避免图片加载完成时 object:added 事件触发多余的历史记录
    // 用嵌套计数：只有所有 loadDraft 都结束时才真正关闭标志
    if (imagePromises.length > 0) {
      Promise.all(imagePromises).finally(() => {
        loadDraftCount--
        isLoadDrafting = loadDraftCount > 0
      })
    } else {
      // 无异步图片任务，立即关闭标志
      loadDraftCount--
      isLoadDrafting = loadDraftCount > 0
    }
  }

  function pushHistory(description = 'change') {
    if (suppressHistory || isLoadDrafting) return
    const draft = getDraft()

    // 去重：与当前指针指向的快照完全一致时不压栈。
    // 消除双重压栈：canvas.remove/add 触发的 object:added/removed 防抖
    // 与函数末尾显式 pushHistory（duplicate/bringToFront/editing:exited 等）会压入相同状态
    const top = history.value[historyIdx.value]
    if (top) {
      try {
        if (JSON.stringify(top) === JSON.stringify(draft)) {
          // 状态未变化：保持当前指针（若已在栈顶则不动；若已回退则视为原地踏步）
          updateCanUndoRedo()
          return
        }
      } catch (e) {
        // 序列化失败时跳过去重
      }
    }

    // 如果当前不在栈顶（已回退过），截断之后的历史
    if (historyIdx.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIdx.value + 1)
    }

    // shallowRef 不会自动追踪数组方法，需用新数组整体替换以触发响应式
    const newHistory = [...history.value, draft]
    if (newHistory.length > MAX_HISTORY) newHistory.shift()
    history.value = newHistory
    historyIdx.value = history.value.length - 1
    updateCanUndoRedo()
  }

  // throttle：避免高频事件每一次都压栈
  let pushTimer: ReturnType<typeof setTimeout> | null = null
  // 对齐检测节流：限制参考线计算频率（20fps），避免每次 mousemove 都重算
  let alignCheckTimer: ReturnType<typeof setTimeout> | null = null
  let pendingAlignEvent: any = null

  // 结构变更（新增/删除元素）立即入历史，不用 300ms 防抖：
  // 连续快速添加若被合并成一条历史，一次撤销会回退多步（"撤销时一堆东西消失"）
  function pushHistoryStructural(e: any) {
    if (e?.target && (e.target.isGuide || e.target.isGrid)) return
    if (suppressHistory || isLoadDrafting) return
    if (pushTimer) { clearTimeout(pushTimer); pushTimer = null }
    pushHistory('structure change')
  }

  // 属性变更（拖拽/缩放/旋转）用 300ms 防抖合并为一条历史
  function pushHistoryIfNeeded() {
    if (suppressHistory || isLoadDrafting) {
      // 拦截期间清掉挂起的定时器，避免恢复后旧定时器把状态压栈、截断 redo 栈
      if (pushTimer) { clearTimeout(pushTimer); pushTimer = null }
      return
    }
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = setTimeout(() => {
      pushHistory('modify')
    }, 300)
  }

  // 立即冲刷挂起的防抖历史。
  // updateSelected / nudgeElement 等"直接改 model + canvas、不触发 fabric 事件"的操作
  // 在应用修改前先 flush，把拖拽/删除等上一个交互的状态定格为独立历史条目，
  // 保证撤销时每个操作都能单独回退，不会一次跳回好几步
  function flushPendingHistory() {
    if (pushTimer) {
      clearTimeout(pushTimer)
      pushTimer = null
      pushHistory('modify')
    }
  }

  function undo() {
    if (historyIdx.value <= 0) return
    // 清除未触发的 300ms 防抖定时器，避免撤销后旧定时器把状态重新压栈、截断 redo 栈
    if (pushTimer) {
      clearTimeout(pushTimer)
      pushTimer = null
    }
    historyIdx.value -= 1
    const draft = history.value[historyIdx.value]
    suppressHistory = true
    loadDraft(draft, { resetHistory: false })
    suppressHistory = false
    updateCanUndoRedo()
  }

  function redo() {
    if (historyIdx.value >= history.value.length - 1) return
    // 同 undo：清除防抖定时器，避免重做后旧定时器污染历史栈
    if (pushTimer) {
      clearTimeout(pushTimer)
      pushTimer = null
    }
    historyIdx.value += 1
    const draft = history.value[historyIdx.value]
    suppressHistory = true
    loadDraft(draft, { resetHistory: false })
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
    if (alignCheckTimer) {
      clearTimeout(alignCheckTimer)
      alignCheckTimer = null
    }
    pendingAlignEvent = null
  }

  // ---- 清空画布（供外部调用）----
  function clearCanvas() {
    const canvas = fabricCanvas.value
    if (!canvas) return
    if (pushTimer) { clearTimeout(pushTimer); pushTimer = null }
    // 清空画布 = 进入新世代，丢弃此前所有未完成的异步图片加载结果
    canvasEpoch++
    // 批量移除只产生一条历史，避免每个对象各触发一条结构历史
    suppressHistory = true
    canvas.getObjects().forEach(o => canvas.remove(o))
    canvas.discardActiveObject()
    elements.value = []
    selectedId.value = null
    suppressHistory = false
    pushHistory('clear canvas')
  }

  // ---- 网格与参考线 ----
  function clearGuideLines() {
    const canvas = fabricCanvas.value
    if (!canvas) return
    // 同时清理 guideLines 引用和画布上所有 isGuide 标记的对象
    const toRemove = canvas.getObjects().filter((obj: any) => obj.isGuide)
    toRemove.forEach(g => canvas.remove(g))
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
      lines.push(new fabric.Line([x, 0, x, h], { stroke: 'rgba(0,0,0,0.05)', strokeWidth: 1, selectable: false, evented: false }))
    }
    for (let y = gs; y < h; y += gs) {
      lines.push(new fabric.Line([0, y, w, y], { stroke: 'rgba(0,0,0,0.05)', strokeWidth: 1, selectable: false, evented: false }))
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

  // 精确移动
  function nudgeElement(id: string, dx: number, dy: number) {
    const canvas = fabricCanvas.value
    if (!canvas) return
    const obj = canvas.getObjects().find(o => o.id === id)
    if (!obj) return
    obj.set({
      left: (obj.left || 0) + dx,
      top: (obj.top || 0) + dy,
    } as any)
    obj.setCoords()
    canvas.renderAll()
    // 同步 model
    const el = elements.value.find(e => e.id === id)
    if (el) {
      el.x = (obj.left || 0)
      el.y = (obj.top || 0)
    }
    // 方向键微调直接改坐标不触发 fabric 事件：记录独立历史，避免撤销一次跳回好几步
    pushHistory('nudge')
  }

  // 原地复制（Ctrl+D）
  function duplicateSelected() {
    const canvas = fabricCanvas.value
    if (!canvas || !selectedId.value) return
    const obj = canvas.getObjects().find(o => o.id === selectedId.value)
    if (!obj) return
    obj.clone().then((cloned: any) => {
      cloned.set({ left: (cloned.left || 0) + 10, top: (cloned.top || 0) + 10 })
      cloned.id = createId(obj.type === 'i-text' ? 'text' : obj.type === 'image' ? 'image' : 'sticker')
      ;cloned.elementType = obj.elementType || 'sticker'

      // 先同步 model 再 add：保证 object:added 触发历史快照时元素已在 model 中
      const sourceEl = elements.value.find(e => e.id === selectedId.value)
      if (sourceEl) {
        const newEl = JSON.parse(JSON.stringify(sourceEl))
        newEl.id = cloned.id
        newEl.x = cloned.left || 0
        newEl.y = cloned.top || 0
        newEl.name = (sourceEl.name || '元素') + ' 副本'
        elements.value.push(newEl)
        selectedId.value = newEl.id
      }

      canvas.add(cloned)
      canvas.setActiveObject(cloned)
      updateZIndexFromFabric()
      canvas.renderAll()
      pushHistory('duplicate')
    })
  }

  // 组件挂载/卸载钩子
  onMounted(() => init())
  // 监听 canvasRef：登录成功后 canvas DOM 才出现，此时需重新触发 init()
  // （onMounted 在登录界面显示时执行，canvasRef 为空，init 会提前返回）
  watch(opts.canvasRef, (el) => {
    if (el && !fabricCanvas.value) {
      nextTick(() => init())
    }
  })
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
    clipboard,

    // 操作
    init,
    setSize,
    setBackground,
    addText,
    addImage,
    importPsdLayers,
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
    reorderElements,
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
    nudgeElement,
    duplicateSelected,
    refreshAllPlaceholders,
  }
}
