import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { useTemplateStore } from './template'
import { DEFAULT_EDITABLE_ELEMENTS, MATERIAL_LIST } from '@/constants'
import type { EditableElement, Material } from '@/types'

export const useEditorStore = defineStore('editor', () => {
  const showTextEditor = ref(false)
  const showBasicInfoEditor = ref(false)
  const activePanelTab = ref('edit')
  const selectedElement = ref<number | null>(null)
  const editingText = ref('')
  const currentFont = ref('思源宋体极细')
  const currentColor = ref('#666666')
  const currentFontSize = ref(12)
  const currentSpacing = ref(2)
  const currentLineHeight = ref(2)

  const editableElements = reactive<EditableElement[]>(
    DEFAULT_EDITABLE_ELEMENTS.map(e => ({ ...e }))
  )
  const materialList: Material[] = MATERIAL_LIST

  function openEditor(idx: number) {
    const el = editableElements[idx]
    if (el.type === 'image') {
      selectedElement.value = idx
      activePanelTab.value = 'material'
      uni.showToast({ title: '请在素材库中选择替换图片', icon: 'none' })
    } else if (el.type === 'basic') {
      showBasicInfoEditor.value = true
    } else if (el.type === 'text') {
      selectedElement.value = idx
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
      if (el.dataKey) {
        const templateStore = useTemplateStore()
        templateStore.updateField(el.dataKey, editingText.value)
      }
    }
    showTextEditor.value = false
  }

  function closeBasicInfoEditor() {
    showBasicInfoEditor.value = false
  }

  function resetStyle() {
    currentFont.value = '思源宋体极细'
    currentColor.value = '#666666'
    currentFontSize.value = 12
    currentSpacing.value = 2
    currentLineHeight.value = 2
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

  return {
    showTextEditor, showBasicInfoEditor, activePanelTab,
    selectedElement, editingText, currentFont, currentColor,
    currentFontSize, currentSpacing, currentLineHeight,
    editableElements, materialList,
    openEditor, closeTextEditor, confirmTextEdit,
    closeBasicInfoEditor, resetStyle, selectMaterial,
  }
})
