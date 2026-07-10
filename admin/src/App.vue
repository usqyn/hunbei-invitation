<template>
  <div class="app" @keydown="onKeyDown" tabindex="0" ref="appRootRef">
    <!-- 全局 Toast 通知 -->
    <Teleport to="body">
      <transition name="toast-fade">
        <div v-if="toast.visible" class="global-toast" :class="toast.type">
          <span class="toast-icon">{{ toast.type === 'success' ? '✅' : '❌' }}</span>
          <span class="toast-text">{{ toast.message }}</span>
        </div>
      </transition>
    </Teleport>

    <!-- ============ 顶部工具栏 ============ -->
    <EditorToolbar
      :currentView="currentView"
      :canUndo="canUndo"
      :canRedo="canRedo"
      :sizeLabel="sizeLabel"
      :pageMode="pageMode"
      :zoom="zoom"
      :showGrid="showGrid"
      @changeView="v => currentView = v"
      @undo="undo"
      @redo="redo"
      @addText="addText()"
      @triggerImageUpload="triggerImageUpload"
      @imageFile="onImageFile"
      @update:sizeLabel="v => { sizeLabel = v; onPresetChange() }"
      @changePageMode="onPageModeChange"
      @zoomOut="zoom = Math.max(0.3, zoom - 0.1)"
      @zoomIn="zoom = Math.min(3, zoom + 0.1)"
      @zoomReset="zoom = 1"
      @toggleGrid="toggleGrid"
      @deleteSelected="deleteSelected"
      @save="saveToServer"
      @publish="showPublishWizard = true"
      @export="onExportPNG"
    />

    <!-- ============ 主工作区 ============ -->
    <main v-if="currentView === 'editor'" class="workspace">
      <!-- 左侧面板 -->
      <LeftPanel
        v-model:leftTab="leftTab"
        :pageMode="pageMode"
        :selectedId="selectedId"
        :layers="layers"
        :templateList="templateList"
        :currentTemplateId="currentTemplateId"
        :currentTemplateName="currentTemplateName"
        :loadingTemplates="loadingTemplates"
        :historyVersions="historyVersions"
        :dateValues="dateValues"
        :flipPages="flipPages"
        :currentFlipPageIndex="currentFlipPageIndex"
        v-model:activeGradientCat="activeGradientCat"
        v-model:activeMaterialCat="activeMaterialCat"
        v-model:activePresetCat="activePresetCat"
        :filteredGradients="filteredGradients"
        :filteredMaterials="filteredMaterials"
        :filteredPresets="filteredPresets"
        :bgColors="bgColors"
        :SMART_FIELDS="SMART_FIELDS"
        :TEXT_PRESETS="TEXT_PRESETS"
        :materialCategories="materialCategories"
        :basicInfo="basicInfo"
        @addText="addText"
        @applyTextPreset="applyTextPreset"
        @addSmartField="addSmartField"
        @updateDateValues="(p) => { dateValues[p.key] = p.value }"
        @setBackground="setBackground"
        @applyColorScheme="applyColorScheme"
        @bgImageFile="onBgImageFile"
        @materialDragStart="onMaterialDragStart"
        @materialClick="onMaterialClick"
        @selectElement="selectElement"
        @toggleVisibility="toggleVisibility"
        @toggleLock="toggleLock"
        @bringForward="bringForward"
        @sendBackwards="sendBackwards"
        @bringToFront="bringToFront"
        @sendToBack="sendToBack"
        @deleteElement="deleteElement"
        @createNewFromCanvas="createNewFromCanvas"
        @loadPreset="loadPreset"
        @loadTemplateList="loadTemplateList"
        @loadTemplate="onLoadTemplate"
        @cloneTemplate="onCloneTemplate"
        @deleteTemplate="onDeleteTemplate"
        @restoreVersion="onRestoreVersion"
        @update:currentTemplateName="v => currentTemplateName = v"
        @selectFlipPage="selectFlipPage"
        @addFlipPage="addFlipPage"
        @removeFlipPage="removeFlipPage"
        @moveFlipPageUp="moveFlipPageUp"
        @moveFlipPageDown="moveFlipPageDown"
        @renameFlipPage="renameFlipPage"
        @updateBasicInfo="onUpdateBasicInfo"
        @syncBasicInfo="onSyncBasicInfo"
      />

      <!-- 中间画布 -->
      <CanvasArea
        ref="canvasAreaRef"
        :pageMode="pageMode"
        :canvasSize="canvasSize"
        :zoom="zoom"
        :selectedId="selectedId"
        :selectedElement="selectedElement"
        :showPreview="showPreview"
        :previewImage="previewImage"
        :currentFlipPageIndex="currentFlipPageIndex"
        :flipPages="flipPages"
        @wheel="onWheel"
        @canvasDrop="onCanvasDrop"
        @canvasDragOver="onCanvasDragOver"
        @togglePreview="showPreview = !showPreview"
        @refreshPreview="refreshPreview"
        @prevFlipPage="prevFlipPage"
        @nextFlipPage="nextFlipPage"
        @selectFlipPage="selectFlipPage"
        @update:canvasRef="onCanvasRefUpdate"
      />

      <!-- 右侧属性面板 -->
      <RightPanel
        :selectedElement="selectedElement"
        :canvasSize="canvasSize"
        :bgType="bgType"
        :bgColor1="bgColor1"
        :bgColor2="bgColor2"
        :bgAngle="bgAngle"
        :bgScale="bgScale"
        :bgOpacity="bgOpacity"
        :sizeLabel="sizeLabel"
        :fontList="fontList"
        @updateSelected="updateSelected"
        @update:bgType="v => { bgType = v }"
        @update:bgColor1="v => { bgColor1 = v }"
        @update:bgColor2="v => { bgColor2 = v }"
        @update:bgAngle="v => { bgAngle = v }"
        @update:bgScale="v => { bgScale = v }"
        @update:bgOpacity="v => { bgOpacity = v }"
        @update:sizeLabel="v => { sizeLabel = v; onPresetChange() }"
        @bgColorChange="onBgColorChange"
        @bgImageChange="onBgImageChange"
        @bgImageFile="onBgImageFile"
        @imageReplaceFile="onImageReplaceFile"
        @manualSize="onManualSize"
        @fontUpload="onFontUpload"
        @fontStyleChange="onFontStyleChange"
        @applyTextFx="applyTextFx"
        @applyFilterPreset="applyFilterPreset"
        @alignLeft="alignLeft"
        @alignCenter="alignCenter"
        @alignRight="alignRight"
        @alignTop="alignTop"
        @alignMiddle="alignMiddle"
        @alignBottom="alignBottom"
      />
    </main>

    <!-- ============ 海报模板管理 ============ -->
    <main v-else class="poster-view-wrap">
      <PosterManager />
    </main>

    <!-- 发布向导 -->
    <PublishWizard
      :visible="showPublishWizard"
      :canvasSize="canvasSize"
      :elementCount="elements.length"
      :getDraft="getDraft"
      :getCanvasEl="getCanvasEl"
      :getFabricCanvas="() => fabricCanvas.value"
      :pageMode="pageMode"
      :getFlipPages="() => flipPages"
      :saveCurrentFlipPage="saveCurrentFlipPage"
      @close="showPublishWizard = false"
      @published="onTemplatePublished"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useCanvas } from './composables/useCanvas'
