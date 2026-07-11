<template>
  <view class="page">
    <!-- 顶部轮播图 -->
    <swiper
      class="banner-swiper"
      :indicator-dots="true"
      :autoplay="true"
      :interval="3000"
      :duration="500"
      :circular="true"
      indicator-color="rgba(255,255,255,0.5)"
      indicator-active-color="#ffffff"
    >
      <swiper-item v-for="(banner, index) in homeConfig.banners" :key="index" @click="handleBannerClick(banner)">
        <image :src="banner.image" mode="aspectFill" class="banner-image" />
      </swiper-item>
    </swiper>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <input
        class="search-input"
        :placeholder="homeConfig.searchPlaceholder"
        v-model="searchText"
        @confirm="handleSearch"
      />
    </view>

    <!-- 商城入口 -->
    <view class="mall-entry-bar" @click="goToMall">
      <text class="mall-entry-icon">&#128722;</text>
      <text class="mall-entry-text">婚礼商城</text>
      <text class="mall-entry-arrow">></text>
    </view>

    <!-- VIP入口 -->
    <view class="vip-entry-bar" @click="goToVipPage">
      <text class="vip-icon">&#9733;</text>
      <text class="vip-text">开通VIP 全站免费</text>
      <text class="vip-arrow">></text>
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
          <image class="icon-image-full" :src="item.image" mode="aspectFill" />
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
            <image class="card-image" lazy-load :src="card.image" mode="aspectFill" @error="onImageError" />
            <view class="card-info">
              <text class="card-title">{{ card.title }}</text>
              <text class="card-date">{{ card.date }}</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 热门付费模板 -->
    <view class="section" v-if="paidTemplates.length > 0">
      <view class="section-header">
        <text class="section-title">热门付费模板</text>
        <view class="section-more" @click="goToTemplatePage('paid')">
          <text class="more-text">查看更多</text>
        </view>
      </view>
      <scroll-view class="card-scroll" scroll-x>
        <view class="card-list">
          <view
            v-for="card in paidTemplates"
            :key="card.id"
            class="scroll-card paid-card"
            @click="handlePaidCardClick(card)"
          >
            <image class="card-image" lazy-load :src="card.cover || card.image" mode="aspectFill" />
            <view class="paid-badge">{{ card.price }}元</view>
            <view class="card-info">
              <text class="card-title">{{ card.name }}</text>
              <text class="card-sub">{{ card.subtitle }}</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 海报模板区 -->
    <view class="section" v-if="posterTemplates.length > 0">
      <view class="section-header">
        <text class="section-title">海报模板</text>
        <view class="section-more" @click="goToPosterPage">
          <text class="more-text">查看全部 ›</text>
        </view>
      </view>
      <scroll-view class="card-scroll" scroll-x>
        <view class="card-list">
          <view
            v-for="poster in posterTemplates"
            :key="poster.id"
            class="scroll-card poster-card"
            @click="handlePosterClick(poster)"
          >
            <image class="card-image poster-card-image" lazy-load :src="resolveUrl(poster.cover_url)" mode="aspectFill" @error="onImageError" />
            <view class="card-info">
              <text class="card-title">{{ poster.name }}</text>
              <text class="card-sub">{{ poster.category_name }}</text>
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
import { ref, computed, onMounted } from 'vue'
import { HOME_CATEGORIES, HOME_TABS, HOME_FEATURED_CARDS } from '@/constants/categories'
import { CATEGORY_LIST } from '@/constants/templates'
import { HOME_CONFIG } from '@/config'
import { resolveUrl } from '@/utils/url'
import { request } from '@/utils/request'
import { useUserStore } from '@/stores/user'

const searchText = ref('')
const activeTab = ref(HOME_CONFIG.defaultTab)
const paidTemplates = ref<any[]>([])
const posterTemplates = ref<any[]>([])
const userStore = useUserStore()
const isPurchased = computed(() => {
  // TODO: 从用户订单状态获取真实购买状态
  return userStore.isVip()
})

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

// 点击轮播图 - 跳转到对应分类
const handleBannerClick = (banner: any) => {
  if (banner.linkType === 'category') {
    uni.navigateTo({
      url: `/pages/template/index?category=${banner.linkValue}`,
    })
  }
}

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
  if (categoryId === 'paid') {
    uni.navigateTo({ url: '/pages/template/index?filter=paid' })
    return
  }
  const url = categoryId
    ? `/pages/template/index?category=${categoryId}`
    : '/pages/template/index'
  uni.navigateTo({ url })
}

// 图片加载失败的兜底处理
const onImageError = () => {
  console.warn('Home page image load failed')
}

