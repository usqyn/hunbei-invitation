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

    <!-- Body: 左侧预览 + 右侧编辑面板 -->
    <view class="editor-body">
      <!-- 左侧：竖版请柬预览（根据模板动态渲染） -->
      <view class="preview-area">
        <scroll-view class="preview-scroll" scroll-y>
          <!-- 画布模式：admin 发布的绝对定位模板 -->
          <template v-if="isCanvasMode">
            <view class="preview-card preview-card--canvas" :style="canvasCardStyle">
              <view
                v-for="(el, idx) in editorStore.editableElements" :key="idx"
                class="canvas-element"
                :class="{ 'active-element': editorStore.selectedElement === idx }"
                :style="getCanvasElementStyle(el)"
                @click="onOpenEditor(idx)"
              >
                <image
                  v-if="el.type === 'image'"
                  class="canvas-image"
                  :src="el.text"
                  mode="aspectFill"
                  @error="onImageError"
                />
                <text
                  v-else-if="el.type === 'text'"
                  class="canvas-text"
                  :style="getTextStyle(idx)"
                >{{ el.text }}</text>
              </view>
            </view>
            <view class="section info-section">
              <view class="info-card">
                <text class="info-groom">{{ basicInfo.groomName || '新郎姓名' }}</text>
                <text class="info-and">囍</text>
                <text class="info-bride">{{ basicInfo.brideName || '新娘姓名' }}</text>
              </view>
              <text class="info-date">{{ basicInfo.weddingDate || '2050.05.20' }}</text>
              <text class="info-address">{{ basicInfo.detailAddress || '婚贝大酒店9F幸福宴会厅' }}</text>
            </view>
          </template>
          <!-- Flex 模式：静态模板的垂直排列 -->
          <template v-else>
            <view class="preview-card preview-card--flex">
              <block v-for="(el, idx) in editorStore.editableElements" :key="idx">
                <view
                  v-if="el.type === 'image'"
                  class="section image-section"
                  :class="{ 'active-section': editorStore.selectedElement === idx }"
                  @click="onOpenEditor(idx)"
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
                  :class="{ 'active-section': editorStore.selectedElement === idx }"
                  @click="onOpenEditor(idx)"
                >
                  <text
                    class="section-text"
                    :style="getTextStyle(idx)"
                  >{{ el.text }}</text>
                </view>
              </block>
              <view class="section info-section">
                <view class="info-card">
                  <text class="info-groom">{{ basicInfo.groomName || '新郎姓名' }}</text>
                  <text class="info-and">囍</text>
                  <text class="info-bride">{{ basicInfo.brideName || '新娘姓名' }}</text>
                </view>
                <text class="info-date">{{ basicInfo.weddingDate || '2050.05.20' }}</text>
                <text class="info-address">{{ basicInfo.detailAddress || '婚贝大酒店9F幸福宴会厅' }}</text>
              </view>
            </view>
          </template>
        </scroll-view>
      </view>

      <!-- 右侧：编辑面板 -->
      <view class="sidebar-area">
        <RightPanel
          :active-panel-tab="editorStore.activePanelTab"
          :editable-elements="editorStore.editableElements"
          :selected-element="editorStore.selectedElement"
          :material-list="editorStore.materialList"
          :settings="templateStore.settings"
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

    <!-- 编辑基本信息按钮 - 放在预览里 -->
    <view class="edit-info-btn" @click="openBasicInfoEditor">
      <text class="edit-info-text">修改基本信息</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useTemplateStore } from '@/stores/template'
import { useEditorStore } from '@/stores/editor'
import { useWorksStore } from '@/stores/works'
import { DEFAULT_TEMPLATE_ID } from '@/constants/templates'
import RightPanel from './components/RightPanel.vue'
import TextEditorPopup from './components/TextEditorPopup.vue'
import BasicInfoForm from './components/BasicInfoForm.vue'
import type { Material, ElementStyle, EditableElement, Work } from '@/types'

const templateStore = useTemplateStore()
const editorStore = useEditorStore()
const worksStore = useWorksStore()

// 当前模板名
const templateName = computed(() => {
  return templateStore.templateData.coverTitle || '请柬'
})

const basicInfo = computed(() => templateStore.basicInfo)

// 画布模式判断 & 尺寸
const isCanvasMode = computed(() => {
  const first = editorStore.editableElements[0]
  return first && first.x != null
})

