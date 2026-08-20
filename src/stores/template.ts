import { defineStore } from 'pinia'
import { reactive, ref, computed } from 'vue'
import { DEFAULT_TEMPLATE_DATA, DEFAULT_BASIC_INFO, DEFAULT_SETTINGS, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from '@/constants/editor'
import type { TemplateData, BasicInfo, TemplateSettings, Template } from '@/types'
import { request } from '@/utils/request'
import { resolveUrl } from '@/utils/url'

const STORAGE_KEY = 'TOYtamaxia_template'

export const useTemplateStore = defineStore('template', () => {
  const templateData = reactive<TemplateData>({ ...DEFAULT_TEMPLATE_DATA })
  const basicInfo = reactive<BasicInfo>({ ...DEFAULT_BASIC_INFO })
  const settings = reactive<TemplateSettings>({ ...DEFAULT_SETTINGS })
  const templateList = ref<Template[]>([])
  const loading = ref(false)
  const selectedMusicId = ref<number | null>(null)
  const orientation = ref<'portrait' | 'landscape'>('portrait')

  /** 根据画布尺寸更新方向（canvasSize 由 editorStore 统一维护，不再代理） */
  function setOrientationFromSize(size: { width: number; height: number }) {
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
  let persistTimer: ReturnType<typeof setTimeout> | null = null
  function debouncedPersist() {
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = setTimeout(() => {
      persist()
      persistTimer = null
    }, 500)
  }

  function persist() {
    try {
      // canvasSize 由 editorStore 自行持久化，此处不再保存
      uni.setStorageSync(STORAGE_KEY, {
        templateData: { ...templateData },
        basicInfo: { ...basicInfo },
        settings: { ...settings },
        selectedMusicId: selectedMusicId.value,
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
        // canvasSize 由 editorStore 自行恢复
        if (saved.orientation) orientation.value = saved.orientation
      }
    } catch (e) { console.error('template restore failed', e) }
  }

  async function fetchTemplates(type?: string) {
    loading.value = true
    try {
      const list = await request<Template[]>({ url: '/api/templates', data: { type, page: 1 } })
      templateList.value = (list || []).map(t => ({
        ...t,
        image: resolveUrl((t as any).image || (t as any).cover || ''),
        vipLevel: t.vipLevel || inferVipLevel(t),
      }))
    }
    catch (e) { console.error('fetchTemplates failed', e); templateList.value = [] }
    finally { loading.value = false }
  }

  function inferVipLevel(t: Template): 'free' | 'limited' | 'personal' | 'svip' | 'pro' {
    if (t.vipLevel) return t.vipLevel
    if (t.is_premium) return 'pro'
    if (t.is_paid && t.vip_free) return 'personal'
    if (t.is_paid) return 'limited'
    return 'free'
  }

  function reset() {
    Object.assign(templateData, { ...DEFAULT_TEMPLATE_DATA })
    Object.assign(basicInfo, { ...DEFAULT_BASIC_INFO })
    Object.assign(settings, { ...DEFAULT_SETTINGS })
    selectedMusicId.value = null
    templateList.value = []
    orientation.value = DEFAULT_CANVAS_WIDTH > DEFAULT_CANVAS_HEIGHT ? 'landscape' : 'portrait'
    // canvasSize 由 editorStore 自己重置
    try { uni.removeStorageSync(STORAGE_KEY) } catch {}
  }

  restore()

  return {
    templateData, basicInfo, settings, templateList, loading, selectedMusicId,
    orientation,
    updateBasicInfo, updateField, toggleSetting, setSelectedMusic,
    setOrientationFromSize,
    fetchTemplates, persist, reset,
  }
})