import { useFlipPages } from './composables/useFlipPages'
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts'
import { useAutoSave } from './composables/useAutoSave'
import {
  uploadImages,
  uploadFonts,
  fetchFonts,
  API_BASE,
  fetchTemplates,
  fetchTemplate,
  deleteTemplate,
  initApi,
  createTemplate,
  updateTemplate,
} from './composables/useApi'
import PublishWizard from './components/PublishWizard.vue'
import EditorToolbar from './components/EditorToolbar.vue'
import LeftPanel from './components/LeftPanel.vue'
import RightPanel from './components/RightPanel.vue'
import CanvasArea from './components/CanvasArea.vue'
import PosterManager from './views/PosterManager.vue'
import type { TextElement, ImageElement, CanvasSize, AnyCanvasElement, PageMode } from './types/canvas'
import { CANVAS_PRESETS, DEFAULT_CANVAS_SIZE } from './types/canvas'
import { getMaterialCategories, getMaterialsByCategory } from './constants/materials'
import { fileToDataURL, getLuminance } from './utils/common'
import { SMART_FIELDS, TEXT_PRESETS, FILTER_PRESETS, bgColors, fontListBase } from './constants/config-data'
import type { SmartFieldConfig, TextPreset } from './constants/config-data'
import { serializeElement } from './utils/element-serializer'
import { PRESET_CATEGORIES, getPresetsByCategory } from './constants/presets'
import type { TemplatePreset } from './constants/presets'
import { GRADIENT_CATEGORIES, getGradientsByCategory } from './constants/gradients'
import { COLOR_SCHEMES } from './constants/colorSchemes'
import type { ColorScheme } from './constants/colorSchemes'
import { BRAND_COLOR } from './constants/common'

// 基本信息（模板数据）
const basicInfo = reactive<Record<string, string>>({
  inviter: '',
  invitee: '',
  date: '',
  time: '',
  location: '',
  address: '',
  phone: '',
  year: '',
  month: '',
  day: '',
  coverTitle: '',
  coverSubtitle: '',
  photoTitle: '',
  photoSubtitle: '',
  footerText: '',
  footerSubText: '',
})

// 日期占位符预览值
const dateValues = reactive<Record<string, string>>({ year: '', month: '', day: '' })
watch(dateValues, (val) => {
  refreshDatePlaceholders(val)
  basicInfo.year = val.year
  basicInfo.month = val.month
  basicInfo.day = val.day
}, { deep: true })

function syncBasicInfoToElements() {
  if (pageMode.value === 'flip') {
    saveCurrentFlipPage()
    flipPages.value.forEach((page) => {
      page.elements.forEach((el: any) => {
        if (el.dataKey && basicInfo[el.dataKey] !== undefined) {
          if (el.type === 'text') {
            el.text = basicInfo[el.dataKey]
          } else if (el.type === 'image') {
            el.text = basicInfo[el.dataKey]
            el.src = basicInfo[el.dataKey]
          }
        }
      })
    })
    loadCurrentFlipPage()
  } else {
    elements.value.forEach((el) => {
      const dataKey = (el as any).dataKey
      if (dataKey && basicInfo[dataKey] !== undefined) {
        if (el.type === 'text') {
          updateElementById(el.id, { content: basicInfo[dataKey] })
        } else if (el.type === 'image') {
          updateElementById(el.id, { src: basicInfo[dataKey] })
        }
      }
    })
  }
}

function updateElementById(id: string, patch: any) {
  const el = elements.value.find(e => e.id === id)
  if (!el) return
  const canvas = fabricCanvas.value
  if (!canvas) return
  const obj = canvas.getObjects().find(o => o.id === id)
  Object.assign(el, patch)
  if (obj && el.type === 'text') {
    (obj as fabric.IText).set('text', patch.content ?? (el as TextElement).content)
  }
  canvas.renderAll()
}

function onUpdateBasicInfo(key: string, value: string) {
  basicInfo[key] = value
  if (key === 'year' || key === 'month' || key === 'day') {
    dateValues[key] = value
  }
}

function onSyncBasicInfo() {
  syncBasicInfoToElements()
  pushHistory('sync basic info')
  showToast('基本信息已同步到画布元素 ✅')
}

