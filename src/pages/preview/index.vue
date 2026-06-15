<template>
  <view class="preview-page">
    <view class="preview-header">
      <view class="header-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="header-title">适我愿兮 · 婚...</text>
      <view class="header-action">
        <text class="action-icon">⋯</text>
      </view>
    </view>

    <view class="tab-bar">
      <view
        v-for="tab in tabList"
        :key="tab.key"
        class="tab-item"
        :class="{ active: currentTab === tab.key }"
        @click="currentTab = tab.key"
      >
        <text class="tab-text">{{ tab.name }}</text>
      </view>
    </view>

    <scroll-view class="preview-content" scroll-y>
      <view v-if="currentTab === 'template'" class="template-preview">
        <view class="preview-image-wrapper">
          <image class="preview-image" :src="templateImage" mode="aspectFill"></image>

          <view class="image-overlay-top">
            <text class="overlay-title">Welcome to our wedding</text>
            <text class="overlay-sub">好久不见</text>
            <text class="overlay-name">婚礼见~</text>
          </view>

          <view class="image-overlay-bottom">
            <text class="overlay-groom">满小满</text>
            <text class="overlay-and">囍</text>
            <text class="overlay-bride">美小美</text>
            <text class="overlay-date">2050.05.20</text>
          </view>

          <view class="image-bottom-left">
            <view class="stat-item">
              <text class="stat-icon">🖼️</text>
              <text class="stat-value">15图</text>
            </view>
            <view class="stat-item">
              <text class="stat-icon">❤️</text>
              <text class="stat-value">64.39w人喜欢</text>
            </view>
          </view>

          <view class="image-bottom-right">
            <view class="action-circle" @click="handleShare">
              <text class="action-emoji">🔗</text>
            </view>
            <view class="action-circle" @click="handleFavorite">
              <text class="action-emoji">⭐</text>
            </view>
          </view>
        </view>
      </view>

      <view v-else class="similar-list">
        <view class="similar-item" v-for="(item, idx) in similarTemplates" :key="idx">
          <view class="similar-image-wrap">
            <image class="similar-image" :src="item.image" mode="aspectFill"></image>
            <view class="similar-overlay">
              <text class="similar-title">{{ item.title }}</text>
              <text class="similar-sub">{{ item.subtitle }}</text>
            </view>
            <view class="similar-stats">
              <text class="similar-stat-icon">❤️</text>
              <text class="similar-stat-value">{{ item.likes }}人喜欢</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="preview-footer">
      <view class="create-button" @click="handleCreate">
        <text class="button-text">立即制作</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const currentTab = ref('template')
const isFavorite = ref(false)

const tabList = ref([
  { key: 'template', name: '模板预览' },
  { key: 'similar', name: '相似推荐' },
])

const templateImage = '/static/images/templates/wedding-1.svg'

const similarTemplates = ref([
  { title: '我们结婚啦', subtitle: 'Welcome to our wedding', likes: '52.86w', image: '/static/images/templates/wedding-1.svg' },
  { title: '浪漫婚礼', subtitle: 'FOREVER TOGETHER', likes: '48.12w', image: '/static/images/templates/wedding-2.svg' },
  { title: '圣洁婚礼', subtitle: 'HOLY MATRIMONY', likes: '35.76w', image: '/static/images/templates/wedding-3.svg' },
  { title: '喜结良缘', subtitle: 'HAPPY MARRIAGE', likes: '62.43w', image: '/static/images/templates/wedding-4.svg' },
])

const goBack = () => {
  uni.navigateBack()
}

const handleShare = () => {
  uni.showToast({ title: '分享模板', icon: 'none' })
}

const handleFavorite = () => {
  isFavorite.value = !isFavorite.value
  uni.showToast({ title: isFavorite.value ? '已收藏' : '取消收藏', icon: 'none' })
}

const handleCreate = () => {
  uni.navigateTo({ url: '/pages/editor/index' })
}
</script>

