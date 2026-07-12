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
          <text class="menu-value">v{{ APP_VERSION }}</text>
        </view>
      </view>

      <view class="logout-wrap">
        <view class="logout-btn" @click="handleLogout">退出登录</view>
      </view>
    </view>

    <!-- 关于我们 弹窗 -->
    <view v-if="showAbout" class="about-mask" @click="showAbout = false">
      <view class="about-modal" @click.stop>
        <view class="about-header">
          <text class="about-title">关于我们</text>
          <view class="about-close" @click="showAbout = false">
            <text class="about-close-icon">×</text>
          </view>
        </view>
        <scroll-view class="about-body" scroll-y>
          <view class="about-logo">
            <text class="about-logo-text">婚贝</text>
          </view>
          <text class="about-version">版本 v{{ APP_VERSION }}</text>
          <view class="about-section">
            <text class="about-section-title">团队介绍</text>
            <text class="about-text">婚贝是一款专注于婚礼场景的创意工具小程序，致力于为新人提供精美的电子请柬、海报制作与一站式婚礼互动功能。我们希望通过简单的操作，让每对新人都能轻松制作出属于自己的婚礼记忆。</text>
          </view>
          <view class="about-section">
            <text class="about-section-title">联系我们</text>
            <text class="about-text">官方邮箱：support@hunbei.com</text>
            <text class="about-text">官方微信：hunbei_official</text>
          </view>
          <view class="about-section">
            <text class="about-section-title">特别说明</text>
            <text class="about-text">本小程序所有模板素材版权归原作者所有，未经授权请勿用于商业用途。</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useGoBack } from '@/composables/useGoBack'
import { useUserStore } from '@/stores/user'
import { APP_VERSION } from '@/config'

const goBack = useGoBack()
const userStore = useUserStore()
const showAbout = ref(false)

const handleClearCache = () => {
  uni.showModal({
    title: '提示',
    content: '确定要清除缓存吗？作品数据不会被删除。',
    success: (res) => {
      if (res.confirm) {
        // 只清除编辑器缓存和模板缓存，保留用户作品和登录态
        uni.removeStorageSync('hunbei_current_template')
        uni.removeStorageSync('hunbei_current_template_data')
        uni.removeStorageSync('hunbei_template')
        uni.showToast({ title: '缓存已清除', icon: 'success' })
      }
    }
  })
}

const handleAbout = () => {
  showAbout.value = true
}

const handleLogout = () => {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        // logout(false) 不跳转，由这里统一跳转到首页
        userStore.logout(false)
        uni.reLaunch({ url: '/pages/index/index' })
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--color-bg-page);
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

/* 关于我们 弹窗 */
.about-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 60rpx 48rpx;
}

.about-modal {
  width: 100%;
  max-height: 80vh;
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.about-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.about-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
}

.about-close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.about-close-icon {
  font-size: 44rpx;
  color: #999999;
  line-height: 1;
}

.about-body {
  padding: 32rpx;
  max-height: 65vh;
}

.about-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120rpx;
  height: 120rpx;
  border-radius: 28rpx;
  margin: 0 auto 20rpx;
  background: linear-gradient(135deg, #e84a6e, #ff6b8a);
}

.about-logo-text {
  font-size: 44rpx;
  color: #ffffff;
  font-weight: 700;
}

.about-version {
  display: block;
  text-align: center;
  font-size: 24rpx;
  color: #999999;
  margin-bottom: 32rpx;
}

.about-section {
  margin-bottom: 28rpx;
}

.about-section-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #333333;
  margin-bottom: 12rpx;
}

.about-text {
  display: block;
  font-size: 26rpx;
  color: #666666;
  line-height: 1.7;
  margin-bottom: 8rpx;
}
</style>