const uploadedFontNames = ref<string[]>([])
const fontList = computed(() => [...uploadedFontNames.value, ...fontListBase])

async function onFontUpload(files: FileList) {
  if (!files || files.length === 0) return
  try {
    const fileList = Array.from(files)
    await uploadFonts(fileList)
    await loadUploadedFonts()
    alert('字体上传成功！')
  } catch (err: any) {
    alert('字体上传失败: ' + (err.message || err))
  }
}

async function loadUploadedFonts() {
  try {
    // fetchFonts 返回数组 { filename, url, size }，需用 map 提取文件名
    const fonts = await fetchFonts()
    uploadedFontNames.value = fonts.map(f => f.filename)
  } catch {}
}

// 渐变预设
const activeGradientCat = ref('全部')
const filteredGradients = computed(() => getGradientsByCategory(activeGradientCat.value))

// ============ 全局 Toast ============
const toast = reactive({ visible: false, message: '', type: 'success' as 'success' | 'error' })
let toastTimer: ReturnType<typeof setTimeout> | null = null
function showToast(message: string, type: 'success' | 'error' = 'success') {
  if (toastTimer) clearTimeout(toastTimer)
  toast.message = message
  toast.type = type
  toast.visible = true
  toastTimer = setTimeout(() => { toast.visible = false }, 2500)
}

// ============ DOM refs ============
const appRootRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const canvasAreaRef = ref<InstanceType<typeof CanvasArea> | null>(null)

// ============ 本地状态 ============
const leftTab = ref<'material' | 'layers' | 'templates' | 'pages'>('material')
const currentView = ref<'editor' | 'poster'>('editor')
const sizeLabel = ref('375 × 667')
const pageMode = ref<PageMode>('single')

// 背景 UI 状态
const bgType = ref<'solid' | 'linear-gradient' | 'radial-gradient' | 'image'>('solid')
const bgColor1 = ref('#ffffff')
const bgColor2 = ref('#f5f5f5')
const bgAngle = ref(180)
const bgScale = ref<'contain' | 'cover' | 'fill' | 'none'>('cover')
const bgOpacity = ref(100)

// ============ 画布 composable ============
const {
  canvasSize,
  background,
  selectedId,
  selectedElement,
  elements,
  zoom,
  canUndo,
  canRedo,
  showGrid,
  toggleGrid,
  nudgeElement,
  duplicateSelected,
  init,
  setSize,
  setBackground,
  addText: canvasAddText,
  addImage: canvasAddImage,
  deleteSelected,
  deleteElement,
  toggleVisibility,
  toggleLock,
  selectElement,
  updateSelected,
  bringToFront,
  sendToBack,
  bringForward,
  sendBackwards,
  copySelected,
  pasteFromClipboard,
  alignLeft,
  alignCenter,
  alignRight,
  alignTop,
  alignMiddle,
  alignBottom,
  undo,
  redo,
  pushHistory,
  getDraft,
  loadDraft,
  clearCanvas,
  dispose,
  refreshDatePlaceholders,
  fabricCanvas,
} = useCanvas({
  canvasRef,
  initialSize: { ...DEFAULT_CANVAS_SIZE },
  onSelectionChange: (el) => {
    // 选中元素时，同步 UI 状态到画布
  },
  onBackgroundChange: (bg) => {
    // 同步 App.vue 本地背景状态
    bgType.value = bg.type
    bgColor1.value = bg.color1
    bgColor2.value = bg.color2 ?? bg.color1
    bgAngle.value = bg.angle ?? 180
    if (bg.imageScale) bgScale.value = bg.imageScale
    if (bg.imageOpacity !== undefined) bgOpacity.value = bg.imageOpacity * 100
  },
})

// 图层：按 zIndex 降序显示（最上层排第一）
const layers = computed(() => [...elements.value].sort((a, b) => b.zIndex - a.zIndex))

// ============ 翻页模式 ============
const {
  flipPages,
  currentFlipPageIndex,
  initFlipPages,
  selectFlipPage,
  prevFlipPage,
  nextFlipPage,
  loadCurrentFlipPage,
  saveCurrentFlipPage,
  addFlipPage,
  removeFlipPage,
  moveFlipPageUp,
  moveFlipPageDown,
  renameFlipPage,
} = useFlipPages({
  pageMode,
  background,
  elements,
  canvasSize,
  setBackground,
  clearCanvas,
  addImage: canvasAddImage,
  addText: canvasAddText,
})

// ============ 键盘快捷键 ============
const { onKeyDown } = useKeyboardShortcuts({
  selectedId,
  undo,
  redo,
  copySelected,
  pasteFromClipboard,
  saveToServer,
  deleteSelected,
  nudgeElement,
  duplicateSelected,
})

// ============ 自动保存 ============
function getFullDraft() {
  const draft = getDraft()
  if (pageMode.value === 'flip') {
    saveCurrentFlipPage()
    return {
      ...draft,
      pageMode: pageMode.value,
      flipPages: flipPages.value,
      currentFlipPageIndex: currentFlipPageIndex.value,
    }
  }
  return {
    ...draft,
    pageMode: pageMode.value,
  }
}

function loadFullDraft(draft: any) {
  if (draft.pageMode === 'flip' && draft.flipPages && draft.flipPages.length > 0) {
    pageMode.value = 'flip'
    flipPages.value = draft.flipPages
    currentFlipPageIndex.value = draft.currentFlipPageIndex ?? 0
    const { canvasSize: _, background: __, elements: ___, ...rest } = draft
    loadDraft({
      canvasSize: draft.canvasSize,
      background: draft.flipPages[draft.currentFlipPageIndex ?? 0]?.background || draft.background,
      elements: [],
      ...rest,
    })
    nextTick(() => {
      loadCurrentFlipPage()
    })
  } else {
    if (draft.pageMode) {
      pageMode.value = draft.pageMode
    }
    loadDraft(draft)
  }
}

