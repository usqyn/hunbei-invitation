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

    <!-- Body: 左侧预览 + 右侧编辑面板 / 横屏模式：上预览 + 下编辑 -->
    <view v-if="editorStore.templateLoading" class="loading-overlay">
      <text class="loading-overlay-text">加载模板中...</text>
    </view>
    <view v-else class="editor-body" :class="{ 'editor-body--landscape': isLandscape }">
      <!-- 预览区 -->
      <view class="preview-area" :class="{ 'preview-area--landscape': isLandscape }">
        <scroll-view class="preview-scroll" scroll-y>
          <!-- 画布模式：admin 发布的绝对定位模板 -->
          <template v-if="isCanvasMode">
            <!-- 编辑器始终显示可编辑元素，不使用 renderedImage -->
            <view class="preview-card preview-card--canvas" :style="{ ...canvasCardStyle, ...canvasBackgroundStyle }">
              <view
                v-for="(el, idx) in editorStore.editableElements" :key="idx"
                class="canvas-element"
                :class="{
                  'active-element': editorStore.selectedElement === idx,
                  'text-element': el.type === 'text',
                  'non-editable': el.editable === false,
                  'canvas-element--no-interact': el.editable === false
                }"
                :style="getCanvasElementStyle(el)"
                @click="el.editable === false ? null : onOpenEditor(idx)"
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
                  :style="getTextStyle(idx)"
                >{{ el.text }}</text>
              </view>
            </view>
          </template>
          <!-- Flex 模式：静态模板的垂直排列 -->
          <template v-else>
            <view class="preview-card preview-card--flex">
              <block v-for="(el, idx) in editorStore.editableElements" :key="idx">
                <view
                  v-if="el.type === 'image'"
                  class="section image-section"
                  :class="{ 'active-section': el.editable !== false && editorStore.selectedElement === idx, 'non-editable': el.editable === false }"
                  @click="el.editable === false ? null : onOpenEditor(idx)"
                >
                  <image
                    class="section-image"
                    :src="el.text"
                    mode="aspectFill"
                    @error="onImageError"
                  ></image>
                  <view v-if="idx === 0" class="image-overlay">
                    <text class="overlay-label">{{ templateName }}</text>
                  </view>
                </view>
                <view
                  v-else-if="el.type === 'text'"
                  class="section text-section"
                  :class="{ 'active-section': el.editable !== false && editorStore.selectedElement === idx, 'non-editable': el.editable === false }"
                  @click="el.editable === false ? null : onOpenEditor(idx)"
                >
                  <text
                    class="section-text"
                    :style="getTextStyle(idx)"
                  >{{ el.text }}</text>
                </view>
              </block>
            </view>
          </template>
        </scroll-view>
      </view>

      <!-- 右侧/底部编辑面板 -->
      <view v-if="!isLandscape" class="sidebar-area">
        <RightPanel
          :active-panel-tab="editorStore.activePanelTab"
          :editable-elements="editorStore.editableElements"
          :selected-element="editorStore.selectedElement"
          :material-list="editorStore.materialList"
          :settings="templateStore.settings"
          mode="sidebar"
          @update:active-panel-tab="editorStore.activePanelTab = $event"
          @open-editor="onOpenEditor"
          @select-material="onSelectMaterial"
          @toggle-setting="toggleSetting"
        />
      </view>
      <view v-else class="bottom-panel">
        <RightPanel
          :active-panel-tab="editorStore.activePanelTab"
          :editable-elements="editorStore.editableElements"
          :selected-element="editorStore.selectedElement"
          :material-list="editorStore.materialList"
          :settings="templateStore.settings"
          mode="bottom"
          @update:active-panel-tab="editorStore.activePanelTab = $event"
          @open-editor="onOpenEditor"
          @select-material="onSelectMaterial"
          @toggle-setting="toggleSetting"
        />
      </view>
    </view>

    <!-- Footer Toolbar -->
    <view class="editor-footer">
      <view class="footer-item" @click="handleMusic">
        <text class="footer-icon">🎵</text>
        <text class="footer-label">音乐</text>
      </view>
      <view class="footer-item" @click="handleSettings">
        <text class="footer-icon">⚙️</text>
        <text class="footer-label">设置</text>
      </view>
      <view class="footer-item" @click="openBasicInfoEditor">
        <text class="footer-icon">📋</text>
        <text class="footer-label">基本信息</text>
      </view>
      <view class="footer-item" @click="openQuickEdit">
        <text class="footer-icon">✏️</text>
        <text class="footer-label">快捷填写</text>
      </view>
      <view class="footer-item" @click="handleSave">
        <text class="footer-icon">💾</text>
        <text class="footer-label">保存</text>
      </view>
      <view class="footer-share-btn" @click="handleShare">
        <text class="share-btn-text">预览分享</text>
      </view>
    </view>

    <!-- Text Editor Popup -->
    <TextEditorPopup
      v-if="editorStore.showTextEditor"
      :visible="editorStore.showTextEditor"
      :editing-text="editorStore.editingText"
      @input="(v: string) => editorStore.editingText = v"
      @close="editorStore.closeTextEditor"
      @confirm="editorStore.confirmTextEdit"
    />

    <!-- Basic Info Popup -->
    <BasicInfoForm
      v-if="editorStore.showBasicInfoEditor"
      :visible="editorStore.showBasicInfoEditor"
      :basic-info="basicInfo"
      @close="editorStore.closeBasicInfoEditor"
      @confirm="editorStore.closeBasicInfoEditor"
    />

    <!-- Quick Edit Popup -->
    <QuickEditForm
      v-if="editorStore.showQuickEdit"
      :visible="editorStore.showQuickEdit"
      :elements="editorStore.editableElements"
      @close="editorStore.closeQuickEdit"
      @update="onSmartFieldUpdate"
    />

  </view>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, nextTick, watch } from 'vue'
