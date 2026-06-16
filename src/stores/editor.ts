import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { useTemplateStore } from './template'
import { DEFAULT_EDITABLE_ELEMENTS, MATERIAL_LIST, DEFAULT_ELEMENT_STYLE } from '@/constants/editor'
import type { EditableElement, Material, ElementStyle } from '@/types'

const STORAGE_KEY = 'hunbei_editor_styles'

export const useEditorStore = defineStore('editor', () => {
  const showTextEditor = ref(false)
  const showBasicInfoEditor = ref(false)
  const activePanelTab = ref('edit')
  const selectedElement = ref<number | null>(null)
  const editingText = ref('')

  const currentFont = ref(DEFAULT_ELEMENT_STYLE.font)
  const currentColor = ref(DEFAULT_ELEMENT_STYLE.color)
  const currentFontSize = ref(DEFAULT_ELEMENT_STYLE.fontSize)
  const currentSpacing = ref(DEFAULT_ELEMENT_STYLE.spacing)
  const currentLineHeight = ref(DEFAULT_ELEMENT_STYLE.lineHeight)

  const editableElements = reactive<EditableElement[]>(
    DEFAULT_EDITABLE_ELEMENTS.map(e => ({ ...e, style: e.style ? { ...e.style } : undefined }))
  )
  const materialList: Material[] = MATERIAL_LIST

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
      uni.setStorageSync(STORAGE_KEY, styles)
    } catch (e) { console.error('persistStyles failed', e) }
  }

  function restoreStyles() {
    try {
      const saved = uni.getStorageSync(STORAGE_KEY)
      if (saved && Array.isArray(saved)) {
        saved.forEach((style: ElementStyle | null, idx: number) => {
          if (style && editableElements[idx]) {
            editableElements[idx].style = { ...style }
          }
        })
      }
    } catch (e) { console.error('restoreStyles failed', e) }
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

  restoreStyles()

  return {
    showTextEditor, showBasicInfoEditor, activePanelTab,
    selectedElement, editingText, currentFont, currentColor,
    currentFontSize, currentSpacing, currentLineHeight,
    editableElements, materialList,
    openEditor, closeTextEditor, confirmTextEdit,
    closeBasicInfoEditor, resetStyle, selectMaterial,
    decreaseFontSize, increaseFontSize, decreaseSpacing,
    increaseSpacing, decreaseLineHeight, increaseLineHeight,
    onFontChange, onColorChange,
  }
})
