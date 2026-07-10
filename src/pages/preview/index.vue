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
      <!-- Flip 翻页模式：左右滑动翻页 -->
      <template v-if="editorStore.templateType === 'flip'">
        <view class="flip-preview-wrap">
          <swiper
            class="flip-swiper"
            :indicator-dots="true"
            indicator-color="rgba(255,255,255,0.4)"
            indicator-active-color="#ffffff"
            :circular="false"
            @change="onFlipPageChange"
          >
            <swiper-item v-for="(page, idx) in editorStore.flipPages" :key="page.id">
              <view class="flip-page-card" :style="getFlipPageBgStyle(page)">
                <view
                  v-for="(el, eIdx) in page.elements"
                  :key="eIdx"
                  class="flip-page-element"
                  :class="{ 'flip-text': el.type === 'text', 'flip-image': el.type === 'image' }"
                  :style="getFlipElementStyle(el)"
                >
                  <image
                    v-if="el.type === 'image'"
                    class="flip-image-el"
                    :src="el.text"
                    mode="aspectFit"
                    @error="onImageError"
                  />
                  <text v-else-if="el.type === 'text'" class="flip-text-el" :style="getFlipTextStyle(el)">{{ resolveText(el.text) }}</text>
                </view>
              </view>
            </swiper-item>
          </swiper>
        </view>
      </template>
      <view v-else class="preview-zoom-wrap" :style="zoomStyle" @touchstart="onZoomTouchStart" @touchmove="onZoomTouchMove" @touchend="onZoomTouchEnd">
      <!-- Page 模式：垂直滚动区块渲染 -->
      <template v-if="editorStore.templateType === 'page'">
        <view class="preview-card preview-card--page" :style="canvasBackgroundStyle">
          <view
            v-for="(sec, idx) in editorStore.pageSections"
            :key="sec.id"
            class="preview-page-section"
            :class="`preview-page-section--${sec.type}`"
          >
            <template v-if="sec.type === 'title'">
              <text class="section-title" :style="getTextStyle({ type: 'text', text: sec.text || '', style: sec.style } as any)">{{ sec.text || sec.placeholder || '请输入标题' }}</text>
            </template>
            <template v-else-if="sec.type === 'date'">
              <text class="section-date" :style="getTextStyle({ type: 'text', text: sec.text || '', style: sec.style } as any)">{{ sec.text || sec.placeholder || 'YYYY/MM/DD' }}</text>
            </template>
            <template v-else-if="sec.type === 'image'">
              <image
                class="section-image"
                :src="sec.image || ''"
                mode="aspectFit"
                @error="onImageError"
              />
            </template>
            <template v-else-if="sec.type === 'text'">
              <text class="section-text" :style="getTextStyle({ type: 'text', text: sec.text || '', style: sec.style } as any)">{{ sec.text || sec.placeholder || '请输入正文内容' }}</text>
            </template>
            <template v-else-if="sec.type === 'location'">
              <view class="location-row">
                <text class="location-icon">📍</text>
                <text class="location-text" :style="getTextStyle({ type: 'text', text: sec.text || '', style: sec.style } as any)">{{ sec.text || sec.placeholder || '请输入地址' }}</text>
              </view>
            </template>
            <template v-else-if="sec.type === 'divider'">
              <view class="divider-line">
                <text class="divider-text">{{ sec.text }}</text>
              </view>
            </template>
            <template v-else-if="sec.type === 'countdown'">
              <view class="countdown-section">
                <text class="countdown-label">距婚礼还有</text>
                <view class="countdown-days">{{ sec.text || '0' }}</view>
                <text class="countdown-unit">天</text>
              </view>
            </template>
          </view>
        </view>
      </template>
      <!-- 画布模式：绝对定位渲染 -->
      <template v-else-if="isCanvasMode">
        <view v-if="editorStore.renderedImage" class="preview-card preview-card--canvas" :style="canvasCardStyle">
          <image class="rendered-image" :src="editorStore.renderedImage" mode="widthFix" />
        </view>
        <view v-else class="preview-card preview-card--canvas" :style="canvasBackgroundStyle">
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
            <text v-else-if="el.type === 'text'" class="preview-text-el" :style="getTextStyle(el)">{{ resolveText(el.text) }}</text>
          </view>
        </view>
      </template>
      <!-- Flex 模式：垂直排列 -->
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
            >{{ resolveText(el.text) }}</text>
          </view>
        </view>
      </template>
      </view>
      <view class="zoom-spacer" :style="{ height: spacerHeight + 'px' }"></view>

      <!-- 相似推荐 -->
      <view class="similar-section">
        <view class="similar-title-bar">
          <text class="similar-bar-text">相似推荐</text>
        </view>
        <view class="similar-list">
          <view class="similar-item" v-for="(item, idx) in similarTemplates" :key="idx" @click="onSimilarClick(item)">
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

      <!-- 导出效果对比 -->
      <view class="watermark-compare" v-if="!userStore.isVip()">
        <view class="compare-title">&#128064; 导出效果对比</view>
        <view class="compare-row">
          <view class="compare-col">
            <view class="compare-label">免费导出</view>
            <image class="compare-img" :src="watermarkedPreview" mode="aspectFill" />
            <view class="compare-desc">带水印 · 720px</view>
          </view>
          <view class="compare-col compare-highlight">
            <view class="compare-label">高清导出</view>
            <image class="compare-img" :src="hdPreview" mode="aspectFill" />
            <view class="compare-desc">无水印 · 1440px</view>
          </view>
        </view>
        <view class="compare-action">
          <button class="btn-primary" @click="goToVip">3元 高清导出</button>
          <button class="btn-secondary" @click="exportFree">免费导出</button>
        </view>
      </view>

      <!-- 婚礼推荐 -->
      <view class="shop-recommend-preview" v-if="recommendProducts.length > 0">
        <view class="shop-rec-header">
          <text class="shop-rec-title">&#128722; 为你的婚礼推荐</text>
          <text class="shop-rec-more" @click="goToMall">更多 ></text>
        </view>
        <scroll-view class="shop-rec-scroll" scroll-x>
          <view class="shop-rec-list">
            <view v-for="p in recommendProducts" :key="p.id" class="shop-rec-card" @click="goToProduct(p)">
              <image class="shop-rec-img" :src="p.image" mode="aspectFill" />
              <text class="shop-rec-name">{{ p.name }}</text>
              <text class="shop-rec-price">{{ p.price }}元</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </scroll-view>

    <!-- 缩放控制 -->
    <view class="zoom-controls" v-if="isZoomable">
      <view class="zoom-btn" @click="zoomIn">
        <text class="zoom-btn-text">+</text>
      </view>
      <text class="zoom-level">{{ Math.round(previewScale * 100) }}%</text>
      <view class="zoom-btn" @click="zoomOut">
        <text class="zoom-btn-text">−</text>
      </view>
      <view class="zoom-btn zoom-reset" @click="zoomReset" v-if="previewScale !== 1">
        <text class="zoom-btn-text">1:1</text>
      </view>
    </view>

    <view class="vip-bar" v-if="!userStore.isVip()" @click="goToVip">
      <text class="vip-icon">&#9733;</text>
      <text class="vip-text">开通VIP，本次请柬免费导出 + 全模板解锁 + 商城9折</text>
      <text class="vip-btn">去开通</text>
    </view>

    <view class="preview-footer">
      <view class="create-button" @click="handleCreate">
        <text class="button-text">立即制作</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { onShareAppMessage } from '@dcloudio/uni-app'
