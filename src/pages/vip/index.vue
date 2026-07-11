<template>
  <view class="page vip-page">
    <!-- 顶部标题 -->
    <view class="vip-header">
      <text class="vip-title">&#9733; 开通 VIP</text>
      <text class="vip-subtitle">解锁全部功能，让请柬更专业</text>
    </view>
    
    <!-- 权益展示 -->
    <view class="vip-benefits">
      <view v-for="b in benefits" :key="b.icon" class="benefit-item">
        <text class="benefit-icon">{{ b.icon }}</text>
        <text class="benefit-title">{{ b.title }}</text>
        <text class="benefit-desc">{{ b.desc }}</text>
      </view>
    </view>
    
    <!-- 价格卡片 -->
    <view class="vip-plans">
      <view
        v-for="plan in plans"
        :key="plan.key"
        class="plan-card"
        :class="{ active: selectedPlan === plan.key, best: plan.best }"
        @click="selectedPlan = plan.key"
      >
        <view v-if="plan.best" class="best-badge">最划算</view>
        <text class="plan-name">{{ plan.name }}</text>
        <text class="plan-price">{{ plan.price }}元</text>
        <text class="plan-original" v-if="plan.original">原价{{ plan.original }}元</text>
        <text class="plan-unit">/{{ plan.unit }}</text>
      </view>
    </view>
    
    <!-- 权益对比表 -->
    <view class="vip-compare">
      <view class="compare-row compare-header">
        <text class="compare-cell">功能</text>
        <text class="compare-cell">免费</text>
        <text class="compare-cell vip-cell">VIP</text>
      </view>
      <view v-for="c in compareList" :key="c.feature" class="compare-row">
        <text class="compare-cell">{{ c.feature }}</text>
        <text class="compare-cell">{{ c.free }}</text>
        <text class="compare-cell vip-cell">{{ c.vip }}</text>
      </view>
    </view>
    
    <!-- 底部支付按钮 -->
    <view class="vip-footer">
      <button class="pay-btn" @click="handlePay">
        立即开通 {{ currentPlan.price }}元
      </button>
      <text class="pay-tip">开通即表示同意《VIP服务协议》</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { track } from '@/utils/track'
import { useUserStore } from '@/stores/user'
import { createVipOrder } from '@/api'

const userStore = useUserStore()

const benefits = [
  { icon: '&#127912;', title: '全模板解锁', desc: '500+ 精美模板免费用' },
  { icon: '&#128230;', title: '高清无水印', desc: '1440px 高清导出' },
  { icon: '&#127925;', title: '专属音乐库', desc: '全部音乐免费使用' },
  { icon: '&#128722;', title: '商城9折', desc: '婚礼用品全场折扣' },
  { icon: '&#128100;', title: '专属客服', desc: '优先响应快速解决' },
  { icon: '&#10060;', title: '去广告', desc: '纯净使用体验' },
]

const plans = [
  { key: 'monthly', name: '月卡', price: 29, original: 29, unit: '月', best: false },
  { key: 'quarterly', name: '季卡', price: 69, original: 87, unit: '季', best: false },
  { key: 'yearly', name: '年卡', price: 199, original: 348, unit: '年', best: true },
]

const selectedPlan = ref('yearly')
const currentPlan = computed(() => plans.find(p => p.key === selectedPlan.value)!)

const compareList = [
  { feature: '模板数量', free: '30套', vip: '全站500+' },
  { feature: '导出质量', free: '720px 带水印', vip: '1440px 无水印' },
  { feature: '导出格式', free: '图片', vip: '图片+PDF+素材包' },
  { feature: '高级素材', free: '不可用', vip: '全素材库' },
  { feature: '商城折扣', free: '原价', vip: '全场9折' },
  { feature: '客服支持', free: '无', vip: '专属客服' },
]

