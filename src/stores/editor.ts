import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { useTemplateStore } from './template'
import { getTemplateById, DEFAULT_TEMPLATE_ID } from '@/constants/templates'
import { resolveUrl, resolveCloudUrlSync, isCloudUrl, resolveCloudUrl } from '@/utils/url'
import { RTL_CHAR_REGEX } from '@/constants/editor'
import type { EditableElement, TemplateData, TemplateItem, PageSection, FlipPage, WorkEditorData, ElementStyle } from '@/types'
import { fetchTemplateData } from '@/utils/template-data'
import { extractTokenKeys } from '@/utils/resolveTextPlaceholders'
import { PLACEHOLDER_DEFS } from '@/constants/placeholder-defs'
import { getStorage, setStorage } from '@/utils/storage'
import { loadFontsForElements } from '@/utils/font-loader'
import { compositeImageWithMask, downloadToTemp } from '@/utils/imageFilter'
import { uploadImage } from '@/api'
import { deepClone } from '@/utils/common'
import { showToast } from '@/composables/useFeedback'

const STORAGE_KEY_TEMPLATE = 'TOYtamaxia_current_template'

/**
 * 通用 RTL 样式切换函数（消除 3 处重复代码）
 * 检测文字是否包含阿拉伯/哈萨克字符，自动切换字体/方向/对齐
 */
function applyRtlStyle(style: ElementStyle | undefined, text: string): ElementStyle {
  if (!text || !RTL_CHAR_REGEX.test(text)) {
    // 中文/英文：若之前被自动切换过，还原为默认
    if (style) {
      if (style.font === 'KazakhSoftAsilya') style.font = '思源宋体'
      if (style.direction === 'rtl') style.direction = 'ltr'
      if (style.textAlign === 'right') style.textAlign = 'center'
    }
    return style as ElementStyle
  }
  // 阿拉伯文：强制哈萨克字体 + rtl + 右对齐
  const result = style ? { ...style } : ({} as ElementStyle)
  if (!result.font || !result.font.includes('KazakhSoftAsilya')) {
    result.font = 'KazakhSoftAsilya'
  }
  if (!result.direction || result.direction === 'auto') {
    result.direction = 'rtl'
  }
  if (!result.textAlign) {
    result.textAlign = 'right'
  }
  return result
}

