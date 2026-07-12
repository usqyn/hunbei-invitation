<template>
  <view class="page">
    <!-- 顶部标题栏 -->
    <view class="header">
      <view class="back-btn" @click="onBack">
        <text class="back-icon">‹</text>
      </view>
      <view class="header-title">{{ pageConfig.headerTitle }}</view>
      <view class="header-right"></view>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <text class="search-icon">🔍</text>
        <input
          class="search-input"
          type="text"
          v-model="searchKeyword"
          placeholder="搜索模板名称、分类或标签"
          placeholder-style="color:#bbbbbb"
          confirm-type="search"
        />
        <view v-if="searchKeyword" class="search-clear" @click="searchKeyword = ''">
          <text class="clear-icon">×</text>
        </view>
      </view>
    </view>

    <!-- 分类标签栏（横向滚动）-->
    <scroll-view class="category-scroll" scroll-x enable-flex>
      <view class="category-list">
        <view
          v-for="cat in categoryList"
          :key="cat.id"
          class="category-item"
          :class="{ active: activeCategory === cat.id }"
          @click="onSelectCategory(cat.id)"
        >
          <image class="category-icon-image" :src="cat.icon" mode="aspectFit" />
          <text class="category-name">{{ cat.name }}</text>
          <text class="category-count">{{ cat.count }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 筛选标签栏 -->
    <view class="filter-bar">
      <view
        v-for="filter in filters"
        :key="filter.value"
        class="filter-item"
        :class="{ active: activeFilter === filter.value }"
        @click="activeFilter = filter.value"
      >
        <text>{{ filter.label }}</text>
      </view>
    </view>

    <!-- 排序标签栏 -->
    <view class="sort-bar">
      <view
        v-for="sort in sortOptions"
        :key="sort.value"
        class="sort-item"
        :class="{ active: activeSort === sort.value }"
        @click="activeSort = sort.value"
      >
        <text>{{ sort.label }}</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <text class="loading-text">{{ pageConfig.loadingText }}</text>
    </view>

    <!-- 错误状态：API失败且无可用模板时才显示 -->
    <view v-else-if="loadError && filteredTemplates.length === 0" class="error-state" @click="loadTemplates">
      <image class="error-icon-image" :src="pageConfig.errorIcon" mode="aspectFit" />
      <text class="error-text">{{ pageConfig.errorText }}</text>
    </view>

    <!-- 模板列表网格 -->
    <scroll-view v-else class="template-scroll" scroll-y>
      <view v-if="filteredTemplates.length === 0" class="empty-state">
        <image class="empty-icon-image" :src="pageConfig.emptyIcon" mode="aspectFit" />
        <text class="empty-text">{{ pageConfig.emptyText }}</text>
      </view>

      <view class="template-grid">
        <view
          v-for="template in filteredTemplates"
          :key="template.id"
          class="template-card"
          @click="onSelectTemplate(template)"
        >
          <!-- 模板封面图 -->
          <image
            class="template-cover"
            :src="getImageUrl(template)"
            mode="aspectFill"
            lazy-load
            @error="onImageError($event, template)"
          ></image>

          <!-- 封面图上的渐变遮罩 -->
          <view class="cover-gradient"></view>

          <!-- 左上角标签组 -->
          <view class="tag-group">
            <view class="template-tag" :style="{ background: template.primaryColor || '#e84a6e' }">
              <text class="tag-text">{{ getCategoryName(template.category) }}</text>
            </view>
            <view v-if="template.orientation === 'landscape' || (template.canvasSize && template.canvasSize.width > template.canvasSize.height)" class="template-tag landscape-tag">
              <text class="tag-text">横版</text>
            </view>
          </view>

          <!-- 右上角价格/VIP标签 -->
          <view class="price-badge-group">
            <view v-if="template.is_paid && template.is_premium" class="vip-badge">
              <text class="vip-badge-text">VIP</text>
            </view>
            <view v-else-if="template.is_paid" class="price-tag">
              <text class="price-tag-text">¥{{ template.price }}</text>
            </view>
            <view v-else class="free-tag">
              <text class="free-tag-text">免费</text>
            </view>
          </view>

          <!-- 底部信息浮层 -->
          <view class="cover-info">
            <text class="cover-title">{{ template.name }}</text>
            <text class="cover-subtitle">{{ template.subtitle }}</text>
            <view class="cover-meta">
              <text class="meta-text">{{ template.pageCount }}页</text>
              <text class="meta-dot">·</text>
              <text class="meta-text">{{ formatLikes(template.likes) }}人喜欢</text>
            </view>
          </view>

          <!-- 悬浮制作按钮 -->
          <view class="template-select-btn">
            <text class="select-btn-text">立即制作</text>
          </view>
        </view>
      </view>

      <!-- 底部提示 -->
      <view class="page-bottom">
        <text class="bottom-hint">{{ pageConfig.bottomHint }}</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { TemplateItem, TemplateCategory } from '@/types'
import { TEMPLATE_LIST } from '@/constants/templates-data'
import { HOME_CATEGORIES } from '@/constants/categories'
import { TEMPLATE_PAGE_CONFIG } from '@/config'
import { request } from '@/utils/request'
import { useUserStore } from '@/stores/user'
import { useFeedback } from '@/composables/useFeedback'

const pageConfig = TEMPLATE_PAGE_CONFIG
const { haptic } = useFeedback()

const isPurchased = computed(() => {
  // TODO: 从用户订单状态获取真实购买状态
  return userStore.isVip()
})

// 分类列表（静态配置，可根据 API 动态拉取）
const STATIC_CATEGORIES = [
  { id: 'wedding', name: '婚礼请柬', icon: '/static/images/categories/wedding.jpg' },
  { id: 'proposal', name: '求婚', icon: '/static/images/categories/proposal.jpg' },
  { id: 'consultation-tea', name: '商量茶', icon: '/static/images/categories/consultation-tea.jpg' },
  { id: 'festival', name: '割礼', icon: '/static/images/categories/ceremony.jpg' },
  { id: 'business', name: '耳环礼', icon: '/static/images/categories/earring.jpg' },
  { id: 'baby', name: '周岁宴', icon: '/static/images/categories/baby.jpg' },
  { id: 'graduation', name: '升学宴', icon: '/static/images/categories/graduation.jpg' },
  { id: 'festival-invitation', name: '节日请柬', icon: '/static/images/categories/festival-invitation.jpg' },
  { id: 'housewarming', name: '乔迁', icon: '/static/images/categories/housewarming.jpg' },
]

// ============ 状态 ============
const categoryList = ref<TemplateCategory[]>([])
const allTemplates = ref<TemplateItem[]>([])
const activeCategory = ref<string>('wedding')
const searchKeyword = ref<string>('')
const loading = ref(false)
const loadError = ref(false)

const filters = [
  { label: '全部', value: 'all' },
  { label: '免费', value: 'free' },
  { label: '付费', value: 'paid' },
  { label: 'VIP免费', value: 'vip' },
]
const activeFilter = ref<string>('all')

const sortOptions = [
  { label: '热门', value: 'likes' },
  { label: '最新', value: 'date' },
]
const activeSort = ref<string>('likes')
const userStore = useUserStore()
const navigating = ref(false)

// ============ 计算属性 ============
const filteredTemplates = computed<TemplateItem[]>(() => {
  let list = allTemplates.value

  // 按分类筛选
  if (activeCategory.value && activeCategory.value !== 'all') {
    list = list.filter(t => t.category === activeCategory.value)
  }

  // 按付费状态筛选
  if (activeFilter.value === 'free') {
    list = list.filter(t => !t.is_paid || t.is_paid === 0 || t.is_paid === false)
  } else if (activeFilter.value === 'paid') {
    list = list.filter(t => t.is_paid === 1 || t.is_paid === true)
  } else if (activeFilter.value === 'vip') {
    list = list.filter((t: any) => t.is_paid === 1 && t.vip_free === true)
  }

  // 按关键词搜索（名称/副标题/分类名称/标签/元素内容）
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    list = list.filter(t => {
      // 名称
      if (t.name && t.name.toLowerCase().includes(kw)) return true
      // 副标题
      if (t.subtitle && t.subtitle.toLowerCase().includes(kw)) return true
      // 分类名称
      const cat = HOME_CATEGORIES.find(c => c.categoryId === t.category)
      if (cat && cat.name.toLowerCase().includes(kw)) return true
      // 标签
      if (t.tags && t.tags.some(tag => tag.toLowerCase().includes(kw))) return true
      // 元素内容（文字元素文本）
      if (t.elements && t.elements.some(el => el.text && el.text.toLowerCase().includes(kw))) return true
      return false
    })
  }

  // 排序
  const sorted = [...list]
  if (activeSort.value === 'likes') {
    sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0))
  } else if (activeSort.value === 'date') {
    sorted.sort((a, b) => {
      const ta = new Date((a as any).updatedAt || (a as any).createdAt || 0).getTime()
      const tb = new Date((b as any).updatedAt || (b as any).createdAt || 0).getTime()
      return tb - ta
    })
  }

  return sorted
})

