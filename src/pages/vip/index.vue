<template>
  <view class="page vip-page">
    <!-- Hero 区域 -->
    <view class="vip-hero">
      <view class="hero-bg">
        <view class="hero-glow"></view>
        <view class="sparkle sparkle-1"></view>
        <view class="sparkle sparkle-2"></view>
        <view class="sparkle sparkle-3"></view>
        <view class="sparkle sparkle-4"></view>
        <view class="sparkle sparkle-5"></view>
      </view>
      <view class="crown-container">
        <view class="crown-glow"></view>
        <text class="crown-icon">&#128081;</text>
        <view class="ray ray-1"></view>
        <view class="ray ray-2"></view>
        <view class="ray ray-3"></view>
        <view class="ray ray-4"></view>
      </view>
      <text class="vip-title">开通VIP</text>
      <text class="vip-subtitle">解锁全部功能，让请柬更专业</text>
    </view>

    <!-- 权益展示 -->
    <view class="vip-benefits-section">
      <text class="section-title">会员特权</text>
      <view class="vip-benefits">
        <view v-for="b in benefits" :key="b.icon" class="benefit-item">
          <view class="benefit-icon-wrap">
            <text class="benefit-icon">{{ b.icon }}</text>
          </view>
          <text class="benefit-title">{{ b.title }}</text>
          <text class="benefit-desc">{{ b.desc }}</text>
        </view>
      </view>
    </view>

    <!-- 价格卡片 -->
    <view class="vip-plans-section">
      <text class="section-title">选择套餐</text>
      <view class="vip-plans">
        <view
          v-for="plan in plans"
          :key="plan.key"
          class="plan-card"
          :class="{ active: selectedPlan === plan.key, best: plan.best }"
          @click="selectedPlan = plan.key"
        >
          <view v-if="plan.best" class="best-badge">
            <text class="best-badge-text">最划算</text>
          </view>
          <text class="plan-name">{{ plan.name }}</text>
          <view class="plan-price-wrap">
            <text class="plan-price">{{ plan.price }}</text>
            <text class="plan-currency">元</text>
          </view>
          <text class="plan-original" v-if="plan.original && plan.original !== plan.price">原价{{ plan.original }}元</text>
          <text class="plan-unit">/{{ plan.unit }}</text>
          <text v-if="plan.best" class="plan-avg">月均{{ Math.round(plan.price / plan.months) }}元</text>
          <text v-else class="plan-avg plan-avg-normal">月均{{ Math.round(plan.price / plan.months) }}元</text>
        </view>
      </view>
    </view>

    <!-- 权益对比表 -->
    <view class="vip-compare-section">
      <text class="section-title">权益对比</text>
      <view class="vip-compare">
        <view class="compare-row compare-header">
          <text class="compare-cell compare-feature">功能</text>
          <text class="compare-cell">免费</text>
          <text class="compare-cell vip-cell">VIP</text>
        </view>
        <view v-for="c in compareList" :key="c.feature" class="compare-row">
          <text class="compare-cell compare-feature">{{ c.feature }}</text>
          <text class="compare-cell">{{ c.free }}</text>
          <text class="compare-cell vip-cell">{{ c.vip }}</text>
        </view>
      </view>
    </view>

    <!-- 底部支付按钮 -->
    <view class="vip-footer">
      <view class="footer-bg"></view>
      <button class="pay-btn" :disabled="paying" @click="handlePay">
        <text class="pay-btn-text">立即开通 {{ currentPlan.price }}元</text>
      </button>
      <text class="pay-tip">开通即表示同意<text class="pay-agreement" @click="openAgreement">《VIP服务协议》</text></text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { track } from '@/utils/track'
import { useUserStore } from '@/stores/user'
import { createVipOrder, payOrder as requestPayOrder } from '@/api'

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
  { key: 'monthly', name: '月卡', price: 29, original: 29, unit: '月', months: 1, best: false },
  { key: 'quarterly', name: '季卡', price: 69, original: 87, unit: '季', months: 3, best: false },
  { key: 'yearly', name: '年卡', price: 199, original: 348, unit: '年', months: 12, best: true },
]

const selectedPlan = ref('yearly')
const currentPlan = computed(() => plans.find(p => p.key === selectedPlan.value)!)
const paying = ref(false)
let navigateBackTimer: any = null

// 单买模板模式：从模板页跳转携带 mode=purchase&templateId=xxx&price=xxx
// 当前实现：统一引导用户开通 VIP 解锁全部付费模板（推荐策略）
const purchaseMode = ref(false)
const purchaseTemplateId = ref('')
const purchasePrice = ref(0)