const { saveDraftToLocal, restoreDraftFromLocal, startAutoSave, getDraftInfo, isDraftRecent, discardDraft } = useAutoSave({
  getDraft: getFullDraft,
  loadDraft: loadFullDraft,
})

// ============ Phase 2: 素材库 ============
const materialCategories = getMaterialCategories()
const activeMaterialCat = ref('全部')
const filteredMaterials = computed(() => getMaterialsByCategory(activeMaterialCat.value))

function onMaterialDragStart(e: DragEvent, mat: any) {
  if (e.dataTransfer) {
    e.dataTransfer.setData('application/json', JSON.stringify(mat))
    e.dataTransfer.effectAllowed = 'copy'
  }
}

function svgWithColor(svg: string, color?: string): string {
  if (!color) return svg
  return svg.replace(/currentColor/g, color)
}

function loadSvgToCanvas(svg: string, color: string | undefined, x: number, y: number, name: string) {
  const colored = svgWithColor(svg, color)
  const blob = new Blob([colored], { type: 'image/svg+xml' })
  const reader = new FileReader()
  reader.onload = () => {
    canvasAddImage(reader.result as string, {
      x, y, width: 100, height: 100, name,
    } as any)
  }
  reader.readAsDataURL(blob)
}

function onMaterialClick(mat: any) {
  const cx = canvasSize.value.width / 2
  const cy = canvasSize.value.height / 2
  if ((mat.type === 'shape' || mat.type === 'sticker') && mat.svg) {
    loadSvgToCanvas(mat.svg, mat.color, cx, cy, mat.name)
  }
}

function onRestoreVersion(idx: number) {
  const ver = historyVersions.value[idx]
  if (!ver) return
  if (!confirm(`恢复到 v${historyVersions.value.length - idx}？当前未保存的更改将丢失。`)) return
  loadDraft(ver.draft)
}

async function onCanvasDrop(e: DragEvent) {
  e.preventDefault()
  const json = e.dataTransfer?.getData('application/json')
  if (!json) return
  try {
    const mat = JSON.parse(json)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom.value
    const y = (e.clientY - rect.top) / zoom.value

    if ((mat.type === 'shape' || mat.type === 'sticker') && mat.svg) {
      loadSvgToCanvas(mat.svg, mat.color, x, y, mat.name)
    }
  } catch (_) {}
}

function onCanvasDragOver(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
}

// ============ Phase 3: 模板列表 ============
const templateList = ref<any[]>([])
const loadingTemplates = ref(false)
const currentTemplateId = ref<string | null>(null)
const currentTemplateName = ref('')
const currentTemplateCategory = ref('wedding')
const currentTemplateSubtitle = ref('')
const currentTemplateTags = ref<string[]>([])
const currentTemplateLikes = ref(100)
const currentTemplatePageCount = ref(10)
const currentTemplateIsPaid = ref(false)
const currentTemplatePrice = ref(3)
const currentTemplateIsPremium = ref(false)
const showPublishWizard = ref(false)
const historyVersions = ref<Array<{ description: string; ts: number; draft: any }>>([])

// 起始模板
const activePresetCat = ref('scene')
const filteredPresets = computed(() => getPresetsByCategory(activePresetCat.value))

// 实时预览
const showPreview = ref(false)
const previewImage = ref('')

function refreshPreview() {
  const el = document.querySelector('.fabric-canvas') as HTMLCanvasElement
  if (!el) return
  previewImage.value = el.toDataURL('image/png', 0.9)
}

function getCanvasEl(): HTMLCanvasElement | null {
  return canvasRef.value || null
}

// 当 CanvasArea 组件通知 canvas ref 更新时
function onCanvasRefUpdate(el: HTMLCanvasElement | null) {
  canvasRef.value = el
}

async function loadTemplateList() {
  loadingTemplates.value = true
  try {
    templateList.value = await fetchTemplates()
  } catch (e) {
    console.error('loadTemplateList error:', e)
    templateList.value = []
  } finally {
    loadingTemplates.value = false
  }
}

