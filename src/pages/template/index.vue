<template>
  <view class="page">
    <!-- 顶部标题栏 -->
    <view class="header">
      <view class="back-btn" @click="onBack">
        <text class="back-icon">‹</text>
      </view>
      <view class="header-title">选择模板</view>
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
          <text class="category-icon">{{ cat.icon }}</text>
          <text class="category-name">{{ cat.name }}</text>
          <text class="category-count">{{ cat.templates.length }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 模板列表网格 -->
    <scroll-view class="template-scroll" scroll-y>
      <view v-if="filteredTemplates.length === 0" class="empty-state">
        <text class="empty-icon">📄</text>
        <text class="empty-text">该分类暂无模板</text>
      </view>

      <view class="template-grid">
        <view
          v-for="template in filteredTemplates"
          :key="template.id"
          class="template-card"
          @click="onSelectTemplate(template)"
        >
          <!-- 模板封面图 -->
          <image class="template-cover" :src="template.cover" mode="aspectFill" @error="onImageError"></image>

          <!-- 模板信息 -->
          <view class="template-info">
            <view class="template-header">
              <text class="template-name">{{ template.name }}</text>
              <view class="template-tag" :style="{ background: template.primaryColor }">
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
            <text class="select-btn-text">立即制作</text>
          </view>
        </view>
      </view>

      <!-- 底部提示 -->
      <view class="page-bottom">
        <text class="bottom-hint">— 更多模板持续更新中 —</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { CATEGORY_LIST, TEMPLATE_LIST } from '@/constants/templates'
import type { TemplateItem } from '@/types'

// 从模板系统获取分类数据
const categoryList = ref(CATEGORY_LIST)

// 当前选中的分类 - 默认第一个
const activeCategory = ref<string>(CATEGORY_LIST[0]?.id || 'wedding')

// 根据分类筛选模板 - 同时支持搜索
const searchKeyword = ref<string>('')

const filteredTemplates = computed<TemplateItem[]>(() => {
  let list = TEMPLATE_LIST

  // 按分类筛选
  if (activeCategory.value && activeCategory.value !== 'all') {
    list = list.filter(t => t.category === activeCategory.value)
  }

  // 按关键词搜索（名称和副标题）
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    list = list.filter(t =>
      t.name.toLowerCase().includes(kw) ||
      t.subtitle.toLowerCase().includes(kw)
    )
  }

  return list
})

// 根据分类ID获取分类名称
function getCategoryName(categoryId: string): string {
  const cat = categoryList.value.find(c => c.id === categoryId)
  return cat ? cat.name : ''
}

// 选择分类（切换到该分类下的模板列表）
function onSelectCategory(catId: string) {
  activeCategory.value = catId
}

// 格式化点赞数：将大数字转为带单位的形式（如 1.2w）
function formatLikes(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(2) + 'w'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return String(num)
}

// 选择模板 - 跳转到编辑器并传递模板ID
function onSelectTemplate(template: TemplateItem) {
  uni.navigateTo({
    url: `/pages/editor/index?templateId=${template.id}`,
  })
}

// 图片加载失败处理
function onImageError() {
  console.warn('Template cover image load failed')
}

// 返回上一页
function onBack() {
  uni.navigateBack()
}

// 页面加载时从URL参数初始化：
// - category: 跳转到对应分类（如从首页分类卡片点击进入）
// - search: 搜索关键词（如从首页搜索框进入）
onMounted(() => {
  const pages = getCurrentPages()
  const curPage = pages[pages.length - 1] as any
  const options = curPage?.options || {}

  if (options.category) {
    activeCategory.value = options.category
  }

  if (options.search) {
    searchKeyword.value = decodeURIComponent(options.search)
  }
})
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

.header-right {
  width: 80rpx;
}

/* 分类标签栏（横向滚动） */
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

    .category-name, .category-count, .category-icon {
      color: #fff;
    }
  }
}

.category-icon {
  font-size: 32rpx;
  color: #333;
}

.category-name {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}

.category-count {
  font-size: 22rpx;
  color: #999;
  background: rgba(0, 0, 0, 0.05);
  padding: 2rpx 10rpx;
  border-radius: 20rpx;

  .active & {
    background: rgba(255, 255, 255, 0.3);
  }
}

/* 模板列表网格（纵向滚动） */
.template-scroll {
  flex: 1;
  height: 0;
}

.template-grid {
  padding: 30rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 30rpx;
}

/* 模板卡片 */
.template-card {
  width: calc(50% - 15rpx);
  background: #ffffff;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease;

  &:active {
    transform: scale(0.98);
  }
}

.template-cover {
  width: 100%;
  height: 400rpx;
  background: #f5f5f5;
}

.template-info {
  padding: 20rpx;
  flex: 1;
}

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

.tag-text {
  font-size: 20rpx;
  color: #fff;
  font-weight: 500;
}

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

.template-footer {
  display: flex;
  align-items: center;
}

.template-stats {
  font-size: 22rpx;
  color: #999;
}

.template-divider {
  margin: 0 10rpx;
  color: #ddd;
  font-size: 22rpx;
}

.template-select-btn {
  margin: 0 20rpx 20rpx;
  padding: 18rpx 0;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  border-radius: 40rpx;
  text-align: center;
}

.select-btn-text {
  font-size: 26rpx;
  color: #fff;
  font-weight: 500;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 30rpx;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

/* 底部 */
.page-bottom {
  padding: 60rpx 0 40rpx;
  text-align: center;
}

.bottom-hint {
  font-size: 24rpx;
  color: #ccc;
}
</style>