onMounted(() => {
  const pages = getCurrentPages()
  const curPage = pages[pages.length - 1] as any
  const options = curPage?.options || {}
  if (options.mode === 'purchase') {
    purchaseMode.value = true
    purchaseTemplateId.value = options.templateId || ''
    purchasePrice.value = parseFloat(options.price) || 0
  }
})

const compareList = [
  { feature: '模板数量', free: '30套', vip: '全站500+' },
  { feature: '导出质量', free: '720px 带水印', vip: '1440px 无水印' },
  { feature: '导出格式', free: '图片', vip: '图片+PDF+素材包' },
  { feature: '高级素材', free: '不可用', vip: '全素材库' },
  { feature: '商城折扣', free: '原价', vip: '全场9折' },
  { feature: '客服支持', free: '无', vip: '专属客服' },
]

function openAgreement() {
  uni.showModal({
    title: 'VIP服务协议',
    content:
      'VIP会员服务条款：\n\n' +
      '1. VIP会员有效期内可享受全站模板免费使用、高清无水印导出、专属音乐库等权益。\n\n' +
      '2. VIP会员费用一经支付，除法律规定的情形外不予退款。\n\n' +
      '3. VIP权益仅限本人账户使用，禁止共享、转让或出售。\n\n' +
      '4. 本服务最终解释权归平台所有。\n\n' +
      '如需查看完整协议，请联系客服。',
    showCancel: false,
    confirmText: '我知道了',
  })
}

async function handlePay() {
  if (paying.value) return
  if (!userStore.requireLogin()) return
  if (userStore.isVip()) {
    uni.showToast({ title: '您已是VIP会员', icon: 'none' })
    return
  }
  paying.value = true
  track('vip_click_pay', { plan: selectedPlan.value, price: currentPlan.value.price })
  uni.showLoading({ title: '创建订单中...', mask: true })
  try {
    // 步骤 1：创建 VIP 订单（服务端已修复为只建 pending 订单，不再激活 VIP）
    const order = await createVipOrder(selectedPlan.value, currentPlan.value.price)

    // 步骤 2：根据是否返回支付签名，走真实支付或测试模式
    if (order.paySign && !order.testMode) {
      // 生产模式：调起微信支付
      uni.hideLoading()
      uni.requestPayment({
        provider: 'wxpay',
        timeStamp: order.timeStamp,
        nonceStr: order.nonceStr,
        package: order.package || `prepay_id=${order.prepayId}`,
        signType: order.signType || 'MD5',
        paySign: order.paySign,
        success: async () => {
          uni.showLoading({ title: '验证中...', mask: true })
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
          paying.value = false
          navigateBackTimer = setTimeout(() => uni.navigateBack(), 1500)
        },
        fail: (err: any) => {
          const isCancel = err && /cancel/i.test(err.errMsg || '')
          uni.showToast({ title: isCancel ? '支付已取消' : '支付失败', icon: 'none' })
          paying.value = false
        },
      })
    } else {
      // 测试模式：服务端返回 mockPaySign，直接调用 payOrder 完成支付闭环
      // 此分支仅在未接入真实微信支付的开发/测试环境运行
      uni.showLoading({ title: '支付处理中...', mask: true })
      try {
        await requestPayOrder(order.orderId)
        // 支付完成后刷新用户信息（服务端在 payOrder 中已激活 VIP 权益）
        await userStore.fetchUserInfo()
        uni.hideLoading()
        track('vip_pay_success', { plan: selectedPlan.value, price: currentPlan.value.price, testMode: true })
        if (userStore.isVip()) {
          uni.showToast({ title: '开通成功！', icon: 'success' })
        } else {
          uni.showToast({ title: '支付成功', icon: 'success' })
        }
        paying.value = false
        navigateBackTimer = setTimeout(() => uni.navigateBack(), 1500)
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: '支付失败，请稍后重试', icon: 'none' })
        paying.value = false
      }
    }
  } catch (e) {
    uni.showToast({ title: '创建订单失败', icon: 'none' })
    paying.value = false
  } finally {
    uni.hideLoading()
  }
}

// 页面曝光埋点
track('vip_page_view')