import { useTemplateStore } from '@/stores/template'
import { useEditorStore } from '@/stores/editor'
import { useWorksStore } from '@/stores/works'
import { DEFAULT_TEMPLATE_ID } from '@/constants/templates'
import { loadFontsForElements } from '@/utils/fontLoader'
import RightPanel from './components/RightPanel.vue'
import TextEditorPopup from './components/TextEditorPopup.vue'
import BasicInfoForm from './components/BasicInfoForm.vue'
import QuickEditForm from './components/QuickEditForm.vue'
import type { Material, ElementStyle, EditableElement, Work } from '@/types'

const templateStore = useTemplateStore()
const editorStore = useEditorStore()
const worksStore = useWorksStore()

// 当前模板名
const templateName = computed(() => {
  return templateStore.templateData.coverTitle || '请柬'
})

const basicInfo = computed(() => templateStore.basicInfo)

// 画布模式判断：有元素且任一元素有完整定位数据（x/y/width/height）
const isCanvasMode = computed(() => {
  return editorStore.editableElements.length > 0 &&
    editorStore.editableElements.some(el => el.x != null && el.y != null && el.width != null && el.height != null)
})

// 横屏检测：画布宽 > 高时为横屏模式
const isLandscape = computed(() => {
  if (!isCanvasMode.value) return false
  const w = editorStore.canvasSize?.width || 375
  const h = editorStore.canvasSize?.height || 667
  return w > h
})

const canvasWidth = computed(() => editorStore.canvasSize?.width || 375)
const canvasHeight = computed(() => editorStore.canvasSize?.height || 667)

const canvasCardStyle = computed(() => {
  const w = canvasWidth.value
  const h = canvasHeight.value
  const isLand = w > h
  return {
    aspectRatio: `${w} / ${h}`,
    width: isLand ? '70%' : '100%',
    margin: isLand ? '0 auto' : '0',
  }
})

