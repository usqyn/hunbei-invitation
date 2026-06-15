<template>
  <view class="editor-page">
    <view class="editor-header">
      <view class="header-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="header-title">编辑器</text>
      <view class="header-actions">
        <view class="header-action" @click="handleShare">
          <text class="action-icon">🔗</text>
        </view>
        <view class="header-action" @click="handleMore">
          <text class="action-icon">⋯</text>
        </view>
      </view>
    </view>

    <view class="editor-body">
      <view class="canvas-wrapper">
        <scroll-view class="canvas-scroll" scroll-y>
          <view class="canvas-container">
            <view class="canvas-preview">
              <view class="page-content">
                <view class="section cover-section">
                  <image class="cover-image" :src="templateStore.templateData.coverImage" mode="aspectFill" @error="onImageError"></image>
                  <view class="cover-overlay">
                    <text class="shuangxi-decor">囍</text>
                    <text class="cover-title">{{ templateStore.templateData.coverTitle }}</text>
                    <text class="cover-subtitle">{{ templateStore.templateData.coverSubtitle }}</text>
                  </view>
                </view>

                <view class="section couple-info-section">
                  <view class="couple-info-content">
                    <view class="person-info">
                      <text class="person-name">{{ templateStore.basicInfo.groomName || '满小满' }}</text>
                      <text class="person-role">新郎</text>
                    </view>
                    <text class="heart-divider">♥</text>
                    <view class="person-info">
                      <text class="person-name">{{ templateStore.basicInfo.brideName || '美小美' }}</text>
                      <text class="person-role">新娘</text>
                    </view>
                  </view>
                  <text class="wedding-date">{{ templateStore.basicInfo.weddingDate || '2050/05/20' }}</text>
                </view>

                <view class="section photo-section">
                  <image class="photo-image" :src="templateStore.templateData.photo1" mode="aspectFill" @error="onImageError"></image>
                </view>

                <view class="section photo-section">
                  <image class="photo-image" :src="templateStore.templateData.photo2" mode="aspectFill" @error="onImageError"></image>
                </view>

                <view class="section wedding-info-section">
                  <view class="info-item">
                    <text class="info-icon">📅</text>
                    <view class="info-content">
                      <text class="info-label">婚礼时间</text>
                      <text class="info-value">{{ templateStore.basicInfo.weddingDate || '2050年5月20日 星期六' }}</text>
                      <text class="info-value">农历四月廿三 12:00PM</text>
                    </view>
                  </view>
                  <view class="info-item">
                    <text class="info-icon">📍</text>
                    <view class="info-content">
                      <text class="info-label">婚礼地点</text>
                      <text class="info-value">{{ templateStore.basicInfo.detailAddress || '婚贝大酒店9F幸福宴会厅' }}</text>
                    </view>
                  </view>
                </view>

                <view class="section address-section">
                  <text class="address-label">ADDRESS</text>
                  <text class="address-detail">{{ templateStore.basicInfo.detailAddress || '婚贝大酒店9F幸福宴会厅' }}</text>
                </view>

                <view class="section map-section" @click="handleLocation">
                  <view class="map-placeholder">
                    <text class="map-text">{{ templateStore.basicInfo.location || '点击选择位置' }}</text>
                    <view class="map-marker">📍</view>
                  </view>
                </view>

                <view class="section photo-section">
                  <image class="photo-image" :src="templateStore.templateData.photo3" mode="aspectFill" @error="onImageError"></image>
                  <view class="photo-text-overlay">
                    <text class="photo-title">{{ templateStore.templateData.photoTitle }}</text>
                    <text class="photo-subtitle">{{ templateStore.templateData.photoSubtitle }}</text>
                  </view>
                </view>

                <view class="section photo-section">
                  <image class="photo-image" :src="templateStore.templateData.photo4" mode="aspectFill" @error="onImageError"></image>
                </view>

                <view class="section countdown-section">
                  <view class="countdown-box">
                    <text class="countdown-num">{{ countdown.days }}</text>
                    <text class="countdown-label">天</text>
                  </view>
                  <view class="countdown-box">
                    <text class="countdown-num">{{ countdown.hours }}</text>
                    <text class="countdown-label">时</text>
                  </view>
                  <view class="countdown-box">
                    <text class="countdown-num">{{ countdown.minutes }}</text>
                    <text class="countdown-label">分</text>
                  </view>
                  <view class="countdown-box">
                    <text class="countdown-num">{{ countdown.seconds }}</text>
                    <text class="countdown-label">秒</text>
                  </view>
                </view>

                <view class="section signin-section">
                  <text class="signin-title">好久不见</text>
                  <text class="signin-subtitle">婚礼见~</text>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="panel-wrapper">
        <RightPanel
          v-model:activePanelTab="editorStore.activePanelTab"
          :editableElements="editableElements"
          :selectedElement="editorStore.selectedElement"
          :materialList="materialList"
          :currentFont="currentFont"
          :currentColor="currentColor"
          :currentFontSize="currentFontSize"
          :currentSpacing="currentSpacing"
          :currentLineHeight="currentLineHeight"
          :settings="templateStore.settings"
          @openEditor="handleOpenEditor"
          @selectMaterial="handleSelectMaterial"
          @showFontPicker="showFontPicker"
          @showColorPicker="showColorPicker"
          @decreaseFontSize="decreaseFontSize"
          @increaseFontSize="increaseFontSize"
          @decreaseSpacing="decreaseSpacing"
          @increaseSpacing="increaseSpacing"
          @decreaseLineHeight="decreaseLineHeight"
          @increaseLineHeight="increaseLineHeight"
          @resetStyle="editorStore.resetStyle"
          @toggleSetting="templateStore.toggleSetting"
          @imageError="onImageError"
        />
      </view>
    </view>

    <view class="editor-footer">
      <view class="footer-btn" @click="handleMusic">
        <text class="footer-icon">🎵</text>
        <text class="footer-text">音乐</text>
      </view>
      <view class="footer-btn" @click="handleSettings">
        <text class="footer-icon">⚙️</text>
        <text class="footer-text">设置</text>
      </view>
      <view class="footer-btn save-btn" @click="handleSave">
        <view class="save-icon-wrapper">
          <text class="footer-icon">💾</text>
          <text class="save-check-mark">✓</text>
        </view>
        <text class="footer-text">保存</text>
      </view>
      <view class="preview-share" @click="handlePreviewShare">
        <text class="preview-text">预览分享</text>
      </view>
    </view>

    <BasicInfoForm
      :visible="showBasicInfoEditor"
      :basicInfo="templateStore.basicInfo"
      @close="editorStore.closeBasicInfoEditor"
      @confirm="confirmBasicInfo"
      @location="handleLocation"
      @datePicker="showDatePicker = true"
    />

    <TextEditorPopup
      :visible="showTextEditor"
      :editingText="editingText"
      :currentFont="currentFont"
      :currentColor="currentColor"
      :currentFontSize="currentFontSize"
      :currentSpacing="currentSpacing"
      :currentLineHeight="currentLineHeight"
      @close="editorStore.closeTextEditor"
      @confirm="confirmTextEdit"
      @showFontPicker="showFontPicker"
      @showColorPicker="showColorPicker"
      @decreaseFontSize="decreaseFontSize"
      @increaseFontSize="increaseFontSize"
      @decreaseSpacing="decreaseSpacing"
      @increaseSpacing="increaseSpacing"
      @decreaseLineHeight="decreaseLineHeight"
      @increaseLineHeight="increaseLineHeight"
      @resetStyle="editorStore.resetStyle"
      @input="onTextInput"
    />
  </view>
