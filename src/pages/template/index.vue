<template>
  <view class="page">
    <view class="header">
      <view class="back-btn" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <view class="header-title">适我愿兮❤️婚...</view>
      <view class="header-right">
        <view class="share-icon">🔗</view>
      </view>
    </view>

    <scroll-view class="preview-scroll" scroll-y>
      <view class="preview-container">
        <image class="preview-image" :src="previewImage" mode="aspectFill"></image>
        
        <view class="template-info-overlay">
          <text class="groom-name">满小满</text>
          <text class="divider">囍</text>
          <text class="bride-name">美小美</text>
          <text class="wedding-date">2050.05.20</text>
          <text class="wedding-location">婚贝大酒店A栋9F幸福宴会厅</text>
        </view>
      </view>
    </scroll-view>

    <view class="tab-bar">
      <view class="tab-item active" @click="switchTab('preview')">
        <text class="tab-text">模板预览</text>
      </view>
      <view class="tab-item" @click="switchTab('similar')">
        <text class="tab-text">相似推荐</text>
      </view>
    </view>

    <view class="bottom-bar">
      <view class="bottom-left">
        <text class="template-stats">15图 | 63.94w人喜欢</text>
      </view>
      <view class="bottom-actions">
        <view class="action-btn" @click="handleShare">
          <text class="action-icon">🔗</text>
          <text class="action-text">分享</text>
        </view>
        <view class="action-btn" @click="handleFavorite">
          <text class="action-icon">⭐</text>
          <text class="action-text">收藏</text>
        </view>
        <button class="create-btn" @click="handleCreate">立即制作</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const activeTab = ref('preview')
const previewImage = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=romantic%20wedding%20couple%20photo%20wedding%20invitation%20design%20elegant&image_size=portrait_4_3'

const goBack = () => {
  uni.navigateBack()
}

const switchTab = (tab: string) => {
  activeTab.value = tab
}

const handleShare = () => {
  uni.showToast({
    title: '分享成功',
    icon: 'success'
  })
}

const handleFavorite = () => {
  uni.showToast({
    title: '已收藏',
    icon: 'success'
  })
}

const handleCreate = () => {
  uni.navigateTo({ url: '/pages/editor/index' })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  background: #ffffff;
  z-index: 100;
}

.back-btn {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 60rpx;
  color: #333;
  font-weight: 300;
}

.header-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
  flex: 1;
  text-align: center;
}

.header-right {
  width: 80rpx;
  display: flex;
  justify-content: flex-end;
}

.share-icon {
  font-size: 40rpx;
}

.preview-scroll {
  flex: 1;
  height: 0;
}

.preview-container {
  position: relative;
}

.preview-image {
  width: 100%;
  min-height: 1200rpx;
}

.template-info-overlay {
  position: absolute;
  bottom: 200rpx;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.groom-name, .bride-name {
  font-size: 48rpx;
  color: #fff;
  font-weight: 600;
  text-shadow: 2rpx 2rpx 8rpx rgba(0,0,0,0.5);
}

.divider {
  font-size: 60rpx;
  color: #e84a6e;
  font-weight: bold;
}

.wedding-date {
  font-size: 32rpx;
  color: #fff;
  text-shadow: 2rpx 2rpx 8rpx rgba(0,0,0,0.5);
  letter-spacing: 8rpx;
}

.wedding-location {
  font-size: 28rpx;
  color: #fff;
  text-shadow: 2rpx 2rpx 8rpx rgba(0,0,0,0.5);
  margin-top: 10rpx;
}

.tab-bar {
  display: flex;
  background: #fff;
  padding: 10rpx 30rpx;
  gap: 20rpx;
  border-top: 1px solid #eee;
}

.tab-item {
  flex: 1;
  padding: 20rpx;
  border-radius: 30rpx;
  text-align: center;
  font-size: 30rpx;
  color: #666;

  &.active {
    background: #e84a6e;
    color: #fff;
    font-weight: 600;
  }
}

.tab-text {
  font-size: 30rpx;
}

.bottom-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  background: #fff;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  border-top: 1px solid #eee;
}

.bottom-left {
  flex: 1;
}

.template-stats {
  font-size: 26rpx;
  color: #999;
}

.bottom-actions {
  display: flex;
  gap: 20rpx;
  align-items: center;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5rpx;
  padding: 10rpx 20rpx;
}

.action-icon {
  font-size: 40rpx;
}

.action-text {
  font-size: 24rpx;
  color: #666;
}

.create-btn {
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  color: #fff;
  border: none;
  border-radius: 40rpx;
  padding: 24rpx 60rpx;
  font-size: 32rpx;
  font-weight: 600;

  &::after {
    border: none;
  }
}
</style>