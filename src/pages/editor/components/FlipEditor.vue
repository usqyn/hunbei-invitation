<template>
  <view class="flip-editor">
    <!-- 顶部导航栏 -->
    <view class="editor-header">
      <view class="header-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="header-title">翻页编辑</text>
      <view class="header-actions">
        <text class="header-action" @click="handleUndo">↩</text>
        <text class="header-action" @click="handleRedo">↪</text>
      </view>
    </view>

    <!-- 页面管理栏 -->
    <view class="page-manager">
      <scroll-view class="page-list-scroll" scroll-x>
        <view class="page-list">
          <view
            v-for="(page, idx) in editorStore.flipPages"
            :key="page.id"
            class="page-list-item"
            :class="{ 'page-list-item--active': editorStore.currentFlipPageIndex === idx }"
            @click="selectPage(idx)"
          >
            <view class="page-list-thumb">
              <text class="page-list-num">{{ idx + 1 }}</text>
            </view>
            <text class="page-list-name">{{ page.name }}</text>
          </view>
        </view>
      </scroll-view>
      <view class="page-actions">
        <view class="page-action-btn" @click="addFlipPage">
          <text class="action-icon">+</text>
          <text class="action-text">添加页</text>
        </view>
        <view class="page-action-btn page-action-btn--danger" @click="deleteFlipPage">
          <text class="action-icon">×</text>
          <text class="action-text">删除</text>
        </view>
      </view>
    </view>

    <!-- 主内容区：全屏 Swiper -->
    <swiper
      class="flip-swiper"
      :current="editorStore.currentFlipPageIndex"
      @change="onSwiperChange"
    >
      <swiper-item v-for="(page, idx) in editorStore.flipPages" :key="page.id">
        <view class="flip-page" :style="getPageBgStyle(page)">
          <view
            v-for="(el, eIdx) in page.elements"
            :key="eIdx"
            class="flip-element"
            :class="{
              'flip-element--active': activeElementIndex === eIdx,
              'flip-element--dragging': flipDragging
            }"
            :style="getElementStyle(el)"
            @touchstart="onElementTouchStart(el, eIdx, $event)"
            @touchmove.stop.prevent="onElementTouchMove"
            @touchend="onElementTouchEnd"
            @click="onElementClick(el, eIdx)"
            @longpress="onElementLongPress(el, eIdx)"
          >
            <image
              v-if="el.type === 'image'"
              class="flip-image"
              :src="el.text || '/static/images/templates/wedding-1.svg'"
              mode="aspectFit"
            />
            <text
              v-else-if="el.type === 'text'"
              class="flip-text"
              :style="getTextStyle(el)"
            >{{ resolveText(el.text) }}</text>
          </view>
        </view>
      </swiper-item>
    </swiper>

    <!-- 底部工具栏 -->
    <view class="editor-footer">
      <!-- 选中元素时的上下文工具栏 -->
      <view v-if="selectedElement !== null" class="context-toolbar">
        <view class="ctx-btn" @click="handleEditText">
          <text class="ctx-icon">✏️</text>
          <text class="ctx-label">编辑</text>
        </view>
        <view v-if="selectedElement.type === 'image'" class="ctx-btn" @click="handleReplaceImage">
          <text class="ctx-icon">🖼️</text>
          <text class="ctx-label">换图</text>
        </view>
        <view v-if="selectedElement.type === 'image'" class="ctx-btn" @click="showImagePanel = true">
          <text class="ctx-icon">⚙️</text>
          <text class="ctx-label">调整</text>
        </view>
        <view class="ctx-btn" :class="{ 'ctx-btn--disabled': !editorStore.canUndo }" @click="handleUndo">
          <text class="ctx-icon">↩</text>
          <text class="ctx-label">撤销</text>
        </view>
        <view class="ctx-btn" :class="{ 'ctx-btn--disabled': !editorStore.canRedo }" @click="handleRedo">
          <text class="ctx-icon">↪</text>
          <text class="ctx-label">重做</text>
        </view>
        <view class="ctx-btn ctx-btn--danger" @click="deselectElement">
          <text class="ctx-icon">✕</text>
          <text class="ctx-label">取消</text>
        </view>
      </view>
      <!-- 底部主操作区 -->
      <view class="footer-main">
        <view class="footer-tabs">
          <view class="footer-tab" @click="openUnifiedEdit">
            <text class="tab-icon">📋</text>
            <text class="tab-label">信息</text>
          </view>
          <view class="footer-tab" @click="handleEditText">
            <text class="tab-icon">✏️</text>
            <text class="tab-label">文字</text>
          </view>
          <view class="footer-tab" @click="handleReplaceImage">
            <text class="tab-icon">🖼️</text>
            <text class="tab-label">图片</text>
          </view>
          <view class="footer-tab" @click="handleMusic">
            <text class="tab-icon">🎵</text>
            <text class="tab-label">音乐</text>
          </view>
          <view class="footer-tab" @click="handleMore">
            <text class="tab-icon">⋯</text>
            <text class="tab-label">更多</text>
          </view>
        </view>
        <view class="footer-actions">
          <view
            class="footer-action-btn footer-save-btn"
            :class="{ 'btn--disabled': savingLoading }"
            @click="handleSave"
          >
            <text class="action-btn-text">{{ savingLoading ? '保存中' : '保存' }}</text>
          </view>
          <view class="footer-action-btn footer-share-btn" @click="handleShare">
            <text class="action-btn-text">预览分享</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 文本编辑弹窗 -->
    <TextEditorPopup
      v-if="editorStore.showTextEditor"
      :visible="editorStore.showTextEditor"
      :editing-text="editorStore.editingText"
      @input="(v: string) => editorStore.editingText = v"
      @close="editorStore.closeTextEditor"
      @confirm="onTextEditorConfirm"
    />

    <!-- 统一编辑表单 -->
    <UnifiedEditForm
      v-if="editorStore.showBasicInfoEditor"
      :visible="editorStore.showBasicInfoEditor"
      :basic-info="templateStore.basicInfo"
      :elements="allFlipElements"
      :template-data="templateStore.templateData"
      :template-data-keys="allTemplateDataKeys"
      @close="onUnifiedEditCancel"
      @confirm="onUnifiedEditConfirm"
      @update="onSmartFieldUpdate"
      @location="handleLocation"
    />

    <!-- 图片属性调整面板 -->
    <ImagePropertyPanel
      :visible="showImagePanel"
      :element="selectedElement as any"
      @close="showImagePanel = false"
      @update="onImagePropUpdate"
      @preview="onImagePropPreview"
      @reset="onImagePropReset"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useTemplateStore } from '@/stores/template'
