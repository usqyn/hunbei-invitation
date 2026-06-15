<template>
  <view class="page">
    <view class="search-bar">
      <input 
        class="search-input" 
        placeholder="婚礼海报" 
        v-model="searchText"
        @confirm="handleSearch"
      />
    </view>
    
    <view class="category-grid">
      <view 
        v-for="item in categories" 
        :key="item.id" 
        class="category-item"
        @click="handleCategoryClick(item)"
      >
        <view class="category-icon" :style="{ background: item.bgColor }">
          <text class="icon-text">{{ item.icon }}</text>
        </view>
        <text class="category-name">{{ item.name }}</text>
      </view>
    </view>
    
    <view class="feature-section">
      <view class="feature-card invitation-card" @click="goToEditor('invitation')">
        <view class="feature-content">
          <view class="feature-badge">请帖制作</view>
          <text class="feature-title">电子请帖 免费制作</text>
          <text class="feature-desc">精美模板一键生成</text>
        </view>
        <view class="feature-icon">💒</view>
      </view>
      <view class="feature-card moments-card" @click="goToEditor('moments')">
        <view class="feature-content">
          <view class="feature-badge">朋友圈邀请</view>
          <text class="feature-title">朋友圈邀请函</text>
          <text class="feature-desc">故事+视频+H5分享</text>
        </view>
        <view class="feature-icon">📱</view>
      </view>
    </view>
    
    <view class="section">
      <view class="section-header">
        <text class="section-title">婚贝精选</text>
        <view class="section-tabs">
          <text 
            v-for="tab in tabs" 
            :key="tab" 
            class="tab-item"
            :class="{ active: activeTab === tab }"
            @click="activeTab = tab"
          >{{ tab }}</text>
        </view>
      </view>
      
      <scroll-view class="card-scroll" scroll-x>
        <view class="card-list">
          <view 
            v-for="card in featuredCards" 
            :key="card.id" 
            class="invitation-card"
            @click="handleCardClick(card)"
          >
            <image class="card-image" :src="card.image" mode="aspectFill" @error="onImageError" />
            <view class="card-info">
              <text class="card-title">{{ card.title }}</text>
              <text class="card-date">{{ card.date }}</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { HOME_CATEGORIES, HOME_TABS, HOME_FEATURED_CARDS } from '@/constants/categories'

const searchText = ref('')
const activeTab = ref('网红爆款')

const categories = ref(HOME_CATEGORIES)
const tabs = ref(HOME_TABS)
const featuredCards = ref(HOME_FEATURED_CARDS)

const handleSearch = () => {
  if (searchText.value) {
    uni.showToast({ title: '搜索: ' + searchText.value, icon: 'none' })
  }
}

const handleCategoryClick = (item: any) => {
  uni.showToast({ title: '选择: ' + item.name, icon: 'none' })
}

const handleCardClick = (card: any) => {
  if (card.type === 'moments') {
    uni.navigateTo({ url: '/pages/template/index?type=moments' })
  } else {
    uni.navigateTo({ url: '/pages/template/index?type=invitation' })
  }
}

const goToEditor = (type: string) => {
  uni.navigateTo({ url: `/pages/template/index?type=${type}` })
}

const onImageError = (e: any) => {
  const target = e.target as any
  // 静默处理图片加载失败
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 120rpx;
}

.search-bar {
  padding: 24rpx;
  background: #ffffff;
}

.search-input {
  width: 100%;
  height: 80rpx;
  background: #f5f5f5;
  border-radius: 40rpx;
  padding: 0 32rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 24rpx;
  padding: 24rpx;
  background: #ffffff;
  margin-top: 16rpx;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.category-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
}

.icon-text {
  font-size: 40rpx;
}

.category-name {
  font-size: 22rpx;
  color: #333333;
}

.feature-section {
  padding: 24rpx;
  display: flex;
  gap: 24rpx;
}

.feature-card {
  flex: 1;
  border-radius: 20rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.invitation-card {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  cursor: pointer;
}

.moments-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  cursor: pointer;
}

.feature-content {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.feature-badge {
  background: rgba(255, 255, 255, 0.3);
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  font-size: 20rpx;
  color: #ffffff;
  align-self: flex-start;
}

.feature-title {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 600;
}

.feature-desc {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.7);
}

.feature-icon {
  font-size: 48rpx;
  color: #ffffff;
}

.section {
  margin-top: 16rpx;
  background: #ffffff;
  padding: 24rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
}

.section-tabs {
  display: flex;
  gap: 32rpx;
}

.tab-item {
  font-size: 26rpx;
  color: #999999;
  
  &.active {
    color: #e84a6e;
    font-weight: 500;
    position: relative;
    
    &::after {
      content: '';
      position: absolute;
      bottom: -8rpx;
      left: 0;
      right: 0;
      height: 4rpx;
      background: #e84a6e;
      border-radius: 2rpx;
    }
  }
}

.card-scroll {
  white-space: nowrap;
}

.card-list {
  display: inline-flex;
  gap: 20rpx;
}

.invitation-card {
  width: 280rpx;
  border-radius: 16rpx;
  overflow: hidden;
  background: #ffffff;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.card-image {
  width: 100%;
  height: 360rpx;
}

.card-info {
  padding: 16rpx;
}

.card-title {
  font-size: 26rpx;
  color: #333333;
  font-weight: 500;
  display: block;
  margin-bottom: 8rpx;
}

.card-date {
  font-size: 22rpx;
  color: #999999;
}
</style>