</template>

<script setup lang="ts">
import { useEditor } from './composables/useEditor'
import RightPanel from './components/RightPanel.vue'
import BasicInfoForm from './components/BasicInfoForm.vue'
import TextEditorPopup from './components/TextEditorPopup.vue'

const {
  templateStore, editorStore,
  showTextEditor, showBasicInfoEditor, editingText,
  currentFont, currentColor, currentFontSize,
  currentSpacing, currentLineHeight,
  editableElements, materialList, showDatePicker,
  countdown,
  goBack, handleShare, handleMore, onTextInput,
  confirmBasicInfo, confirmTextEdit,
  handleMusic, handleSettings, handleSave,
  handlePreviewShare, handleLocation,
  onImageError,
} = useEditor()

const showFontPicker = () => {
  uni.showToast({ title: '字体选择', icon: 'none' })
}

const showColorPicker = () => {
  uni.showToast({ title: '颜色选择', icon: 'none' })
}

const decreaseFontSize = () => {
  if (editorStore.currentFontSize > 8) editorStore.currentFontSize--
}

const increaseFontSize = () => {
  if (editorStore.currentFontSize < 100) editorStore.currentFontSize++
}

const decreaseSpacing = () => {
  if (editorStore.currentSpacing > 0) editorStore.currentSpacing--
}

