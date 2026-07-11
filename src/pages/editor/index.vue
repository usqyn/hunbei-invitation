<template>
  <view class="editor-page">
    <!-- Header -->
    <view class="editor-header">
      <view class="header-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="header-title">编辑器</text>
      <view class="header-right"></view>
    </view>

    <!-- Body: 根据模板类型渲染不同编辑界面 -->
    <view v-if="editorStore.templateLoading" class="loading-overlay">
      <view class="skeleton-card">
        <view class="skeleton-img skeleton-pulse"></view>
        <view class="skeleton-line skeleton-pulse" style="width: 60%"></view>
        <view class="skeleton-line skeleton-pulse" style="width: 40%"></view>
        <view class="skeleton-line skeleton-pulse" style="width: 70%"></view>
      </view>
    </view>
    <view v-else-if="editorStore.templateType === 'page'" class="editor-body editor-body--page">
      <PageEditor />
    </view>
    <view v-else-if="editorStore.templateType === 'flip'" class="editor-body editor-body--flip">
      <FlipEditor />
    </view>
    <view v-else class="editor-body" :class="{ 'editor-body--landscape': isLandscape }">
      <!-- 画布模式：全屏画布（去除右侧面板，最大化预览区） -->
      <view class="preview-area" :class="{ 'preview-area--landscape': isLandscape }">
        <scroll-view class="preview-scroll" scroll-y>
          <!-- 有 renderedImage 且未过期：图片渲染 + 透明交互层 -->
          <template v-if="editorStore.renderedImage && !renderedImageStale">
            <view class="rendered-image-container">
              <image
                class="rendered-image"
                :src="editorStore.renderedImage"
                mode="widthFix"
                @load="onRenderedImageLoad"
                @error="onRenderedImageError"
              />
              <view
                v-for="(el, idx) in editorStore.editableElements" :key="el.id || ('el-' + idx)"
                class="rendered-overlay-element"
                :class="{
                  'rendered-overlay-element--active': editorStore.selectedElement === idx,
                  'rendered-overlay-element--no-click': el.editable === false
                }"
                :style="getOverlayElementStyle(el)"
                @touchstart="el.editable === false ? null : onElementTouchStart(idx, $event)"
                @touchmove.stop.prevent="onElementTouchMove"
                @touchend="onElementTouchEnd"
                @click="el.editable === false ? null : onElementTap(idx)"
              >
                <!-- 缩放手柄（选中时显示） -->
                <view
                  v-if="editorStore.selectedElement === idx && el.editable !== false"
                  class="resize-handle"
                  @touchstart.stop="onResizeHandleTouchStart"
                  @touchmove.stop.prevent="onResizeHandleTouchMove"
                  @touchend.stop="onResizeHandleTouchEnd"
                ></view>
              </view>
            </view>
          </template>
          <!-- 无 renderedImage：回退到百分比定位渲染 -->
          <template v-else>
            <view v-if="editorStore.editableElements.length === 0" class="empty-template-hint">
              <view class="empty-hint-icon-wrap">
                <text class="empty-hint-icon">📋</text>
              </view>
              <text class="empty-hint-text">此模板暂无内容</text>
              <text class="empty-hint-sub">请在管理端重新发布模板</text>
            </view>
            <view v-else class="preview-card preview-card--canvas" :style="canvasBackgroundStyle">
              <view
                v-for="(el, idx) in editorStore.editableElements" :key="el.id || ('el-' + idx)"
                class="canvas-element"
                :class="{
                  'active-element': editorStore.selectedElement === idx,
                  'text-element': el.type === 'text',
                  'non-editable': el.editable === false,
                  'canvas-element--no-interact': el.editable === false
                }"
                :style="getCanvasElementStyle(el)"
                @touchstart="el.editable === false ? null : onElementTouchStart(idx, $event)"
                @touchmove.stop.prevent="onElementTouchMove"
                @touchend="onElementTouchEnd"
                @click="el.editable === false ? null : onElementTap(idx)"
              >
                <image
                  v-if="el.type === 'image'"
                  class="canvas-image"
                  :src="el.text"
                  mode="aspectFit"
                  @error="onImageError"
                />
                <text
                  v-else-if="el.type === 'text'"
                  class="canvas-text"
                  :style="getTextStyle(el)"
                >{{ resolveText(el.text) }}</text>
                <!-- 缩放手柄（选中时显示） -->
                <view
                  v-if="editorStore.selectedElement === idx && el.editable !== false"
                  class="resize-handle"
                  @touchstart.stop="onResizeHandleTouchStart"
                  @touchmove.stop.prevent="onResizeHandleTouchMove"
                  @touchend.stop="onResizeHandleTouchEnd"
                ></view>
              </view>
            </view>
          </template>
        </scroll-view>
      </view>
    </view>

    <!-- 底部工具栏：上下文工具栏 + 5 Tab + 操作按钮 -->
    <view class="editor-footer">
      <!-- 上下文工具栏：选中元素时显示快捷操作 -->
      <view v-if="editorStore.selectedElement !== null" class="context-toolbar">
        <view class="ctx-btn" @click="handleEditText">
          <text class="ctx-icon">✏️</text>
          <text class="ctx-label">编辑</text>
        </view>
        <view v-if="selectedElType === 'image'" class="ctx-btn" @click="handleReplaceImage">
          <text class="ctx-icon">🖼️</text>
          <text class="ctx-label">换图</text>
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
      <!-- 底部 Tab + 操作区 -->
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
          <view class="footer-action-btn footer-save-btn" @click="handleSave">
            <text class="action-btn-text">保存</text>
          </view>
          <view class="footer-action-btn footer-share-btn" @click="handleShare">
            <text class="action-btn-text">预览分享</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Text Editor Popup -->
    <TextEditorPopup
      v-if="editorStore.showTextEditor"
      :visible="editorStore.showTextEditor"
      :editing-text="editorStore.editingText"
      @input="(v: string) => editorStore.editingText = v"
      @close="editorStore.closeTextEditor"
      @confirm="onTextEditorConfirm"
    />

    <!-- Unified Edit Form（合并基本信息 + 快捷填写） -->
    <UnifiedEditForm
      v-if="editorStore.showBasicInfoEditor"
      :visible="editorStore.showBasicInfoEditor"
      :basic-info="basicInfo"
      :elements="editorStore.editableElements"
      :template-data="templateStore.templateData"
      @close="onUnifiedEditCancel"
      @confirm="onUnifiedEditConfirm"
      @update="onSmartFieldUpdate"
      @location="handleLocation"
    />

  </view>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useTemplateStore } from '@/stores/template'