onUnmounted(() => {
  if (navigateBackTimer) {
    clearTimeout(navigateBackTimer)
    navigateBackTimer = null
  }
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #1a0f2e 0%, #0f172a 40%, #0a0a0f 100%);
  color: #f1f5f9;
  padding-bottom: 280rpx;
  position: relative;
  overflow-x: hidden;
}

/* Hero 区域 */
.vip-hero {
  position: relative;
  text-align: center;
  padding: 100rpx 40rpx 80rpx;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.hero-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 500rpx;
  height: 500rpx;
  background: radial-gradient(circle, rgba(245, 215, 110, 0.15) 0%, rgba(245, 166, 35, 0.08) 40%, transparent 70%);
  border-radius: 50%;
  animation: pulse 4s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
}

.sparkle {
  position: absolute;
  width: 8rpx;
  height: 8rpx;
  background: #f5d76e;
  border-radius: 50%;
  box-shadow: 0 0 12rpx #f5d76e, 0 0 24rpx rgba(245, 215, 110, 0.5);
  animation: sparkle 3s ease-in-out infinite;
}

.sparkle-1 { top: 80rpx; left: 60rpx; animation-delay: 0s; }
.sparkle-2 { top: 120rpx; right: 80rpx; animation-delay: 0.8s; width: 6rpx; height: 6rpx; }
.sparkle-3 { top: 200rpx; left: 100rpx; animation-delay: 1.5s; width: 10rpx; height: 10rpx; }
.sparkle-4 { bottom: 100rpx; right: 60rpx; animation-delay: 2s; }
.sparkle-5 { bottom: 150rpx; left: 80rpx; animation-delay: 1s; width: 6rpx; height: 6rpx; }

@keyframes sparkle {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

.crown-container {
  position: relative;
  display: inline-block;
  margin-bottom: 30rpx;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12rpx); }
}

.crown-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 180rpx;
  height: 180rpx;
  background: radial-gradient(circle, rgba(245, 215, 110, 0.4) 0%, rgba(245, 166, 35, 0.2) 40%, transparent 70%);
  border-radius: 50%;
  animation: glow-breath 2.5s ease-in-out infinite;
}

@keyframes glow-breath {
  0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
}

.crown-icon {
  font-size: 100rpx;
  position: relative;
  z-index: 1;
  display: block;
  filter: drop-shadow(0 0 20rpx rgba(245, 215, 110, 0.8));
}

.ray {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4rpx;
  height: 60rpx;
  background: linear-gradient(180deg, rgba(245, 215, 110, 0.6) 0%, transparent 100%);
  transform-origin: center bottom;
  opacity: 0.6;
}

.ray-1 { transform: translate(-50%, -100%) rotate(0deg) translateY(-40rpx); }
.ray-2 { transform: translate(-50%, -100%) rotate(45deg) translateY(-40rpx); }
.ray-3 { transform: translate(-50%, -100%) rotate(-45deg) translateY(-40rpx); }
.ray-4 { transform: translate(-50%, -100%) rotate(90deg) translateY(-40rpx); }

.vip-title {
  font-size: 72rpx;
  font-weight: 800;
  display: block;
  background: linear-gradient(135deg, #f5d76e 0%, #f5a623 50%, #e89316 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  letter-spacing: 4rpx;
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 4rpx 20rpx rgba(245, 166, 35, 0.3));
}

.vip-subtitle {
  font-size: 28rpx;
  color: #94a3b8;
  margin-top: 20rpx;
  display: block;
  position: relative;
  z-index: 1;
  letter-spacing: 2rpx;
}

/* Section 标题 */
.section-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #f1f5f9;
  display: block;
  margin-bottom: 32rpx;
  padding-left: 40rpx;
  position: relative;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 8rpx;
  height: 36rpx;
  background: linear-gradient(180deg, #f5d76e, #f5a623);
  border-radius: 0 8rpx 8rpx 0;
}

/* 权益展示 */
.vip-benefits-section {
  padding: 40rpx 0 20rpx;
}

.vip-benefits {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
  padding: 0 40rpx;
}

.benefit-item {
  background: linear-gradient(145deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
  border: 2rpx solid rgba(245, 215, 110, 0.15);
  border-radius: 24rpx;
  padding: 36rpx 28rpx;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.benefit-item:active {
  transform: scale(0.97);
  border-color: rgba(245, 215, 110, 0.4);
}

.benefit-icon-wrap {
  width: 88rpx;
  height: 88rpx;
  background: radial-gradient(circle, rgba(245, 215, 110, 0.15) 0%, transparent 70%);
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
}

.benefit-icon {
  font-size: 48rpx;
  display: block;
  filter: drop-shadow(0 0 12rpx rgba(245, 215, 110, 0.5));
}

.benefit-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #f8fafc;
  margin-top: 8rpx;
  display: block;
}

.benefit-desc {
  font-size: 24rpx;
  color: #94a3b8;
  margin-top: 10rpx;
  display: block;
  line-height: 1.5;
}

/* 价格卡片 */
.vip-plans-section {
  padding: 40rpx 0 20rpx;
}

.vip-plans {
  display: flex;
  gap: 20rpx;
  padding: 0 40rpx;
}

.plan-card {
  flex: 1;
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%);
  border: 2rpx solid rgba(148, 163, 184, 0.2);
  border-radius: 28rpx;
  padding: 40rpx 20rpx 32rpx;
  text-align: center;
  position: relative;
  transition: all 0.3s ease;
}

