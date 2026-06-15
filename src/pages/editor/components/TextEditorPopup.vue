<template>
  <view v-if="visible" class="popup-overlay" @click="$emit('close')">
    <view class="popup-content" @click.stop>
      <view class="popup-header">
        <view class="header-action" @click="$emit('close')">
          <text class="close-text">取消</text>
        </view>
        <text class="header-title">修改文字</text>
        <view class="header-action" @click="$emit('confirm')">
          <text class="confirm-text">完成</text>
        </view>
      </view>

      <view class="editor-body">
        <view class="textarea-section">
          <textarea
            class="editor-textarea"
            :value="editingText"
            @input="onInput"
            :maxlength="500"
            placeholder="请输入文字内容"
            placeholder-class="textarea-placeholder"
            :auto-height="false"
          />
          <view class="textarea-footer">
            <text class="char-count">{{ editingText.length }}/500</text>
          </view>
        </view>

        <view class="style-section">
          <view class="style-title">
            <text class="title-icon">🎨</text>
            <text class="title-text">文字样式</text>
          </view>

          <view class="style-item">
            <view class="style-label">
              <text class="label-icon">𝔗</text>
              <text class="label-text">字体</text>
            </view>
            <view class="style-action" @click="$emit('showFontPicker')">
              <text class="action-value">{{ currentFont }}</text>
              <text class="action-arrow">›</text>
            </view>
          </view>

          <view class="style-item">
            <view class="style-label">
              <text class="label-icon">🖊</text>
              <text class="label-text">颜色</text>
            </view>
            <view class="style-action" @click="$emit('showColorPicker')">
              <view class="color-dot" :style="{ background: currentColor }"></view>
              <text class="action-arrow">›</text>
            </view>
          </view>

          <view class="style-item">
            <view class="style-label">
              <text class="label-icon">Aa</text>
              <text class="label-text">字号</text>
            </view>
            <view class="control-group">
              <view class="control-btn" @click="$emit('decreaseFontSize')">
                <text class="btn-text">−</text>
              </view>
              <view class="control-value">
                <text class="value-num">{{ currentFontSize }}</text>
              </view>
              <view class="control-btn" @click="$emit('increaseFontSize')">
                <text class="btn-text">+</text>
              </view>
            </view>
          </view>

          <view class="style-item">
            <view class="style-label">
              <text class="label-icon">⫿</text>
              <text class="label-text">字距</text>
            </view>
            <view class="control-group">
              <view class="control-btn" @click="$emit('decreaseSpacing')">
                <text class="btn-text">−</text>
              </view>
              <view class="control-value">
                <text class="value-num">{{ currentSpacing }}</text>
              </view>
              <view class="control-btn" @click="$emit('increaseSpacing')">
                <text class="btn-text">+</text>
              </view>
            </view>
          </view>

          <view class="style-item last-item">
            <view class="style-label">
              <text class="label-icon">Ā</text>
              <text class="label-text">行距</text>
            </view>
            <view class="control-group">
              <view class="control-btn" @click="$emit('decreaseLineHeight')">
                <text class="btn-text">−</text>
              </view>
              <view class="control-value">
                <text class="value-num">{{ currentLineHeight }}</text>
              </view>
              <view class="control-btn" @click="$emit('increaseLineHeight')">
                <text class="btn-text">+</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="popup-footer">
        <view class="reset-button" @click="$emit('resetStyle')">
          <text class="reset-icon">↻</text>
          <text class="reset-text">还原默认样式</text>
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
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.popup-content {
  width: 100%;
  height: 85vh;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.header-action {
  min-width: 100rpx;
}

.close-text {
  font-size: 28rpx;
  color: var(--color-text-secondary);
}

.confirm-text {
  font-size: 28rpx;
  color: var(--color-primary);
  font-weight: 500;
  text-align: right;
}

.header-title {
  font-size: 34rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.editor-body {
  flex: 1;
  overflow-y: auto;
  padding: 24rpx 32rpx;
}

.textarea-section {
  background: #fafafa;
  border-radius: 20rpx;
  padding: 20rpx;
  margin-bottom: 24rpx;
}

.editor-textarea {
  width: 100%;
  height: 240rpx;
  padding: 20rpx;
  font-size: 28rpx;
  line-height: 1.8;
  color: var(--color-text-primary);
  background: #fff;
  border-radius: 12rpx;
  box-sizing: border-box;
}

.textarea-placeholder {
  color: #bbb;
  font-size: 28rpx;
}

.textarea-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12rpx 8rpx 0;
}

.char-count {
  font-size: 22rpx;
  color: var(--color-text-secondary);
}

.style-section {
  background: #fafafa;
  border-radius: 20rpx;
  padding: 20rpx;
}

.style-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 8rpx 4rpx 20rpx;
  margin-bottom: 8rpx;
  border-bottom: 1px solid var(--color-border);
}

.title-icon {
  font-size: 28rpx;
}

.title-text {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.style-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 4rpx;
  border-bottom: 1px solid var(--color-border);

  &.last-item {
    border-bottom: none;
  }
}

.style-label {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.label-icon {
  font-size: 32rpx;
  opacity: 0.7;
}

.label-text {
  font-size: 28rpx;
  color: var(--color-text-primary);
  font-weight: 500;
}

.style-action {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.action-value {
  font-size: 26rpx;
  color: var(--color-text-secondary);
}

.action-arrow {
  font-size: 36rpx;
  color: #ccc;
  font-weight: 300;
}

.color-dot {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  border: 4rpx solid #fff;
  box-shadow: 0 0 0 2rpx #e0e0e0;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #fff;
  padding: 6rpx;
  border-radius: 12rpx;
  border: 1px solid #eee;
}

.control-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  transition: background 0.2s ease;

  &:active {
    background: var(--color-primary-light);
  }
}

.btn-text {
  font-size: 32rpx;
  color: var(--color-text-primary);
  font-weight: 600;
}

.control-value {
  min-width: 80rpx;
  text-align: center;
}

.value-num {
  font-size: 28rpx;
  color: var(--color-text-primary);
  font-weight: 600;
}

.popup-footer {
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

.reset-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 20rpx;
  background: #fafafa;
  border-radius: 16rpx;
  border: 2rpx solid #e5e5e5;

  &:active {
    background: #f0f0f0;
  }
}

.reset-icon {
  font-size: 28rpx;
  color: var(--color-text-secondary);
}

.reset-text {
  font-size: 28rpx;
  color: var(--color-text-secondary);
}
</style>