import { useEditorStore } from '@/stores/editor'
import { useWorksStore } from '@/stores/works'
import { useUserStore } from '@/stores/user'
import { loadFontsForElements } from '@/utils/font-loader'
import { track } from '@/utils/track'
import { resolveDatePlaceholders } from '@/utils/placeholders'
import { useCanvasRender } from '@/composables/useCanvasRender'
import { useGoBack } from '@/composables/useGoBack'
import { exportInvitation, uploadImage } from '@/api'
import PageEditor from './components/PageEditor.vue'
import FlipEditor from './components/FlipEditor.vue'
import TextEditorPopup from './components/TextEditorPopup.vue'
import UnifiedEditForm from './components/UnifiedEditForm.vue'
import type { EditableElement, Work } from '@/types'

const templateStore = useTemplateStore()
const editorStore = useEditorStore()
const worksStore = useWorksStore()
const userStore = useUserStore()

const {
  isCanvasMode,
  isLandscape,
  canvasBackgroundStyle,
  updateCardHeight,
  getCanvasElementStyle,
  getTextStyle,
} = useCanvasRender({
  getElements: () => editorStore.editableElements,
  getCanvasSize: () => editorStore.canvasSize,
  getBackground: () => editorStore.background as any,
})

// renderedImage 实际显示尺寸（由 @load 事件回调更新）
const renderedImageWidth = ref(0)
const renderedImageHeight = ref(0)

// renderedImage 加载完成，获取实际渲染尺寸
function onRenderedImageLoad(e: any) {
  if (e?.detail) {
    renderedImageWidth.value = e.detail.width
    renderedImageHeight.value = e.detail.height
  }
}

