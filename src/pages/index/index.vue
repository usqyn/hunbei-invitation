<template>
  <view class="page animate-page-fade-in">
    <!-- 顶部状态栏区域 + 问候语 -->
    <view class="status-bar">
      <text class="date-text">{{ dateText }}</text>
    </view>

    <!-- 顶部轮播图 -->
    <view class="banner-wrap">
      <swiper
        class="banner-swiper animate-banner-in"
        :indicator-dots="true"
        :autoplay="true"
        :interval="3000"
        :duration="500"
        :circular="true"
        indicator-color="rgba(255,255,255,0.4)"
        indicator-active-color="#ffffff"
      >
        <swiper-item v-for="(banner, index) in homeConfig.banners" :key="index" @click="handleBannerClick(banner)">
          <view class="banner-item">
            <image lazy-load :src="banner.image" mode="aspectFill" class="banner-image" />
            <view class="banner-gradient"></view>
          </view>
        </swiper-item>
      </swiper>

      <!-- 浮动装饰 -->
      <view class="deco-heart deco-heart-1">♥</view>
      <view class="deco-heart deco-heart-2">♡</view>
      <view class="deco-sparkle deco-sparkle-1">✦</view>
      <view class="deco-sparkle deco-sparkle-2">✧</view>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar animate-search-in">
      <input
        class="search-input"
        :placeholder="homeConfig.searchPlaceholder"
        v-model="searchText"
        @confirm="handleSearch"
        @focus="isSearchFocused = true"
        @blur="isSearchFocused = false"
      />
      <view class="search-icon" :class="{ focused: isSearchFocused }">
        <text class="iconfont">&#128269;</text>
      </view>
    </view>

    <!-- 双栏入口 -->
    <view class="dual-entry stagger-list">
      <view class="entry-card mall-entry" @click="goToMall">
        <view class="entry-icon-wrap animate-float-slow">
          <text class="entry-icon">&#128722;</text>
        </view>
        <view class="entry-text-wrap">
          <text class="entry-title">婚礼商城</text>
          <text class="entry-desc">精选好物</text>
        </view>
        <view class="deco-circle deco-circle-1"></view>
        <view class="deco-circle deco-circle-2"></view>
      </view>
      <view class="entry-card vip-entry vip-pulse" @click="goToVipPage">
        <view class="vip-badge">HOT</view>
        <view class="entry-icon-wrap animate-float-slow" style="animation-delay: 0.5s">
          <text class="entry-icon">&#9733;</text>
        </view>
        <view class="entry-text-wrap">
          <text class="entry-title">开通VIP</text>
          <text class="entry-desc">全站免费</text>
        </view>
        <view class="deco-star deco-star-1">✦</view>
        <view class="deco-star deco-star-2">✧</view>
      </view>
    </view>

    <!-- 分类网格 - 点击跳转到对应分类的模板列表 -->
    <view class="category-grid stagger-list">
      <view
        v-for="item in categories"
        :key="item.id"
        class="category-item"
        @click="handleCategoryClick(item)"
      >
        <view class="category-icon" :style="{ background: getCategoryBg(item.categoryId) }">
          <image class="icon-image-full" lazy-load :src="item.image" mode="aspectFill" />
          <view class="icon-glow"></view>
        </view>
        <text class="category-name">{{ item.name }}</text>
        <text class="category-count rtl-text">{{ t('cat.' + item.categoryId, 'kk') }}</text>
      </view>
    </view>

    <!-- 特色功能区 - 快速进入制作 -->
    <view class="feature-section stagger-list">
      <view
        v-for="(card, idx) in homeConfig.featureCards"
        :key="card.categoryId"
        class="feature-card"
        :class="idx % 2 === 0 ? 'invitation-card' : 'moments-card'"
        @click="goToEditor(card.categoryId)"
      >
        <view class="feature-content">
          <view class="feature-badge">{{ card.badge }}</view>
          <text class="feature-title">{{ card.title }}</text>
          <text class="feature-desc">{{ card.desc }}</text>
          <view class="feature-cta">
            <text class="cta-text">立即制作</text>
            <text class="cta-arrow">→</text>
          </view>
        </view>
        <image class="feature-icon-image animate-float-slow" :src="card.image" mode="aspectFit" />
        <view class="card-shine"></view>
      </view>
    </view>

    <!-- 模板精选区 -->
    <view class="section animate-section-fade-in">
      <view class="section-header">
        <view class="section-title-wrap">
          <text class="section-title">{{ homeConfig.sections.featured.title }}</text>
          <view class="title-decoration"></view>
        </view>
        <view class="section-more" @click="goToTemplatePage">
          <text class="more-text">查看更多</text>
          <text class="more-arrow">›</text>
        </view>
      </view>

      <!-- 横向滚动的精选卡片 -->
      <scroll-view class="card-scroll" scroll-x>
        <view class="card-list stagger-list-horizontal">
          <view
            v-for="card in featuredCards"
            :key="card.id"
            class="scroll-card"
            @click="handleCardClick(card)"
          >
            <image class="card-image" lazy-load :src="card.image" mode="aspectFill" @error="onImageError" />
            <view class="card-overlay"></view>
            <view class="card-badge-wrap">
              <view class="card-vip-tag">
                <text class="vip-icon">♛</text>
                VIP
              </view>
              <view class="card-hot-tag" v-if="card.isHot">HOT</view>
            </view>
            <view class="card-info">
              <text class="card-title">{{ card.title }}</text>
              <view class="card-meta">
                <text class="card-date">{{ card.date }}</text>
                <view class="card-views" v-if="card.views">
                  <text class="view-icon">👁</text>
                  <text class="view-count">{{ formatCount(card.views) }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 热门付费模板 -->
    <view class="section animate-section-fade-in" v-if="paidTemplates.length > 0 || loadingPaid" style="animation-delay: 0.1s">
      <view class="section-header">
        <view class="section-title-wrap">
          <text class="section-title">热门付费模板</text>
          <view class="title-decoration"></view>
        </view>
        <view class="section-more" @click="goToTemplatePage('paid')">
          <text class="more-text">查看更多</text>
          <text class="more-arrow">›</text>
        </view>
      </view>
      <scroll-view class="card-scroll" scroll-x>
        <view class="card-list stagger-list-horizontal">
          <view
            v-for="card in paidTemplates"
            :key="card.id"
            class="scroll-card paid-card"
            @click="handlePaidCardClick(card)"
          >
            <image class="card-image" lazy-load :src="card.cover || card.image" mode="aspectFill" />
            <view class="card-overlay"></view>
            <view class="paid-badge">
              <text class="price-symbol">¥</text>
              <text class="price-num">{{ card.price }}</text>
            </view>
            <view class="paid-sold" v-if="card.sales_count || card.sales">
              <text class="sold-icon">🔥</text>
              <text class="sold-text">已售{{ card.sales_count || card.sales || '100+' }}</text>
            </view>
            <view class="card-info">
              <text class="card-title">{{ card.name }}</text>
              <text class="card-sub">{{ card.subtitle }}</text>
            </view>
          </view>
          <!-- 加载骨架 -->
          <view v-if="loadingPaid" class="scroll-card skeleton-card-item">
            <view class="card-image skeleton-shimmer"></view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 海报模板区 -->
    <view class="section animate-section-fade-in" v-if="posterTemplates.length > 0 || loadingPoster" style="animation-delay: 0.2s">
      <view class="section-header">
        <view class="section-title-wrap">
          <text class="section-title">海报模板</text>
          <view class="title-decoration"></view>
        </view>
        <view class="section-more" @click="goToPosterPage">
          <text class="more-text">查看全部</text>
          <text class="more-arrow">›</text>
        </view>
      </view>
      <scroll-view class="card-scroll" scroll-x>
        <view class="card-list stagger-list-horizontal">
          <view
            v-for="poster in posterTemplates"
            :key="poster.id"
            class="scroll-card poster-card"
            @click="handlePosterClick(poster)"
          >
            <image class="card-image poster-card-image" lazy-load :src="resolveUrl(poster.cover_url)" mode="aspectFill" @error="onImageError" />
            <view class="card-overlay"></view>
            <view class="poster-category-tag">{{ poster.category_name }}</view>
            <view class="card-info">
              <text class="card-title">{{ poster.name }}</text>
              <view class="card-meta">
                <text class="card-sub">{{ poster.category_name }}</text>
              </view>
            </view>
          </view>
          <!-- 加载骨架 -->
          <view v-if="loadingPoster" class="scroll-card skeleton-card-item">
            <view class="card-image poster-card-image skeleton-shimmer"></view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 全部分类区 - 展示所有分类的模板数 -->
    <view class="section animate-section-fade-in" style="animation-delay: 0.3s">
      <view class="section-header section-header-column">
        <view class="section-title-wrap">
          <text class="section-title">{{ homeConfig.sections.allCategories.title }}</text>
          <view class="title-decoration"></view>
        </view>
        <view class="section-tabs">
          <view
            v-for="tab in tabs"
            :key="tab"
            class="tab-pill"
            :class="{ active: activeTab === tab }"
            @click="activeTab = tab"
          >
            <text class="tab-pill-text">{{ tab }}</text>
          </view>
        </view>
      </view>

      <!-- 分类网格 - 展示所有分类模板数 -->
      <view class="category-count-grid stagger-list">
        <view
          v-for="cat in allCategories"
          :key="cat.id"
          class="count-card"
          @click="goToTemplatePage(cat.id)"
        >
          <view class="count-icon-wrap" :style="{ background: getCategoryBg(cat.id) }">
            <image class="count-icon-image" :src="cat.icon" mode="aspectFit" />
          </view>
          <view class="count-info">
            <text class="count-name">{{ cat.name }}</text>
            <text class="count-num">{{ cat.templates.length }} 个模板</text>
          </view>
          <text class="count-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 底部安全区 -->
    <view class="bottom-safe-area"></view>
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
import { t } from '@/locales'
import '@/locales/kk'
import '@/locales/zh-CN'

const searchText = ref('')
const activeTab = ref(HOME_CONFIG.defaultTab)
const paidTemplates = ref<any[]>([])
const posterTemplates = ref<any[]>([])
// 精选卡片：优先用 API 已发布模板；接口失败或不足时回退到本地静态卡片
const featuredTemplates = ref<any[]>([])
const isSearchFocused = ref(false)
const loadingPaid = ref(true)
const loadingPoster = ref(true)
const userStore = useUserStore()

const categories = HOME_CATEGORIES
const tabs = HOME_TABS
const homeConfig = HOME_CONFIG
const featuredCards = computed(() => {
  const apiCards = featuredTemplates.value.map(t => ({
    id: t.id,
    title: t.name || '未命名',
    templateId: t.id,
    date: t.subtitle || '',
    image: resolveUrl(t.cover || t.image || ''),
    isHot: (t.likes || 0) > 1000,
    views: t.likes || 0,
  }))
  if (apiCards.length >= 8) return apiCards.slice(0, 8)
  // 不足 8 个，用本地静态卡片补齐（保留旧数据兼容性）
  const staticCards = HOME_FEATURED_CARDS.map(c => ({
    id: c.id,
    title: c.title,
    templateId: c.type,
    date: c.date,
    image: c.image,
    isHot: (c as any).likes > 1000,
    views: (c as any).likes || 0,
  }))
  return [...apiCards, ...staticCards].slice(0, 8)
})

const dateText = computed(() => {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const weekDay = weekDays[now.getDay()]
  return `${month}月${day}日 ${weekDay}`
})

function formatCount(count: number): string {
  if (count >= 10000) {
    return (count / 10000).toFixed(1) + 'w'
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'k'
  }
  return count.toString()
}

function getCategoryBg(id: string): string {
  const bgMap: Record<string, string> = {
    wedding: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
    engagement: 'linear-gradient(135deg, #fd79a8 0%, #e84393 100%)',
    creative: 'linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%)',
    birthday: 'linear-gradient(135deg, #fdcb6e 0%, #e17055 100%)',
    poster: 'linear-gradient(135deg, #fd79a8 0%, #fab1a0 100%)',
    baby: 'linear-gradient(135deg, #fdcb6e 0%, #f39c12 100%)',
    study: 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)',
    festival: 'linear-gradient(135deg, #00b894 0%, #00cec9 100%)',
    'festival-invitation': 'linear-gradient(135deg, #00b894 0%, #00cec9 100%)',
    house: 'linear-gradient(135deg, #00cec9 0%, #55a3ff 100%)',
  }
  return bgMap[id] || 'linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%)'
}

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

