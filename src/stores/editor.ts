import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { useTemplateStore } from './template'
import { getTemplateById, DEFAULT_TEMPLATE_ID } from '@/constants/templates'
import { resolveUrl } from '@/utils/url'
import { RTL_CHAR_REGEX } from '@/constants/editor'
import type { EditableElement, TemplateData, TemplateItem, PageSection, FlipPage, WorkEditorData } from '@/types'
import { request } from '@/utils/request'
import { getStorage, setStorage } from '@/utils/storage'
import { loadFontsForElements } from '@/utils/font-loader'

const STORAGE_KEY_TEMPLATE = 'TOYtamaxia_current_template'
const STORAGE_KEY_TEMPLATE_DATA = 'TOYtamaxia_current_template_data'

export const useEditorStore = defineStore('editor', () => {
  const showTextEditor = ref(false)
  const showSectionTextEditor = ref(false)
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

  // 初始模板快照：loadTemplateById / restoreFromWorkData 完成后保存，resetToInitial 使用
  // 使用 ref 保证 canReset computed 能正确响应
  const _initialSnapshot = ref<any>(null)

  function snapshotCurrent(): any {
    return {
      elements: JSON.parse(JSON.stringify(editableElements)),
      pageSections: JSON.parse(JSON.stringify(pageSections)),
      flipPages: JSON.parse(JSON.stringify(flipPages)),
      background: JSON.parse(JSON.stringify(background.value)),
      canvasSize: JSON.parse(JSON.stringify(canvasSize.value)),
      templateType: templateType.value,
      renderedImage: renderedImage.value,
      currentFlipPageIndex: currentFlipPageIndex.value,
    }
  }

  // 防抖持久化：避免每次编辑都做深拷贝 + 同步 IO，合并 1 秒内的多次写入
  let _persistTimer: ReturnType<typeof setTimeout> | null = null
  function debouncedPersist() {
    if (_persistTimer) clearTimeout(_persistTimer)
    _persistTimer = setTimeout(() => {
      persistTemplate()
      _persistTimer = null
    }, 1000)
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
    // 每次编辑操作后持久化模板数据，确保编辑内容不丢失
    // 通过防抖合并频繁的同步 IO 写入，降低主线程开销
    debouncedPersist()
  }

  function resetHistory() {
    history.value = []
    historyIndex.value = -1
  }

  function restoreSnapshot(snap: any) {
    if (snap && Array.isArray(snap.elements)) {
      // 深拷贝避免还原后编辑操作污染原始快照
      editableElements.splice(0, editableElements.length, ...JSON.parse(JSON.stringify(snap.elements)))
    }
    if (snap && Array.isArray(snap.pageSections)) {
      pageSections.splice(0, pageSections.length, ...JSON.parse(JSON.stringify(snap.pageSections)))
    }
    if (snap && Array.isArray(snap.flipPages)) {
      flipPages.splice(0, flipPages.length, ...JSON.parse(JSON.stringify(snap.flipPages)))
    }
    if (snap && snap.background) {
      background.value = JSON.parse(JSON.stringify(snap.background))
    }
    if (snap && snap.canvasSize) {
      canvasSize.value = JSON.parse(JSON.stringify(snap.canvasSize))
    }
    if (snap && snap.templateType) {
      templateType.value = snap.templateType
    }
    if (snap && typeof snap.renderedImage !== 'undefined') {
      renderedImage.value = snap.renderedImage
    }
    if (snap && typeof snap.currentFlipPageIndex !== 'undefined') {
      currentFlipPageIndex.value = snap.currentFlipPageIndex
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

  /** 保存初始模板快照（模板加载/作品恢复完成后调用） */
  function saveInitialSnapshot() {
    _initialSnapshot.value = snapshotCurrent()
  }

  /** 重置到初始模板状态 */
  function resetToInitial() {
    if (!_initialSnapshot.value) return false
    // 深拷贝初始快照，避免还原后编辑操作污染 _initialSnapshot
    const snapCopy = JSON.parse(JSON.stringify(_initialSnapshot.value))
    restoreSnapshot(snapCopy)
    // 重置后清空历史，以初始状态为起点（用副本，不共享引用）
    history.value = [snapCopy]
    historyIndex.value = 0
    debouncedPersist()
    return true
  }

  const canReset = computed(() => _initialSnapshot.value !== null)

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
  function mapTemplateElement(el: EditableElement): EditableElement {
    // 对必填字段加 fallback 默认值，防御 API 数据缺失
    const type = el.type || 'text'
    const text = el.text ?? ''
    const isImage = type === 'image'
    // 修复阿拉伯文显示混乱：检测 RTL 字符时强制使用哈萨克字体
    // 避免因 style.font 默认继承思源宋体导致字符不连写
    let style = el.style ? { ...el.style } : undefined
    if (!isImage && text && RTL_CHAR_REGEX.test(text)) {
      const currentFont = style?.font || ''
      // 若当前字体不含 KazakhSoftAsilya，则替换为哈萨克字体优先栈
      if (!currentFont.includes('KazakhSoftAsilya')) {
        style = style ? { ...style } : {}
        style.font = 'KazakhSoftAsilya'
        // 方向兜底：若未显式设置 direction 或为 auto，则设为 rtl
        if (!style.direction || style.direction === 'auto') {
          style.direction = 'rtl'
        }
        // 对齐兜底：若未显式设置 textAlign，则设为 right
        if (!style.textAlign) {
          style.textAlign = 'right'
        }
      }
    }
    return {
      type,
      text: isImage ? resolveUrl(text) : text,
      dataKey: el.dataKey,
      label: el.label,
      style,
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      zIndex: el.zIndex,
      rotation: el.rotation,
      opacity: el.opacity,
      editable: el.editable,
      isPremium: el.isPremium,
    }
  }

  function applyTemplateData(template: TemplateItem) {
    if (!template) return

    // 加载新模板时重置选中状态，避免选中失效的元素索引
    selectedElement.value = null
    activeSectionId.value = null

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
          image: page.background?.image ? resolveUrl(page.background.image) : undefined,
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
    // 保存初始快照用于「重置」功能
    saveInitialSnapshot()
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
        renderedImage: renderedImage.value,
        templateData: JSON.parse(JSON.stringify(templateStore.templateData)),
        basicInfo: JSON.parse(JSON.stringify(templateStore.basicInfo)),
        settings: JSON.parse(JSON.stringify(templateStore.settings)),
        selectedMusicId: templateStore.selectedMusicId,
        currentFlipPageIndex: currentFlipPageIndex.value,
      }
      setStorage(STORAGE_KEY_TEMPLATE_DATA, data)
    } catch (e) {
      console.warn('persistTemplate data failed:', e)
    }
  }

  async function restoreTemplate() {
    const savedId = getStorage<string>(STORAGE_KEY_TEMPLATE, '')
    const templateId = savedId || DEFAULT_TEMPLATE_ID
    try {
      const savedData = getStorage<any>(STORAGE_KEY_TEMPLATE_DATA, null)
      if (savedData && typeof savedData === 'object') {
        const templateStore = useTemplateStore()
        templateType.value = savedData.templateType || 'canvas'
        if (savedData.elements && Array.isArray(savedData.elements)) {
          // 对缓存中的图片元素做 URL 归一化
          savedData.elements.forEach((el: any) => {
            if (el.type === 'image' && el.text) {
              el.text = resolveUrl(el.text)
            }
          })
          editableElements.splice(0, editableElements.length, ...savedData.elements)
        }
        if (savedData.pageSections && Array.isArray(savedData.pageSections)) {
          savedData.pageSections.forEach((sec: any) => {
            if (sec.type === 'image' && sec.image) {
              sec.image = resolveUrl(sec.image)
            }
          })
          pageSections.splice(0, pageSections.length, ...savedData.pageSections)
        }
        if (savedData.flipPages && Array.isArray(savedData.flipPages)) {
          savedData.flipPages.forEach((page: any) => {
            if (page.background?.image) {
              page.background.image = resolveUrl(page.background.image)
            }
            if (page.background?.imageUrl) {
              page.background.imageUrl = resolveUrl(page.background.imageUrl)
            }
            (page.elements || []).forEach((el: any) => {
              if (el.type === 'image' && el.text) {
                el.text = resolveUrl(el.text)
              }
            })
          })
          flipPages.splice(0, flipPages.length, ...savedData.flipPages)
        }
        if (savedData.background) {
          const bg = { ...savedData.background }
          if (bg.image) bg.image = resolveUrl(bg.image)
          if (bg.imageUrl) bg.imageUrl = resolveUrl(bg.imageUrl)
          background.value = bg
        }
        if (savedData.canvasSize) {
          canvasSize.value = { ...savedData.canvasSize }
        }
        if (savedData.renderedImage) {
          renderedImage.value = resolveUrl(savedData.renderedImage)
        }
        if (savedData.templateData) {
          const td = JSON.parse(JSON.stringify(savedData.templateData))
          if (td.coverImage) td.coverImage = resolveUrl(td.coverImage)
          if (td.photo1) td.photo1 = resolveUrl(td.photo1)
          if (td.photo2) td.photo2 = resolveUrl(td.photo2)
          if (td.photo3) td.photo3 = resolveUrl(td.photo3)
          if (td.photo4) td.photo4 = resolveUrl(td.photo4)
          Object.assign(templateStore.templateData, td)
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
        saveInitialSnapshot()
        return true
      }
    } catch (e) {
      console.warn('restoreTemplate data failed, falling back to loadTemplateById:', e)
    }
    return await loadTemplateById(templateId)
  }

  /** 从已保存的作品数据恢复编辑状态（编辑已有作品时调用） */
  function restoreFromWorkData(data: WorkEditorData, musicId?: string) {
    if (!data) return
    if (data.templateType) templateType.value = data.templateType
    if (data.elements && Array.isArray(data.elements)) {
      const elements = JSON.parse(JSON.stringify(data.elements))
      elements.forEach((el: any) => {
        if (el.type === 'image' && el.text) {
          el.text = resolveUrl(el.text)
        }
      })
      editableElements.splice(0, editableElements.length, ...elements)
    }
    if (data.pageSections && Array.isArray(data.pageSections)) {
      const sections = JSON.parse(JSON.stringify(data.pageSections))
      // 对 pageSections 做图片 URL 归一化（与 restoreTemplate 保持一致）
      sections.forEach((sec: any) => {
        if (sec.type === 'image' && sec.image) {
          sec.image = resolveUrl(sec.image)
        }
      })
      pageSections.splice(0, pageSections.length, ...sections)
    }
    if (data.flipPages && Array.isArray(data.flipPages)) {
      const pages = JSON.parse(JSON.stringify(data.flipPages))
      pages.forEach((page: any) => {
        if (page.background?.image) page.background.image = resolveUrl(page.background.image)
        if (page.background?.imageUrl) page.background.imageUrl = resolveUrl(page.background.imageUrl)
        if (page.elements && Array.isArray(page.elements)) {
          page.elements.forEach((el: any) => {
            if (el.type === 'image' && el.text) el.text = resolveUrl(el.text)
          })
        }
      })
      flipPages.splice(0, flipPages.length, ...pages)
    }
    if (data.canvasSize) canvasSize.value = { ...data.canvasSize }
    // 恢复 orientation（横屏/竖屏）
    const templateStore = useTemplateStore()
    if (data.canvasSize && data.canvasSize.width > data.canvasSize.height) {
      templateStore.orientation = 'landscape'
    } else if (data.canvasSize && data.canvasSize.width < data.canvasSize.height) {
      templateStore.orientation = 'portrait'
    }
    if (data.background) {
      const bg = { ...data.background }
      if (bg.imageUrl && !bg.image) bg.image = bg.imageUrl
      if (bg.image) bg.image = resolveUrl(bg.image)
      if (bg.imageUrl) bg.imageUrl = resolveUrl(bg.imageUrl)
      background.value = bg
    }
    if (data.templateData) {
      const td = JSON.parse(JSON.stringify(data.templateData))
      // 对 templateData 中的图片字段做 URL 归一化
      if (td.coverImage) td.coverImage = resolveUrl(td.coverImage)
      if (td.photo1) td.photo1 = resolveUrl(td.photo1)
      if (td.photo2) td.photo2 = resolveUrl(td.photo2)
      if (td.photo3) td.photo3 = resolveUrl(td.photo3)
      if (td.photo4) td.photo4 = resolveUrl(td.photo4)
      Object.assign(templateStore.templateData, td)
    }
    if (data.basicInfo) Object.assign(templateStore.basicInfo, data.basicInfo)
    if (data.settings) Object.assign(templateStore.settings, data.settings)
    // 恢复音乐选择（使用 !== undefined 确保正确处理 null/0）
    if (musicId !== undefined && musicId !== null) {
      templateStore.selectedMusicId = musicId
    } else {
      templateStore.setSelectedMusic(null)
    }
    // 恢复翻页模式当前页码
    if (data.currentFlipPageIndex != null && data.currentFlipPageIndex < flipPages.length) {
      currentFlipPageIndex.value = data.currentFlipPageIndex
    }
    // 恢复渲染图（补全相对路径）；无渲染图时清空以触发重新生成
    if (data.renderedImage) {
      renderedImage.value = resolveUrl(data.renderedImage)
    } else {
      renderedImage.value = ''
    }
    selectedElement.value = null
    activeSectionId.value = null
    // 重置历史，以当前作品状态为基线
    resetHistory()
    pushHistory()
    // 保存初始快照用于「重置」功能
    saveInitialSnapshot()

    // 恢复后重新加载字体（解决重新编辑时字体不正确的问题）
    reloadFontsAfterRestore()
  }

  /** 根据当前模板类型重新加载所有相关字体 */
  function reloadFontsAfterRestore() {
    const allElements: any[] = [...editableElements]
    // page 模式下 pageSections 的文字也需要加载字体
    if (templateType.value === 'page') {
      pageSections.forEach((sec: any) => {
        if (sec.text || sec.style?.font) {
          allElements.push(sec)
        }
      })
    }
    // flip 模式下所有页面的元素也需要加载字体
    if (templateType.value === 'flip') {
      flipPages.forEach((page: any) => {
        if (page.elements && Array.isArray(page.elements)) {
          allElements.push(...page.elements)
        }
      })
    }
    loadFontsForElements(allElements)
  }

  function openSectionTextEditor(sectionId: string) {
    const sec = pageSections.find(s => s.id === sectionId)
    if (!sec) return
    selectedElement.value = null
    activeSectionId.value = sectionId
    editingText.value = sec.text || ''
    showSectionTextEditor.value = true
  }

  function closeTextEditor() {
    showTextEditor.value = false
  }

  function closeSectionTextEditor() {
    showSectionTextEditor.value = false
    activeSectionId.value = null
  }

  function confirmTextEdit() {
    const templateStore = useTemplateStore()
    // canvas 模式
    if (selectedElement.value !== null && selectedElement.value < editableElements.length) {
      const el = editableElements[selectedElement.value]
      if (el) {
        el.text = editingText.value
        applyRtlStyleIfNeeded(el, editingText.value)
        if (el.dataKey) {
          templateStore.updateField(el.dataKey, editingText.value)
        }
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
    showSectionTextEditor.value = false
    activeSectionId.value = null
    // 文字变更后触发字体加载（阿拉伯文可能需要加载哈萨克字体）
    reloadFontsAfterRestore()
    pushHistory()
  }

  function closeBasicInfoEditor() {
    showBasicInfoEditor.value = false
  }

  /** 当文字变为阿拉伯/哈萨克文时，自动切换字体和 RTL 方向；恢复中文时还原 */
  function applyRtlStyleIfNeeded(el: EditableElement, newText: string) {
    if (el.type !== 'text') return
    const isRtl = RTL_CHAR_REGEX.test(newText)
    if (!el.style) el.style = {} as any
    const style = el.style
    if (isRtl) {
      // 阿拉伯文：强制哈萨克字体 + rtl + 右对齐
      if (!style.font || !style.font.includes('KazakhSoftAsilya')) {
        style.font = 'KazakhSoftAsilya'
      }
      style.direction = 'rtl'
      if (!style.textAlign) style.textAlign = 'right'
    } else {
      // 中文/英文：若之前被自动切换过，还原为默认字体和 ltr
      if (style.font === 'KazakhSoftAsilya') {
        style.font = '思源宋体'
      }
      if (style.direction === 'rtl') style.direction = 'ltr'
      if (style.textAlign === 'right') style.textAlign = 'center'
    }
  }

  /** 将字段值同步到所有模式（canvas / page / flip）的对应元素中 */
  function syncFieldToAllModes(key: string, value: string) {
    const templateStore = useTemplateStore()
    templateStore.updateField(key as keyof TemplateData, value)
    // canvas 模式
    editableElements.forEach(el => {
      if (el.dataKey === key) {
        el.text = value
        applyRtlStyleIfNeeded(el, value)
      }
    })
    // page 模式：图片类型更新 image 字段，文本类型更新 text 字段
    pageSections.forEach(sec => {
      if (sec.dataKey === key) {
        if (sec.type === 'image') sec.image = resolveUrl(value)
        else {
          sec.text = value
          if (sec.style) {
            const isRtl = RTL_CHAR_REGEX.test(value)
            if (isRtl) {
              if (!sec.style.font || !sec.style.font.includes('KazakhSoftAsilya')) sec.style.font = 'KazakhSoftAsilya'
              sec.style.direction = 'rtl'
              if (!sec.style.textAlign) sec.style.textAlign = 'right'
            } else {
              if (sec.style.font === 'KazakhSoftAsilya') sec.style.font = '思源宋体'
              if (sec.style.direction === 'rtl') sec.style.direction = 'ltr'
              if (sec.style.textAlign === 'right') sec.style.textAlign = 'center'
            }
          }
        }
      }
    })
    // flip 模式：遍历所有页面的元素
    flipPages.forEach(page => {
      (page.elements || []).forEach(el => {
        if (el.dataKey === key) {
          el.text = value
          applyRtlStyleIfNeeded(el, value)
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
      if (!url) return
      imageUrl = url!
    } else {
      idx = selectedElement.value!
      imageUrl = materialOrIdx.url
      if (idx === null) return
    }

    if (idx === null || idx < 0 || idx >= editableElements.length) return
    const el = editableElements[idx]
    if (!el || el.type !== 'image') return
    el.text = imageUrl
    // 同步到所有模式（canvas/page/flip），而非仅更新 templateData
    if (el.dataKey) {
      syncFieldToAllModes(el.dataKey, imageUrl)
    }
    pushHistory()
    selectedElement.value = null
  }

  function setCurrentWorkId(id: string | null) {
    currentWorkId.value = id
  }

  /** 构建用于保存/分享的作品数据快照 */
  function buildEditorData(): WorkEditorData {
    const templateStore = useTemplateStore()
    return {
      elements: JSON.parse(JSON.stringify(editableElements)),
      pageSections: JSON.parse(JSON.stringify(pageSections)),
      flipPages: JSON.parse(JSON.stringify(flipPages)),
      background: JSON.parse(JSON.stringify(background.value)),
      canvasSize: JSON.parse(JSON.stringify(canvasSize.value)),
      templateType: templateType.value,
      renderedImage: renderedImage.value,
      templateData: JSON.parse(JSON.stringify(templateStore.templateData)),
      basicInfo: JSON.parse(JSON.stringify(templateStore.basicInfo)),
      settings: JSON.parse(JSON.stringify(templateStore.settings)),
      currentFlipPageIndex: currentFlipPageIndex.value,
    }
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
    showTextEditor, showSectionTextEditor, showBasicInfoEditor,
    selectedElement, editingText,
    editableElements, currentTemplateId, currentWorkId, templateLoading, canvasSize, background, renderedImage,
    templateType, pageSections, activeSectionId,
    flipPages, currentFlipPageIndex,
    history, historyIndex, canUndo, canRedo, canReset,
    loadTemplateById, restoreTemplate, restoreFromWorkData, openSectionTextEditor, closeTextEditor, closeSectionTextEditor, confirmTextEdit,
    closeBasicInfoEditor, syncSmartField, syncBasicInfoToElements, syncFieldToAllModes,
    selectMaterial, applyImageToElement: selectMaterial, setCurrentWorkId,
    buildEditorData,
    updatePageSection, updatePageSectionText, updatePageSectionImage,
    pushHistory, undo, redo, resetToInitial, saveInitialSnapshot,
  }
})