import { useWorksStore } from '@/stores/works'
import { useCanvasRender } from '@/composables/useCanvasRender'
import { useGoBack } from '@/composables/useGoBack'
import { useFeedback } from '@/composables/useFeedback'
import { resolveDatePlaceholders } from '@/utils/placeholders'
import { uploadImage } from '@/api'
import TextEditorPopup from './TextEditorPopup.vue'
import UnifiedEditForm from './UnifiedEditForm.vue'
import ImagePropertyPanel from './ImagePropertyPanel.vue'
import type { Work } from '@/types'

const editorStore = useEditorStore()
const templateStore = useTemplateStore()
const worksStore = useWorksStore()
const { goBack, isDirty } = useGoBack()
const { haptic } = useFeedback()

// 缓存系统屏幕信息，避免每次 touchmove 都调用 getSystemInfoSync
const _screenInfo = (() => {
  try {
    const info = uni.getSystemInfoSync()
    return { width: info.windowWidth || 375, height: info.windowHeight || 667 }
  } catch {
    return { width: 375, height: 667 }
  }
})()

const { getTextStyle } = useCanvasRender({
  getElements: () => [],
  getCanvasSize: () => undefined,
  getBackground: () => undefined,
})

const activeElementIndex = ref(-1)
const selectedElement = ref<any>(null)
const showImagePanel = ref(false)
const savingLoading = ref(false)
const hasUnsavedChanges = ref(false)
const flipDragging = ref(false)
let _formSnapshot: any = null
// 组件挂载状态标记，用于异步操作中判断组件是否已卸载
let _isMounted = true

