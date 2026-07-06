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
import type { EditableElement, ElementStyle, TemplateData, TemplateItem } from '@/types'
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

  // 可编辑元素列表 - 根据模板动态生成
  const editableElements = reactive<EditableElement[]>([])

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

  function restoreStyles() {
    try {
      const saved = uni.getStorageSync(STORAGE_KEY_STYLES)
      if (saved && Array.isArray(saved)) {
        saved.forEach((style: ElementStyle | null, idx: number) => {
          if (style && editableElements[idx]) {
            editableElements[idx].style = { ...style }
          }
        })
      }
    } catch (e) { console.error('restoreStyles failed', e) }
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

  function closeTextEditor() {
    showTextEditor.value = false
  }

  function confirmTextEdit() {
    if (selectedElement.value !== null) {
      const el = editableElements[selectedElement.value]
      el.text = editingText.value
      if (el.dataKey) {
        const templateStore = useTemplateStore()
        templateStore.updateField(el.dataKey, editingText.value)
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
    editableElements.forEach(el => {
      if (el.dataKey === key) {
        el.text = value
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

  return {
    showTextEditor, showBasicInfoEditor, showQuickEdit, activePanelTab,
    selectedElement, editingText, currentFont, currentColor,
    currentFontSize, currentSpacing, currentLineHeight,
    editableElements, materialList, currentTemplateId, currentWorkId, templateLoading, canvasSize, background, renderedImage,
    loadTemplateById, openEditor, closeTextEditor, confirmTextEdit,
    closeBasicInfoEditor, openQuickEdit, closeQuickEdit, syncSmartField,
    selectMaterial, applyImageToElement, setCurrentWorkId,
  }
})

// ============ 字体加载 ============
const SYSTEM_FONTS = ['sans-serif', 'serif', 'monospace', 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', 'Arial', 'Georgia', 'KaiTi']
const loadedFonts = new Set<string>()
let fontMap: Record<string, string> | null = null
let fontMapLoading = false

function fetchFontMap() {
  if (fontMap || fontMapLoading) return
  fontMapLoading = true
  uni.request({
    url: API_BASE + '/api/fonts',
    method: 'GET',
    timeout: 5000,
    success: (res: any) => {
      const data = res.data
      fontMap = (data?.success && data.data) || {}
      fontMapLoading = false
    },
    fail: () => { fontMap = {}; fontMapLoading = false },
  })
}

function loadCustomFont(fontFamily: string) {
  if (!fontFamily || loadedFonts.has(fontFamily)) return
  if (SYSTEM_FONTS.some(f => fontFamily.includes(f))) return
  if (!fontMap) { fetchFontMap(); return }
  const fontUrl = fontMap[fontFamily]
  if (!fontUrl) return
  const fullUrl = fontUrl.startsWith('http') ? fontUrl : API_BASE + fontUrl
  try {
    ;(wx as any).loadFontFace({
      family: fontFamily,
      source: `url("${fullUrl}")`,
      success: () => { loadedFonts.add(fontFamily); console.log(`[FontLoader] Loaded: ${fontFamily}`) },
      fail: (err: any) => { console.warn(`[FontLoader] Failed: ${fontFamily}`, err) },
    })
  } catch (e) { console.warn(`[FontLoader] Error: ${fontFamily}`, e) }
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

  if (!fontMap) {
    fetchFontMap()
    setTimeout(() => fontSet.forEach(f => loadCustomFont(f)), 600)
  } else {
    fontSet.forEach(f => loadCustomFont(f))
  }
}
