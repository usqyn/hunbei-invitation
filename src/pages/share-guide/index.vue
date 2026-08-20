<template>
  <view class="sg-page">
    <view class="sg-hero">
      <view class="sg-icon-wrap">
        <text class="sg-icon">📤</text>
      </view>
      <text class="sg-title">分享到朋友圈 / دوس جۇرىنعا ٴبولىسۋ</text>
      <text class="sg-desc">这是您第 2 次使用本模板，分享到朋友圈即可免费获得 1 次制作机会！</text>
      <text class="sg-desc sg-desc--kk">بۇل ۇلگىنى ەكىنشى رەت قولدانىپ وتىرسىز. دوس جۇرىنعا ٴبولىسسەڭىز 1 رەت تەگىن جاساۋ مۇمكىندىگىن الا الاسىز!</text>
    </view>

    <view class="sg-steps">
      <view class="sg-step">
        <text class="sg-step-num">1</text>
        <view class="sg-step-body">
          <text class="sg-step-text">点击下方「分享到朋友圈」，将请柬分享到您的朋友圈</text>
          <text class="sg-step-text sg-step-text--kk">تومەندەگى «دوس جۇرىنعا ٴبولىسۋ» تۇيمەسىن باسىپ، شاقىرىۋىڭىزدى دوس جۇرىنىڭىزعا ٴبولىسىڭىز</text>
        </view>
      </view>
      <view class="sg-step">
        <text class="sg-step-num">2</text>
        <view class="sg-step-body">
          <text class="sg-step-text">分享完成后，点击「我已分享，继续制作」</text>
          <text class="sg-step-text sg-step-text--kk">ٴبولىسكەننەن كەيىن «مەن ٴبولىستىم، جاساۋدى جالعاستىرامىن» تۇيمەسىن باسىڭىز</text>
        </view>
      </view>
    </view>

    <view class="sg-actions">
      <button class="sg-btn sg-btn--share" :disabled="isRewarding" @click="onShareMoments">
        <text class="sg-btn-text">分享到朋友圈 / دوس جۇرىنعا ٴبولىسۋ</text>
      </button>
      <button class="sg-btn sg-btn--done" :disabled="isRewarding" @click="onDoneShare">
        <text class="sg-btn-text sg-btn-text--done">{{ isRewarding ? '处理中...' : '我已分享，继续制作 / مەن ٴبولىستىم' }}</text>
      </button>
    </view>

    <view class="sg-alt">
      <text class="sg-alt-item" @click="goPay">或 ¥6.6 直接制作一次 / نەمەسە ¥6.6 تولەپ جاساۋ</text>
      <text class="sg-alt-item" @click="goVip">开通VIP免费制作 / VIP اشىپ تەگىن جاساۋ</text>
    </view>

    <view class="sg-tip">
      <text class="sg-tip-text">提示：请务必分享到「朋友圈」后，再点击「我已分享」按钮</text>
      <text class="sg-tip-text sg-tip-text--kk">ٴسىلدىرە: الدىمەن «دوس جۇرىنعا» ٴبولىسىپ، سوسىن «مەن ٴبولىستىم» تۇيمەسىن باسىڭىز</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { shareReward } from '@/api'
import { track } from '@/utils/track'

const userStore = useUserStore()

const templateId = ref('')
const price = ref(6.6)
const isRewarding = ref(false)

onLoad((options: any) => {
  templateId.value = options?.templateId || ''
  const p = Number(options?.price)
  if (p > 0) price.value = p
  enableShareMenu()
  track('share_guide_view', { templateId: templateId.value })
})

function enableShareMenu() {
  uni.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline'],
    fail: (err: any) => console.warn('share guide menu fail:', err?.errMsg || err),
  })
}

function buildSharePath(): string {
  const params: string[] = []
  if (templateId.value) params.push(`templateId=${templateId.value}`)
  if (userStore.phone) params.push(`inviterPhone=${userStore.phone}`)
  return '/pages/preview/index' + (params.length ? '?' + params.join('&') : '')
}

onShareAppMessage(() => {
  track('share_guide_share', { channel: 'friend', templateId: templateId.value })
  return { title: 'TOYtamaxia 电子请柬', path: buildSharePath() }
})

onShareTimeline(() => {
  track('share_guide_share', { channel: 'moments', templateId: templateId.value })
  const params: string[] = []
  if (templateId.value) params.push(`templateId=${templateId.value}`)
  if (userStore.phone) params.push(`inviterPhone=${userStore.phone}`)
  return { title: 'TOYtamaxia 电子请柬', query: params.join('&') }
})