const canvasWidth = computed(() => editorStore.canvasSize?.width || 375)
const canvasHeight = computed(() => editorStore.canvasSize?.height || 667)

const canvasCardStyle = computed(() => ({
  aspectRatio: `${canvasWidth.value} / ${canvasHeight.value}`,
  width: '100%',
}))

// 画布模式下获取元素的绝对定位样式
function getCanvasElementStyle(el: EditableElement) {
  if (el.x == null) return {}
  const imgStyle: Record<string, string> = {}
  if (el.type === 'image' && el.style?.borderRadius) {
    imgStyle.borderRadius = el.style.borderRadius + 'rpx'
  }
  return {
    position: 'absolute',
    left: `${(el.x / canvasWidth.value) * 100}%`,
    top: `${(el.y! / canvasHeight.value) * 100}%`,
    width: `${(el.width! / canvasWidth.value) * 100}%`,
    height: `${(el.height! / canvasHeight.value) * 100}%`,
    zIndex: el.zIndex ?? 0,
    opacity: el.opacity ?? 1,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    ...imgStyle,
  }
}

// 根据元素索引获取样式
function getTextStyle(idx: number) {
  const el = editorStore.editableElements[idx]
  if (!el || !el.style) {
    return {
      fontSize: '30rpx',
      color: '#333333',
      lineHeight: 1.6,
      letterSpacing: '2rpx',
    }
  }

  const style: ElementStyle = el.style

  return {
    fontSize: style.fontSize + 'rpx',
    color: style.color,
    lineHeight: String(style.lineHeight),
    letterSpacing: style.spacing + 'rpx',
    fontFamily: style.font,
    fontWeight: style.fontWeight || 'normal',
    textAlign: style.textAlign || 'center',
  }
}

// 打开编辑器
function onOpenEditor(idx: number) {
  const el = editorStore.editableElements[idx]
  if (el.editable === false) {
    uni.showToast({ title: '该元素不可编辑', icon: 'none' })
    return
  }
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

// 切换设置
function toggleSetting(key: string) {
  templateStore.toggleSetting(key)
}

function goBack() {
  uni.navigateBack({ delta: 1 })
}

function onImageError() {}

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
  const id = editorStore.currentWorkId || Date.now()
  if (!editorStore.currentWorkId) {
    editorStore.setCurrentWorkId(id)
  }
  const work: Work = {
    id,
    title: templateStore.templateData.coverTitle || '未命名作品',
    date: new Date().toLocaleDateString('zh-CN'),
    image: templateStore.templateData.coverImage,
    templateType: editorStore.currentTemplateId,
    status: 'draft',
  }
  worksStore.saveAsWork(work)
  uni.showToast({ title: '已保存', icon: 'success' })
}

function handleShare() {
  handleSave()
  uni.navigateTo({ url: '/pages/preview/index' })
}

// 页面加载时根据参数切换模板
onMounted(() => {
  const pages = getCurrentPages()
  const curPage = pages[pages.length - 1] as any
  const options = curPage?.options || {}

  if (options.templateId) {
    // 如果 URL 中有 templateId 参数，切换到该模板
    editorStore.loadTemplateById(options.templateId)
  } else {
    // 否则默认加载第一个模板
    editorStore.loadTemplateById(DEFAULT_TEMPLATE_ID)
  }
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

/* 新人信息区块 */
.info-section {
  padding: 40rpx 20rpx;
  background: #fff8fa;
  border-radius: 12rpx;
  text-align: center;
}

.info-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.info-groom, .info-bride {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
}

.info-and {
  font-size: 40rpx;
  color: #e84a6e;
  font-weight: 700;
}

.info-date {
  font-size: 30rpx;
  color: #666;
  display: block;
  margin-bottom: 10rpx;
  letter-spacing: 6rpx;
}

.info-address {
  font-size: 24rpx;
  color: #999;
  display: block;
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
  background: #fff;
  border-radius: 12rpx;
  overflow: hidden;
}

.canvas-element {
  overflow: hidden;
}

.canvas-image {
  width: 100%;
  height: 100%;
  display: block;
}

.canvas-text {
  display: block;
  word-break: break-all;
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

/* Edit Info Button */
.edit-info-btn {
  position: absolute;
  right: 30rpx;
  top: 180rpx;
  padding: 16rpx 24rpx;
  background: rgba(232, 74, 110, 0.9);
  border-radius: 40rpx;
}

.edit-info-text {
  font-size: 22rpx;
  color: #fff;
}
</style>
