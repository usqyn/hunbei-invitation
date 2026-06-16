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
      <!-- 左侧：竖版请柬预览 -->
      <view class="preview-area">
        <scroll-view class="preview-scroll" scroll-y>
          <view class="preview-card">
            <!-- Cover Section -->
            <view class="section cover-section">
              <image class="cover-image" :src="editableElements[0].text" mode="aspectFill" @error="onImageError"></image>
              <view class="cover-top">
                <text class="cover-top-left">OUR WEDDING</text>
                <text class="cover-top-right">INVITATION</text>
              </view>
              <view class="cover-overlay">
                <text class="cover-date" :style="elementStyles[1]">{{ editableElements[1].text }}</text>
                <text class="cover-main-title" :style="elementStyles[2]">{{ editableElements[2].text }}</text>
                <text class="cover-subtitle" :style="elementStyles[3]">{{ editableElements[3].text }}</text>
                <view class="cover-shuangxi-wrapper">
                  <text class="shuangxi-text">{{ editableElements[4].text }}</text>
                  <text class="arabic-left" :style="elementStyles[5]">{{ editableElements[5].text }}</text>
                  <text class="arabic-right" :style="elementStyles[6]">{{ editableElements[6].text }}</text>
                </view>
              </view>
            </view>

            <!-- Vinyl Record Section -->
            <view class="section vinyl-section">
              <image class="vinyl-image" :src="editableElements[7].text" mode="aspectFill" @error="onImageError"></image>
            </view>

            <!-- Invitation Title -->
            <view class="section invite-title-section">
              <text class="invite-title" :style="elementStyles[8]">{{ editableElements[8].text }}</text>
              <text class="invite-title-en" :style="elementStyles[9]">{{ editableElements[9].text }}</text>
            </view>

            <!-- Body Paragraphs -->
            <view class="section body-text-section">
              <text class="body-text" :style="elementStyles[10]">{{ editableElements[10].text }}</text>
            </view>

            <!-- Couple Info -->
            <view class="section couple-info-section">
              <view class="couple-names">
                <text class="name">{{ t.basicInfo.groomName || '满小满' }}</text>
                <text class="groom-bride">GROOM</text>
              </view>
              <text class="shuangxi-icon">囍</text>
              <view class="couple-names">
                <text class="name">{{ t.basicInfo.brideName || '美小美' }}</text>
                <text class="groom-bride">BRIDE</text>
              </view>
              <text class="wedding-date">{{ t.basicInfo.weddingDate || '2050.05.20' }}</text>
              <text class="wedding-address">{{ t.basicInfo.detailAddress || '婚贝大酒店9F幸福宴会厅' }}</text>
            </view>

            <!-- Footer Border -->
            <view class="section footer-border">
              <text class="footer-text-left">WEDDING</text>
              <text class="footer-text-center">INVITATION</text>
              <text class="footer-text-right">2050</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 右侧：编辑面板 -->
      <view class="sidebar-area">
        <RightPanel
          :active-panel-tab="editorStore.activePanelTab"
          :editable-elements="editorStore.editableElements"
          :selected-element="editorStore.selectedElement"
          :material-list="editorStore.materialList"
          :current-font="editorStore.currentFont"
          :current-color="editorStore.currentColor"
          :current-font-size="editorStore.currentFontSize"
          :current-spacing="editorStore.currentSpacing"
          :current-line-height="editorStore.currentLineHeight"
          :settings="t.settings"
          @update:active-panel-tab="editorStore.activePanelTab = $event"
          @open-editor="onOpenEditor"
          @select-material="onSelectMaterial"
          @show-font-picker="showFontPickerModal = true"
          @show-color-picker="showColorPickerModal = true"
          @decrease-font-size="editorStore.decreaseFontSize"
          @increase-font-size="editorStore.increaseFontSize"
          @decrease-spacing="editorStore.decreaseSpacing"
          @increase-spacing="editorStore.increaseSpacing"
          @decrease-line-height="editorStore.decreaseLineHeight"
          @increase-line-height="editorStore.increaseLineHeight"
          @reset-style="editorStore.resetStyle"
          @toggle-setting="t.toggleSetting"
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
      :text="editorStore.editingText"
      :current-font="editorStore.currentFont"
      :current-color="editorStore.currentColor"
      :current-font-size="editorStore.currentFontSize"
      :current-spacing="editorStore.currentSpacing"
      :current-line-height="editorStore.currentLineHeight"
      @update:text="editorStore.editingText = $event"
      @close="editorStore.closeTextEditor"
      @confirm="editorStore.confirmTextEdit"
      @show-font-picker="showFontPickerModal = true"
      @show-color-picker="showColorPickerModal = true"
      @decrease-font-size="editorStore.decreaseFontSize"
      @increase-font-size="editorStore.increaseFontSize"
      @decrease-spacing="editorStore.decreaseSpacing"
      @increase-spacing="editorStore.increaseSpacing"
      @decrease-line-height="editorStore.decreaseLineHeight"
      @increase-line-height="editorStore.increaseLineHeight"
      @reset-style="editorStore.resetStyle"
    />

    <!-- Basic Info Popup -->
    <BasicInfoForm
      v-if="editorStore.showBasicInfoEditor"
      :groom-name="t.basicInfo.groomName"
      :bride-name="t.basicInfo.brideName"
      :wedding-date="t.basicInfo.weddingDate"
      :location="t.basicInfo.location"
      :detail-address="t.basicInfo.detailAddress"
      @close="editorStore.closeBasicInfoEditor"
      @update:groom-name="(v: string) => t.basicInfo.groomName = v"
      @update:bride-name="(v: string) => t.basicInfo.brideName = v"
      @update:wedding-date="(v: string) => t.basicInfo.weddingDate = v"
      @update:location="(v: string) => t.basicInfo.location = v"
      @update:detail-address="(v: string) => t.basicInfo.detailAddress = v"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTemplateStore } from '@/stores/template'