const handleBannerClick = (banner: any) => {
  if (banner.linkType === 'category') {
    uni.navigateTo({
      url: `/pages/template/index?category=${banner.linkValue}`,
    })
  }
}

const handleSearch = () => {
  if (searchText.value) {
    uni.navigateTo({
      url: `/pages/template/index?search=${encodeURIComponent(searchText.value)}`,
    })
  }
}

const handleCategoryClick = (item: any) => {
  uni.navigateTo({
    url: `/pages/template/index?category=${item.categoryId}`,
  })
}

const handleCardClick = (card: any) => {
  // 登录拦截：未登录时跳转登录页
  if (!userStore.requireLogin()) return
  // 优先使用 API 模板真实 ID；fallback 到旧静态卡片的 type 字段
  const templateId = card.templateId || card.type
  if (!templateId) return
  uni.navigateTo({
    url: `/pages/editor/index?templateId=${templateId}`,
  })
}

const goToEditor = (categoryId: string) => {
  uni.navigateTo({
    url: `/pages/template/index?category=${categoryId}`,
  })
}

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

const onImageError = () => {
  console.warn('Home page image load failed')
}

async function loadPaidTemplates() {
  try {
    const data = await request<any[]>({ url: '/api/templates?is_paid=1', hideLoading: true })
    if (Array.isArray(data)) {
      paidTemplates.value = data
    }
  } catch (e) {
    console.warn('加载付费模板失败:', e)
  } finally {
    loadingPaid.value = false
  }
}

