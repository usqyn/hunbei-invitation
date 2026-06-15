<template>
  <view class="page">
    <view class="redirect-banner">
      <text class="redirect-icon">🎉</text>
      <text class="redirect-title">婚贝请柬</text>
      <text class="redirect-desc">快速制作电子请帖 · 朋友圈邀请</text>
      <button class="redirect-btn" @click="goHome">开始制作</button>
    </view>
  </view>
</template>

<script setup lang="ts">
const goHome = () => {
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(135deg, #fce4ec 0%, #f8bbd0 50%, #f48fb1 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.redirect-banner {
  text-align: center;
  padding: 60rpx;
}

.redirect-icon {
  font-size: 120rpx;
  display: block;
  margin-bottom: 30rpx;
}

.redirect-title {
  font-size: 52rpx;
  font-weight: 700;
  color: #fff;
  display: block;
  margin-bottom: 20rpx;
}

.redirect-desc {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
  display: block;
  margin-bottom: 60rpx;
}

.redirect-btn {
  width: 400rpx;
  height: 100rpx;
  line-height: 100rpx;
  background: #fff;
  color: #e84a6e;
  border-radius: 50rpx;
  font-size: 32rpx;
  font-weight: 600;
  border: none;

  &::after {
    border: none;
  }
}
</style>
