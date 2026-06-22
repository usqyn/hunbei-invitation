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

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <text class="loading-text">{{ pageConfig.loadingText }}</text>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="loadError" class="error-state">
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

          <!-- 模板信息 -->
          <view class="template-info">
            <view class="template-header">
              <text class="template-name">{{ template.name }}</text>
              <view class="template-tag" :style="{ background: template.primaryColor || '#e84a6e' }">
                <text class="tag-text">{{ getCategoryName(template.category) }}</text>
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
import { API_BASE, TEMPLATE_PAGE_CONFIG } from '@/config'

const pageConfig = TEMPLATE_PAGE_CONFIG

// ============ API 配置（与 editor.ts 保持一致） ============

// 分类列表（静态配置，可根据 API 动态拉取）
const STATIC_CATEGORIES = [
  { id: 'wedding', name: '婚礼请柬', icon: '/static/images/categories/wedding.svg' },
  { id: 'birthday', name: '生日派对', icon: '/static/images/categories/birthday.svg' },
  { id: 'baby', name: '周岁宴', icon: '/static/images/categories/baby.jpg' },
  { id: 'graduation', name: '升学宴', icon: '/static/images/icons/party.svg' },
  { id: 'festival', name: '割礼', icon: '/static/images/categories/ceremony.svg' },
  { id: 'business', name: '耳环礼', icon: '/static/images/categories/earring.svg' },
]

// ============ 状态 ============
const categoryList = ref<TemplateCategory[]>([])
const allTemplates = ref<TemplateItem[]>([])
const activeCategory = ref<string>('wedding')
const searchKeyword = ref<string>('')
const loading = ref(false)
const loadError = ref(false)

// ============ 计算属性 ============
const filteredTemplates = computed<TemplateItem[]>(() => {
  let list = allTemplates.value

  // 按分类筛选
  if (activeCategory.value && activeCategory.value !== 'all') {
    list = list.filter(t => t.category === activeCategory.value)
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

  await loadCategories()
  await loadTemplates()
})

// ============ API 请求 ============
function request<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE}${url}`,
      timeout: 8000,
      success: (res: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject(new Error(res.data?.error || `请求失败: ${res.statusCode}`))
        }
      },
      fail: (err: any) => reject(new Error(err.errMsg || '网络请求失败')),
    })
  })
}

async function loadCategories() {
  try {
    const res: any = await request('/api/categories')
    if (res.success) {
      // 合并 API 返回的分类（含模板数量）与静态配置
      categoryList.value = res.data.map((cat: any) => {
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
    // API 失败则用静态分类
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
    const res: any = await request('/api/templates')
    if (res.success) {
      allTemplates.value = res.data || []
    }
  } catch (e) {
    console.error('加载模板列表失败:', e)
    loadError.value = true
  }

  // 对没有模板的分类，用本地模板数据填充
  categoryList.value = categoryList.value.map(cat => {
    let templates = allTemplates.value.filter(t => t.category === cat.id)
    if (templates.length === 0) {
      const localTemplates = TEMPLATE_LIST.filter(t => t.category === cat.id)
      templates = localTemplates
      allTemplates.value.push(...localTemplates)
    }
    return { ...cat, templates }
  })

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
  uni.navigateTo({
    url: `/pages/editor/index?templateId=${template.id}`,
  })
}

function getImageUrl(template: TemplateItem): string {
  if (!template.cover) {
    // 如果没有封面，用 data 里的 coverImage
    return (template as any).data?.coverImage || '/static/images/templates/wedding-1.svg'
  }
  // 如果是 http 链接（来自 API 的真实图片），直接使用
  if (template.cover.startsWith('http')) {
    return template.cover
  }
  return template.cover
}

function onImageError(e: any, template: TemplateItem) {
  // 图片加载失败时用默认图
  const target = e.target as any
  if (target) {
    target.src = '/static/images/templates/wedding-1.svg'
  }
}

function onBack() {
  uni.navigateBack()
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