import { useTemplateStore } from '@/stores/template'
import { useEditorStore } from '@/stores/editor'
import { useUserStore } from '@/stores/user'
import { useWorksStore } from '@/stores/works'
import { loadFontsForElements } from '@/utils/font-loader'
import { track } from '@/utils/track'
import { resolveDatePlaceholders } from '@/utils/placeholders'
import { useCanvasRender } from '@/composables/useCanvasRender'
import { useGoBack } from '@/composables/useGoBack'
import { exportInvitation, fetchSimilarTemplates, fetchRecommendProducts } from '@/api'
import type { EditableElement } from '@/types'

const templateStore = useTemplateStore()
const editorStore = useEditorStore()
const userStore = useUserStore()
const worksStore = useWorksStore()

const {
  isCanvasMode,
  canvasCardStyle,
  canvasBackgroundStyle,
  updateCardHeight,
  getCanvasElementStyle,
  getTextStyle,
} = useCanvasRender({
  getElements: () => editorStore.editableElements,
  getCanvasSize: () => editorStore.canvasSize,
  getBackground: () => editorStore.background as any,
})

const displayTitle = computed(() => {
  const g = templateStore.basicInfo.groomName
  const b = templateStore.basicInfo.brideName
  if (g && b) return g + ' · ' + b
  if (g || b) return g || b
  return '婚贝请柬'
})

