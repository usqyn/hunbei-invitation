<template>
  <view class="page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <input
        class="search-input"
        :placeholder="homeConfig.searchPlaceholder"
        v-model="searchText"
        @confirm="handleSearch"
      />
    </view>

    <!-- 分类网格 - 点击跳转到对应分类的模板列表 -->
    <view class="category-grid">
      <view
        v-for="item in categories"
        :key="item.id"
        class="category-item"
        @click="handleCategoryClick(item)"
      >
        <view class="category-icon" :style="{ background: item.bgColor }">
          <image class="icon-image" :src="item.image" mode="aspectFit" />
        </view>
        <text class="category-name">{{ item.name }}</text>
      </view>
    </view>

    <!-- 特色功能区 - 快速进入制作 -->
    <view class="feature-section">
      <view
        v-for="card in homeConfig.featureCards"
        :key="card.categoryId"
        class="feature-card"
        :class="card.categoryId === 'wedding' ? 'invitation-card' : 'moments-card'"
        @click="goToEditor(card.categoryId)"
      >
        <view class="feature-content">
          <view class="feature-badge">{{ card.badge }}</view>
          <text class="feature-title">{{ card.title }}</text>
          <text class="feature-desc">{{ card.desc }}</text>
        </view>
        <image class="feature-icon-image" :src="card.image" mode="aspectFit" />
      </view>
    </view>

    <!-- 模板精选区 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">{{ homeConfig.sections.featured.title }}</text>
        <view class="section-more" @click="goToTemplatePage">
          <text class="more-text">{{ homeConfig.moreText }}</text>
        </view>
      </view>

      <!-- 横向滚动的精选卡片 -->
      <scroll-view class="card-scroll" scroll-x>
        <view class="card-list">
          <view
            v-for="card in featuredCards"
            :key="card.id"
            class="scroll-card"
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

    <!-- 全部分类区 - 展示所有分类的模板数 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">{{ homeConfig.sections.allCategories.title }}</text>
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

      <!-- 分类网格 - 展示所有分类模板数 -->
      <view class="category-count-grid">
        <view
          v-for="cat in allCategories"
          :key="cat.id"
          class="count-card"
          @click="goToTemplatePage(cat.id)"
        >
          <image class="count-icon-image" :src="cat.icon" mode="aspectFit" />
          <text class="count-name">{{ cat.name }}</text>
          <text class="count-num">{{ cat.templates.length }} 个模板</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { HOME_CATEGORIES, HOME_TABS, HOME_FEATURED_CARDS } from '@/constants/categories'
import { CATEGORY_LIST } from '@/constants/templates'
import { HOME_CONFIG } from '@/config'

const searchText = ref('')
const activeTab = ref(HOME_CONFIG.defaultTab)

const categories = HOME_CATEGORIES
const tabs = HOME_TABS
const featuredCards = HOME_FEATURED_CARDS
const homeConfig = HOME_CONFIG

// 全部分类 - 根据选中的 tab 标签筛选
const allCategories = computed(() => {
  const tag = activeTab.value
  return CATEGORY_LIST
    .filter(cat => cat.templates.some(t => t.tags?.includes(tag)))
    .map(cat => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      templates: cat.templates.filter(t => t.tags?.includes(tag)),
    }))
})

// 搜索功能
const handleSearch = () => {
  if (searchText.value) {
    uni.navigateTo({
      url: `/pages/template/index?search=${encodeURIComponent(searchText.value)}`,
    })
  }
}

// 点击分类卡片 - 跳转到模板选择页并自动选中该分类
const handleCategoryClick = (item: any) => {
  uni.navigateTo({
    url: `/pages/template/index?category=${item.categoryId}`,
  })
}

// 点击精选卡片 - 直接跳转到编辑器并加载对应的模板
const handleCardClick = (card: any) => {
  uni.navigateTo({
    url: `/pages/editor/index?templateId=${card.type}`,
  })
}

// 点击特色功能卡片 - 跳转到模板选择页
const goToEditor = (categoryId: string) => {
  uni.navigateTo({
    url: `/pages/template/index?category=${categoryId}`,
  })
}

// 跳转到模板选择页
const goToTemplatePage = (categoryId?: string) => {
  const url = categoryId
    ? `/pages/template/index?category=${categoryId}`
    : '/pages/template/index'
  uni.navigateTo({ url })
}

// 图片加载失败的兜底处理
const onImageError = () => {
  console.warn('Home page image load failed')
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 120rpx;
}

/* 搜索栏 */
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

/* 分类网格 */
.category-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24rpx;
  padding: 24rpx;
  background: #ffffff;
  margin-top: 16rpx;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 0;
  cursor: pointer;
}

.category-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-image {
  width: 48rpx;
  height: 48rpx;
}

.category-name {
  font-size: 24rpx;
  color: #333333;
  font-weight: 500;
}

/* 特色功能区 */
.feature-section {
  padding: 24rpx;
  display: flex;
  gap: 24rpx;
  margin-top: 16rpx;
}

.feature-card {
  flex: 1;
  border-radius: 20rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  min-height: 180rpx;
}

.invitation-card {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
}

.moments-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.feature-content {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  flex: 1;
}

.feature-badge {
  background: rgba(255, 255, 255, 0.3);
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  font-size: 18rpx;
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

.feature-icon-image {
  width: 56rpx;
  height: 56rpx;
  margin-left: 16rpx;
}

/* 通用Section */
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

.section-more {
  cursor: pointer;
}

.more-text {
  font-size: 24rpx;
  color: #999999;
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

/* 横向滚动卡片 */
.card-scroll {
  white-space: nowrap;
}

.card-list {
  display: inline-flex;
  gap: 20rpx;
}

.scroll-card {
  width: 280rpx;
  border-radius: 16rpx;
  overflow: hidden;
  background: #ffffff;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
  display: inline-block;
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

/* 分类模板数量网格 */
.category-count-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.count-card {
  background: #f8f9fa;
  border-radius: 16rpx;
  padding: 28rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  cursor: pointer;
}

.count-icon-image {
  width: 56rpx;
  height: 56rpx;
}

.count-name {
  font-size: 28rpx;
  color: #333333;
  font-weight: 600;
}

.count-num {
  font-size: 22rpx;
  color: #999999;
}
</style>