// 画布背景样式（从 admin 模板配置读取）
const canvasBackgroundStyle = computed(() => {
  const bg = editorStore.background
  if (!bg || bg.type === 'solid') {
    return { background: bg?.color1 || '#ffffff' }
  }
  if (bg.type === 'linear-gradient') {
    const angle = bg.angle ?? 135
    return { background: `linear-gradient(${angle}deg, ${bg.color1}, ${bg.color2 || bg.color1})` }
  }
  if (bg.type === 'radial-gradient') {
    return { background: `radial-gradient(circle, ${bg.color1}, ${bg.color2 || bg.color1})` }
  }
  if (bg.type === 'image' && bg.image) {
    return { background: `url(${bg.image}) center/cover no-repeat` }
  }
  return { background: bg?.color1 || '#ffffff' }
})

// 预览卡片 DOM 引用
const previewCardRef = ref<HTMLElement | null>(null)

// 动态 fontScale：基于预览卡片实际宽度与屏幕宽度的比值
const fontScale = ref(0.67)

function updateFontScale() {
  if (!isCanvasMode.value) {
    fontScale.value = 1
    return
  }
  nextTick(() => {
    const query = uni.createSelectorQuery()
    query
      .select('.preview-card')
      .boundingClientRect((rect: any) => {
        if (rect && rect.width > 0) {
          const sysInfo = uni.getSystemInfoSync()
          fontScale.value = rect.width / sysInfo.windowWidth
        }
      })
      .exec()
  })
}

// 画布模式下获取元素的绝对定位样式
function getCanvasElementStyle(el: EditableElement) {
  if (el.x == null) return {}
  const fs = fontScale.value
  const imgStyle: Record<string, string> = {}
  if (el.type === 'image' && el.style?.borderRadius) {
    imgStyle.borderRadius = Math.round(el.style.borderRadius * fs) + 'rpx'
  }
  const isText = el.type === 'text'
  const style: Record<string, string> = {
    position: 'absolute',
    left: `${(el.x / canvasWidth.value) * 100}%`,
    top: `${(el.y! / canvasHeight.value) * 100}%`,
    width: `${(el.width! / canvasWidth.value) * 100}%`,
    zIndex: String(el.zIndex ?? 0),
    opacity: String(el.opacity ?? 1),
    ...imgStyle,
  }
  if (isText) {
    style.height = `${(el.height! / canvasHeight.value) * 100}%`
    style.overflow = 'hidden'
  } else {
    style.height = `${(el.height! / canvasHeight.value) * 100}%`
  }
  if (el.rotation) style.transform = `rotate(${el.rotation}deg)`
  return style
}

function getFontFamily(font: string | undefined) {
  if (!font) return 'sans-serif'
  return `"${font}", 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', sans-serif`
}

function detectTextDirection(text: string): 'ltr' | 'rtl' {
  const rtlChars = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
  return rtlChars.test(text) ? 'rtl' : 'ltr'
}

// 根据元素索引获取样式
function getTextStyle(idx: number) {
  const el = editorStore.editableElements[idx]
  const fs = fontScale.value
  if (!el || !el.style) {
    return {
      fontSize: Math.round(30 * fs) + 'rpx',
      color: '#333333',
      lineHeight: 1.6,
      letterSpacing: Math.round(2 * fs) + 'rpx',
    }
  }

  const style: ElementStyle = el.style

  const detectedDirection = detectTextDirection(el.text)
  const direction = style.direction === 'auto' ? detectedDirection : (style.direction || 'ltr')
  const textAlign = style.textAlign || (direction === 'rtl' ? 'right' : 'center')

  return {
    fontSize: Math.round((style.fontSize || 28) * fs) + 'rpx',
    color: style.color,
    lineHeight: String(style.lineHeight || 1.6),
    letterSpacing: Math.round((style.spacing ?? 2) * fs) + 'rpx',
    fontFamily: getFontFamily(style.font),
    fontWeight: style.fontWeight || 'normal',
    fontStyle: style.fontStyle || 'normal',
    textAlign,
    direction,
    WebkitTextStroke: style.strokeWidth ? `${Math.round(style.strokeWidth * fs)}rpx ${style.strokeColor || 'transparent'}` : undefined,
    textShadow: style.shadowBlur ? `${Math.round((style.shadowOffsetX ?? 0) * fs)}rpx ${Math.round((style.shadowOffsetY ?? 0) * fs)}rpx ${Math.round(style.shadowBlur * fs)}rpx ${style.shadowColor || 'transparent'}` : undefined,
    textDecoration: style.textDecoration || 'none',
  }
}