function onRenderedImageError() {
  console.warn('renderedImage 加载失败，回退到百分比定位渲染')
  renderedImageStale.value = true
}

// 交互层元素定位：基于 renderedImage 实际显示尺寸，将 Admin px 值转为百分比
function getOverlayElementStyle(el: EditableElement): Record<string, string> {
  if (el.x == null || el.y == null || el.width == null || el.height == null) return {}
  const cw = editorStore.canvasSize?.width || 375
  const ch = editorStore.canvasSize?.height || 667
  return {
    position: 'absolute',
    left: `${(el.x / cw) * 100}%`,
    top: `${(el.y / ch) * 100}%`,
    width: `${(el.width / cw) * 100}%`,
    height: `${(el.height / ch) * 100}%`,
  }
}

// 标记 renderedImage 已过期（用户编辑后需要重新渲染）
const renderedImageStale = ref(false)

// 编辑文本后标记过期
function onTextEditorConfirm() {
  editorStore.confirmTextEdit()
  renderedImageStale.value = true
}

// 统一表单确认：同步到可编辑元素，标记过期
function onUnifiedEditConfirm() {
  editorStore.syncBasicInfoToElements()
  editorStore.closeBasicInfoEditor()
  formSnapshot = null
  renderedImageStale.value = true
}

// 统一表单取消：回滚到打开前的状态
function onUnifiedEditCancel() {
  if (formSnapshot) {
    const templateStore2 = templateStore
    Object.assign(templateStore2.basicInfo, formSnapshot.basicInfo)
    Object.assign(templateStore2.templateData, formSnapshot.templateData)
    editorStore.editableElements.splice(0, editorStore.editableElements.length, ...formSnapshot.elements)
    editorStore.pageSections.splice(0, editorStore.pageSections.length, ...formSnapshot.pageSections)
    editorStore.flipPages.splice(0, editorStore.flipPages.length, ...formSnapshot.flipPages)
    renderedImageStale.value = formSnapshot._stale || false
    formSnapshot = null
  }
  editorStore.closeBasicInfoEditor()
}

// 智能字段更新后标记过期（输入时防抖记录历史）
let smartEditTimer: any = null
// 跟踪 onMounted 与 templateLoading watcher 中的 setTimeout，卸载时统一清理
let _mountTimers: ReturnType<typeof setTimeout>[] = []
function onSmartFieldUpdate(key: string, value: string) {
  editorStore.syncSmartField(key, value)
  renderedImageStale.value = true
  if (smartEditTimer) clearTimeout(smartEditTimer)
  smartEditTimer = setTimeout(() => {
    editorStore.pushHistory()
    smartEditTimer = null
  }, 800)
}

// ============ 元素拖拽 / 缩放（touch 事件） ============
const canvasDisplayRect = ref({ width: 0, height: 0 })

function updateCanvasDisplayRect() {
  const query = uni.createSelectorQuery()
  query
    .select('.rendered-image-container, .preview-card--canvas')
    .boundingClientRect((rect: any) => {
      if (rect && rect.width > 0) {
        canvasDisplayRect.value = { width: rect.width, height: rect.height }
      }
    })
    .exec()
}

interface DragState {
  type: 'move' | 'scale'
  elementIdx: number
  startTouchX: number
  startTouchY: number
  startX: number
  startY: number
  startWidth: number
  startHeight: number
  moved: boolean
}
const dragState = ref<DragState | null>(null)
const DRAG_THRESHOLD = 5
// 记录最近一次拖拽是否产生了位移，防止 touchend 后 click 仍触发编辑器
let lastDragMoved = false

function onElementTap(idx: number) {
  if (lastDragMoved) {
    lastDragMoved = false
    return
  }
  onOpenEditor(idx)
}

function onElementTouchStart(idx: number, e: any) {
  const el = editorStore.editableElements[idx]
  if (!el || el.editable === false) return
  if (el.x == null || el.y == null) return
  editorStore.selectedElement = idx
  updateCanvasDisplayRect()
  const touch = e.touches ? e.touches[0] : e
  dragState.value = {
    type: 'move',
    elementIdx: idx,
    startTouchX: touch.clientX,
    startTouchY: touch.clientY,
    startX: el.x,
    startY: el.y,
    startWidth: el.width || 0,
    startHeight: el.height || 0,
    moved: false,
  }
}