// 加载热门付费模板
async function loadPaidTemplates() {
  try {
    const data = await request<any[]>({ url: '/api/templates?is_paid=1', hideLoading: true })
    if (Array.isArray(data)) {
      paidTemplates.value = data
    }
  } catch (e) {
    console.warn('加载付费模板失败:', e)
  }
}

// 加载热门海报模板
async function loadPosterTemplates() {
  try {
    const data = await request<any[]>({ url: '/api/poster/templates/hot', hideLoading: true })
    if (Array.isArray(data)) {
      posterTemplates.value = data.slice(0, 6)
    }
  } catch (e) {
    console.warn('加载海报模板失败:', e)
  }
}

// 点击海报模板卡片 - 跳转到海报编辑器
function handlePosterClick(poster: any) {
  uni.navigateTo({
    url: `/pages/poster/editor/index?id=${poster.id}`,
  })
}

// 跳转到海报模板列表页
function goToPosterPage() {
  uni.navigateTo({
    url: '/pages/poster/index/index',
  })
}

// 点击付费模板卡片
function handlePaidCardClick(card: any) {
  if (userStore.isVip()) {
    uni.navigateTo({
      url: `/pages/editor/index?templateId=${card.id}`,
    })
    return
  }
  uni.showModal({
    title: card.name,
    content: `${card.subtitle || ''}\n价格：${card.price}元`,
    confirmText: '去开通VIP',
    cancelText: '关闭',
    success: (res) => {
      if (res.confirm) {
        uni.navigateTo({
          url: '/pages/vip/index',
        })
      }
    },
  })
}

// 跳转到VIP页面
function goToVipPage() {
  uni.navigateTo({
    url: '/pages/vip/index',
  })
}

// 跳转到婚礼商城
function goToMall() {
  uni.switchTab({
    url: '/pages/mall/index',
  })
}

onMounted(() => {
  loadPaidTemplates()
  loadPosterTemplates()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f2f2f7;
  padding-bottom: 140rpx;
}

/* 顶部轮播图 */
.banner-swiper {
  width: 100%;
  height: 360rpx;
  border-bottom-left-radius: 32rpx;
  border-bottom-right-radius: 32rpx;
  box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.12);
  position: relative;
  z-index: 1;
  overflow: hidden;
}

.banner-image {
  width: 100%;
  height: 100%;
}

/* 搜索栏 - 毛玻璃浮动 */
.search-bar {
  padding: 24rpx;
  margin: -56rpx 24rpx 0;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-radius: 28rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
  position: relative;
  z-index: 2;
  border: 1rpx solid rgba(255, 255, 255, 0.6);
}

.search-input {
  width: 100%;
  height: 80rpx;
  background: rgba(245, 245, 245, 0.8);
  border-radius: 40rpx;
  padding: 0 32rpx;
  font-size: 28rpx;
  box-sizing: border-box;
  transition: all 0.25s ease;
}

/* 分类网格 */
.category-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24rpx;
  padding: 32rpx 24rpx;
  background: #ffffff;
  margin: 24rpx 24rpx 0;
  border-radius: 28rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.04);
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 0;
  transition: transform 0.2s ease;

  &:active {
    transform: scale(0.92);
  }
}

.category-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s ease;
}

.category-item:active .category-icon {
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.12);
}

.icon-image {
  width: 48rpx;
  height: 48rpx;
}

.icon-image-full {
  width: 100rpx;
  height: 100rpx;
  border-radius: 28rpx;
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
  margin-top: 24rpx;
}

.feature-card {
  flex: 1;
  border-radius: 28rpx;
  padding: 28rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 180rpx;
  box-shadow: 0 10rpx 28rpx rgba(0, 0, 0, 0.14), 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0) 100%);
    pointer-events: none;
  }

  &:active {
    transform: scale(0.96);
    box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.16), 0 1rpx 4rpx rgba(0, 0, 0, 0.1);
  }
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
  position: relative;
  z-index: 1;
}

.feature-badge {
  background: rgba(255, 255, 255, 0.28);
  padding: 6rpx 18rpx;
  border-radius: 20rpx;
  font-size: 18rpx;
  color: #ffffff;
  align-self: flex-start;
  border: 1rpx solid rgba(255, 255, 255, 0.4);
}

.feature-title {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 600;
}

.feature-desc {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.75);
}

.feature-icon-image {
  width: 56rpx;
  height: 56rpx;
  margin-left: 16rpx;
  position: relative;
  z-index: 1;
}

/* 通用Section */
.section {
  margin: 24rpx 24rpx 0;
  background: #ffffff;
  padding: 28rpx 24rpx;
  border-radius: 28rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.04);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1c1c1e;
}

.section-more {
  transition: opacity 0.2s ease;

  &:active {
    opacity: 0.6;
  }
}

