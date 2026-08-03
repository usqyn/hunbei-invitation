<template>
  <view class="pay-result-page">
    <view class="result-section" v-if="status === 'success'">
      <view class="result-icon success">✓</view>
      <view class="result-title">支付成功</view>
      <view class="result-amount">
        <text class="amount-label">支付金额</text>
        <text class="amount-symbol">¥</text>
        <text class="amount-num">{{ amount }}</text>
      </view>
      <view class="result-order">订单编号: {{ orderNo }}</view>
    </view>

    <view class="result-section" v-if="status === 'fail'">
      <view class="result-icon fail">✕</view>
      <view class="result-title">支付失败</view>
      <view class="result-desc">支付遇到问题，请稍后重试</view>
    </view>

    <view class="action-buttons">
      <view class="btn-primary" @click="viewOrder">查看订单</view>
      <view class="btn-secondary" @click="continueShop">继续购物</view>
    </view>

    <view class="service-tips">
      <view class="tips-title">如有问题请联系客服</view>
      <view class="tips-item">📞 客服电话：13075556166</view>
      <view class="tips-item">💬 客服微信：bastao_service</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const orderNo = ref('')
const amount = ref('0.00')
const status = ref('success')

onLoad((options) => {
  orderNo.value = options?.orderNo || ''
  amount.value = options?.amount || '0.00'
  status.value = options?.status || 'success'
})

const viewOrder = () => {
  uni.redirectTo({ url: '/pages/mall-sub/orders' })
}

const continueShop = () => {
  uni.switchTab({ url: '/pages/mall/index' })
}
</script>

<style lang="scss" scoped>
.pay-result-page {
  min-height: 100vh;
  background: #F5F5F5;
  padding: 60rpx 30rpx;
}

.result-section {
  background: #fff;
  border-radius: 20rpx;
  padding: 60rpx 30rpx;
  text-align: center;
  margin-bottom: 30rpx;
}

.result-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 60rpx;
  margin: 0 auto 30rpx;
}

.result-icon.success { background: #E8F5E9; color: #4CAF50; }
.result-icon.fail { background: #FFEBEE; color: #F44336; }

.result-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #333;
  margin-bottom: 20rpx;
}

.result-amount {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin-bottom: 20rpx;
}

.amount-label {
  font-size: 26rpx;
  color: #666;
  margin-right: 10rpx;
}

.amount-symbol {
  font-size: 28rpx;
  font-weight: 700;
  color: #e84a6e;
}

.amount-num {
  font-size: 48rpx;
  font-weight: 700;
  color: #e84a6e;
}

.result-order {
  font-size: 24rpx;
  color: #999;
}

.result-desc {
  font-size: 26rpx;
  color: #666;
}

.action-buttons { margin-bottom: 30rpx; }

.btn-primary {
  background: #e84a6e;
  color: #fff;
  text-align: center;
  padding: 28rpx 0;
  border-radius: 50rpx;
  font-size: 30rpx;
  font-weight: 600;
  margin-bottom: 20rpx;
}

.btn-secondary {
  background: #fff;
  color: #e84a6e;
  text-align: center;
  padding: 28rpx 0;
  border-radius: 50rpx;
  font-size: 30rpx;
  font-weight: 600;
  border: 2rpx solid #e84a6e;
}

.service-tips {
  background: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
}

.tips-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
}

.tips-item {
  font-size: 26rpx;
  color: #666;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.tips-item:last-child { border-bottom: none; }
</style>
