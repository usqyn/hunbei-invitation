<template>
  <view class="page vip-page">
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
      </view>
      <text class="vip-title">按次制作</text>
      <text class="vip-subtitle">灵活付费，用一次付一次</text>
    </view>

    <view v-if="purchaseMode" class="unlock-card">
      <view class="unlock-header">
        <view class="unlock-title-wrap">
          <text class="unlock-title">🎫 按次制作</text>
          <text class="unlock-sub">支付后即可制作 1 份作品，制作完成后可随时编辑与导出</text>
        </view>
        <view class="unlock-price-box">
          <text class="unlock-currency">¥</text>
          <text class="unlock-price">{{ purchasePrice }}</text>
        </view>
      </view>
      <view class="unlock-features">
        <view class="unlock-feature-item">
          <text class="uf-icon">✅</text>
          <text class="uf-text">支付后获得 1 次制作机会</text>
        </view>
        <view class="unlock-feature-item">
          <text class="uf-icon">✅</text>
          <text class="uf-text">已制作作品可随时编辑与导出</text>
        </view>
        <view class="unlock-feature-item">
          <text class="uf-icon">✅</text>
          <text class="uf-text">从该模板新建下一份作品需再次付费</text>
        </view>
      </view>
      <view class="unlock-btn" :class="{ 'unlock-btn--paying': paying }" @click="handleUnlockPay">
        <text class="unlock-btn-text">{{ paying ? '支付处理中...' : `立即制作 ¥${purchasePrice}` }}</text>
      </view>
    </view>

    <template v-else>
      <view class="pay-model-title">按次制作，灵活付费</view>
      <text class="pay-model-sub">无需会员，用一次付一次，制作完成后可随时编辑与导出</text>

      <view class="tier-list">
        <view class="tier-card">
          <view class="tier-head">
            <text class="tier-name">限免版</text>
            <view class="tier-price-box">
              <text class="tier-currency">¥</text>
              <text class="tier-price">6.6</text>
              <text class="tier-unit">/次</text>
            </view>
          </view>
          <view class="tier-desc">第 1 次免费，第 2 次分享朋友圈得次数，之后每次 ¥6.6</view>
        </view>
        <view class="tier-card tier-card--gold">
          <view class="tier-head">
            <text class="tier-name">VIP版</text>
            <view class="tier-price-box">
              <text class="tier-currency">¥</text>
              <text class="tier-price">9.9</text>
              <text class="tier-unit">/次</text>
            </view>
          </view>
          <view class="tier-desc">付费模板精选款式，每次制作 ¥9.9</view>
        </view>
        <view class="tier-card tier-card--pro">
          <view class="tier-head">
            <text class="tier-name">SVIP版</text>
            <view class="tier-price-box">
              <text class="tier-currency">¥</text>
              <text class="tier-price">18.8</text>
              <text class="tier-unit">/次</text>
            </view>
          </view>
          <view class="tier-desc">高端定制款式，每次制作 ¥18.8</view>
        </view>
      </view>

      <view class="how-section">
        <text class="section-title">制作流程</text>
        <view class="how-step">
          <text class="step-num">1</text>
          <text class="step-text">挑选喜欢的模板，点击开始制作</text>
        </view>
        <view class="how-step">
          <text class="step-num">2</text>
          <text class="step-text">按提示完成支付，获得 1 次制作机会</text>
        </view>
        <view class="how-step">
          <text class="step-num">3</text>
          <text class="step-text">编辑完成的作品可随时查看、编辑与导出，不重复收费</text>
        </view>
      </view>

      <view class="faq-section">
        <text class="section-title">常见问题</text>
        <view class="faq-list">
          <view v-for="(faq, i) in faqList" :key="i" class="faq-item" @click="toggleFaq(i)">
            <view class="faq-header">
              <text class="faq-q">{{ faq.q }}</text>
              <text class="faq-arrow">{{ faq.open ? '−' : '+' }}</text>
            </view>
            <view v-if="faq.open" class="faq-body">
              <text class="faq-a">{{ faq.a }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="vip-footer">
        <text class="pay-tip">按次付费即表示同意<text class="pay-agreement" @click="openAgreement">《按次制作服务协议》</text></text>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { track } from '@/utils/track'
import { useUserStore } from '@/stores/user'
import { payOrder as requestPayOrder, createOrder } from '@/api'
import { TIER_DEFAULT_PRICE, type TemplateTier } from '@/composables/useTemplateEntry'

const userStore = useUserStore()

// ========== 单次制作模式（mode=purchase&templateId&price&tier[&redirect=editor]） ==========
const purchaseMode = ref(false)
const purchaseTemplateId = ref('')
const purchasePrice = ref(9.9)
const purchaseRedirect = ref('')

onLoad((options: any) => {
  if (options?.mode === 'purchase' && options.templateId) {
    purchaseMode.value = true
    purchaseTemplateId.value = options.templateId
    // 价格兜底：URL 缺 price 时按档位默认价，避免写死 9.9 造成 SVIP(18.8)/限免(6.6) 乱收费
    const tier = (options.tier || 'limited') as TemplateTier
    const p = Number(options.price)
    purchasePrice.value = p > 0 ? p : (TIER_DEFAULT_PRICE[tier] || 9.9)
    purchaseRedirect.value = options.redirect || ''
  }
})

// 单次制作支付：创建 usage 订单 → 模拟支付（服务端发放 1 次制作额度）→ 跳编辑器/返回
async function handleUnlockPay() {
  if (paying.value) return
  if (!userStore.requireLogin()) return
  if (!purchaseTemplateId.value) return
  paying.value = true
  track('unlock_click_pay', { templateId: purchaseTemplateId.value, price: purchasePrice.value })
  uni.showLoading({ title: '创建订单中...', mask: true })
  try {
    const order = await createOrder({
      items: [{ type: 'usage', templateId: purchaseTemplateId.value }],
      totalAmount: String(purchasePrice.value),
      status: 'pending',
      contactName: '',
      contactPhone: '',
      address: '',
      note: '',
    })
    uni.hideLoading()
    uni.showLoading({ title: '支付处理中...', mask: true })
    await requestPayOrder(order.id)
    uni.hideLoading()
    track('unlock_pay_success', { templateId: purchaseTemplateId.value, price: purchasePrice.value })
    uni.showToast({ title: '支付成功！', icon: 'success' })
    paying.value = false
    // 入口漏斗要求支付后直接进编辑器
    if (purchaseRedirect.value === 'editor') {
      setTimeout(() => {
        uni.redirectTo({ url: `/pages/editor/index?templateId=${purchaseTemplateId.value}` })
      }, 1000)
    } else {
      setTimeout(() => uni.navigateBack(), 1000)
    }
  } catch (e: any) {
    uni.hideLoading()
    uni.showToast({ title: '支付失败，请稍后重试', icon: 'none' })
    paying.value = false
  }
}

const paying = ref(false)

const faqList = ref([
  { q: '按次付费后可以制作几次？', a: '支付 1 次获得该模板的 1 次制作机会，制作完成的作品可随时编辑与导出，编辑不重复收费。', open: false },
  { q: '限免版怎么用最划算？', a: '限免版模板第 1 次制作免费，第 2 次分享朋友圈给好友即可获得 1 次额外机会，之后每次 ¥6.6。', open: false },
  { q: '作品会因为我没付费而被删除吗？', a: '不会。您已制作的作品会一直保留，随时可以查看与编辑。', open: false },
  { q: '可以退款吗？', a: '按次付费为虚拟商品，一经支付即获得制作权益，除法律规定的情形外不予退款。', open: false },
])

function toggleFaq(index: number) {
  faqList.value[index].open = !faqList.value[index].open
}

function openAgreement() {
  uni.showModal({
    title: '按次制作服务协议',
    content:
      'TOYtamaxia 按次制作服务条款：\n\n' +
      '1. 按次制作按所选模板档位单次计价：限免版 ¥6.6/次、VIP版 ¥9.9/次、SVIP版 ¥18.8/次，以页面展示为准。\n\n' +
      '2. 支付成功即获得 1 次制作机会，制作完成的作品可随时查看、编辑与导出，编辑不重复收费。\n\n' +
      '3. 限免版模板第 1 次免费，第 2 次分享朋友圈可获得 1 次额外机会，具体以页面引导为准。\n\n' +
      '4. 费用一经支付，除法律规定的情形外不予退款。\n\n' +
      '5. 制作权益仅限本人账号使用，禁止共享、转让或出售。\n\n' +
      '6. 本服务最终解释权归 TOYtamaxia 平台所有。',
    showCancel: false,
    confirmText: '我知道了',
  })
}

track('vip_page_view')
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #1a0f2e 0%, #0f172a 40%, #0a0a0f 100%);
  color: #f1f5f9;
  padding-bottom: 120rpx;
  position: relative;
  overflow-x: hidden;
}

