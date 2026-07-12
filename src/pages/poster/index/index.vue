<template>
  <view class="page">
    <!-- 顶部标题栏 -->
    <view class="header">
      <view class="back-btn" @click="onBack">
        <text class="back-icon">‹</text>
      </view>
      <view class="header-title">海报模板</view>
      <view class="header-right"></view>
    </view>

    <!-- 分类标签栏（横向滚动） -->
    <scroll-view class="category-scroll" scroll-x enable-flex>
      <view class="category-list">
        <view
          v-for="cat in categories"
          :key="cat.id"
          class="category-item"
          :class="{ active: activeCategory === cat.id }"
          @click="onSelectCategory(cat.id)"
        >
          <text class="category-name">{{ cat.name }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="loadError" class="error-state" @click="loadPosterTemplates">
      <text class="error-text">加载失败，点击重试</text>
    </view>

    <!-- 模板列表网格 -->
    <scroll-view v-else class="template-scroll" scroll-y @scrolltolower="loadMore">
      <view v-if="posterTemplates.length === 0" class="empty-state">
        <text class="empty-text">该分类暂无海报模板</text>
      </view>

      <view class="template-grid">
        <view
          v-for="template in posterTemplates"
          :key="template.id"
          class="template-card"
          @click="onSelectTemplate(template)"
        >
          <!-- 模板封面图 -->
          <image
            class="template-cover"
            :src="resolveUrl(template.cover_url)"
            mode="aspectFill"
            @error="onImageError($event, template)"
          ></image>

          <!-- 付费/VIP 标签 -->
          <view v-if="!template.is_free" class="price-tag">
            <text>{{ template.is_vip ? 'VIP' : '付费' }}</text>
          </view>

          <!-- 模板信息 -->
          <view class="template-info">
            <text class="template-name">{{ template.name }}</text>
            <view class="template-footer">
              <text class="template-stats">{{ formatLikes(template.like_count) }}人喜欢</text>
            </view>
          </view>

          <!-- 立即制作按钮 -->
          <view class="template-select-btn">
            <text class="select-btn-text">立即制作</text>
          </view>
        </view>
      </view>

      <!-- 底部提示 -->
      <view class="page-bottom">
        <text class="bottom-hint">— 更多海报模板持续更新中 —</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { POSTER_CATEGORIES } from '@/constants/categories'
import { request } from '@/utils/request'
import { resolveUrl } from '@/utils/url'
import { useUserStore } from '@/stores/user'
import type { PosterTemplate } from '@/types'

const userStore = useUserStore()

// ============ 状态 ============
const PAGE_SIZE = 20
const categories = POSTER_CATEGORIES
const posterTemplates = ref<PosterTemplate[]>([])
const activeCategory = ref<string>('all')
const loading = ref(false)
const loadError = ref(false)
// 分页加载状态
const currentPage = ref(1)
const hasMore = ref(true)
const loadingMore = ref(false)
// 分类切换请求计数器，用于丢弃过期响应
let categoryReqId = 0

// ============ 生命周期 ============
onMounted(async () => {
  const pages = getCurrentPages()
  const curPage = pages[pages.length - 1] as any
  const options = curPage?.options || {}

  if (options.category) {
    activeCategory.value = options.category
  }

  await loadPosterTemplates()
})

// ============ 方法 ============
async function loadPosterTemplates() {
  const reqId = ++categoryReqId
  loading.value = true
  loadError.value = false
  // 重置分页状态
  currentPage.value = 1
  hasMore.value = true
  loadingMore.value = false

  try {
    const data = await request<PosterTemplate[]>({
      url: '/api/poster/templates',
      data: {
        page: 1,
        limit: PAGE_SIZE,
        ...(activeCategory.value !== 'all' ? { category_id: activeCategory.value } : {}),
      },
      hideLoading: true,
    })
    // 如果已有更新的请求发出，丢弃当前过期响应
    if (reqId !== categoryReqId) return
    if (data && Array.isArray(data)) {
      posterTemplates.value = data
      // 返回不足一页说明已无更多数据
      hasMore.value = data.length >= PAGE_SIZE
    }
  } catch (e) {
    if (reqId !== categoryReqId) return
    console.error('加载海报模板列表失败:', e)
    loadError.value = true
  }

  if (reqId === categoryReqId) {
    loading.value = false
  }
}

function onSelectCategory(catId: string) {
  if (activeCategory.value === catId) return
  activeCategory.value = catId
  // 切换分类时显示 loading 覆盖层
  loadPosterTemplates()
}

function onSelectTemplate(template: PosterTemplate) {
  if (!userStore.requireLogin()) return
  if (!template.is_free) {
    if (template.is_vip && !userStore.isVip()) {
      uni.showModal({
        title: 'VIP 专属',
        content: '该模板为 VIP 专属模板，开通 VIP 即可使用',
        confirmText: '去开通',
        success: (res) => {
          if (res.confirm) {
            uni.navigateTo({ url: '/pages/vip/index' })
          }
        },
      })
      return
    }
    if (!template.is_vip) {
      uni.showModal({
        title: '付费模板',
        content: '该模板需要付费后才能使用',
        confirmText: '去了解',
        success: (res) => {
          if (res.confirm) {
            uni.navigateTo({ url: '/pages/vip/index' })
          }
        },
      })
      return
    }
  }
  uni.navigateTo({
    url: `/pages/poster/editor/index?id=${template.id}`,
  })
}

function formatLikes(num: number | undefined): string {
  if (!num || num <= 0) return '0'
  if (num >= 10000) return (num / 10000).toFixed(2) + 'w'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return String(num)
}

function onImageError(e: any, template: PosterTemplate) {
  const idx = posterTemplates.value.findIndex(t => t.id === template.id)
  if (idx >= 0) {
    posterTemplates.value[idx] = { ...posterTemplates.value[idx], cover_url: '/static/images/templates/wedding-1.svg' }
  }
}

async function loadMore() {
  // 防止重复触发：加载中 / 首屏加载中 / 无更多数据时直接返回
  if (loadingMore.value || loading.value || !hasMore.value) return
  loadingMore.value = true

  try {
    const nextPage = currentPage.value + 1
    const data = await request<PosterTemplate[]>({
      url: '/api/poster/templates',
      data: {
        page: nextPage,
        limit: PAGE_SIZE,
        ...(activeCategory.value !== 'all' ? { category_id: activeCategory.value } : {}),
      },
      hideLoading: true,
    })
    if (data && Array.isArray(data) && data.length) {
      // 追加到列表，按 id 去重避免重复
      const existingIds = new Set(posterTemplates.value.map(t => t.id))
      const appended = data.filter(t => !existingIds.has(t.id))
      posterTemplates.value.push(...appended)
      currentPage.value = nextPage
      hasMore.value = data.length >= PAGE_SIZE
    } else {
      // 后端未返回数据，视为无更多
      hasMore.value = false
    }
  } catch (e) {
    console.error('加载更多海报模板失败:', e)
  } finally {
    loadingMore.value = false
  }
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

/* 顶部标题栏 - 毛玻璃效果 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.04);
}

.back-btn {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.25s ease;
  &:active {
    background: rgba(0, 0, 0, 0.06);
    transform: scale(0.9);
  }
}

.back-icon {
  font-size: 60rpx;
  color: #1a1a2e;
  font-weight: 300;
}

.header-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #1a1a2e;
  flex: 1;
  text-align: center;
  letter-spacing: 2rpx;
}

.header-right { width: 80rpx; }

/* 分类标签栏 - 毛玻璃效果 */
.category-scroll {
  width: 100%;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  padding: 20rpx 0;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.04);
  white-space: nowrap;
}

.category-list {
  display: inline-flex;
  padding: 0 20rpx;
  gap: 16rpx;
}

.category-item {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 16rpx 28rpx;
  background: rgba(118, 118, 128, 0.1);
  border-radius: 50rpx;
  flex-shrink: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  &:active {
    transform: scale(0.94);
    background: rgba(118, 118, 128, 0.18);
  }
  &.active {
    background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
    box-shadow: 0 6rpx 18rpx rgba(232, 74, 110, 0.32);
    .category-name { color: #fff; }
  }
}

.category-name {
  font-size: 26rpx;
  color: #6e6e80;
  font-weight: 500;
  transition: color 0.3s ease;
}

/* 状态视图 - 骨架屏 */
.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 30rpx;
  padding: 30rpx;
  &::before {
    content: '';
    width: 100%;
    height: 460rpx;
    border-radius: 28rpx;
    background: linear-gradient(90deg, #e4e4ea 25%, #f0f0f5 50%, #e4e4ea 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s ease-in-out infinite;
  }
}

.loading-text {
  font-size: 28rpx;
  color: #6e6e80;
  animation: pulse 1.4s ease-in-out infinite;
}

.error-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  transition: all 0.25s ease;
  &:active { opacity: 0.7; }
}

.error-text {
  font-size: 28rpx;
  color: #6e6e80;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

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
  border-radius: 28rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 30rpx rgba(60, 60, 80, 0.08), 0 2rpx 8rpx rgba(60, 60, 80, 0.04);
  display: flex;
  flex-direction: column;
  position: relative;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease;
  &:active {
    transform: translateY(-6rpx) scale(0.99);
    box-shadow: 0 16rpx 44rpx rgba(60, 60, 80, 0.14), 0 4rpx 12rpx rgba(60, 60, 80, 0.06);
  }
  &:nth-child(odd) { margin-right: 30rpx; }
  /* 封面图底部渐变遮罩 */
  &::after {
    content: '';
    position: absolute;
    top: 370rpx;
    left: 0;
    right: 0;
    height: 130rpx;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.32), transparent);
    pointer-events: none;
    z-index: 1;
  }
}

