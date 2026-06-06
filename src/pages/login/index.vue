<template>
  <view class="page">
    <view class="header">
      <view class="back-btn" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <view class="header-title">婚贝请柬</view>
      <view class="header-right"></view>
    </view>

    <view class="content">
      <view class="templates-show">
        <scroll-view class="template-scroll" scroll-x>
          <view class="template-list">
            <view v-for="i in 9" :key="i" class="template-item">
              <image class="template-img" :src="getTemplateImg(i)" mode="aspectFill"></image>
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="logo-section">
        <view class="logo">
          <text class="logo-icon">💝</text>
        </view>
        <text class="app-name">婚贝请柬</text>
      </view>

      <view class="agreement-section">
        <view class="checkbox-wrapper" @click="toggleAgreement">
          <view class="checkbox" :class="{ checked: agreed }">
            <text v-if="agreed" class="check-icon">✓</text>
          </view>
          <text class="agreement-text">本人已阅读并同意</text>
          <text class="agreement-link">《用户协议》</text>
          <text class="agreement-text">和</text>
          <text class="agreement-link">《隐私协议》</text>
        </view>
      </view>

      <button class="login-btn" :class="{ disabled: !agreed }" @click="handleLogin">
        手机号快捷登录
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const agreed = ref(false)

const toggleAgreement = () => {
  agreed.value = !agreed.value
}

const goBack = () => {
  uni.navigateBack()
}

const handleLogin = () => {
  if (!agreed.value) {
    uni.showToast({
      title: '请先阅读并同意协议',
      icon: 'none'
    })
    return
  }
  
  uni.showLoading({ title: '登录中...' })
  setTimeout(() => {
    uni.hideLoading()
    uni.showToast({
      title: '登录成功',
      icon: 'success'
    })
    setTimeout(() => {
      uni.switchTab({ url: '/pages/index/index' })
    }, 1000)
  }, 1000)
}

const getTemplateImg = (i: number) => {
  const prompts = [
    'elegant wedding invitation card pink design',
    'chinese traditional wedding invitation red gold',
    'modern wedding invitation minimal design',
    'vintage wedding invitation classic style',
    'floral wedding invitation with flowers',
    'chinese wedding double happiness red',
    'romantic wedding invitation love theme',
    'simple wedding invitation clean design',
    'wedding invitation with photo'
  ]
  return `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompts[i-1])}&image_size=portrait_4_3`
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #ffffff;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  background: #ffffff;
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
  color: #333;
  font-weight: 300;
}

.header-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
}

.header-right {
  width: 80rpx;
}

.content {
  padding: 0 40rpx;
  padding-bottom: 100rpx;
}

.templates-show {
  height: 700rpx;
  overflow: hidden;
  position: relative;
}

.template-scroll {
  width: 100%;
  height: 100%;
}

.template-list {
  display: flex;
  gap: 30rpx;
  padding: 40rpx 20rpx;
  flex-wrap: wrap;
  justify-content: center;
}

.template-item {
  width: 200rpx;
  height: 280rpx;
  border-radius: 16rpx;
  overflow: hidden;
  opacity: 0.4;
}

.template-img {
  width: 100%;
  height: 100%;
}

.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 40rpx;
  margin-bottom: 80rpx;
}

.logo {
  width: 200rpx;
  height: 200rpx;
  background: linear-gradient(135deg, #ff6b8a 0%, #e84a6e 100%);
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30rpx;
}

.logo-icon {
  font-size: 120rpx;
}

.app-name {
  font-size: 56rpx;
  font-weight: 600;
  color: #333;
}

.agreement-section {
  margin-bottom: 40rpx;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10rpx;
}

.checkbox {
  width: 40rpx;
  height: 40rpx;
  border: 3rpx solid #ccc;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10rpx;

  &.checked {
    background: #e84a6e;
    border-color: #e84a6e;
  }
}

.check-icon {
  color: #fff;
  font-size: 24rpx;
  font-weight: bold;
}

.agreement-text {
  font-size: 26rpx;
  color: #999;
}

.agreement-link {
  font-size: 26rpx;
  color: #4a90e2;
}

.login-btn {
  width: 100%;
  height: 110rpx;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  border-radius: 55rpx;
  border: none;
  font-size: 36rpx;
  font-weight: 600;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;

  &.disabled {
    background: #ddd;
    color: #999;
  }

  &::after {
    border: none;
  }
}
</style>