// 收集模板中所有元素的 dataKey（跨 canvas/page/flip 三种模式），用于 UnifiedEditForm 按需显示字段
const allTemplateDataKeys = computed(() => {
  const keys = new Set<string>()
  editorStore.editableElements.forEach(el => { if (el.dataKey) keys.add(el.dataKey) })
  editorStore.pageSections.forEach(sec => { if (sec.dataKey) keys.add(sec.dataKey) })
  editorStore.flipPages.forEach(page => {
    (page.elements || []).forEach(el => { if (el.dataKey) keys.add(el.dataKey) })
  })
  return Array.from(keys)
})

// 所有翻页的元素汇总（传给 UnifiedEditForm 用于收集动态字段）
const allFlipElements = computed(() => {
  const result: any[] = []
  editorStore.flipPages.forEach(page => {
    if (page.elements) result.push(...page.elements)
  })
  return result
})

// 同步 hasUnsavedChanges 到 isDirty，用于返回前确认
watch(hasUnsavedChanges, (val) => {
  isDirty.value = val
})

// ============ 元素拖拽（touch 事件） ============
interface FlipDragState {
  elementIdx: number
  startTouchX: number
  startTouchY: number
  startX: number
  startY: number
  moved: boolean
}
const flipDragState = ref<FlipDragState | null>(null)
const FLIP_DRAG_THRESHOLD = 5
let lastFlipDragMoved = false

// 双击检测
let lastFlipTapIdx: number | null = null
let lastFlipTapTime = 0
const FLIP_DOUBLE_TAP_INTERVAL = 350

function onElementTouchStart(el: any, idx: number, e: any) {
  if (el.editable === false) return
  activeElementIndex.value = idx
  selectedElement.value = el
  haptic('light')
  const touch = e.touches ? e.touches[0] : e
  flipDragState.value = {
    elementIdx: idx,
    startTouchX: touch.clientX,
    startTouchY: touch.clientY,
    startX: el.x || 0,
    startY: el.y || 0,
    moved: false,
  }
}

function onElementTouchMove(e: any) {
  const ds = flipDragState.value
  if (!ds) return
  const touch = e.touches ? e.touches[0] : e
  const dx = touch.clientX - ds.startTouchX
  const dy = touch.clientY - ds.startTouchY
  if (!ds.moved && Math.abs(dx) + Math.abs(dy) < FLIP_DRAG_THRESHOLD) return
  if (!ds.moved) {
    ds.moved = true
    flipDragging.value = true
    haptic('medium')
  }
  const page = currentPage.value
  if (!page) return
  const el = page.elements[ds.elementIdx]
  if (!el) return
  const cs = editorStore.canvasSize
  // 将屏幕像素位移转换为画布坐标（缓存系统信息避免每次 touchmove 都同步调用）
  const screenW = _screenInfo.width || 375
  const screenH = _screenInfo.height || 667
  const screenToCanvasX = cs.width / screenW
  const screenToCanvasY = cs.height / screenH
  let newX = ds.startX + dx * screenToCanvasX
  let newY = ds.startY + dy * screenToCanvasY
  // 边界裁剪
  const elW = el.width || 0
  const elH = el.height || 0
  newX = Math.max(0, Math.min(cs.width - elW, newX))
  newY = Math.max(0, Math.min(cs.height - elH, newY))
  el.x = newX
  el.y = newY
}

function onElementTouchEnd() {
  const ds = flipDragState.value
  if (ds && ds.moved) {
    lastFlipDragMoved = true
    editorStore.pushHistory()
    hasUnsavedChanges.value = true
  }
  flipDragging.value = false
  flipDragState.value = null
}

function onElementLongPress(el: any, idx: number) {
  if (el.editable === false) return
  activeElementIndex.value = idx
  selectedElement.value = el
  haptic('medium')
  const items: string[] = ['编辑']
  if (el.type === 'image') {
    items.push('换图')
    items.push('调整')
  }
  items.push('删除')
  uni.showActionSheet({
    itemList: items,
    success: (res: any) => {
      let offset = 0
      if (items[offset] === '编辑') {
        if (res.tapIndex === offset) {
          openEditorForElement(el)
          return
        }
        offset++
      }
      if (el.type === 'image' && items[offset] === '换图') {
        if (res.tapIndex === offset) {
          handleReplaceImage()
          return
        }
        offset++
      }
      if (el.type === 'image' && items[offset] === '调整') {
        if (res.tapIndex === offset) {
          showImagePanel.value = true
          return
        }
        offset++
      }
      if (items[offset] === '删除') {
        if (res.tapIndex === offset) {
          const page = currentPage.value
          if (page) {
            page.elements.splice(idx, 1)
            activeElementIndex.value = -1
            selectedElement.value = null
            editorStore.pushHistory()
            hasUnsavedChanges.value = true
          }
        }
      }
    },
  })
}