import { useEditorStore } from '@/stores/editor'
import RightPanel from './components/RightPanel.vue'
import TextEditorPopup from './components/TextEditorPopup.vue'
import BasicInfoForm from './components/BasicInfoForm.vue'
import type { Material } from '@/types'

const t = useTemplateStore()
const editorStore = useEditorStore()

const showFontPickerModal = ref(false)
const showColorPickerModal = ref(false)
const selectedPreviewIdx = computed(() => editorStore.selectedElement)
const currentPageIndex = ref(0)

const editableElements = computed(() => editorStore.editableElements)

const elementStyles = computed(() => {
  return editorStore.editableElements.map(el => {
    if (!el.style) return {}
    return {
      fontFamily: el.style.font,
      color: el.style.color,
      fontSize: el.style.fontSize + 'rpx',
      letterSpacing: el.style.spacing + 'rpx',
      lineHeight: String(el.style.lineHeight),
    }
  })
})

const pageList = [
  { type: 'cover', image: editorStore.editableElements[0].text },
  { type: 'info', image: '' },
  { type: 'footer', image: '' },
]

function goBack() {
  uni.navigateBack({ delta: 1 })
}

function onImageError() {}

function onOpenEditor(idx: number) {
  const el = editorStore.editableElements[idx]
  editorStore.selectedElement = idx
  if (el.type === 'image') {
    // 本地选择图片
    chooseLocalImage(idx)
  } else if (el.type === 'text') {
    editorStore.syncCurrentFromElement(idx)
    editorStore.editingText = el.text
    editorStore.showTextEditor = true
  } else if (el.type === 'basic') {
    editorStore.showBasicInfoEditor = true
  }
}

function chooseLocalImage(idx: number) {
  // #ifdef MP-WEIXIN
  uni.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      if (res.tempFiles && res.tempFiles.length > 0) {
        const tempFilePath = res.tempFiles[0].tempFilePath
        applyImageToElement(idx, tempFilePath)
      }
    },
    fail: () => {
      uni.showToast({ title: '图片选择失败', icon: 'none' })
    }
  })
  // #endif
  // #ifndef MP-WEIXIN
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        const tempFilePath = res.tempFilePaths[0]
        applyImageToElement(idx, tempFilePath)
      }
    },
    fail: () => {
      uni.showToast({ title: '图片选择失败', icon: 'none' })
    }
  })
  // #endif
}

function applyImageToElement(idx: number, url: string) {
  const el = editorStore.editableElements[idx]
  el.text = url
  if (el.dataKey) {
    t.updateField(el.dataKey, url)
  }
  editorStore.selectedElement = null
  uni.showToast({ title: '图片已替换', icon: 'success' })
}

function onSelectMaterial(material: Material) {
  if (editorStore.selectedElement === null) return
  const el = editorStore.editableElements[editorStore.selectedElement]
  if (el.type !== 'image') return
  applyImageToElement(editorStore.selectedElement, material.url)
}

