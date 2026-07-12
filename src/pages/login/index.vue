<template>
  <view class="page">
    <view class="top-section">
      <view class="gradient-bg">
        <view class="blob blob-1"></view>
        <view class="blob blob-2"></view>
        <view class="blob blob-3"></view>
        <view class="blob blob-4"></view>
        <view class="blob blob-5"></view>
      </view>
      <view class="decorative-elements">
        <view class="sparkle sparkle-1">✦</view>
        <view class="sparkle sparkle-2">✧</view>
        <view class="sparkle sparkle-3">✦</view>
        <view class="sparkle sparkle-4">✧</view>
        <view class="heart heart-1">♡</view>
        <view class="heart heart-2">♥</view>
        <view class="heart heart-3">♡</view>
      </view>
      <view class="back-btn" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <view class="logo-area">
        <view class="logo-wrapper">
          <view class="logo-glow"></view>
          <view class="logo">
            <image class="logo-icon" src="/static/images/logo.png" mode="aspectFit"></image>
          </view>
        </view>
        <text class="app-name">婚贝请柬</text>
        <text class="app-desc">微信一键登录，制作专属婚礼请柬</text>
      </view>
    </view>

    <view class="bottom-card">
      <view class="card-handle"></view>
      <view class="card-content">
        <view class="welcome-section">
          <text class="welcome-title">欢迎回来</text>
          <text class="welcome-subtitle">开启您的浪漫婚礼之旅</text>
        </view>

        <view class="agreement-section">
          <view class="agreement-row">
            <view class="checkbox" :class="{ checked: agreed }" @click="toggleAgreement">
              <view class="checkmark">
                <text class="check-icon">✓</text>
              </view>
            </view>
            <text class="agreement-text">已阅读并同意</text>
            <text class="agreement-link" @click.stop="openAgreement('user')">《用户协议》</text>
            <text class="agreement-text">和</text>
            <text class="agreement-link" @click.stop="openAgreement('privacy')">《隐私协议》</text>
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
          <view v-if="logging" class="btn-loading">
            <view class="spinner"></view>
            <text class="btn-text">登录中...</text>
          </view>
          <text v-else class="btn-text">微信一键登录</text>
        </button>
        <button
          v-else
          class="login-btn"
          :class="{ disabled: !agreed, loading: logging }"
          :disabled="!agreed || logging"
          @click="handleH5Login"
        >
          <view v-if="logging" class="btn-loading">
            <view class="spinner"></view>
            <text class="btn-text">登录中...</text>
          </view>
          <text v-else class="btn-text">一键登录</text>
        </button>

        <view class="divider">
          <view class="divider-line"></view>
          <text class="divider-text">其他方式</text>
          <view class="divider-line"></view>
        </view>

        <view class="alt-login">
          <view class="alt-item" @click="openSmsForm">
            <view class="alt-icon-wrapper">
              <text class="alt-icon">📱</text>
            </view>
            <text class="alt-text">手机号登录</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="showSmsForm" class="popup-overlay" @click="showSmsForm = false">
      <view class="popup-content" @click.stop>
        <view class="popup-handle"></view>
        <view class="popup-header">
          <text class="popup-title">手机号登录</text>
          <view class="popup-close" @click="showSmsForm = false">
            <text class="close-icon">✕</text>
          </view>
        </view>
        <view class="sms-form">
          <view class="input-wrapper">
            <text class="input-label">手机号</text>
            <input
              class="sms-input"
              :class="{ 'input-valid': phoneValid, 'input-invalid': phoneTouched && !phoneValid && phone.length > 0 }"
              v-model="phone"
              placeholder="请输入手机号"
              maxlength="11"
              type="number"
              @input="onPhoneInput"
              @blur="phoneTouched = true"
            />
            <view v-if="phoneTouched && phone.length > 0" class="input-feedback">
              <text v-if="phoneValid" class="feedback-valid">✓ 手机号格式正确</text>
              <text v-else class="feedback-invalid">请输入正确的 11 位手机号</text>
            </view>
          </view>
          <view class="input-wrapper">
            <text class="input-label">验证码</text>
            <view class="code-row">
              <input
                class="sms-input code-input"
                :class="{ 'input-valid': smsCode.length === 6 }"
                v-model="smsCode"
                placeholder="请输入验证码"
                maxlength="6"
                type="number"
              />
              <button
                class="code-btn"
                :class="{ counting: countdown > 0, 'code-btn--ready': phoneValid && countdown === 0 }"
                :disabled="countdown > 0 || !phoneValid"
                @click="sendCode"
              >
                <text v-if="countdown > 0">{{ countdown }}s 后重发</text>
                <text v-else>获取验证码</text>
              </button>
            </view>
          </view>
          <button
            class="submit-btn"
            :class="{ loading: logging }"
            :disabled="logging || !phoneValid || smsCode.length < 4"
            @click="handleSmsLogin"
          >
            <view v-if="logging" class="btn-loading">
              <view class="spinner"></view>
              <text class="btn-text">登录中...</text>
            </view>
            <text v-else class="btn-text">登 录</text>
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useWorksStore } from '@/stores/works'
import { request } from '@/utils/request'
import { useGoBack } from '@/composables/useGoBack'
import { haptic, feedbackSuccess, feedbackError, feedbackWarning } from '@/composables/useFeedback'