// 打开编辑器
function onOpenEditor(idx: number) {
  const el = editorStore.editableElements[idx]
  if (el.editable === false) return
  editorStore.selectedElement = idx

  if (el.type === 'image') {
    // 图片 - 直接让用户选择本地图片
    chooseLocalImage(idx)
  } else if (el.type === 'text') {
    // 文字 - 打开文字编辑器
    editorStore.editingText = el.text
    editorStore.showTextEditor = true
  }
}

// 选择本地图片
function chooseLocalImage(idx: number) {
  // 微信小程序端
  // #ifdef MP-WEIXIN
  uni.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sourceType: ['album', 'camera'],
    success: (res: any) => {
      if (res.tempFiles && res.tempFiles.length > 0) {
        editorStore.applyImageToElement(idx, res.tempFiles[0].tempFilePath)
      }
    },
    fail: () => {
      uni.showToast({ title: '图片选择失败', icon: 'none' })
    },
  })
  // #endif

  // H5 / App 端
  // #ifndef MP-WEIXIN
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res: any) => {
      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        editorStore.applyImageToElement(idx, res.tempFilePaths[0])
      }
    },
    fail: () => {
      uni.showToast({ title: '图片选择失败', icon: 'none' })
    },
  })
  // #endif
}

// 选择素材
function onSelectMaterial(material: Material) {
  if (editorStore.selectedElement === null) return
  const idx = editorStore.selectedElement
  editorStore.applyImageToElement(idx, material.url)
}

// 打开基本信息编辑器
function openBasicInfoEditor() {
  editorStore.showBasicInfoEditor = true
}

function openQuickEdit() {
  editorStore.openQuickEdit()
}

function onSmartFieldUpdate(key: string, value: string) {
  editorStore.syncSmartField(key, value)
}

// 切换设置
function toggleSetting(key: string) {
  templateStore.toggleSetting(key)
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.switchTab({ url: '/pages/index/index' })
  }
}

function onImageError(e: any) {
  console.warn('Editor image load failed')
}

function handleMusic() {
  uni.navigateTo({ url: '/pages/music/index' })
}

function handleSettings() {
  uni.showActionSheet({
    itemList: ['礼物功能', '礼金功能', '点赞功能', '相册功能'],
    success: (res: any) => {
      const keys = ['giftAlbum', 'moneyGift', 'like', 'album']
      const key = keys[res.tapIndex]
      if (key) toggleSetting(key)
    },
  })
}

function handleSave() {
  if (editorStore.currentWorkId) {
    const existing = worksStore.works.find(w => w.id === editorStore.currentWorkId)
    if (existing) {
      existing.title = templateStore.templateData.coverTitle || '未命名作品'
      existing.date = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })
      existing.image = templateStore.templateData.coverImage
      existing.templateType = editorStore.currentTemplateId
      worksStore.saveAsWork(existing)
      uni.showToast({ title: '已保存', icon: 'success' })
      return
    }
  }
  const id = editorStore.currentWorkId || Date.now()
  if (!editorStore.currentWorkId) {
    editorStore.setCurrentWorkId(id)
  }
  const work: Work = {
    id,
    title: templateStore.templateData.coverTitle || '未命名作品',
    date: new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }),
    image: templateStore.templateData.coverImage,
    templateType: editorStore.currentTemplateId,
    status: 'draft',
  }
  worksStore.saveAsWork(work)
  uni.showToast({ title: '已保存', icon: 'success' })
}

function handleShare() {
  handleSave()
  const templateId = editorStore.currentTemplateId
  if (templateId) {
    uni.navigateTo({ url: `/pages/share/index?templateId=${templateId}` })
  } else {
    uni.navigateTo({ url: '/pages/share/index' })
  }
}

