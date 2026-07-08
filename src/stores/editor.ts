import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { useTemplateStore } from './template'
import { DEFAULT_ELEMENT_STYLE, getTemplateById, DEFAULT_TEMPLATE_ID } from '@/constants/templates'
import { MATERIAL_LIST } from '@/constants/editor'
import { API_BASE } from '@/config'

/** 补全 /uploads/ 开头的相对路径为完整 URL */
function resolveImageUrl(url: string): string {
  if (!url) return url
  if (url.startsWith('/uploads/')) return API_BASE + url
  return url
}
import type { EditableElement, ElementStyle, TemplateData, TemplateItem, PageSection } from '@/types'
import { request } from '@/utils/request'

// ============ API 配置 ============
const API_TIMEOUT = 8000

const STORAGE_KEY_STYLES = 'hunbei_editor_styles'
const STORAGE_KEY_TEMPLATE = 'hunbei_current_template'

export const useEditorStore = defineStore('editor', () => {
  const showTextEditor = ref(false)
  const showBasicInfoEditor = ref(false)
  const showQuickEdit = ref(false)
  const activePanelTab = ref('edit')
  const selectedElement = ref<number | null>(null)
  const editingText = ref('')
  const currentTemplateId = ref<string>(DEFAULT_TEMPLATE_ID)
  const currentWorkId = ref<number | null>(null)
  const templateLoading = ref(false)

  const currentFont = ref<string>('思源宋体')
  const currentColor = ref<string>('#666666')
  const currentFontSize = ref<number>(12)
  const currentSpacing = ref<number>(2)
  const currentLineHeight = ref<number>(2)
  const canvasSize = ref<{ width: number; height: number }>({ width: 375, height: 667 })
  const background = ref<{ type: string; color1: string; color2?: string; angle?: number; image?: string }>({ type: 'solid', color1: '#ffffff' })
  const renderedImage = ref<string>('')

  // 模板类型：canvas（画布模式）/ page（页面模式）
  const templateType = ref<'canvas' | 'page'>('canvas')

  // 可编辑元素列表 - canvas 模式
  const editableElements = reactive<EditableElement[]>([])

  // 页面区块列表 - page 模式
  const pageSections = reactive<PageSection[]>([])

  // 当前选中的 section id - page 模式
  const activeSectionId = ref<string | null>(null)

  // 素材库
  const materialList = MATERIAL_LIST

  // 请求计数器，用于忽略过期请求（避免 restoreTemplate 与 onMounted 竞争）
  let _loadReqId = 0

  // ============ 从 API 加载模板 ============
  async function loadTemplateById(templateId: string): Promise<boolean> {
    const reqId = ++_loadReqId
    const local = getTemplateById(templateId)

    templateLoading.value = true
    try {
      const data = await request<TemplateItem>({ url: `/api/templates/${templateId}`, hideLoading: true })
      if (reqId !== _loadReqId) return false // 忽略过期请求

      if (data) {
        // API 数据优先（admin 发布的模板是最新的）
        applyTemplateData(data as TemplateItem)
      } else if (local) {
        // API 无数据则使用本地内置模板
        applyTemplateData(local)
      } else {
        templateLoading.value = false
        return false
      }
      currentTemplateId.value = templateId
      persistTemplate()
      templateLoading.value = false
      return true
    } catch (e) {
      if (reqId !== _loadReqId) return false // 忽略过期请求
      console.warn('API load failed, using local data:', e)
    }

    templateLoading.value = false

    // API 失败则用本地数据回退
    if (local) {
      applyTemplateData(local)
      currentTemplateId.value = templateId
      persistTemplate()
      return true
    }

    return false
  }

  // ============ 应用模板数据到编辑区 ============
  function applyTemplateData(template: TemplateItem) {
    if (!template) return

    // 设置模板类型
    templateType.value = template.templateType || 'canvas'

    // canvas 模式：加载 elements
    editableElements.splice(0, editableElements.length)
    ;(template.elements || []).forEach(el => {
      editableElements.push({
        type: el.type,
        text: el.type === 'image' ? resolveImageUrl(el.text) : el.text,
        dataKey: el.dataKey,
        label: el.label,
        style: el.style ? { ...el.style } : undefined,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        zIndex: el.zIndex,
        rotation: el.rotation,
        opacity: el.opacity,
        editable: el.editable,
      })
    })

    // page 模式：加载 sections
    pageSections.splice(0, pageSections.length)
    ;(template.sections || []).forEach(sec => {
      pageSections.push({
        id: sec.id,
        type: sec.type,
        label: sec.label,
        placeholder: sec.placeholder,
        text: sec.text,
        image: sec.image ? resolveImageUrl(sec.image) : undefined,
        dataKey: sec.dataKey,
        style: sec.style ? { ...sec.style } : undefined,
        editable: sec.editable,
      })
    })

    // 同步画布尺寸，缺失则使用 admin 默认 375x667
    if (template.canvasSize) {
      canvasSize.value = { ...template.canvasSize }
    } else {
      canvasSize.value = { width: 375, height: 667 }
    }

    // 同步背景配置
    if (template.background) {
      const bg = { ...template.background } as any
      // admin 存储 image 字段名是 imageUrl，小程序读 image 字段
      if (bg.imageUrl && !bg.image) {
        bg.image = bg.imageUrl
      }
      // 补全背景图相对路径
      if (bg.image) {
        bg.image = resolveImageUrl(bg.image)
      }
      background.value = bg
    } else {
      background.value = { type: 'solid', color1: '#ffffff' }
    }

    // 同步渲染图
    renderedImage.value = resolveImageUrl(template.renderedImage || '')

    // 同步到 TemplateStore（只覆盖有实际值的字段，保留非空默认值）
    const templateStore = useTemplateStore()
    const data: TemplateData = template.data || {}
    Object.keys(data).forEach(key => {
      const k = key as keyof TemplateData
      if (k in templateStore.templateData) {
        const incoming = data[k]
        const current = templateStore.templateData[k]
        // 仅当 incoming 非空，或 current 为空时覆盖
        if (incoming || !current) {
          // 对图片类型的 data 字段补全相对路径
          const imageKeys = ['coverImage', 'photo1', 'photo2', 'photo3', 'photo4']
          templateStore.templateData[k] = imageKeys.includes(k) ? resolveImageUrl(incoming) : incoming
        }
      }
    })

    // 同步方向信息到 TemplateStore
    if (template.canvasSize) {
      templateStore.setCanvasSize(template.canvasSize)
    }
    if (template.orientation) {
      templateStore.orientation = template.orientation
    }
  }

  function syncCurrentFromElement(idx: number) {
    const el = editableElements[idx]
    if (el?.style) {
      currentFont.value = el.style.font
      currentColor.value = el.style.color
      currentFontSize.value = el.style.fontSize
      currentSpacing.value = el.style.spacing
      currentLineHeight.value = el.style.lineHeight
    } else {
      el.style = { ...DEFAULT_ELEMENT_STYLE }
      currentFont.value = DEFAULT_ELEMENT_STYLE.font
      currentColor.value = DEFAULT_ELEMENT_STYLE.color
      currentFontSize.value = DEFAULT_ELEMENT_STYLE.fontSize
      currentSpacing.value = DEFAULT_ELEMENT_STYLE.spacing
      currentLineHeight.value = DEFAULT_ELEMENT_STYLE.lineHeight
    }
  }

  function persistStyles() {
    try {
      const styles = editableElements.map(e => e.style ? { ...e.style } : null)
      uni.setStorageSync(STORAGE_KEY_STYLES, styles)
    } catch (e) { console.error('persistStyles failed', e) }
  }

  function persistTemplate() {
    try {
      uni.setStorageSync(STORAGE_KEY_TEMPLATE, currentTemplateId.value)
    } catch (e) { console.error('persistTemplate failed', e) }
  }

  function restoreTemplate() {
    try {
      const saved = uni.getStorageSync(STORAGE_KEY_TEMPLATE)
      if (saved && typeof saved === 'string') {
        loadTemplateById(saved)
      } else {
        loadTemplateById(DEFAULT_TEMPLATE_ID)
      }
    } catch (e) {
      console.error('restoreTemplate failed', e)
      loadTemplateById(DEFAULT_TEMPLATE_ID)
    }
  }

  function openEditor(idx: number) {
    const el = editableElements[idx]
    selectedElement.value = idx
    activeSectionId.value = null
    if (el.type === 'image') {
      activePanelTab.value = 'material'
      uni.showToast({ title: '请在素材库中选择替换图片', icon: 'none' })
    } else if (el.type === 'basic') {
      showBasicInfoEditor.value = true
    } else if (el.type === 'text') {
      syncCurrentFromElement(idx)
      editingText.value = el.text
      showTextEditor.value = true
    }
  }

  function openSectionTextEditor(sectionId: string) {
    const sec = pageSections.find(s => s.id === sectionId)
    if (!sec) return
    selectedElement.value = null
    activeSectionId.value = sectionId
    editingText.value = sec.text || ''
    showTextEditor.value = true
  }

  function closeTextEditor() {
    showTextEditor.value = false
  }

  function confirmTextEdit() {
    const templateStore = useTemplateStore()
    // canvas 模式
    if (selectedElement.value !== null) {
      const el = editableElements[selectedElement.value]
      el.text = editingText.value
      if (el.dataKey) {
        templateStore.updateField(el.dataKey, editingText.value)
      }
    }
    // page 模式
    if (activeSectionId.value) {
      const sec = pageSections.find(s => s.id === activeSectionId.value)
      if (sec) {
        sec.text = editingText.value
        if (sec.dataKey) {
          templateStore.updateField(sec.dataKey, editingText.value)
        }
      }
    }
    showTextEditor.value = false
  }

  function closeBasicInfoEditor() {
    showBasicInfoEditor.value = false
  }

  function openQuickEdit() {
    showQuickEdit.value = true
  }

  function closeQuickEdit() {
    showQuickEdit.value = false
  }

  function syncSmartField(key: string, value: string) {
    const templateStore = useTemplateStore()
    templateStore.updateField(key as keyof TemplateData, value)
    // canvas 模式
    editableElements.forEach(el => {
      if (el.dataKey === key) {
        el.text = value
      }
    })
    // page 模式
    pageSections.forEach(sec => {
      if (sec.dataKey === key) {
        sec.text = value
      }
    })
  }

  function syncBasicInfoToElements() {
    const templateStore = useTemplateStore()
    const info = templateStore.basicInfo
    const fieldMap: Record<string, string> = {
      groomName: info.groomName || '',
      brideName: info.brideName || '',
      date: info.weddingDate || '',
      location: info.location || '',
      address: info.detailAddress || '',
    }

    // canvas 模式：同步到 editableElements
    editableElements.forEach(el => {
      if (el.dataKey && fieldMap[el.dataKey] !== undefined) {
        el.text = fieldMap[el.dataKey]
        templateStore.updateField(el.dataKey as keyof TemplateData, fieldMap[el.dataKey])
      }
    })

    // page 模式：同步到 pageSections
    pageSections.forEach(sec => {
      if (sec.dataKey && fieldMap[sec.dataKey] !== undefined) {
        sec.text = fieldMap[sec.dataKey]
        templateStore.updateField(sec.dataKey as keyof TemplateData, fieldMap[sec.dataKey])
      }
    })
  }

  function selectMaterial(material: { url: string; name: string }) {
    if (selectedElement.value === null) return
    const el = editableElements[selectedElement.value]
    if (el.type !== 'image') return
    el.text = material.url
    if (el.dataKey) {
      const templateStore = useTemplateStore()
      templateStore.updateField(el.dataKey, material.url)
    }
    selectedElement.value = null
    activePanelTab.value = 'edit'
    uni.showToast({ title: '图片已替换', icon: 'success' })
  }

  function applyImageToElement(idx: number, url: string) {
    const el = editableElements[idx]
    if (el.type !== 'image') return
    el.text = url
    if (el.dataKey) {
      const templateStore = useTemplateStore()
      templateStore.updateField(el.dataKey, url)
    }
    selectedElement.value = null
    persistStyles()
    uni.showToast({ title: '图片已替换', icon: 'success' })
  }

  function setCurrentWorkId(id: number | null) {
    currentWorkId.value = id
  }

  // 启动时恢复
  restoreTemplate()

  function updatePageSection(id: string, updates: Partial<PageSection>) {
    const sec = pageSections.find(s => s.id === id)
    if (sec) {
      Object.assign(sec, updates)
      if (sec.dataKey) {
        const templateStore = useTemplateStore()
        if (updates.text !== undefined) {
          templateStore.updateField(sec.dataKey, updates.text)
        }
        if (updates.image !== undefined) {
          templateStore.updateField(sec.dataKey, updates.image)
        }
      }
    }
  }

  function updatePageSectionText(id: string, text: string) {
    updatePageSection(id, { text })
  }

  function updatePageSectionImage(id: string, image: string) {
    updatePageSection(id, { image })
  }

  return {
    showTextEditor, showBasicInfoEditor, showQuickEdit, activePanelTab,
    selectedElement, editingText, currentFont, currentColor,
    currentFontSize, currentSpacing, currentLineHeight,
    editableElements, materialList, currentTemplateId, currentWorkId, templateLoading, canvasSize, background, renderedImage,
    templateType, pageSections, activeSectionId,
    loadTemplateById, openEditor, openSectionTextEditor, closeTextEditor, confirmTextEdit,
    closeBasicInfoEditor, openQuickEdit, closeQuickEdit, syncSmartField, syncBasicInfoToElements,
    selectMaterial, applyImageToElement, setCurrentWorkId,
    updatePageSection, updatePageSectionText, updatePageSectionImage,
  }
})