const templateId = ref('')

const watermarkedPreview = computed(() => editorStore.renderedImage || '')
const hdPreview = computed(() => editorStore.renderedImage || '')

const fallbackRecommendProducts = [
  { id: 1, name: '哈萨克风格耳环', price: 188, image: '/static/images/categories/earring.jpg' },
  { id: 2, name: '气球拱门定制', price: 688, image: '/static/images/mall/banner1.jpg' },
  { id: 3, name: '新娘手捧花定制', price: 398, image: '/static/images/mall/banner2.jpg' },
  { id: 4, name: '婚车装饰定制', price: 888, image: '/static/images/mall/banner2.jpg' },
]
const recommendProducts = ref<any[]>([...fallbackRecommendProducts])

async function loadRecommendProducts() {
  try {
    const data = await fetchRecommendProducts('wedding')
    if (data && Array.isArray(data) && data.length > 0) {
      recommendProducts.value = data
    }
  } catch (e) {
    console.warn('加载推荐商品失败:', e)
  }
}

function resolveText(text: string): string {
  return resolveDatePlaceholders(text, templateStore.templateData)
}

function updateCardSize() {
  if (!isCanvasMode.value) return
  nextTick(() => {
    const query = uni.createSelectorQuery()
    query
      .select('.preview-card--canvas')
      .boundingClientRect((rect: any) => {
        if (rect && rect.width > 0) {
          updateCardHeight(rect.width)
        }
      })
      .exec()
  })
}

onMounted(() => {
  const pages = getCurrentPages()
  const curPage = pages[pages.length - 1] as any
  const options = curPage?.options || {}
  const id = options.templateId || options.id
  if (id) {
    templateId.value = id
    if (editorStore.currentTemplateId !== id) {
      editorStore.loadTemplateById(id)
    }
  }
  track('preview_view', { template_id: templateId.value })
  nextTick(() => {
    setTimeout(() => updateCardSize(), 100)
    setTimeout(() => measureZoomHeight(), 150)
  })
  loadSimilarTemplates()
  loadRecommendProducts()
})

watch(() => editorStore.templateLoading, (loading) => {
  if (!loading) {
    loadFontsForElements(editorStore.editableElements as any)
    nextTick(() => {
      setTimeout(() => updateCardSize(), 100)
      setTimeout(() => measureZoomHeight(), 150)
    })
  }
})

watch(() => editorStore.currentTemplateId, () => {
  previewScale.value = 1
  nextTick(() => setTimeout(() => measureZoomHeight(), 150))
})

watch(() => editorStore.editableElements.length, () => {
  nextTick(() => updateCardSize())
})

const similarTemplates = ref<any[]>([])

async function loadSimilarTemplates() {
  if (!templateId.value) return
  try {
    const data = await fetchSimilarTemplates(templateId.value)
    if (data && Array.isArray(data)) {
      similarTemplates.value = data
    }
  } catch (e) {
    console.warn('加载相似模板失败:', e)
  }
}

const goBack = useGoBack()

const handleShare = () => {
  track('click_share', { channel: 'wechat' })
  const templateId = editorStore.currentTemplateId
  if (templateId) {
    uni.navigateTo({ url: `/pages/share/index?templateId=${templateId}` })
  } else {
    uni.navigateTo({ url: '/pages/share/index' })
  }
}