// 精选模板：取已发布的、按 likes 降序的前 8 个
async function loadFeaturedTemplates() {
  try {
    // page=1&limit=8 已在服务端按 updatedAt DESC 排序
    // 这里取 published 模板（默认就过滤 published），转成卡片数据
    // 字段裁剪：只保留 featuredCards computed 实际使用的字段，避免完整 TemplateItem 进 setData
    const data = await request<any[]>({ url: '/api/templates?page=1&limit=8', hideLoading: true })
    if (Array.isArray(data)) {
      featuredTemplates.value = data.map(t => ({
        id: t.id,
        name: t.name,
        subtitle: t.subtitle,
        cover: t.cover,
        image: t.image,
        likes: t.likes,
      }))
    }
  } catch (e) {
    console.warn('加载精选模板失败:', e)
  }
}

async function loadPosterTemplates() {
  try {
    const data = await request<any[]>({ url: '/api/poster/templates/hot', hideLoading: true })
    if (Array.isArray(data)) {
      posterTemplates.value = data.slice(0, 6)
    }
  } catch (e) {
    console.warn('加载海报模板失败:', e)
  } finally {
    loadingPoster.value = false
  }
}

function handlePosterClick(poster: any) {
  // 登录拦截：未登录时跳转登录页
  if (!userStore.requireLogin()) return
  uni.navigateTo({
    url: `/pages/poster/editor/index?id=${poster.id}`,
  })
}