const userStore = useUserStore()
const worksStore = useWorksStore()

const agreed = ref(false)
const logging = ref(false)
const showSmsForm = ref(false)
const phone = ref('')
const smsCode = ref('')
const countdown = ref(0)
const phoneTouched = ref(false)
let timer: number | null = null
const isMpWeixin = ref(false)

/** 手机号实时校验 */
const phoneValid = computed(() => /^1[3-9]\d{9}$/.test(phone.value))

function onPhoneInput() {
  // 输入到 11 位时触达校验
  if (phone.value.length === 11 && phoneValid.value) {
    haptic('light')
  }
}

try {
  const info = uni.getSystemInfoSync()
  isMpWeixin.value = info.uniPlatform === 'mp-weixin'
} catch (_) {}

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})

const openAgreement = (type: string) => {
  uni.navigateTo({ url: `/pages/agreement/index?type=${type}` })
}

const toggleAgreement = () => {
  agreed.value = !agreed.value
}

const openSmsForm = () => {
  if (!agreed.value) {
    feedbackWarning('请先同意用户协议')
    return
  }
  showSmsForm.value = true
}

const goBack = useGoBack()

const loginSuccess = async () => {
  logging.value = false
  try {
    await userStore.fetchUserInfo()
  } catch (e) {
    console.warn('fetch user info after login failed', e)
  }
  try {
    await worksStore.loadAll()
  } catch (e) {
    console.warn('load works after login failed', e)
  }
  uni.hideLoading()
  feedbackSuccess('登录成功')
  setTimeout(() => goBack(), 1500)
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
      else { logging.value = false; uni.hideLoading(); feedbackError('登录失败，请重试') }
    },
    fail: () => {
      logging.value = false
      uni.hideLoading()
      feedbackError('授权失败，请重试')
    },
  })
}

const handleH5Login = async () => {
  if (!agreed.value || logging.value) return
  // H5 环境下先打开短信登录弹窗
  if (!showSmsForm.value) {
    showSmsForm.value = true
    feedbackWarning('请输入手机号和验证码登录')
    return
  }
  if (!phoneValid.value) {
    feedbackWarning('请输入正确的手机号')
    return
  }
  if (smsCode.value.length < 4) {
    feedbackWarning('请输入验证码')
    return
  }
  logging.value = true
  uni.showLoading({ title: '登录中...' })
  try {
    const ok = await userStore.doLogin({ phone: phone.value, code: smsCode.value })
    if (ok) {
      loginSuccess()
    } else {
      logging.value = false
      uni.hideLoading()
    }
  } catch (e) {
    logging.value = false
    uni.hideLoading()
  }
}

const sendCode = async () => {
  if (!phone.value || !phoneValid.value) {
    feedbackWarning('请输入正确的手机号')
    return
  }
  haptic('medium')
  try {
    await request({ url: '/api/sms/send', method: 'POST', data: { phone: phone.value }, hideLoading: true })
  } catch (e: any) {
    feedbackError(e.message || '网络错误，请重试')
    return
  }
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      if (timer) clearInterval(timer)
    }
  }, 1000)
  feedbackSuccess('验证码已发送')
}

