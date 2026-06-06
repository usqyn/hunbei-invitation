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
      <view class="feature-card mv-card">
        <view class="feature-content">
          <view class="feature-badge">高清MV</view>
          <text class="feature-title">现场大屏 婚礼视频</text>
        </view>
        <view class="feature-icon">▶</view>
      </view>
      <view class="feature-card poster-card">
        <view class="feature-content">
          <view class="feature-badge">海报图片</view>
          <text class="feature-title">婚礼海报 海报印刷</text>
        </view>
        <view class="feature-icon">📷</view>
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
            <image class="card-image" :src="card.image" mode="aspectFill" />
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

const searchText = ref('')
const activeTab = ref('网红爆款')

const categories = ref([
  { id: 1, name: '婚礼邀请', icon: '💒', bgColor: '#ffe4e8' },
  { id: 2, name: '高清MV', icon: '🎬', bgColor: '#e6f3ff' },
  { id: 3, name: '父母邀请', icon: '👨👩', bgColor: '#fff3e6' },
  { id: 4, name: '回门答谢', icon: '🏠', bgColor: '#e8f5e9' },
  { id: 5, name: '出阁宴', icon: '🎎', bgColor: '#fce4ec' },
  { id: 6, name: '生日请柬', icon: '🎂', bgColor: '#fff9c4' },
  { id: 7, name: '百日宴', icon: '👶', bgColor: '#e3f2fd' },
  { id: 8, name: '满月宴', icon: '🍼', bgColor: '#f3e5f5' },
  { id: 9, name: '乔迁之喜', icon: '🏡', bgColor: '#e8eaf6' },
  { id: 10, name: '全部分类', icon: '📋', bgColor: '#e0f2f1' }
])

const tabs = ref(['网红爆款', 'MV精选', '限时免费', '每周上新'])

const featuredCards = ref([
  { 
    id: 1, 
    title: '一键生成请柬', 
    date: '2025.05.20',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wedding%20invitation%20card%20elegant%20design%20with%20flowers%20and%20golden%20accents&image_size=portrait_4_3' 
  },
  { 
    id: 2, 
    title: '请你捞席', 
    date: '2025.05.18',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20wedding%20invitation%20red%20theme%20traditional%20style&image_size=portrait_4_3' 
  },
  { 
    id: 3, 
    title: '大喜的日子', 
    date: '2025.05.15',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20wedding%20invitation%20minimalist%20elegant%20white%20and%20gold&image_size=portrait_4_3' 
  },
  { 
    id: 4, 
    title: '喜', 
    date: '2025.05.10',
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20traditional%20wedding%20double%20happiness%20red%20background&image_size=portrait_4_3' 
  }
])

const handleSearch = () => {
  if (searchText.value) {
    uni.showToast({ title: '搜索: ' + searchText.value, icon: 'none' })
  }
}

const handleCategoryClick = (item: any) => {
  uni.showToast({ title: '选择: ' + item.name, icon: 'none' })
}

const handleCardClick = (card: any) => {
  uni.navigateTo({ url: '/pages/template/index' })
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

.mv-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.poster-card {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
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
}

.feature-title {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 500;
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