function onElementTouchMove(e: any) {
  const ds = dragState.value
  if (!ds || ds.type !== 'move') return
  const touch = e.touches ? e.touches[0] : e
  const dx = touch.clientX - ds.startTouchX
  const dy = touch.clientY - ds.startTouchY
  if (!ds.moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return
  ds.moved = true
  const rect = canvasDisplayRect.value
  const scaleX = rect.width ? editorStore.canvasSize.width / rect.width : 1
  const scaleY = rect.height ? editorStore.canvasSize.height / rect.height : 1
  const el = editorStore.editableElements[ds.elementIdx]
  if (!el) return
  const cw = editorStore.canvasSize.width
  const ch = editorStore.canvasSize.height
  const elW = el.width || 0
  const elH = el.height || 0
  let newX = ds.startX + dx * scaleX
  let newY = ds.startY + dy * scaleY
  newX = Math.max(0, Math.min(cw - elW, newX))
  newY = Math.max(0, Math.min(ch - elH, newY))
  el.x = newX
  el.y = newY
}

function onElementTouchEnd() {
  const ds = dragState.value
  if (ds && ds.moved) {
    lastDragMoved = true
    editorStore.pushHistory()
    renderedImageStale.value = true
  }
  dragState.value = null
}

function onResizeHandleTouchStart(e: any) {
  if (editorStore.selectedElement === null) return
  const el = editorStore.editableElements[editorStore.selectedElement]
  if (!el) return
  updateCanvasDisplayRect()
  const touch = e.touches ? e.touches[0] : e
  dragState.value = {
    type: 'scale',
    elementIdx: editorStore.selectedElement,
    startTouchX: touch.clientX,
    startTouchY: touch.clientY,
    startX: el.x || 0,
    startY: el.y || 0,
    startWidth: el.width || 0,
    startHeight: el.height || 0,
    moved: false,
  }
}

function onResizeHandleTouchMove(e: any) {
  const ds = dragState.value
  if (!ds || ds.type !== 'scale') return
  const touch = e.touches ? e.touches[0] : e
  const dx = touch.clientX - ds.startTouchX
  const dy = touch.clientY - ds.startTouchY
  const rect = canvasDisplayRect.value
  const scale = rect.width ? editorStore.canvasSize.width / rect.width : 1
  const deltaCanvas = Math.max(dx, dy) * scale
  const el = editorStore.editableElements[ds.elementIdx]
  if (!el) return
  const aspect = ds.startHeight && ds.startWidth ? ds.startHeight / ds.startWidth : 1
  const newWidth = Math.max(20, ds.startWidth + deltaCanvas)
  const newHeight = Math.max(20, newWidth * aspect)
  const cw = editorStore.canvasSize.width
  const ch = editorStore.canvasSize.height
  // 先裁剪宽度到画布边界，再根据裁剪后的宽度计算高度，保持宽高比
  const clampedWidth = Math.min(newWidth, cw - (el.x || 0))
  const clampedHeight = Math.min(clampedWidth * aspect, ch - (el.y || 0))
  el.width = clampedWidth
  el.height = clampedHeight
  ds.moved = true
}

function onResizeHandleTouchEnd() {
  const ds = dragState.value
  if (ds && ds.type === 'scale' && ds.moved) {
    editorStore.pushHistory()
    renderedImageStale.value = true
  }
  dragState.value = null
}

// 撤销 / 重做
function handleUndo() {
  if (!editorStore.canUndo) return
  editorStore.undo()
  renderedImageStale.value = true
}

function handleRedo() {
  if (!editorStore.canRedo) return
  editorStore.redo()
  renderedImageStale.value = true
}

const editProgress = ref(0)
const hasShownProgressPopup = ref(false)
const editStartTime = ref(Date.now())

const basicInfo = computed(() => templateStore.basicInfo)

// 选中元素的类型（用于上下文工具栏显示）
const selectedElType = computed(() => {
  if (editorStore.selectedElement === null) return null
  const el = editorStore.editableElements[editorStore.selectedElement]
  return el?.type || null
})

// 取消选中元素
function deselectElement() {
  editorStore.selectedElement = null
}

function resolveText(text: string): string {
  return resolveDatePlaceholders(text, templateStore.templateData)
}

function updateCardSize() {
  if (!isCanvasMode.value) return
  nextTick(() => {
    const query = uni.createSelectorQuery()
    query
      .select('.preview-card--canvas')
      .boundingClientRect((rect: any) => {
        if (rect && rect.width > 0) {
          updateCardHeight(rect.width)
        }
      })
      .exec()
  })
}

function calculateProgress(): number {
  const elements = editorStore.editableElements
  if (!elements.length) return 0
  let completed = 0
  elements.forEach(el => {
    if (el.type === 'text' && el.text && el.text.trim()) completed++
    if (el.type === 'image' && el.text && !el.text.includes('default')) completed++
  })
  if (templateStore.basicInfo?.groomName || templateStore.basicInfo?.brideName) completed += 2
  return Math.min(100, Math.round((completed / (elements.length + 2)) * 100))
}

watch(editProgress, (val) => {
  if (val >= 30 && val < 40 && !hasShownProgressPopup.value && !userStore.isVip()) {
    hasShownProgressPopup.value = true
    showProgressPopup()
  }
})

function showProgressPopup() {
  track('edit_progress_30', { elapsed_time: Date.now() - editStartTime.value })
  uni.showModal({
    title: '🎉 您的请柬已初具雏形',
    content: '解锁高级模板、去水印导出、高清大图，让请柬更完美',
    confirmText: '解锁全部 9.9元/月',
    cancelText: '继续免费编辑',
    success: (res) => {
      if (res.confirm) {
        track('click_unlock_vip', { trigger_point: 'edit_progress_30' })
        uni.navigateTo({ url: '/pages/vip/index' })
      }
    }
  })
}

// 打开编辑器
function onOpenEditor(idx: number) {
  const el = editorStore.editableElements[idx]
  if (!el || el.editable === false) return

  if (el.isPremium && !userStore.isVip()) {
    track('click_premium_element', { element_type: el.type })
    uni.showModal({
      title: '🔒 高级素材',
      content: '该素材为 VIP 专属，开通 VIP 立即可用',
      confirmText: '开通VIP',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          uni.navigateTo({ url: '/pages/vip/index' })
        }
      }
    })
    return
  }

  track('edit_element_click', { element_type: el.type })
  editorStore.selectedElement = idx

  if (el.type === 'image') {
    chooseLocalImage(idx)
  } else if (el.type === 'text') {
    editorStore.editingText = el.text
    editorStore.showTextEditor = true
  }
}