const handleSmsLogin = async () => {
  if (!agreed.value) {
    feedbackWarning('请先同意用户协议')
    return
  }
  if (!phoneValid.value) {
    feedbackWarning('请输入正确的手机号')
    return
  }
  if (smsCode.value.length < 4) {
    feedbackWarning('请输入验证码')
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
    feedbackError('登录失败，请检查验证码')
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #fff;
  position: relative;
  overflow: hidden;
}

.top-section {
  position: relative;
  height: 45vh;
  width: 100%;
  overflow: hidden;
}

.gradient-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, #fff5f7 0%, #ffe4e8 50%, #ffd6dc 100%);
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60rpx);
  opacity: 0.6;
}

.blob-1 {
  width: 400rpx;
  height: 400rpx;
  background: radial-gradient(circle, #ffb6c1 0%, transparent 70%);
  top: -100rpx;
  left: -80rpx;
  animation: float1 8s ease-in-out infinite;
}

.blob-2 {
  width: 350rpx;
  height: 350rpx;
  background: radial-gradient(circle, #ffd1dc 0%, transparent 70%);
  top: 60rpx;
  right: -100rpx;
  animation: float2 10s ease-in-out infinite;
}

.blob-3 {
  width: 300rpx;
  height: 300rpx;
  background: radial-gradient(circle, #ffc0cb 0%, transparent 70%);
  bottom: 80rpx;
  left: 20%;
  animation: float3 7s ease-in-out infinite;
}

.blob-4 {
  width: 280rpx;
  height: 280rpx;
  background: radial-gradient(circle, #fff0f3 0%, transparent 70%);
  bottom: 40rpx;
  right: 10%;
  animation: float4 9s ease-in-out infinite;
}

.blob-5 {
  width: 200rpx;
  height: 200rpx;
  background: radial-gradient(circle, #ffb3ba 0%, transparent 70%);
  top: 40%;
  left: 50%;
  transform: translateX(-50%);
  animation: float5 6s ease-in-out infinite;
}

@keyframes float1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(30rpx, 20rpx) scale(1.1); }
}

@keyframes float2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-20rpx, 30rpx) scale(1.05); }
}

@keyframes float3 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(20rpx, -20rpx) scale(1.1); }
}

@keyframes float4 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-30rpx, -10rpx) scale(1.05); }
}

@keyframes float5 {
  0%, 100% { transform: translateX(-50%) translate(0, 0) scale(1); }
  50% { transform: translateX(-50%) translate(10rpx, 20rpx) scale(1.15); }
}