<style lang="scss" scoped>
.preview-page {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background: #fff;
  flex-shrink: 0;
}

.header-back {
  min-width: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 56rpx;
  color: #333;
  font-weight: 300;
  line-height: 1;
}

.header-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.header-action {
  min-width: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-icon {
  font-size: 36rpx;
  color: #666;
}

.tab-bar {
  display: flex;
  background: #fff;
  padding: 0 32rpx 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
  flex-shrink: 0;
}

.tab-item {
  padding: 20rpx 24rpx;
  position: relative;

  &.active {
    .tab-text {
      color: #e84a6e;
      font-weight: 600;
    }
  }
}

.tab-text {
  font-size: 28rpx;
  color: #666;
}

.preview-content {
  flex: 1;
  overflow: hidden;
}

.template-preview {
  padding: 24rpx 32rpx;
}

.preview-image-wrapper {
  width: 100%;
  height: 900rpx;
  border-radius: 24rpx;
  overflow: hidden;
  position: relative;
  background: linear-gradient(135deg, #fff5f5 0%, #ffe4e8 100%);
  box-shadow: 0 8rpx 32rpx rgba(232, 74, 110, 0.1);
}

.preview-image {
  width: 100%;
  height: 100%;
}

.image-overlay-top {
  position: absolute;
  top: 80rpx;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.overlay-title {
  font-size: 22rpx;
  color: #333;
  letter-spacing: 4rpx;
}

.overlay-sub {
  font-size: 56rpx;
  color: #333;
  font-weight: bold;
  font-family: STKaiti, KaiTi, serif;
  margin-top: 8rpx;
}

.overlay-name {
  font-size: 44rpx;
  color: #e84a6e;
  font-weight: bold;
  font-family: STKaiti, KaiTi, serif;
}

.image-overlay-bottom {
  position: absolute;
  bottom: 180rpx;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.overlay-groom {
  font-size: 32rpx;
  color: #333;
  font-weight: 500;
}

.overlay-and {
  font-size: 56rpx;
  color: #e84a6e;
  font-weight: bold;
  margin: 8rpx 0;
}

.overlay-bride {
  font-size: 32rpx;
  color: #333;
  font-weight: 500;
}

.overlay-date {
  font-size: 24rpx;
  color: #666;
  margin-top: 12rpx;
  letter-spacing: 2rpx;
}

.image-bottom-left {
  position: absolute;
  bottom: 24rpx;
  left: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: rgba(0, 0, 0, 0.4);
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
}

.stat-icon {
  font-size: 22rpx;
}

.stat-value {
  font-size: 22rpx;
  color: #fff;
}

.image-bottom-right {
  position: absolute;
  bottom: 24rpx;
  right: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.action-circle {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-emoji {
  font-size: 28rpx;
}

.preview-footer {
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2rpx 16rpx rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.create-button {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(232, 74, 110, 0.3);
}

.button-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
  letter-spacing: 4rpx;
}

.similar-list {
  padding: 24rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.similar-item {
  width: 100%;
}

.similar-image-wrap {
  width: 100%;
  height: 500rpx;
  border-radius: 20rpx;
  overflow: hidden;
  position: relative;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.similar-image {
  width: 100%;
  height: 100%;
}

.similar-overlay {
  position: absolute;
  top: 60rpx;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.similar-title {
  font-size: 40rpx;
  color: #333;
  font-weight: bold;
  font-family: STKaiti, KaiTi, serif;
}

.similar-sub {
  font-size: 18rpx;
  color: #666;
  letter-spacing: 2rpx;
}

.similar-stats {
  position: absolute;
  bottom: 20rpx;
  left: 20rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: rgba(0, 0, 0, 0.4);
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
}

.similar-stat-icon {
  font-size: 20rpx;
}

.similar-stat-value {
  font-size: 20rpx;
  color: #fff;
}
</style>