// 打开元素编辑器（双击或上下文菜单触发）
function openEditorForElement(el: any) {
  if (!el || el.editable === false) return
  if (el.type === 'image') {
    onImageUpload()
  } else if (el.type === 'text') {
    editorStore.editingText = el.text
    editorStore.showTextEditor = true
  }
}

const currentPage = computed(() => {
  return editorStore.flipPages[editorStore.currentFlipPageIndex] || editorStore.flipPages[0] || null
})

function getCurrentPageElements() {
  return currentPage.value?.elements || []
}

function resolveText(text: string): string {
  return resolveDatePlaceholders(text, templateStore.templateData)
}

function selectPage(idx: number) {
  editorStore.currentFlipPageIndex = idx
  activeElementIndex.value = -1
  selectedElement.value = null
}

function onSwiperChange(e: any) {
  editorStore.currentFlipPageIndex = e.detail.current
  activeElementIndex.value = -1
  selectedElement.value = null
}

function onElementClick(el: any, idx: number) {
  if (lastFlipDragMoved) {
    lastFlipDragMoved = false
    return
  }
  const now = Date.now()
  // 双击检测：已选中且在间隔内再次点击则打开编辑器
  if (activeElementIndex.value === idx && lastFlipTapIdx === idx && (now - lastFlipTapTime) < FLIP_DOUBLE_TAP_INTERVAL) {
    lastFlipTapIdx = null
    lastFlipTapTime = 0
    openEditorForElement(el)
    return
  }
  // 第一次点击：仅选中
  activeElementIndex.value = idx
  selectedElement.value = el
  haptic('light')
  lastFlipTapIdx = idx
  lastFlipTapTime = now
}

function deselectElement() {
  activeElementIndex.value = -1
  selectedElement.value = null
}

// 图片属性面板更新回调（防抖记录历史）
let flipPropTimer: ReturnType<typeof setTimeout> | null = null
function onImagePropUpdate(field: string, value: number) {
  if (!selectedElement.value) return
  ;(selectedElement.value as any)[field] = value
  hasUnsavedChanges.value = true
  if (flipPropTimer) clearTimeout(flipPropTimer)
  flipPropTimer = setTimeout(() => {
    editorStore.pushHistory()
    flipPropTimer = null
  }, 500)
}

// 图片属性面板预览回调（@changing 事件，实时更新但不记录历史）
function onImagePropPreview(field: string, value: number) {
  if (!selectedElement.value) return
  ;(selectedElement.value as any)[field] = value
}

// 图片属性面板重置回调
function onImagePropReset() {
  if (!selectedElement.value) return
  selectedElement.value.imageScale = 1
  selectedElement.value.rotation = 0
  selectedElement.value.opacity = 1
  selectedElement.value.borderRadius = 0
  editorStore.pushHistory()
  hasUnsavedChanges.value = true
}

function handleEditText() {
  if (!selectedElement.value || selectedElement.value.type !== 'text') {
    uni.showToast({ title: '请先选择文字元素', icon: 'none' })
    return
  }
  editorStore.editingText = selectedElement.value.text
  editorStore.showTextEditor = true
}

function handleReplaceImage() {
  if (!selectedElement.value || selectedElement.value.type !== 'image') {
    uni.showToast({ title: '请先选择图片元素', icon: 'none' })
    return
  }
  onImageUpload()
}

let textInputTimer: any = null

function onTextEditorConfirm() {
  if (selectedElement.value) {
    selectedElement.value.text = editorStore.editingText
    if (selectedElement.value.dataKey) {
      editorStore.syncFieldToAllModes(selectedElement.value.dataKey, editorStore.editingText)
    }
    hasUnsavedChanges.value = true
    if (textInputTimer) clearTimeout(textInputTimer)
    textInputTimer = setTimeout(() => {
      editorStore.pushHistory()
      textInputTimer = null
    }, 800)
  }
  editorStore.closeTextEditor()
}