.decorative-elements {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.sparkle {
  position: absolute;
  color: #fff;
  opacity: 0.8;
  text-shadow: 0 0 10rpx rgba(255, 255, 255, 0.8);
}

.sparkle-1 {
  top: 15%;
  left: 15%;
  font-size: 24rpx;
  animation: sparkleAnim 3s ease-in-out infinite;
}

.sparkle-2 {
  top: 25%;
  right: 20%;
  font-size: 18rpx;
  animation: sparkleAnim 2.5s ease-in-out infinite 0.5s;
}

.sparkle-3 {
  top: 60%;
  left: 10%;
  font-size: 20rpx;
  animation: sparkleAnim 3.5s ease-in-out infinite 1s;
}

.sparkle-4 {
  top: 50%;
  right: 15%;
  font-size: 22rpx;
  animation: sparkleAnim 2.8s ease-in-out infinite 0.3s;
}

@keyframes sparkleAnim {
  0%, 100% { opacity: 0.4; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

.heart {
  position: absolute;
  color: var(--color-primary);
  opacity: 0.5;
}

.heart-1 {
  top: 20%;
  left: 25%;
  font-size: 28rpx;
  animation: heartFloat 4s ease-in-out infinite;
}

.heart-2 {
  top: 35%;
  right: 25%;
  font-size: 24rpx;
  animation: heartFloat 5s ease-in-out infinite 1s;
}

.heart-3 {
  bottom: 25%;
  left: 30%;
  font-size: 20rpx;
  animation: heartFloat 3.5s ease-in-out infinite 0.5s;
}

@keyframes heartFloat {
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
  50% { transform: translateY(-15rpx) rotate(10deg); opacity: 0.7; }
}

.back-btn {
  position: absolute;
  top: calc(20rpx + env(safe-area-inset-top));
  left: 20rpx;
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  backdrop-filter: blur(10rpx);
  -webkit-backdrop-filter: blur(10rpx);
  z-index: 10;
}

.back-icon {
  font-size: 56rpx;
  color: var(--color-text-primary);
  font-weight: 300;
  line-height: 1;
  margin-top: -4rpx;
}

.logo-area {
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding-top: 40rpx;
}

.logo-wrapper {
  position: relative;
  margin-bottom: 32rpx;
}

.logo-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200rpx;
  height: 200rpx;
  background: radial-gradient(circle, rgba(232, 74, 110, 0.3) 0%, transparent 70%);
  border-radius: 50%;
  animation: pulseGlow 2.5s ease-in-out infinite;
}

@keyframes pulseGlow {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
  50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0.9; }
}

.logo {
  position: relative;
  width: 140rpx;
  height: 140rpx;
  background: var(--color-primary-gradient);
  border-radius: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 40rpx rgba(232, 74, 110, 0.4);
}

.logo-icon {
  width: 100rpx;
  height: 100rpx;
}

.app-name {
  font-size: 52rpx;
  font-weight: 700;
  background: var(--color-primary-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  margin-bottom: 12rpx;
  letter-spacing: 2rpx;
}

.app-desc {
  font-size: 26rpx;
  color: var(--color-text-secondary);
  opacity: 0.8;
}

.bottom-card {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 48rpx 48rpx 0 0;
  box-shadow: 0 -8rpx 40rpx rgba(0, 0, 0, 0.08);
  animation: slideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) both;
  z-index: 20;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.card-handle {
  width: 80rpx;
  height: 8rpx;
  background: #e5e5ea;
  border-radius: 4rpx;
  margin: 20rpx auto 0;
}

.card-content {
  padding: 40rpx 48rpx calc(48rpx + env(safe-area-inset-bottom));
}

.welcome-section {
  margin-bottom: 48rpx;
}

.welcome-title {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 12rpx;
}

.welcome-subtitle {
  display: block;
  font-size: 28rpx;
  color: var(--color-text-secondary);
}

.agreement-section {
  width: 100%;
  margin-bottom: 40rpx;
}

.agreement-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 6rpx;
}

.checkbox {
  width: 40rpx;
  height: 40rpx;
  border: 3rpx solid #ddd;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10rpx;
  flex-shrink: 0;
  transition: all 0.25s ease;
  background: #fff;

  &.checked {
    background: var(--color-primary-gradient);
    border-color: transparent;
    box-shadow: 0 4rpx 12rpx rgba(232, 74, 110, 0.3);
  }
}

.checkmark {
  display: flex;
  align-items: center;
  justify-content: center;
  transform: scale(0);
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);

  .checked & {
    transform: scale(1);
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
  color: var(--color-primary);
  font-weight: 500;
}

.login-btn {
  width: 100%;
  height: 104rpx;
  background: var(--color-primary-gradient);
  border-radius: 52rpx;
  border: none;
  font-size: 34rpx;
  font-weight: 600;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 32rpx rgba(232, 74, 110, 0.35);
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &.disabled {
    background: #e5e5ea;
    color: var(--color-text-tertiary);
    box-shadow: none;
  }

  &:active:not(.disabled) {
    transform: scale(0.96);
    box-shadow: 0 8rpx 20rpx rgba(232, 74, 110, 0.4);
  }

  &::after {
    border: none;
  }
}

.btn-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}

