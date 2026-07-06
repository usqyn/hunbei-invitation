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
            :class="{ 'editor-textarea--rtl': isRtl }"
            :value="editingText"
            @input="onInput"
            :maxlength="500"
            placeholder="请输入文字内容"
            placeholder-class="textarea-placeholder"
            :auto-height="false"
            :style="textareaStyle"
          />
          <view class="textarea-footer">
            <text class="char-count">{{ editingText.length }}/500</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  visible: boolean
  editingText: string
}>()

const emit = defineEmits<{
  close: []
  confirm: []
  input: [value: string]
}>()

const isRtl = computed(() => {
  const rtlChars = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
  return rtlChars.test(props.editingText)
})

const textareaStyle = computed(() => {
  const fontFamily = isRtl.value
    ? '"KazakhSoftAsilya", "Scheherazade New", "Amiri", "Noto Sans Arabic", "PingFang SC", "Microsoft YaHei", sans-serif'
    : '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif'
  return {
    fontFamily,
  }
})

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
  height: 50vh;
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
  direction: ltr;
  text-align: left;
}

.editor-textarea--rtl {
  direction: rtl;
  text-align: right;
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
</style>
