import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import { DEFAULT_TEMPLATE_DATA, DEFAULT_BASIC_INFO, DEFAULT_SETTINGS } from '@/constants/editor'
import type { TemplateData, BasicInfo, TemplateSettings, Template } from '@/types'
import { request } from '@/utils/request'

const STORAGE_KEY = 'hunbei_template'

export const useTemplateStore = defineStore('template', () => {
  const templateData = reactive<TemplateData>({ ...DEFAULT_TEMPLATE_DATA })
  const basicInfo = reactive<BasicInfo>({ ...DEFAULT_BASIC_INFO })
  const settings = reactive<TemplateSettings>({ ...DEFAULT_SETTINGS })
  const templateList = ref<Template[]>([])
  const loading = ref(false)
  const selectedMusicId = ref<number | null>(null)

  function updateBasicInfo(info: Partial<BasicInfo>) {
    Object.assign(basicInfo, info)
    persist()
  }

  function updateField(key: keyof TemplateData, value: string) {
    templateData[key] = value
    persist()
  }

  function toggleSetting(key: string) {
    if (key in settings) { settings[key] = !settings[key]; persist() }
  }

  function setSelectedMusic(musicId: number | null) {
    selectedMusicId.value = musicId
    persist()
  }

  function persist() {
    try {
      uni.setStorageSync(STORAGE_KEY, {
        templateData: { ...templateData },
        basicInfo: { ...basicInfo },
        settings: { ...settings },
        selectedMusicId: selectedMusicId.value,
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
        if (saved.selectedMusicId) selectedMusicId.value = saved.selectedMusicId
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
  }

  restore()

  return {
    templateData, basicInfo, settings, templateList, loading, selectedMusicId,
    updateBasicInfo, updateField, toggleSetting, setSelectedMusic,
    fetchTemplates, persist, reset,
  }
})