function chooseLocalImage(idx: number) {
  const applyImage = async (tempPath: string) => {
    uni.showLoading({ title: '上传中...' })
    try {
      const permanentUrl = await uploadImage(tempPath)
      editorStore.applyImageToElement(idx, permanentUrl)
      renderedImageStale.value = true
    } catch (e) {
      // 上传失败时回退到临时路径（至少当前会话可用）
      console.warn('图片上传失败，使用临时路径:', e)
      editorStore.applyImageToElement(idx, tempPath)
      renderedImageStale.value = true
      uni.showToast({ title: '图片上传失败，已使用本地图片', icon: 'none' })
    } finally {
      uni.hideLoading()
    }
  }
  // #ifdef MP-WEIXIN
  uni.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sourceType: ['album', 'camera'],
    success: (res: any) => {
      if (res.tempFiles && res.tempFiles.length > 0) {
        applyImage(res.tempFiles[0].tempFilePath)
      }
    },
    fail: () => {
      uni.showToast({ title: '图片选择失败', icon: 'none' })
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
        applyImage(res.tempFilePaths[0])
      }
    },
    fail: () => {
      uni.showToast({ title: '图片选择失败', icon: 'none' })
    },
  })
  // #endif
}

// 表单快照（取消时回滚）
let formSnapshot: any = null

// 打开统一编辑表单
function openUnifiedEdit() {
  // 保存快照用于取消回滚
  formSnapshot = JSON.parse(JSON.stringify({
    basicInfo: templateStore.basicInfo,
    elements: editorStore.editableElements,
    pageSections: editorStore.pageSections,
    flipPages: editorStore.flipPages,
    templateData: templateStore.templateData,
    _stale: renderedImageStale.value,
  }))
  editorStore.showBasicInfoEditor = true
}

