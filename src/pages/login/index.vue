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
      <view class="logo-section">
        <view class="logo">
          <text class="logo-icon">💝</text>
        </view>
        <text class="app-name">婚贝请柬</text>
        <text class="app-desc">微信一键登录，制作专属婚礼请柬</text>
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

      <button
        class="login-btn"
        :class="{ disabled: !agreed, loading: logging }"
        :disabled="!agreed || logging"
        open-type="getPhoneNumber"
        @getphonenumber="onGetPhoneNumber"
        @click="handleH5Login"
      >
        <text v-if="logging">登录中...</text>
        <text v-else>微信一键登录</text>
      </button>

      <view class="divider">
        <text class="divider-text">其他方式</text>
      </view>

      <view class="alt-login">
        <view class="alt-item" @click="handleMpLogin">
          <text class="alt-icon">📱</text>
          <text class="alt-text">手机号登录</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'

const agreed = ref(false)
const logging = ref(false)
const showSmsForm = ref(false)
const phone = ref('')
const smsCode = ref('')
const countdown = ref(0)
let timer: number | null = null

const userStore = useUserStore()

const toggleAgreement = () => {
  agreed.value = !agreed.value
}

const goBack = () => {
  uni.navigateBack()
}

const loginSuccess = () => {
  logging.value = false
  uni.hideLoading()
  uni.showToast({ title: '登录成功', icon: 'success' })
  setTimeout(() => {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      uni.navigateBack()
    } else {
      uni.switchTab({ url: '/pages/index/index' })
    }
  }, 1000)
}

// 微信小程序：getPhoneNumber 授权
const onGetPhoneNumber = (e: any) => {
  if (!agreed.value) return
  if (e.detail?.errMsg !== 'getPhoneNumber:ok') return

  logging.value = true
  uni.showLoading({ title: '登录中...' })

  uni.login({
    provider: 'weixin',
    success: (loginRes) => {
      const encryptedData = e.detail.encryptedData
      const iv = e.detail.iv

      // 实际项目中发送 code, encryptedData, iv 到后端解密
      // 这里模拟登录成功
      setTimeout(() => {
        userStore.setLogin('wx_user_' + loginRes.code.slice(-6))
        loginSuccess()
      }, 800)
    },
    fail: () => {
      logging.value = false
      uni.hideLoading()
      uni.showToast({ title: '授权失败，请重试', icon: 'none' })
    }
  })
}

// H5 环境：模拟登录
const handleH5Login = (e: any) => {
  if (!agreed.value || logging.value) return

  // H5 环境下没有 getPhoneNumber 响应
  if (e?.detail?.errMsg === undefined) {
    logging.value = true
    uni.showLoading({ title: '登录中...' })
    setTimeout(() => {
      userStore.setLogin('h5_user_demo')
      loginSuccess()
    }, 800)
  }
}

// 手机号手动登录（备选）
const handleMpLogin = () => {
  showSmsForm.value = true
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
  color: var(--color-text-primary);
  font-weight: 300;
}

.header-title {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.header-right {
  width: 80rpx;
}

.content {
  padding: 0 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 80rpx;
  margin-bottom: 60rpx;
}

.logo {
  width: 160rpx;
  height: 160rpx;
  background: var(--color-primary-gradient);
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30rpx;
}

.logo-icon {
  font-size: 80rpx;
}

.app-name {
  font-size: 48rpx;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 16rpx;
}

.app-desc {
  font-size: 26rpx;
  color: var(--color-text-secondary);
}

.agreement-section {
  width: 100%;
  margin-bottom: 40rpx;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6rpx;
}

.checkbox {
  width: 36rpx;
  height: 36rpx;
  border: 3rpx solid #ccc;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 6rpx;

  &.checked {
    background: var(--color-primary);
    border-color: var(--color-primary);
  }
}

.check-icon {
  color: #fff;
  font-size: 22rpx;
  font-weight: bold;
}

.agreement-text {
  font-size: 24rpx;
  color: var(--color-text-secondary);
}

.agreement-link {
  font-size: 24rpx;
  color: #4a90e2;
}

.login-btn {
  width: 100%;
  height: 100rpx;
  background: var(--color-primary-gradient);
  border-radius: 50rpx;
  border: none;
  font-size: 34rpx;
  font-weight: 600;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;

  &.disabled {
    background: #ddd;
    color: var(--color-text-secondary);
  }

  &.loading {
    opacity: 0.8;
  }

  &::after {
    border: none;
  }
}

.divider {
  width: 100%;
  display: flex;
  align-items: center;
  margin: 40rpx 0;
  gap: 20rpx;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1rpx;
  background: #eee;
}

.divider-text {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.alt-login {
  width: 100%;
}

.alt-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 24rpx;
  border: 2rpx solid #eee;
  border-radius: 24rpx;
}

.alt-icon {
  font-size: 32rpx;
}

.alt-text {
  font-size: 28rpx;
  color: var(--color-text-primary);
}
</style>
