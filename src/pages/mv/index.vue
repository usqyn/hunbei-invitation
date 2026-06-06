<template>
  <view class="page">
    <view class="search-bar">
      <input 
        class="search-input" 
        placeholder="迎宾海报" 
        v-model="searchText"
        @confirm="handleSearch"
      />
    </view>
    
    <view class="banner">
      <view class="banner-content">
        <text class="banner-title">婚礼现场·MV</text>
        <text class="banner-subtitle">喜庆不俗套 宾客都夸赞</text>
      </view>
      <view class="banner-icon">▶</view>
    </view>
    
    <view class="category-section">
      <view class="category-grid">
        <view 
          v-for="item in mvCategories" 
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
    </view>
    
    <view class="section">
      <view class="section-header">
        <text class="section-title">趣味开场</text>
        <text class="section-subtitle">趣味搞怪 点燃气氛</text>
        <text class="section-more" @click="handleMore('funny')">更多 ></text>
      </view>
      
      <scroll-view class="mv-scroll" scroll-x>
        <view class="mv-list">
          <view 
            v-for="mv in funnyMvs" 
            :key="mv.id" 
            class="mv-card"
            @click="handleMvClick(mv)"
          >
            <image class="mv-image" :src="mv.image" mode="aspectFill" @error="onImageError" />
            <view class="mv-overlay">
              <view class="play-btn">▶</view>
              <view class="mv-badge">MV</view>
            </view>
            <text class="mv-title">{{ mv.title }}</text>
          </view>
        </view>
      </scroll-view>
    </view>
    
    <view class="section">
      <view class="section-header">
        <text class="section-title">浪漫开场</text>
        <text class="section-subtitle">温情暖场 触动心弦</text>
        <text class="section-more" @click="handleMore('romantic')">更多 ></text>
      </view>
      
      <view class="romantic-grid">
        <view 
          v-for="mv in romanticMvs" 
          :key="mv.id" 
          class="romantic-card"
          @click="handleMvClick(mv)"
        >
          <image class="romantic-image" :src="mv.image" mode="aspectFill" @error="onImageError" />
          <view class="romantic-overlay">
            <view class="play-btn">▶</view>
            <view class="mv-badge">MV</view>
          </view>
          <text class="romantic-title">{{ mv.title }}</text>
        </view>
      </view>
    </view>
    
    <view class="section">
      <view class="section-header">
        <text class="section-title">婚礼相册</text>
        <text class="section-subtitle">婚礼迎宾循环播放</text>
        <text class="section-more" @click="handleMore('album')">更多 ></text>
      </view>
      
      <scroll-view class="album-scroll" scroll-x>
        <view class="album-list">
          <view 
            v-for="album in albums" 
            :key="album.id" 
            class="album-card"
            @click="handleAlbumClick(album)"
          >
            <image class="album-image" :src="album.image" mode="aspectFill" @error="onImageError" />
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const searchText = ref('')

const mvCategories = ref([
  { id: 1, name: '婚礼开场', icon: '🎬', bgColor: '#e6f3ff' },
  { id: 2, name: '婚礼相册', icon: '📷', bgColor: '#ffe4e8' },
  { id: 3, name: '一键出片', icon: '✨', bgColor: '#e8f5e9' },
  { id: 4, name: '婚礼预告', icon: '📽️', bgColor: '#fff3e6' },
  { id: 5, name: '宝宝成长', icon: '👶', bgColor: '#f3e5f5' },
  { id: 6, name: '生日相册', icon: '🎂', bgColor: '#fff9c4' },
  { id: 7, name: '订婚相册', icon: '💍', bgColor: '#e8eaf6' },
  { id: 8, name: '全部场景', icon: '📋', bgColor: '#e0f2f1' }
])