async function handlePay() {
  track('vip_click_pay', { plan: selectedPlan.value, price: currentPlan.value.price })
  uni.showLoading({ title: '创建订单中...' })
  try {
    const order = await createVipOrder(selectedPlan.value, currentPlan.value.price)
    uni.hideLoading()
    uni.requestPayment({
      provider: 'wxpay',
      timeStamp: String(Math.floor(Date.now() / 1000)),
      nonceStr: order.nonceStr || Math.random().toString(36).slice(2),
      package: `prepay_id=${order.prepayId}`,
      signType: 'MD5',
      paySign: order.paySign || 'DEV_SIGN',
      success: async () => {
        uni.showLoading({ title: '验证中...' })
        try {
          await userStore.fetchUserInfo()
        } catch (e) {
          console.warn('fetch user info after pay failed', e)
        }
        uni.hideLoading()
        track('vip_pay_success', { plan: selectedPlan.value, price: currentPlan.value.price })
        if (userStore.isVip()) {
          uni.showToast({ title: '开通成功！', icon: 'success' })
        } else {
          uni.showToast({ title: '支付成功', icon: 'success' })
        }
        setTimeout(() => uni.navigateBack(), 1500)
      },
      fail: () => uni.showToast({ title: '支付取消', icon: 'none' }),
    })
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: '创建订单失败', icon: 'none' })
  }
}

// 页面曝光埋点
track('vip_page_view')
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #0f172a; color: #f1f5f9; padding-bottom: 240rpx; }
.vip-header { text-align: center; padding: 80rpx 40rpx; background: linear-gradient(135deg, #f59e0b22, #ec489922); }
.vip-title { font-size: 56rpx; font-weight: 700; display: block; }
.vip-subtitle { font-size: 28rpx; color: #94a3b8; margin-top: 16rpx; display: block; }
.vip-benefits { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24rpx; padding: 40rpx; }
.benefit-item { background: #1e293b; border-radius: 24rpx; padding: 32rpx 16rpx; text-align: center; }
.benefit-icon { font-size: 48rpx; display: block; }
.benefit-title { font-size: 26rpx; font-weight: 600; margin-top: 16rpx; display: block; }
.benefit-desc { font-size: 22rpx; color: #94a3b8; margin-top: 8rpx; display: block; }
.vip-plans { display: flex; gap: 24rpx; padding: 0 40rpx; }
.plan-card { flex: 1; background: #1e293b; border: 2rpx solid #334155; border-radius: 24rpx; padding: 32rpx; text-align: center; position: relative; }
.plan-card.active { border-color: #f59e0b; background: #f59e0b11; }
.best-badge { position: absolute; top: -20rpx; right: 16rpx; background: #f59e0b; color: #0f172a; font-size: 20rpx; font-weight: 700; padding: 4rpx 16rpx; border-radius: 20rpx; }
.plan-name { font-size: 28rpx; display: block; }
.plan-price { font-size: 48rpx; font-weight: 700; color: #f59e0b; display: block; margin-top: 8rpx; }
.plan-original { font-size: 22rpx; color: #94a3b8; text-decoration: line-through; display: block; }
.plan-unit { font-size: 24rpx; color: #94a3b8; }
.vip-compare { margin: 40rpx; background: #1e293b; border-radius: 24rpx; overflow: hidden; }
.compare-row { display: flex; border-bottom: 2rpx solid #334155; }
.compare-header { background: #334155; font-weight: 600; }
.compare-cell { flex: 1; padding: 24rpx 16rpx; font-size: 26rpx; text-align: center; }
.vip-cell { color: #f59e0b; font-weight: 600; }
.vip-footer { position: fixed; bottom: 0; left: 0; right: 0; background: #0f172a; border-top: 2rpx solid #334155; padding: 32rpx 40rpx; z-index: 100; }
.pay-btn { width: 100%; background: linear-gradient(135deg, #f59e0b, #ec4899); color: #0f172a; font-weight: 700; font-size: 32rpx; border: none; border-radius: 48rpx; padding: 28rpx; }
.pay-tip { display: block; text-align: center; font-size: 22rpx; color: #94a3b8; margin-top: 16rpx; }
</style>
