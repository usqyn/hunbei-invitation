<template>
  <view class="preview-page">
    <view class="preview-header">
      <view class="header-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="header-title">{{ displayTitle }}</text>
      <view class="header-action" @click="handleMore">
        <text class="action-icon">⋯</text>
      </view>
    </view>

    <scroll-view class="preview-content" scroll-y>
      <!-- 画布模式：绝对定位渲染（与编辑器一致） -->
      <template v-if="isCanvasMode">
        <view class="preview-card preview-card--canvas" :style="canvasCardStyle">
          <view
            v-for="(el, idx) in editorStore.editableElements"
            :key="idx"
            class="preview-element"
            :class="{ 'preview-text': el.type === 'text', 'preview-image': el.type === 'image' }"
            :style="getCanvasElementStyle(el)"
          >
              <image
                v-if="el.type === 'image'"
                class="preview-image-el"
                :src="el.text"
                mode="aspectFit"
                @error="onImageError"
              />
            <text v-else-if="el.type === 'text'" class="preview-text-el" :style="getTextStyle(el)">{{ el.text }}</text>
          </view>
        </view>
      </template>
      <!-- Flex 模式：垂直排列（与编辑器一致） -->
      <template v-else>
        <view class="preview-card preview-card--flex">
          <view
            v-for="(el, idx) in editorStore.editableElements"
            :key="idx"
            class="preview-section"
            :class="{ 'preview-image-section': el.type === 'image', 'preview-text-section': el.type === 'text' }"
          >
            <image
              v-if="el.type === 'image'"
              class="preview-section-image"
              :src="el.text"
              mode="aspectFill"
              @error="onImageError"
            />
            <text
              v-else-if="el.type === 'text'"
              class="preview-section-text"
              :style="getTextStyle(el)"
            >{{ el.text }}</text>
          </view>
        </view>
      </template>

      <!-- 相似推荐 -->
      <view class="similar-section">
        <view class="similar-title-bar">
          <text class="similar-bar-text">相似推荐</text>
        </view>
        <view class="similar-list">
          <view class="similar-item" v-for="(item, idx) in similarTemplates" :key="idx">
            <view class="similar-image-wrap">
              <image class="similar-image" :src="item.image" mode="aspectFill" @error="onImageError"></image>
              <view class="similar-overlay">
                <text class="similar-title">{{ item.title }}</text>
                <text class="similar-sub">{{ item.subtitle }}</text>
              </view>
              <view class="similar-stats">
                <text class="similar-stat-icon">❤️</text>
                <text class="similar-stat-value">{{ item.likes }}人喜欢</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="preview-footer">
      <view class="create-button" @click="handleCreate">
        <text class="button-text">立即制作</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTemplateStore } from '@/stores/template'
import { useEditorStore } from '@/stores/editor'
import type { EditableElement } from '@/types'

const templateStore = useTemplateStore()
const editorStore = useEditorStore()

const displayTitle = computed(() => {
  const g = templateStore.basicInfo.groomName
  const b = templateStore.basicInfo.brideName
  if (g && b) return g + ' · ' + b
  if (g || b) return g || b
  return 'toy tamaxia'
})

onMounted(() => {
  const pages = getCurrentPages()
  const curPage = pages[pages.length - 1] as any
  const options = curPage?.options || {}
  if (options.templateId) {
    editorStore.loadTemplateById(options.templateId)
  }
})

// 画布模式检测：有元素且任一元素有完整定位数据（x/y/width/height）
const isCanvasMode = computed(() => {
  return editorStore.editableElements.length > 0 &&
    editorStore.editableElements.some(el => el.x != null && el.y != null && el.width != null && el.height != null)
})

const isLandscape = computed(() => {
  if (!isCanvasMode.value) return false
  const w = editorStore.canvasSize?.width || 375
  const h = editorStore.canvasSize?.height || 667
  return w > h
})

const canvasWidth = computed(() => editorStore.canvasSize?.width || 375)
const canvasHeight = computed(() => editorStore.canvasSize?.height || 667)

const canvasCardStyle = computed(() => {
  const w = canvasWidth.value
  const h = canvasHeight.value
  const isLand = w > h
  return {
    aspectRatio: `${w} / ${h}`,
    width: isLand ? '70%' : '100%',
    margin: isLand ? '0 auto' : '0',
  }
})

function getCanvasElementStyle(el: EditableElement) {
  if (el.x == null) return {}
  const isText = el.type === 'text'
  const style: Record<string, string> = {
    position: 'absolute',
    left: `${(el.x / canvasWidth.value) * 100}%`,
    top: `${(el.y! / canvasHeight.value) * 100}%`,
    width: `${(el.width! / canvasWidth.value) * 100}%`,
    zIndex: String(el.zIndex ?? 0),
    opacity: String(el.opacity ?? 1),
  }
  if (isText) {
    style.height = 'auto'
  } else {
    style.height = `${(el.height! / canvasHeight.value) * 100}%`
  }
  if (el.rotation) style.transform = `rotate(${el.rotation}deg)`
  return style
}

