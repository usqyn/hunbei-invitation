<template>
  <view class="page">
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="nav-back-icon">&#x276e;</text>
      </view>
      <text class="nav-title">意见反馈</text>
      <view class="nav-placeholder"></view>
    </view>

    <view class="content">
      <view class="card">
        <view class="form-item">
          <text class="form-label">反馈内容</text>
          <textarea
            class="form-textarea"
            v-model="form.content"
            placeholder="请输入您的意见和建议..."
            maxlength="500"
          />
          <text class="form-count">{{ form.content.length }}/500</text>
        </view>

        <view class="form-item">
          <text class="form-label">联系方式</text>
          <input
            class="form-input"
            v-model="form.contact"
            placeholder="请输入手机号或邮箱（选填）"
          />
        </view>
      </view>

      <view class="submit-wrap">
        <view class="submit-btn" :class="{ disabled: !form.content.trim() }" @click="handleSubmit">提交反馈</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useGoBack } from '@/composables/useGoBack'
import { submitFeedback } from '@/api'

const goBack = useGoBack()

const form = reactive({
  content: '',
  contact: ''
})

const handleSubmit = async () => {
  if (!form.content.trim()) {
    uni.showToast({ title: '请输入反馈内容', icon: 'none' })
    return
  }

  try {
    await submitFeedback(form.content.trim(), form.contact.trim() || undefined)
    uni.showToast({ title: '提交成功', icon: 'success' })
    setTimeout(() => {
      goBack()
    }, 1500)
  } catch (e) {
    uni.showToast({ title: '提交失败', icon: 'none' })
  }
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
  padding: 24rpx;
}

.form-item {
  margin-bottom: 32rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.form-label {
  font-size: 28rpx;
  color: #333333;
  font-weight: 500;
  display: block;
  margin-bottom: 16rpx;
}

.form-textarea {
  width: 100%;
  height: 240rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
  color: #333333;
  box-sizing: border-box;
}

.form-count {
  display: block;
  text-align: right;
  font-size: 24rpx;
  color: #999999;
  margin-top: 8rpx;
}

.form-input {
  width: 100%;
  height: 80rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  color: #333333;
  box-sizing: border-box;
}

.submit-wrap {
  margin-top: 48rpx;
  padding: 0 24rpx;
}

.submit-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  background: #e84a6e;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 500;

  &.disabled {
    opacity: 0.5;
  }
}
</style>
