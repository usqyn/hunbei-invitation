<template>
  <view class="header">
    <view class="back-btn" @click="goBack">
      <text class="back-icon">‹</text>
    </view>
    <view class="header-title">{{ title }}</view>
    <view class="header-right">
      <slot name="right" />
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{ title: string }>()

const goBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.reLaunch({ url: '/pages/index/index' })
  }
}
</script>

<style lang="scss" scoped>
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
  min-width: 80rpx;
  justify-content: flex-end;
}
</style>
