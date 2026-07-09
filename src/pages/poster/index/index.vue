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
            :src="template.cover_url"
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
import type { PosterTemplate } from '@/types'

// ============ 状态 ============
const categories = POSTER_CATEGORIES
const posterTemplates = ref<PosterTemplate[]>([])
const activeCategory = ref<string>('all')
const loading = ref(false)
const loadError = ref(false)

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
  loading.value = true
  loadError.value = false

  try {
    const url = activeCategory.value === 'all'
      ? '/api/poster/templates'
      : `/api/poster/templates?category=${activeCategory.value}`
    const data = await request<PosterTemplate[]>({ url, hideLoading: true })
    if (data && Array.isArray(data)) {
      posterTemplates.value = data
    }
  } catch (e) {
    console.error('加载海报模板列表失败:', e)
    loadError.value = true
  }

  loading.value = false
}

function onSelectCategory(catId: string) {
  if (activeCategory.value === catId) return
  activeCategory.value = catId
  loadPosterTemplates()
}

function onSelectTemplate(template: PosterTemplate) {
  uni.navigateTo({
    url: `/pages/poster/editor/index?id=${template.id}`,
  })
}

function formatLikes(num: number): string {
  if (!num) return '0'
  if (num >= 10000) return (num / 10000).toFixed(2) + 'w'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return String(num)
}

function onImageError(e: any, template: PosterTemplate) {
  template.cover_url = '/static/images/templates/wedding-1.svg'
}

function loadMore() {
  // 预留分页加载
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
    .category-name { color: #fff; }
  }
}

.category-name { font-size: 26rpx; color: #333; font-weight: 500; }

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
  height: 500rpx;
  background: #f5f5f5;
}

.template-info { padding: 20rpx; flex: 1; }

.template-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  line-height: 1.2;
  display: block;
  margin-bottom: 10rpx;
}

.template-footer { display: flex; align-items: center; }
.template-stats { font-size: 22rpx; color: #999; }

.template-select-btn {
  margin: 0 20rpx 20rpx;
  padding: 18rpx 0;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  border-radius: 40rpx;
  text-align: center;
}

.select-btn-text { font-size: 26rpx; color: #fff; font-weight: 500; }

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

.empty-text { font-size: 28rpx; color: #999; }

/* 底部 */
.page-bottom { padding: 60rpx 0 40rpx; text-align: center; }
.bottom-hint { font-size: 24rpx; color: #ccc; }
</style>