// 微信分享：支持右上角"..."菜单与转发按钮，使用真实的预览路径
onShareAppMessage(() => {
  const templateId = editorStore.currentTemplateId || ''
  const workId = editorStore.currentWorkId || ''
  let path = '/pages/preview/index'
  const params: string[] = []
  if (templateId) params.push(`templateId=${templateId}`)
  if (workId) params.push(`workId=${workId}`)
  if (params.length) path += '?' + params.join('&')
  const info = templateStore.basicInfo
  const groom = info.groomName || ''
  const bride = info.brideName || ''
  const title = groom && bride ? `${groom} ❤ ${bride} 的婚礼邀请` : '婚贝请柬'
  return {
    title,
    path,
    imageUrl: templateStore.templateData.coverImage || '',
  }
})

// 相似模板点击：跳转到对应模板预览页
function onSimilarClick(item: any) {
  const id = item?.id || item?.templateId
  if (!id) return
  track('preview_similar_click', { template_id: String(id) })
  uni.redirectTo({ url: `/pages/preview/index?templateId=${id}` })
}

// ============ 预览缩放（pinch 手势 + +/- 按钮） ============
const previewScale = ref(1)
const cardNaturalHeight = ref(0)
const MIN_SCALE = 1
const MAX_SCALE = 3

const isZoomable = computed(() => editorStore.templateType !== 'flip')

const zoomStyle = computed(() => ({
  transform: `scale(${previewScale.value})`,
  transformOrigin: 'top center',
}))

const spacerHeight = computed(() => {
  if (previewScale.value <= 1 || !cardNaturalHeight.value) return 0
  return Math.max(0, (previewScale.value - 1) * cardNaturalHeight.value)
})

function setScale(val: number) {
  previewScale.value = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Number(val.toFixed(2))))
}

function zoomIn() {
  setScale(previewScale.value + 0.2)
}

function zoomOut() {
  setScale(previewScale.value - 0.2)
}

function zoomReset() {
  previewScale.value = 1
}

