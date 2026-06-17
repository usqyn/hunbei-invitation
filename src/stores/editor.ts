import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { useTemplateStore } from './template'
import { DEFAULT_ELEMENT_STYLE } from '@/constants/templates'
import { getTemplateById, DEFAULT_TEMPLATE_ID } from '@/constants/templates'
import type { EditableElement, Material, ElementStyle, TemplateData } from '@/types'

const STORAGE_KEY_STYLES = 'hunbei_editor_styles'
const STORAGE_KEY_TEMPLATE = 'hunbei_current_template'

export const useEditorStore = defineStore('editor', () => {
  const showTextEditor = ref(false)
  const showBasicInfoEditor = ref(false)
  const activePanelTab = ref('edit')
  const selectedElement = ref<number | null>(null)
  const editingText = ref('')
  const currentTemplateId = ref<string>(DEFAULT_TEMPLATE_ID)

  const currentFont = ref(DEFAULT_ELEMENT_STYLE.font)
  const currentColor = ref(DEFAULT_ELEMENT_STYLE.color)
  const currentFontSize = ref(DEFAULT_ELEMENT_STYLE.fontSize)
  const currentSpacing = ref(DEFAULT_ELEMENT_STYLE.spacing)
  const currentLineHeight = ref(DEFAULT_ELEMENT_STYLE.lineHeight)

  // 可编辑元素列表 - 根据模板动态生成
  const editableElements = reactive<EditableElement[]>([])

  // 素材库 - 支持图片选择时的本地素材
  const materialList: Material[] = [
    { url: '/static/images/templates/wedding-1.svg', name: '婚礼主题1' },
    { url: '/static/images/templates/wedding-2.svg', name: '婚礼主题2' },
    { url: '/static/images/templates/wedding-3.svg', name: '婚礼主题3' },
    { url: '/static/images/templates/wedding-4.svg', name: '婚礼主题4' },
    { url: '/static/images/templates/invitation-1.svg', name: '生日主题' },
    { url: '/static/images/templates/invitation-2.svg', name: '节日主题' },
    { url: '/static/images/templates/template-1.svg', name: '宝宝主题' },
    { url: '/static/images/templates/template-2.svg', name: '模板主题' },
  ]

  // ========== 加载模板 ==========
  function loadTemplateById(templateId: string) {
    const template = getTemplateById(templateId)
    if (!template) {
      console.warn('Template not found:', templateId)
      return false
    }

    currentTemplateId.value = templateId

    // 清空旧的元素列表
    editableElements.splice(0, editableElements.length)

    // 复制新模板的元素到列表
    template.elements.forEach(el => {
      editableElements.push({
        type: el.type,
        text: el.text,
        dataKey: el.dataKey,
        label: el.label,
        style: el.style ? { ...el.style } : undefined,
      })
    })

    // 同步更新 TemplateStore 的数据
    const templateStore = useTemplateStore()
    const data: TemplateData = template.data
    Object.keys(data).forEach(key => {
      const k = key as keyof TemplateData
      if (k in templateStore.templateData) {
        templateStore.templateData[k] = data[k]
      }
    })

    persistTemplate()
    return true
  }

  function syncCurrentFromElement(idx: number) {
    const el = editableElements[idx]
    if (el.style) {
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

  function syncCurrentToElement() {
    if (selectedElement.value === null) return
    const el = editableElements[selectedElement.value]
    if (!el.style) el.style = { ...DEFAULT_ELEMENT_STYLE }
    el.style.font = currentFont.value
    el.style.color = currentColor.value
    el.style.fontSize = currentFontSize.value
    el.style.spacing = currentSpacing.value
    el.style.lineHeight = currentLineHeight.value
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
      syncCurrentToElement()
      if (el.dataKey) {
        const templateStore = useTemplateStore()
        templateStore.updateField(el.dataKey, editingText.value)
      }
    }
    showTextEditor.value = false
    persistStyles()
  }

  function closeBasicInfoEditor() {
    showBasicInfoEditor.value = false
  }

  function resetStyle() {
    currentFont.value = DEFAULT_ELEMENT_STYLE.font
    currentColor.value = DEFAULT_ELEMENT_STYLE.color
    currentFontSize.value = DEFAULT_ELEMENT_STYLE.fontSize
    currentSpacing.value = DEFAULT_ELEMENT_STYLE.spacing
    currentLineHeight.value = DEFAULT_ELEMENT_STYLE.lineHeight
    syncCurrentToElement()
    persistStyles()
  }

  function selectMaterial(material: Material) {
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

  function decreaseFontSize() {
    if (currentFontSize.value > 8) currentFontSize.value--
    syncCurrentToElement()
    persistStyles()
  }

  function increaseFontSize() {
    if (currentFontSize.value < 72) currentFontSize.value++
    syncCurrentToElement()
    persistStyles()
  }

  function decreaseSpacing() {
    if (currentSpacing.value > 0) currentSpacing.value--
    syncCurrentToElement()
    persistStyles()
  }

  function increaseSpacing() {
    if (currentSpacing.value < 20) currentSpacing.value++
    syncCurrentToElement()
    persistStyles()
  }

  function decreaseLineHeight() {
    if (currentLineHeight.value > 1) currentLineHeight.value--
    syncCurrentToElement()
    persistStyles()
  }

  function increaseLineHeight() {
    if (currentLineHeight.value < 10) currentLineHeight.value++
    syncCurrentToElement()
    persistStyles()
  }

  function onFontChange(font: string) {
    currentFont.value = font
    syncCurrentToElement()
    persistStyles()
  }

  function onColorChange(color: string) {
    currentColor.value = color
    syncCurrentToElement()
    persistStyles()
  }

  // 启动时恢复模板
  restoreTemplate()
  restoreStyles()

  return {
    showTextEditor, showBasicInfoEditor, activePanelTab,
    selectedElement, editingText, currentFont, currentColor,
    currentFontSize, currentSpacing, currentLineHeight,
    editableElements, materialList, currentTemplateId,
    loadTemplateById, openEditor, closeTextEditor, confirmTextEdit,
    closeBasicInfoEditor, resetStyle, selectMaterial, applyImageToElement,
    decreaseFontSize, increaseFontSize, decreaseSpacing,
    increaseSpacing, decreaseLineHeight, increaseLineHeight,
    onFontChange, onColorChange,
  }
})
