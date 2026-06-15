<template>
  <view class="page">
    <view class="header">
      <view class="back-btn" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <view class="header-title">编辑器</view>
      <view class="header-right">
        <view class="header-btn" @click="handleShare">
          <text class="btn-icon">🔗</text>
        </view>
        <view class="header-btn" @click="handleMore">
          <text class="btn-icon">⋯</text>
        </view>
      </view>
    </view>

    <view class="editor-main">
      <EditorCanvas
        :templateData="templateStore.templateData"
        :basicInfo="templateStore.basicInfo"
        :countdown="countdown"
        :signinForm="signinForm"
        @signin="handleSignin"
        @location="handleLocation"
        @imageError="onImageError"
      />

      <RightPanel
        v-model:activePanelTab="editorStore.activePanelTab"
        :editableElements="editableElements"
        :selectedElement="editorStore.selectedElement"
        :materialList="materialList"
        :currentFont="editorStore.currentFont"
        :currentColor="editorStore.currentColor"
        :currentFontSize="editorStore.currentFontSize"
        :currentSpacing="editorStore.currentSpacing"
        :currentLineHeight="editorStore.currentLineHeight"
        :settings="templateStore.settings"
        @openEditor="editorStore.openEditor"
        @selectMaterial="selectMaterial"
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

    <view class="bottom-bar">
      <view class="bottom-btn" @click="handleMusic">
        <text class="btn-icon">🎵</text>
        <text class="btn-text">音乐</text>
      </view>
      <view class="bottom-btn" @click="handleSettings">
        <text class="btn-icon">⚙️</text>
        <text class="btn-text">设置</text>
      </view>
      <view class="bottom-btn" @click="handleSave">
        <view class="save-icon-wrapper">
          <text class="btn-icon">💾</text>
          <text class="save-check">✓</text>
        </view>
        <text class="btn-text">保存</text>
      </view>
      <button class="preview-btn" @click="handlePreviewShare">预览分享</button>
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
      :currentFont="editorStore.currentFont"
      :currentColor="editorStore.currentColor"
      :currentFontSize="editorStore.currentFontSize"
      :currentSpacing="editorStore.currentSpacing"
      :currentLineHeight="editorStore.currentLineHeight"
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
import EditorCanvas from './components/EditorCanvas.vue'
import RightPanel from './components/RightPanel.vue'
import BasicInfoForm from './components/BasicInfoForm.vue'
import TextEditorPopup from './components/TextEditorPopup.vue'

const {
  templateStore, editorStore,
  showTextEditor, showBasicInfoEditor, editingText,
  currentFont, currentColor, currentFontSize,
  currentSpacing, currentLineHeight,
  editableElements, materialList, showDatePicker,
  signinForm, countdown,
  goBack, handleShare, handleMore, onTextInput,
  confirmBasicInfo, confirmTextEdit, selectMaterial,
  handleMusic, handleSettings, handleSave,
  handlePreviewShare, handleLocation, handleSignin,
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
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--color-bg-page);
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  background: var(--color-bg-white);
}

.back-btn {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 60rpx;
  color: var(--color-text-primary);
  font-weight: 300;
}

.header-title {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.header-right {
  display: flex;
  gap: 20rpx;
}

.header-btn {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon {
  font-size: 40rpx;
}

.editor-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  padding: 20rpx;
  height: 0;
}

.bottom-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  background: #fff;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  border-top: 1px solid var(--color-border);
  gap: 20rpx;
}

.bottom-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5rpx;
  padding: 10rpx 20rpx;
}

.save-icon-wrapper {
  position: relative;
}

.save-check {
  position: absolute;
  bottom: -5rpx;
  right: -5rpx;
  width: 30rpx;
  height: 30rpx;
  background: #4cd964;
  color: #fff;
  border-radius: 50%;
  font-size: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-text {
  font-size: 24rpx;
  color: #666;
}

.preview-btn {
  margin-left: auto;
  background: var(--color-primary-gradient);
  color: #fff;
  border: none;
  border-radius: 40rpx;
  padding: 24rpx 60rpx;
  font-size: 32rpx;
  font-weight: 600;

  &::after {
    border: none;
  }
}
</style>