// ============ 生命周期 ============
onMounted(async () => {
  const pages = getCurrentPages()
  const curPage = pages[pages.length - 1] as any
  const options = curPage?.options || {}

  if (options.category) {
    activeCategory.value = options.category
  }
  if (options.search) {
    searchKeyword.value = decodeURIComponent(options.search)
  }
  if (options.filter) {
    activeFilter.value = options.filter
  }

  await loadCategories()
  await loadTemplates()
})

async function loadCategories() {
  try {
    const data = await request<{ id: string; name: string; icon: string; count: number }[]>({ url: '/api/categories', hideLoading: true })
    if (data && Array.isArray(data)) {
      categoryList.value = data.map((cat: any) => {
        const staticCat = STATIC_CATEGORIES.find(s => s.id === cat.id)
        return {
          id: cat.id,
          name: staticCat?.name || cat.name,
          icon: staticCat?.icon || '/static/images/icons/document.svg',
          count: cat.count ?? 0,
          templates: allTemplates.value.filter(t => t.category === cat.id),
        }
      })
    }
  } catch (e) {
    console.warn('加载分类失败，使用静态分类:', e)
    categoryList.value = STATIC_CATEGORIES.map(cat => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      count: 0,
      templates: [],
    }))
  }
}

async function loadTemplates() {
  loading.value = true
  loadError.value = false

  try {
    const data = await request<TemplateItem[]>({ url: '/api/templates', hideLoading: true })
    if (data && Array.isArray(data)) {
      allTemplates.value = data
    }

    // 合并 API 模板 + 本地模板（不重复），深拷贝避免污染静态导入数据
    const existingIds = new Set(allTemplates.value.map(t => t.id))
    TEMPLATE_LIST.forEach(t => {
      if (!existingIds.has(t.id)) {
        allTemplates.value.push({ ...t })
        existingIds.add(t.id)
      }
    })
    categoryList.value = categoryList.value.map(cat => ({
      ...cat,
      templates: allTemplates.value.filter(t => t.category === cat.id),
    }))
  } catch (e) {
    console.error('加载模板列表失败:', e)
    loadError.value = true
  } finally {
    loading.value = false
  }
}

