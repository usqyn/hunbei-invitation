<template>
  <view v-if="visible" class="text-editor-popup" @click="$emit('close')">
    <view class="editor-content" @click.stop>
      <view class="editor-header">
        <text class="close-btn" @click="$emit('close')">✕</text>
        <text class="editor-title">修改文字</text>
        <text class="confirm-btn" @click="$emit('confirm')">✓</text>
      </view>

      <view class="text-area">
        <textarea
          class="text-input"
          :value="editingText"
          @input="onInput"
          :maxlength="500"
        ></textarea>
      </view>

      <view class="style-options">
        <view class="style-row">
          <view class="style-label">
            <text class="label-icon">𝔗</text>
            <text class="label-text">字体</text>
          </view>
          <view class="style-value" @click="$emit('showFontPicker')">
            <text class="value-text">{{ currentFont }}</text>
            <text class="arrow">›</text>
          </view>
        </view>
        <view class="style-row">
          <view class="style-label">
            <text class="label-icon">🖊</text>
            <text class="label-text">字体颜色</text>
          </view>
          <view class="style-value" @click="$emit('showColorPicker')">
            <view class="color-preview" :style="{ background: currentColor }"></view>
            <text class="arrow">›</text>
          </view>
        </view>
        <view class="style-row">
          <view class="style-label">
            <text class="label-icon">Aa</text>
            <text class="label-text">字体大小</text>
          </view>
          <view class="font-size-controls">
            <view class="size-btn" @click="$emit('decreaseFontSize')">—</view>
            <text class="size-value">{{ currentFontSize }}</text>
            <view class="size-btn" @click="$emit('increaseFontSize')">+</view>
          </view>
        </view>
        <view class="style-row">
          <view class="style-label">
            <text class="label-icon">⫿</text>
            <text class="label-text">字符间距</text>
          </view>
          <view class="font-size-controls">
            <view class="size-btn" @click="$emit('decreaseSpacing')">—</view>
            <text class="size-value">{{ currentSpacing }}</text>
            <view class="size-btn" @click="$emit('increaseSpacing')">+</view>
          </view>
        </view>
        <view class="style-row">
          <view class="style-label">
            <text class="label-icon">Ā</text>
            <text class="label-text">行间距</text>
          </view>
          <view class="font-size-controls">
            <view class="size-btn" @click="$emit('decreaseLineHeight')">—</view>
            <text class="size-value">{{ currentLineHeight }}</text>
            <view class="size-btn" @click="$emit('increaseLineHeight')">+</view>
          </view>
        </view>
        <view class="reset-btn" @click="$emit('resetStyle')">
          <text class="reset-text">还原</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  editingText: string
  currentFont: string
  currentColor: string
  currentFontSize: number
  currentSpacing: number
  currentLineHeight: number
}>()

const emit = defineEmits<{
  close: []
  confirm: []
  showFontPicker: []
  showColorPicker: []
  decreaseFontSize: []
  increaseFontSize: []
  decreaseSpacing: []
  increaseSpacing: []
  decreaseLineHeight: []
  increaseLineHeight: []
  resetStyle: []
  input: [value: string]
}>()

const onInput = (e: any) => {
  emit('input', e.detail.value)
}
</script>

<style lang="scss" scoped>
.text-editor-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.editor-content {
  width: 100%;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding-bottom: env(safe-area-inset-bottom);
  max-height: 80vh;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  border-bottom: 1px solid #eee;
}

.close-btn, .confirm-btn {
  font-size: 48rpx;
  color: var(--color-text-secondary);
  width: 80rpx;
  text-align: center;
}

.confirm-btn {
  color: var(--color-primary);
  font-weight: bold;
}

.editor-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.text-area {
  padding: 30rpx;
}

.text-input {
  width: 100%;
  min-height: 300rpx;
  border: 2rpx solid #ddd;
  border-radius: 16rpx;
  padding: 20rpx;
  font-size: 28rpx;
  line-height: 1.8;
  box-sizing: border-box;
}

.style-options {
  padding: 0 30rpx 30rpx;
}

.style-row {
  display: flex;
  align-items: center;
  padding: 25rpx 0;
  border-bottom: 1px solid var(--color-border);

  &:last-child {
    border-bottom: none;
  }
}

.style-label {
  display: flex;
  align-items: center;
  gap: 15rpx;
  flex: 1;
}

.label-icon {
  font-size: 36rpx;
  opacity: 0.7;
}

.label-text {
  font-size: 30rpx;
  color: var(--color-text-primary);
}

.style-value {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.value-text {
  font-size: 28rpx;
  color: var(--color-text-primary);
}

.color-preview {
  width: 50rpx;
  height: 50rpx;
  border-radius: 8rpx;
  border: 2rpx solid #ddd;
}

.arrow {
  font-size: 28rpx;
  color: #ccc;
}

.font-size-controls {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #f5f5f5;
  padding: 5rpx 15rpx;
  border-radius: 12rpx;
}

.size-btn {
  width: 60rpx;
  height: 60rpx;
  background: #fff;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: var(--color-text-secondary);
}

.size-value {
  font-size: 30rpx;
  color: var(--color-text-primary);
  min-width: 60rpx;
  text-align: center;
}

.reset-btn {
  margin-top: 20rpx;
  padding: 20rpx;
  border: 2rpx solid #ddd;
  border-radius: 12rpx;
  text-align: center;
}

.reset-text {
  font-size: 28rpx;
  color: var(--color-text-secondary);
}
</style>