.plan-card.active {
  border-color: #f5d76e;
  background: linear-gradient(180deg, rgba(245, 215, 110, 0.1) 0%, rgba(15, 23, 42, 0.95) 100%);
  transform: scale(1.02);
  box-shadow: 0 0 30rpx rgba(245, 215, 110, 0.2), inset 0 0 30rpx rgba(245, 215, 110, 0.05);
}

.plan-card.best.active {
  border-color: #f5a623;
  box-shadow: 0 0 40rpx rgba(245, 166, 35, 0.3), inset 0 0 40rpx rgba(245, 166, 35, 0.08);
}

.best-badge {
  position: absolute;
  top: -2rpx;
  left: 50%;
  transform: translateX(-50%) translateY(-60%);
  background: linear-gradient(135deg, #f5d76e 0%, #f5a623 50%, #e89316 100%);
  padding: 8rpx 24rpx;
  border-radius: 24rpx 24rpx 24rpx 8rpx;
  box-shadow: 0 4rpx 16rpx rgba(245, 166, 35, 0.4);
}

.best-badge-text {
  font-size: 22rpx;
  font-weight: 800;
  color: #1a0f2e;
  letter-spacing: 2rpx;
}

.plan-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #cbd5e1;
  display: block;
  margin-bottom: 16rpx;
}

.plan-price-wrap {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin-bottom: 8rpx;
}

.plan-price {
  font-size: 56rpx;
  font-weight: 800;
  background: linear-gradient(135deg, #f5d76e 0%, #f5a623 50%, #e89316 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  line-height: 1;
}

.plan-currency {
  font-size: 28rpx;
  font-weight: 700;
  background: linear-gradient(135deg, #f5d76e, #f5a623);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin-left: 4rpx;
}

.plan-original {
  font-size: 22rpx;
  color: #64748b;
  text-decoration: line-through;
  display: block;
  margin-bottom: 4rpx;
}

.plan-unit {
  font-size: 24rpx;
  color: #64748b;
  display: block;
}

.plan-avg {
  font-size: 22rpx;
  color: #f5d76e;
  margin-top: 12rpx;
  display: block;
  font-weight: 600;
}

.plan-avg-normal {
  color: #94a3b8;
  font-weight: 400;
}

/* 权益对比表 */
.vip-compare-section {
  padding: 40rpx 40rpx 20rpx;
}

.vip-compare-section .section-title {
  padding-left: 0;
}

.vip-compare-section .section-title::before {
  left: 0;
}

.vip-compare {
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
  border: 2rpx solid rgba(148, 163, 184, 0.15);
  border-radius: 24rpx;
  overflow: hidden;
}

.compare-row {
  display: flex;
  border-bottom: 2rpx solid rgba(148, 163, 184, 0.1);
}

.compare-row:last-child {
  border-bottom: none;
}

.compare-header {
  background: rgba(51, 65, 85, 0.5);
  font-weight: 700;
}

.compare-cell {
  flex: 1;
  padding: 28rpx 12rpx;
  font-size: 26rpx;
  text-align: center;
  color: #cbd5e1;
}

.compare-feature {
  flex: 1.2;
  text-align: left;
  padding-left: 28rpx;
  color: #94a3b8;
}

.compare-header .compare-cell {
  color: #f1f5f9;
  font-weight: 700;
  font-size: 28rpx;
}

.vip-cell {
  color: #f5d76e;
  font-weight: 600;
}

.compare-header .vip-cell {
  color: #f5d76e;
  background: rgba(245, 215, 110, 0.08);
}

/* 底部支付按钮 */
.vip-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 40rpx 48rpx;
  z-index: 100;
}

.footer-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, rgba(10, 10, 15, 0.8) 0%, rgba(10, 10, 15, 0.95) 50%, #0a0a0f 100%);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-top: 2rpx solid rgba(245, 215, 110, 0.1);
}

.pay-btn {
  width: 100%;
  background: linear-gradient(135deg, #f5d76e 0%, #f5a623 40%, #e89316 100%);
  border: none;
  border-radius: 48rpx;
  padding: 30rpx;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8rpx 32rpx rgba(245, 166, 35, 0.4), 0 4rpx 12rpx rgba(245, 166, 35, 0.2);
  transition: all 0.15s ease;
}

.pay-btn:active {
  transform: scale(0.96);
  box-shadow: 0 4rpx 16rpx rgba(245, 166, 35, 0.3);
}

.pay-btn::after {
  border: none;
}

.pay-btn-text {
  font-size: 34rpx;
  font-weight: 800;
  color: #1a0f2e;
  letter-spacing: 4rpx;
}

.pay-tip {
  display: block;
  text-align: center;
  font-size: 22rpx;
  color: #64748b;
  margin-top: 16rpx;
  position: relative;
  z-index: 1;
}

.pay-agreement {
  color: #e84a6e;
  text-decoration: underline;
}
</style>