// ============ 方法 ============
function onSelectCategory(catId: string) {
  activeCategory.value = catId
}

function getCategoryName(categoryId: string): string {
  const cat = STATIC_CATEGORIES.find(c => c.id === categoryId)
  return cat?.name || categoryId
}

function formatLikes(num: number): string {
  if (!num) return '0'
  if (num >= 10000) return (num / 10000).toFixed(2) + 'w'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return String(num)
}

function onSelectTemplate(template: TemplateItem) {
  if (navigating.value) return
  // 登录拦截：未登录时跳转登录页
  if (!userStore.requireLogin()) return

  if (template.is_paid) {
    const isVip = userStore.isVip()
    if (!isVip && !isPurchased.value) {
      haptic('light')
      const price = template.price || 0
      uni.showActionSheet({
        itemList: [`单买 ${price}元`, '开通VIP免费使用'],
        success: (res) => {
          if (res.tapIndex === 0) {
            // 单买流程：跳转支付页
            uni.navigateTo({
              url: `/pages/vip/index?mode=purchase&templateId=${template.id}&price=${price}`,
            })
          } else if (res.tapIndex === 1) {
            // 开通VIP
            uni.navigateTo({
              url: '/pages/vip/index',
            })
          }
        },
      })
      return
    }
  }
  haptic('light')
  navigating.value = true
  uni.navigateTo({
    url: `/pages/editor/index?templateId=${template.id}`,
  })
}

