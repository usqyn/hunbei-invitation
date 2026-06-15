<template>
  <view class="page">
    <view class="invitation-wrapper">
      <view class="invitation-content" v-if="previewData">
        <view class="cover-section">
          <image class="cover-image" :src="previewData.coverImage" mode="aspectFill"></image>
          <view class="cover-overlay">
            <text class="shuangxi">囍</text>
            <text class="cover-title">我们结婚啦</text>
            <text class="cover-subtitle">Welcome to our wedding</text>
          </view>
        </view>

        <view class="couple-section">
          <view class="couple-row">
            <view class="person">
              <text class="person-name">{{ previewData.groomName || '满小满' }}</text>
              <text class="person-label">新郎</text>
            </view>
            <text class="heart">♥</text>
            <view class="person">
              <text class="person-name">{{ previewData.brideName || '美小美' }}</text>
              <text class="person-label">新娘</text>
            </view>
          </view>
        </view>

        <view class="info-section">
          <text class="section-label">婚礼信息</text>
          <view class="info-row">
            <text class="info-icon">📅</text>
            <text class="info-text">{{ previewData.weddingDate || '2050年5月20日' }}</text>
          </view>
          <view class="info-row">
            <text class="info-icon">📍</text>
            <text class="info-text">{{ previewData.detailAddress || '婚贝大酒店9F幸福宴会厅' }}</text>
          </view>
        </view>

        <view class="map-section">
          <view class="map-placeholder">
            <text class="map-text">{{ previewData.location || '点击查看地图导航' }}</text>
          </view>
        </view>

        <view class="countdown-section">
          <text class="countdown-label">距婚礼还有</text>
          <view class="countdown-row">
            <view class="countdown-box">
              <text class="countdown-num">{{ countdown.days }}</text>
              <text class="countdown-unit">天</text>
            </view>
            <text class="countdown-colon">:</text>
            <view class="countdown-box">
              <text class="countdown-num">{{ countdown.hours }}</text>
              <text class="countdown-unit">时</text>
            </view>
            <text class="countdown-colon">:</text>
            <view class="countdown-box">
              <text class="countdown-num">{{ countdown.minutes }}</text>
              <text class="countdown-unit">分</text>
            </view>
            <text class="countdown-colon">:</text>
            <view class="countdown-box">
              <text class="countdown-num">{{ countdown.seconds }}</text>
              <text class="countdown-unit">秒</text>
            </view>
          </view>
        </view>
      </view>

      <view class="bottom-actions">
        <button class="action-btn primary" @click="handleCreate">我也要制作</button>
        <button class="action-btn" @click="handleShare">分享好友</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const previewData = ref<any>(null)
let timer: number | null = null

const countdown = reactive({
  days: '00',
  hours: '00',
  minutes: '00',
  seconds: '00'
})

onLoad((query) => {
  if (query?.data) {
    try {
      previewData.value = JSON.parse(decodeURIComponent(query.data))
    } catch {
      previewData.value = null
    }
  }
  updateCountdown()
  timer = setInterval(updateCountdown, 1000) as unknown as number
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const updateCountdown = () => {
  const targetDate = new Date('2027-09-14T12:00:00').getTime()
  const now = new Date().getTime()
  const diff = targetDate - now
  if (diff > 0) {
    countdown.days = String(Math.floor(diff / (1000 * 60 * 60 * 24))).padStart(2, '0')
    countdown.hours = String(Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0')
    countdown.minutes = String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0')
    countdown.seconds = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, '0')
  }
}

const handleCreate = () => {
  uni.switchTab({ url: '/pages/index/index' })
}

const handleShare = () => {
  uni.showToast({ title: '分享链接已复制', icon: 'success' })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f5f5f5;
}

.invitation-wrapper {
  max-width: 750rpx;
  margin: 0 auto;
}

.invitation-content {
  background: #fff;
  margin: 30rpx;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 40rpx rgba(0, 0, 0, 0.06);
}

.cover-section {
  position: relative;
  height: 800rpx;
}

.cover-image {
  width: 100%;
  height: 100%;
}

.cover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.shuangxi {
  font-size: 80rpx;
  color: #e84a6e;
  font-weight: bold;
  margin-bottom: 20rpx;
}

.cover-title {
  font-size: 56rpx;
  color: #fff;
  font-weight: 600;
}

.cover-subtitle {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 16rpx;
}

.couple-section {
  padding: 60rpx 40rpx;
  text-align: center;
}

.couple-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 40rpx;
}

.person-name {
  font-size: 44rpx;
  font-weight: 600;
  color: #333;
  display: block;
}

.person-label {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
  display: block;
}

.heart {
  font-size: 36rpx;
  color: #e84a6e;
}

.info-section {
  padding: 40rpx;
  background: #fafafa;
  margin: 0 30rpx;
  border-radius: 16rpx;
}

.section-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 24rpx;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.info-icon {
  font-size: 32rpx;
}

.info-text {
  font-size: 28rpx;
  color: #666;
}

.map-section {
  margin: 30rpx;
  padding: 60rpx;
  background: #f0f0f0;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.map-placeholder {
  text-align: center;
}

.map-text {
  font-size: 26rpx;
  color: #999;
}

.countdown-section {
  padding: 40rpx;
  text-align: center;
}

.countdown-label {
  font-size: 26rpx;
  color: #999;
  display: block;
  margin-bottom: 24rpx;
}

.countdown-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.countdown-box {
  background: #e84a6e;
  border-radius: 12rpx;
  padding: 16rpx 24rpx;
  text-align: center;
}

.countdown-num {
  font-size: 40rpx;
  color: #fff;
  font-weight: 700;
  display: block;
}

.countdown-unit {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.8);
  display: block;
}

.countdown-colon {
  font-size: 36rpx;
  color: #e84a6e;
  font-weight: 700;
}

.bottom-actions {
  padding: 30rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  padding-bottom: calc(30rpx + env(safe-area-inset-bottom));
}

.action-btn {
  height: 90rpx;
  line-height: 90rpx;
  border-radius: 45rpx;
  font-size: 32rpx;
  font-weight: 500;
  border: 2rpx solid #e84a6e;
  color: #e84a6e;
  background: #fff;
  text-align: center;

  &.primary {
    background: linear-gradient(135deg, #e84a6e, #c44569);
    color: #fff;
    border: none;
  }

  &::after {
    border: none;
  }
}
</style>