const increaseSpacing = () => {
  editorStore.currentSpacing++
}

const decreaseLineHeight = () => {
  if (editorStore.currentLineHeight > 1) editorStore.currentLineHeight--
}

const increaseLineHeight = () => {
  editorStore.currentLineHeight++
}

const handleOpenEditor = (idx: number) => {
  editorStore.openEditor(idx)
}

const handleSelectMaterial = (material: any) => {
  editorStore.selectMaterial(material)
}
</script>

<style lang="scss" scoped>
.editor-page {
  min-height: 100vh;
  background: var(--color-bg-page);
  display: flex;
  flex-direction: column;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background: var(--color-bg-white);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.header-back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 56rpx;
  color: var(--color-text-primary);
  font-weight: 300;
  line-height: 1;
}

.header-title {
  font-size: 34rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.header-actions {
  display: flex;
  gap: 16rpx;
}

.header-action {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-icon {
  font-size: 36rpx;
}

.editor-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 20rpx;
  gap: 20rpx;
}

.canvas-wrapper {
  flex: 0 0 auto;
  background: #f0f0f0;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-light);
  max-height: 55vh;
}

.canvas-scroll {
  width: 100%;
  height: 100%;
  max-height: 55vh;
}

.canvas-container {
  padding: 24rpx;
}

.canvas-preview {
  width: 100%;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: #fff;
  box-shadow: 0 4rpx 24rpx rgba(232, 74, 110, 0.08);
}

.page-content {
  width: 100%;
  position: relative;
}

.section {
  width: 100%;
  position: relative;
  overflow: hidden;
}

.cover-section {
  height: 600rpx;
}

.cover-image {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.cover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 100%);
}

.shuangxi-decor {
  font-size: 100rpx;
  color: var(--color-primary);
  font-weight: bold;
  text-shadow: 2rpx 2rpx 12rpx rgba(0,0,0,0.3);
}

.cover-title {
  font-size: 52rpx;
  color: #fff;
  font-weight: bold;
  text-shadow: 2rpx 2rpx 12rpx rgba(0,0,0,0.5);
  margin-top: 32rpx;
}

.cover-subtitle {
  font-size: 26rpx;
  color: #fff;
  text-shadow: 2rpx 2rpx 8rpx rgba(0,0,0,0.5);
  margin-top: 16rpx;
  letter-spacing: 8rpx;
}

.couple-info-section {
  padding: 60rpx 32rpx;
  background: #fff;
}

.couple-info-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 48rpx;
}

.person-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.person-name {
  font-size: 38rpx;
  color: var(--color-text-primary);
  font-weight: 600;
}

.person-role {
  font-size: 22rpx;
  color: var(--color-text-secondary);
  margin-top: 8rpx;
  letter-spacing: 2rpx;
}

.heart-divider {
  font-size: 36rpx;
  color: var(--color-primary);
}