function getImageUrl(template: TemplateItem): string {
  if (template.cover) return template.cover
  if ((template as any).data?.coverImage) return (template as any).data.coverImage
  // fallback: 用第一个图片元素作为封面
  const firstImg = template.elements?.find((e: any) => e.type === 'image')
  if (firstImg?.text) return firstImg.text
  return '/static/images/templates/wedding-1.svg'
}

function onImageError(e: any, template: TemplateItem) {
  template.cover = '/static/images/templates/wedding-1.svg'
}

function onBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.switchTab({ url: '/pages/index/index' })
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f2f2f7;
  display: flex;
  flex-direction: column;
}

/* 顶部标题栏 - 毛玻璃 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  padding-top: calc(env(safe-area-inset-top) + 20rpx);
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  box-shadow: 0 2rpx 20rpx rgba(0, 0, 0, 0.05);
  position: relative;
  z-index: 10;
}

.back-btn {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.25s ease, transform 0.25s ease;

  &:active {
    background: rgba(0, 0, 0, 0.05);
    transform: scale(0.9);
  }
}

.back-icon {
  font-size: 60rpx;
  color: #1a1a2e;
  font-weight: 300;
  line-height: 1;
}

.header-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #1a1a2e;
  flex: 1;
  text-align: center;
  letter-spacing: 1rpx;
}

.header-right { width: 80rpx; }

/* 搜索栏 */
.search-bar {
  padding: 16rpx 30rpx 20rpx;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.03);
}

.search-input-wrap {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 40rpx;
  padding: 14rpx 24rpx;
  border: 2rpx solid transparent;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:focus-within {
    background: #ffffff;
    border-color: rgba(232, 74, 110, 0.35);
    box-shadow: 0 6rpx 20rpx rgba(232, 74, 110, 0.14);

    .search-icon {
      opacity: 0.9;
    }
  }
}

.search-icon {
  font-size: 28rpx;
  margin-right: 14rpx;
  opacity: 0.55;
  transition: opacity 0.3s ease;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #1a1a2e;
  height: 44rpx;
  line-height: 44rpx;
}

.search-clear {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8rpx;
  border-radius: 50%;
  transition: background 0.2s ease, transform 0.2s ease;

  &:active {
    background: rgba(0, 0, 0, 0.06);
    transform: scale(0.9);
  }
}

.clear-icon {
  font-size: 36rpx;
  color: #9a9aa8;
  line-height: 1;
}

/* 分类标签栏 */
.category-scroll {
  width: 100%;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  padding: 20rpx 0;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.03);
  white-space: nowrap;
}

.category-list {
  display: inline-flex;
  padding: 0 20rpx;
  gap: 14rpx;
}

.category-item {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 16rpx 26rpx;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 50rpx;
  flex-shrink: 0;
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);

  &:active {
    transform: scale(0.95);
  }

  &.active {
    background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
    box-shadow: 0 8rpx 20rpx rgba(232, 74, 110, 0.32);

    .category-name,
    .category-count {
      color: #ffffff;
    }

    .category-icon-image {
      transform: scale(1.08);
    }
  }
}

.category-icon-image {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  transition: transform 0.35s ease;
}

.category-name {
  font-size: 26rpx;
  color: #1a1a2e;
  font-weight: 500;
  transition: color 0.3s ease;
}