// 页面加载时根据参数切换模板
onMounted(() => {
  const pages = getCurrentPages()
  const curPage = pages[pages.length - 1] as any
  const options = curPage?.options || {}

  if (options.templateId) {
    editorStore.loadTemplateById(options.templateId)
  } else {
    editorStore.loadTemplateById(DEFAULT_TEMPLATE_ID)
  }

  // 延迟计算 fontScale，等待模板渲染完成
  setTimeout(() => updateFontScale(), 500)
})

// 监听横屏/竖屏切换（侧边栏展开收起会影响布局），重新计算 fontScale
watch(isLandscape, () => {
  nextTick(() => updateFontScale())
})

// 监听编辑器模板加载完成，重新计算 fontScale
watch(() => editorStore.templateLoading, (loading) => {
  if (!loading) {
    nextTick(() => {
      setTimeout(() => updateFontScale(), 300)
      // 加载模板中使用的自定义字体
      loadFontsForElements(editorStore.editableElements as any)
    })
  }
})

// 监听 editableElements 变化（编辑内容变化可能导致布局变化）
watch(() => editorStore.editableElements.length, () => {
  nextTick(() => updateFontScale())
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
  padding: 20rpx 30rpx;
  background: #fff;
  border-bottom: 1rpx solid #f0e0e5;
  flex-shrink: 0;
}

.header-back {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 48rpx;
  color: #333;
  font-weight: 300;
}

.header-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #333;
}

.header-right {
  width: 60rpx;
}

/* Body */
.editor-body {
  display: flex;
  flex: 1;
  min-height: 0;
  padding: 16rpx;
  gap: 16rpx;
}

/* Preview Area - 左侧更大 */
.preview-area {
  flex: 2.5;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 12rpx;
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

.section {
  position: relative;
  width: 100%;
}

/* 图片区块 */
.image-section {
  border-radius: 12rpx;
  overflow: hidden;
}

.section-image {
  width: 100%;
  min-height: 400rpx;
  aspect-ratio: 3 / 4;
  background: #f5f5f5;
}

.image-overlay {
  position: absolute;
  bottom: 20rpx;
  left: 0;
  right: 0;
  text-align: center;
}

.overlay-label {
  font-size: 28rpx;
  color: #fff;
  font-weight: 600;
  text-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.5);
}

/* 文字区块 */
.text-section {
  padding: 20rpx;
  background: #fff;
  border-radius: 12rpx;
  text-align: center;
  min-height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.section-text {
  font-size: 30rpx;
  color: #333;
  line-height: 1.6;
}

/* 高亮样式 */
.active-section {
  outline: 4rpx solid #e84a6e;
  outline-offset: 4rpx;
}

/* ===== 画布模式 ===== */
.preview-card--canvas {
  display: block;
  padding: 0;
  gap: 0;
  position: relative;
  border-radius: 12rpx;
  overflow: hidden;
}

.canvas-element {
  overflow: hidden;
}
.canvas-element.text-element {
  overflow: hidden;
}

.rendered-image {
  width: 100%;
  display: block;
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

/* Sidebar Area - 右侧编辑面板 */
.sidebar-area {
  flex: 1;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

/* Bottom Panel - 横屏模式下底部编辑面板 */
.bottom-panel {
  flex-shrink: 0;
  background: #fff;
  border-top: 1rpx solid #f0e0e5;
  border-radius: 16rpx 16rpx 0 0;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.06);
  min-height: 200rpx;
  max-height: 340rpx;
  overflow: hidden;
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

/* Footer Toolbar */
.editor-footer {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  background: #fff;
  border-top: 1rpx solid #f0e0e5;
  flex-shrink: 0;
}

.footer-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 24rpx;
  gap: 6rpx;
}

.footer-icon {
  font-size: 40rpx;
}

.footer-label {
  font-size: 22rpx;
  color: #666;
}

.footer-share-btn {
  flex: 1;
  margin-left: 20rpx;
  padding: 24rpx 0;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  border-radius: 50rpx;
  text-align: center;
}

.share-btn-text {
  font-size: 28rpx;
  color: #fff;
  font-weight: 600;
}

.loading-overlay {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fdf6f8;
}

.loading-overlay-text {
  font-size: 28rpx;
  color: #999;
}

</style>