async function onLoadTemplate(id: string) {
  try {
    const tpl = await fetchTemplate(id)
    
    if (tpl.data) {
      Object.keys(basicInfo).forEach(key => {
        if ((tpl.data as any)[key] !== undefined) {
          basicInfo[key] = (tpl.data as any)[key]
        }
      })
      dateValues.year = basicInfo.year
      dateValues.month = basicInfo.month
      dateValues.day = basicInfo.day
    }
    
    const draft = {
      canvasSize: tpl.canvasSize || { width: 375, height: 667 },
      background: tpl.background || { type: 'solid', color1: '#ffffff' },
      elements: (tpl.elements || []).map((el: any, idx: number) => {
        const w = el.width ?? 240
        const h = el.height ?? 60
        // 服务器存储的是左上角坐标，Fabric 使用中心原点，需转换
        const centerX = (el.x ?? 187) + w / 2
        const centerY = (el.y ?? (200 + idx * 80)) + h / 2
        return {
          id: el.id || `el_${idx}`,
          type: el.type,
          name: el.label || (el.type === 'text' ? '文字' : '图片'),
          x: centerX,
          y: centerY,
          width: w,
          height: h,
        rotation: el.rotation ?? 0,
        opacity: el.opacity ?? 1,
        locked: false,
        visible: true,
        zIndex: el.zIndex ?? idx,
        content: el.text || (el.dataKey ? (tpl.data as any)?.[el.dataKey] : '') || '',
        dataKey: el.dataKey,
        fontFamily: el.style?.font || '思源宋体, serif',
        fontSize: el.style?.fontSize ? Math.round(el.style.fontSize * (tpl.canvasSize?.width || 375) / 750) : 24,
        fontWeight: el.style?.fontWeight === 'bold' ? 'bold' : 'normal',
        fontStyle: el.style?.fontStyle || 'normal',
        color: el.style?.color || '#333333',
        textAlign: el.style?.textAlign || 'center',
        lineHeight: el.style?.lineHeight || 1.5,
        letterSpacing: el.style?.spacing || 2,
        strokeColor: el.style?.strokeColor || 'transparent',
        strokeWidth: el.style?.strokeWidth ?? 0,
        shadowColor: el.style?.shadowColor || 'transparent',
        shadowOffsetX: el.style?.shadowOffsetX ?? 0,
        shadowOffsetY: el.style?.shadowOffsetY ?? 0,
        shadowBlur: el.style?.shadowBlur ?? 0,
        textDecoration: el.style?.textDecoration || 'none',
        src: el.type === 'image' ? (el.text || (el.dataKey ? (tpl.data as any)?.[el.dataKey] : '') || '') : '',
        scale: 'cover',
        mask: 'rect',
        borderRadius: 0,
        borderColor: 'transparent',
        borderWidth: 0,
        brightness: 100,
        contrast: 0,
        blur: 0,
        grayscale: 0,
        saturate: 100,
        }
      }),
    }
    loadDraft(draft)
    currentTemplateId.value = id
    currentTemplateName.value = tpl.name || ''
    currentTemplateCategory.value = tpl.category || 'wedding'
    currentTemplateSubtitle.value = tpl.subtitle || ''
    currentTemplateTags.value = tpl.tags || []
    currentTemplateLikes.value = tpl.likes ?? 100
    currentTemplatePageCount.value = tpl.pageCount ?? 10
    currentTemplateIsPaid.value = !!tpl.isPaid
    currentTemplatePrice.value = tpl.price ?? 3
    currentTemplateIsPremium.value = !!tpl.isPremium
  } catch (e) {
    alert('加载模板失败：' + (e as Error).message)
  }
}

async function onCloneTemplate(tpl: any) {
  try {
    const fetchedTpl = await fetchTemplate(tpl.id)
    const draft = {
      canvasSize: fetchedTpl.canvasSize || { width: 375, height: 667 },
      background: fetchedTpl.background || { type: 'solid', color1: '#ffffff' },
      elements: (fetchedTpl.elements || []).map((el: any, idx: number) => {
        const w = el.width ?? 240
        const h = el.height ?? 60
        const centerX = (el.x ?? 187) + w / 2
        const centerY = (el.y ?? (200 + idx * 80)) + h / 2
        return {
          id: el.id || `el_${idx}`,
          type: el.type,
          name: el.label || (el.type === 'text' ? '文字' : '图片'),
          x: centerX,
          y: centerY,
          width: w,
          height: h,
        rotation: el.rotation ?? 0,
        opacity: el.opacity ?? 1,
        locked: false,
        visible: true,
        zIndex: el.zIndex ?? idx,
        content: el.text || (el.dataKey ? (fetchedTpl.data as any)?.[el.dataKey] : '') || '',
        dataKey: el.dataKey,
        fontFamily: el.style?.font || '思源宋体, serif',
        fontSize: el.style?.fontSize ? Math.round(el.style.fontSize * (fetchedTpl.canvasSize?.width || 375) / 750) : 24,
        fontWeight: el.style?.fontWeight === 'bold' ? 'bold' : 'normal',
        fontStyle: el.style?.fontStyle || 'normal',
        color: el.style?.color || '#333333',
        textAlign: el.style?.textAlign || 'center',
        lineHeight: el.style?.lineHeight || 1.5,
        letterSpacing: el.style?.spacing || 2,
        strokeColor: el.style?.strokeColor || 'transparent',
        strokeWidth: el.style?.strokeWidth ?? 0,
        shadowColor: el.style?.shadowColor || 'transparent',
        shadowOffsetX: el.style?.shadowOffsetX ?? 0,
        shadowOffsetY: el.style?.shadowOffsetY ?? 0,
        shadowBlur: el.style?.shadowBlur ?? 0,
        textDecoration: el.style?.textDecoration || 'none',
        src: el.type === 'image' ? (el.text || (el.dataKey ? (fetchedTpl.data as any)?.[el.dataKey] : '') || '') : '',
        scale: 'cover',
        mask: 'rect',
        borderRadius: 0,
        borderColor: 'transparent',
        borderWidth: 0,
        brightness: 100,
        contrast: 0,
        blur: 0,
        grayscale: 0,
        saturate: 100,
        }
      }),
    }
    loadDraft(draft)
    currentTemplateId.value = null
    currentTemplateName.value = `${fetchedTpl.name || tpl.name || '模板'} 副本`
    currentTemplateCategory.value = fetchedTpl.category || tpl.category || 'wedding'
    currentTemplateSubtitle.value = fetchedTpl.subtitle || tpl.subtitle || ''
    currentTemplateTags.value = fetchedTpl.tags || tpl.tags || []
    currentTemplateLikes.value = fetchedTpl.likes ?? tpl.likes ?? 100
    currentTemplatePageCount.value = fetchedTpl.pageCount ?? tpl.pageCount ?? 10
    currentTemplateIsPaid.value = !!(fetchedTpl.isPaid || tpl.isPaid)
    currentTemplatePrice.value = fetchedTpl.price ?? tpl.price ?? 3
    currentTemplateIsPremium.value = !!(fetchedTpl.isPremium || tpl.isPremium)
    historyVersions.value = []
    pushHistory('clone template')
    showToast('模板克隆成功 ✅')
  } catch (e) {
    alert('克隆模板失败：' + (e as Error).message)
  }
}

