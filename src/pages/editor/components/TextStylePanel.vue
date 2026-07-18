<template>
  <view v-if="visible" class="ts-mask" @click="onClose">
    <view class="ts-panel" @click.stop>
      <!-- 拖拽指示条 -->
      <view class="drag-handle-bar"></view>
      <!-- 头部 -->
      <view class="panel-header">
        <text class="panel-title">文字样式</text>
        <view class="panel-reset" @click="onReset">
          <text class="reset-icon">↺</text>
          <text class="reset-text">重置</text>
        </view>
      </view>

      <!-- 字号 -->
      <view class="prop-row">
        <view class="prop-label-row">
          <text class="prop-label">字号</text>
          <view class="prop-value-group">
            <view class="prop-btn" @click="adjustFontSize(-2)"><text>-</text></view>
            <text class="prop-value">{{ currentFontSize }}rpx</text>
            <view class="prop-btn" @click="adjustFontSize(2)"><text>+</text></view>
          </view>
        </view>
        <slider
          class="prop-slider"
          :value="currentFontSize"
          :min="20"
          :max="60"
          :step="2"
          activeColor="#e84a6e"
          backgroundColor="#e8e8e8"
          block-size="28"
          @change="onFontSizeChange"
          @changing="onFontSizeChanging"
        />
      </view>

      <!-- 颜色 -->
      <view class="prop-row">
        <text class="prop-label">颜色</text>
        <view class="color-swatches">
          <view
            v-for="color in presetColors"
            :key="color.value"
            class="color-swatch"
            :class="{ 'color-swatch--active': currentColor === color.value }"
            :style="{ background: color.value }"
            @click="onColorSelect(color.value)"
          >
            <view v-if="currentColor === color.value" class="color-check">✓</view>
          </view>
        </view>
      </view>

      <!-- 加粗 -->
      <view class="prop-row prop-row--toggle">
        <text class="prop-label">加粗</text>
        <view class="toggle-group">
          <view
            class="toggle-btn"
            :class="{ 'toggle-btn--active': currentFontWeight === 'normal' }"
            @click="onFontWeightSelect('normal')"
          >
            <text>正常</text>
          </view>
          <view
            class="toggle-btn"
            :class="{ 'toggle-btn--active': currentFontWeight === 'bold' }"
            @click="onFontWeightSelect('bold')"
          >
            <text class="toggle-bold-text">加粗</text>
          </view>
        </view>
      </view>

      <!-- 文字方向 -->
      <view class="prop-row prop-row--toggle">
        <text class="prop-label">方向</text>
        <view class="toggle-group">
          <view
            class="toggle-btn"
            :class="{ 'toggle-btn--active': currentDirection === 'auto' }"
            @click="onDirectionSelect('auto')"
          >
            <text>自动</text>
          </view>
          <view
            class="toggle-btn"
            :class="{ 'toggle-btn--active': currentDirection === 'ltr' }"
            @click="onDirectionSelect('ltr')"
          >
            <text>LTR</text>
          </view>
          <view
            class="toggle-btn"
            :class="{ 'toggle-btn--active': currentDirection === 'rtl' }"
            @click="onDirectionSelect('rtl')"
          >
            <text class="rtl-text-inline">RTL</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface EditableElementLike {
  style?: {
    fontSize?: number
    color?: string
    fontWeight?: 'normal' | 'bold'
    direction?: 'ltr' | 'rtl' | 'auto'
  }
}

const props = defineProps<{
  visible: boolean
  element: EditableElementLike | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update', field: string, value: string | number): void
  (e: 'preview', field: string, value: string | number): void
  (e: 'reset'): void
}>()

// 预设颜色：黑色、深灰、白色、金色、红色、主题色
const presetColors = [
  { label: '黑', value: '#333333' },
  { label: '灰', value: '#666666' },
  { label: '白', value: '#ffffff' },
  { label: '金', value: '#c8a86e' },
  { label: '红', value: '#e84a6e' },
  { label: '主题', value: '#b8860b' },
]

const currentFontSize = computed(() => props.element?.style?.fontSize ?? 28)
const currentColor = computed(() => props.element?.style?.color ?? '#333333')
const currentFontWeight = computed<'normal' | 'bold'>(() => props.element?.style?.fontWeight ?? 'normal')
const currentDirection = computed<'ltr' | 'rtl' | 'auto'>(() => props.element?.style?.direction ?? 'auto')

function adjustFontSize(delta: number) {
  const newSize = Math.min(60, Math.max(20, currentFontSize.value + delta))
  emit('update', 'fontSize', newSize)
}

function onFontSizeChange(e: any) {
  emit('update', 'fontSize', e.detail.value)
}

function onFontSizeChanging(e: any) {
  emit('preview', 'fontSize', e.detail.value)
}

function onColorSelect(color: string) {
  emit('update', 'color', color)
}

function onFontWeightSelect(weight: 'normal' | 'bold') {
  emit('update', 'fontWeight', weight)
}

function onDirectionSelect(direction: 'ltr' | 'rtl' | 'auto') {
  emit('update', 'direction', direction)
}

function onClose() {
  emit('close')
}

function onReset() {
  emit('reset')
}
</script>

<style lang="scss" scoped>
.ts-mask {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  top: 0;
  z-index: 500;
  background: rgba(0, 0, 0, 0.35);
}

.ts-panel {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 0 32rpx;
  padding-bottom: calc(env(safe-area-inset-bottom) + 32rpx);
  box-shadow: 0 -8rpx 32rpx rgba(0, 0, 0, 0.1);
  animation: tsSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes tsSlideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.drag-handle-bar {
  width: 64rpx;
  height: 8rpx;
  background: #e0e0e0;
  border-radius: 4rpx;
  margin: 16rpx auto 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0 16rpx;
}

.panel-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.panel-reset {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 20rpx;
  border-radius: 24rpx;
  background: #f5f5f5;
}

.reset-icon {
  font-size: 28rpx;
  color: #999;
}

.reset-text {
  font-size: 24rpx;
  color: #999;
}

.prop-row {
  padding: 20rpx 0;
  border-top: 1rpx solid #f0f0f0;
}

.prop-row--toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.prop-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.prop-label {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.prop-value-group {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.prop-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  color: #333;
  font-weight: bold;
}

.prop-value {
  font-size: 26rpx;
  color: #666;
  min-width: 80rpx;
  text-align: center;
}

.prop-slider {
  margin: 0;
}

/* ===== 颜色选择 ===== */
.color-swatches {
  display: flex;
  gap: 20rpx;
  margin-top: 16rpx;
}

.color-swatch {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  border: 4rpx solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.2s;
}

.color-swatch--active {
  border-color: #e84a6e;
  border-width: 6rpx;
  transform: scale(1.1);
}

.color-check {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: bold;
  text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.3);
}

/* 深色背景上用白勾，浅色背景上用深勾 */
.color-swatch:nth-child(3) .color-check {
  color: #333;
  text-shadow: none;
}

/* ===== 加粗切换 ===== */
.toggle-group {
  display: flex;
  gap: 12rpx;
}

.toggle-btn {
  padding: 12rpx 32rpx;
  border-radius: 24rpx;
  background: #f5f5f5;
  font-size: 26rpx;
  color: #666;
  transition: all 0.2s;
}

.toggle-btn--active {
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  color: #ffffff;
  box-shadow: 0 4rpx 12rpx rgba(232, 74, 110, 0.3);
}

.toggle-bold-text {
  font-weight: bold;
}

.rtl-text-inline {
  font-family: 'KazakhSoftAsilya', 'Noto Sans Arabic', sans-serif;
}
</style>