// ============ 字体加载 ============
const SYSTEM_FONTS = ['sans-serif', 'serif', 'monospace', 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', 'Arial', 'Georgia', 'KaiTi', 'KazakhSoftAsilya', 'KazakhSoftAsilyaQaniq']
const loadedFonts = new Set<string>()
let fontMap: Record<string, string> | null = null
let fontMapLoading = false

function fetchFontMap(): Promise<void> {
  return new Promise((resolve) => {
    if (fontMap) { resolve(); return }
    if (fontMapLoading) {
      const check = setInterval(() => {
        if (fontMap !== null) { clearInterval(check); resolve() }
      }, 100)
      return
    }
    fontMapLoading = true
    uni.request({
      url: API_BASE + '/api/fonts',
      method: 'GET',
      timeout: 5000,
      success: (res: any) => {
        const data = res.data
        fontMap = (data?.success && data.data) || {}
        fontMapLoading = false
        resolve()
      },
      fail: () => { fontMap = {}; fontMapLoading = false; resolve() },
    })
  })
}

function loadCustomFont(fontFamily: string) {
  if (!fontFamily || loadedFonts.has(fontFamily)) return
  if (SYSTEM_FONTS.some(f => fontFamily.includes(f))) return
  if (!fontMap) { fetchFontMap().then(() => loadCustomFont(fontFamily)); return }
  const fontUrl = fontMap[fontFamily]
  if (!fontUrl) return
  const fullUrl = fontUrl.startsWith('http') ? fontUrl : API_BASE + fontUrl

  // #ifdef MP-WEIXIN
  // 微信小程序需要先下载字体文件再加载
  const downloadTask = (wx as any).downloadFile({
    url: fullUrl,
    success: (res: any) => {
      if (res.statusCode === 200) {
        ;(wx as any).loadFontFace({
          family: fontFamily,
          source: `url("${res.tempFilePath}")`,
          success: () => { loadedFonts.add(fontFamily); console.log(`[FontLoader] Loaded: ${fontFamily}`) },
          fail: (err: any) => { console.warn(`[FontLoader] Failed: ${fontFamily}`, err) },
        })
      } else {
        console.warn(`[FontLoader] Download failed: ${fontFamily}, status: ${res.statusCode}`)
      }
    },
    fail: (err: any) => { console.warn(`[FontLoader] Download error: ${fontFamily}`, err) },
  })
  // #endif

  // #ifndef MP-WEIXIN
  try {
    ;(wx as any).loadFontFace({
      family: fontFamily,
      source: `url("${fullUrl}")`,
      success: () => { loadedFonts.add(fontFamily); console.log(`[FontLoader] Loaded: ${fontFamily}`) },
      fail: (err: any) => { console.warn(`[FontLoader] Failed: ${fontFamily}`, err) },
    })
  } catch (e) { console.warn(`[FontLoader] Error: ${fontFamily}`, e) }
  // #endif
}

export function loadFontsForElements(elements: Array<{ type: string; style?: { font?: string } }>) {
  const fontSet = new Set<string>()
  const rtlChars = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

  elements.forEach(el => {
    if (el.type === 'text') {
      if (el.style?.font) {
        const primary = el.style.font.split(',')[0].trim().replace(/['"]/g, '')
        if (primary) fontSet.add(primary)
      }
      if (el.text && rtlChars.test(el.text)) {
        fontSet.add('KazakhSoftAsilya')
        fontSet.add('KazakhSoftAsilyaQaniq')
      }
    }
  })

  fetchFontMap().then(() => {
    fontSet.forEach(f => loadCustomFont(f))
  })
}
