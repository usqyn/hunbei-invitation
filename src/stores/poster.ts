import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { request } from '@/utils/request'
import { resolveUrl } from '@/utils/url'
import { uniqueId } from '@/utils/common'
import type { PosterTemplate, PosterEditableAreaRuntime, StickerItem } from '@/types/poster'

const MAX_HISTORY = 30

export const FONT_OPTIONS = [
  { label: '默认', value: 'sans-serif' },
  { label: '宋体', value: 'SimSun' },
  { label: '黑体', value: 'SimHei' },
  { label: '楷体', value: 'KaiTi' },
  { label: '微软雅黑', value: 'Microsoft YaHei' },
]

export const COLOR_OPTIONS = [
  '#ffffff', '#333333', '#e74c3c', '#e67e22', '#f39c12',
  '#27ae60', '#1abc9c', '#3498db', '#9b59b6', '#c0392b', '#7f8c8d',
]

export const usePosterStore = defineStore('poster', () => {
  // ---- state ----
  const currentTemplate = ref<PosterTemplate | null>(null)
  const editableAreas = ref<PosterEditableAreaRuntime[]>([])
  const selectedAreaId = ref<string | null>(null)

  const history = ref<PosterEditableAreaRuntime[][]>([])
  const historyIndex = ref(-1)

  const scale = ref(1)
  const canvasSize = ref({ width: 375, height: 667 })

  const previewImage = ref('')
  const showPreview = ref(false)

  const stickers = ref<StickerItem[]>([])
  const showStickerPanel = ref(false)

  const showTemplatePicker = ref(false)
  const showLayerPanel = ref(false)
  const relatedTemplates = ref<PosterTemplate[]>([])

  const currentWorkId = ref<string | null>(null)
  const templateLoading = ref(false)

  const fontOptions = FONT_OPTIONS
  const fontFamilies = FONT_OPTIONS.map(f => f.value)
  const colorOptions = COLOR_OPTIONS

  // ---- helpers ----
  function cloneAreas(): PosterEditableAreaRuntime[] {
    return editableAreas.value.map(a => ({ ...a }))
  }

  function getArea(id: string): PosterEditableAreaRuntime | undefined {
    return editableAreas.value.find(a => a.id === id)
  }

  // ---- actions ----
  async function loadTemplate(id: string) {
    templateLoading.value = true
    try {
      const data = await request<PosterTemplate>({ url: `/api/poster/templates/${id}`, hideLoading: true })
      if (data) {
        initEditor(data)
        return true
      }
    } catch (e) {
      console.warn('loadTemplate failed:', e)
    } finally {
      templateLoading.value = false
    }
    return false
  }

  function initEditor(template: PosterTemplate) {
    // 存储前对模板封面/背景图做 URL 归一化，补全相对路径
    currentTemplate.value = {
      ...template,
      cover_url: resolveUrl(template.cover_url),
      background_url: resolveUrl(template.background_url),
    }
    canvasSize.value = {
      width: template.config.width,
      height: template.config.height,
    }
    editableAreas.value.splice(0, editableAreas.value.length)
    if (template.config.editableAreas && Array.isArray(template.config.editableAreas)) {
      template.config.editableAreas.forEach(area => {
        editableAreas.value.push({
          ...area,
          label: area.label || '',
          defaultImage: area.defaultImage ? resolveUrl(area.defaultImage) : undefined,
          _x: area.x,
          _y: area.y,
          _w: area.width,
          _h: area.height,
          _text: area.type === 'text' ? (area.defaultText || '') : undefined,
          _src: area.type === 'image' ? (area.defaultImage ? resolveUrl(area.defaultImage) : '') : undefined,
          _fontSize: area.fontSize || 28,
          _color: area.color || '#333333',
          _align: area.align || 'center',
          _bold: area.bold || false,
          _rotate: 0,
          _scale: 1,
          _fontFamily: 'sans-serif',
        })
      })
    }
    history.value = []
    historyIndex.value = -1
    pushHistory()
  }

  /** Restore editable areas from saved work content */
  function restoreFromWork(areas: PosterEditableAreaRuntime[], content?: any) {
    if (!areas || !Array.isArray(areas)) return
    editableAreas.value.splice(0, editableAreas.value.length)
    areas.forEach(a => {
      const restoredArea: PosterEditableAreaRuntime = {
        id: a.id,
        type: a.type,
        label: a.label || '',
        x: a._x ?? a.x,
        y: a._y ?? a.y,
        width: a._w ?? a.width,
        height: a._h ?? a.height,
        defaultText: a.defaultText,
        defaultImage: a.defaultImage,
        fontSize: a._fontSize,
        color: a._color,
        align: a._align as PosterEditableAreaRuntime['align'],
        bold: a._bold,
        borderRadius: a.borderRadius,
        _x: a._x,
        _y: a._y,
        _w: a._w,
        _h: a._h,
        _text: a._text,
        _src: a._src ? resolveUrl(a._src) : a._src,
        _fontSize: a._fontSize || 28,
        _color: a._color || '#333333',
        _align: a._align || 'center',
        _bold: a._bold || false,
        _rotate: a._rotate || 0,
        _scale: a._scale || 1,
        _fontFamily: a._fontFamily || 'sans-serif',
      }
      editableAreas.value.push(restoredArea)
    })
    // 恢复 canvasSize 和 background
    if (content?.canvasSize) {
      canvasSize.value = { ...content.canvasSize }
    }
    if (content?.background_url) {
      customBackground.value = resolveUrl(content.background_url)
    }
    history.value = []
    historyIndex.value = -1
    pushHistory()
  }

  function selectArea(id: string | null) {
    selectedAreaId.value = id
  }

  function updateText(id: string, text: string) {
    const area = getArea(id)
    if (area) {
      area._text = text
    }
    pushHistory()
  }

  function updateImage(id: string, src: string) {
    const area = getArea(id)
    if (area) {
      area._src = src
    }
    pushHistory()
  }

  type StyleField = 'fontSize' | 'color' | 'align' | 'bold' | 'rotate' | 'scale' | 'fontFamily' | 'x' | 'y' | 'w' | 'h'

  function updateStyle(id: string, field: StyleField, value: string | number | boolean) {
    const area = getArea(id)
    if (!area) return
    const map: Record<StyleField, keyof PosterEditableAreaRuntime> = {
      fontSize: '_fontSize',
      color: '_color',
      align: '_align',
      bold: '_bold',
      rotate: '_rotate',
      scale: '_scale',
      fontFamily: '_fontFamily',
      x: '_x',
      y: '_y',
      w: '_w',
      h: '_h',
    }
    const key = map[field]
    ;(area as unknown as Record<string, unknown>)[key] = value
    pushHistory()
  }

  function pushHistory() {
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }
    history.value.push(cloneAreas())
    historyIndex.value++
    if (history.value.length > MAX_HISTORY) {
      history.value.shift()
      historyIndex.value--
    }
  }

  function undo() {
    if (historyIndex.value <= 0) return
    historyIndex.value--
    restoreFromHistory()
  }

  function redo() {
    if (historyIndex.value >= history.value.length - 1) return
    historyIndex.value++
    restoreFromHistory()
  }

  function restoreFromHistory() {
    const snapshot = history.value[historyIndex.value]
    if (!snapshot) return
    editableAreas.value.splice(0, editableAreas.value.length)
    snapshot.forEach(a => editableAreas.value.push({ ...a }))
  }

  const canUndo = computed(() => historyIndex.value > 0)

  const canRedo = computed(() => historyIndex.value < history.value.length - 1)

  function resetArea(id: string) {
    const area = getArea(id)
    if (!area) return
    area._x = area.x
    area._y = area.y
    area._w = area.width
    area._h = area.height
    area._text = area.defaultText || ''
    area._src = area.defaultImage ? resolveUrl(area.defaultImage) : ''
    area._fontSize = area.fontSize || 28
    area._color = area.color || '#333333'
    area._align = area.align || 'center'
    area._bold = area.bold || false
    area._rotate = 0
    area._scale = 1
    area._fontFamily = 'sans-serif'
  }

  async function drawPoster(canvas: any, scale: number = 1): Promise<string> {
    if (!currentTemplate.value) return ''
    const tmpl = currentTemplate.value
    // 逻辑画布尺寸（用于绘制坐标）
    const W = canvasSize.value.width
    const H = canvasSize.value.height
    // 实际像素尺寸（高清导出时按比例放大）
    const cw = Math.round(W * scale)
    const ch = Math.round(H * scale)

    const ctx = canvas.getContext('2d')
    canvas.width = cw
    canvas.height = ch
    // 放大绘制上下文，后续坐标沿用逻辑尺寸 W/H
    if (scale !== 1) ctx.scale(scale, scale)

    // background
    const bgUrl = resolveUrl(tmpl.background_url)
    await drawImageToCanvas(canvas, ctx, bgUrl, 0, 0, W, H)

    // editable areas
    for (const area of editableAreas.value) {
      const ax = area._x ?? area.x
      const ay = area._y ?? area.y
      const aw = (area._w ?? area.width) * (area._scale ?? 1)
      const ah = (area._h ?? area.height) * (area._scale ?? 1)
      const rotate = area._rotate || 0

      ctx.save()
      ctx.translate(ax + aw / 2, ay + ah / 2)
      if (rotate) ctx.rotate((rotate * Math.PI) / 180)
      ctx.translate(-aw / 2, -ah / 2)

      if (area.type === 'image' && area._src) {
        try {
          await drawImageToCanvas(canvas, ctx, area._src, 0, 0, aw, ah, area.borderRadius)
        } catch (e) {
          console.warn('draw image area failed:', e)
        }
      } else if (area.type === 'text' && area._text) {
        const fontSize = area._fontSize || 28
        const color = area._color || '#333333'
        const align = (area._align as CanvasTextAlign) || 'center'
        const bold = area._bold ? 'bold ' : ''
        const fontFamily = area._fontFamily || 'sans-serif'

        ctx.font = `${bold}${fontSize}px ${fontFamily}`
        ctx.fillStyle = color
        ctx.textAlign = align
        ctx.textBaseline = 'middle'

        const lines = wrapText(ctx, area._text, aw)
        const lineHeight = fontSize * 1.4
        const startY = ah / 2 - ((lines.length - 1) * lineHeight) / 2
        let x = aw / 2
        if (align === 'left') x = 0
        else if (align === 'right') x = aw

        lines.forEach((line, i) => {
          ctx.fillText(line, x, startY + i * lineHeight)
        })
      }
      ctx.restore()
    }

    return new Promise((resolve) => {
      // #ifdef MP-WEIXIN
      uni.canvasToTempFilePath({
        canvas,
        success: (res: any) => resolve(res.tempFilePath),
        fail: () => resolve(''),
      } as any)
      // #endif
      // #ifndef MP-WEIXIN
      try {
        const dataUrl = canvas.toDataURL('image/png')
        resolve(dataUrl)
      } catch {
        resolve('')
      }
      // #endif
    })
  }

  function wrapText(ctx: any, text: string, maxWidth: number): string[] {
    const lines: string[] = []
    const paragraphs = text.split('\n')
    for (const para of paragraphs) {
      if (!ctx.measureText) {
        lines.push(para)
        continue
      }
      let current = ''
      for (const char of para) {
        const test = current + char
        if (ctx.measureText(test).width > maxWidth && current) {
          lines.push(current)
          current = char
        } else {
          current = test
        }
      }
      lines.push(current)
    }
    return lines
  }

  /** Draw image to canvas — canvas param needed for createImage() */
  function drawImageToCanvas(
    canvas: any,
    ctx: any,
    src: string,
    x: number,
    y: number,
    w: number,
    h: number,
    borderRadius?: number,
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!src) { resolve(); return }
      const img = canvas.createImage ? canvas.createImage() : new Image()
      img.onload = () => {
        try {
          if (borderRadius && borderRadius > 0) {
            ctx.save()
            ctx.beginPath()
            const r = borderRadius
            ctx.moveTo(x + r, y)
            ctx.lineTo(x + w - r, y)
            ctx.arc(x + w - r, y + r, r, Math.PI * 1.5, 0)
            ctx.lineTo(x + w, y + h - r)
            ctx.arc(x + w - r, y + h - r, r, 0, Math.PI * 0.5)
            ctx.lineTo(x + r, y + h)
            ctx.arc(x + r, y + h - r, r, Math.PI * 0.5, Math.PI)
            ctx.closePath()
            ctx.clip()
            ctx.drawImage(img, x, y, w, h)
            ctx.restore()
          } else {
            ctx.drawImage(img, x, y, w, h)
          }
        } catch (e) {
          console.warn('drawImageToCanvas error:', e)
        }
        resolve()
      }
      img.onerror = () => resolve()
      img.src = src
    })
  }

  async function saveWork(): Promise<string | null> {
    if (!currentTemplate.value) return null
    try {
      const payload = {
        template_id: currentTemplate.value.id,
        template_name: currentTemplate.value.name,
        cover_url: currentTemplate.value.cover_url,
        content: {
          editableAreas: editableAreas.value.map(a => ({
            id: a.id,
            type: a.type,
            label: a.label || '',
            defaultText: a.defaultText,
            defaultImage: a.defaultImage,
            fontSize: a.fontSize,
            color: a.color,
            align: a.align,
            bold: a.bold,
            borderRadius: a.borderRadius,
            _x: a._x,
            _y: a._y,
            _w: a._w,
            _h: a._h,
            _text: a._text,
            _src: a._src,
            _fontSize: a._fontSize,
            _color: a._color,
            _align: a._align,
            _bold: a._bold,
            _rotate: a._rotate,
            _scale: a._scale,
            _fontFamily: a._fontFamily,
          })),
          canvasSize: { ...canvasSize.value },
          background_url: currentTemplate.value.background_url,
        },
      }

      let data: { id: string } | null
      if (currentWorkId.value) {
        // Update existing work
        data = await request<{ id: string }>({
          url: `/api/poster/works/${currentWorkId.value}`,
          method: 'PUT',
          data: payload,
        })
      } else {
        // Create new work
        data = await request<{ id: string }>({
          url: '/api/poster/works',
          method: 'POST',
          data: payload,
        })
        if (data?.id) {
          currentWorkId.value = data.id
        }
      }

      uni.showToast({ title: '保存成功', icon: 'success' })
      return data?.id || currentWorkId.value || null
    } catch (e) {
      console.warn('saveWork failed:', e)
      uni.showToast({ title: '保存失败', icon: 'none' })
      return null
    }
  }

  async function loadStickers() {
    if (stickers.value.length > 0) return // already loaded
    try {
      const data = await request<StickerItem[]>({ url: '/api/poster/stickers', hideLoading: true })
      if (data && Array.isArray(data)) {
        stickers.value = data.map(s => ({
          id: s.id || s.name || '',
          name: s.name || s.id || '',
          url: resolveUrl(s.url),
        }))
      }
    } catch (e) {
      console.warn('loadStickers failed:', e)
    }
  }
  function insertSticker(src: string) {
    const id = uniqueId('sticker_')
    const stickerSize = canvasSize.value.width * 0.2
    const resolvedSrc = resolveUrl(src)
    const newArea: PosterEditableAreaRuntime = {
      id,
      type: 'image',
      label: '贴纸',
      x: canvasSize.value.width / 2 - stickerSize / 2,
      y: canvasSize.value.height / 2 - stickerSize / 2,
      width: stickerSize,
      height: stickerSize,
      defaultImage: resolvedSrc,
      borderRadius: 0,
      _x: canvasSize.value.width / 2 - stickerSize / 2,
      _y: canvasSize.value.height / 2 - stickerSize / 2,
      _w: stickerSize,
      _h: stickerSize,
      _src: resolvedSrc,
      _rotate: 0,
      _scale: 1,
    }
    editableAreas.value.push(newArea)
    selectedAreaId.value = id
    pushHistory()
  }

  /** 添加一个新文字元素 */
  function addText() {
    const id = uniqueId('text_')
    const cw = canvasSize.value.width
    const ch = canvasSize.value.height
    const newArea: PosterEditableAreaRuntime = {
      id,
      type: 'text',
      label: '文字',
      x: cw / 2 - 100,
      y: ch / 2 - 24,
      width: 200,
      height: 48,
      fontSize: 28,
      color: '#333333',
      align: 'center',
      bold: false,
      _x: cw / 2 - 100,
      _y: ch / 2 - 24,
      _w: 200,
      _h: 48,
      _text: '点击编辑文字',
      _fontSize: 28,
      _color: '#333333',
      _align: 'center',
      _bold: false,
      _rotate: 0,
      _scale: 1,
      _fontFamily: 'sans-serif',
    }
    editableAreas.value.push(newArea)
    selectedAreaId.value = id
    pushHistory()
  }

  async function switchTemplate(id: string) {
    showTemplatePicker.value = false
    // 切换模板时重置当前作品 ID，避免保存覆盖旧作品
    currentWorkId.value = null
    selectedAreaId.value = null
    customBackground.value = ''
    previewImage.value = ''
    showPreview.value = false
    await loadTemplate(id)
  }

  async function loadRelatedTemplates(categoryId?: string) {
    try {
      const params: Record<string, any> = { limit: 10 }
      if (categoryId) params.category_id = categoryId
      const data = await request<PosterTemplate[]>({
        url: '/api/poster/templates',
        data: params,
        hideLoading: true,
      })
      if (data && Array.isArray(data)) {
        // 对关联模板的封面/背景图做 URL 归一化，补全相对路径
        relatedTemplates.value = data.map(t => ({
          ...t,
          cover_url: resolveUrl(t.cover_url),
          background_url: resolveUrl(t.background_url),
        }))
      }
    } catch (e) {
      console.warn('loadRelatedTemplates failed:', e)
    }
  }

  // ---- layer management ----
  function moveLayer(idx: number, direction: string) {
    if (idx < 0 || idx >= editableAreas.value.length) return
    let newIdx = idx
    switch (direction) {
      case 'up': newIdx = idx - 1; break
      case 'down': newIdx = idx + 1; break
      case 'top': newIdx = 0; break
      case 'bottom': newIdx = editableAreas.value.length - 1; break
    }
    if (newIdx === idx || newIdx < 0 || newIdx >= editableAreas.value.length) return

    const item = editableAreas.value.splice(idx, 1)[0]
    editableAreas.value.splice(newIdx, 0, item)
    pushHistory()
  }

  function deleteElement(idx: number) {
    if (idx < 0 || idx >= editableAreas.value.length) return
    const areaId = editableAreas.value[idx].id
    editableAreas.value.splice(idx, 1)
    if (selectedAreaId.value === areaId) {
      selectedAreaId.value = null
    }
    pushHistory()
  }

  /** Set current work ID (for edit existing work) */
  function setWorkId(id: string | null) {
    currentWorkId.value = id
  }

  /** 自定义背景图，记录用户选择的背景 URL */
  const customBackground = ref('')

  /** 更换海报背景图（预设或自定义上传的 URL） */
  function setBackground(url: string) {
    if (!url) return
    // 对背景图做 URL 归一化，补全相对路径
    const resolved = resolveUrl(url)
    if (currentTemplate.value) {
      currentTemplate.value.background_url = resolved
    }
    customBackground.value = resolved
    pushHistory()
  }

  return {
    // state
    currentTemplate,
    editableAreas,
    selectedAreaId,
    history,
    historyIndex,
    scale,
    canvasSize,
    previewImage,
    showPreview,
    stickers,
    showStickerPanel,
    showTemplatePicker,
    showLayerPanel,
    relatedTemplates,
    currentWorkId,
    templateLoading,
    fontOptions,
    fontFamilies,
    colorOptions,
    // actions
    loadTemplate,
    initEditor,
    restoreFromWork,
    selectArea,
    updateText,
    updateImage,
    updateStyle,
    pushHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    resetArea,
    drawPoster,
    saveWork,
    loadStickers,
    insertSticker,
    addText,
    switchTemplate,
    loadRelatedTemplates,
    moveLayer,
    deleteElement,
    setWorkId,
    customBackground,
    setBackground,
  }
})