function goToPosterPage() {
  uni.navigateTo({
    url: '/pages/poster/index/index',
  })
}

function handlePaidCardClick(card: any) {
  // 登录拦截：未登录时跳转登录页
  if (!userStore.requireLogin()) return

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

function goToVipPage() {
  uni.navigateTo({
    url: '/pages/vip/index',
  })
}

function goToMall() {
  uni.switchTab({
    url: '/pages/mall/index',
  })
}

onMounted(() => {
  loadFeaturedTemplates()
  loadPaidTemplates()
  loadPosterTemplates()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #fff5f7 0%, #f2f2f7 300rpx);
  padding-bottom: 140rpx;
  position: relative;
  overflow-x: hidden;
}

@keyframes pageFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.animate-page-fade-in {
  animation: pageFadeIn 0.5s ease-out both;
}

@keyframes sectionFadeInUp {
  from {
    opacity: 0;
    transform: translateY(24rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-section-fade-in {
  animation: sectionFadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) both;
}

/* 状态栏 + 问候语 */
.status-bar {
  padding-top: calc(env(safe-area-inset-top) + 16rpx);
  padding-left: 32rpx;
  padding-right: 32rpx;
  padding-bottom: 8rpx;
  position: relative;
  z-index: 10;
}

.date-text {
  font-size: 22rpx;
  color: #8e8e93;
  margin-top: 2rpx;
}

/* 顶部轮播图 */
.banner-wrap {
  position: relative;
  overflow: hidden;
}

@keyframes bannerIn {
  from {
    opacity: 0;
    transform: scale(1.02);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-banner-in {
  animation: bannerIn 0.8s cubic-bezier(0.4, 0, 0.2, 1) both;
  animation-delay: 0.1s;
}

.banner-swiper {
  width: 100%;
  height: 380rpx;
  border-bottom-left-radius: 40rpx;
  border-bottom-right-radius: 40rpx;
  box-shadow: 0 16rpx 48rpx rgba(232, 74, 110, 0.15);
  position: relative;
  z-index: 1;
  overflow: hidden;
}

.banner-item {
  width: 100%;
  height: 100%;
  position: relative;
}

.banner-image {
  width: 100%;
  height: 100%;
}

.banner-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0) 30%, rgba(0, 0, 0, 0.2) 100%);
  pointer-events: none;
}

/* 浮动装饰 */
@keyframes floatHeart {
  0%, 100% {
    transform: translateY(0) rotate(-5deg);
    opacity: 0.6;
  }
  50% {
    transform: translateY(-20rpx) rotate(5deg);
    opacity: 0.9;
  }
}

@keyframes floatSparkle {
  0%, 100% {
    transform: translateY(0) scale(1);
    opacity: 0.5;
  }
  50% {
    transform: translateY(-15rpx) scale(1.2);
    opacity: 1;
  }
}

.deco-heart {
  position: absolute;
  color: rgba(255, 107, 138, 0.7);
  z-index: 5;
  pointer-events: none;
  animation: floatHeart 3s ease-in-out infinite;
}

.deco-heart-1 {
  top: 80rpx;
  left: 40rpx;
  font-size: 28rpx;
  animation-delay: 0s;
}

.deco-heart-2 {
  top: 120rpx;
  right: 60rpx;
  font-size: 24rpx;
  color: rgba(255, 182, 193, 0.8);
  animation-delay: 1s;
}

.deco-sparkle {
  position: absolute;
  color: rgba(255, 215, 0, 0.8);
  z-index: 5;
  pointer-events: none;
  animation: floatSparkle 2.5s ease-in-out infinite;
}

.deco-sparkle-1 {
  top: 100rpx;
  right: 120rpx;
  font-size: 20rpx;
  animation-delay: 0.5s;
}

.deco-sparkle-2 {
  top: 160rpx;
  left: 80rpx;
  font-size: 16rpx;
  color: rgba(255, 255, 255, 0.7);
  animation-delay: 1.5s;
}

/* 搜索栏 */
@keyframes searchIn {
  from {
    opacity: 0;
    transform: translateY(20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-search-in {
  animation: searchIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) both;
  animation-delay: 0.3s;
}

.search-bar {
  padding: 20rpx 20rpx 20rpx 32rpx;
  margin: 48rpx 24rpx 0;
  background: transparent;
  border-radius: 32rpx;
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
}

.search-input {
  flex: 1;
  height: 72rpx;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-radius: 36rpx;
  padding: 0 24rpx 0 64rpx;
  font-size: 28rpx;
  box-sizing: border-box;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1rpx solid rgba(255, 255, 255, 0.3);
}

.search-input:focus {
  background: rgba(255, 255, 255, 0.92);
  border-color: rgba(232, 74, 110, 0.3);
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.12);
}

.search-icon {
  position: absolute;
  left: 40rpx;
  top: 50%;
  transform: translateY(-50%);
  font-size: 32rpx;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 3;

  &.focused {
    color: #e84a6e;
    transform: translateY(-50%) scale(1.1);
  }
}

/* 分类网格 */
.category-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24rpx;
  padding: 32rpx 24rpx;
  background: #ffffff;
  margin: 24rpx 24rpx 0;
  border-radius: 32rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.04);
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  padding: 16rpx 0;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  border-radius: 24rpx;

  &:active {
    transform: scale(0.9);
  }
}

.category-icon {
  width: 104rpx;
  height: 104rpx;
  border-radius: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.12);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.category-item:active .category-icon {
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.15);
  transform: scale(0.95);
}

.icon-glow {
  position: absolute;
  top: -10rpx;
  left: -10rpx;
  right: -10rpx;
  bottom: -10rpx;
  border-radius: 36rpx;
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
  background: inherit;
  filter: blur(20rpx);
  z-index: -1;
}

.category-item:active .icon-glow {
  opacity: 0.5;
}

.icon-image-full {
  width: 104rpx;
  height: 104rpx;
  border-radius: 30rpx;
}

.category-name {
  font-size: 26rpx;
  color: #1c1c1e;
  font-weight: 600;
}

.category-count {
  font-size: 20rpx;
  color: #8e8e93;
  margin-top: -4rpx;
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
  border-radius: 32rpx;
  padding: 32rpx 28rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 200rpx;
  box-shadow: 0 12rpx 36rpx rgba(0, 0, 0, 0.15), 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0) 100%);
    pointer-events: none;
  }

  &:active {
    transform: scale(0.95) translateY(2rpx);
    box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.18), 0 1rpx 4rpx rgba(0, 0, 0, 0.1);
  }
}

