import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { useTemplateStore } from './template'
import { getTemplateById, DEFAULT_TEMPLATE_ID } from '@/constants/templates'
import { resolveUrl } from '@/utils/url'
import type { EditableElement, TemplateData, TemplateItem, PageSection, FlipPage, WorkEditorData } from '@/types'
import { request } from '@/utils/request'
import { getStorage, setStorage } from '@/utils/storage'

const STORAGE_KEY_TEMPLATE = 'hunbei_current_template'
const STORAGE_KEY_TEMPLATE_DATA = 'hunbei_current_template_data'

export const useEditorStore = defineStore('editor', () => {
  const showTextEditor = ref(false)
  const showBasicInfoEditor = ref(false)
  const selectedElement = ref<number | null>(null)
  const editingText = ref('')
  const currentTemplateId = ref<string>(DEFAULT_TEMPLATE_ID)
  const currentWorkId = ref<string | null>(null)
  const templateLoading = ref(false)

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

  // ============ 撤销/重做 ============
  // 基于快照的索引式历史：每次 pushHistory 记录变更后的状态
  const history = ref<any[]>([])
  const historyIndex = ref(-1)
  const MAX_HISTORY = 30

  function snapshotCurrent(): any {
    return {
      elements: JSON.parse(JSON.stringify(editableElements)),
      pageSections: JSON.parse(JSON.stringify(pageSections)),
      flipPages: JSON.parse(JSON.stringify(flipPages)),
      background: JSON.parse(JSON.stringify(background.value)),
      canvasSize: JSON.parse(JSON.stringify(canvasSize.value)),
    }
  }

  function pushHistory() {
    // 截断 redo 分支
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }
    history.value.push(snapshotCurrent())
    historyIndex.value = history.value.length - 1
    if (history.value.length > MAX_HISTORY) {
      history.value.shift()
      historyIndex.value = history.value.length - 1
    }
  }

  function resetHistory() {
    history.value = []
    historyIndex.value = -1
  }

  function restoreSnapshot(snap: any) {
    if (snap && Array.isArray(snap.elements)) {
      editableElements.splice(0, editableElements.length, ...snap.elements)
    }
    if (snap && Array.isArray(snap.pageSections)) {
      pageSections.splice(0, pageSections.length, ...snap.pageSections)
    }
    if (snap && Array.isArray(snap.flipPages)) {
      flipPages.splice(0, flipPages.length, ...snap.flipPages)
    }
    if (snap && snap.background) {
      background.value = JSON.parse(JSON.stringify(snap.background))
    }
    if (snap && snap.canvasSize) {
      canvasSize.value = JSON.parse(JSON.stringify(snap.canvasSize))
    }
    selectedElement.value = null
    activeSectionId.value = null
  }

  function undo() {
    if (historyIndex.value <= 0) return
    historyIndex.value--
    restoreSnapshot(history.value[historyIndex.value])
  }

  function redo() {
    if (historyIndex.value >= history.value.length - 1) return
    historyIndex.value++
    restoreSnapshot(history.value[historyIndex.value])
  }

  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)

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

    // 重置选中的音乐
    templateStore.setSelectedMusic(null)

    // 重置撤销/重做历史，记录模板初始状态作为基线
    resetHistory()
    pushHistory()
  }

  function persistTemplate() {
    setStorage(STORAGE_KEY_TEMPLATE, currentTemplateId.value)
    try {
      const templateStore = useTemplateStore()
      const data = {
        templateType: templateType.value,
        elements: JSON.parse(JSON.stringify(editableElements)),
        pageSections: JSON.parse(JSON.stringify(pageSections)),
        flipPages: JSON.parse(JSON.stringify(flipPages)),
        canvasSize: JSON.parse(JSON.stringify(canvasSize.value)),
        background: JSON.parse(JSON.stringify(background.value)),
        templateData: JSON.parse(JSON.stringify(templateStore.templateData)),
        basicInfo: JSON.parse(JSON.stringify(templateStore.basicInfo)),
        settings: JSON.parse(JSON.stringify(templateStore.settings)),
        selectedMusicId: templateStore.selectedMusicId,
      }
      setStorage(STORAGE_KEY_TEMPLATE_DATA, data)
    } catch (e) {
      console.warn('persistTemplate data failed:', e)
    }
  }

  function restoreTemplate() {
    const savedId = getStorage<string>(STORAGE_KEY_TEMPLATE, '')
    const templateId = savedId || DEFAULT_TEMPLATE_ID
    try {
      const savedData = getStorage<any>(STORAGE_KEY_TEMPLATE_DATA, null)
      if (savedData && typeof savedData === 'object') {
        const templateStore = useTemplateStore()
        templateType.value = savedData.templateType || 'canvas'
        if (savedData.elements && Array.isArray(savedData.elements)) {
          editableElements.splice(0, editableElements.length, ...savedData.elements)
        }
        if (savedData.pageSections && Array.isArray(savedData.pageSections)) {
          pageSections.splice(0, pageSections.length, ...savedData.pageSections)
        }
        if (savedData.flipPages && Array.isArray(savedData.flipPages)) {
          flipPages.splice(0, flipPages.length, ...savedData.flipPages)
        }
        if (savedData.canvasSize) {
          canvasSize.value = { ...savedData.canvasSize }
        }
        if (savedData.background) {
          background.value = { ...savedData.background }
        }
        if (savedData.templateData) {
          Object.assign(templateStore.templateData, savedData.templateData)
        }
        if (savedData.basicInfo) {
          Object.assign(templateStore.basicInfo, savedData.basicInfo)
        }
        if (savedData.settings) {
          Object.assign(templateStore.settings, savedData.settings)
        }
        if (savedData.selectedMusicId !== undefined) {
          templateStore.selectedMusicId = savedData.selectedMusicId
        }
        currentTemplateId.value = templateId
        // 重置历史，以恢复的状态为基线
        resetHistory()
        pushHistory()
        return true
      }
    } catch (e) {
      console.warn('restoreTemplate data failed, falling back to loadTemplateById:', e)
    }
    loadTemplateById(templateId)
  }

  /** 从已保存的作品数据恢复编辑状态（编辑已有作品时调用） */
  function restoreFromWorkData(data: WorkEditorData, musicId?: string) {
    if (!data) return
    if (data.templateType) templateType.value = data.templateType
    if (data.elements && Array.isArray(data.elements)) {
      editableElements.splice(0, editableElements.length, ...JSON.parse(JSON.stringify(data.elements)))
    }
    if (data.pageSections && Array.isArray(data.pageSections)) {
      pageSections.splice(0, pageSections.length, ...JSON.parse(JSON.stringify(data.pageSections)))
    }
    if (data.flipPages && Array.isArray(data.flipPages)) {
      flipPages.splice(0, flipPages.length, ...JSON.parse(JSON.stringify(data.flipPages)))
    }
    if (data.canvasSize) canvasSize.value = { ...data.canvasSize }
    if (data.background) background.value = { ...data.background }
    const templateStore = useTemplateStore()
    if (data.templateData) Object.assign(templateStore.templateData, data.templateData)
    if (data.basicInfo) Object.assign(templateStore.basicInfo, data.basicInfo)
    if (data.settings) Object.assign(templateStore.settings, data.settings)
    // 恢复音乐选择
    if (musicId) {
      templateStore.selectedMusicId = musicId
    }
    // 作品编辑后渲染图需重新生成
    renderedImage.value = ''
    selectedElement.value = null
    activeSectionId.value = null
    // 重置历史，以当前作品状态为基线
    resetHistory()
    pushHistory()
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
    pushHistory()
  }

  function closeBasicInfoEditor() {
    showBasicInfoEditor.value = false
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
    // page 模式：图片类型更新 image 字段，文本类型更新 text 字段
    pageSections.forEach(sec => {
      if (sec.dataKey === key) {
        if (sec.type === 'image') sec.image = value
        else sec.text = value
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
    syncFieldToBasicInfo(key, value)
  }

  function syncFieldToBasicInfo(key: string, value: string) {
    const templateStore = useTemplateStore()
    const basicInfoFieldMap: Record<string, keyof typeof templateStore.basicInfo> = {
      groomName: 'groomName',
      brideName: 'brideName',
      date: 'weddingDate',
      location: 'location',
      address: 'detailAddress',
    }
    const field = basicInfoFieldMap[key]
    if (field) {
      ;(templateStore.basicInfo as any)[field] = value
    }
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
    pushHistory()
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
    // 同步到所有模式（canvas/page/flip），而非仅更新 templateData
    if (el.dataKey) {
      syncFieldToAllModes(el.dataKey, imageUrl)
    }
    pushHistory()
    selectedElement.value = null
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
    showTextEditor, showBasicInfoEditor,
    selectedElement, editingText,
    editableElements, currentTemplateId, currentWorkId, templateLoading, canvasSize, background, renderedImage,
    templateType, pageSections, activeSectionId,
    flipPages, currentFlipPageIndex,
    history, historyIndex, canUndo, canRedo,
    loadTemplateById, restoreTemplate, restoreFromWorkData, openSectionTextEditor, closeTextEditor, confirmTextEdit,
    closeBasicInfoEditor, syncSmartField, syncBasicInfoToElements,
    selectMaterial, applyImageToElement: selectMaterial, setCurrentWorkId,
    updatePageSection, updatePageSectionText, updatePageSectionImage,
    pushHistory, undo, redo,
  }
})