function getTouchDistance(t1: any, t2: any): number {
  const dx = t1.clientX - t2.clientX
  const dy = t1.clientY - t2.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

let pinchStartDist = 0
let pinchStartScale = 1

function onZoomTouchStart(e: any) {
  if (e.touches && e.touches.length === 2) {
    pinchStartDist = getTouchDistance(e.touches[0], e.touches[1])
    pinchStartScale = previewScale.value
  }
}

function onZoomTouchMove(e: any) {
  if (!e.touches || e.touches.length !== 2 || !pinchStartDist) return
  const dist = getTouchDistance(e.touches[0], e.touches[1])
  if (!dist) return
  const ratio = dist / pinchStartDist
  setScale(pinchStartScale * ratio)
}

function onZoomTouchEnd(e: any) {
  const remaining = e.touches ? e.touches.length : 0
  if (remaining < 2) {
    pinchStartDist = 0
  }
}

function measureZoomHeight() {
  if (previewScale.value !== 1) return
  const query = uni.createSelectorQuery()
  query
    .select('.preview-zoom-wrap')
    .boundingClientRect((rect: any) => {
      if (rect && rect.height > 0) {
        cardNaturalHeight.value = rect.height
      }
    })
    .exec()
}

const isFavorited = computed(() => {
  if (!editorStore.currentWorkId) return false
  return worksStore.isFavorite(editorStore.currentWorkId)
})

async function toggleFavorite() {
  if (!editorStore.currentWorkId) return
  const wasFavorited = isFavorited.value
  await worksStore.toggleFavorite(editorStore.currentWorkId)
  if (wasFavorited !== isFavorited.value) {
    uni.showToast({ title: isFavorited.value ? '已收藏' : '已取消收藏', icon: isFavorited.value ? 'success' : 'none' })
  }
}

const handleMore = () => {
  uni.showActionSheet({
    itemList: ['分享', isFavorited.value ? '取消收藏' : '收藏'],
    success: (res: any) => {
      if (res.tapIndex === 0) handleShare()
      else toggleFavorite()
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

const goToVip = () => {
  uni.navigateTo({ url: '/pages/vip/index' })
}

async function exportFree() {
  if (!editorStore.currentWorkId) return
  uni.showLoading({ title: '导出中...' })
  try {
    const res = await exportInvitation(editorStore.currentWorkId, { watermark: true, quality: 'normal' })
    uni.hideLoading()
    uni.showToast({ title: '已导出', icon: 'success' })
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: '导出失败', icon: 'none' })
  }
}

const goToMall = () => {
  uni.switchTab({ url: '/pages/mall/index' })
}

const goToProduct = (p: any) => {
  uni.navigateTo({ url: `/pages/mall/index?productId=${p.id}` })
}

// ============ Flip 翻页模式方法 ============
function onFlipPageChange(e: any) {
  editorStore.currentFlipPageIndex = e.detail.current
}

function getFlipPageBgStyle(page: any): Record<string, string> {
  const bg = page.background
  const style: Record<string, string> = {}
  if (bg.type === 'solid') {
    style.background = bg.color1
  } else if (bg.type === 'linear-gradient') {
    style.background = `linear-gradient(${bg.angle || 180}deg, ${bg.color1}, ${bg.color2 || bg.color1})`
  } else if (bg.type === 'radial-gradient') {
    style.background = `radial-gradient(circle, ${bg.color1}, ${bg.color2 || bg.color1})`
  } else if (bg.type === 'image' && bg.imageUrl) {
    style.backgroundImage = `url(${bg.imageUrl})`
    style.backgroundSize = bg.imageScale || 'cover'
    style.backgroundPosition = 'center'
    style.backgroundRepeat = 'no-repeat'
  }
  return style
}

function getFlipElementStyle(el: any): Record<string, string> {
  const cs = editorStore.canvasSize
  return {
    position: 'absolute',
    left: (el.x / cs.width * 100) + '%',
    top: (el.y / cs.height * 100) + '%',
    width: (el.width / cs.width * 100) + '%',
    height: (el.height / cs.height * 100) + '%',
    transform: `rotate(${el.rotation || 0}deg)`,
    opacity: el.opacity ?? 1,
    zIndex: el.zIndex || 1,
  }
}

function getFlipTextStyle(el: any): Record<string, string> {
  const style = el.style || {}
  return {
    fontFamily: style.font || 'sans-serif',
    fontSize: (style.fontSize || 28) + 'rpx',
    color: style.color || '#333333',
    letterSpacing: (style.spacing || 0) + 'rpx',
    lineHeight: style.lineHeight || 1.5,
    fontWeight: style.fontWeight || 'normal',
    textAlign: style.textAlign || 'center',
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
  border-radius: 0;
  overflow: hidden;
  margin: 0;
}

.rendered-image {
  width: 100%;
  display: block;
}

.preview-element {
  display: block;
  overflow: hidden;
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

/* Page 模式 */
.preview-card--page {
  padding: 20rpx;
}

.preview-page-section {
  position: relative;
  margin-bottom: 30rpx;
  padding: 16rpx;
  border-radius: 12rpx;
}

.preview-page-section--title .section-title {
  font-size: 40rpx;
  font-weight: 700;
  text-align: center;
  color: #333;
  line-height: 1.5;
}

.preview-page-section--date .section-date {
  font-size: 28rpx;
  text-align: center;
  color: #999;
  margin-top: 10rpx;
}

.preview-page-section--image .section-image {
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 12rpx;
  background: #f5f5f5;
}

.preview-page-section--text .section-text {
  font-size: 28rpx;
  color: #666;
  line-height: 1.8;
  text-align: center;
}

.preview-page-section--location .location-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.preview-page-section--location .location-icon {
  font-size: 32rpx;
}

.preview-page-section--location .location-text {
  font-size: 28rpx;
  color: #666;
}

.preview-page-section--divider .divider-line {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 0;
}

.preview-page-section--divider .divider-line::before,
.preview-page-section--divider .divider-line::after {
  content: '';
  flex: 1;
  height: 2rpx;
  background: linear-gradient(90deg, transparent, #e0d0d5, transparent);
}

.preview-page-section--divider .divider-text {
  font-size: 24rpx;
  color: #999;
  letter-spacing: 4rpx;
}

.preview-page-section--countdown .countdown-section {
  text-align: center;
  padding: 30rpx;
}

.preview-page-section--countdown .countdown-label {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 10rpx;
}

.preview-page-section--countdown .countdown-days {
  font-size: 80rpx;
  font-weight: 700;
  color: #e84a6e;
}

.preview-page-section--countdown .countdown-unit {
  font-size: 28rpx;
  color: #999;
  margin-left: 8rpx;
}

/* Flip 翻页模式 */
.flip-preview-wrap {
  width: 100%;
  height: 100%;
}

.flip-swiper {
  width: 100%;
  height: 100vh;
}

.flip-page-card {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #f5f5f5;
}

.flip-page-element {
  position: absolute;
  overflow: hidden;
}

.flip-image-el {
  width: 100%;
  height: 100%;
  display: block;
}

.flip-text-el {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  word-break: break-all;
  white-space: pre-wrap;
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

/* 导出效果对比 */
.watermark-compare {
  margin: 24rpx 32rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 20rpx;
}

.compare-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
}

.compare-row {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.compare-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx;
  background: #f8f8f8;
  border-radius: 16rpx;
}

.compare-highlight {
  background: #fff8f0;
  border: 2rpx solid #ffb347;
}

.compare-label {
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
}

.compare-img {
  width: 100%;
  height: 200rpx;
  border-radius: 12rpx;
  background: #eee;
}

.compare-desc {
  font-size: 22rpx;
  color: #999;
}

.compare-action {
  display: flex;
  gap: 20rpx;
}

.btn-primary {
  flex: 1;
  height: 80rpx;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  color: #fff;
  border-radius: 40rpx;
  font-size: 28rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  line-height: 1;
}

.btn-primary::after {
  border: none;
}

.btn-secondary {
  flex: 1;
  height: 80rpx;
  background: #f5f5f5;
  color: #666;
  border-radius: 40rpx;
  font-size: 28rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  line-height: 1;
}

.btn-secondary::after {
  border: none;
}

/* 商城推荐 */
.shop-recommend-preview {
  margin: 24rpx 32rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 20rpx;
}

.shop-rec-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.shop-rec-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.shop-rec-more {
  font-size: 24rpx;
  color: #999;
}

.shop-rec-scroll {
  white-space: nowrap;
}

.shop-rec-list {
  display: inline-flex;
  gap: 20rpx;
}

.shop-rec-card {
  width: 200rpx;
  display: inline-flex;
  flex-direction: column;
  gap: 8rpx;
}

.shop-rec-img {
  width: 200rpx;
  height: 200rpx;
  border-radius: 16rpx;
  background: #f5f5f5;
}

.shop-rec-name {
  font-size: 24rpx;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shop-rec-price {
  font-size: 26rpx;
  color: #e84a6e;
  font-weight: 700;
}

/* VIP 提示条 */
.vip-bar {
  padding: 20rpx 32rpx;
  background: linear-gradient(135deg, #ffd700 0%, #ffb700 100%);
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-shrink: 0;
}

.vip-bar .vip-icon {
  font-size: 32rpx;
  color: #fff;
}

.vip-bar .vip-text {
  flex: 1;
  font-size: 26rpx;
  color: #fff;
  font-weight: 500;
}

.vip-bar .vip-btn {
  font-size: 26rpx;
  color: #fff;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.25);
  padding: 8rpx 20rpx;
  border-radius: 24rpx;
}

/* 预览缩放 */
.preview-zoom-wrap {
  width: 100%;
  transform-origin: top center;
  will-change: transform;
}

.zoom-spacer {
  width: 100%;
}

.zoom-controls {
  position: fixed;
  right: 24rpx;
  bottom: 220rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  z-index: 50;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 40rpx;
  padding: 16rpx 12rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.12);
}

.zoom-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.zoom-btn:active {
  background: #ffe4e8;
}

.zoom-btn-text {
  font-size: 40rpx;
  color: #333;
  font-weight: 600;
  line-height: 1;
}

.zoom-reset .zoom-btn-text {
  font-size: 22rpx;
}

.zoom-level {
  font-size: 20rpx;
  color: #999;
}

/* 相似模板点击反馈 */
.similar-item:active {
  opacity: 0.85;
}
</style>