.card-shine {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    45deg,
    transparent 40%,
    rgba(255, 255, 255, 0.1) 50%,
    transparent 60%
  );
  transform: translateX(-100%);
  pointer-events: none;
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
  background: rgba(255, 255, 255, 0.32);
  padding: 8rpx 20rpx;
  border-radius: 24rpx;
  font-size: 20rpx;
  color: #ffffff;
  align-self: flex-start;
  border: 1rpx solid rgba(255, 255, 255, 0.45);
  font-weight: 500;
  backdrop-filter: blur(10rpx);
}

.feature-title {
  font-size: 30rpx;
  color: #ffffff;
  font-weight: 700;
  margin-top: 6rpx;
}

.feature-desc {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.8);
}

.feature-cta {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 12rpx;
}

.cta-text {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.95);
  font-weight: 500;
}

.cta-arrow {
  font-size: 24rpx;
  color: #ffffff;
  font-weight: 700;
  transition: transform 0.2s ease;
}

.feature-card:active .cta-arrow {
  transform: translateX(6rpx);
}

@keyframes floatSlow {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8rpx); }
}

.animate-float-slow {
  animation: floatSlow 3s ease-in-out infinite;
}

.feature-icon-image {
  width: 64rpx;
  height: 64rpx;
  margin-left: 16rpx;
  position: relative;
  z-index: 1;
}

