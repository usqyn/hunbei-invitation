<template>
  <view class="editor-page">
    <!-- 自动保存提示条 -->
    <view v-if="autoSaveToast" class="autosave-toast">
      <text class="autosave-icon">✓</text>
      <text class="autosave-text">已自动保存</text>
    </view>
    <!-- Header -->
    <view class="editor-header animate-slide-down-fade">
      <view class="header-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <view class="header-center">
        <text class="header-title">{{ templateStore.templateData?.coverTitle || '编辑器' }}</text>
        <view class="ai-badge">
          <text class="ai-badge-icon">✨</text>
          <text class="ai-badge-text">AI 智能填充</text>
        </view>
      </view>
      <view class="header-right"></view>
    </view>

    <!-- 加载错误状态 -->
    <view v-if="loadError" class="load-error-overlay">
      <view class="load-error-content">
        <text class="load-error-icon">⚠️</text>
        <text class="load-error-text">加载失败，请重试</text>
        <view class="load-error-retry-btn" @click="retryLoad">
          <text class="load-error-retry-text">重试</text>
        </view>
      </view>
    </view>

    <!-- Body: 根据模板类型渲染不同编辑界面 -->
    <view v-if="editorStore.templateLoading" class="loading-overlay">
      <view class="loading-content">
        <view class="loading-decor loading-decor-1">💌</view>
        <view class="loading-decor loading-decor-2">💕</view>
        <view class="loading-decor loading-decor-3">🌸</view>
        <view class="skeleton-card">
          <view class="skeleton-img skeleton-shimmer"></view>
          <view class="skeleton-line skeleton-shimmer" style="width: 60%"></view>
          <view class="skeleton-line skeleton-shimmer" style="width: 40%"></view>
          <view class="skeleton-line skeleton-shimmer" style="width: 70%"></view>
        </view>
        <view class="loading-text-wrap">
          <text class="loading-text">正在加载模板...</text>
          <view class="loading-dots">
            <text class="loading-dot"></text>
            <text class="loading-dot"></text>
            <text class="loading-dot"></text>
          </view>
        </view>
      </view>
    </view>
    <view v-else-if="editorStore.templateType === 'page'" class="editor-body editor-body--page">
      <PageEditor />
    </view>
    <view v-else-if="editorStore.templateType === 'flip'" class="editor-body editor-body--flip">
      <FlipEditor />
    </view>
    <view v-else class="editor-body" :class="{ 'editor-body--landscape': isLandscape }">
      <!-- 首次编辑引导提示 -->
      <view v-if="showEditHint" class="edit-hint-bubble animate-fade-in" @click="dismissEditHint">
        <text class="edit-hint-icon">👆</text>
        <text class="edit-hint-text">点击文字或图片进行编辑</text>
      </view>
      <!-- 画布模式：全屏画布（去除右侧面板，最大化预览区） -->
      <view class="preview-area" :class="{ 'preview-area--landscape': isLandscape }">
        <scroll-view class="preview-scroll" scroll-y>
          <view class="preview-scroll__inner">
          <!-- 有 renderedImage 且未过期：图片渲染 + 透明交互层 -->
          <template v-if="editorStore.renderedImage && !renderedImageStale">
            <view class="rendered-image-container animate-fade-in-scale">
              <CloudImage
                class="rendered-image"
                :src="editorStore.renderedImage"
                mode="widthFix"
                custom-class="rendered-image"
                @load="onRenderedImageLoad"
                @error="onRenderedImageError"
              />
              <view
                v-for="(el, idx) in editorStore.editableElements" :key="el.id || ('el-' + idx)"
                class="rendered-overlay-element"
                :class="{
                  'rendered-overlay-element--active': editorStore.selectedElement === idx,
                  'rendered-overlay-element--no-click': el.editable === false,
                  'canvas-element--dragging': dragging
                }"
                :style="getOverlayElementStyle(el)"
                @touchstart="el.editable === false ? null : onElementTouchStart(idx, $event)"
                @touchmove.stop.prevent="onElementTouchMove"
                @touchend="onElementTouchEnd"
                @click="el.editable === false ? null : onElementTap(idx)"
                @longpress="el.editable === false ? null : onElementLongPress(idx)"
              >
                <!-- 缩放手柄（选中时显示） -->
                <view
                  v-if="editorStore.selectedElement === idx && el.editable !== false"
                  class="resize-handle resize-handle--active"
                  @touchstart.stop="onResizeHandleTouchStart"
                  @touchmove.stop.prevent="onResizeHandleTouchMove"
                  @touchend.stop="onResizeHandleTouchEnd"
                ></view>
                <!-- 旋转手柄（选中时显示，参考 image-cropper 顶部旋转柄设计） -->
                <view
                  v-if="editorStore.selectedElement === idx && el.editable !== false"
                  class="rotate-handle rotate-handle--active"
                  @touchstart.stop="onRotateHandleTouchStart"
                  @touchmove.stop.prevent="onRotateHandleTouchMove"
                  @touchend.stop="onRotateHandleTouchEnd"
                >
                  <view class="rotate-handle-line"></view>
                  <view class="rotate-handle-dot">↻</view>
                </view>
              </view>
            </view>
          </template>
          <!-- 无 renderedImage：回退到百分比定位渲染 -->
          <template v-else>
            <view v-if="editorStore.editableElements.length === 0" class="empty-template-hint animate-fade-in-scale">
              <view class="empty-hint-icon-wrap animate-float">
                <text class="empty-hint-icon">📋</text>
              </view>
              <text class="empty-hint-text">模板内容为空</text>
              <text class="empty-hint-sub">请尝试更换其他模板</text>
              <view class="empty-hint-decoration">
                <text class="empty-decor-dot"></text>
                <text class="empty-decor-dot"></text>
                <text class="empty-decor-dot"></text>
              </view>
            </view>
            <view v-else class="preview-card preview-card--canvas animate-fade-in-scale" :style="[canvasCardStyle, canvasBackgroundStyle]">
              <view
                v-for="(el, idx) in editorStore.editableElements" :key="el.id || ('el-' + idx)"
                class="canvas-element"
                :class="{
                  'active-element': editorStore.selectedElement === idx,
                  'text-element': el.type === 'text',
                  'non-editable': el.editable === false,
                  'canvas-element--no-interact': el.editable === false,
                  'canvas-element--dragging': dragging
                }"
                :style="canvasElementStyle(el)"
                @touchstart="el.editable === false ? null : onElementTouchStart(idx, $event)"
                @touchmove.stop.prevent="onElementTouchMove"
                @touchend="onElementTouchEnd"
                @click="el.editable === false ? null : onElementTap(idx)"
                @longpress="el.editable === false ? null : onElementLongPress(idx)"
              >
                <CloudImage
                  v-if="el.type === 'image'"
                  class="canvas-image"
                  custom-class="canvas-image"
                  :style="canvasImageFillStyle"
                  :custom-style="canvasImageFillStyle"
                  :src="el.text"
                  :mode="imageMode(el)"
                  :fade-show="false"
                  @error="onImageError"
                />
                <text
                  v-else-if="el.type === 'text'"
                  class="canvas-text"
                  :style="textElementStyle(el)"
                  user-select
                >{{ bidiText(resolveText(el.text)) }}</text>
                <!-- 贴纸：作为图片渲染（admin 序列化器已把 sticker 转为 image） -->
                <CloudImage
                  v-else-if="el.type === 'sticker'"
                  class="canvas-image canvas-sticker"
                  custom-class="canvas-image canvas-sticker"
                  :style="canvasImageFillStyle"
                  :custom-style="canvasImageFillStyle"
                  :src="el.text"
                  mode="aspectFit"
                  :fade-show="false"
                  @error="onImageError"
                />
                <!-- 形状：用 view 渲染纯色/渐变矩形/圆形 -->
                <view
                  v-else-if="el.type === 'shape'"
                  class="canvas-shape"
                  :style="shapeElementStyle(el)"
                ></view>
                <!-- 分组：递归渲染子元素（group 的 children 在 el.text 中以 JSON 存储不太合理，
                     这里作为占位容器，实际分组元素在 admin 序列化时已展开为顶层元素） -->
                <view
                  v-else-if="el.type === 'group'"
                  class="canvas-group"
                ></view>
                <!-- basic：兜底按文本渲染 -->
                <text
                  v-else
                  class="canvas-text"
                  :style="textElementStyle(el)"
                  user-select
                >{{ bidiText(resolveText(el.text)) }}</text>
                <!-- 缩放手柄（选中时显示） -->
                <view
                  v-if="editorStore.selectedElement === idx && el.editable !== false"
                  class="resize-handle resize-handle--active"
                  @touchstart.stop="onResizeHandleTouchStart"
                  @touchmove.stop.prevent="onResizeHandleTouchMove"
                  @touchend.stop="onResizeHandleTouchEnd"
                ></view>
                <!-- 旋转手柄（选中时显示） -->
                <view
                  v-if="editorStore.selectedElement === idx && el.editable !== false"
                  class="rotate-handle rotate-handle--active"
                  @touchstart.stop="onRotateHandleTouchStart"
                  @touchmove.stop.prevent="onRotateHandleTouchMove"
                  @touchend.stop="onRotateHandleTouchEnd"
                >
                  <view class="rotate-handle-line"></view>
                  <view class="rotate-handle-dot">↻</view>
                </view>
              </view>
            </view>
          </template>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 底部工具栏：上下文工具栏 + 5 Tab + 操作按钮 -->
    <view class="editor-footer">
      <!-- 上下文工具栏：选中元素时显示快捷操作 -->
      <view v-if="editorStore.selectedElement !== null" class="context-toolbar context-toolbar--glass">
        <view class="ctx-btn" @click="handleEditText">
          <text class="ctx-icon ctx-icon--bounce">✏️</text>
          <text class="ctx-label">编辑</text>
        </view>
        <view class="ctx-divider"></view>
        <view v-if="selectedElType === 'image'" class="ctx-btn" @click="handleReplaceImage">
          <text class="ctx-icon ctx-icon--bounce">🖼️</text>
          <text class="ctx-label">换图</text>
        </view>
        <view v-if="selectedElType === 'image'" class="ctx-divider"></view>
        <view v-if="selectedElType === 'image'" class="ctx-btn" @click="showImagePanel = true">
          <text class="ctx-icon ctx-icon--bounce">⚙️</text>
          <text class="ctx-label">调整</text>
        </view>
        <view v-if="selectedElType === 'image'" class="ctx-divider"></view>
        <view v-if="selectedElType === 'text' || selectedElType === 'basic'" class="ctx-btn" @click="showTextStylePanel = true">
          <text class="ctx-icon ctx-icon--bounce">🎨</text>
          <text class="ctx-label">样式</text>
        </view>
        <view v-if="selectedElType === 'text' || selectedElType === 'basic'" class="ctx-divider"></view>
        <view class="ctx-btn ctx-btn--danger" @click="deselectElement">
          <text class="ctx-icon ctx-icon--bounce">✕</text>
          <text class="ctx-label">取消</text>
        </view>
      </view>
      <!-- 常驻快捷操作栏：撤销/重做/重置（始终可见） -->
      <view class="quick-toolbar">
        <view class="quick-btn" :class="{ 'quick-btn--disabled': !editorStore.canUndo }" @click="handleUndo">
          <text class="quick-icon">↩</text>
        </view>
        <view class="quick-btn" :class="{ 'quick-btn--disabled': !editorStore.canRedo }" @click="handleRedo">
          <text class="quick-icon">↪</text>
        </view>
        <view class="quick-divider"></view>
        <view class="quick-btn" :class="{ 'quick-btn--disabled': !editorStore.canReset }" @click="handleReset">
          <text class="quick-icon">↺</text>
          <text class="quick-label">重置</text>
        </view>
        <view class="quick-divider"></view>
        <view class="quick-btn quick-btn--watermark" @click="handleRemoveWatermark">
          <text class="quick-icon">👑</text>
          <text class="quick-label">去水印</text>
        </view>
      </view>
      <!-- 底部 Tab + 操作区 -->
      <view class="footer-main footer-stagger-anim">
        <view class="footer-tabs">
          <view class="footer-tab footer-tab--item" @click="openUnifiedEdit">
            <text class="tab-icon tab-icon--hover">📋</text>
            <text class="tab-label">信息</text>
          </view>
          <view class="footer-tab footer-tab--item" @click="handleEditText">
            <text class="tab-icon tab-icon--hover">✏️</text>
            <text class="tab-label">文字</text>
          </view>
          <view class="footer-tab footer-tab--item" @click="handleReplaceImage">
            <text class="tab-icon tab-icon--hover">🖼️</text>
            <text class="tab-label">图片</text>
          </view>
          <view class="footer-tab footer-tab--item" @click="handleMusic">
            <text class="tab-icon tab-icon--hover">🎵</text>
            <text class="tab-label">音乐</text>
          </view>
          <view class="footer-tab footer-tab--item" @click="handleMore">
            <text class="tab-icon tab-icon--hover">⋯</text>
            <text class="tab-label">更多</text>
          </view>
        </view>
        <view class="footer-actions">
          <view
            class="footer-action-btn footer-save-btn footer-save-btn--enhanced"
            :class="{ 'btn--loading': savingLoading }"
            @click="handleSave"
          >
            <view v-if="savingLoading" class="btn-spinner-wrap">
              <view class="btn-spinner"></view>
              <text class="action-btn-text">保存中</text>
            </view>
            <view v-else class="save-btn-content">
              <view class="save-status-dot" :class="hasUnsavedChanges ? 'save-status-dot--unsaved' : 'save-status-dot--saved'"></view>
              <text class="action-btn-text">保存</text>
            </view>
          </view>
          <view
            class="footer-action-btn footer-share-btn footer-share-btn--enhanced"
            :class="{ 'btn--loading': sharingLoading }"
            @click="handleShare"
          >
            <view v-if="sharingLoading" class="btn-spinner-wrap">
              <view class="btn-spinner"></view>
              <text class="action-btn-text">准备中</text>
            </view>
            <text v-else class="action-btn-text">预览分享</text>
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

    <!-- Unified Edit Form（合并基本信息 + 快捷填写）
         仅 canvas 模式在此渲染；page/flip 模式由各自组件内部渲染自己的实例 -->
    <UnifiedEditForm
      v-if="editorStore.showBasicInfoEditor && editorStore.templateType === 'canvas'"
      :visible="editorStore.showBasicInfoEditor"
      :basic-info="basicInfo"
      :elements="editorStore.editableElements"
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
      :element="selectedImageElement"
      @close="showImagePanel = false"
      @update="onImagePropUpdate"
      @preview="onImagePropPreview"
      @reset="onImagePropReset"
    />

    <!-- 文字样式面板 -->
    <TextStylePanel
      :visible="showTextStylePanel"
      :element="selectedTextElement"
      @close="showTextStylePanel = false"
      @update="onTextStyleUpdate"
      @preview="onTextStylePreview"
      @reset="onTextStyleReset"
    />

    <!-- 导出完成推荐弹层：保存相册后展示商品推荐，3 秒后自动关闭并提示 -->
    <view v-if="showRecommendModal" class="recommend-mask" @click="closeRecommendModal">
      <view class="recommend-panel" @click.stop>
        <view class="recommend-header">
          <text class="recommend-title">🎉 导出成功，已保存到相册</text>
          <text class="recommend-sub">搭配好物推荐</text>
        </view>
        <scroll-view class="recommend-list" scroll-x :show-scrollbar="false">
          <view
            v-for="p in recommendProducts"
            :key="p.id"
            class="recommend-item"
            @click="goToProduct(p)"
          >
            <CloudImage class="recommend-img" :src="p.image || p.cover || ''" mode="aspectFill" custom-class="recommend-img" />
            <text class="recommend-name">{{ p.name || p.title || '推荐好物' }}</text>
            <text class="recommend-price">¥{{ p.price || 0 }}</text>
          </view>
        </scroll-view>
        <view class="recommend-close" @click="closeRecommendModal">
          <text class="recommend-close-text">我知道了</text>
        </view>
      </view>
    </view>

  </view>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useTemplateStore } from '@/stores/template'