// 编辑选中文字元素
function handleEditText() {
  if (editorStore.selectedElement === null) {
    uni.showToast({ title: '请先点击画布上的文字', icon: 'none' })
    return
  }
  const el = editorStore.editableElements[editorStore.selectedElement]
  if (!el || el.type !== 'text') {
    uni.showToast({ title: '请选择文字元素', icon: 'none' })
    return
  }
  editorStore.editingText = el.text
  editorStore.showTextEditor = true
}

// 替换选中图片元素
function handleReplaceImage() {
  if (editorStore.selectedElement === null) {
    uni.showToast({ title: '请先点击画布上的图片', icon: 'none' })
    return
  }
  const el = editorStore.editableElements[editorStore.selectedElement]
  if (!el || el.type !== 'image') {
    uni.showToast({ title: '请选择图片元素', icon: 'none' })
    return
  }
  chooseLocalImage(editorStore.selectedElement)
}

// 切换设置
function toggleSetting(key: string) {
  templateStore.toggleSetting(key)
}

const goBack = useGoBack()

function onImageError(e: any) {
  console.warn('Editor image load failed')
}

function handleMusic() {
  uni.navigateTo({ url: '/pages/music/index' })
}

// 更多操作：撤销/重做/设置/更换模板/导出
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
        toggleSetting(item.key)
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
        track('editor_change_template', {})
        uni.navigateTo({ url: '/pages/template/index?from=editor' })
      }
    },
  })
}

async function handleSave() {
  track('edit_save', { progress: editProgress.value })
  const editorData = {
    elements: JSON.parse(JSON.stringify(editorStore.editableElements)),
    pageSections: JSON.parse(JSON.stringify(editorStore.pageSections)),
    flipPages: JSON.parse(JSON.stringify(editorStore.flipPages)),
    background: JSON.parse(JSON.stringify(editorStore.background)),
    canvasSize: JSON.parse(JSON.stringify(editorStore.canvasSize)),
    templateType: editorStore.templateType,
    templateData: JSON.parse(JSON.stringify(templateStore.templateData)),
    basicInfo: JSON.parse(JSON.stringify(templateStore.basicInfo)),
    settings: JSON.parse(JSON.stringify(templateStore.settings)),
    currentFlipPageIndex: editorStore.currentFlipPageIndex,
  }
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
  uni.showToast({ title: '已保存', icon: 'success' })
}

function handleExport() {
  track('click_export')
  if (userStore.isVip()) {
    doExport({ watermark: false, quality: 'high' })
  } else {
    uni.showActionSheet({
      title: '选择导出方式',
      itemList: ['📦 高清无水印导出（3元）', '📦 免费导出（带水印）'],
      success: (res: any) => {
        if (res.tapIndex === 0) {
          track('click_export', { export_type: 'paid' })
          uni.showModal({
            title: '高清导出',
            content: '支付 3 元即可高清无水印导出',
            confirmText: '立即支付',
            success: (r) => {
              if (r.confirm) {
                uni.showToast({ title: '微信支付功能开发中', icon: 'none' })
              }
            }
          })
        } else {
          track('click_export', { export_type: 'free' })
          doExport({ watermark: true, quality: 'normal' })
        }
      }
    })
  }
}