/* 通用Section */
.section {
  margin: 24rpx 24rpx 0;
  background: #ffffff;
  padding: 32rpx 24rpx 28rpx;
  border-radius: 32rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.04);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28rpx;
}

.section-header-column {
  flex-direction: column;
  align-items: flex-start;
  gap: 24rpx;
}

.section-title-wrap {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.section-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #1c1c1e;
  position: relative;
}

.title-decoration {
  width: 8rpx;
  height: 32rpx;
  background: linear-gradient(180deg, #e84a6e 0%, #ff6b8a 100%);
  border-radius: 4rpx;
}

.section-more {
  display: flex;
  align-items: center;
  gap: 4rpx;
  transition: all 0.2s ease;

  &:active {
    opacity: 0.6;
  }
}

.more-text {
  font-size: 26rpx;
  color: #e84a6e;
  font-weight: 500;
}

.more-arrow {
  font-size: 32rpx;
  color: #e84a6e;
  font-weight: 600;
  margin-top: -2rpx;
  transition: transform 0.2s ease;
}

.section-more:active .more-arrow {
  transform: translateX(4rpx);
}

/* Tab 胶囊样式 */
.section-tabs {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}

.tab-pill {
  padding: 16rpx 32rpx;
  background: #f2f2f7;
  border-radius: 40rpx;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &.active {
    background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
    box-shadow: 0 6rpx 16rpx rgba(232, 74, 110, 0.3);
  }

  &:active {
    transform: scale(0.95);
  }
}

.tab-pill-text {
  font-size: 26rpx;
  color: #8e8e93;
  font-weight: 500;
  transition: color 0.3s ease;
}

.tab-pill.active .tab-pill-text {
  color: #ffffff;
  font-weight: 600;
}

/* 横向滚动卡片 */
.card-scroll {
  white-space: nowrap;
  margin: 0 -24rpx;
  padding: 0 24rpx;
}

.card-list {
  display: inline-flex;
  gap: 20rpx;
  padding: 6rpx 4rpx 12rpx;
}

.stagger-list-horizontal {
  > view {
    opacity: 0;
    transform: translateY(16rpx);
    animation: fadeInUp 0.4s ease forwards;
  }

  > view:nth-child(1) { animation-delay: 0.05s; }
  > view:nth-child(2) { animation-delay: 0.1s; }
  > view:nth-child(3) { animation-delay: 0.15s; }
  > view:nth-child(4) { animation-delay: 0.2s; }
  > view:nth-child(5) { animation-delay: 0.25s; }
  > view:nth-child(6) { animation-delay: 0.3s; }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(16rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.scroll-card {
  width: 280rpx;
  border-radius: 28rpx;
  overflow: hidden;
  background: linear-gradient(160deg, #ffffff 0%, #fafafa 100%);
  box-shadow: 0 12rpx 36rpx rgba(0, 0, 0, 0.1), 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
  display: inline-block;
  position: relative;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease;

  &:active {
    transform: scale(0.94) translateY(4rpx);
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.12), 0 1rpx 4rpx rgba(0, 0, 0, 0.08);
  }
}

.card-image {
  width: 100%;
  height: 360rpx;
}

.card-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 40%, rgba(0, 0, 0, 0.5) 75%, rgba(0, 0, 0, 0.75) 100%);
  pointer-events: none;
}

.card-badge-wrap {
  position: absolute;
  top: 16rpx;
  left: 16rpx;
  right: 16rpx;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  z-index: 3;
}

.card-vip-tag {
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: linear-gradient(135deg, #ffd700 0%, #ffb700 50%, #ff9f00 100%);
  color: #7a4a00;
  font-size: 20rpx;
  font-weight: 700;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(255, 183, 0, 0.4);
  letter-spacing: 0.5rpx;
}

.vip-icon {
  font-size: 18rpx;
}

.card-hot-tag {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  color: #ffffff;
  font-size: 18rpx;
  font-weight: 700;
  padding: 6rpx 14rpx;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(238, 90, 36, 0.4);
  letter-spacing: 1rpx;
}

.card-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 48rpx 20rpx 20rpx;
  z-index: 2;
}

.card-title {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 600;
  display: block;
  margin-bottom: 8rpx;
  text-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.3);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-date {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
}

.card-views {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.view-icon {
  font-size: 20rpx;
}

.view-count {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.85);
}

/* 分类模板数量网格 */
.category-count-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 16rpx;
}