.category-count {
  font-size: 22rpx;
  color: #6e6e80;
  background: rgba(0, 0, 0, 0.06);
  padding: 2rpx 12rpx;
  border-radius: 20rpx;
  transition: all 0.3s ease;
}

.category-item.active .category-count {
  background: rgba(255, 255, 255, 0.28);
  color: #ffffff;
}

/* 筛选标签栏 */
.filter-bar {
  display: flex;
  gap: 16rpx;
  padding: 20rpx 30rpx;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.03);
}

.filter-item {
  padding: 12rpx 28rpx;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 30rpx;
  font-size: 24rpx;
  color: #6e6e80;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

  &:active {
    transform: scale(0.94);
  }

  &.active {
    background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
    color: #ffffff;
    font-weight: 500;
    box-shadow: 0 6rpx 16rpx rgba(232, 74, 110, 0.3);
  }
}

/* 排序标签栏 */
.sort-bar {
  display: flex;
  gap: 16rpx;
  padding: 12rpx 30rpx 20rpx;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
}

.sort-item {
  padding: 8rpx 24rpx;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 24rpx;
  font-size: 24rpx;
  color: #6e6e80;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

  &:active {
    transform: scale(0.94);
  }

  &.active {
    background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
    color: #ffffff;
    font-weight: 500;
    box-shadow: 0 4rpx 12rpx rgba(232, 74, 110, 0.25);
  }
}

/* 状态视图 */
.loading-state,
.error-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}

/* 加载状态 - 骨架屏 */
.loading-state {
  justify-content: flex-start;
  padding: 30rpx;
  position: relative;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 30rpx;
    width: calc(50% - 45rpx);
    height: 460rpx;
    border-radius: 20rpx;
    background: linear-gradient(90deg, #e6e6ec 25%, #f4f4f8 37%, #e6e6ec 63%);
    background-size: 400% 100%;
    animation: template-skeleton-shimmer 1.4s ease infinite;
  }

  &::before { left: 30rpx; }
  &::after { right: 30rpx; }
}

.loading-text {
  margin-top: 500rpx;
  font-size: 26rpx;
  color: #6e6e80;
  letter-spacing: 2rpx;
}

/* 错误状态 */
.error-state {
  gap: 24rpx;
  padding: 60rpx 30rpx;

  .error-icon-image {
    width: 120rpx;
    height: 120rpx;
    padding: 28rpx;
    box-sizing: border-box;
    background: rgba(232, 74, 110, 0.08);
    border-radius: 50%;
  }

  .error-text {
    font-size: 28rpx;
    color: #6e6e80;
    padding: 16rpx 40rpx;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 100rpx;
    box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.06);
  }
}

/* 模板网格 */
.template-scroll {
  flex: 1;
  height: 0;
}

.template-grid {
  padding: 24rpx 24rpx 0;
  display: flex;
  flex-wrap: wrap;
}

.template-card {
  width: calc(50% - 12rpx);
  margin-bottom: 24rpx;
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 32rpx rgba(20, 20, 40, 0.08);
  display: flex;
  flex-direction: column;
  position: relative;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;

  &:active {
    transform: translateY(-6rpx) scale(0.98);
    box-shadow: 0 16rpx 40rpx rgba(232, 74, 110, 0.18);
  }

  &:nth-child(odd) {
    margin-right: 24rpx;
  }
}

/* 封面图 */
.template-cover {
  width: 100%;
  height: 420rpx;
  background: linear-gradient(135deg, #f0f0f5 0%, #e8e8f0 100%);
  display: block;
}

/* 渐变遮罩 - 底部到顶部 */
.cover-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 420rpx;
  background: linear-gradient(to bottom,
    rgba(0, 0, 0, 0.18) 0%,
    rgba(0, 0, 0, 0) 25%,
    rgba(0, 0, 0, 0) 50%,
    rgba(0, 0, 0, 0.5) 80%,
    rgba(0, 0, 0, 0.75) 100%);
  pointer-events: none;
  z-index: 1;
}