async function doExport(options: { watermark: boolean; quality: string }) {
  if (!editorStore.currentWorkId) {
    const confirmed = await new Promise<boolean>((resolve) => {
      uni.showModal({
        title: '提示',
        content: '请先保存作品再导出',
        confirmText: '去保存',
        success: (res) => resolve(res.confirm || false),
      })
    })
    if (confirmed) {
      await handleSave()
      // 保存成功后自动重试一次导出（防止无限递归）
      if (editorStore.currentWorkId) {
        return doExport(options)
      }
      // 保存后仍无 workId，提示用户
      uni.showToast({ title: '保存失败，请重试', icon: 'none' })
    }
    return
  }
  uni.showLoading({ title: '导出中...' })
  try {
    const res = await exportInvitation(editorStore.currentWorkId, options)
    uni.hideLoading()
    // 下载并保存到相册，处理可能的失败
    uni.downloadFile({
      url: res.url,
      success: (r) => {
        uni.saveImageToPhotosAlbum({
          filePath: r.tempFilePath,
          success: () => {
            uni.showToast({ title: options.watermark ? '已导出（带水印）' : '高清导出成功', icon: 'success' })
          },
          fail: (err) => {
            // 用户可能未授权相册权限
            if (err.errMsg?.includes('auth')) {
              uni.showModal({
                title: '提示',
                content: '需要相册权限才能保存图片，请在设置中开启',
                confirmText: '去设置',
                success: (res) => {
                  if (res.confirm) uni.openSetting({})
                },
              })
            } else {
              uni.showToast({ title: '保存到相册失败', icon: 'none' })
            }
          },
        })
      },
      fail: () => {
        uni.showToast({ title: '下载文件失败', icon: 'none' })
      },
    })
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: '导出失败', icon: 'none' })
  }
}

async function handleShare() {
  await handleSave()
  const templateId = editorStore.currentTemplateId
  if (templateId) {
    uni.navigateTo({ url: `/pages/share/index?templateId=${templateId}` })
  } else {
    uni.navigateTo({ url: '/pages/share/index' })
  }
}

function handleLocation() {
  uni.chooseLocation({
    success: (res) => {
      templateStore.basicInfo.location = res.name
      templateStore.basicInfo.detailAddress = res.address
      // 同步到所有模式中 dataKey 为 location/address 的元素
      editorStore.syncSmartField('location', res.name)
      editorStore.syncSmartField('address', res.address)
      renderedImageStale.value = true
    }
  })
}

// 查找作品：优先从 store，回退到本地存储
function findWork(workId: string): Work | undefined {
  const fromStore = worksStore.works.find(w => w.id === workId) || worksStore.drafts.find(w => w.id === workId)
  if (fromStore) return fromStore
  try {
    const saved = uni.getStorageSync('hunbei_works')
    if (saved) {
      const all = [...(saved.works || []), ...(saved.drafts || [])]
      return all.find((w: Work) => w.id === workId)
    }
  } catch (e) { /* ignore */ }
  return undefined
}

onMounted(async () => {
  editStartTime.value = Date.now()
  const pages = getCurrentPages()
  const curPage = pages[pages.length - 1] as any
  const options = curPage?.options || {}

  const workId = options.workId
  if (workId) {
    const work = findWork(workId)
    if (work) {
      editorStore.setCurrentWorkId(work.id)
      const templateId = work.templateType || options.templateId || options.id
      // 有作品数据时，先加载模板获取基础结构，再用作品数据覆盖
      if (templateId) {
        await editorStore.loadTemplateById(templateId)
      }
      if (work.data) {
        // 恢复作品数据，并恢复音乐选择
        editorStore.restoreFromWorkData(work.data, work.musicId)
      }
      track('edit_start', { template_id: templateId, work_id: workId })
    } else {
      await editorStore.restoreTemplate()
      track('edit_start', { template_id: editorStore.currentTemplateId })
    }
  } else {
    const templateId = options.templateId || options.id
    if (templateId) {
      await editorStore.loadTemplateById(templateId)
      track('edit_start', { template_id: templateId })
    } else {
      await editorStore.restoreTemplate()
      track('edit_start', { template_id: editorStore.currentTemplateId })
    }
  }

  nextTick(() => {
    _mountTimers.push(setTimeout(() => updateCardSize(), 100))
  })
})

watch(isLandscape, () => {
  nextTick(() => updateCardSize())
})

watch(() => editorStore.templateLoading, (loading) => {
  if (!loading) {
    nextTick(() => {
      _mountTimers.push(setTimeout(() => updateCardSize(), 100))
      // 根据模板类型加载对应模式的元素字体
      if (editorStore.templateType === 'flip') {
        editorStore.flipPages.forEach(p => loadFontsForElements(p.elements as any))
      } else if (editorStore.templateType === 'page') {
        loadFontsForElements(editorStore.pageSections as any)
      } else {
        loadFontsForElements(editorStore.editableElements as any)
      }
    })
  }
})

