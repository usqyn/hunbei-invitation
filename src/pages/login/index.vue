<template>
  <view class="page">
    <view class="header">
      <view class="back-btn" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="header-title">登录</text>
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
        <view class="agreement-row">
          <view class="checkbox" :class="{ checked: agreed }" @click="toggleAgreement">
            <text v-if="agreed" class="check-icon">✓</text>
          </view>
          <text class="agreement-text">已阅读并同意</text>
          <text class="agreement-link">《用户协议》</text>
          <text class="agreement-text">和</text>
          <text class="agreement-link">《隐私协议》</text>
        </view>
      </view>

      <button
        v-if="isMpWeixin"
        class="login-btn"
        :class="{ disabled: !agreed, loading: logging }"
        :disabled="!agreed || logging"
        open-type="getPhoneNumber"
        @getphonenumber="onGetPhoneNumber"
      >
        <text v-if="logging">登录中...</text>
        <text v-else>微信一键登录</text>
      </button>
      <button
        v-else
        class="login-btn"
        :class="{ disabled: !agreed, loading: logging }"
        :disabled="!agreed || logging"
        @click="handleH5Login"
      >
        <text v-if="logging">登录中...</text>
        <text v-else>一键登录</text>
      </button>

      <view class="divider">
        <text class="divider-text">其他方式</text>
      </view>

      <view class="alt-login">
        <view class="alt-item" @click="showSmsForm = true">
          <text class="alt-icon">📱</text>
          <text class="alt-text">手机号登录</text>
        </view>
      </view>
    </view>

    <view v-if="showSmsForm" class="popup-overlay" @click="showSmsForm = false">
      <view class="popup-content" @click.stop>
        <view class="popup-header">
          <text class="popup-title">手机号登录</text>
          <view class="popup-close" @click="showSmsForm = false">
            <text class="close-icon">✕</text>
          </view>
        </view>
        <view class="sms-form">
          <input class="sms-input" v-model="phone" placeholder="请输入手机号" maxlength="11" type="number" />
          <view class="code-row">
            <input class="sms-input code-input" v-model="smsCode" placeholder="验证码" maxlength="6" type="number" />
            <button class="code-btn" :disabled="countdown > 0" @click="sendCode">
              <text v-if="countdown > 0">{{ countdown }}s</text>
              <text v-else>获取验证码</text>
            </button>
          </view>
          <button class="submit-btn" @click="handleSmsLogin">登录</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const agreed = ref(false)
const logging = ref(false)
const showSmsForm = ref(false)
const phone = ref('')
const smsCode = ref('')
const countdown = ref(0)
let timer: number | null = null
const isMpWeixin = ref(false)

try {
  const info = uni.getSystemInfoSync()
  isMpWeixin.value = info.uniPlatform === 'mp-weixin'
} catch (_) {}

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

const onGetPhoneNumber = (e: any) => {
  if (!agreed.value || logging.value) return
  if (e.detail?.errMsg !== 'getPhoneNumber:ok') return

  logging.value = true
  uni.showLoading({ title: '登录中...' })

  uni.login({
    provider: 'weixin',
    success: async (loginRes) => {
      const ok = await userStore.doLogin({
        encryptedData: e.detail.encryptedData,
        iv: e.detail.iv,
        code: loginRes.code,
      })
      if (ok) loginSuccess()
      else { logging.value = false; uni.hideLoading() }
    },
    fail: () => {
      logging.value = false
      uni.hideLoading()
      uni.showToast({ title: '授权失败，请重试', icon: 'none' })
    },
  })
}

const handleH5Login = () => {
  if (!agreed.value || logging.value) return
  logging.value = true
  uni.showLoading({ title: '登录中...' })
  setTimeout(async () => {
    await userStore.doLogin({ phone: 'h5_user' })
    loginSuccess()
  }, 800)
}

const sendCode = () => {
  if (!phone.value || phone.value.length < 11) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      if (timer) clearInterval(timer)
    }
  }, 1000) as unknown as number
  uni.showToast({ title: '验证码已发送', icon: 'success' })
}

const handleSmsLogin = async () => {
  if (!phone.value || !smsCode.value) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' })
    return
  }
  logging.value = true
  uni.showLoading({ title: '登录中...' })
  const ok = await userStore.doLogin({ phone: phone.value, code: smsCode.value })
  if (ok) {
    showSmsForm.value = false
    loginSuccess()
  } else {
    logging.value = false
    uni.hideLoading()
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #fff;
}

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
  margin-bottom: 24rpx;
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

.agreement-row {
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

.popup-overlay {
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

.popup-content {
  width: 100%;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 40rpx 32rpx calc(40rpx + env(safe-area-inset-bottom));
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 40rpx;
}

.popup-title {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.popup-close {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-icon {
  font-size: 40rpx;
  color: #999;
}

.sms-form {
  display: flex;
  flex-direction: column;
  gap: 30rpx;
}

.sms-input {
  width: 100%;
  height: 90rpx;
  border: 2rpx solid #eee;
  border-radius: 16rpx;
  padding: 0 30rpx;
  font-size: 30rpx;
  box-sizing: border-box;
}

.code-row {
  display: flex;
  gap: 20rpx;
}

.code-input {
  flex: 1;
}

.code-btn {
  flex-shrink: 0;
  height: 90rpx;
  line-height: 90rpx;
  padding: 0 30rpx;
  background: var(--color-primary-light);
  color: var(--color-primary);
  border: none;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 500;

  &[disabled] {
    opacity: 0.6;
  }

  &::after {
    border: none;
  }
}

.submit-btn {
  width: 100%;
  height: 90rpx;
  background: var(--color-primary-gradient);
  color: #fff;
  border: none;
  border-radius: 16rpx;
  font-size: 32rpx;
  font-weight: 600;
  margin-top: 20rpx;

  &::after {
    border: none;
  }
}
</style>