import { useEditorStore } from '@/stores/editor'
import { useWorksStore } from '@/stores/works'
import { useUserStore, VIP_LIMITS } from '@/stores/user'
import { loadFontsForElements, formatBiDi } from '@/utils/font-loader'
import { RTL_CHAR_REGEX } from '@/constants/editor'
import { track } from '@/utils/track'
import { resolveTextPlaceholders, extractTokenKeys } from '@/utils/resolveTextPlaceholders'
import { useCanvasRender } from '@/composables/useCanvasRender'
import { usePinchGesture } from './composables/usePinchGesture'
import { useFrameThrottle } from './composables/useFrameThrottle'
import { useGoBack } from '@/composables/useGoBack'
import { useFeedback } from '@/composables/useFeedback'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { exportInvitation, uploadImage, consumeTemplateQuota, fetchTemplateQuota, fetchRecommendProducts } from '@/api'
import { showRewardedAd } from '@/utils/rewarded-ad'
import PageEditor from './components/PageEditor.vue'
import FlipEditor from './components/FlipEditor.vue'
import TextEditorPopup from './components/TextEditorPopup.vue'
import UnifiedEditForm from './components/UnifiedEditForm.vue'
import ImagePropertyPanel from './components/ImagePropertyPanel.vue'
import TextStylePanel from './components/TextStylePanel.vue'
import CloudImage from '@/components/CloudImage.vue'
import type { EditableElement, Work } from '@/types'

const templateStore = useTemplateStore()
const editorStore = useEditorStore()
const worksStore = useWorksStore()
const userStore = useUserStore()

const { haptic, feedbackSuccess, feedbackError, feedbackWarning } = useFeedback()
const { loading: savingLoading, run: runSave } = useAsyncAction()
const { loading: sharingLoading, run: runShare } = useAsyncAction()