.count-card {
  background: linear-gradient(145deg, #ffffff 0%, #fafafc 100%);
  border-radius: 24rpx;
  padding: 24rpx 20rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1rpx solid rgba(0, 0, 0, 0.03);

  &:active {
    transform: scale(0.98);
    box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.08);
  }
}

.count-icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.1);
}

.count-icon-image {
  width: 40rpx;
  height: 40rpx;
}

.count-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.count-name {
  font-size: 28rpx;
  color: #1c1c1e;
  font-weight: 600;
}

.count-num {
  font-size: 22rpx;
  color: #8e8e93;
}

.count-arrow {
  font-size: 36rpx;
  color: #c0c0d0;
  font-weight: 500;
  margin-top: -4rpx;
  transition: all 0.2s ease;
}

.count-card:active .count-arrow {
  color: #e84a6e;
  transform: translateX(4rpx);
}

/* 双栏入口 */
.dual-entry {
  display: flex;
  gap: 16rpx;
  padding: 0 24rpx;
  margin-top: 24rpx;
}

.entry-card {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 28rpx 24rpx;
  border-radius: 28rpx;
  position: relative;
  overflow: hidden;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease;

  &:active {
    transform: scale(0.95);
  }

  &::before {
    content: '';
    position: absolute;
    top: -30%;
    right: -10%;
    width: 180rpx;
    height: 180rpx;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 70%);
    pointer-events: none;
  }
}

.mall-entry {
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 50%, #ff8fb1 100%);
  box-shadow: 0 10rpx 28rpx rgba(232, 74, 110, 0.32);
}

.vip-entry {
  background: linear-gradient(135deg, #ffe259 0%, #ffa751 50%, #ff8c42 100%);
  box-shadow: 0 10rpx 28rpx rgba(255, 167, 81, 0.35);
}

@keyframes vipPulse {
  0%, 100% {
    box-shadow: 0 10rpx 28rpx rgba(255, 167, 81, 0.35);
  }
  50% {
    box-shadow: 0 10rpx 40rpx rgba(255, 167, 81, 0.55);
  }
}

.vip-pulse {
  animation: vipPulse 2s ease-in-out infinite;
}

.vip-badge {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  color: #ffffff;
  font-size: 18rpx;
  font-weight: 700;
  padding: 4rpx 12rpx;
  border-radius: 16rpx;
  z-index: 3;
  box-shadow: 0 4rpx 10rpx rgba(238, 90, 36, 0.4);
  letter-spacing: 1rpx;
}

.entry-icon-wrap {
  width: 76rpx;
  height: 76rpx;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.35);
  position: relative;
  z-index: 1;
  backdrop-filter: blur(10rpx);
}

