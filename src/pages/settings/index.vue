<template>
  <view class="page">
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="nav-back-icon">&#x276e;</text>
      </view>
      <text class="nav-title">设置</text>
      <view class="nav-placeholder"></view>
    </view>

    <view class="content">
      <view class="card">
        <view class="menu-item" @click="handleClearCache">
          <text class="menu-name">清除缓存</text>
          <text class="menu-arrow">&#x203a;</text>
        </view>
        <view class="menu-item" @click="handleAbout">
          <text class="menu-name">关于我们</text>
          <text class="menu-arrow">&#x203a;</text>
        </view>
        <view class="menu-item">
          <text class="menu-name">版本号</text>
          <text class="menu-value">v1.0.0</text>
        </view>
      </view>

      <view class="logout-wrap">
        <view class="logout-btn" @click="handleLogout">退出登录</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useGoBack } from '@/composables/useGoBack'
import { useUserStore } from '@/stores/user'

const goBack = useGoBack()
const userStore = useUserStore()

const handleClearCache = () => {
  uni.showModal({
    title: '提示',
    content: '确定要清除缓存吗？',
    success: (res) => {
      if (res.confirm) {
        uni.clearStorage()
        uni.showToast({ title: '缓存已清除', icon: 'success' })
      }
    }
  })
}

const handleAbout = () => {
  uni.showToast({ title: '关于我们', icon: 'none' })
}

const handleLogout = () => {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.reLaunch({ url: '/pages/index/index' })
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background: #ffffff;
}

.nav-back {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-back-icon {
  font-size: 36rpx;
  color: #333333;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
}

.nav-placeholder {
  width: 60rpx;
}

.content {
  padding: 24rpx;
}

.card {
  background: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 24rpx;
  border-bottom: 2rpx solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
}

.menu-name {
  font-size: 28rpx;
  color: #333333;
}

.menu-value {
  font-size: 28rpx;
  color: #999999;
}

.menu-arrow {
  font-size: 32rpx;
  color: #cccccc;
}

.logout-wrap {
  margin-top: 48rpx;
  padding: 0 24rpx;
}

.logout-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  background: #ef4444;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 500;
}
</style>