watch(() => editorStore.editableElements.length, () => {
  nextTick(() => updateCardSize())
})

watch(() => editorStore.editableElements.length, () => {
  editProgress.value = calculateProgress()
})

// 组件卸载时清理定时器，防止内存泄漏
onUnmounted(() => {
  if (smartEditTimer) clearTimeout(smartEditTimer)
  _mountTimers.forEach(t => clearTimeout(t))
  _mountTimers = []
})
</script>

<style lang="scss" scoped>
.editor-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #fdf6f8 0%, #fef9fa 100%);
}

/* Header */
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

.header-right {
  width: 72rpx;
}

/* Body */
.editor-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.editor-body--page {
  flex-direction: column;
}

/* Preview Area - 全屏宽度 */
.preview-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 0;
  overflow: hidden;
  min-height: 0;
  min-width: 0;
}

.preview-scroll {
  flex: 1;
  height: 100%;
  min-height: 0;
}

.preview-card {
  display: flex;
  flex-direction: column;
  padding: 16rpx;
  gap: 20rpx;
}

/* ===== 画布模式 ===== */
.rendered-image-container {
  position: relative;
  width: 100%;
}

.rendered-image {
  width: 100%;
  display: block;
}

.rendered-overlay-element {
  position: absolute;
  z-index: 10;
}

.rendered-overlay-element--active {
  outline: 4rpx solid #e84a6e;
  outline-offset: -4rpx;
}

.rendered-overlay-element--no-click {
  pointer-events: none;
}

.preview-card--canvas {
  display: block;
  padding: 0;
  gap: 0;
  position: relative;
  border-radius: 0;
  overflow: hidden;
  margin: 0;
}

.empty-template-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 40rpx;
  gap: 20rpx;
}

.empty-hint-icon-wrap {
  width: 120rpx;
  height: 120rpx;
  background: linear-gradient(135deg, #f0f0f5 0%, #e8e8f0 100%);
  border-radius: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx;
}

.empty-hint-icon {
  font-size: 60rpx;
}

.empty-hint-text {
  font-size: 32rpx;
  color: #6e6e80;
  font-weight: 600;
}

.empty-hint-sub {
  font-size: 26rpx;
  color: #a8a8b4;
}

.canvas-element {
  overflow: hidden;
}
.canvas-element.text-element {
  overflow: hidden;
}

.canvas-image {
  width: 100%;
  height: 100%;
  display: block;
}

.canvas-text {
  display: block;
  word-break: break-word;
}

.non-editable {
  cursor: default;
  opacity: 1;
}

.canvas-element--no-interact {
  pointer-events: none;
}

.active-element {
  outline: 4rpx solid #e84a6e;
  outline-offset: -4rpx;
}

/* 缩放手柄（元素右下角） */
.resize-handle {
  position: absolute;
  right: -14rpx;
  bottom: -14rpx;
  width: 28rpx;
  height: 28rpx;
  background: #fff;
  border: 4rpx solid #e84a6e;
  border-radius: 50%;
  z-index: 30;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
}

/* 横屏模式布局 */
.editor-body--landscape {
  flex-direction: column;
  gap: 0;
  padding: 0;
}

.preview-area--landscape {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fdf6f8 0%, #fef9fa 100%);
  padding: 20rpx 16rpx;
  min-height: 0;
}

/* ===== 底部工具栏 ===== */
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

/* 上下文工具栏 */
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

/* 底部主区域 */
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

/* ===== Loading 骨架屏 ===== */
.loading-overlay {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fdf6f8;
  padding: 32rpx;
}

.skeleton-card {
  width: 100%;
  max-width: 600rpx;
}

.skeleton-img {
  width: 100%;
  height: 400rpx;
  border-radius: 20rpx;
  margin-bottom: 24rpx;
}

.skeleton-line {
  height: 32rpx;
  border-radius: 8rpx;
  margin-bottom: 16rpx;
}

.skeleton-pulse {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-pulse 1.4s ease-in-out infinite;
}

@keyframes skeleton-pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.loading-overlay-text {
  font-size: 28rpx;
  color: #999;
}
</style>