// 持久化失败计数器（连续失败 N 次后通知用户）
let _persistFailCount = 0
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
  const currentTemplateVipLevel = ref<'free' | 'limited' | 'personal' | 'svip' | 'pro'>('free')
  const currentTemplateCategory = ref<string>('wedding')

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
      elements: deepClone(editableElements),
      pageSections: deepClone(pageSections),
      flipPages: deepClone(flipPages),
      background: deepClone(background.value),
      canvasSize: deepClone(canvasSize.value),
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
      editableElements.splice(0, editableElements.length, ...deepClone(snap.elements))
    }
    if (snap && Array.isArray(snap.pageSections)) {
      pageSections.splice(0, pageSections.length, ...deepClone(snap.pageSections))
    }
    if (snap && Array.isArray(snap.flipPages)) {
      flipPages.splice(0, flipPages.length, ...deepClone(snap.flipPages))
    }
    if (snap && snap.background) {
      background.value = deepClone(snap.background)
    }
    if (snap && snap.canvasSize) {
      canvasSize.value = deepClone(snap.canvasSize)
    }
    if (snap && snap.templateType) {
      templateType.value = snap.templateType
    }
    if (snap && typeof snap.renderedImage !== 'undefined') {
      renderedImage.value = resolveCloudUrlSync(snap.renderedImage)
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
    const snapCopy = deepClone(_initialSnapshot.value)
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
      // 去重获取：与入口点击预取（prefetchTemplateData）共享同一 Promise，
      // 预取已完成时此处零等待
      const data = await fetchTemplateData(templateId)
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
    // 对必填字段加 fallback 默认值，防御 API 数据缺失
    // 兼容 snake_case 字段（云函数返回）与 camelCase 字段（server 返回）
    const type = el.type || 'text'
    const text = el.text ?? ''
    const isImage = type === 'image'
    // 检测 RTL 字符时自动切换哈萨克字体（使用通用 applyRtlStyle 函数）
    let style = el.style ? { ...el.style } : undefined
    if (!isImage && text) {
      style = applyRtlStyle(style, text)
    }
    return {
      type,
      text: isImage ? resolveUrl(text) : text,
      dataKey: el.dataKey || el.data_key,
      label: el.label,
      style,
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      zIndex: el.zIndex ?? el.z_index,
      rotation: el.rotation,
      opacity: el.opacity,
      editable: el.editable,
      isPremium: el.isPremium || el.is_premium,
      // 图片相关字段（snake_case 兼容）
      imageScale: el.imageScale ?? el.image_scale,
      imageOffsetX: el.imageOffsetX ?? el.image_offset_x,
      imageOffsetY: el.imageOffsetY ?? el.image_offset_y,
      borderRadius: el.borderRadius ?? el.border_radius,
      // 滤镜字段（admin 序列化器输出在 style 内，这里也兼容 element 级）
      brightness: el.brightness ?? style?.brightness,
      contrast: el.contrast ?? style?.contrast,
      saturate: el.saturate ?? style?.saturate,
      blur: el.blur ?? style?.blur,
      grayscale: el.grayscale ?? style?.grayscale,
      borderColor: el.borderColor ?? style?.borderColor,
      borderWidth: el.borderWidth ?? style?.borderWidth,
      mask: el.mask ?? style?.mask,
      maskSrc: el.maskSrc ?? style?.maskSrc,
    } as EditableElement
  }

  function applyTemplateData(template: TemplateItem) {
    if (!template) return

    // 加载新模板时重置选中状态，避免选中失效的元素索引
    selectedElement.value = null
    activeSectionId.value = null

    // 换模板：清空上一模板的占位符 key 历史（避免把无关字段带进新模板的「编辑信息」表单）
    seenPlaceholderKeys.clear()

    // 设置模板 VIP 等级
    currentTemplateVipLevel.value = template.vipLevel || 'free'

    // 记录模板分类（用于分享默认文案等场景化逻辑）
    currentTemplateCategory.value = template.category || 'wedding'

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
      // 背景：admin 存 image 字段，小程序 flip 渲染读 imageUrl（兼容历史数据两边都保留）
      // 同时做 imageUrl → image 与 image → imageUrl 双向归一化，确保任一渲染端都能取到值
      const rawBg = page.background || {}
      let bgImage = rawBg.image ? resolveUrl(rawBg.image) : undefined
      let bgImageUrl = rawBg.imageUrl ? resolveUrl(rawBg.imageUrl) : undefined
      if (bgImage && !bgImageUrl) bgImageUrl = bgImage
      if (bgImageUrl && !bgImage) bgImage = bgImageUrl
      flipPages.push({
        id: page.id,
        name: page.name,
        pageType: page.pageType,
        background: {
          type: rawBg.type || 'solid',
          color1: rawBg.color1 || '#ffffff',
          color2: rawBg.color2,
          angle: rawBg.angle,
          image: bgImage,
          imageUrl: bgImageUrl,
          imageScale: rawBg.imageScale,
          imageOpacity: rawBg.imageOpacity,
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

    // 同步渲染图（cloud:// URL 通过 resolveCloudUrlSync 转换为 https 临时 URL）
    renderedImage.value = resolveCloudUrlSync(resolveUrl(template.renderedImage || ''))

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

    // 同步方向信息到 TemplateStore（canvasSize 由 editorStore 直接维护）
    if (template.canvasSize) {
      canvasSize.value = { ...template.canvasSize }
      templateStore.setOrientationFromSize(template.canvasSize)
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

    // 批量预解析 cloud:// URL（元素图片 + 背景 + 渲染图 + flip pages）
    // 逐个调用 resolveCloudUrl，由 url.ts 的 20ms 窗口自动合并为批量调用
    prefetchTemplateCloudUrls()
  }

  /**
   * 模板加载后批量预解析所有 cloud:// URL，预热缓存。
   * 利用 url.ts 的 20ms 微批合并机制，逐个触发自动合并为一次批量调用。
   */
  function prefetchTemplateCloudUrls() {
    const urls = new Set<string>()
    // canvas 元素图片
    for (const el of editableElements) {
      if (el.text && isCloudUrl(el.text)) urls.add(el.text)
    }
    // flip pages 元素图片 + 背景
    for (const page of flipPages) {
      for (const el of (page.elements || [])) {
        if (el.text && isCloudUrl(el.text)) urls.add(el.text)
      }
      const bg = page.background || {}
      if (bg.image && isCloudUrl(bg.image)) urls.add(bg.image)
      if (bg.imageUrl && isCloudUrl(bg.imageUrl)) urls.add(bg.imageUrl)
    }
    // canvas 背景
    if (background.value?.image && isCloudUrl(background.value.image as string)) {
      urls.add(background.value.image as string)
    }
    // 渲染图
    if (renderedImage.value && isCloudUrl(renderedImage.value)) {
      urls.add(renderedImage.value)
    }
    // 批量预热（逐个触发，20ms 窗口自动合并为一次 /api/refresh-urls 调用）
    for (const url of urls) {
      resolveCloudUrl(url).catch(() => {})
    }
  }

  function persistTemplate() {
    setStorage(STORAGE_KEY_TEMPLATE, currentTemplateId.value)
    try {
      const templateStore = useTemplateStore()
      const data = {
        templateType: templateType.value,
        elements: deepClone(editableElements),
        pageSections: deepClone(pageSections),
        flipPages: deepClone(flipPages),
        canvasSize: deepClone(canvasSize.value),
        background: deepClone(background.value),
        renderedImage: renderedImage.value,
        templateData: deepClone(templateStore.templateData),
        basicInfo: deepClone(templateStore.basicInfo),
        settings: deepClone(templateStore.settings),
        selectedMusicId: templateStore.selectedMusicId,
        currentFlipPageIndex: currentFlipPageIndex.value,
      }
      setStorage(STORAGE_KEY_TEMPLATE_DATA, data)
      _persistFailCount = 0 // 成功则重置计数
    } catch (e) {
      console.warn('persistTemplate data failed:', e)
      _persistFailCount++
      // 连续失败 3 次后通知用户，避免静默数据丢失
      if (_persistFailCount === 3) {
        showToast('数据保存异常，请检查存储空间', 'warning')
      }
    }
  }

  async function restoreTemplate() {
    const savedId = getStorage<string>(STORAGE_KEY_TEMPLATE, '')
    seenPlaceholderKeys.clear()
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
          renderedImage.value = resolveCloudUrlSync(resolveUrl(savedData.renderedImage))
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
  function restoreFromWorkData(data: WorkEditorData, musicId?: number | string | null) {
    if (!data) return
    // 恢复作品：清空上一模板的占位符 key 历史
    seenPlaceholderKeys.clear()
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
    // 重新打开已保存作品：元素文本中的 token 已被实际值替换（保存前替换），
    // token 扫描不再命中 → 「编辑信息」表单字段全部消失。此处从作品数据回填
    // 曾使用的占位符 key（仅注册表内 key，避免把 coverTitle 等非表单字段带进来）
    Object.entries(templateStore.templateData).forEach(([k, v]) => {
      if (v && PLACEHOLDER_DEFS.some(d => d.key === k)) seenPlaceholderKeys.add(k)
    })
    const _bi = templateStore.basicInfo
    if (_bi.groomName) seenPlaceholderKeys.add('groomName')
    if (_bi.brideName) seenPlaceholderKeys.add('brideName')
    if (_bi.weddingDate) seenPlaceholderKeys.add('date')
    if (_bi.location) seenPlaceholderKeys.add('location')
    if (_bi.detailAddress) seenPlaceholderKeys.add('address')
    if (data.settings) Object.assign(templateStore.settings, data.settings)
    // 恢复音乐选择（使用 !== undefined 确保正确处理 null/0）
    if (musicId !== undefined && musicId !== null) {
      // 统一转为 number，保持与 song.id 比较一致
      templateStore.selectedMusicId = typeof musicId === 'string' ? Number(musicId) : musicId
    } else {
      templateStore.setSelectedMusic(null)
    }
    // 恢复翻页模式当前页码
    if (data.currentFlipPageIndex != null && data.currentFlipPageIndex >= 0 && data.currentFlipPageIndex < flipPages.length) {
      currentFlipPageIndex.value = data.currentFlipPageIndex
    }
    // 恢复渲染图（补全相对路径，cloud:// 转 https）；无渲染图时清空以触发重新生成
    if (data.renderedImage) {
      renderedImage.value = resolveCloudUrlSync(resolveUrl(data.renderedImage))
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
        // canvas 模式：文字修改后 renderedImage 快照过期，清空让预览重渲染
        if (templateType.value === 'canvas') renderedImage.value = ''
      }
    }
    // page 模式
    if (activeSectionId.value) {
      const sec = pageSections.find(s => s.id === activeSectionId.value)
      if (sec) {
        sec.text = editingText.value
        // page 模式也需应用 RTL 样式（修复哈语文字不连写）
        sec.style = applyRtlStyle(sec.style, editingText.value)
        if (sec.dataKey) {
          templateStore.updateField(sec.dataKey, editingText.value)
        }
      }
    }
    // flip 模式：selectedElement 存的是 flip 页内元素引用（不是 editableElements 里的 index），
    // 直接用引用判断即可。原 editableElements.indexOf(el) 永远返回 -1（flip 元素不在 editableElements 里），
    // 导致 idx === selectedElement.value 永远不成立 → 文字修改被静默丢弃。
    if (flipPages.length > 0 && currentFlipPageIndex.value >= 0) {
      const page = flipPages[currentFlipPageIndex.value]
      const selEl = selectedElement.value
      if (page?.elements && selEl && typeof selEl !== 'number' && selEl.type === 'text' && page.elements.includes(selEl)) {
        selEl.text = editingText.value
        applyRtlStyleIfNeeded(selEl, editingText.value)
        if ((selEl as any).dataKey) templateStore.updateField((selEl as any).dataKey, editingText.value)
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
    el.style = applyRtlStyle(el.style, newText)
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
          // 无条件应用 RTL（applyRtlStyle 内部处理 undefined style）
          sec.style = applyRtlStyle(sec.style, value)
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

  /** 将占位符字段值同步到所有模式元素文本中的 token（只替换 {key}，不整层覆盖文本） */
  function syncTokenToAllModes(key: string, value: string) {
    const token = `{${key}}`
    // 关键：token 被值替换后文本中不再含 {key}，allTemplateDataKeys 的 token 扫描会丢失该字段，
    // 导致「编辑信息」表单里刚填的字段行消失。替换前先登记到 seenPlaceholderKeys 保底。
    seenPlaceholderKeys.add(key)
    const apply = (el: EditableElement) => {
      if (el.type !== 'text' || !el.text || !el.text.includes(token)) return
      el.text = el.text.split(token).join(value)
      applyRtlStyleIfNeeded(el, el.text)
    }
    editableElements.forEach(apply)
    pageSections.forEach(sec => {
      if (sec.type !== 'image' && sec.text && sec.text.includes(token)) {
        sec.text = sec.text.split(token).join(value)
        sec.style = applyRtlStyle(sec.style, sec.text)
      }
    })
    flipPages.forEach(page => (page.elements || []).forEach(apply))
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
      // admin 端 PSD 导入把新人姓名绑为 inviter/invitee（见 admin placeholder-defs），
      // 小程序语义为 groomName/brideName（share 页 t.data.inviter→groomName 亦为此映射），两者同义
      inviter: 'groomName',
      invitee: 'brideName',
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
      // inviter/invitee 是 admin PSD 模板里新人姓名的实际 dataKey（与 groomName/brideName 同义），
      // 双写保证两种 token 形态都能被替换（无对应 token 时为空操作）
      inviter: info.groomName || '',
      invitee: info.brideName || '',
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
   *  options.skipMaskComposite: 调用方已自行完成蒙版离屏合成（如 onAdjusterConfirm）时跳过，
   *  避免对已烘焙形状的图重复合成+上传（产生孤儿文件）
   */
  function selectMaterial(materialOrIdx: { url: string; name: string } | number, url?: string, options?: { skipMaskComposite?: boolean }) {
    let idx: number
    let imageUrl: string

    if (typeof materialOrIdx === 'number') {
      idx = materialOrIdx
      if (!url) return
      imageUrl = url!
    } else {
      // 移除非空断言：先检查 null 再赋值
      const selectedIdx = selectedElement.value
      if (selectedIdx === null) return
      idx = selectedIdx
      imageUrl = materialOrIdx.url
    }

    if (idx === null || idx < 0 || idx >= editableElements.length) return
    const el = editableElements[idx]
    if (!el || el.type !== 'image') return
    // alpha / rounded（圆角矩形形状烘焙在原 PNG alpha）蒙版换图：保留原图 URL 作为形状源
    const mask = el.mask ?? el.style?.mask
    const shapeMasked = mask === 'alpha' || mask === 'rounded'
    if (shapeMasked && !el.maskSrc) {
      el.maskSrc = el.text
    }
    el.text = imageUrl
    // canvas 模式：换图后 renderedImage（模板原始合成快照）已过期，
    // 必须清空，否则预览/分享页优先显示旧快照，用户改好的照片被盖住
    if (templateType.value === 'canvas') renderedImage.value = ''
    // 同步到所有模式（canvas/page/flip），而非仅更新 templateData
    if (el.dataKey) {
      syncFieldToAllModes(el.dataKey, imageUrl)
    }
    pushHistory()
    // 形状蒙版：异步把新图与原图形状离屏合成并上传永久 URL（与 adjuster 确认路径一致）。
    // 合成前 UI 先显示原图 URL，不阻塞；完成后若元素未被再次替换则更新为合成结果。
    if (shapeMasked && el.maskSrc && !options?.skipMaskComposite) {
      void (async () => {
        try {
          const localNew = await downloadToTemp(imageUrl)
          const baked = await compositeImageWithMask(localNew, el.maskSrc as string)
          const permanentUrl = await uploadImage(baked)
          // 预热：新上传的 cloud:// 换取 https 写缓存，下次打开换图页面时
          // 蒙版预览的 mask-image 依赖 resolveCloudUrlSync 立即命中
          if (isCloudUrl(permanentUrl)) {
            void resolveCloudUrl(permanentUrl).catch(() => {})
          }
          if (editableElements[idx] === el && el.text === imageUrl) {
            el.text = permanentUrl
            if (el.dataKey) {
              syncFieldToAllModes(el.dataKey, permanentUrl)
            }
          }
        } catch (e) {
          console.warn('[editor] 素材换图蒙版合成失败，保留原图渲染兜底:', e)
          uni.showToast({ title: '蒙版处理失败，图片可能不带形状，请重试', icon: 'none' })
        }
      })()
    }
    // 保留选中状态，避免换图后用户需重新点击图片才能继续调整
    // （与 FlipEditor.applySelectedImage 行为对齐）
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

  // ============ 「编辑信息」表单字段收集 ============
  // 曾在模板中出现过的占位符 key：token 被值替换后仍保留在表单中，
  // 修复「填写日期后信息面板里日期选择行消失」的问题。
  // 换模板/恢复作品时重置（见 applyTemplateData / restoreTemplate / restoreFromWorkData）。
  const seenPlaceholderKeys = new Set<string>()

  /** 模板中所有元素的 dataKey + 占位符 token key 集合（跨 canvas/page/flip 三种模式），
   *  供 UnifiedEditForm 按需显示字段；与 seenPlaceholderKeys 取并集保证填写后不消失 */
  const allTemplateDataKeys = computed(() => {
    const keys = new Set<string>()
    editableElements.forEach(el => { if (el.dataKey) keys.add(el.dataKey) })
    pageSections.forEach(sec => { if (sec.dataKey) keys.add(sec.dataKey) })
    flipPages.forEach(page => {
      (page.elements || []).forEach(el => { if (el.dataKey) keys.add(el.dataKey) })
    })
    // 占位符 token 收集（token 化元素无 dataKey，扫描文本补齐表单字段），
    // 扫描结果同时登记进 seenPlaceholderKeys（换模板时先重置再扫描）
    ;[
      ...editableElements,
      ...pageSections,
      ...flipPages.flatMap(page => page.elements || []),
    ].forEach(el => {
      extractTokenKeys((el as { text?: string }).text || '').forEach(k => { keys.add(k); seenPlaceholderKeys.add(k) })
    })
    seenPlaceholderKeys.forEach(k => keys.add(k))
    return Array.from(keys)
  })

  return {
    showTextEditor, showSectionTextEditor, showBasicInfoEditor, selectedElement, editingText,
    editableElements, currentTemplateId, currentWorkId, templateLoading, currentTemplateVipLevel, currentTemplateCategory, canvasSize, background, renderedImage,
    templateType, pageSections, activeSectionId, allTemplateDataKeys,
    flipPages, currentFlipPageIndex,
    history, historyIndex, canUndo, canRedo, canReset,
    loadTemplateById, restoreTemplate, restoreFromWorkData, openSectionTextEditor, closeTextEditor, closeSectionTextEditor, confirmTextEdit,
    closeBasicInfoEditor, syncSmartField, syncBasicInfoToElements, syncFieldToAllModes,
    syncTokenToAllModes,
    selectMaterial, applyImageToElement: selectMaterial, setCurrentWorkId,
    buildEditorData,
    updatePageSection, updatePageSectionText, updatePageSectionImage,
    pushHistory, undo, redo, resetToInitial, saveInitialSnapshot,
  }
})