.vip-hero {
  position: relative;
  text-align: center;
  padding: 80rpx 40rpx 60rpx;
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

.sparkle-1 { top: 60rpx; left: 60rpx; animation-delay: 0s; }
.sparkle-2 { top: 100rpx; right: 80rpx; animation-delay: 0.8s; width: 6rpx; height: 6rpx; }
.sparkle-3 { top: 180rpx; left: 100rpx; animation-delay: 1.5s; width: 10rpx; height: 10rpx; }
.sparkle-4 { bottom: 80rpx; right: 60rpx; animation-delay: 2s; }
.sparkle-5 { bottom: 120rpx; left: 80rpx; animation-delay: 1s; width: 6rpx; height: 6rpx; }

@keyframes sparkle {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

.crown-container {
  position: relative;
  display: inline-block;
  margin-bottom: 20rpx;
}

.crown-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 160rpx;
  height: 160rpx;
  background: radial-gradient(circle, rgba(245, 215, 110, 0.4) 0%, rgba(245, 166, 35, 0.2) 40%, transparent 70%);
  border-radius: 50%;
  animation: glow-breath 2.5s ease-in-out infinite;
}

@keyframes glow-breath {
  0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
}

.crown-icon {
  font-size: 80rpx;
  position: relative;
  z-index: 1;
  display: block;
  filter: drop-shadow(0 0 20rpx rgba(245, 215, 110, 0.8));
}

.vip-title {
  font-size: 60rpx;
  font-weight: 800;
  display: block;
  background: linear-gradient(135deg, #f5d76e 0%, #f5a623 50%, #e89316 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  letter-spacing: 4rpx;
  position: relative;
  z-index: 1;
}

.vip-subtitle {
  font-size: 26rpx;
  color: #94a3b8;
  margin-top: 16rpx;
  display: block;
  position: relative;
  z-index: 1;
  letter-spacing: 2rpx;
}

/* ===== 按次制作说明 ===== */
.pay-model-title {
  display: block;
  font-size: 40rpx;
  font-weight: 800;
  color: #f1f5f9;
  text-align: center;
  padding: 20rpx 0 8rpx;
}

.pay-model-sub {
  display: block;
  font-size: 26rpx;
  color: #94a3b8;
  text-align: center;
  padding: 0 40rpx 30rpx;
  line-height: 1.6;
}

.tier-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  padding: 0 30rpx 30rpx;
}

.tier-card {
  background: rgba(30, 41, 59, 0.7);
  border: 2rpx solid rgba(148, 163, 184, 0.2);
  border-radius: 20rpx;
  padding: 28rpx 30rpx;
}

.tier-card--gold {
  border-color: rgba(245, 215, 110, 0.5);
  background: linear-gradient(180deg, rgba(245, 215, 110, 0.12) 0%, rgba(30, 41, 59, 0.7) 100%);
}

.tier-card--pro {
  border-color: rgba(168, 85, 247, 0.5);
  background: linear-gradient(180deg, rgba(168, 85, 247, 0.14) 0%, rgba(30, 41, 59, 0.7) 100%);
}

.tier-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14rpx;
}