const {
  isCanvasMode,
  isLandscape,
  canvasCardStyle,
  canvasBackgroundStyle,
  updateCardHeight,
  getCanvasElementStyle,
  getTextStyle,
  getShapeStyle,
  resolveImageMode,
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

// 本地包装函数：模板中直接引用「解构自 useCanvasRender 的函数」时，
// Vue 编译器会生成 e.unref(D)(t) 调用模式，微信开发者工具转译该模式会
// 引用错乱，导致 "e.unref(...) is not a function" 运行时错误。
// 函数声明形式编译器可静态识别为非 ref，生成直接调用，跨端可靠。
function canvasElementStyle(el: EditableElement): Record<string, string> {
  return getCanvasElementStyle(el)
}

// 画布图片内联填充样式：同时作用于 <CloudImage> 宿主节点（:style）与内层 <image>（custom-style）。
// mp-weixin 自定义组件默认样式隔离（isolated），页面 scoped class 无法作用到组件内部节点，
// 内层 <image> 无尺寸时按默认 320×240 + scaleToFill 渲染 → 图片被拉长、位置偏移（iOS 必现）。
const canvasImageFillStyle = 'position:absolute;left:0;top:0;width:100%;height:100%'
function textElementStyle(el: EditableElement): Record<string, string> {
  return getTextStyle(el)
}
function shapeElementStyle(el: EditableElement): Record<string, string> {
  return getShapeStyle(el)
}
function imageMode(el: EditableElement): string {
  return resolveImageMode(el)
}
function bidiText(text: string): string {
  return formatBiDi(text)
}

// 交互层元素定位：基于 renderedImage 实际显示尺寸，将 Admin px 值转为百分比
function getOverlayElementStyle(el: EditableElement): Record<string, string> {
  if (el.x == null || el.y == null || el.width == null || el.height == null) return {}
  const cw = editorStore.canvasSize?.width || 375
  const ch = editorStore.canvasSize?.height || 667
  const style: Record<string, string> = {
    position: 'absolute',
    left: `${(el.x / cw) * 100}%`,
    top: `${(el.y / ch) * 100}%`,
    width: `${(el.width / cw) * 100}%`,
    height: `${(el.height / ch) * 100}%`,
    opacity: String(el.opacity ?? 1),
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

// 标记 renderedImage 已过期（用户编辑后需要重新渲染）
const renderedImageStale = ref(false)
// 标记是否有未保存的更改（用于自动保存）
const hasUnsavedChanges = ref(false)
// 加载错误状态
const loadError = ref(false)
// 自动保存定时器
let autoSaveTimer: ReturnType<typeof setInterval> | null = null
// 自动保存提示
const autoSaveToast = ref(false)

// 首次编辑引导提示
const showEditHint = ref(false)
let editHintTimer: ReturnType<typeof setTimeout> | null = null

function tryShowEditHint() {
  try {
    const shown = uni.getStorageSync('editor_hint_shown')
    if (!shown) {
      showEditHint.value = true
      editHintTimer = setTimeout(() => {
        showEditHint.value = false
      }, 5000)
    }
  } catch {
    showEditHint.value = true
    editHintTimer = setTimeout(() => {
      showEditHint.value = false
    }, 5000)
  }
}

function dismissEditHint() {
  showEditHint.value = false
  if (editHintTimer) {
    clearTimeout(editHintTimer)
    editHintTimer = null
  }
  try {
    uni.setStorageSync('editor_hint_shown', true)
  } catch {
    // ignore
  }
}

// 图片属性面板显示控制
const showImagePanel = ref(false)
// 文字样式面板显示控制
const showTextStylePanel = ref(false)
// 文字样式防抖定时器
let textStyleTimer: ReturnType<typeof setTimeout> | null = null

// 收集模板中所有元素的 dataKey（跨 canvas/page/flip 三种模式），用于 UnifiedEditForm 按需显示字段
const allTemplateDataKeys = computed(() => {
  const keys = new Set<string>()
  editorStore.editableElements.forEach(el => { if (el.dataKey) keys.add(el.dataKey) })
  editorStore.pageSections.forEach(sec => { if (sec.dataKey) keys.add(sec.dataKey) })
  editorStore.flipPages.forEach(page => {
    (page.elements || []).forEach(el => { if (el.dataKey) keys.add(el.dataKey) })
  })
  // 新增：占位符 token 收集（token 化元素无 dataKey，扫描文本补齐表单字段）
  ;[
    ...editorStore.editableElements,
    ...editorStore.pageSections,
    ...editorStore.flipPages.flatMap(page => page.elements || []),
  ].forEach(el => {
    extractTokenKeys((el as { text?: string }).text || '').forEach(k => keys.add(k))
  })
  return Array.from(keys)
})

// 当前选中的图片元素（用于 ImagePropertyPanel）
const selectedImageElement = computed(() => {
  if (editorStore.selectedElement === null) return null
  const el = editorStore.editableElements[editorStore.selectedElement]
  if (!el || el.type !== 'image') return null
  return el
})

// 当前选中的文字元素（用于 TextStylePanel）
const selectedTextElement = computed(() => {
  if (editorStore.selectedElement === null) return null
  const el = editorStore.editableElements[editorStore.selectedElement]
  if (!el || (el.type !== 'text' && el.type !== 'basic')) return null
  return el
})

// 编辑文本后标记过期
function onTextEditorConfirm() {
  editorStore.confirmTextEdit()
  renderedImageStale.value = true
  hasUnsavedChanges.value = true
}

// 统一表单确认：同步到可编辑元素，标记过期
function onUnifiedEditConfirm() {
  editorStore.syncBasicInfoToElements()
  editorStore.closeBasicInfoEditor()
  formSnapshot = null
  renderedImageStale.value = true
  hasUnsavedChanges.value = true
}

// 统一表单取消：回滚到打开前的状态
function onUnifiedEditCancel() {
  if (formSnapshot) {
    Object.assign(templateStore.basicInfo, formSnapshot.basicInfo)
    Object.assign(templateStore.templateData, formSnapshot.templateData)
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
// updateCardSize 节流定时器
let _sizeTimer: ReturnType<typeof setTimeout> | null = null
// 跟踪 onMounted 与 templateLoading watcher 中的 setTimeout，卸载时统一清理
let _mountTimers: ReturnType<typeof setTimeout>[] = []
function onSmartFieldUpdate(key: string, value: string) {
  editorStore.syncSmartField(key, value)
  editorStore.syncTokenToAllModes(key, value)
  renderedImageStale.value = true
  hasUnsavedChanges.value = true
  // 输入阿拉伯文时触发字体加载
  if (RTL_CHAR_REGEX.test(value)) {
    loadFontsForElements([{ type: 'text', text: value }])
  }
  if (smartEditTimer) clearTimeout(smartEditTimer)
  smartEditTimer = setTimeout(() => {
    editorStore.pushHistory()
    smartEditTimer = null
  }, 800)
}

// ============ 元素拖拽 / 缩放（touch 事件） ============
const canvasDisplayRect = ref({ width: 0, height: 0, left: 0, top: 0 })

function updateCanvasDisplayRect() {
  const query = uni.createSelectorQuery()
  query
    .select('.rendered-image-container, .preview-card--canvas')
    .boundingClientRect((rect: any) => {
      if (rect && rect.width > 0) {
        canvasDisplayRect.value = { width: rect.width, height: rect.height, left: rect.left || 0, top: rect.top || 0 }
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
// 拖拽中状态（用于添加视觉反馈）
const dragging = ref(false)
// 组件挂载状态标记，用于异步操作中判断组件是否已卸载
let _isMounted = true

// 双击检测：记录上次点击的元素索引和时间
let lastTapIdx: number | null = null
let lastTapTime = 0
const DOUBLE_TAP_INTERVAL = 350

function onElementTap(idx: number) {
  if (lastDragMoved) {
    lastDragMoved = false
    return
  }
  const now = Date.now()
  // 如果点击的是已选中的元素，且在双击间隔内，则打开编辑器
  if (editorStore.selectedElement === idx && lastTapIdx === idx && (now - lastTapTime) < DOUBLE_TAP_INTERVAL) {
    lastTapIdx = null
    lastTapTime = 0
    onOpenEditor(idx)
    return
  }
  // 第一次点击：仅选中元素，不打开编辑器
  editorStore.selectedElement = idx
  haptic('light')
  // 用户首次点击元素时关闭引导提示
  if (showEditHint.value) dismissEditHint()
  lastTapIdx = idx
  lastTapTime = now
}

function onElementLongPress(idx: number) {
  const el = editorStore.editableElements[idx]
  if (!el || el.editable === false) return
  editorStore.selectedElement = idx
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
          onOpenEditor(idx)
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
          editorStore.editableElements.splice(idx, 1)
          editorStore.selectedElement = null
          editorStore.pushHistory()
          renderedImageStale.value = true
          hasUnsavedChanges.value = true
        }
      }
    },
  })
}

function onElementTouchStart(idx: number, e: any) {
  const el = editorStore.editableElements[idx]
  if (!el || el.editable === false) return
  if (el.x == null || el.y == null) return
  editorStore.selectedElement = idx
  updateCanvasDisplayRect()
  // 双指落下：进入 pinch 模式（缩放 + 旋转），不进入单指 move 模式
  if (e.touches && e.touches.length === 2) {
    pinchState.startImageScale = el.imageScale ?? 1
    pinchState.startRotation = el.rotation ?? 0
    pinch.onTouchStart(e)
    return
  }
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

// 单指拖拽：原始逻辑用 useFrameThrottle 包一层做 16ms 节流（约 60fps）
// 双指手势不走节流（频率本来不高，节流反而会有卡顿感）
// touchend 时 flush 避免最后一帧丢失
const onElementDragMoveThrottled = useFrameThrottle((e: any) => {
  const ds = dragState.value
  if (!ds || ds.type !== 'move') return
  const touch = e.touches ? e.touches[0] : e
  const dx = touch.clientX - ds.startTouchX
  const dy = touch.clientY - ds.startTouchY
  if (!ds.moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return
  if (!ds.moved) {
    ds.moved = true
    dragging.value = true
    // 立即切到回退视图，避免 renderedImage 烘焙图与交互层不同步（"边框动图不动"）
    renderedImageStale.value = true
  }
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
})

function onElementTouchMove(e: any) {
  // 双指手势优先：当前正在 pinch 或本次 touchmove 是 2 指
  if (pinch.isActive() || (e.touches && e.touches.length === 2)) {
    renderedImageStale.value = true
    pinch.onTouchMove(e)
    return
  }
  // 单指拖拽走节流
  onElementDragMoveThrottled(e)
}

function onElementTouchEnd(e?: any) {
  // 双指手势结束
  if (pinch.isActive()) {
    pinch.onTouchEnd(e || {})
    return
  }
  // 单指拖拽结束：强制刷新最后一帧，避免丢帧
  onElementDragMoveThrottled.flush()
  const ds = dragState.value
  if (ds && ds.moved) {
    lastDragMoved = true
    editorStore.pushHistory()
    renderedImageStale.value = true
    hasUnsavedChanges.value = true
  }
  dragging.value = false
  dragState.value = null
}

// ===== 双指缩放 + 旋转手势 =====
const pinchState = { startImageScale: 1, startRotation: 0 }
const pinch = usePinchGesture({
  onStart: () => {
    dragging.value = true
  },
  onScale: ({ ratio, angleDelta }) => {
    const ds = dragState.value
    const idx = ds ? ds.elementIdx : editorStore.selectedElement
    if (idx == null) return
    const el = editorStore.editableElements[idx]
    if (!el) return
    // imageScale 限定 0.2~5
    let newScale = pinchState.startImageScale * ratio
    newScale = Math.max(0.2, Math.min(5, newScale))
    el.imageScale = newScale
    // rotation 累加角度增量，归一化到 -180~180
    let newRotation = (pinchState.startRotation + angleDelta) % 360
    if (newRotation > 180) newRotation -= 360
    if (newRotation < -180) newRotation += 360
    el.rotation = newRotation
  },
  onEnd: () => {
    editorStore.pushHistory()
    renderedImageStale.value = true
    hasUnsavedChanges.value = true
    dragging.value = false
    dragState.value = null
  },
})

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

// 缩放手柄拖拽：用 useFrameThrottle 做 16ms 节流（约 60fps）
// touchend 时 flush 避免最后一帧丢失
const onResizeHandleTouchMoveThrottled = useFrameThrottle((e: any) => {
  const ds = dragState.value
  if (!ds || ds.type !== 'scale') return
  const touch = e.touches ? e.touches[0] : e
  const dx = touch.clientX - ds.startTouchX
  const dy = touch.clientY - ds.startTouchY
  if (!ds.moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return
  if (!ds.moved) {
    ds.moved = true
    // 立即切到回退视图，避免烘焙图与交互层不同步
    renderedImageStale.value = true
  }
  const rect = canvasDisplayRect.value
  const scale = rect.width ? editorStore.canvasSize.width / rect.width : 1
  // 用对角线位移代替 Math.max(dx,dy)，避免负数域丢量，让缩放跟手
  // sign(dx+dy) 让向左上拖（缩小）也能正确产生负增量
  const deltaCanvas = Math.hypot(dx, dy) * Math.sign(dx + dy || 1) * scale
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
})

function onResizeHandleTouchMove(e: any) {
  onResizeHandleTouchMoveThrottled(e)
}

function onResizeHandleTouchEnd() {
  // 强制刷新最后一帧，避免丢帧
  onResizeHandleTouchMoveThrottled.flush()
  const ds = dragState.value
  if (ds && ds.type === 'scale' && ds.moved) {
    editorStore.pushHistory()
    renderedImageStale.value = true
    hasUnsavedChanges.value = true
  }
  dragState.value = null
}

// ===== 旋转手柄：单指旋转元素（参考 image-cropper / AlloyFinger 的 atan2 旋转算法） =====
// 算法：以元素几何中心为旋转锚点，用 atan2(touch - center) 计算角度增量
interface RotateState {
  elementIdx: number
  startAngle: number    // 起始触点相对元素中心的角度（度）
  startRotation: number // 元素起始 rotation 值
  moved: boolean
}
const rotateState = ref<RotateState | null>(null)
const ROTATE_THRESHOLD = 3

// 计算元素中心在屏幕坐标系中的位置
function getElementCenterScreen(el: any): { x: number; y: number } {
  const rect = canvasDisplayRect.value
  const scaleX = rect.width ? editorStore.canvasSize.width / rect.width : 1
  const scaleY = rect.height ? editorStore.canvasSize.height / rect.height : 1
  const centerCanvasX = (el.x || 0) + (el.width || 0) / 2
  const centerCanvasY = (el.y || 0) + (el.height || 0) / 2
  return {
    x: rect.left + centerCanvasX / scaleX,
    y: rect.top + centerCanvasY / scaleY,
  }
}

function onRotateHandleTouchStart(e: any) {
  if (editorStore.selectedElement === null) return
  const el = editorStore.editableElements[editorStore.selectedElement]
  if (!el) return
  updateCanvasDisplayRect()
  const touch = e.touches ? e.touches[0] : e
  const center = getElementCenterScreen(el)
  const startAngle = Math.atan2(touch.clientY - center.y, touch.clientX - center.x) * 180 / Math.PI
  rotateState.value = {
    elementIdx: editorStore.selectedElement,
    startAngle,
    startRotation: el.rotation ?? 0,
    moved: false,
  }
}

const onRotateHandleTouchMoveThrottled = useFrameThrottle((e: any) => {
  const rs = rotateState.value
  if (!rs) return
  const el = editorStore.editableElements[rs.elementIdx]
  if (!el) return
  const touch = e.touches ? e.touches[0] : e
  const center = getElementCenterScreen(el)
  const currentAngle = Math.atan2(touch.clientY - center.y, touch.clientX - center.x) * 180 / Math.PI
  let delta = currentAngle - rs.startAngle
  // 归一化到 -180~180
  while (delta > 180) delta -= 360
  while (delta < -180) delta += 360
  if (!rs.moved && Math.abs(delta) < ROTATE_THRESHOLD) return
  if (!rs.moved) {
    rs.moved = true
    renderedImageStale.value = true
  }
  let newRotation = rs.startRotation + delta
  // 归一化到 -180~180
  newRotation = newRotation % 360
  if (newRotation > 180) newRotation -= 360
  if (newRotation < -180) newRotation += 360
  el.rotation = newRotation
})

function onRotateHandleTouchMove(e: any) {
  onRotateHandleTouchMoveThrottled(e)
}

function onRotateHandleTouchEnd() {
  onRotateHandleTouchMoveThrottled.flush()
  const rs = rotateState.value
  if (rs && rs.moved) {
    editorStore.pushHistory()
    renderedImageStale.value = true
    hasUnsavedChanges.value = true
  }
  rotateState.value = null
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

function handleReset() {
  if (!editorStore.canReset) return
  uni.showModal({
    title: '重置确认',
    content: '确定要重置到模板初始状态吗？当前所有修改将丢失。',
    confirmText: '重置',
    confirmColor: '#e84a6e',
    success: (res) => {
      if (res.confirm) {
        editorStore.resetToInitial()
        renderedImageStale.value = true
        hasUnsavedChanges.value = true
        haptic('medium')
        uni.showToast({ title: '已重置', icon: 'none' })
      }
    },
  })
}

function handleRemoveWatermark() {
  if (isExporting) return
  if (userStore.isVip()) {
    isExporting = true
    doExport({ watermark: false, quality: 'high' }).finally(() => {
      isExporting = false
    })
  } else {
    uni.showModal({
      title: '高清无水印导出',
      content: '开通VIP即可享受高清无水印导出，还能解锁更多高级模板和专属权益',
      confirmText: '开通VIP',
      confirmColor: '#e84a6e',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          uni.navigateTo({ url: '/pages/vip/index' })
        }
      },
    })
  }
}

const editProgress = ref(0)
const hasShownProgressPopup = ref(false)
const editStartTime = ref(Date.now())
// 标记模板是否已加载完成（用于 onShow 检测登录返回后是否需要重新加载）
const templateLoaded = ref(false)
// 防止 onMounted 与 onShow 并发触发 loadEditorData 产生竞态
const isLoading = ref(false)

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

// 图片属性面板更新回调（防抖记录历史，避免滑块拖动时频繁 pushHistory）
let propPanelTimer: ReturnType<typeof setTimeout> | null = null
function onImagePropUpdate(field: string, value: number) {
  if (editorStore.selectedElement === null) return
  const el = editorStore.editableElements[editorStore.selectedElement]
  if (!el) return
  ;(el as any)[field] = value
  renderedImageStale.value = true
  hasUnsavedChanges.value = true
  if (propPanelTimer) clearTimeout(propPanelTimer)
  propPanelTimer = setTimeout(() => {
    editorStore.pushHistory()
    propPanelTimer = null
  }, 500)
}

// 图片属性面板预览回调（@changing 事件，实时更新但不记录历史）
function onImagePropPreview(field: string, value: number) {
  if (editorStore.selectedElement === null) return
  const el = editorStore.editableElements[editorStore.selectedElement]
  if (!el) return
  ;(el as any)[field] = value
  renderedImageStale.value = true
}

// 图片属性面板重置回调
function onImagePropReset() {
  if (editorStore.selectedElement === null) return
  const el = editorStore.editableElements[editorStore.selectedElement] as any
  if (!el) return
  el.imageScale = 1
  el.rotation = 0
  el.opacity = 1
  el.borderRadius = 0
  // 同时重置滤镜字段（与 ImagePropertyPanel 的 FILTER_DEFAULTS 对齐）
  el.brightness = 100
  el.contrast = 0
  el.saturate = 100
  el.blur = 0
  el.grayscale = 0
  editorStore.pushHistory()
  renderedImageStale.value = true
  hasUnsavedChanges.value = true
}

// ===== 文字样式面板回调 =====
// 保存初始样式快照（用于重置）—— 使用 ref 以响应元素切换
const _initialTextStyle = ref<{ fontSize?: number; color?: string; fontWeight?: 'normal' | 'bold' } | null>(null)

// 捕获当前选中元素的初始样式快照
function captureTextStyleSnapshot(el: any) {
  if (!el || !el.style) return
  if (!_initialTextStyle.value) {
    _initialTextStyle.value = {
      fontSize: el.style.fontSize,
      color: el.style.color,
      fontWeight: el.style.fontWeight,
    }
  }
}

function onTextStyleUpdate(field: string, value: string | number) {
  if (editorStore.selectedElement === null) return
  const el = editorStore.editableElements[editorStore.selectedElement]
  if (!el || !el.style) return
  // 记录初始样式（首次修改时）
  captureTextStyleSnapshot(el)
  ;(el.style as any)[field] = value
  renderedImageStale.value = true
  hasUnsavedChanges.value = true
  if (textStyleTimer) clearTimeout(textStyleTimer)
  textStyleTimer = setTimeout(() => {
    editorStore.pushHistory()
    textStyleTimer = null
  }, 500)
}

// 文字样式面板预览回调（实时更新但不记录历史）
function onTextStylePreview(field: string, value: string | number) {
  if (editorStore.selectedElement === null) return
  const el = editorStore.editableElements[editorStore.selectedElement]
  if (!el || !el.style) return
  // 拖动滑块时也要捕获快照，否则重置会失效
  captureTextStyleSnapshot(el)
  ;(el.style as any)[field] = value
  renderedImageStale.value = true
}

// 文字样式面板重置回调
function onTextStyleReset() {
  if (editorStore.selectedElement === null) return
  const el = editorStore.editableElements[editorStore.selectedElement]
  if (!el || !el.style || !_initialTextStyle.value) return
  el.style.fontSize = _initialTextStyle.value.fontSize
  el.style.color = _initialTextStyle.value.color
  el.style.fontWeight = _initialTextStyle.value.fontWeight
  _initialTextStyle.value = null
  editorStore.pushHistory()
  renderedImageStale.value = true
  hasUnsavedChanges.value = true
}

// 切换选中元素或关闭面板时清除快照
watch(() => editorStore.selectedElement, () => {
  _initialTextStyle.value = null
})

function resolveText(text: string): string {
  return resolveTextPlaceholders(text, templateStore.templateData)
}

function updateCardSize() {
  if (!isCanvasMode.value) return
  // 节流：onMounted / onShow / templateLoading / editableElements.length / isLandscape
  // 都可能触发 updateCardSize，合并 100ms 内的多次调用为单次执行
  if (_sizeTimer) clearTimeout(_sizeTimer)
  _sizeTimer = setTimeout(() => {
    _sizeTimer = null
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
  }, 100)
}

function calculateProgress(): number {
  // 根据模板类型统计不同模式的编辑进度
  let total = 0
  let completed = 0

  if (editorStore.templateType === 'canvas') {
    const elements = editorStore.editableElements
    total = elements.length + 2 // +2 for groom/bride name
    elements.forEach(el => {
      if (el.type === 'text' && el.text && el.text.trim()) completed++
      if (el.type === 'image' && el.text && !el.text.includes('default')) completed++
    })
  } else if (editorStore.templateType === 'page') {
    const sections = editorStore.pageSections
    total = sections.length + 2
    sections.forEach(sec => {
      if (sec.type === 'text' && sec.text && sec.text.trim()) completed++
      if (sec.type === 'image' && sec.image && !sec.image.includes('default')) completed++
    })
  } else if (editorStore.templateType === 'flip') {
    let flipElementCount = 0
    let flipCompleted = 0
    editorStore.flipPages.forEach(page => {
      page.elements?.forEach(el => {
        flipElementCount++
        if (el.type === 'text' && el.text && el.text.trim()) flipCompleted++
        if (el.type === 'image' && el.text && !el.text.includes('default')) flipCompleted++
      })
    })
    total = flipElementCount + 2
    completed = flipCompleted
  }

  if (templateStore.basicInfo?.groomName || templateStore.basicInfo?.brideName) completed += 2
  if (total === 0) return 0
  return Math.min(100, Math.round((completed / total) * 100))
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
    // 哈语日期/星期/时间段字段：禁止直接编辑（含固定哈语单位）
    if (el.dataKey === 'kzDate' || el.dataKey === 'kzWeekday' || el.dataKey === 'kzWeekdayParen' || el.dataKey === 'kzTime') {
      uni.showToast({ title: '请在「信息」面板修改', icon: 'none' })
      openUnifiedEdit()
      return
    }
    editorStore.editingText = el.text
    editorStore.showTextEditor = true
  }
}

function chooseLocalImage(idx: number) {
  const applyImage = async (tempPath: string) => {
    uni.showLoading({ title: '上传中 0%' })
    try {
      const permanentUrl = await uploadImage(tempPath, (progress: number) => {
        uni.showLoading({ title: `上传中 ${progress}%` })
      })
      if (!_isMounted) return
      editorStore.applyImageToElement(idx, permanentUrl)
      renderedImageStale.value = true
      hasUnsavedChanges.value = true
    } catch (e) {
      if (!_isMounted) return
      // 上传失败时回退到临时路径（至少当前会话可用）
      console.warn('图片上传失败，使用临时路径:', e)
      editorStore.applyImageToElement(idx, tempPath)
      renderedImageStale.value = true
      hasUnsavedChanges.value = true
      uni.showToast({ title: '图片上传失败，本地图片重启后可能丢失，请稍后重试', icon: 'none' })
    } finally {
      if (_isMounted) uni.hideLoading()
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
        applyImage(res.tempFilePaths[0])
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
  // 哈语日期/星期/时间段字段：文字含固定哈语单位，禁止直接编辑文本
  // 引导用户去「信息」面板用选择器改（只改数字，不动单位）
  if (el.dataKey === 'kzDate' || el.dataKey === 'kzWeekday' || el.dataKey === 'kzWeekdayParen' || el.dataKey === 'kzTime') {
    uni.showToast({ title: '请在「信息」面板修改日期', icon: 'none' })
    openUnifiedEdit()
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

const { goBack, isDirty } = useGoBack()

// 同步 hasUnsavedChanges 到 isDirty，用于返回前确认
watch(hasUnsavedChanges, (val) => {
  isDirty.value = val
})

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

/**
 * 从编辑器当前状态构建 Work 对象（统一三处保存逻辑）
 * @param existing 已有作品（更新时传入），为 null 则创建新作品
 */
function buildWorkFromEditor(existing: Work | null): Work {
  const editorData = editorStore.buildEditorData()
  const musicId = templateStore.selectedMusicId
  const now = new Date().toISOString()
  const today = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })

  if (existing) {
    existing.title = templateStore.templateData.coverTitle || '未命名作品'
    existing.date = today
    existing.image = templateStore.templateData.coverImage
    existing.cover = templateStore.templateData.coverImage
    existing.templateId = editorStore.currentTemplateId
    existing.templateType = editorStore.templateType
    existing.musicId = musicId
    existing.data = editorData
    existing.updatedAt = now
    return existing
  }

  const id = editorStore.currentWorkId || String(Date.now())
  if (!editorStore.currentWorkId) {
    editorStore.setCurrentWorkId(id)
  }
  return {
    id,
    title: templateStore.templateData.coverTitle || '未命名作品',
    date: today,
    image: templateStore.templateData.coverImage,
    cover: templateStore.templateData.coverImage,
    templateId: editorStore.currentTemplateId,
    templateType: editorStore.templateType,
    musicId,
    status: 'draft',
    data: editorData,
    updatedAt: now,
  }
}

/** 查找已有作品（同时搜索 works 和 drafts） */
function findExistingWork(): Work | null {
  if (!editorStore.currentWorkId) return null
  return worksStore.works.find(w => w.id === editorStore.currentWorkId)
    || (worksStore as any).drafts?.find((w: Work) => w.id === editorStore.currentWorkId)
    || null
}

async function handleSave() {
  if (savingLoading.value) return
  haptic('medium')
  track('edit_save', { progress: editProgress.value })

  const existing = findExistingWork()
  if (!existing && !userStore.canCreateWork()) {
    uni.showModal({
      title: '制作次数已用完',
      content: `您本月的免费制作次数（${VIP_LIMITS[userStore.getVipLevel()].monthlyCreateCount}次）已用完，升级会员可获得更多次数。`,
      confirmText: '去开通',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          uni.navigateTo({ url: '/pages/vip/index' })
        }
      },
    })
    return
  }

  const isNewWork = !existing
  await runSave(async () => {
    const work = buildWorkFromEditor(existing)
    // await 服务端同步，确保后续 export 接口能读到最新数据
    await worksStore.saveAsWork(work)
    if (isNewWork) {
      userStore.incrementCreateCount()
    }
    hasUnsavedChanges.value = false
  }, { successMessage: '已保存', minLoadingDuration: 400 })
  autoSaveToast.value = true
  setTimeout(() => {
    if (_isMounted) autoSaveToast.value = false
  }, 1500)
}

// 轻量自动保存（无 toast、无 loading，静默持久化）
async function autoSaveWork() {
  if (!hasUnsavedChanges.value) return
  if (savingLoading.value) return // 避免与手动保存并发
  try {
    const existing = findExistingWork()
    if (!existing && !userStore.canCreateWork()) return
    const isNewWork = !existing
    const work = buildWorkFromEditor(existing)
    await worksStore.saveAsWork(work)
    if (isNewWork) {
      userStore.incrementCreateCount()
    }
    hasUnsavedChanges.value = false
    autoSaveToast.value = true
    setTimeout(() => {
      if (_isMounted) autoSaveToast.value = false
    }, 1500)
  } catch (e) {
    console.warn('自动保存失败:', e)
  }
}

let isExporting = false

// ========== 导出完成推荐（C3：保存相册 → 商品推荐 → 3秒提示） ==========
const showRecommendModal = ref(false)
const recommendProducts = ref<any[]>([])
let _recommendTimer: ReturnType<typeof setTimeout> | null = null

const FALLBACK_RECOMMEND = [
  { id: 'rec-1', name: '精美喜糖盒', price: 9.9, image: '/static/images/products/sugar-box.png', cover: '' },
  { id: 'rec-2', name: '定制请柬信封', price: 19.9, image: '/static/images/products/envelope.png', cover: '' },
  { id: 'rec-3', name: '伴手礼丝带', price: 6.9, image: '/static/images/products/ribbon.png', cover: '' },
]

async function loadRecommendProducts() {
  if (recommendProducts.value.length) return
  try {
    const category = editorStore.currentTemplateCategory || 'wedding'
    const data = await fetchRecommendProducts(category)
    if (data && Array.isArray(data) && data.length) {
      recommendProducts.value = data.slice(0, 6)
      return
    }
  } catch (e) {
    console.warn('[editor] load recommend products failed:', e)
  }
  recommendProducts.value = FALLBACK_RECOMMEND
}

function showRecommendAfterExport() {
  showRecommendModal.value = true
  loadRecommendProducts()
  if (_recommendTimer) clearTimeout(_recommendTimer)
  _recommendTimer = setTimeout(() => {
    showRecommendModal.value = false
    uni.showToast({ title: '导出成功，已保存到相册', icon: 'success' })
  }, 3000)
}

function closeRecommendModal() {
  if (_recommendTimer) clearTimeout(_recommendTimer)
  showRecommendModal.value = false
  uni.showToast({ title: '导出成功，已保存到相册', icon: 'success' })
}

function goToProduct(p: any) {
  closeRecommendModal()
  uni.navigateTo({ url: `/pages/mall/index${p.id ? '?productId=' + p.id : ''}` })
}

function handleExport() {
  if (isExporting) return
  isExporting = true
  track('click_export')
  if (userStore.isVip()) {
    doExport({ watermark: false, quality: 'high' }).finally(() => { isExporting = false })
  } else {
    uni.showActionSheet({
      title: '选择导出方式',
      itemList: ['📦 高清无水印导出', '📦 免费导出（带水印）'],
      success: (res: any) => {
        if (res.tapIndex === 0) {
          track('click_export', { export_type: 'paid' })
          uni.showModal({
            title: '高清导出',
            content: '开通VIP即可高清无水印导出，还能享受更多权益',
            confirmText: '去开通VIP',
            success: (r) => {
              if (r.confirm) {
                uni.navigateTo({ url: '/pages/vip/index' })
              }
              isExporting = false
            },
          })
        } else {
          track('click_export', { export_type: 'free' })
          // C4：免费导出前播放激励视频（看完获得下载资格；广告未配置/失败时放行）
          showRewardedAd().then(() => {
            return doExport({ watermark: true, quality: 'normal' })
          }).finally(() => { isExporting = false })
        }
      },
      fail: () => {
        isExporting = false
      },
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
    // Promise 包装 downloadFile，确保完整等待下载+保存流程
    const downloadResult = await new Promise<{ tempFilePath: string }>((resolve, reject) => {
      uni.downloadFile({
        url: res.url,
        success: (r) => {
          if (r.statusCode === 200) {
            resolve({ tempFilePath: r.tempFilePath })
          } else {
            reject(new Error(`下载失败 (HTTP ${r.statusCode})`))
          }
        },
        fail: (err) => reject(new Error(err.errMsg || '下载失败')),
      })
    })
    // Promise 包装 saveImageToPhotosAlbum
    await new Promise<void>((resolve, reject) => {
      uni.saveImageToPhotosAlbum({
        filePath: downloadResult.tempFilePath,
        success: () => {
          // C3：导出成功 → 展示商品推荐弹层，3 秒后提示完成
          showRecommendAfterExport()
          resolve()
        },
        fail: (err) => {
          if (err.errMsg?.includes('auth')) {
            uni.showModal({
              title: '提示',
              content: '需要相册权限才能保存图片，请在设置中开启',
              confirmText: '去设置',
              success: (modalRes) => {
                if (modalRes.confirm) uni.openSetting({})
              },
            })
            reject(new Error('相册权限未授权'))
          } else {
            reject(new Error('保存到相册失败'))
          }
        },
      })
    })
  } catch (e: any) {
    const msg = e?.message || '导出失败'
    if (!msg.includes('相册权限') && !msg.includes('下载失败') && !msg.includes('保存到相册')) {
      uni.showToast({ title: '导出失败', icon: 'none' })
    } else if (msg.includes('下载失败')) {
      uni.showToast({ title: msg, icon: 'none' })
    }
  } finally {
    uni.hideLoading()
  }
}

async function handleShare() {
  if (sharingLoading.value) return
  haptic('medium')
  await runShare(async () => {
    // 统一保存逻辑：无论新建还是更新都走 buildWorkFromEditor
    const existing = findExistingWork()
    const work = buildWorkFromEditor(existing)
    // await 服务端同步完成，避免分享时服务端尚未收到最新数据
    await worksStore.saveAsWork(work)
    hasUnsavedChanges.value = false
  }, { successMessage: '已保存', minLoadingDuration: 300 })

  const templateId = editorStore.currentTemplateId
  const workId = editorStore.currentWorkId
  const params: string[] = []
  if (templateId) params.push(`templateId=${encodeURIComponent(templateId)}`)
  if (workId) params.push(`workId=${encodeURIComponent(workId)}`)
  const queryStr = params.join('&')
  uni.navigateTo({ url: `/pages/share/index${queryStr ? '?' + queryStr : ''}` })
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
      hasUnsavedChanges.value = true
    },
    fail: (err) => {
      if (!err.errMsg?.includes('cancel')) {
        uni.showToast({ title: '获取位置失败', icon: 'none' })
      }
    },
  })
}

// 查找作品：优先从 store，回退到本地存储
function findWork(workId: string): Work | undefined {
  const fromStore = worksStore.works.find(w => w.id === workId) || worksStore.drafts.find(w => w.id === workId)
  if (fromStore) return fromStore
  try {
    const saved = uni.getStorageSync('TOYtamaxia_works')
    if (saved) {
      const all = [...(saved.works || []), ...(saved.drafts || [])]
      return all.find((w: Work) => w.id === workId)
    }
  } catch (e) { /* ignore */ }
  return undefined
}

// 提取模板加载逻辑为可复用函数，供 onMounted 与 onShow 调用
async function loadEditorData(options: any) {
  // 防止并发加载：onMounted 与 onShow 可能同时触发
  if (isLoading.value) return
  isLoading.value = true
  loadError.value = false
  try {
    const workId = options.workId
    if (workId) {
      const work = findWork(workId)
      if (work) {
        editorStore.setCurrentWorkId(work.id)
        const templateId = work.templateId || options.templateId || options.id
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
        // 限数版模板：非 VIP 用户从模板新建时扣减 1 次免费额度（仅新建场景扣，编辑已有作品不扣）
        const quotaOk = await consumeLimitedQuotaIfNeeded(templateId)
        if (!quotaOk) return
        track('edit_start', { template_id: templateId })
      } else {
        await editorStore.restoreTemplate()
        track('edit_start', { template_id: editorStore.currentTemplateId })
      }
    }
    templateLoaded.value = true
    // 模板加载成功后，延迟显示首次编辑引导
    setTimeout(() => {
      if (_isMounted) tryShowEditHint()
    }, 800)
  } catch (e) {
    console.error('loadEditorData failed:', e)
    loadError.value = true
  } finally {
    isLoading.value = false
  }
}

// 限数版模板扣减：非 VIP 从模板新建时消耗 1 次免费额度；次数用完时弹窗引导并退出
async function consumeLimitedQuotaIfNeeded(templateId: string): Promise<boolean> {
  try {
    const level = editorStore.currentTemplateVipLevel
    if (level !== 'limited' || userStore.isVip()) return true
    try {
      await consumeTemplateQuota(templateId)
      return true
    } catch (err: any) {
      if (err?.message === 'QUOTA_EXHAUSTED') {
        const price = (editorStore as any).currentTemplate?.price || 9.9
        uni.showActionSheet({
          itemList: ['分享好友得免费次数', `¥${price} 解锁模板`, '开通VIP免费使用'],
          success: (res: any) => {
            if (res.tapIndex === 0) {
              uni.showModal({
                title: '分享得次数',
                content: '分享本模板给微信好友，好友打开后您即可获得 1 次免费制作机会（每日限 1 次）',
                confirmText: '去分享',
                success: (r: any) => {
                  if (r.confirm) {
                    uni.reLaunch({ url: `/pages/preview/index?templateId=${templateId}&shareGuide=1` })
                  } else {
                    uni.navigateBack()
                  }
                },
              })
            } else if (res.tapIndex === 1) {
              uni.redirectTo({ url: `/pages/vip/index?mode=purchase&templateId=${templateId}&price=${price}` })
            } else if (res.tapIndex === 2) {
              uni.redirectTo({ url: '/pages/vip/index' })
            } else {
              uni.navigateBack()
            }
          },
          fail: () => { uni.navigateBack() },
        })
        return false
      }
      // 其他错误（网络等）：放行，不阻断编辑（下次保存导出时会再次受限）
      console.warn('[editor] consume quota failed:', err?.message || err)
      return true
    }
  } catch (e) {
    console.warn('[editor] quota check failed:', e)
    return true
  }
}

// 重试加载
function retryLoad() {
  const pages = getCurrentPages()
  const curPage = pages[pages.length - 1] as any
  const options = curPage?.options || {}
  loadEditorData(options)
}

onMounted(async () => {
  editStartTime.value = Date.now()

  // 安全兜底：如果未登录，重定向到登录页
  if (!userStore.isLoggedIn) {
    userStore.requireLogin()
    return
  }

  const pages = getCurrentPages()
  const curPage = pages[pages.length - 1] as any
  const options = curPage?.options || {}

  await loadEditorData(options)

  // 启动自动保存定时器（每 60 秒）
  autoSaveTimer = setInterval(() => {
    autoSaveWork()
  }, 60000)

  nextTick(() => {
    _mountTimers.push(setTimeout(() => updateCardSize(), 100))
  })
})

// 用户从登录页返回后，如果模板尚未加载，则重新触发加载，避免空白页
onShow(() => {
  if (userStore.isLoggedIn && !templateLoaded.value) {
    const pages = getCurrentPages()
    const curPage = pages[pages.length - 1] as any
    const options = curPage?.options || {}
    loadEditorData(options).then(() => {
      nextTick(() => {
        _mountTimers.push(setTimeout(() => updateCardSize(), 100))
      })
    }).catch(() => {})
  }
})

watch(isLandscape, () => {
  nextTick(() => updateCardSize())
})

watch(() => editorStore.templateLoading, (loading) => {
  if (!loading) {
    nextTick(async () => {
      _mountTimers.push(setTimeout(() => updateCardSize(), 100))
      // 根据模板类型加载对应模式的元素字体
      // 修复阿拉伯文显示混乱：必须等待字体加载完成后再渲染，
      // 避免首次渲染用 fallback 字体（思源宋体不含连字规则）
      try {
        if (editorStore.templateType === 'flip') {
          await Promise.all(editorStore.flipPages.map(p => loadFontsForElements(p.elements as any)))
        } else if (editorStore.templateType === 'page') {
          await loadFontsForElements(editorStore.pageSections as any)
        } else {
          await loadFontsForElements(editorStore.editableElements as any)
        }
      } catch (e) {
        console.warn('[Editor] font load failed', e)
      }
      // 字体加载完成后强制重新计算尺寸
      updateCardSize()

      // 关键修复：字体加载完成后必须强制 <text> 重渲染。
      // wx.loadFontFace 注册字体后，已渲染的 <text> 节点不会自动应用新字体
      // （不在 Vue 响应式系统内）。通过对每个元素的 style 做一次浅拷贝替换，
      // 触发 Vue 重新计算 :style 绑定，让 <text> 重新应用 font-family。
      // 否则首次渲染时 fallback 字体（PingFang SC / 思源宋体）会被"焊死"在 DOM 上，
      // 即使字体注册成功也显示为不连写的孤立字形。
      if (editorStore.templateType === 'flip') {
        editorStore.flipPages.forEach(page => {
          const els = [...page.elements]
          page.elements.splice(0, els.length, ...els.map(e => ({ ...e, style: e.style ? { ...e.style } : undefined })))
        })
      } else if (editorStore.templateType === 'page') {
        const secs = [...editorStore.pageSections]
        editorStore.pageSections.splice(0, secs.length, ...secs.map(s => ({ ...s, style: s.style ? { ...s.style } : undefined })))
      } else {
        const els = [...editorStore.editableElements]
        editorStore.editableElements.splice(0, els.length, ...els.map(e => ({ ...e, style: e.style ? { ...e.style } : undefined })))
      }
      // 二次重算尺寸：字体切换后文本尺寸可能变化
      nextTick(() => updateCardSize())
    })
  }
})

watch(() => editorStore.editableElements.length, () => {
  nextTick(() => updateCardSize())
  editProgress.value = calculateProgress()
})

// 组件卸载时清理定时器，防止内存泄漏
onUnmounted(() => {
  _isMounted = false
  if (smartEditTimer) clearTimeout(smartEditTimer)
  if (_sizeTimer) clearTimeout(_sizeTimer)
  if (propPanelTimer) clearTimeout(propPanelTimer)
  if (textStyleTimer) clearTimeout(textStyleTimer)
  if (autoSaveTimer) clearInterval(autoSaveTimer)
  if (editHintTimer) clearTimeout(editHintTimer)
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
  overflow: hidden;
}

/* ===== 首次编辑引导提示 ===== */
.edit-hint-bubble {
  position: absolute;
  top: 15%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 36rpx;
  background: rgba(44, 44, 44, 0.92);
  border-radius: 48rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  animation: hintFloat 2s ease-in-out infinite alternate;
}

.edit-hint-icon {
  font-size: 36rpx;
  animation: hintPoint 1.2s ease-in-out infinite;
}

.edit-hint-text {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 500;
}

@keyframes hintFloat {
  from { transform: translateX(-50%) translateY(0); }
  to { transform: translateX(-50%) translateY(-8rpx); }
}

@keyframes hintPoint {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(8rpx); }
}

/* ===== 入场动画定义 ===== */
@keyframes slideDownFade {
  from {
    opacity: 0;
    transform: translateY(-30rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.94);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes slideUpFade {
  from {
    opacity: 0;
    transform: translateY(40rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulseGlow {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(232, 74, 110, 0.5);
  }
  50% {
    box-shadow: 0 0 0 16rpx rgba(232, 74, 110, 0);
  }
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10rpx); }
}

@keyframes bounceDot {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes iconBounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

@keyframes saveSuccessPop {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}

/* ===== Header ===== */
.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + 20rpx) 30rpx 24rpx;
  background: linear-gradient(135deg, #ffffff 0%, #fff5f7 50%, #fef0f3 100%);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-bottom: 1rpx solid rgba(232, 74, 110, 0.08);
  flex-shrink: 0;
  box-shadow: 0 4rpx 24rpx rgba(232, 74, 110, 0.08), 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  position: relative;
  z-index: 100;
}

.animate-slide-down-fade {
  animation: slideDownFade 0.5s cubic-bezier(0.4, 0, 0.2, 1) both;
}

.header-back {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 245, 247, 0.9) 100%);
  border-radius: 50%;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2rpx 12rpx rgba(232, 74, 110, 0.1);
  border: 1rpx solid rgba(232, 74, 110, 0.12);
}

.header-back:active {
  background: linear-gradient(135deg, rgba(232, 74, 110, 0.1) 0%, rgba(255, 107, 138, 0.1) 100%);
  transform: scale(0.9);
  box-shadow: 0 1rpx 6rpx rgba(232, 74, 110, 0.15);
}

.back-icon {
  font-size: 52rpx;
  color: #e84a6e;
  font-weight: 400;
  line-height: 1;
  margin-top: -4rpx;
}

.header-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  flex: 1;
}

.header-title {
  font-size: 34rpx;
  font-weight: 700;
  background: linear-gradient(135deg, #2c2c2c 0%, #4a4a4a 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 0.5rpx;
  max-width: 400rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  padding: 4rpx 16rpx;
  background: linear-gradient(135deg, rgba(232, 74, 110, 0.1) 0%, rgba(255, 107, 138, 0.1) 100%);
  border-radius: 20rpx;
  border: 1rpx solid rgba(232, 74, 110, 0.2);
}

.ai-badge-icon {
  font-size: 20rpx;
}

.ai-badge-text {
  font-size: 20rpx;
  font-weight: 600;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-right {
  width: 80rpx;
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
  background: linear-gradient(180deg, #fdf6f8 0%, #ffffff 100%);
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

.preview-scroll__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 24rpx 0;
}

.preview-card {
  display: flex;
  flex-direction: column;
  padding: 16rpx;
  gap: 20rpx;
}

.animate-fade-in-scale {
  animation: fadeInScale 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}

/* ===== 画布模式 ===== */
.rendered-image-container {
  position: relative;
  width: 100%;
  margin: auto;
  max-width: 680rpx;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.1), 0 4rpx 16rpx rgba(232, 74, 110, 0.06);
  border: 2rpx solid rgba(255, 255, 255, 0.8);
}

.rendered-image {
  width: 100%;
  display: block;
}

.rendered-overlay-element {
  position: absolute;
  z-index: 10;
  border-radius: 4rpx;
  transition: box-shadow 0.3s ease;
}

.rendered-overlay-element--active {
  outline: 4rpx solid #e84a6e;
  outline-offset: -2rpx;
  animation: pulseGlow 2s ease-in-out infinite;
  border-radius: 4rpx;
}

.rendered-overlay-element--no-click {
  pointer-events: none;
}

.preview-card--canvas {
  display: block;
  box-sizing: border-box;
  padding: 24rpx;
  position: relative;
  border-radius: 24rpx;
  overflow: hidden;
  margin: 0 auto;
  max-width: 720rpx;
  width: calc(100% - 48rpx);
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.08), 0 4rpx 16rpx rgba(232, 74, 110, 0.04);
  border: 2rpx solid rgba(255, 255, 255, 0.9);
}

/* ===== 空模板提示 ===== */
.empty-template-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 60rpx;
  gap: 24rpx;
  position: relative;
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}

.empty-hint-icon-wrap {
  width: 160rpx;
  height: 160rpx;
  background: linear-gradient(135deg, #fff0f3 0%, #ffe4e8 50%, #ffd6dd 100%);
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx;
  box-shadow: 0 8rpx 24rpx rgba(232, 74, 110, 0.15), inset 0 2rpx 4rpx rgba(255, 255, 255, 0.8);
  border: 2rpx solid rgba(255, 255, 255, 0.9);
}

.empty-hint-icon {
  font-size: 80rpx;
}

.empty-hint-text {
  font-size: 34rpx;
  color: #3a3a4a;
  font-weight: 700;
  letter-spacing: 0.5rpx;
}

.empty-hint-sub {
  font-size: 26rpx;
  color: #a0a0b0;
}

.empty-hint-decoration {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 16rpx;
}

.empty-decor-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  opacity: 0.4;
}

.empty-decor-dot:nth-child(2) {
  opacity: 0.7;
  width: 16rpx;
  height: 16rpx;
}

.empty-decor-dot:nth-child(1) {
  opacity: 0.3;
}

.empty-decor-dot:nth-child(3) {
  opacity: 0.3;
}

/* ===== 画布元素 ===== */
.canvas-element {
  overflow: hidden;
  border-radius: 4rpx;
}
/* 文本元素不裁切，高度自适应，避免渲染引擎差异导致文字被切 */
.canvas-element.text-element {
  overflow: visible;
}

.canvas-image {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.canvas-text {
  display: block;
  white-space: pre;
}

.non-editable {
  cursor: default;
  opacity: 1;
}

.canvas-element--no-interact {
  pointer-events: none;
}

.canvas-element--dragging {
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.2);
  opacity: 0.9;
}

.active-element {
  outline: 4rpx solid #e84a6e;
  outline-offset: -2rpx;
  animation: pulseGlow 2s ease-in-out infinite;
  border-radius: 4rpx;
}

/* ===== 缩放手柄 ===== */
.resize-handle {
  position: absolute;
  right: -16rpx;
  bottom: -16rpx;
  width: 32rpx;
  height: 32rpx;
  background: #fff;
  border: 4rpx solid #e84a6e;
  border-radius: 50%;
  z-index: 30;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.2);
}

.resize-handle--active {
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  border: 4rpx solid #fff;
  box-shadow: 0 0 0 2rpx #e84a6e, 0 4rpx 12rpx rgba(232, 74, 110, 0.4);
  animation: pulseGlow 1.5s ease-in-out infinite;
}

/* ===== 旋转手柄 ===== */
.rotate-handle {
  position: absolute;
  left: 50%;
  top: -64rpx;
  margin-left: -24rpx;
  width: 48rpx;
  height: 48rpx;
  z-index: 31;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.rotate-handle-line {
  position: absolute;
  left: 50%;
  bottom: -20rpx;
  width: 4rpx;
  height: 20rpx;
  margin-left: -2rpx;
  background: #e84a6e;
}

.rotate-handle-dot {
  width: 48rpx;
  height: 48rpx;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  border: 4rpx solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 2rpx #e84a6e, 0 4rpx 12rpx rgba(232, 74, 110, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 28rpx;
  font-weight: bold;
  box-sizing: border-box;
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

/* ===== 导出完成推荐弹层 ===== */
.recommend-mask {
  position: fixed;
  inset: 0;
  z-index: 9990;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
}

.recommend-panel {
  width: 100%;
  background: #ffffff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 36rpx 0 calc(40rpx + env(safe-area-inset-bottom));
  animation: recommendSlideUp 0.3s ease-out;
}

@keyframes recommendSlideUp {
  from { transform: translateY(60%); opacity: 0.6; }
  to { transform: translateY(0); opacity: 1; }
}

.recommend-header {
  padding: 0 40rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.recommend-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #333333;
}

.recommend-sub {
  font-size: 24rpx;
  color: #999999;
}

.recommend-list {
  white-space: nowrap;
  padding: 0 24rpx;
}

.recommend-item {
  display: inline-flex;
  flex-direction: column;
  width: 200rpx;
  margin-right: 20rpx;
  background: #fafafa;
  border-radius: 16rpx;
  overflow: hidden;
  vertical-align: top;
}

.recommend-img {
  width: 200rpx;
  height: 200rpx;
  background: #f0f0f0;
}

.recommend-name {
  font-size: 24rpx;
  color: #333333;
  padding: 12rpx 16rpx 4rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recommend-price {
  font-size: 26rpx;
  font-weight: 700;
  color: #e84a6e;
  padding: 0 16rpx 16rpx;
}

.recommend-close {
  margin: 28rpx 40rpx 0;
  height: 84rpx;
  border-radius: 42rpx;
  background: #e84a6e;
  display: flex;
  align-items: center;
  justify-content: center;
}

.recommend-close-text {
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 600;
}

/* ===== 底部工具栏 ===== */
.editor-footer {
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(30rpx);
  -webkit-backdrop-filter: blur(30rpx);
  border-top: 1rpx solid rgba(232, 74, 110, 0.06);
  flex-shrink: 0;
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: 0 -8rpx 32rpx rgba(0, 0, 0, 0.06), 0 -2rpx 8rpx rgba(232, 74, 110, 0.04);
  position: relative;
  z-index: 50;
}

/* ===== 上下文工具栏 ===== */
.context-toolbar {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 16rpx 20rpx;
  background: linear-gradient(135deg, #fff5f7 0%, #fef0f3 100%);
  border-bottom: 1rpx solid rgba(232, 74, 110, 0.08);
  animation: slideUpFade 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
}

.context-toolbar--glass {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.6);
}

.ctx-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 14rpx 10rpx;
  border-radius: 16rpx;
  background: transparent;
  gap: 6rpx;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.ctx-btn:active {
  transform: scale(0.9);
  background: rgba(232, 74, 110, 0.1);
}

.ctx-btn:active .ctx-icon--bounce {
  animation: iconBounce 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.ctx-btn--disabled {
  opacity: 0.35;
  pointer-events: none;
}

.ctx-btn--danger {
  background: transparent;
}

.ctx-btn--danger:active {
  background: rgba(232, 74, 110, 0.12);
}

.ctx-divider {
  width: 1rpx;
  height: 48rpx;
  background: linear-gradient(180deg, transparent 0%, rgba(232, 74, 110, 0.15) 50%, transparent 100%);
  flex-shrink: 0;
}

.ctx-icon {
  font-size: 34rpx;
  line-height: 1;
}

.ctx-label {
  font-size: 22rpx;
  color: #5a5a6a;
  font-weight: 500;
}

.ctx-btn--danger .ctx-label {
  color: #e84a6e;
  font-weight: 600;
}

/* ===== 常驻快捷操作栏 ===== */
.quick-toolbar {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 8rpx 24rpx;
  background: rgba(250, 250, 252, 0.95);
  border-top: 1rpx solid rgba(0, 0, 0, 0.04);
}

.quick-btn {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  padding: 12rpx 20rpx;
  border-radius: 12rpx;
  transition: all 0.2s;
}

.quick-btn:active {
  background: rgba(232, 74, 110, 0.08);
}

.quick-btn--disabled {
  opacity: 0.3;
  pointer-events: none;
}

.quick-icon {
  font-size: 36rpx;
  color: #2c2c2c;
  line-height: 1;
}

.quick-label {
  font-size: 22rpx;
  color: #5a5a6a;
  font-weight: 500;
}

.quick-divider {
  width: 1rpx;
  height: 40rpx;
  background: rgba(0, 0, 0, 0.08);
  margin: 0 16rpx;
}

.quick-btn--watermark {
  padding: 8rpx 16rpx;
  background: linear-gradient(135deg, #fff8e1 0%, #fff3cd 100%);
  border-radius: 20rpx;
  border: 1rpx solid rgba(255, 193, 7, 0.4);
}

.quick-btn--watermark .quick-icon {
  font-size: 28rpx;
}

.quick-btn--watermark .quick-label {
  font-size: 22rpx;
  color: #f59e0b;
  font-weight: 600;
}

/* ===== 底部主区域 ===== */
.footer-main {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx 16rpx;
  gap: 20rpx;
}

.footer-stagger-anim .footer-tab--item {
  opacity: 0;
  transform: translateY(20rpx);
  animation: slideUpFade 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.footer-stagger-anim .footer-tab--item:nth-child(1) { animation-delay: 0.05s; }
.footer-stagger-anim .footer-tab--item:nth-child(2) { animation-delay: 0.1s; }
.footer-stagger-anim .footer-tab--item:nth-child(3) { animation-delay: 0.15s; }
.footer-stagger-anim .footer-tab--item:nth-child(4) { animation-delay: 0.2s; }
.footer-stagger-anim .footer-tab--item:nth-child(5) { animation-delay: 0.25s; }

.footer-tabs {
  display: flex;
  align-items: center;
  gap: 4rpx;
  flex: 1;
}

.footer-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: calc((100% - 16rpx) / 5);
  height: 92rpx;
  padding: 8rpx 4rpx;
  gap: 6rpx;
  border-radius: 16rpx;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.footer-tab:active {
  transform: scale(0.92);
  background: linear-gradient(135deg, rgba(232, 74, 110, 0.08) 0%, rgba(255, 107, 138, 0.08) 100%);
}

.footer-tab:active .tab-icon--hover {
  animation: iconBounce 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.tab-icon {
  font-size: 40rpx;
  line-height: 1;
  transition: transform 0.2s ease;
}

.tab-label {
  font-size: 22rpx;
  color: #7a7a8a;
  font-weight: 500;
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.footer-action-btn {
  padding: 20rpx 36rpx;
  border-radius: 44rpx;
  text-align: center;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.footer-action-btn:active {
  transform: scale(0.94);
}

.footer-save-btn--enhanced {
  background: linear-gradient(135deg, #ffffff 0%, #f8f8fa 100%);
  border: 2rpx solid rgba(232, 74, 110, 0.2);
  box-shadow: 0 4rpx 12rpx rgba(232, 74, 110, 0.1);
}

.footer-save-btn--enhanced:active {
  background: linear-gradient(135deg, #fff5f7 0%, #fff0f3 100%);
  box-shadow: 0 2rpx 6rpx rgba(232, 74, 110, 0.15);
}

.footer-share-btn--enhanced {
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 50%, #ff8fa3 100%);
  box-shadow: 0 8rpx 24rpx rgba(232, 74, 110, 0.4), 0 2rpx 8rpx rgba(255, 107, 138, 0.3);
  position: relative;
}

.footer-share-btn--enhanced::before {
  content: '';
  position: absolute;
  top: 0;
  left: -50%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shimmer 3s ease-in-out infinite;
}

.footer-share-btn--enhanced:active {
  box-shadow: 0 4rpx 12rpx rgba(232, 74, 110, 0.5), 0 1rpx 4rpx rgba(255, 107, 138, 0.3);
}

.action-btn-text {
  font-size: 28rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.5rpx;
  position: relative;
  z-index: 1;
}

.footer-save-btn--enhanced .action-btn-text {
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* ===== 保存按钮状态指示 ===== */
.save-btn-content {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.save-status-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  transition: background 0.3s;
}

.save-status-dot--unsaved {
  background: #ff4d4f;
  box-shadow: 0 0 8rpx rgba(255, 77, 79, 0.5);
  animation: dotPulse 2s ease-in-out infinite;
}

.save-status-dot--saved {
  background: #52c41a;
  box-shadow: 0 0 6rpx rgba(82, 196, 26, 0.4);
}

@keyframes dotPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ===== 自动保存提示条 ===== */
.autosave-toast {
  position: fixed;
  top: calc(env(safe-area-inset-top) + 80rpx);
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 28rpx;
  background: rgba(82, 196, 26, 0.95);
  border-radius: 36rpx;
  box-shadow: 0 4rpx 16rpx rgba(82, 196, 26, 0.3);
  animation: toastSlideDown 0.3s ease-out;
}

.autosave-icon {
  font-size: 24rpx;
  color: #ffffff;
  font-weight: bold;
}

.autosave-text {
  font-size: 24rpx;
  color: #ffffff;
  font-weight: 500;
}

@keyframes toastSlideDown {
  from {
    transform: translateX(-50%) translateY(-20rpx);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}

/* ===== 按钮 loading 态 ===== */
.btn--loading {
  opacity: 0.8;
  pointer-events: none;
}

.btn-spinner-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
}

.btn-spinner {
  width: 28rpx;
  height: 28rpx;
  border: 3rpx solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: btnSpin 0.6s linear infinite;
}

.footer-save-btn--enhanced .btn-spinner {
  border: 3rpx solid rgba(232, 74, 110, 0.2);
  border-top-color: #e84a6e;
}

@keyframes btnSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ===== 加载错误状态 ===== */
.load-error-overlay {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fdf6f8 0%, #fef9fa 100%);
  padding: 32rpx;
}

.load-error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}

.load-error-icon {
  font-size: 80rpx;
}

.load-error-text {
  font-size: 32rpx;
  color: #5a5a6a;
  font-weight: 600;
}

.load-error-retry-btn {
  padding: 20rpx 64rpx;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  border-radius: 44rpx;
  box-shadow: 0 6rpx 20rpx rgba(232, 74, 110, 0.35);
}

.load-error-retry-btn:active {
  transform: scale(0.94);
  opacity: 0.9;
}

.load-error-retry-text {
  font-size: 28rpx;
  color: #fff;
  font-weight: 600;
}

/* ===== Loading 骨架屏 ===== */
.loading-overlay {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fdf6f8 0%, #fef9fa 100%);
  padding: 32rpx;
  position: relative;
  overflow: hidden;
}

.loading-content {
  width: 100%;
  max-width: 600rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32rpx;
  position: relative;
}

.loading-decor {
  position: absolute;
  font-size: 48rpx;
  opacity: 0.3;
  animation: float 4s ease-in-out infinite;
}

.loading-decor-1 {
  top: -60rpx;
  left: 20rpx;
  animation-delay: 0s;
}

.loading-decor-2 {
  top: -40rpx;
  right: 40rpx;
  animation-delay: 0.5s;
  font-size: 40rpx;
}

.loading-decor-3 {
  top: 80rpx;
  right: 10rpx;
  animation-delay: 1s;
  font-size: 36rpx;
}

.skeleton-card {
  width: 100%;
  max-width: 600rpx;
}

.skeleton-img {
  width: 100%;
  height: 400rpx;
  border-radius: 24rpx;
  margin-bottom: 28rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.06);
}

.skeleton-line {
  height: 28rpx;
  border-radius: 8rpx;
  margin-bottom: 16rpx;
}

.skeleton-shimmer {
  background: linear-gradient(90deg, #f0f0f5 25%, #e8e8f0 50%, #f0f0f5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

.loading-text-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.loading-text {
  font-size: 28rpx;
  color: #8a8a9a;
  font-weight: 500;
}

.loading-dots {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.loading-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  animation: bounceDot 1.4s ease-in-out infinite;
}

.loading-dot:nth-child(1) { animation-delay: 0s; }
.loading-dot:nth-child(2) { animation-delay: 0.2s; }
.loading-dot:nth-child(3) { animation-delay: 0.4s; }

/* ===== 弹窗遮罩模糊效果 ===== */
:deep(.uni-popup-mask),
:deep(.u-mask) {
  backdrop-filter: blur(8rpx);
  -webkit-backdrop-filter: blur(8rpx);
}
</style>