async function onDeleteTemplate(tpl: any) {
  if (!confirm(`确定删除模板「${tpl.name}」？`)) return
  try {
    await deleteTemplate(tpl.id)
    templateList.value = templateList.value.filter(t => t.id !== tpl.id)
    showToast('模板已删除')
  } catch (e) {
    alert('删除失败：' + (e as Error).message)
  }
}

function createNewFromCanvas() {
  currentTemplateId.value = null
  currentTemplateName.value = ''
  currentTemplateCategory.value = 'wedding'
  currentTemplateSubtitle.value = ''
  currentTemplateTags.value = []
  currentTemplateLikes.value = 100
  currentTemplatePageCount.value = 10
  currentTemplateIsPaid.value = false
  currentTemplatePrice.value = 3
  currentTemplateIsPremium.value = false
  clearCanvas()
  historyVersions.value = []
  pushHistory('new')
}

function loadPreset(preset: TemplatePreset) {
  if (!confirm(`使用「${preset.name}」模板？当前未保存的内容将丢失。`)) return
  currentTemplateId.value = null
  currentTemplateName.value = ''
  currentTemplateCategory.value = 'wedding'
  currentTemplateSubtitle.value = ''
  currentTemplateTags.value = []
  currentTemplateLikes.value = 100
  currentTemplatePageCount.value = 10
  currentTemplateIsPaid.value = false
  currentTemplatePrice.value = 3
  currentTemplateIsPremium.value = false
  loadDraft(preset.draft)
  historyVersions.value = []
  pushHistory('load preset: ' + preset.name)
  showToast(`已加载「${preset.name}」模板 ✅`)
}

function applyTextPreset(tp: TextPreset) {
  const sel = selectedElement.value
  if (sel && sel.type === 'text') {
    // 选中文字：应用样式
    updateSelected(tp.config as any)
    showToast(`已应用「${tp.name}」样式 ✅`)
  } else {
    // 未选中：插入新文字
    const content = tp.config.content || tp.sample
    addText({ content, ...tp.config } as any)
    showToast(`已插入「${tp.name}」文字 ✅`)
  }
}

function applyColorScheme(cs: ColorScheme) {
  let changed = 0

  if (pageMode.value === 'flip') {
    // flip 模式：遍历所有页面应用配色
    saveCurrentFlipPage()
    flipPages.value.forEach((page) => {
      page.background = { ...cs.background }
      page.elements.forEach((el: any) => {
        if (el.type !== 'text') return
        const oldColor = el.color
        const luminance = getLuminance(oldColor)
        let newColor = cs.textColor
        if (luminance > 0.75 && cs.subTextColor) {
          newColor = cs.subTextColor
        }
        if (oldColor !== newColor) {
          el.color = newColor
          changed++
        }
      })
    })
    // 重新加载当前页
    loadCurrentFlipPage()
  } else {
    // 单页模式
    setBackground(cs.background as any)
    const allEls = [...elements.value]
    allEls.forEach((el) => {
      if (el.type !== 'text') return
      const textEl = el as TextElement
      const oldColor = textEl.color
      const luminance = getLuminance(oldColor)
      let newColor = cs.textColor
      if (luminance > 0.75 && cs.subTextColor) {
        newColor = cs.subTextColor
      }
      if (oldColor !== newColor) {
        updateElementStyle(textEl.id, { color: newColor })
        changed++
      }
    })
  }

  pushHistory('apply color scheme: ' + cs.name)
  showToast(`已应用「${cs.name}」配色，修改 ${changed} 个元素 ✅`)
}

// updateElementStyle（直接对某个元素应用 patch，不触发选中）
function updateElementStyle(id: string, patch: any) {
  const el = elements.value.find(e => e.id === id)
  if (!el) return
  Object.assign(el, patch)
}

function applyFilterPreset(name: string) {
  const preset = FILTER_PRESETS[name]
  if (!preset) return
  updateSelected({ ...preset })
  showToast(`已应用「${name === 'none' ? '原图' : name === 'bw' ? '黑白' : name === 'soft' ? '柔光' : name === 'vintage' ? '复古' : name === 'cool' ? '冷色' : '暖色'}」滤镜 ✅`)
}

// 文字特效
function applyTextFx(type: string) {
  const sel = selectedElement.value
  if (!sel || sel.type !== 'text') {
    showToast('请先选中一个文字元素')
    return
  }
  const currentColor = (sel as any).color || '#333333'
  switch (type) {
    case 'gradient':
      updateSelected({ gradientFill: { c1: '#e84a6e', c2: '#FFD700' }, color: '#e84a6e' } as any)
      showToast('已应用渐变特效 ✅')
      break
    case 'longShadow':
      updateSelected({ longShadow: true, longShadowColor: 'rgba(0,0,0,0.3)', longShadowLength: 6, longShadowBlur: 2, shadowColor: 'transparent', shadowBlur: 0 } as any)
      showToast('已应用长阴影特效 ✅')
      break
    case 'neon':
      updateSelected({ neonGlow: true, neonColor: currentColor, strokeColor: currentColor, strokeWidth: 1, shadowColor: currentColor, shadowBlur: 15 } as any)
      showToast('已应用霓虹发光特效 ✅')
      break
    case 'outline':
      updateSelected({ color: 'transparent', strokeColor: currentColor, strokeWidth: 2, shadowColor: 'transparent', shadowBlur: 0 } as any)
      showToast('已应用空心描边特效 ✅')
      break
    case 'underline':
      updateSelected({ textDecoration: 'underline' } as any)
      showToast('已应用下划线 ✅')
      break
    case 'clearFx':
      updateSelected({
        gradientFill: undefined, longShadow: false, neonGlow: false,
        color: '#333333', strokeColor: 'transparent', strokeWidth: 0,
        shadowColor: 'transparent', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
        textDecoration: 'none',
      } as any)
      showToast('已清除所有特效 ✅')
      break
  }
}

// ============ 保存到服务器 ============

