<template>
  <view v-if="visible" class="basic-info-popup" @click="$emit('close')">
    <view class="basic-info-content" @click.stop>
      <view class="basic-info-header">
        <view class="back-btn-small" @click="$emit('close')">
          <text class="back-icon-small">‹</text>
        </view>
        <text class="basic-info-title">完善基本信息</text>
        <view class="confirm-btn-small" @click="$emit('confirm')">
          <text class="confirm-icon">✓</text>
        </view>
      </view>

      <scroll-view class="basic-info-scroll" scroll-y>
        <view class="form-list">
          <view class="form-item">
            <view class="form-label">
              <text class="required-mark">*</text>
              <text class="label-text">新郎姓名</text>
            </view>
            <view class="form-input-wrapper">
              <input
                class="form-input"
                placeholder="请输入新郎真实姓名"
                v-model="basicInfo.groomName"
                maxlength="30"
              />
              <text class="char-count">{{ basicInfo.groomName?.length || 0 }}/30</text>
            </view>
          </view>

          <view class="form-item">
            <view class="form-label">
              <text class="required-mark">*</text>
              <text class="label-text">新娘姓名</text>
            </view>
            <view class="form-input-wrapper">
              <input
                class="form-input"
                placeholder="请输入新娘真实姓名"
                v-model="basicInfo.brideName"
                maxlength="30"
              />
              <text class="char-count">{{ basicInfo.brideName?.length || 0 }}/30</text>
            </view>
          </view>

          <view class="form-item">
            <view class="form-label">
              <text class="label-text">婚礼时间</text>
            </view>
            <view class="form-input-wrapper" @click="$emit('datePicker')">
              <input
                class="form-input"
                placeholder="选择婚礼时间"
                :value="basicInfo.weddingDate"
                disabled
              />
              <text class="arrow-right">›</text>
            </view>
          </view>

          <view class="form-item">
            <view class="form-label">
              <text class="label-text">位置导航</text>
            </view>
            <view class="form-input-wrapper" @click="$emit('location')">
              <input
                class="form-input"
                placeholder="搜索定位导航位置"
                :value="basicInfo.location"
                disabled
              />
              <view class="location-btn">
                <text class="location-icon">📍</text>
                <text class="location-text">定位</text>
              </view>
            </view>
          </view>

          <view class="form-item">
            <view class="form-label">
              <text class="label-text">详细地址</text>
            </view>
            <view class="form-input-wrapper">
              <input
                class="form-input"
                placeholder="例：婚贝大酒店9F幸福宴会厅"
                v-model="basicInfo.detailAddress"
                maxlength="100"
              />
            </view>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { BasicInfo } from '@/types'

defineProps<{
  visible: boolean
  basicInfo: BasicInfo
}>()

defineEmits<{
  close: []
  confirm: []
  location: []
  datePicker: []
}>()
</script>

<style lang="scss" scoped>
.basic-info-popup {
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

.basic-info-content {
  width: 100%;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding-bottom: env(safe-area-inset-bottom);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.basic-info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}

.back-btn-small {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon-small {
  font-size: 48rpx;
  color: var(--color-text-primary);
  font-weight: 300;
}

.basic-info-title {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.confirm-btn-small {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-icon {
  font-size: 48rpx;
  color: var(--color-primary);
  font-weight: bold;
}

.basic-info-scroll {
  flex: 1;
  height: 0;
}

.form-list {
  padding: 20rpx 30rpx;
}

.form-item {
  margin-bottom: 30rpx;
}

.form-label {
  display: flex;
  align-items: center;
  margin-bottom: 15rpx;
}

.required-mark {
  color: var(--color-primary);
  font-size: 32rpx;
  margin-right: 8rpx;
}

.label-text {
  font-size: 32rpx;
  color: var(--color-text-primary);
  font-weight: 500;
}

.form-input-wrapper {
  display: flex;
  align-items: center;
  background: var(--color-bg-input);
  border-radius: 16rpx;
  padding: 24rpx 30rpx;
  position: relative;
}

.form-input {
  flex: 1;
  font-size: 32rpx;
  color: var(--color-text-primary);
}

.char-count {
  font-size: 28rpx;
  color: var(--color-text-secondary);
}

.arrow-right {
  font-size: 32rpx;
  color: var(--color-text-secondary);
}

.location-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.location-icon {
  font-size: 32rpx;
}

.location-text {
  font-size: 28rpx;
  color: var(--color-primary);
}
</style>