.tier-name {
  font-size: 32rpx;
  font-weight: 800;
  color: #f1f5f9;
}

.tier-card--gold .tier-name {
  color: #f5d76e;
}

.tier-card--pro .tier-name {
  color: #c4b5fd;
}

.tier-price-box {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
}

.tier-currency {
  font-size: 28rpx;
  font-weight: 700;
  color: #f5d76e;
}

.tier-card--pro .tier-currency {
  color: #a855f7;
}

.tier-price {
  font-size: 52rpx;
  font-weight: 900;
  color: #f5d76e;
}

.tier-card--pro .tier-price {
  color: #a855f7;
}

.tier-unit {
  font-size: 24rpx;
  color: #94a3b8;
}

.tier-desc {
  font-size: 24rpx;
  color: #94a3b8;
  line-height: 1.6;
}

.how-section {
  padding: 0 30rpx 30rpx;
}

.how-step {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 18rpx;
}

.step-num {
  flex-shrink: 0;
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #f5d76e, #f5a623);
  color: #1a0f2e;
  font-size: 26rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-text {
  flex: 1;
  font-size: 27rpx;
  color: #cbd5e1;
  line-height: 1.6;
  padding-top: 4rpx;
}

/* ===== 单次解锁卡片 ===== */
.unlock-card {
  margin: 0 30rpx 30rpx;
  background: rgba(30, 41, 59, 0.7);
  border: 2rpx solid rgba(148, 163, 184, 0.25);
  border-radius: 24rpx;
  padding: 36rpx 32rpx;
}

.unlock-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.unlock-title-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.unlock-title {
  font-size: 36rpx;
  font-weight: 800;
  color: #ffffff;
}

.unlock-sub {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.65);
}