/* 左上角标签组 */
.tag-group {
  position: absolute;
  top: 20rpx;
  left: 20rpx;
  display: flex;
  gap: 8rpx;
  z-index: 2;
}

.template-tag {
  padding: 8rpx 18rpx;
  border-radius: 10rpx;
  flex-shrink: 0;
  backdrop-filter: blur(12rpx);
  -webkit-backdrop-filter: blur(12rpx);
  background: rgba(232, 74, 110, 0.85);
  box-shadow: 0 4rpx 14rpx rgba(0, 0, 0, 0.15);
  border: 1rpx solid rgba(255, 255, 255, 0.2);
}

.template-tag.landscape-tag {
  background: rgba(142, 36, 170, 0.85) !important;
}

.tag-text {
  font-size: 20rpx;
  color: #ffffff;
  font-weight: 600;
  letter-spacing: 1rpx;
}

/* 右上角价格/VIP标签 */
.price-badge-group {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  z-index: 2;
}

.price-tag {
  background: linear-gradient(135deg, #ff7a5c 0%, #e84a6e 55%, #c93660 100%);
  padding: 8rpx 20rpx;
  border-radius: 100rpx;
  box-shadow: 0 6rpx 18rpx rgba(192, 54, 96, 0.45);
  border: 1rpx solid rgba(255, 255, 255, 0.25);
}

.price-tag-text {
  font-size: 22rpx;
  color: #ffffff;
  font-weight: 700;
  letter-spacing: 1rpx;
}

.vip-badge {
  background: linear-gradient(135deg, #ffd700 0%, #ffb700 50%, #ff9f00 100%);
  padding: 8rpx 20rpx;
  border-radius: 100rpx;
  box-shadow: 0 6rpx 18rpx rgba(255, 183, 0, 0.45);
  border: 1rpx solid rgba(255, 255, 255, 0.3);
}

.vip-badge-text {
  font-size: 20rpx;
  color: #5a3500;
  font-weight: 800;
  letter-spacing: 2rpx;
}

.free-tag {
  background: rgba(76, 175, 80, 0.9);
  padding: 8rpx 18rpx;
  border-radius: 100rpx;
  backdrop-filter: blur(12rpx);
  -webkit-backdrop-filter: blur(12rpx);
  box-shadow: 0 4rpx 14rpx rgba(76, 175, 80, 0.3);
  border: 1rpx solid rgba(255, 255, 255, 0.2);
}

.free-tag-text {
  font-size: 20rpx;
  color: #ffffff;
  font-weight: 600;
}

/* 底部信息浮层 - 叠加在封面图上 */
.cover-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 20rpx 20rpx;
  z-index: 2;
}

.cover-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.3;
  display: block;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cover-subtitle {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.4;
  margin-top: 4rpx;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cover-meta {
  display: flex;
  align-items: center;
  margin-top: 8rpx;
}

.meta-text {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.7);
}

.meta-dot {
  margin: 0 8rpx;
  color: rgba(255, 255, 255, 0.4);
}

/* 制作按钮 */
.template-select-btn {
  margin: 0 20rpx 20rpx;
  padding: 20rpx 0;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  border-radius: 44rpx;
  text-align: center;
  box-shadow: 0 8rpx 22rpx rgba(232, 74, 110, 0.32);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:active {
    transform: scale(0.95);
    box-shadow: 0 4rpx 12rpx rgba(232, 74, 110, 0.24);
  }
}

.select-btn-text {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 600;
  letter-spacing: 3rpx;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 30rpx;
}

.empty-icon-image {
  width: 80rpx;
  height: 80rpx;
  margin-bottom: 20rpx;
  opacity: 0.6;
}

.empty-text {
  font-size: 28rpx;
  color: #6e6e80;
}

/* 底部 */
.page-bottom { padding: 60rpx 0 40rpx; text-align: center; }
.bottom-hint { font-size: 24rpx; color: #a8a8b4; }

@keyframes template-skeleton-shimmer {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}
</style>