async function applySelectedImage(tempFilePath: string) {
  if (!selectedElement.value) return
  uni.showLoading({ title: '上传中 0%' })
  try {
    const permanentUrl = await uploadImage(tempFilePath, (progress: number) => {
      uni.showLoading({ title: `上传中 ${progress}%` })
    })
    if (_isMounted && selectedElement.value) {
      selectedElement.value.text = permanentUrl
      if (selectedElement.value.dataKey) {
        editorStore.syncFieldToAllModes(selectedElement.value.dataKey, permanentUrl)
      }
      editorStore.pushHistory()
      hasUnsavedChanges.value = true
    }
  } catch (e) {
    console.warn('图片上传失败:', e)
    if (_isMounted && selectedElement.value) {
      selectedElement.value.text = tempFilePath
      if (selectedElement.value.dataKey) {
        editorStore.syncFieldToAllModes(selectedElement.value.dataKey, tempFilePath)
      }
      uni.showToast({ title: '图片上传失败，本地图片重启后可能丢失，请稍后重试', icon: 'none' })
    }
  } finally {
    if (_isMounted) uni.hideLoading()
  }
}

function onImageUpload() {
  // #ifdef MP-WEIXIN
  uni.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sourceType: ['album', 'camera'],
    success: (res: any) => {
      if (res.tempFiles && res.tempFiles.length > 0) {
        applySelectedImage(res.tempFiles[0].tempFilePath)
      }
    },
    fail: (err) => {
      if (err.errMsg && !err.errMsg.includes('cancel')) {
        uni.showToast({ title: '图片选择失败', icon: 'none' })
      }
    },
  })
  // #endif

  // #ifndef MP-WEIXIN
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res: any) => {
      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        applySelectedImage(res.tempFilePaths[0])
      }
    },
    fail: (err) => {
      if (err.errMsg && !err.errMsg.includes('cancel')) {
        uni.showToast({ title: '图片选择失败', icon: 'none' })
      }
    },
  })
  // #endif
}

function getPageBgStyle(page: any): Record<string, string> {
  const bg = page.background
  const style: Record<string, string> = {}
  if (bg.type === 'solid') {
    style.background = bg.color1
  } else if (bg.type === 'linear-gradient') {
    style.background = `linear-gradient(${bg.angle || 180}deg, ${bg.color1}, ${bg.color2 || bg.color1})`
  } else if (bg.type === 'image' && bg.imageUrl) {
    style.backgroundImage = `url(${bg.imageUrl})`
    style.backgroundSize = bg.imageScale || 'cover'
    style.backgroundPosition = 'center'
  }
  return style
}

function getElementStyle(el: any): Record<string, string> {
  const cs = editorStore.canvasSize
  const style: Record<string, string> = {
    position: 'absolute',
    left: (el.x / cs.width * 100) + '%',
    top: (el.y / cs.height * 100) + '%',
    width: (el.width / cs.width * 100) + '%',
    height: (el.height / cs.height * 100) + '%',
    opacity: el.opacity ?? 1,
    zIndex: el.zIndex || 1,
  }
  // 构建复合 transform：旋转 + 图片缩放
  const transforms: string[] = []
  if (el.rotation) transforms.push(`rotate(${el.rotation}deg)`)
  if (el.type === 'image' && el.imageScale && el.imageScale !== 1) transforms.push(`scale(${el.imageScale})`)
  if (transforms.length > 0) style.transform = transforms.join(' ')
  // 图片圆角
  const br = el.borderRadius ?? el.style?.borderRadius
  if (el.type === 'image' && br) {
    style.borderRadius = `${br}rpx`
    style.overflow = 'hidden'
  }
  return style
}

function addFlipPage() {
  const newPage = {
    id: `page_${Date.now()}`,
    name: `第${editorStore.flipPages.length + 1}页`,
    pageType: 'custom',
    background: { type: 'solid', color1: '#ffffff' },
    elements: [],
  }
  editorStore.flipPages.push(newPage)
  editorStore.currentFlipPageIndex = editorStore.flipPages.length - 1
  editorStore.pushHistory()
}