function handleMusic() {
  uni.navigateTo({ url: '/pages/music/index' })
}

function handleSettings() {
  uni.showActionSheet({
    itemList: ['礼物功能', '礼金功能', '点赞功能', '相册功能'],
    success: (res) => {
      const keys = ['giftAlbum', 'moneyGift', 'like', 'album']
      const key = keys[res.tapIndex]
      if (key) t.toggleSetting(key)
    }
  })
}

function handleSave() {
  uni.showToast({ title: '已保存', icon: 'success' })
}

function handleShare() {
  uni.showToast({ title: '即将生成预览', icon: 'none' })
}
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
  padding: 20rpx;
  gap: 20rpx;
}

/* Preview Area */
.preview-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  min-height: 0;
}

.preview-scroll {
  flex: 1;
  height: 100%;
  min-height: 0;
}

.preview-card {
  display: flex;
  flex-direction: column;
  padding: 20rpx;
  gap: 20rpx;
}

.section {
  position: relative;
  width: 100%;
}

/* Cover Section */
.cover-section {
  border-radius: 16rpx;
  overflow: hidden;
  aspect-ratio: 3 / 4;
}

.cover-image {
  width: 100%;
  height: 100%;
}

.cover-top {
  position: absolute;
  top: 24rpx;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 0 30rpx;
}

.cover-top-left, .cover-top-right {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 4rpx;
  font-weight: 300;
}

.cover-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  top: 30%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 30rpx;
}

.cover-date {
  font-size: 36rpx;
  color: #fff;
  letter-spacing: 4rpx;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
  font-weight: 400;
}

.cover-main-title {
  font-size: 56rpx;
  color: #fff;
  font-weight: 600;
  text-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.4);
  letter-spacing: 4rpx;
}

.cover-subtitle {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.9);
  font-style: italic;
  letter-spacing: 2rpx;
}

.cover-shuangxi-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  margin-top: 20rpx;
}

.shuangxi-text {
  font-size: 48rpx;
  color: #ff3366;
  font-weight: 700;
}

.arabic-left, .arabic-right {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.9);
  font-family: 'Arial', sans-serif;
}

/* Vinyl Section */
.vinyl-section {
  display: flex;
  justify-content: center;
  padding: 30rpx 0;
}

.vinyl-image {
  width: 360rpx;
  height: 360rpx;
  border-radius: 50%;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
}

/* Invite Title Section */
.invite-title-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 30rpx 0;
}

.invite-title {
  font-size: 40rpx;
  font-weight: 600;
  color: #333;
}

.invite-title-en {
  font-size: 24rpx;
  color: #999;
  font-style: italic;
  letter-spacing: 2rpx;
}

/* Body Text Section */
.body-text-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 30rpx;
}

.body-text {
  font-size: 26rpx;
  color: #666;
  line-height: 2;
  text-align: center;
}

/* Couple Info */
.couple-info-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 30rpx;
  gap: 16rpx;
}

.couple-names {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.name {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.groom-bride {
  font-size: 18rpx;
  color: #999;
  letter-spacing: 2rpx;
}

.shuangxi-icon {
  font-size: 40rpx;
  color: #e84a6e;
  font-weight: 700;
  margin: 8rpx 0;
}

.wedding-date {
  font-size: 28rpx;
  color: #e84a6e;
  font-weight: 500;
}

.wedding-address {
  font-size: 24rpx;
  color: #666;
  margin-top: 8rpx;
}

/* Footer Border */
.footer-border {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 30rpx;
  border-top: 2rpx solid #e84a6e;
  border-bottom: 2rpx solid #e84a6e;
  margin-top: 20rpx;
}

.footer-text-left, .footer-text-right, .footer-text-center {
  font-size: 22rpx;
  color: #e84a6e;
  letter-spacing: 3rpx;
  font-weight: 500;
}

/* Sidebar Area */
.sidebar-area {
  width: 360rpx;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Editor Footer */
.editor-footer {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  background: #fff;
  border-top: 1rpx solid #f0e0e5;
  flex-shrink: 0;
  gap: 20rpx;
}

.footer-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 16rpx;
}

.footer-icon {
  font-size: 36rpx;
}

.footer-label {
  font-size: 20rpx;
  color: #666;
}

.footer-share-btn {
  flex: 1;
  margin-left: 20rpx;
  padding: 20rpx 40rpx;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(232, 74, 110, 0.3);
}

.share-btn-text {
  font-size: 28rpx;
  color: #fff;
  font-weight: 600;
}
</style>