.entry-icon {
  font-size: 38rpx;
  color: #fff;
}

.entry-text-wrap {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  position: relative;
  z-index: 1;
  flex: 1;
}

.entry-title {
  font-size: 30rpx;
  color: #fff;
  font-weight: 700;
}

.entry-desc {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
}

.deco-circle {
  position: absolute;
  border-radius: 50%;
  border: 2rpx solid rgba(255, 255, 255, 0.25);
  pointer-events: none;
  z-index: 0;
}

.deco-circle-1 {
  width: 100rpx;
  height: 100rpx;
  bottom: -20rpx;
  left: -20rpx;
}

.deco-circle-2 {
  width: 60rpx;
  height: 60rpx;
  top: 10rpx;
  right: 30rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.2);
}

@keyframes twinkle {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
}

.deco-star {
  position: absolute;
  color: rgba(255, 255, 255, 0.7);
  z-index: 1;
  pointer-events: none;
  animation: twinkle 2s ease-in-out infinite;
}

.deco-star-1 {
  top: 20rpx;
  right: 60rpx;
  font-size: 16rpx;
  animation-delay: 0s;
}

.deco-star-2 {
  bottom: 30rpx;
  right: 20rpx;
  font-size: 12rpx;
  animation-delay: 1s;
}

/* 付费模板卡片 */
.paid-card {
  position: relative;
}

.paid-badge {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  display: flex;
  align-items: baseline;
  gap: 2rpx;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  color: #ffffff;
  font-weight: 700;
  padding: 8rpx 18rpx;
  border-radius: 24rpx;
  box-shadow: 0 6rpx 16rpx rgba(232, 74, 110, 0.45);
  z-index: 3;
  border: 1rpx solid rgba(255, 255, 255, 0.3);
}

.price-symbol {
  font-size: 20rpx;
}

.price-num {
  font-size: 28rpx;
}

.paid-sold {
  position: absolute;
  top: 16rpx;
  left: 16rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(10rpx);
  padding: 8rpx 14rpx;
  border-radius: 20rpx;
  z-index: 3;
  border: 1rpx solid rgba(255, 255, 255, 0.15);
}

.sold-icon {
  font-size: 18rpx;
}

.sold-text {
  font-size: 20rpx;
  color: #ffffff;
  font-weight: 500;
}

.card-sub {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
}

/* 海报模板卡片 */
.poster-card-image {
  height: 420rpx;
}

.poster-category-tag {
  position: absolute;
  top: 16rpx;
  left: 16rpx;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12rpx);
  color: #ffffff;
  font-size: 20rpx;
  font-weight: 500;
  padding: 8rpx 18rpx;
  border-radius: 20rpx;
  z-index: 3;
  border: 1rpx solid rgba(255, 255, 255, 0.2);
}

/* 错峰入场 */
.stagger-list {
  > view {
    opacity: 0;
    transform: translateY(20rpx);
    animation: fadeInUp 0.45s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  > view:nth-child(1) { animation-delay: 0.05s; }
  > view:nth-child(2) { animation-delay: 0.1s; }
  > view:nth-child(3) { animation-delay: 0.15s; }
  > view:nth-child(4) { animation-delay: 0.2s; }
  > view:nth-child(5) { animation-delay: 0.25s; }
  > view:nth-child(6) { animation-delay: 0.3s; }
  > view:nth-child(7) { animation-delay: 0.35s; }
  > view:nth-child(8) { animation-delay: 0.4s; }
  > view:nth-child(9) { animation-delay: 0.45s; }
}

/* 底部安全区 */
.bottom-safe-area {
  height: calc(120rpx + env(safe-area-inset-bottom));
}

/* 骨架屏占位 */
.skeleton-card-item {
  background: #f5f5f7;
  border-radius: 28rpx;
  overflow: hidden;
}

.skeleton-shimmer {
  background: linear-gradient(90deg, #ececee 25%, #f5f5f7 37%, #ececee 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}

@keyframes shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}
</style>