.unlock-price-box {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
}

.unlock-currency {
  font-size: 28rpx;
  color: #ffd700;
  font-weight: 700;
}

.unlock-price {
  font-size: 56rpx;
  color: #ffd700;
  font-weight: 900;
}

.unlock-features {
  margin-top: 28rpx;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.unlock-feature-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.uf-icon {
  font-size: 26rpx;
}

.uf-text {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.85);
}

.unlock-btn {
  margin-top: 32rpx;
  height: 92rpx;
  border-radius: 46rpx;
  background: linear-gradient(135deg, #ffd700 0%, #ffb700 60%, #ff9f00 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(255, 183, 0, 0.35);
}

.unlock-btn--paying {
  opacity: 0.7;
}

.unlock-btn-text {
  font-size: 30rpx;
  font-weight: 800;
  color: #5a3500;
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #f1f5f9;
  display: block;
  margin-bottom: 24rpx;
  position: relative;
  padding-left: 16rpx;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 6rpx;
  height: 28rpx;
  background: linear-gradient(180deg, #f5d76e, #f5a623);
  border-radius: 0 6rpx 6rpx 0;
}

.faq-section {
  padding: 0 30rpx 30rpx;
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.faq-item {
  background: rgba(30, 41, 59, 0.5);
  border: 1rpx solid rgba(148, 163, 184, 0.1);
  border-radius: 16rpx;
  overflow: hidden;
}

.faq-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
}

.faq-q {
  font-size: 28rpx;
  font-weight: 600;
  color: #f1f5f9;
  flex: 1;
}

.faq-arrow {
  font-size: 32rpx;
  color: #f5d76e;
  font-weight: 300;
  margin-left: 16rpx;
}

.faq-body {
  padding: 0 24rpx 24rpx;
}

.faq-a {
  font-size: 26rpx;
  color: #94a3b8;
  line-height: 1.7;
}

.vip-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 40rpx 40rpx;
  z-index: 100;
  background: linear-gradient(180deg, rgba(10, 10, 15, 0.8) 0%, rgba(10, 10, 15, 0.95) 50%, #0a0a0f 100%);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-top: 1rpx solid rgba(245, 215, 110, 0.1);
}

.pay-tip {
  display: block;
  text-align: center;
  font-size: 22rpx;
  color: #64748b;
}

.pay-agreement {
  color: #e84a6e;
  text-decoration: underline;
}
</style>
