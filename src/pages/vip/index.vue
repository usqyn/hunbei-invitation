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

function handlePay() {
  track('vip_click_pay', { plan: selectedPlan.value, price: currentPlan.value.price })
  
  // 模拟微信支付（实际项目接入微信支付统一下单）
  uni.showLoading({ title: '支付中...' })
  setTimeout(() => {
    uni.hideLoading()
    // 模拟支付成功
    const expireDays = selectedPlan.value === 'monthly' ? 30 : selectedPlan.value === 'quarterly' ? 90 : 365
    const expireAt = Date.now() + expireDays * 24 * 60 * 60 * 1000
    
    // 更新本地VIP状态
    userStore.vipStatus.value = 1
    userStore.vipExpireAt.value = expireAt
    userStore.vipPlan.value = selectedPlan.value
    userStore.persist()
    
    track('vip_pay_success', { plan: selectedPlan.value, price: currentPlan.value.price })
    
    uni.showToast({ title: '开通成功！', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1500)
  }, 2000)
}

// 页面曝光埋点
track('vip_page_view')
</script>

<style scoped>
.page { min-height: 100vh; background: #0f172a; color: #f1f5f9; padding-bottom: 120px; }
.vip-header { text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #f59e0b22, #ec489922); }
.vip-title { font-size: 28px; font-weight: 700; display: block; }
.vip-subtitle { font-size: 14px; color: #94a3b8; margin-top: 8px; display: block; }
.vip-benefits { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 20px; }
.benefit-item { background: #1e293b; border-radius: 12px; padding: 16px 8px; text-align: center; }
.benefit-icon { font-size: 24px; display: block; }
.benefit-title { font-size: 13px; font-weight: 600; margin-top: 8px; display: block; }
.benefit-desc { font-size: 11px; color: #94a3b8; margin-top: 4px; display: block; }
.vip-plans { display: flex; gap: 12px; padding: 0 20px; }
.plan-card { flex: 1; background: #1e293b; border: 2px solid #334155; border-radius: 12px; padding: 16px; text-align: center; position: relative; }
.plan-card.active { border-color: #f59e0b; background: #f59e0b11; }
.best-badge { position: absolute; top: -10px; right: 8px; background: #f59e0b; color: #0f172a; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
.plan-name { font-size: 14px; display: block; }
.plan-price { font-size: 24px; font-weight: 700; color: #f59e0b; display: block; margin-top: 4px; }
.plan-original { font-size: 11px; color: #94a3b8; text-decoration: line-through; display: block; }
.plan-unit { font-size: 12px; color: #94a3b8; }
.vip-compare { margin: 20px; background: #1e293b; border-radius: 12px; overflow: hidden; }
.compare-row { display: flex; border-bottom: 1px solid #334155; }
.compare-header { background: #334155; font-weight: 600; }
.compare-cell { flex: 1; padding: 12px 8px; font-size: 13px; text-align: center; }
.vip-cell { color: #f59e0b; font-weight: 600; }
.vip-footer { position: fixed; bottom: 0; left: 0; right: 0; background: #0f172a; border-top: 1px solid #334155; padding: 16px 20px; }
.pay-btn { width: 100%; background: linear-gradient(135deg, #f59e0b, #ec4899); color: #0f172a; font-weight: 700; font-size: 16px; border: none; border-radius: 24px; padding: 14px; }
.pay-tip { display: block; text-align: center; font-size: 11px; color: #94a3b8; margin-top: 8px; }
</style>