function deleteFlipPage() {
  if (editorStore.flipPages.length <= 1) {
    uni.showToast({ title: '至少保留一页', icon: 'none' })
    return
  }
  uni.showModal({
    title: '删除页面',
    content: `确定删除第${editorStore.currentFlipPageIndex + 1}页？`,
    confirmColor: '#e84a6e',
    success: (res) => {
      if (res.confirm) {
        const idx = editorStore.currentFlipPageIndex
        editorStore.flipPages.splice(idx, 1)
        if (idx >= editorStore.flipPages.length) {
          editorStore.currentFlipPageIndex = editorStore.flipPages.length - 1
        }
        activeElementIndex.value = -1
        selectedElement.value = null
        editorStore.pushHistory()
      }
    },
  })
}

function openUnifiedEdit() {
  // 保存当前快照，取消编辑时回滚（与主编辑器保持一致）
  _formSnapshot = JSON.parse(JSON.stringify({
    basicInfo: templateStore.basicInfo,
    templateData: templateStore.templateData,
    flipPages: editorStore.flipPages,
    pageSections: editorStore.pageSections,
    elements: editorStore.editableElements,
  }))
  editorStore.showBasicInfoEditor = true
}

function onUnifiedEditConfirm() {
  editorStore.syncBasicInfoToElements()
  editorStore.closeBasicInfoEditor()
  _formSnapshot = null
}

function onUnifiedEditCancel() {
  // 回滚所有修改（与主编辑器保持一致）
  if (_formSnapshot) {
    Object.assign(templateStore.basicInfo, _formSnapshot.basicInfo)
    Object.assign(templateStore.templateData, _formSnapshot.templateData)
    editorStore.flipPages.splice(0, editorStore.flipPages.length, ...JSON.parse(JSON.stringify(_formSnapshot.flipPages)))
    editorStore.pageSections.splice(0, editorStore.pageSections.length, ...JSON.parse(JSON.stringify(_formSnapshot.pageSections)))
    editorStore.editableElements.splice(0, editorStore.editableElements.length, ...JSON.parse(JSON.stringify(_formSnapshot.elements)))
  }
  editorStore.closeBasicInfoEditor()
  _formSnapshot = null
}

let flipSmartEditTimer: ReturnType<typeof setTimeout> | null = null
function onSmartFieldUpdate(key: string, value: string) {
  editorStore.syncSmartField(key, value)
  hasUnsavedChanges.value = true
  if (flipSmartEditTimer) clearTimeout(flipSmartEditTimer)
  flipSmartEditTimer = setTimeout(() => {
    editorStore.pushHistory()
    flipSmartEditTimer = null
  }, 800)
}

function handleUndo() {
  if (!editorStore.canUndo) return
  editorStore.undo()
}

function handleRedo() {
  if (!editorStore.canRedo) return
  editorStore.redo()
}

function handleMusic() {
  uni.navigateTo({ url: '/pages/music/index' })
}

function handleMore() {
  uni.showActionSheet({
    itemList: ['撤销', '重做', '设置', '更换模板', '导出'],
    success: (res: any) => {
      switch (res.tapIndex) {
        case 0: handleUndo(); break
        case 1: handleRedo(); break
        case 2: handleSettings(); break
        case 3: handleChangeTemplate(); break
        case 4: handleExport(); break
      }
    },
  })
}

function handleSettings() {
  const settingItems = [
    { name: '礼物相册', key: 'giftAlbum' },
    { name: '礼物购买', key: 'giftBuy' },
    { name: '礼金功能', key: 'moneyGift' },
    { name: '点赞功能', key: 'like' },
    { name: '弹幕功能', key: 'danmaku' },
    { name: '相册功能', key: 'album' },
  ]
  uni.showActionSheet({
    itemList: settingItems.map(s => {
      const enabled = (templateStore.settings as any)[s.key]
      return `${s.name}${enabled ? ' ✓' : ''}`
    }),
    success: (res: any) => {
      const item = settingItems[res.tapIndex]
      if (item) {
        templateStore.toggleSetting(item.key)
        const enabled = (templateStore.settings as any)[item.key]
        uni.showToast({ title: `${item.name}已${enabled ? '开启' : '关闭'}`, icon: 'none' })
      }
    },
  })
}

function handleChangeTemplate() {
  uni.showModal({
    title: '更换模板',
    content: '切换模板可能会丢失当前编辑内容，确定要继续吗？',
    confirmText: '继续',
    confirmColor: '#e84a6e',
    success: (res) => {
      if (res.confirm) {
        uni.navigateTo({ url: '/pages/template/index?from=editor' })
      }
    },
  })
}