.wedding-date {
  display: block;
  text-align: center;
  font-size: 32rpx;
  color: var(--color-primary);
  margin-top: 32rpx;
  font-weight: 600;
}

.photo-section {
  width: 100%;
  height: 500rpx;
  position: relative;
}

.photo-image {
  width: 100%;
  height: 100%;
}

.photo-text-overlay {
  position: absolute;
  bottom: 60rpx;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.photo-title {
  font-size: 48rpx;
  color: var(--color-primary);
  font-weight: bold;
  text-shadow: 2rpx 2rpx 8rpx rgba(0,0,0,0.1);
}

.photo-subtitle {
  font-size: 40rpx;
  color: var(--color-primary);
  font-weight: bold;
  margin-top: 8rpx;
  text-shadow: 2rpx 2rpx 8rpx rgba(0,0,0,0.1);
}

.countdown-section {
  padding: 48rpx 32rpx;
  background: #fff;
  display: flex;
  justify-content: center;
  gap: 20rpx;
}

.countdown-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 2rpx solid var(--color-primary);
  border-radius: 12rpx;
  padding: 16rpx 24rpx;
  min-width: 100rpx;
  background: linear-gradient(180deg, #fff5f5 0%, #ffe4e8 100%);
}

.countdown-num {
  font-size: 40rpx;
  color: var(--color-primary);
  font-weight: bold;
}

.countdown-label {
  font-size: 22rpx;
  color: var(--color-primary);
  margin-top: 8rpx;
}

.address-section {
  padding: 48rpx 32rpx;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.address-label {
  font-size: 22rpx;
  color: var(--color-primary);
  letter-spacing: 8rpx;
}

.address-detail {
  font-size: 28rpx;
  color: var(--color-text-primary);
  font-weight: 500;
}

.map-section {
  height: 280rpx;
  background: #e8f4ff;
}

.map-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

.map-text {
  font-size: 26rpx;
  color: var(--color-text-primary);
  text-align: center;
  padding: 0 40rpx;
}

.map-marker {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 44rpx;
  opacity: 0.6;
}

.wedding-info-section {
  padding: 48rpx 32rpx;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.info-item {
  display: flex;
  gap: 20rpx;
  align-items: flex-start;
}

.info-icon {
  font-size: 32rpx;
  margin-top: 4rpx;
}

.info-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.info-label {
  font-size: 26rpx;
  color: var(--color-text-primary);
  font-weight: 600;
}

.info-value {
  font-size: 24rpx;
  color: var(--color-text-secondary);
}

.signin-section {
  padding: 60rpx 32rpx;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.signin-title {
  font-size: 52rpx;
  color: var(--color-primary);
  font-weight: bold;
}

.signin-subtitle {
  font-size: 40rpx;
  color: var(--color-primary);
  font-weight: bold;
  margin-top: 8rpx;
}

.panel-wrapper {
  flex: 1;
  min-height: 0;
  background: #fff;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-light);
}

.editor-footer {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  background: #fff;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  border-top: 1px solid var(--color-border);
  gap: 16rpx;
  flex-shrink: 0;
}

.footer-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: 8rpx 16rpx;
}

.save-icon-wrapper {
  position: relative;
}

.save-check-mark {
  position: absolute;
  bottom: -4rpx;
  right: -4rpx;
  width: 28rpx;
  height: 28rpx;
  background: #4cd964;
  color: #fff;
  border-radius: 50%;
  font-size: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.footer-icon {
  font-size: 36rpx;
}

.footer-text {
  font-size: 22rpx;
  color: var(--color-text-secondary);
}

.preview-share {
  margin-left: auto;
  background: linear-gradient(135deg, var(--color-primary) 0%, #ff6b8a 100%);
  color: #fff;
  border-radius: 40rpx;
  padding: 20rpx 40rpx;
  box-shadow: 0 4rpx 16rpx rgba(232, 74, 110, 0.3);
}

.preview-text {
  font-size: 28rpx;
  font-weight: 600;
}
</style>