// 从画布生成高清渲染图（2x 分辨率）
async function generateRenderedImage(): Promise<string> {
  const fCanvas = fabricCanvas.value
  if (!fCanvas) return ''
  try {
    const dataUrl = fCanvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 })
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const file = new File([blob], `render-${Date.now()}.png`, { type: 'image/png' })
    const urls = await uploadImages([file])
    return urls[0] || ''
  } catch (e) {
    console.error('generateRenderedImage failed:', e)
    return ''
  }
}

async function saveToServer() {
  try {
    saveCurrentFlipPage()
    const draft = getDraft()
    const cSize = draft?.canvasSize || { width: 375, height: 667 }
    let name = currentTemplateName.value || ''
    if (!name) {
      name = window.prompt('请输入模板名称', name) || ''
      if (!name.trim()) return
      name = name.trim()
      currentTemplateName.value = name
    }

    // 从画布生成封面缩略图
    let coverDataUrl = ''
    const canvas = getCanvasEl()
    if (canvas) {
      try { coverDataUrl = canvas.toDataURL('image/jpeg', 0.85) } catch (_) {}
    }

    const isFlipMode = pageMode.value === 'flip'
    const resolvedPageCount = isFlipMode ? flipPages.value.length : currentTemplatePageCount.value

    const payload: any = {
      name,
      subtitle: currentTemplateSubtitle.value || '',
      category: currentTemplateCategory.value || 'wedding',
      tags: currentTemplateTags.value || [],
      cover: coverDataUrl,
      primaryColor: BRAND_COLOR,
      likes: currentTemplateLikes.value,
      pageCount: resolvedPageCount,
      status: 'draft',
      isPaid: currentTemplateIsPaid.value,
      price: currentTemplateIsPaid.value ? currentTemplatePrice.value : 0,
      isPremium: currentTemplateIsPremium.value,
      renderedImage: await generateRenderedImage(),
      orientation: cSize.width > cSize.height ? 'landscape' : 'portrait',
      templateType: isFlipMode ? 'flip' : 'canvas',
      data: {
        coverImage: coverDataUrl,
        coverTitle: basicInfo.coverTitle || name,
        coverSubtitle: basicInfo.coverSubtitle || currentTemplateSubtitle.value || '',
        photo1: '', photo2: '', photo3: '', photo4: '',
        photoTitle: basicInfo.photoTitle || '',
        photoSubtitle: basicInfo.photoSubtitle || '',
        footerText: basicInfo.footerText || '',
        footerSubText: basicInfo.footerSubText || '',
        inviter: basicInfo.inviter || '',
        invitee: basicInfo.invitee || '',
        date: basicInfo.date || '',
        time: basicInfo.time || '',
        location: basicInfo.location || '',
        address: basicInfo.address || '',
        phone: basicInfo.phone || '',
        year: basicInfo.year || '',
        month: basicInfo.month || '',
        day: basicInfo.day || '',
      },
      canvasSize: cSize,
      background: draft?.background || { type: 'solid', color1: '#ffffff' },
    }

    if (isFlipMode) {
      payload.pages = flipPages.value.map(page => ({
        id: page.id,
        name: page.name,
        pageType: page.pageType,
        background: page.background,
        elements: (page.elements || []).map((el: any) =>
          serializeElement(el, { canvasWidth: cSize.width })
        ),
      }))
    } else {
      payload.elements = (draft?.elements || []).map((el: any) =>
        serializeElement(el, { canvasWidth: cSize.width })
      )
    }

    let resultId: string
    if (currentTemplateId.value) {
      payload.id = currentTemplateId.value
      await updateTemplate(currentTemplateId.value, payload)
      resultId = currentTemplateId.value
    } else {
      const result = await createTemplate(payload)
      resultId = result.id
      currentTemplateId.value = resultId
      currentTemplateName.value = result.name || name
    }

    showToast('保存成功 ✅')
    loadTemplateList()
  } catch (e: any) {
    showToast('保存失败：' + (e?.response?.data?.error || e?.message || '未知错误'), 'error')
  }
}

// ============ Phase 4: 发布与导出 ============
function onExportPNG() {
  const canvas = getCanvasEl()
  if (!canvas) return
  const dataUrl = canvas.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `hunbei-template-${Date.now()}.png`
  a.click()
}

function onTemplatePublished(templateId: string) {
  showPublishWizard.value = false
  loadTemplateList()
  currentTemplateId.value = templateId
}

// ============ 事件处理 ============

// 文字添加：支持传入一些初始属性
function addText(partial?: Partial<TextElement>) {
  canvasAddText(partial)
}

// 快捷字段添加到画布
function addSmartField(sf: SmartFieldConfig) {
  canvasAddText({
    content: sf.placeholder,
    dataKey: sf.key,
    editable: true,
    name: sf.label,
    fontSize: sf.fontSize,
    fontWeight: sf.fontWeight,
    color: sf.color,
  })
}

// 文件上传
function triggerImageUpload() {
  fileInput.value?.click()
}

async function onImageFile(file: File) {
  try {
    const dataUrl = await fileToDataURL(file)
    await canvasAddImage(dataUrl)
    showToast('图片添加成功')
  } catch (err) {
    alert('图片上传失败：' + (err as Error).message)
  }
}

async function onImageReplaceFile(file: File) {
  if (!selectedId.value) return
  try {
    const dataUrl = await fileToDataURL(file)
    const id = selectedId.value
    const el = elements.value.find(e => e.id === id)
    if (el) {
      updateSelected({ src: dataUrl } as any)
      pushHistory('replace image')
    }
    showToast('图片替换成功')
  } catch (err) {
    alert('图片上传失败：' + (err as Error).message)
  }
}

