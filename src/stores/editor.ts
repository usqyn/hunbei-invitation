import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { useTemplateStore } from './template'
import { DEFAULT_ELEMENT_STYLE, MATERIAL_LIST } from '@/constants/editor'
import { getTemplateById, DEFAULT_TEMPLATE_ID } from '@/constants/templates'
import { resolveUrl } from '@/utils/url'
import type { EditableElement, TemplateData, TemplateItem, PageSection, FlipPage } from '@/types'
import { request } from '@/utils/request'
import { getStorage, setStorage } from '@/utils/storage'

const STORAGE_KEY_TEMPLATE = 'hunbei_current_template'

export const useEditorStore = defineStore('editor', () => {
  const showTextEditor = ref(false)
  const showBasicInfoEditor = ref(false)
  const showQuickEdit = ref(false)
  const activePanelTab = ref('edit')
  const selectedElement = ref<number | null>(null)
  const editingText = ref('')
  const currentTemplateId = ref<string>(DEFAULT_TEMPLATE_ID)
  const currentWorkId = ref<string | null>(null)
  const templateLoading = ref(false)

  const currentFont = ref<string>('思源宋体')
  const currentColor = ref<string>('#666666')
  const currentFontSize = ref<number>(12)
  const currentSpacing = ref<number>(2)
  const currentLineHeight = ref<number>(2)
  const canvasSize = ref<{ width: number; height: number }>({ width: 375, height: 667 })
  const background = ref<{ type: string; color1: string; color2?: string; angle?: number; image?: string }>({ type: 'solid', color1: '#ffffff' })
  const renderedImage = ref<string>('')

  // 模板类型：canvas（画布模式）/ page（页面模式）/ flip（翻页模式）
  const templateType = ref<'canvas' | 'page' | 'flip'>('canvas')

  // 可编辑元素列表 - canvas 模式
  const editableElements = reactive<EditableElement[]>([])

  // 页面区块列表 - page 模式
  const pageSections = reactive<PageSection[]>([])

  // 当前选中的 section id - page 模式
  const activeSectionId = ref<string | null>(null)

  // 翻页模式 - 页面列表
  const flipPages = reactive<FlipPage[]>([])
  const currentFlipPageIndex = ref(0)

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

  /** 将模板元素映射为可编辑元素（canvas / flip 模式共用） */
  function mapTemplateElement(el: any): EditableElement {
    return {
      type: el.type,
      text: el.type === 'image' ? resolveUrl(el.text) : el.text,
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
    }
  }

  function applyTemplateData(template: TemplateItem) {
    if (!template) return

    // 设置模板类型
    templateType.value = template.templateType || 'canvas'

    // canvas 模式：加载 elements
    editableElements.splice(0, editableElements.length)
    ;(template.elements || []).forEach(el => {
      editableElements.push(mapTemplateElement(el))
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
        image: sec.image ? resolveUrl(sec.image) : undefined,
        dataKey: sec.dataKey,
        style: sec.style ? { ...sec.style } : undefined,
        editable: sec.editable,
      })
    })

    // flip 模式：加载 pages
    flipPages.splice(0, flipPages.length)
    ;(template.pages || []).forEach(page => {
      const elements = (page.elements || []).map(el => mapTemplateElement(el))
      flipPages.push({
        id: page.id,
        name: page.name,
        pageType: page.pageType,
        background: {
          type: page.background?.type || 'solid',
          color1: page.background?.color1 || '#ffffff',
          color2: page.background?.color2,
          angle: page.background?.angle,
          imageUrl: page.background?.imageUrl ? resolveUrl(page.background.imageUrl) : undefined,
          imageScale: page.background?.imageScale,
          imageOpacity: page.background?.imageOpacity,
        },
        elements,
      })
    })
    currentFlipPageIndex.value = 0

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
        bg.image = resolveUrl(bg.image)
      }
      background.value = bg
    } else {
      background.value = { type: 'solid', color1: '#ffffff' }
    }

    // 同步渲染图
    renderedImage.value = resolveUrl(template.renderedImage || '')

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
          templateStore.templateData[k] = imageKeys.includes(k) ? resolveUrl(incoming) : incoming
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

  function persistTemplate() {
    setStorage(STORAGE_KEY_TEMPLATE, currentTemplateId.value)
  }

  function restoreTemplate() {
    const saved = getStorage<string>(STORAGE_KEY_TEMPLATE, '')
    if (saved && typeof saved === 'string') {
      loadTemplateById(saved)
    } else {
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

  /** 将字段值同步到所有模式（canvas / page / flip）的对应元素中 */
  function syncFieldToAllModes(key: string, value: string) {
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
    // flip 模式：遍历所有页面的元素
    flipPages.forEach(page => {
      page.elements.forEach(el => {
        if (el.dataKey === key) {
          el.text = value
        }
      })
    })
  }

  function syncSmartField(key: string, value: string) {
    syncFieldToAllModes(key, value)
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

    Object.entries(fieldMap).forEach(([key, value]) => {
      syncFieldToAllModes(key, value)
    })
  }

  /** 选择素材并应用到选中的图片元素（合并原 selectMaterial + applyImageToElement）
   *  支持两种调用方式：
   *  1. selectMaterial({ url, name }) -- 原素材库调用
   *  2. selectMaterial(idx, url)       -- 原本地图/预览页调用（作为 applyImageToElement 别名）
   */
  function selectMaterial(materialOrIdx: { url: string; name: string } | number, url?: string) {
    let idx: number
    let imageUrl: string

    if (typeof materialOrIdx === 'number') {
      idx = materialOrIdx
      imageUrl = url!
    } else {
      idx = selectedElement.value!
      imageUrl = materialOrIdx.url
      if (idx === null) return
    }

    if (idx === null || idx < 0) return
    const el = editableElements[idx]
    if (el.type !== 'image') return
    el.text = imageUrl
    if (el.dataKey) {
      const templateStore = useTemplateStore()
      templateStore.updateField(el.dataKey, imageUrl)
    }
    selectedElement.value = null
    activePanelTab.value = 'edit'
    uni.showToast({ title: '图片已替换', icon: 'success' })
  }

  function setCurrentWorkId(id: string | null) {
    currentWorkId.value = id
  }

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
    flipPages, currentFlipPageIndex,
    loadTemplateById, restoreTemplate, openEditor, openSectionTextEditor, closeTextEditor, confirmTextEdit,
    closeBasicInfoEditor, openQuickEdit, closeQuickEdit, syncSmartField, syncBasicInfoToElements,
    selectMaterial, applyImageToElement: selectMaterial, setCurrentWorkId,
    updatePageSection, updatePageSectionText, updatePageSectionImage,
  }
})
