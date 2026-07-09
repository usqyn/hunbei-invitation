import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { request } from '@/utils/request'
import { API_BASE } from '@/config'
import type { PosterTemplate, PosterEditableArea } from '@/types/poster'

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

interface StickerItem {
  id: string
  name: string
  url: string
}

export const usePosterStore = defineStore('poster', () => {
  // ---- state ----
  const currentTemplate = ref<PosterTemplate | null>(null)
  const editableAreas = reactive<PosterEditableArea[]>([])
  const selectedAreaId = ref<string | null>(null)

  const history = ref<PosterEditableArea[][]>([])
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
  function resolveUrl(url: string): string {
    if (!url) return url
    if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('wxfile://')) return url
    if (url.startsWith('/uploads/')) return API_BASE + url
    return url
  }

  function cloneAreas(): PosterEditableArea[] {
    return editableAreas.map(a => ({ ...a }))
  }

  function getArea(id: string): PosterEditableArea | undefined {
    return editableAreas.find(a => a.id === id)
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
    currentTemplate.value = template
    canvasSize.value = {
      width: template.config.width,
      height: template.config.height,
    }
    editableAreas.splice(0, editableAreas.length)
    if (template.config.editableAreas && Array.isArray(template.config.editableAreas)) {
      template.config.editableAreas.forEach(area => {
        editableAreas.push({
          ...area,
          label: (area as any).label || '',
          defaultImage: (area as any).defaultImage ? resolveUrl((area as any).defaultImage) : undefined,
          _x: area.x,
          _y: area.y,
          _w: area.width,
          _h: area.height,
          _text: area.type === 'text' ? (area.defaultText || '') : undefined,
          _src: area.type === 'image' ? ((area as any).defaultImage ? resolveUrl((area as any).defaultImage) : '') : undefined,
          _fontSize: area.fontSize || 28,
          _color: area.color || '#333333',
          _align: (area as any).align || 'center',
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
  function restoreFromWork(areas: any[]) {
    editableAreas.splice(0, editableAreas.length)
    areas.forEach(a => {
      editableAreas.push({
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
        align: a._align,
        bold: a._bold,
        borderRadius: a.borderRadius,
        _x: a._x,
        _y: a._y,
        _w: a._w,
        _h: a._h,
        _text: a._text,
        _src: a._src,
        _fontSize: a._fontSize || 28,
        _color: a._color || '#333333',
        _align: a._align || 'center',
        _bold: a._bold || false,
        _rotate: a._rotate || 0,
        _scale: a._scale || 1,
        _fontFamily: a._fontFamily || 'sans-serif',
      })
    })
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
  }

  function updateImage(id: string, src: string) {
    const area = getArea(id)
    if (area) {
      area._src = src
    }
  }

  function updateStyle(id: string, field: string, value: any) {
    const area = getArea(id)
    if (!area) return
    const map: Record<string, keyof PosterEditableArea> = {
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
    const key = map[field] || field
    ;(area as any)[key] = value
  }

  function pushHistory() {
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }
    history.value.push(cloneAreas())
    if (history.value.length > MAX_HISTORY) {
      history.value.shift()
    } else {
      historyIndex.value++
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
    editableAreas.splice(0, editableAreas.length)
    snapshot.forEach(a => editableAreas.push({ ...a }))
  }

  function canUndo() {
    return historyIndex.value > 0
  }

  function canRedo() {
    return historyIndex.value < history.value.length - 1
  }

  function resetArea(id: string) {
    const area = getArea(id)
    if (!area) return
    area._x = area.x
    area._y = area.y
    area._w = area.width
    area._h = area.height
    area._text = area.defaultText || ''
    area._src = (area as any).defaultImage ? resolveUrl((area as any).defaultImage) : ''
    area._fontSize = area.fontSize || 28
    area._color = area.color || '#333333'
    area._align = (area as any).align || 'center'
    area._bold = area.bold || false
    area._rotate = 0
    area._scale = 1
    area._fontFamily = 'sans-serif'
  }

  async function drawPoster(canvas: any): Promise<string> {
    if (!currentTemplate.value) return ''
    const tmpl = currentTemplate.value
    const cw = canvasSize.value.width
    const ch = canvasSize.value.height

    const ctx = canvas.getContext('2d')
    canvas.width = cw
    canvas.height = ch

    // background
    const bgUrl = resolveUrl(tmpl.background_url)
    await drawImageToCanvas(canvas, ctx, bgUrl, 0, 0, cw, ch)

    // editable areas
    for (const area of editableAreas) {
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
      })
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
          editableAreas: editableAreas.map(a => ({
            id: a.id,
            type: a.type,
            label: (a as any).label || '',
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
    const id = `sticker_${Date.now()}`
    const stickerSize = canvasSize.value.width * 0.2
    const newArea: PosterEditableArea = {
      id,
      type: 'image',
      label: '贴纸',
      x: canvasSize.value.width / 2 - stickerSize / 2,
      y: canvasSize.value.height / 2 - stickerSize / 2,
      width: stickerSize,
      height: stickerSize,
      defaultImage: src,
      borderRadius: 0,
      _x: canvasSize.value.width / 2 - stickerSize / 2,
      _y: canvasSize.value.height / 2 - stickerSize / 2,
      _w: stickerSize,
      _h: stickerSize,
      _src: src,
      _rotate: 0,
      _scale: 1,
    }
    editableAreas.push(newArea)
    selectedAreaId.value = id
    pushHistory()
  }

  async function switchTemplate(id: string) {
    showTemplatePicker.value = false
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
        relatedTemplates.value = data
      }
    } catch (e) {
      console.warn('loadRelatedTemplates failed:', e)
    }
  }

  // ---- layer management ----
  function moveLayer(idx: number, direction: string) {
    if (idx < 0 || idx >= editableAreas.length) return
    let newIdx = idx
    switch (direction) {
      case 'up': newIdx = idx - 1; break
      case 'down': newIdx = idx + 1; break
      case 'top': newIdx = 0; break
      case 'bottom': newIdx = editableAreas.length - 1; break
    }
    if (newIdx === idx || newIdx < 0 || newIdx >= editableAreas.length) return

    const item = editableAreas.splice(idx, 1)[0]
    editableAreas.splice(newIdx, 0, item)
    pushHistory()
  }

  function deleteElement(idx: number) {
    if (idx < 0 || idx >= editableAreas.length) return
    const areaId = editableAreas[idx].id
    editableAreas.splice(idx, 1)
    if (selectedAreaId.value === areaId) {
      selectedAreaId.value = null
    }
    pushHistory()
  }

  /** Set current work ID (for edit existing work) */
  function setWorkId(id: string | null) {
    currentWorkId.value = id
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
    switchTemplate,
    loadRelatedTemplates,
    moveLayer,
    deleteElement,
    setWorkId,
  }
})