async function onBgImageFile(file: File) {
  try {
    const dataUrl = await fileToDataURL(file)
    bgType.value = 'image'
    setBackground({ type: 'image', imageUrl: dataUrl, imageScale: bgScale.value, imageOpacity: bgOpacity.value / 100, color1: bgColor1.value })
    showToast('背景图设置成功')
  } catch (err) {
    alert('图片上传失败：' + (err as Error).message)
  }
}

// 背景设置：类型改变 / 颜色改变
function onBgColorChange() {
  setBackground({
    type: bgType.value,
    color1: bgColor1.value,
    color2: bgColor2.value,
    angle: bgAngle.value,
  })
}

function onBgImageChange() {
  if (bgType.value === 'image' && background.value.imageUrl) {
    setBackground({
      type: 'image',
      imageUrl: background.value.imageUrl,
      imageScale: bgScale.value,
      imageOpacity: bgOpacity.value / 100,
      color1: bgColor1.value,
    })
  }
}

// 画布尺寸
function onPresetChange() {
  const preset = CANVAS_PRESETS.find(p => p.label === sizeLabel.value)
  if (preset) {
    setSize({ width: preset.width, height: preset.height })
    if (sizeLabel.value.startsWith('横屏')) {
      pageMode.value = 'landscape'
    } else if (sizeLabel.value.startsWith('长页面')) {
      pageMode.value = 'long'
    } else {
      pageMode.value = 'single'
    }
  }
}

// 手动切换页面模式
function onPageModeChange(mode: PageMode) {
  pageMode.value = mode
  // 切换到单页时，如果当前是长页面或横屏，自动切回默认单页尺寸
  if (mode === 'single' && (canvasSize.value.height > 1000 || canvasSize.value.width > canvasSize.value.height)) {
    sizeLabel.value = '375 × 667'
    setSize({ width: 375, height: 667 })
  }
  // 切换到长页面时，如果当前高度 <= 1000，自动切到长页面尺寸
  if (mode === 'long' && canvasSize.value.height <= 1000) {
    sizeLabel.value = '长页面 375 × 2000'
    setSize({ width: 375, height: 2000 })
  }
  // 切换到横屏时，自动切到横屏尺寸
  if (mode === 'landscape' && canvasSize.value.width <= canvasSize.value.height) {
    sizeLabel.value = '横屏 750 × 500'
    setSize({ width: 750, height: 500 })
  }
  // 切换到翻页模式时，初始化页面列表
  if (mode === 'flip') {
    sizeLabel.value = '翻页 375 × 667'
    setSize({ width: 375, height: 667 })
    if (flipPages.value.length === 0) {
      initFlipPages()
    }
    loadCurrentFlipPage()
  }
}

// 页面模式切换时，画布 DOM 会重建（v-if），需销毁旧 Fabric 实例并在新 canvas 上重建
watch(pageMode, async (newMode, oldMode) => {
  if (oldMode === 'flip') {
    saveCurrentFlipPage()
  }
  await nextTick()
  const draft = getDraft()
  dispose()
  init()
  if (newMode === 'flip') {
    loadCurrentFlipPage()
  } else {
    loadDraft(draft)
  }
})

function onManualSize(payload: { e: Event; side: 'width' | 'height' }) {
  const value = Number((payload.e.target as HTMLInputElement).value)
  if (!value || value < 50) return
  const newSize: CanvasSize = {
    width: payload.side === 'width' ? value : canvasSize.value.width,
    height: payload.side === 'height' ? value : canvasSize.value.height,
  }
  setSize(newSize)
}

// 文字「加粗/斜体」映射
function onFontStyleChange(val: string) {
  const patch: Partial<TextElement> = {}
  if (val === 'bold') { patch.fontWeight = 'bold'; patch.fontStyle = 'normal' }
  else if (val === 'italic') { patch.fontWeight = 'normal'; patch.fontStyle = 'italic' }
  else if (val === 'bold-italic') { patch.fontWeight = 'bold'; patch.fontStyle = 'italic' }
  else { patch.fontWeight = 'normal'; patch.fontStyle = 'normal' }
  updateSelected(patch as any)
}

// 滚轮缩放
function onWheel(e: WheelEvent) {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.08 : 0.08
    zoom.value = Math.max(0.3, Math.min(3, zoom.value + delta))
  }
}

// ============ 聚焦根元素以接收键盘事件 ============
onMounted(async () => {
  await initApi()
  setTimeout(() => appRootRef.value?.focus(), 50)
  
  const draftInfo = getDraftInfo()
  if (draftInfo && isDraftRecent(24 * 60 * 60 * 1000)) {
    const savedAtStr = new Date(draftInfo.savedAt).toLocaleString()
    if (confirm(`检测到上次未保存的草稿（${savedAtStr}），是否恢复？`)) {
      restoreDraftFromLocal()
    } else {
      discardDraft()
      pushHistory('init')
    }
  } else if (draftInfo) {
    discardDraft()
    pushHistory('init')
  } else {
    pushHistory('init')
  }
  
  startAutoSave()
  loadTemplateList()
  loadUploadedFonts()
  window.addEventListener('publish-success', () => showToast('模板发布成功！'))
})
</script>

<style scoped>
* { box-sizing: border-box; }

/* ====== 根布局 ====== */
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #eef1f6;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', 'Segoe UI', sans-serif;
  color: #333;
  outline: none;
}

/* ====== 主工作区 ====== */
.workspace {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

.poster-view-wrap {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

/* ====== 全局 Toast ====== */
.global-toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 99999;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  pointer-events: none;
}
.global-toast.success { background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; }
.global-toast.error { background: #ffebee; color: #c62828; border: 1px solid #ffcdd2; }
.toast-icon { font-size: 18px; }
.toast-text { font-weight: 500; }

.toast-fade-enter-active, .toast-fade-leave-active { transition: all 0.3s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(-10px); }
</style>