.spinner {
  width: 36rpx;
  height: 36rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.btn-text {
  font-size: 34rpx;
  font-weight: 600;
}

.divider {
  width: 100%;
  display: flex;
  align-items: center;
  margin: 48rpx 0;
  gap: 24rpx;
}

.divider-line {
  flex: 1;
  height: 1rpx;
  background: linear-gradient(90deg, transparent, #e5e5ea, transparent);
}

.divider-text {
  font-size: 26rpx;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.alt-login {
  width: 100%;
}

.alt-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 28rpx;
  border: 2rpx solid var(--color-border);
  border-radius: 28rpx;
  background: var(--color-bg-card);
  transition: all 0.2s ease;

  &:active {
    background: var(--color-bg-hover);
    transform: scale(0.98);
  }
}

.alt-icon-wrapper {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.alt-icon {
  font-size: 36rpx;
}

.alt-text {
  font-size: 30rpx;
  color: var(--color-text-primary);
  font-weight: 500;
}

.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
  animation: fadeIn 0.25s ease both;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.popup-content {
  width: 100%;
  background: #fff;
  border-radius: 40rpx 40rpx 0 0;
  padding: 20rpx 32rpx calc(40rpx + env(safe-area-inset-bottom));
  animation: slideUp 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
}

.popup-handle {
  width: 80rpx;
  height: 8rpx;
  background: #e5e5ea;
  border-radius: 4rpx;
  margin: 0 auto 20rpx;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 40rpx;
}

.popup-title {
  font-size: 38rpx;
  font-weight: 700;
  color: var(--color-text-primary);
}

.popup-close {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-input);
  border-radius: 50%;
}

.close-icon {
  font-size: 32rpx;
  color: var(--color-text-secondary);
}

.sms-form {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.input-label {
  font-size: 26rpx;
  color: var(--color-text-secondary);
  font-weight: 500;
  padding-left: 8rpx;
}

.sms-input {
  width: 100%;
  height: 100rpx;
  border: 2rpx solid var(--color-border);
  border-radius: 20rpx;
  padding: 0 32rpx;
  font-size: 32rpx;
  box-sizing: border-box;
  background: var(--color-bg-card);
  transition: all 0.25s ease;
  color: var(--color-text-primary);

  &:focus {
    border-color: var(--color-primary);
    background: #fff;
    box-shadow: 0 0 0 6rpx rgba(232, 74, 110, 0.1);
  }

  &.input-valid {
    border-color: var(--color-text-success);
    background: rgba(34, 197, 94, 0.03);
    box-shadow: 0 0 0 6rpx rgba(34, 197, 94, 0.08);
  }

  &.input-invalid {
    border-color: var(--color-text-danger);
    background: rgba(239, 68, 68, 0.03);
    box-shadow: 0 0 0 6rpx rgba(239, 68, 68, 0.08);
    animation: shake 0.3s ease;
  }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8rpx); }
  75% { transform: translateX(8rpx); }
}

.input-feedback {
  padding-left: 8rpx;
  margin-top: 4rpx;
}

.feedback-valid {
  font-size: 24rpx;
  color: var(--color-text-success);
  font-weight: 500;
  animation: fadeInUp 0.2s ease;
}

.feedback-invalid {
  font-size: 24rpx;
  color: var(--color-text-danger);
  font-weight: 500;
  animation: fadeInUp 0.2s ease;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(4rpx); }
  to { opacity: 1; transform: translateY(0); }
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
  height: 100rpx;
  line-height: 100rpx;
  padding: 0 32rpx;
  background: var(--color-primary-light);
  color: var(--color-primary);
  border: none;
  border-radius: 20rpx;
  font-size: 28rpx;
  font-weight: 600;
  transition: all 0.2s ease;

  &[disabled], &.counting {
    background: var(--color-bg-input);
    color: var(--color-text-tertiary);
  }

  &:active:not([disabled]):not(.counting) {
    transform: scale(0.96);
  }

  &::after {
    border: none;
  }
}

.submit-btn {
  width: 100%;
  height: 100rpx;
  background: var(--color-primary-gradient);
  color: #fff;
  border: none;
  border-radius: 24rpx;
  font-size: 34rpx;
  font-weight: 600;
  margin-top: 16rpx;
  box-shadow: 0 12rpx 32rpx rgba(232, 74, 110, 0.35);
  transition: all 0.15s ease;

  &:active:not(.loading) {
    transform: scale(0.96);
    box-shadow: 0 8rpx 20rpx rgba(232, 74, 110, 0.4);
  }

  &::after {
    border: none;
  }
}
</style>