const funnyMvs = ref([
  { 
    id: 1, 
    title: '我们要结婚啦', 
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=funny%20wedding%20video%20cover%20cartoon%20style%20red%20background&image_size=landscape_4_3' 
  },
  { 
    id: 2, 
    title: '我们结婚啦', 
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20wedding%20couple%20cartoon%20illustration%20red%20theme&image_size=landscape_4_3' 
  },
  { 
    id: 3, 
    title: '搞怪开场', 
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=funny%20wedding%20animation%20colorful%20playful&image_size=landscape_4_3' 
  }
])

const romanticMvs = ref([
  { 
    id: 1, 
    title: '执子之手 与子偕老', 
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=romantic%20wedding%20scene%20sunset%20couple%20silhouette&image_size=landscape_16_9' 
  },
  { 
    id: 2, 
    title: '爱就一个字', 
    image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=romantic%20wedding%20love%20scene%20elegant%20minimal&image_size=landscape_16_9' 
  }
])

const albums = ref([
  { id: 1, image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wedding%20photo%20album%20cover%20elegant%20romantic&image_size=portrait_4_3' },
  { id: 2, image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wedding%20couple%20album%20cover%20beautiful&image_size=portrait_4_3' },
  { id: 3, image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=elegant%20wedding%20photo%20book%20cover&image_size=portrait_4_3' },
  { id: 4, image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=romantic%20wedding%20album%20red%20gold&image_size=portrait_4_3' }
])

const handleSearch = () => {
  if (searchText.value) {
    uni.showToast({ title: '搜索: ' + searchText.value, icon: 'none' })
  }
}

const handleCategoryClick = (item: any) => {
  uni.showToast({ title: '选择: ' + item.name, icon: 'none' })
}

const handleMvClick = (mv: any) => {
  uni.showToast({ title: '播放: ' + mv.title, icon: 'none' })
}

const handleAlbumClick = (album: any) => {
  uni.showToast({ title: '查看相册', icon: 'none' })
}

const handleMore = (type: string) => {
  uni.showToast({ title: '查看更多' + type, icon: 'none' })
}

const onImageError = () => {}
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

.banner {
  margin: 0 24rpx;
  margin-top: 24rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 24rpx;
  padding: 40rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.banner-content {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.banner-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #ffffff;
}

.banner-subtitle {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

.banner-icon {
  width: 80rpx;
  height: 80rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #ffffff;
}

.category-section {
  margin-top: 24rpx;
  background: #ffffff;
  padding: 24rpx;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24rpx;
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
  font-size: 24rpx;
  color: #333333;
}

.section {
  margin-top: 24rpx;
  background: #ffffff;
  padding: 24rpx;
}

.section-header {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
}

.section-subtitle {
  font-size: 22rpx;
  color: #999999;
}

.section-more {
  margin-left: auto;
  font-size: 24rpx;
  color: #999999;
}

.mv-scroll, .album-scroll {
  white-space: nowrap;
}

.mv-list, .album-list {
  display: inline-flex;
  gap: 20rpx;
}

.mv-card {
  width: 360rpx;
  border-radius: 16rpx;
  overflow: hidden;
  position: relative;
}

.mv-image {
  width: 100%;
  height: 200rpx;
}

.mv-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
}

.play-btn {
  width: 72rpx;
  height: 72rpx;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #e84a6e;
}

.mv-badge {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  background: #e84a6e;
  padding: 6rpx 12rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
  color: #ffffff;
}

.mv-title {
  padding: 16rpx;
  font-size: 26rpx;
  color: #333333;
  display: block;
}

.romantic-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.romantic-card {
  border-radius: 16rpx;
  overflow: hidden;
  position: relative;
}

.romantic-image {
  width: 100%;
  height: 280rpx;
}

.romantic-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
}

.romantic-title {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
  font-size: 26rpx;
  color: #ffffff;
}

.album-card {
  width: 160rpx;
  height: 200rpx;
  border-radius: 12rpx;
  overflow: hidden;
}

.album-image {
  width: 100%;
  height: 100%;
}
</style>