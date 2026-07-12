import { defineStore } from 'pinia'
import { reactive, ref, computed } from 'vue'
import { DEFAULT_TEMPLATE_DATA, DEFAULT_BASIC_INFO, DEFAULT_SETTINGS, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from '@/constants/editor'
import type { TemplateData, BasicInfo, TemplateSettings, Template } from '@/types'
import { request } from '@/utils/request'
import { useEditorStore } from './editor'

const STORAGE_KEY = 'hunbei_template'

export const useTemplateStore = defineStore('template', () => {
  const templateData = reactive<TemplateData>({ ...DEFAULT_TEMPLATE_DATA })
  const basicInfo = reactive<BasicInfo>({ ...DEFAULT_BASIC_INFO })
  const settings = reactive<TemplateSettings>({ ...DEFAULT_SETTINGS })
  const templateList = ref<Template[]>([])
  const loading = ref(false)
  const selectedMusicId = ref<number | null>(null)
  const orientation = ref<'portrait' | 'landscape'>('portrait')

  /** canvasSize 由 editorStore 统一维护，此处作为代理访问 */
  const canvasSize = computed(() => {
    const editorStore = useEditorStore()
    return editorStore.canvasSize
  })

  function setCanvasSize(size: { width: number; height: number }) {
    const editorStore = useEditorStore()
    editorStore.canvasSize = { ...size }
    orientation.value = size.width > size.height ? 'landscape' : 'portrait'
  }

  function updateBasicInfo(info: Partial<BasicInfo>) {
    Object.assign(basicInfo, info)
    persist()
  }

  function updateField(key: keyof TemplateData, value: string) {
    templateData[key] = value
    debouncedPersist()
  }

  function toggleSetting(key: string) {
    if (key in settings) { settings[key] = !settings[key]; debouncedPersist() }
  }

  function setSelectedMusic(musicId: number | null) {
    selectedMusicId.value = musicId
    debouncedPersist()
  }

  // 防抖持久化：避免每次按键都触发同步 IO
  let persistTimer: any = null
  function debouncedPersist() {
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = setTimeout(() => {
      persist()
      persistTimer = null
    }, 500)
  }

  function persist() {
    try {
      const editorStore = useEditorStore()
      uni.setStorageSync(STORAGE_KEY, {
        templateData: { ...templateData },
        basicInfo: { ...basicInfo },
        settings: { ...settings },
        selectedMusicId: selectedMusicId.value,
        canvasSize: { ...editorStore.canvasSize },
        orientation: orientation.value,
      })
    } catch (e) { console.error('template persist failed', e) }
  }

  function restore() {
    try {
      const saved = uni.getStorageSync(STORAGE_KEY)
      if (saved) {
        if (saved.templateData) Object.assign(templateData, saved.templateData)
        if (saved.basicInfo) Object.assign(basicInfo, saved.basicInfo)
        if (saved.settings) Object.assign(settings, saved.settings)
        if (saved.selectedMusicId !== undefined && saved.selectedMusicId !== null) selectedMusicId.value = saved.selectedMusicId
        if (saved.canvasSize) {
          // 同步恢复的 canvasSize 到 editorStore
          const editorStore = useEditorStore()
          editorStore.canvasSize = { ...saved.canvasSize }
        }
        if (saved.orientation) orientation.value = saved.orientation
      }
    } catch (e) { console.error('template restore failed', e) }
  }

  async function fetchTemplates(type?: string) {
    loading.value = true
    try { templateList.value = await request<Template[]>({ url: '/api/templates', data: { type, page: 1 } }) }
    catch (e) { console.error('fetchTemplates failed', e); templateList.value = [] }
    finally { loading.value = false }
  }

  function reset() {
    Object.assign(templateData, { ...DEFAULT_TEMPLATE_DATA })
    Object.assign(basicInfo, { ...DEFAULT_BASIC_INFO })
    Object.assign(settings, { ...DEFAULT_SETTINGS })
    selectedMusicId.value = null
    // 重置画布尺寸与方向（setCanvasSize 会同步到 editorStore 并根据宽高推导 orientation）
    setCanvasSize({ width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT })
    // 清理持久化存储，避免 restore() 时恢复已被重置的旧状态
    try { uni.removeStorageSync(STORAGE_KEY) } catch {}
  }

  restore()

  return {
    templateData, basicInfo, settings, templateList, loading, selectedMusicId,
    canvasSize, orientation,
    updateBasicInfo, updateField, toggleSetting, setSelectedMusic,
    setCanvasSize,
    fetchTemplates, persist, reset,
  }
})