async function handleExport() {
  // 与主编辑器一致：导出前确保作品已保存，再跳转预览页进行导出
  if (!editorStore.currentWorkId) {
    const confirmed = await new Promise<boolean>((resolve) => {
      uni.showModal({
        title: '提示',
        content: '请先保存作品再导出',
        confirmText: '去保存',
        success: (res) => resolve(res.confirm || false),
      })
    })
    if (!confirmed) return
    await handleSave()
  }
  if (editorStore.currentWorkId) {
    uni.navigateTo({ url: '/pages/preview/index?workId=' + editorStore.currentWorkId })
  } else {
    uni.showToast({ title: '保存失败，请重试', icon: 'none' })
  }
}

function handleLocation() {
  uni.showToast({ title: '该功能仅支持单页模式', icon: 'none' })
}

async function handleSave() {
  if (savingLoading.value) return
  savingLoading.value = true
  try {
    const editorData = editorStore.buildEditorData()
    const musicId = templateStore.selectedMusicId
    if (editorStore.currentWorkId) {
      const existing = worksStore.works.find(w => w.id === editorStore.currentWorkId)
      if (existing) {
        existing.title = templateStore.templateData.coverTitle || '未命名作品'
        existing.date = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })
        existing.image = templateStore.templateData.coverImage
        existing.cover = templateStore.templateData.coverImage
        existing.templateId = editorStore.currentTemplateId
        existing.templateType = editorStore.templateType
        existing.musicId = musicId
        existing.data = editorData
        existing.updatedAt = new Date().toISOString()
        worksStore.saveAsWork(existing)
        hasUnsavedChanges.value = false
        uni.showToast({ title: '已保存', icon: 'success' })
        return
      }
    }
    const id = editorStore.currentWorkId || String(Date.now())
    if (!editorStore.currentWorkId) {
      editorStore.setCurrentWorkId(id)
    }
    const work: Work = {
      id,
      title: templateStore.templateData.coverTitle || '未命名作品',
      date: new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      image: templateStore.templateData.coverImage,
      cover: templateStore.templateData.coverImage,
      templateId: editorStore.currentTemplateId,
      templateType: editorStore.templateType,
      musicId,
      status: 'draft',
      data: editorData,
      updatedAt: new Date().toISOString(),
    }
    worksStore.saveAsWork(work)
    hasUnsavedChanges.value = false
    uni.showToast({ title: '已保存', icon: 'success' })
  } finally {
    savingLoading.value = false
  }
}

async function handleShare() {
  await handleSave()
  if (!editorStore.currentWorkId) {
    uni.showToast({ title: '保存失败，请重试', icon: 'none' })
    return
  }
  uni.navigateTo({ url: '/pages/preview/index?workId=' + editorStore.currentWorkId })
}

onUnmounted(() => {
  _isMounted = false
  _formSnapshot = null
  if (textInputTimer) clearTimeout(textInputTimer)
  if (flipPropTimer) clearTimeout(flipPropTimer)
  if (flipSmartEditTimer) clearTimeout(flipSmartEditTimer)
})
</script>

<style lang="scss" scoped>
.flip-editor {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #fdf6f8 0%, #fef9fa 100%);
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + 20rpx) 30rpx 20rpx;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(12rpx);
  -webkit-backdrop-filter: blur(12rpx);
  border-bottom: none;
  flex-shrink: 0;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.06);
}

.header-back {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 50%;
  transition: all 0.2s ease;
}

.header-back:active {
  background: rgba(0, 0, 0, 0.1);
  transform: scale(0.92);
}

.back-icon {
  font-size: 44rpx;
  color: #2c2c2c;
  font-weight: 300;
  line-height: 1;
}

.header-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #2c2c2c;
  letter-spacing: 1rpx;
}

.header-actions {
  display: flex;
  gap: 12rpx;
}

.header-action {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34rpx;
  color: #555;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 50%;
  transition: all 0.2s ease;
}

.header-action:active {
  background: rgba(0, 0, 0, 0.1);
  transform: scale(0.92);
}