.more-text {
  font-size: 24rpx;
  color: #8e8e93;
}

.section-tabs {
  display: flex;
  gap: 32rpx;
}

.tab-item {
  font-size: 26rpx;
  color: #8e8e93;
  transition: color 0.2s ease;

  &.active {
    color: #e84a6e;
    font-weight: 600;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      bottom: -10rpx;
      left: 50%;
      transform: translateX(-50%);
      width: 36rpx;
      height: 6rpx;
      background: linear-gradient(90deg, #ff6b8a 0%, #e84a6e 100%);
      border-radius: 3rpx;
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
  padding: 4rpx;
}

.scroll-card {
  width: 280rpx;
  border-radius: 24rpx;
  overflow: hidden;
  background: #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.08), 0 2rpx 6rpx rgba(0, 0, 0, 0.04);
  display: inline-block;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:active {
    transform: scale(0.96);
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1), 0 1rpx 3rpx rgba(0, 0, 0, 0.06);
  }
}

.card-image {
  width: 100%;
  height: 360rpx;
}

.card-info {
  padding: 18rpx;
}

.card-title {
  font-size: 26rpx;
  color: #1c1c1e;
  font-weight: 600;
  display: block;
  margin-bottom: 8rpx;
}

.card-date {
  font-size: 22rpx;
  color: #8e8e93;
}

/* 分类模板数量网格 */
.category-count-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.count-card {
  background: linear-gradient(145deg, #ffffff 0%, #f7f7fa 100%);
  border-radius: 24rpx;
  padding: 32rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:active {
    transform: translateY(-4rpx) scale(0.98);
    box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.1);
  }
}

.count-icon-image {
  width: 56rpx;
  height: 56rpx;
}

.count-name {
  font-size: 28rpx;
  color: #1c1c1e;
  font-weight: 700;
}

.count-num {
  font-size: 22rpx;
  color: #8e8e93;
}

/* VIP入口 */
.vip-entry-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  margin: 24rpx 24rpx 0;
  background: linear-gradient(135deg, #ffd700 0%, #ffb700 60%, #ff9f00 100%);
  border-radius: 24rpx;
  box-shadow: 0 10rpx 28rpx rgba(255, 183, 0, 0.3), 0 2rpx 8rpx rgba(255, 159, 0, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -20%;
    width: 200rpx;
    height: 200rpx;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0) 70%);
    pointer-events: none;
  }

  &:active {
    transform: scale(0.97);
    box-shadow: 0 6rpx 16rpx rgba(255, 183, 0, 0.32), 0 1rpx 4rpx rgba(255, 159, 0, 0.2);
  }
}

.vip-icon {
  font-size: 32rpx;
  color: #fff;
  margin-right: 12rpx;
  position: relative;
  z-index: 1;
}

.vip-text {
  flex: 1;
  font-size: 28rpx;
  color: #fff;
  font-weight: 600;
  position: relative;
  z-index: 1;
  text-shadow: 0 1rpx 2rpx rgba(180, 120, 0, 0.3);
}

.vip-arrow {
  font-size: 28rpx;
  color: #fff;
  position: relative;
  z-index: 1;
}

/* 商城入口 */
.mall-entry-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  margin: 24rpx 24rpx 0;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 60%, #ff8fb1 100%);
  border-radius: 24rpx;
  box-shadow: 0 10rpx 28rpx rgba(232, 74, 110, 0.3), 0 2rpx 8rpx rgba(255, 107, 138, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -20%;
    width: 200rpx;
    height: 200rpx;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 70%);
    pointer-events: none;
  }

  &:active {
    transform: scale(0.97);
    box-shadow: 0 6rpx 16rpx rgba(232, 74, 110, 0.32), 0 1rpx 4rpx rgba(255, 107, 138, 0.2);
  }
}

.mall-entry-icon {
  font-size: 32rpx;
  color: #fff;
  margin-right: 12rpx;
  position: relative;
  z-index: 1;
}

.mall-entry-text {
  flex: 1;
  font-size: 28rpx;
  color: #fff;
  font-weight: 600;
  position: relative;
  z-index: 1;
  text-shadow: 0 1rpx 2rpx rgba(180, 40, 70, 0.3);
}

.mall-entry-arrow {
  font-size: 28rpx;
  color: #fff;
  position: relative;
  z-index: 1;
}

/* 付费模板卡片 */
.paid-card {
  position: relative;
}

.paid-badge {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  color: #ffffff;
  font-size: 22rpx;
  font-weight: 600;
  padding: 6rpx 18rpx;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(232, 74, 110, 0.4);
}

.card-sub {
  font-size: 22rpx;
  color: #8e8e93;
}

/* 海报模板卡片 */
.poster-card-image {
  height: 420rpx;
}
</style>
