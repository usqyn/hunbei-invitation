import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { DEFAULT_TEMPLATE_DATA, DEFAULT_BASIC_INFO, DEFAULT_SETTINGS } from '@/constants'
import type { TemplateData, BasicInfo, TemplateSettings } from '@/types'

export const useTemplateStore = defineStore('template', () => {
  const templateData = reactive<TemplateData>({ ...DEFAULT_TEMPLATE_DATA })
  const basicInfo = reactive<BasicInfo>({ ...DEFAULT_BASIC_INFO })
  const settings = reactive<TemplateSettings>({ ...DEFAULT_SETTINGS })

  function updateBasicInfo(info: Partial<BasicInfo>) {
    Object.assign(basicInfo, info)
  }

  function updateField(key: keyof TemplateData, value: string) {
    templateData[key] = value
  }

  function toggleSetting(key: string) {
    if (key in settings) {
      settings[key] = !settings[key]
    }
  }

  return { templateData, basicInfo, settings, updateBasicInfo, updateField, toggleSetting }
})