.page-manager {
  display: flex;
  align-items: center;
  padding: 16rpx 20rpx;
  background: #fff;
  border-bottom: 1rpx solid #f0e0e5;
  flex-shrink: 0;
  gap: 20rpx;
}

.page-list-scroll {
  flex: 1;
  white-space: nowrap;
}

.page-list {
  display: inline-flex;
  gap: 16rpx;
}

.page-list-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 16rpx;
  border-radius: 12rpx;
  background: #fafafa;
  transition: all 0.2s;
}

.page-list-item--active {
  background: #fdf6f8;
  outline: 3rpx solid #e84a6e;
}

.page-list-thumb {
  width: 80rpx;
  height: 120rpx;
  background: #f0f0f0;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-list-num {
  font-size: 28rpx;
  font-weight: bold;
  color: #999;
}

.page-list-item--active .page-list-num {
  color: #e84a6e;
}

.page-list-name {
  font-size: 22rpx;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100rpx;
  text-align: center;
}

.page-actions {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  flex-shrink: 0;
}

.page-action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12rpx 24rpx;
  background: #fdf6f8;
  border-radius: 12rpx;
  gap: 4rpx;
}

.page-action-btn--danger {
  background: #fff5f5;
}

.action-icon {
  font-size: 36rpx;
  color: #e84a6e;
}

.page-action-btn--danger .action-icon {
  color: #ff4d4f;
}

.action-text {
  font-size: 22rpx;
  color: #666;
}

.flip-swiper {
  flex: 1;
  height: 100%;
}

.flip-page {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.flip-element {
  position: absolute;
  overflow: hidden;
}

.flip-element--active {
  outline: 4rpx solid #e84a6e;
  outline-offset: -4rpx;
}

.flip-element--dragging {
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.2);
  opacity: 0.9;
}

.flip-image {
  width: 100%;
  height: 100%;
  display: block;
}

.flip-text {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  word-break: break-all;
  white-space: pre-wrap;
}

.editor-footer {
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-top: none;
  flex-shrink: 0;
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: 0 -4rpx 24rpx rgba(0, 0, 0, 0.08);
}

.context-toolbar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  background: linear-gradient(135deg, #fff5f7 0%, #fef0f3 100%);
  border-bottom: 1rpx solid rgba(232, 74, 110, 0.1);
  animation: slide-up 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.ctx-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12rpx 8rpx;
  border-radius: 16rpx;
  background: #fff;
  gap: 6rpx;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.ctx-btn:active {
  transform: scale(0.94);
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.06);
}

.ctx-btn--disabled {
  opacity: 0.35;
  pointer-events: none;
}

.ctx-btn--danger {
  background: #fff0f0;
}

.ctx-icon {
  font-size: 32rpx;
}

.ctx-label {
  font-size: 22rpx;
  color: #555;
  font-weight: 500;
}

.ctx-btn--danger .ctx-label {
  color: #e84a6e;
}

@keyframes slide-up {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.footer-main {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  gap: 20rpx;
}

.footer-tabs {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex: 1;
}

.footer-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: calc((100% - 32rpx) / 5);
  height: 88rpx;
  padding: 8rpx 4rpx;
  gap: 6rpx;
  border-radius: 16rpx;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.footer-tab:active {
  transform: scale(0.92);
  background: rgba(232, 74, 110, 0.06);
}

.tab-icon {
  font-size: 38rpx;
  line-height: 1;
}

.tab-label {
  font-size: 22rpx;
  color: #666;
  font-weight: 500;
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.footer-action-btn {
  padding: 18rpx 36rpx;
  border-radius: 44rpx;
  text-align: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.footer-action-btn:active {
  transform: scale(0.96);
}

.footer-save-btn {
  background: #f5f5f7;
  border: 1rpx solid #e8e8ec;
}

.footer-save-btn:active {
  background: #eef0f4;
}

.btn--disabled {
  opacity: 0.6;
  pointer-events: none;
}

.footer-share-btn {
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  box-shadow: 0 6rpx 20rpx rgba(232, 74, 110, 0.35);
}

.footer-share-btn:active {
  box-shadow: 0 3rpx 10rpx rgba(232, 74, 110, 0.4);
}

.action-btn-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.5rpx;
}

.footer-save-btn .action-btn-text {
  color: #4a4a4a;
}
</style>