function getFontFamily(font: string | undefined) {
  if (!font) return 'sans-serif'
  return `"${font}", 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', sans-serif`
}

function getTextStyle(el: EditableElement) {
  const s = el.style
  if (!s) {
    return { fontSize: '30rpx', color: '#333333', lineHeight: 1.6, letterSpacing: '2rpx' }
  }
  return {
    fontSize: (s.fontSize || 28) + 'rpx',
    color: s.color,
    lineHeight: String(s.lineHeight || 1.6),
    letterSpacing: (s.spacing ?? 2) + 'rpx',
    fontFamily: getFontFamily(s.font),
    fontWeight: s.fontWeight || 'normal',
    textAlign: s.textAlign || 'center',
  }
}

const similarTemplates = ref([
  { title: '我们结婚啦', subtitle: 'Welcome to our wedding', likes: '52.86w', image: '/static/images/templates/wedding-1.svg' },
  { title: '浪漫婚礼', subtitle: 'FOREVER TOGETHER', likes: '48.12w', image: '/static/images/templates/wedding-2.svg' },
  { title: '圣洁婚礼', subtitle: 'HOLY MATRIMONY', likes: '35.76w', image: '/static/images/templates/wedding-3.svg' },
  { title: '喜结良缘', subtitle: 'HAPPY MARRIAGE', likes: '62.43w', image: '/static/images/templates/wedding-4.svg' },
])

const goBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.switchTab({ url: '/pages/index/index' })
  }
}

const handleShare = () => {
  uni.setClipboardData({
    data: 'https://www.hunbei.com/invitation/preview',
    success: () => uni.showToast({ title: '链接已复制', icon: 'success' }),
  })
}

const handleMore = () => {
  uni.showActionSheet({
    itemList: ['分享', '收藏'],
    success: (res: any) => {
      if (res.tapIndex === 0) handleShare()
      else uni.showToast({ title: '已收藏', icon: 'none' })
    },
  })
}

const handleCreate = () => {
  const templateId = editorStore.currentTemplateId
  if (templateId) {
    uni.navigateTo({ url: `/pages/editor/index?templateId=${templateId}` })
  } else {
    uni.navigateTo({ url: '/pages/editor/index' })
  }
}

const onImageError = () => {
  console.warn('Preview image load failed')
}
</script>

<style lang="scss" scoped>
.preview-page {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background: #fff;
  flex-shrink: 0;
}

.header-back {
  min-width: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 56rpx;
  color: #333;
  font-weight: 300;
  line-height: 1;
}

.header-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  text-align: center;
  flex: 1;
}

.header-action {
  min-width: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-icon {
  font-size: 36rpx;
  color: #666;
}

.preview-content {
  flex: 1;
  overflow: hidden;
}

/* 画布模式 */
.preview-card--canvas {
  display: block;
  padding: 0;
  position: relative;
  background: #fff;
  border-radius: 12rpx;
  overflow: hidden;
  margin: 24rpx auto;
}

.preview-element {
  display: block;
  overflow: hidden;
}

.preview-element.preview-text {
  max-height: 50%;
  overflow-y: auto;
}

.preview-image-el {
  width: 100%;
  height: 100%;
  display: block;
}

.preview-text-el {
  display: block;
  word-break: break-word;
}

/* Flex 模式 */
.preview-card {
  display: flex;
  flex-direction: column;
  padding: 24rpx 32rpx;
  gap: 20rpx;
}

.preview-image-section {
  border-radius: 12rpx;
  overflow: hidden;
}

.preview-section-image {
  width: 100%;
  min-height: 400rpx;
  aspect-ratio: 3 / 4;
  background: #f5f5f5;
}

.preview-text-section {
  padding: 20rpx;
  background: #fff;
  border-radius: 12rpx;
  text-align: center;
  min-height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-section-text {
  font-size: 30rpx;
  color: #333;
  line-height: 1.6;
}

/* 相似推荐 */
.similar-section {
  padding: 24rpx 32rpx;
}

.similar-title-bar {
  margin-bottom: 20rpx;
}

.similar-bar-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.similar-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.similar-item {
  width: 100%;
}

.similar-image-wrap {
  width: 100%;
  height: 500rpx;
  border-radius: 20rpx;
  overflow: hidden;
  position: relative;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.similar-image {
  width: 100%;
  height: 100%;
}

.similar-overlay {
  position: absolute;
  top: 60rpx;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.similar-title {
  font-size: 40rpx;
  color: #333;
  font-weight: bold;
  font-family: STKaiti, KaiTi, serif;
}

.similar-sub {
  font-size: 18rpx;
  color: #666;
  letter-spacing: 2rpx;
}

.similar-stats {
  position: absolute;
  bottom: 20rpx;
  left: 20rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: rgba(0, 0, 0, 0.4);
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
}

.similar-stat-icon { font-size: 20rpx; }

.similar-stat-value {
  font-size: 20rpx;
  color: #fff;
}

.preview-footer {
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2rpx 16rpx rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.create-button {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(232, 74, 110, 0.3);
}

.button-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
  letter-spacing: 4rpx;
}
</style>
