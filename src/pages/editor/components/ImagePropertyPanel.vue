<template>
  <view v-if="visible" class="img-prop-mask" @click="onClose">
    <view class="img-prop-panel" @click.stop>
      <!-- 头部 -->
      <view class="panel-header">
        <text class="panel-title">图片调整</text>
        <view class="panel-reset" @click="onReset">
          <text class="reset-icon">↺</text>
          <text class="reset-text">重置</text>
        </view>
      </view>

      <!-- 缩放滑杆 -->
      <view class="prop-row">
        <view class="prop-label-row">
          <text class="prop-label">缩放</text>
          <view class="prop-value-group">
            <view class="prop-btn" @click="adjustScale(-0.1)"><text>-</text></view>
            <text class="prop-value">{{ Math.round((element?.imageScale ?? 1) * 100) }}%</text>
            <view class="prop-btn" @click="adjustScale(0.1)"><text>+</text></view>
          </view>
        </view>
        <slider
          class="prop-slider"
          :value="(element?.imageScale ?? 1) * 100"
          :min="50"
          :max="300"
          :step="5"
          activeColor="#e84a6e"
          backgroundColor="#e8e8e8"
          block-size="20"
          @change="onScaleChange"
        />
      </view>

      <!-- 旋转滑杆 -->
      <view class="prop-row">
        <view class="prop-label-row">
          <text class="prop-label">旋转</text>
          <view class="prop-value-group">
            <view class="prop-btn" @click="adjustRotation(-15)"><text>-</text></view>
            <text class="prop-value">{{ Math.round(element?.rotation ?? 0) }}°</text>
            <view class="prop-btn" @click="adjustRotation(15)"><text>+</text></view>
          </view>
        </view>
        <slider
          class="prop-slider"
          :value="element?.rotation ?? 0"
          :min="-180"
          :max="180"
          :step="1"
          activeColor="#e84a6e"
          backgroundColor="#e8e8e8"
          block-size="20"
          @change="onRotationChange"
        />
      </view>

      <!-- 透明度滑杆 -->
      <view class="prop-row">
        <view class="prop-label-row">
          <text class="prop-label">透明度</text>
          <view class="prop-value-group">
            <view class="prop-btn" @click="adjustOpacity(-0.1)"><text>-</text></view>
            <text class="prop-value">{{ Math.round((element?.opacity ?? 1) * 100) }}%</text>
            <view class="prop-btn" @click="adjustOpacity(0.1)"><text>+</text></view>
          </view>
        </view>
        <slider
          class="prop-slider"
          :value="(element?.opacity ?? 1) * 100"
          :min="10"
          :max="100"
          :step="5"
          activeColor="#e84a6e"
          backgroundColor="#e8e8e8"
          block-size="20"
          @change="onOpacityChange"
        />
      </view>

      <!-- 圆角滑杆 -->
      <view class="prop-row">
        <view class="prop-label-row">
          <text class="prop-label">圆角</text>
          <view class="prop-value-group">
            <view class="prop-btn" @click="adjustRadius(-4)"><text>-</text></view>
            <text class="prop-value">{{ element?.borderRadius ?? 0 }}rpx</text>
            <view class="prop-btn" @click="adjustRadius(4)"><text>+</text></view>
          </view>
        </view>
        <slider
          class="prop-slider"
          :value="element?.borderRadius ?? 0"
          :min="0"
          :max="80"
          :step="2"
          activeColor="#e84a6e"
          backgroundColor="#e8e8e8"
          block-size="20"
          @change="onRadiusChange"
        />
      </view>

      <!-- 快捷旋转 -->
      <view class="quick-rotate-row">
        <view class="quick-btn" @click="setRotation(0)"><text>0°</text></view>
        <view class="quick-btn" @click="setRotation(90)"><text>90°</text></view>
        <view class="quick-btn" @click="setRotation(180)"><text>180°</text></view>
        <view class="quick-btn" @click="setRotation(270)"><text>270°</text></view>
        <view class="quick-btn" @click="setRotation(-90)"><text>-90°</text></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EditableElement } from '@/types'

const props = defineProps<{
  visible: boolean
  element: EditableElement | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update', field: string, value: number): void
  (e: 'reset'): void
}>()

function onScaleChange(e: any) {
  const val = (e.detail?.value ?? 100) / 100
  emit('update', 'imageScale', val)
}

function onRotationChange(e: any) {
  const val = e.detail?.value ?? 0
  emit('update', 'rotation', val)
}

function onOpacityChange(e: any) {
  const val = (e.detail?.value ?? 100) / 100
  emit('update', 'opacity', val)
}

function onRadiusChange(e: any) {
  const val = e.detail?.value ?? 0
  emit('update', 'borderRadius', val)
}

function adjustScale(delta: number) {
  const cur = props.element?.imageScale ?? 1
  const val = Math.max(0.5, Math.min(3, cur + delta))
  emit('update', 'imageScale', val)
}

function adjustRotation(delta: number) {
  const cur = props.element?.rotation ?? 0
  let val = cur + delta
  if (val > 180) val -= 360
  if (val < -180) val += 360
  emit('update', 'rotation', val)
}

function adjustOpacity(delta: number) {
  const cur = props.element?.opacity ?? 1
  const val = Math.max(0.1, Math.min(1, cur + delta))
  emit('update', 'opacity', val)
}

function adjustRadius(delta: number) {
  const cur = props.element?.borderRadius ?? 0
  const val = Math.max(0, Math.min(80, cur + delta))
  emit('update', 'borderRadius', val)
}

function setRotation(val: number) {
  emit('update', 'rotation', val)
}

function onReset() {
  emit('reset')
}

function onClose() {
  emit('close')
}
</script>

<style scoped>
.img-prop-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 9999;
  display: flex;
  align-items: flex-end;
}

.img-prop-panel {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
  animation: slideUp 0.25s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
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
  background: #f5f5f5;
  border-radius: 24rpx;
}

.reset-icon {
  font-size: 28rpx;
  color: #e84a6e;
}

.reset-text {
  font-size: 24rpx;
  color: #e84a6e;
}

.prop-row {
  margin-bottom: 28rpx;
}

.prop-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
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
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #666;
}

.prop-btn:active {
  background: #e84a6e;
  color: #fff;
}

.prop-value {
  font-size: 26rpx;
  color: #666;
  min-width: 80rpx;
  text-align: center;
}

.prop-slider {
  width: 100%;
  margin: 0;
}

.quick-rotate-row {
  display: flex;
  justify-content: space-around;
  margin-top: 8rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f0f0f0;
}

.quick-btn {
  padding: 12rpx 28rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #333;
}

.quick-btn:active {
  background: #e84a6e;
  color: #fff;
}
</style>
