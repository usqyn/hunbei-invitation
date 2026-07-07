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

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <text class="loading-text">{{ pageConfig.loadingText }}</text>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="loadError" class="error-state" @click="loadTemplates">
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
            @error="onImageError($event, template)"
          ></image>
          <view v-if="template.is_paid" class="price-tag">
            <text>{{ template.price }}元</text>
          </view>

          <!-- 模板信息 -->
          <view class="template-info">
            <view class="template-header">
              <text class="template-name">{{ template.name }}</text>
              <view class="template-tag" :style="{ background: template.primaryColor || '#e84a6e' }">
                <text class="tag-text">{{ getCategoryName(template.category) }}</text>
              </view>
              <view v-if="template.orientation === 'landscape' || (template.canvasSize && template.canvasSize.width > template.canvasSize.height)" class="template-tag landscape-tag">
                <text class="tag-text">横版</text>
              </view>
            </view>
            <text class="template-subtitle">{{ template.subtitle }}</text>
            <view class="template-footer">
              <text class="template-stats">{{ template.pageCount }}页</text>
              <text class="template-divider">·</text>
              <text class="template-stats">{{ formatLikes(template.likes) }}人喜欢</text>
            </view>
          </view>

          <!-- 立即制作按钮 -->
          <view class="template-select-btn">
            <text class="select-btn-text">{{ pageConfig.selectBtnText }}</text>
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

const pageConfig = TEMPLATE_PAGE_CONFIG

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
    list = list.filter(t => t.is_paid === 1 || t.is_paid === true)
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

  return list
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
  } catch (e) {
    console.error('加载模板列表失败:', e)
    loadError.value = true
  }

  // 合并 API 模板 + 本地模板（不重复）
  const existingIds = new Set(allTemplates.value.map(t => t.id))
  TEMPLATE_LIST.forEach(t => {
    if (!existingIds.has(t.id)) {
      allTemplates.value.push(t)
      existingIds.add(t.id)
    }
  })
  categoryList.value = categoryList.value.map(cat => ({
    ...cat,
    templates: allTemplates.value.filter(t => t.category === cat.id),
  }))

  loading.value = false
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
  if (template.is_paid) {
    const isVip = false // TODO: 从用户状态获取
    const isPurchased = false // TODO: 从用户状态获取
    if (!isVip && !isPurchased) {
      uni.showModal({
        title: '付费模板',
        content: `该模板需要支付 ${template.price || 0} 元，或开通VIP免费使用`,
        confirmText: '去购买',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            uni.navigateTo({
              url: '/pages/vip/index',
            })
          }
        },
      })
      return
    }
  }
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
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

/* 顶部标题栏 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  background: #ffffff;
  border-bottom: 2rpx solid #f0f0f0;
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

.header-right { width: 80rpx; }

/* 分类标签栏 */
.category-scroll {
  width: 100%;
  background: #ffffff;
  padding: 20rpx 0;
  border-bottom: 2rpx solid #f0f0f0;
  white-space: nowrap;
}

.category-list {
  display: inline-flex;
  padding: 0 20rpx;
  gap: 12rpx;
}

.category-item {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 16rpx 24rpx;
  background: #f5f5f5;
  border-radius: 50rpx;
  flex-shrink: 0;

  &.active {
    background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
    .category-name, .category-count, .category-icon { color: #fff; }
  }
}

.category-icon-image { width: 32rpx; height: 32rpx; }
.category-name { font-size: 26rpx; color: #333; font-weight: 500; }

.category-count {
  font-size: 22rpx;
  color: #999;
  background: rgba(0, 0, 0, 0.05);
  padding: 2rpx 10rpx;
  border-radius: 20rpx;
  .active & { background: rgba(255, 255, 255, 0.3); }
}

/* 状态视图 */
.loading-state, .error-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}

.error-state {
}

.loading-text { font-size: 28rpx; color: #999; }
.error-icon-image { width: 64rpx; height: 64rpx; }
.error-text { font-size: 28rpx; color: #999; }

/* 模板网格 */
.template-scroll {
  flex: 1;
  height: 0;
}

.template-grid {
  padding: 30rpx 30rpx 0;
  display: flex;
  flex-wrap: wrap;
}

.template-card {
  width: calc(50% - 15rpx);
  margin-bottom: 30rpx;
  background: #ffffff;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  position: relative;
  &:active { opacity: 0.9; }
  &:nth-child(odd) { margin-right: 30rpx; }
}

.template-cover {
  width: 100%;
  height: 400rpx;
  background: #f5f5f5;
}

.template-info { padding: 20rpx; flex: 1; }

.template-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10rpx;
}

.template-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  line-height: 1.2;
}

.template-tag {
  padding: 6rpx 14rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
}

.template-tag.landscape-tag {
  background: #8e24aa !important;
}

.tag-text { font-size: 20rpx; color: #fff; font-weight: 500; }

.template-subtitle {
  font-size: 22rpx;
  color: #999;
  line-height: 1.4;
  margin-bottom: 16rpx;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.template-footer { display: flex; align-items: center; }
.template-stats { font-size: 22rpx; color: #999; }
.template-divider { margin: 0 10rpx; color: #ddd; }

.template-select-btn {
  margin: 0 20rpx 20rpx;
  padding: 18rpx 0;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  border-radius: 40rpx;
  text-align: center;
}

.select-btn-text { font-size: 26rpx; color: #fff; font-weight: 500; }

/* 筛选标签栏 */
.filter-bar {
  display: flex;
  gap: 16rpx;
  padding: 20rpx 30rpx;
  background: #ffffff;
  border-bottom: 2rpx solid #f0f0f0;
}

.filter-item {
  padding: 10rpx 24rpx;
  background: #f5f5f5;
  border-radius: 30rpx;
  font-size: 24rpx;
  color: #666;

  &.active {
    background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
    color: #fff;
    font-weight: 500;
  }
}

/* 价格标签 */
.price-tag {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  color: #fff;
  font-size: 22rpx;
  font-weight: 600;
  padding: 6rpx 14rpx;
  border-radius: 12rpx;
  z-index: 1;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 30rpx;
}

.empty-icon-image { width: 80rpx; height: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; }

/* 底部 */
.page-bottom { padding: 60rpx 0 40rpx; text-align: center; }
.bottom-hint { font-size: 24rpx; color: #ccc; }
</style>
