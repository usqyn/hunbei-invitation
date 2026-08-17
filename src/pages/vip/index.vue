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
      <text class="vip-title">会员中心</text>
      <text class="vip-subtitle">选择适合您的套餐，让请柬更专业</text>
    </view>

    <view v-if="purchaseMode" class="unlock-card">
      <view class="unlock-header">
        <view class="unlock-title-wrap">
          <text class="unlock-title">🔓 单次解锁模板</text>
          <text class="unlock-sub">解锁后该模板永久可用，可随时编辑与导出</text>
        </view>
        <view class="unlock-price-box">
          <text class="unlock-currency">¥</text>
          <text class="unlock-price">{{ purchasePrice }}</text>
        </view>
      </view>
      <view class="unlock-features">
        <view class="unlock-feature-item">
          <text class="uf-icon">✅</text>
          <text class="uf-text">该模板永久解锁</text>
        </view>
        <view class="unlock-feature-item">
          <text class="uf-icon">✅</text>
          <text class="uf-text">不限编辑次数与导出次数</text>
        </view>
        <view class="unlock-feature-item">
          <text class="uf-icon">✅</text>
          <text class="uf-text">无需开通 VIP 即可使用</text>
        </view>
      </view>
      <view class="unlock-btn" :class="{ 'unlock-btn--paying': paying }" @click="handleUnlockPay">
        <text class="unlock-btn-text">{{ paying ? '支付处理中...' : `立即解锁 ¥${purchasePrice}` }}</text>
      </view>
      <view class="unlock-alt">
        <text class="unlock-alt-text" @click="activeTab = 'personal'">或开通个人VIP，全站模板免费使用 →</text>
      </view>
    </view>

    <template v-else>
      <view class="vip-tabs">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="vip-tab"
          :class="{ active: activeTab === tab.key, recommended: tab.recommended }"
          @click="activeTab = tab.key"
        >
          <view v-if="tab.recommended" class="tab-badge">推荐</view>
          <text class="tab-name">{{ tab.name }}</text>
          <text class="tab-price">{{ tab.price }}</text>
        </view>
      </view>

    <view v-if="activeTab === 'free'" class="plan-detail">
      <view class="plan-header">
        <text class="plan-title">免费版</text>
        <text class="plan-target">适合新人初次体验</text>
      </view>
      <view class="plan-desc">
        <text class="desc-text">基础功能齐全，零门槛上手制作您的第一份电子请柬。</text>
      </view>
      <view class="feature-list">
        <view v-for="f in freeFeatures" :key="f.title" class="feature-item">
          <text class="feature-icon">{{ f.icon }}</text>
          <view class="feature-info">
            <text class="feature-title">{{ f.title }}</text>
            <text class="feature-desc">{{ f.desc }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="activeTab === 'personal'" class="plan-detail">
      <view class="plan-header">
        <text class="plan-title">个人 VIP</text>
        <text class="plan-target">适合新人 / 普通用户</text>
      </view>
      <view class="plan-desc">
        <text class="desc-text">无水印高清导出，全部模板免费使用，打造专属于您的精美请柬。</text>
      </view>
      <view class="feature-list">
        <view v-for="f in personalFeatures" :key="f.title" class="feature-item">
          <text class="feature-icon">{{ f.icon }}</text>
          <view class="feature-info">
            <text class="feature-title">{{ f.title }}</text>
            <text class="feature-desc">{{ f.desc }}</text>
          </view>
        </view>
      </view>
      <view class="price-selector">
        <text class="selector-title">选择时长</text>
        <view class="price-options">
          <view
            v-for="p in personalPlans"
            :key="p.key"
            class="price-option"
            :class="{ active: selectedPersonal === p.key, best: p.best }"
            @click="selectedPersonal = p.key"
          >
            <view v-if="p.best" class="option-badge">最划算</view>
            <text class="option-name">{{ p.name }}</text>
            <text class="option-price">¥{{ p.price }}</text>
            <text class="option-avg">约 ¥{{ Math.round(p.price / p.months) }}/月</text>
          </view>
        </view>
      </view>
      <button class="pay-btn pay-btn--gold" :disabled="paying" @click="handlePay('personal')">
        <text class="pay-btn-text">立即开通 ¥{{ currentPersonalPlan.price }}</text>
      </button>
    </view>

    <view v-if="activeTab === 'pro'" class="plan-detail">
      <view class="plan-header pro-header">
        <text class="plan-title">专业版 Pro</text>
        <view class="pro-badge">PRO</view>
      </view>
      <text class="plan-target">适合婚庆从业者 / 司仪 / 婚庆公司</text>
      <view class="plan-desc">
        <text class="desc-text">海量制作额度，自定义品牌水印，视频请柬等专业功能，助力您的婚庆事业。</text>
      </view>
      <view class="feature-list">
        <view v-for="f in proFeatures" :key="f.title" class="feature-item">
          <text class="feature-icon">{{ f.icon }}</text>
          <view class="feature-info">
            <text class="feature-title">{{ f.title }}</text>
            <text class="feature-desc">{{ f.desc }}</text>
          </view>
        </view>
      </view>
      <view class="price-selector">
        <text class="selector-title">选择时长</text>
        <view class="price-options">
          <view
            v-for="p in proPlans"
            :key="p.key"
            class="price-option"
            :class="{ active: selectedPro === p.key, best: p.best }"
            @click="selectedPro = p.key"
          >
            <view v-if="p.best" class="option-badge">最划算</view>
            <text class="option-name">{{ p.name }}</text>
            <text class="option-price">¥{{ p.price }}</text>
            <text class="option-avg">约 ¥{{ Math.round(p.price / p.months) }}/月</text>
          </view>
        </view>
      </view>
      <button class="pay-btn pay-btn--pro" :disabled="paying" @click="handlePay('pro')">
        <text class="pay-btn-text">立即开通 ¥{{ currentProPlan.price }}</text>
      </button>
    </view>

    <view class="compare-section">
      <text class="section-title">权益对比</text>
      <view class="compare-table">
        <view class="compare-row compare-header">
          <text class="compare-cell compare-feature">功能</text>
          <text class="compare-cell">免费版</text>
          <text class="compare-cell gold-cell">个人VIP</text>
          <text class="compare-cell pro-cell">专业版</text>
        </view>
        <view v-for="c in compareList" :key="c.feature" class="compare-row">
          <text class="compare-cell compare-feature">{{ c.feature }}</text>
          <text class="compare-cell">{{ c.free }}</text>
          <text class="compare-cell gold-cell">{{ c.personal }}</text>
          <text class="compare-cell pro-cell">{{ c.pro }}</text>
        </view>
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
      <text class="pay-tip">开通即表示同意<text class="pay-agreement" @click="openAgreement">《会员服务协议》</text></text>
    </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { track } from '@/utils/track'
import { useUserStore } from '@/stores/user'
import { createVipOrder, payOrder as requestPayOrder, createOrder } from '@/api'

const userStore = useUserStore()

// ========== 单次解锁模式（mode=purchase&templateId&price） ==========
const purchaseMode = ref(false)
const purchaseTemplateId = ref('')
const purchasePrice = ref(9.9)

onLoad((options: any) => {
  if (options?.mode === 'purchase' && options.templateId) {
    purchaseMode.value = true
    purchaseTemplateId.value = options.templateId
    const p = Number(options.price)
    purchasePrice.value = p > 0 ? p : 9.9
  }
})

// 单次解锁支付：创建 unlock 订单 → 模拟支付（服务端发放永久解锁权益）
async function handleUnlockPay() {
  if (paying.value) return
  if (!userStore.requireLogin()) return
  if (!purchaseTemplateId.value) return
  paying.value = true
  track('unlock_click_pay', { templateId: purchaseTemplateId.value, price: purchasePrice.value })
  uni.showLoading({ title: '创建订单中...', mask: true })
  try {
    const order = await createOrder({
      items: [{ type: 'unlock', templateId: purchaseTemplateId.value }],
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
    uni.showToast({ title: '解锁成功！', icon: 'success' })
    paying.value = false
    setTimeout(() => uni.navigateBack(), 1500)
  } catch (e: any) {
    uni.hideLoading()
    uni.showToast({ title: '支付失败，请稍后重试', icon: 'none' })
    paying.value = false
  }
}

const tabs = [
  { key: 'free', name: '免费版', price: '¥0', recommended: false },
  { key: 'personal', name: '个人VIP', price: '¥29/月起', recommended: true },
  { key: 'pro', name: '专业版', price: '¥99/月起', recommended: false },
]

const activeTab = ref<'free' | 'personal' | 'pro'>('personal')
const paying = ref(false)

const freeFeatures = [
  { icon: '🎨', title: '基础模板免费', desc: '5 套精选基础模板，无水印使用' },
  { icon: '📝', title: '每月 3 次制作', desc: '每月可生成 3 份请柬作品' },
  { icon: '💧', title: '高级模板带水印', desc: '全部高级模板可体验，带水印' },
  { icon: '🎵', title: '基础音乐库', desc: '20 首精选背景音乐免费使用' },
]

const personalFeatures = [
  { icon: '🎨', title: '全部模板解锁', desc: '全站 100+ 精美模板免费用' },
  { icon: '💧', title: '高清无水印', desc: '高清导出，纯净无水印' },
  { icon: '📝', title: '每月 10 次制作', desc: '每月可生成 10 份请柬作品' },
  { icon: '🎵', title: '全部音乐库', desc: '200+ 首背景音乐任意选' },
  { icon: '🖼', title: '高清导出', desc: '支持原图高清导出' },
  { icon: '💬', title: '专属客服', desc: '优先响应，快速解决问题' },
]

const proFeatures = [
  { icon: '🎨', title: '全部模板 + Pro 专属', desc: '全站模板 + Pro 专属定制模板' },
  { icon: '💧', title: '高清无水印', desc: '最高清导出，纯净无水印' },
  { icon: '📝', title: '每月 100 次制作', desc: '每月可生成 100 份请柬作品' },
  { icon: '🎬', title: '视频请柬', desc: '支持制作视频版电子请柬' },
  { icon: '👥', title: '宾客管理', desc: '宾客签到、出席统计、名单管理' },
  { icon: '🏷', title: '自定义品牌 Logo', desc: '替换为您自己的品牌标识' },
  { icon: '🎵', title: '全部音乐库', desc: '200+ 首背景音乐任意选' },
  { icon: '⚡', title: '优先客服', desc: '1 对 1 专属客服，极速响应' },
]

const personalPlans = [
  { key: 'monthly', name: '月卡', price: 29, months: 1, best: false },
  { key: 'quarterly', name: '季卡', price: 69, months: 3, best: false },
  { key: 'yearly', name: '年卡', price: 199, months: 12, best: true },
]

const proPlans = [
  { key: 'monthly', name: '月卡', price: 99, months: 1, best: false },
  { key: 'quarterly', name: '季卡', price: 249, months: 3, best: false },
  { key: 'yearly', name: '年卡', price: 799, months: 12, best: true },
]

const selectedPersonal = ref('yearly')
const selectedPro = ref('yearly')

const currentPersonalPlan = computed(() => personalPlans.find(p => p.key === selectedPersonal.value)!)
const currentProPlan = computed(() => proPlans.find(p => p.key === selectedPro.value)!)

const compareList = [
  { feature: '模板数量', free: '5 套基础', personal: '全站 100+', pro: '全站 + Pro 专属' },
  { feature: '导出质量', free: '普通清晰度', personal: '高清无水印', pro: '最高清无水印' },
  { feature: '每月制作次数', free: '3 次', personal: '10 次', pro: '100 次' },
  { feature: '视频请柬', free: '❌', personal: '❌', pro: '✅' },
  { feature: '宾客管理/签到', free: '❌', personal: '❌', pro: '✅' },
  { feature: '自定义 Logo', free: '❌', personal: '❌', pro: '✅' },
  { feature: '音乐库', free: '20 首', personal: '200+ 首', pro: '200+ 首' },
  { feature: '客服支持', free: '普通', personal: '优先', pro: '1 对 1 专属' },
]

const faqList = ref([
  { q: '会员可以在多个设备上使用吗？', a: '会员权益与账号绑定，您可以在不同设备上登录同一账号使用。', open: false },
  { q: '免费版次数用完了怎么办？', a: '可以升级到个人 VIP 获得更多次数，或分享邀请好友获得额外次数。', open: false },
  { q: '会员到期后作品会被删除吗？', a: '不会。您已制作的作品会一直保留，只是新作品会受当前等级限制。', open: false },
  { q: '专业版和个人版有什么区别？', a: '专业版面向婚庆从业者，提供视频请柬、宾客管理、自定义 Logo 等专业功能，制作额度也更高。', open: false },
  { q: '可以退款吗？', a: '虚拟商品一经开通，除法律规定的情形外不予退款。建议先体验免费版再决定。', open: false },
])

function toggleFaq(index: number) {
  faqList.value[index].open = !faqList.value[index].open
}

function openAgreement() {
  uni.showModal({
    title: '会员服务协议',
    content:
      'TOYtamaxia 会员服务条款：\n\n' +
      '1. 会员分为免费版、个人 VIP、专业版三档，权益以页面展示为准。\n\n' +
      '2. 会员有效期内可享受对应等级的全部权益，制作次数按月计算，次月 1 日重置。\n\n' +
      '3. 会员费用一经支付，除法律规定的情形外不予退款。\n\n' +
      '4. 会员权益仅限本人账户使用，禁止共享、转让或出售。\n\n' +
      '5. 本服务最终解释权归 TOYtamaxia 平台所有。',
    showCancel: false,
    confirmText: '我知道了',
  })
}

async function handlePay(planType: 'personal' | 'pro') {
  if (paying.value) return
  if (!userStore.requireLogin()) return

  const planKey = planType === 'personal' ? selectedPersonal.value : selectedPro.value
  const plan = planType === 'personal' ? currentPersonalPlan.value : currentProPlan.value

  if (planType === 'personal' && userStore.isPro()) {
    uni.showToast({ title: '您已是专业版会员', icon: 'none' })
    return
  }
  if (planType === 'personal' && userStore.isVip()) {
    uni.showToast({ title: '您已是个人VIP会员', icon: 'none' })
    return
  }

  paying.value = true
  track('vip_click_pay', { planType, plan: planKey, price: plan.price })
  uni.showLoading({ title: '创建订单中...', mask: true })

  try {
    const order = await createVipOrder(`${planType}_${planKey}`, plan.price)

    if (order.paySign && !order.testMode) {
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
          track('vip_pay_success', { planType, plan: planKey, price: plan.price })
          uni.showToast({ title: '开通成功！', icon: 'success' })
          paying.value = false
          setTimeout(() => uni.navigateBack(), 1500)
        },
        fail: (err: any) => {
          const isCancel = err && /cancel/i.test(err.errMsg || '')
          uni.showToast({ title: isCancel ? '支付已取消' : '支付失败', icon: 'none' })
          paying.value = false
        },
      })
    } else {
      uni.showLoading({ title: '支付处理中...', mask: true })
      try {
        await requestPayOrder(order.orderId)
        await userStore.fetchUserInfo()
        uni.hideLoading()
        track('vip_pay_success', { planType, plan: planKey, price: plan.price, testMode: true })
        uni.showToast({ title: '开通成功！', icon: 'success' })
        paying.value = false
        setTimeout(() => uni.navigateBack(), 1500)
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

.vip-tabs {
  display: flex;
  gap: 16rpx;
  padding: 0 30rpx 30rpx;
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

.unlock-alt {
  margin-top: 24rpx;
  text-align: center;
}

.unlock-alt-text {
  font-size: 24rpx;
  color: #7dd3fc;
}

.vip-tab {
  flex: 1;
  background: rgba(30, 41, 59, 0.6);
  border: 2rpx solid rgba(148, 163, 184, 0.2);
  border-radius: 20rpx;
  padding: 24rpx 16rpx;
  text-align: center;
  position: relative;
  transition: all 0.3s ease;
}

.vip-tab.active {
  border-color: #f5d76e;
  background: rgba(245, 215, 110, 0.1);
}

.vip-tab.recommended.active {
  border-color: #f5a623;
  box-shadow: 0 0 20rpx rgba(245, 166, 35, 0.2);
}

.tab-badge {
  position: absolute;
  top: -10rpx;
  right: 16rpx;
  background: linear-gradient(135deg, #f5d76e, #f5a623);
  color: #1a0f2e;
  font-size: 18rpx;
  font-weight: 800;
  padding: 4rpx 12rpx;
  border-radius: 16rpx;
}

.tab-name {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #cbd5e1;
}

.vip-tab.active .tab-name {
  color: #f5d76e;
}

.tab-price {
  display: block;
  font-size: 22rpx;
  color: #94a3b8;
  margin-top: 6rpx;
}

.plan-detail {
  padding: 0 30rpx 30rpx;
}

.plan-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.plan-title {
  font-size: 40rpx;
  font-weight: 800;
  color: #f1f5f9;
}

.pro-header {
  align-items: center;
}

.pro-badge {
  background: linear-gradient(135deg, #a855f7, #7c3aed);
  color: white;
  font-size: 20rpx;
  font-weight: 800;
  padding: 6rpx 16rpx;
  border-radius: 16rpx;
  letter-spacing: 2rpx;
}

.plan-target {
  display: block;
  font-size: 26rpx;
  color: #f5d76e;
  margin-bottom: 16rpx;
  font-weight: 600;
}

.plan-desc {
  background: rgba(30, 41, 59, 0.5);
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 24rpx;
}

.desc-text {
  font-size: 26rpx;
  color: #94a3b8;
  line-height: 1.6;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 30rpx;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  background: rgba(30, 41, 59, 0.4);
  border: 1rpx solid rgba(148, 163, 184, 0.1);
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
}

.feature-icon {
  font-size: 36rpx;
  flex-shrink: 0;
}

.feature-info {
  flex: 1;
}

.feature-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #f1f5f9;
}

.feature-desc {
  display: block;
  font-size: 24rpx;
  color: #94a3b8;
  margin-top: 4rpx;
  line-height: 1.5;
}

.price-selector {
  margin-bottom: 24rpx;
}

.selector-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 16rpx;
}

.price-options {
  display: flex;
  gap: 16rpx;
}

.price-option {
  flex: 1;
  background: rgba(30, 41, 59, 0.6);
  border: 2rpx solid rgba(148, 163, 184, 0.2);
  border-radius: 16rpx;
  padding: 20rpx 12rpx;
  text-align: center;
  position: relative;
  transition: all 0.3s ease;
}

.price-option.active {
  border-color: #f5d76e;
  background: rgba(245, 215, 110, 0.1);
}

.option-badge {
  position: absolute;
  top: -10rpx;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #f5d76e, #f5a623);
  color: #1a0f2e;
  font-size: 18rpx;
  font-weight: 800;
  padding: 2rpx 12rpx;
  border-radius: 12rpx;
  white-space: nowrap;
}

.option-name {
  display: block;
  font-size: 26rpx;
  color: #cbd5e1;
  margin-bottom: 8rpx;
}

.price-option.active .option-name {
  color: #f5d76e;
  font-weight: 600;
}

.option-price {
  display: block;
  font-size: 36rpx;
  font-weight: 800;
  background: linear-gradient(135deg, #f5d76e, #f5a623);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.option-avg {
  display: block;
  font-size: 20rpx;
  color: #64748b;
  margin-top: 4rpx;
}

.pay-btn {
  width: 100%;
  border: none;
  border-radius: 48rpx;
  padding: 28rpx;
  transition: all 0.15s ease;
}

.pay-btn::after {
  border: none;
}

.pay-btn--gold {
  background: linear-gradient(135deg, #f5d76e 0%, #f5a623 40%, #e89316 100%);
  box-shadow: 0 8rpx 32rpx rgba(245, 166, 35, 0.4);
}

.pay-btn--pro {
  background: linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #6d28d9 100%);
  box-shadow: 0 8rpx 32rpx rgba(124, 58, 237, 0.4);
}

.pay-btn:active {
  transform: scale(0.96);
}

.pay-btn-text {
  font-size: 32rpx;
  font-weight: 800;
  color: white;
  letter-spacing: 2rpx;
}

.pay-btn--gold .pay-btn-text {
  color: #1a0f2e;
}

.compare-section {
  padding: 30rpx;
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

.compare-table {
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
  border: 2rpx solid rgba(148, 163, 184, 0.15);
  border-radius: 20rpx;
  overflow: hidden;
}

.compare-row {
  display: flex;
  border-bottom: 1rpx solid rgba(148, 163, 184, 0.1);
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
  padding: 20rpx 8rpx;
  font-size: 24rpx;
  text-align: center;
  color: #cbd5e1;
}

.compare-feature {
  flex: 1.3;
  text-align: left;
  padding-left: 20rpx;
  color: #94a3b8;
}

.compare-header .compare-cell {
  color: #f1f5f9;
  font-weight: 700;
  font-size: 26rpx;
}

.gold-cell {
  color: #f5d76e !important;
  font-weight: 600;
}

.compare-header .gold-cell {
  background: rgba(245, 215, 110, 0.08);
}

.pro-cell {
  color: #a855f7 !important;
  font-weight: 600;
}

.compare-header .pro-cell {
  background: rgba(168, 85, 247, 0.08);
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
