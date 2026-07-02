import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { useTemplateStore } from './template'
import { DEFAULT_ELEMENT_STYLE, getTemplateById, DEFAULT_TEMPLATE_ID } from '@/constants/templates'
import { MATERIAL_LIST } from '@/constants/editor'
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

      if (local) {
        // 模板在本地存在（内置模板），本地数据更完整，优先使用本地
        applyTemplateData(local)
      } else {
        // 仅 API 有的模板（admin 创建），使用 API 数据
        applyTemplateData(data as TemplateItem)
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
    editableElements.splice(0, editableElements.length)
    template.elements.forEach(el => {
      editableElements.push({
        type: el.type,
        text: el.text,
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

    // 同步到 TemplateStore
    const templateStore = useTemplateStore()
    const data: TemplateData = template.data
    Object.keys(data).forEach(key => {
      const k = key as keyof TemplateData
      if (k in templateStore.templateData) {
        templateStore.templateData[k] = data[k]
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
    editableElements, materialList, currentTemplateId, currentWorkId, templateLoading, canvasSize,
    loadTemplateById, openEditor, closeTextEditor, confirmTextEdit,
    closeBasicInfoEditor, openQuickEdit, closeQuickEdit, syncSmartField,
    selectMaterial, applyImageToElement, setCurrentWorkId,
  }
})