.template-cover {
  width: 100%;
  height: 500rpx;
  background: #ececf2;
}

.template-info { padding: 22rpx; flex: 1; }

.template-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a2e;
  line-height: 1.3;
  display: block;
  margin-bottom: 10rpx;
}

.template-footer { display: flex; align-items: center; }
.template-stats { font-size: 22rpx; color: #6e6e80; }

.template-select-btn {
  margin: 0 22rpx 22rpx;
  padding: 20rpx 0;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  border-radius: 44rpx;
  text-align: center;
  box-shadow: 0 8rpx 20rpx rgba(232, 74, 110, 0.3);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  &:active {
    transform: scale(0.95);
    box-shadow: 0 4rpx 12rpx rgba(232, 74, 110, 0.24);
  }
}

.select-btn-text {
  font-size: 26rpx;
  color: #fff;
  font-weight: 600;
  letter-spacing: 2rpx;
}

/* 价格标签 */
.price-tag {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  color: #fff;
  font-size: 22rpx;
  font-weight: 600;
  padding: 8rpx 18rpx;
  border-radius: 20rpx;
  z-index: 2;
  box-shadow: 0 4rpx 12rpx rgba(232, 74, 110, 0.36);
  letter-spacing: 1rpx;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 30rpx;
}

.empty-text { font-size: 28rpx; color: #6e6e80; }

/* 底部 */
.page-bottom { padding: 60rpx 0 40rpx; text-align: center; }
.bottom-hint { font-size: 24rpx; color: #aeaeb2; letter-spacing: 2rpx; }
</style>