// 分享到朋友圈：微信不支持自定义按钮直接调起朋友圈，引导用户使用右上角菜单
function onShareMoments() {
  enableShareMenu()
  uni.showModal({
    title: '分享到朋友圈',
    content: '请点击微信右上角「···」菜单，选择「分享到朋友圈」；分享完成后返回本页，点击「我已分享，继续制作」。',
    showCancel: false,
    confirmText: '我知道了',
  })
}

// 我已分享：信任制发放 1 次免费额度
async function onDoneShare() {
  if (isRewarding.value) return
  if (!templateId.value) {
    uni.showToast({ title: '模板参数缺失，请返回重试', icon: 'none' })
    return
  }
  isRewarding.value = true
  try {
    const res = await shareReward({ templateId: templateId.value, phone: userStore.phone })
    if (res && res.rewarded) {
      track('share_guide_done', { templateId: templateId.value })
      uni.showToast({ title: '分享成功，已获得 1 次免费制作机会', icon: 'success' })
      setTimeout(() => {
        uni.redirectTo({ url: `/pages/editor/index?templateId=${templateId.value}` })
      }, 800)
    } else if (res && res.reason === 'share_done') {
      // 已过分享阶段（第3次起）：引导付费
      uni.showModal({
        title: '提示',
        content: '您已使用 2 次免费机会，之后每次制作需付费。',
        confirmText: `¥${price.value} 制作一次`,
        cancelText: '开通VIP',
        success: (r: any) => {
          if (r.confirm) goPay()
          else goVip()
        },
      })
    } else {
      uni.showToast({ title: '今日已分享过，请直接付费或开通VIP', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: '分享奖励领取失败，请稍后重试', icon: 'none' })
  } finally {
    isRewarding.value = false
  }
}

function goPay() {
  uni.redirectTo({
    url: `/pages/vip/index?mode=purchase&templateId=${templateId.value}&price=${price.value}&redirect=editor`,
  })
}

function goVip() {
  uni.redirectTo({ url: '/pages/vip/index' })
}
</script>

<style lang="scss" scoped>
.sg-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #fff5f6 0%, #f8fafc 60%, #f1f5f9 100%);
  padding: 40rpx 30rpx 60rpx;
  box-sizing: border-box;
}

.sg-hero {
  text-align: center;
  padding: 20rpx 0 40rpx;
}

.sg-icon-wrap {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24rpx;
  box-shadow: 0 12rpx 32rpx rgba(255, 154, 158, 0.35);
}

.sg-icon {
  font-size: 64rpx;
  line-height: 1;
}

.sg-title {
  display: block;
  font-size: 38rpx;
  font-weight: 800;
  color: #1a1a2e;
  letter-spacing: 2rpx;
}

.sg-desc {
  display: block;
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #64748b;
  line-height: 1.6;
}

.sg-desc--kk {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #94a3b8;
  direction: rtl;
  text-align: right;
}

.sg-steps {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx 30rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.05);
}

.sg-step {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  padding: 20rpx 0;
}

.sg-step + .sg-step {
  border-top: 1rpx solid #f1f5f9;
}

.sg-step-num {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff9a9e, #f6416c);
  color: #ffffff;
  font-size: 24rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2rpx;
}

.sg-step-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.sg-step-text {
  font-size: 28rpx;
  color: #334155;
  line-height: 1.6;
}

.sg-step-text--kk {
  font-size: 24rpx;
  color: #94a3b8;
  direction: rtl;
  text-align: right;
}

.sg-actions {
  margin-top: 40rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.sg-btn {
  width: 100%;
  border: none;
  border-radius: 48rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.sg-btn::after {
  border: none;
}

.sg-btn--share {
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  box-shadow: 0 10rpx 28rpx rgba(7, 193, 96, 0.35);
}

.sg-btn--done {
  background: linear-gradient(135deg, #f6416c 0%, #e84a6e 100%);
  box-shadow: 0 10rpx 28rpx rgba(246, 65, 108, 0.35);
}

.sg-btn-text {
  font-size: 30rpx;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 1rpx;
}

.sg-alt {
  margin-top: 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.sg-alt-item {
  font-size: 26rpx;
  color: #f6416c;
  text-decoration: underline;
}

.sg-tip {
  margin-top: 40rpx;
  background: #fff7ed;
  border: 1rpx solid #fed7aa;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.sg-tip-text {
  font-size: 24rpx;
  color: #9a3412;
  line-height: 1.6;
}

.sg-tip-text--kk {
  font-size: 22rpx;
  color: #c2410c;
  direction: rtl;
  text-align: right;
}
</style>