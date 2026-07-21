<template>
  <view class="preview-page animate-fade-in">
    <view class="preview-header animate-slide-down">
      <view class="header-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="header-title">{{ displayTitle }}</text>
      <view class="header-actions">
        <view class="header-action header-action--share" @click="handleShare">
          <text class="action-icon action-icon--share">↗</text>
        </view>
        <view class="header-action" @click="handleMore">
          <text class="action-icon">⋯</text>
        </view>
      </view>
    </view>

    <scroll-view class="preview-content" scroll-y>
      <view v-if="loadError" class="preview-error-state animate-fade-in">
        <view class="error-icon-wrap">
          <text class="error-icon">⚠️</text>
        </view>
        <text class="error-title">加载失败</text>
        <text class="error-desc">数据加载出现问题，请重试</text>
        <view class="error-retry-btn" @click="retryLoad">
          <text class="error-retry-text">重新加载</text>
        </view>
      </view>
      <view v-else-if="editorStore.templateLoading" class="preview-skeleton">
        <view class="skeleton-card">
          <view class="skeleton-block skeleton-cover"></view>
          <view class="skeleton-block skeleton-line skeleton-line--title"></view>
          <view class="skeleton-block skeleton-line skeleton-line--text"></view>
          <view class="skeleton-block skeleton-line skeleton-line--text-short"></view>
          <view class="skeleton-block skeleton-line skeleton-line--text"></view>
        </view>
      </view>
      <template v-else>
      <!-- Flip 翻页模式：左右滑动翻页 -->
      <template v-if="editorStore.templateType === 'flip'">
        <view class="flip-preview-wrap animate-fade-scale">
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
                    lazy-load
                    :src="el.text"
                    mode="aspectFit"
                    @error="onImageError"
                  />
                  <text v-else-if="el.type === 'text'" class="flip-text-el" :style="getFlipTextStyle(el)">{{ formatBiDi(resolveText(el.text)) }}</text>
                </view>
              </view>
            </swiper-item>
          </swiper>
        </view>
      </template>
      <view v-else class="preview-zoom-wrap animate-fade-scale" :style="zoomStyle" @touchstart="onZoomTouchStart" @touchmove="onZoomTouchMove" @touchend="onZoomTouchEnd">
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
                lazy-load
                :src="sec.image || PLACEHOLDER_IMAGE"
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
          <image class="rendered-image" lazy-load :src="editorStore.renderedImage" mode="widthFix" />
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
              lazy-load
              :src="el.text"
              mode="aspectFit"
              @error="onImageError"
            />
            <text v-else-if="el.type === 'text'" class="preview-text-el" :style="getTextStyle(el)">{{ formatBiDi(resolveText(el.text)) }}</text>
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
              lazy-load
              :src="el.text"
              mode="aspectFill"
              @error="onImageError"
            />
            <text
              v-else-if="el.type === 'text'"
              class="preview-section-text"
              :style="getTextStyle(el)"
            >{{ formatBiDi(resolveText(el.text)) }}</text>
          </view>
        </view>
      </template>
      </view>
      </template>
      <view class="zoom-spacer" :style="{ height: spacerHeight + 'px' }"></view>

      <!-- 相似推荐 -->
      <view class="similar-section animate-fade-up">
        <view class="similar-title-bar">
          <text class="similar-bar-text">相似推荐</text>
          <view class="similar-title-underline"></view>
        </view>
        <view class="similar-list">
          <view class="similar-item animate-stagger-item" v-for="(item, idx) in similarTemplates" :key="idx" :style="{ animationDelay: (idx * 0.1) + 's' }" @click="onSimilarClick(item)">
            <view class="similar-image-wrap">
              <image class="similar-image" lazy-load :src="item.image" mode="aspectFill" @error="onImageError"></image>
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
      <view class="watermark-compare animate-fade-up glass-card" v-if="!userStore.isVip()">
        <view class="compare-title">&#128064; 导出效果对比</view>
        <view class="compare-row">
          <view class="compare-col">
            <view class="compare-label">免费导出</view>
            <view class="compare-img-wrap">
              <image class="compare-img compare-img--watermarked" lazy-load :src="watermarkedPreview" mode="aspectFill" />
              <view class="compare-watermark-overlay">
                <text class="compare-watermark-text">水印</text>
              </view>
            </view>
            <view class="compare-desc">带水印 · 720px</view>
          </view>
          <view class="compare-col compare-highlight">
            <view class="compare-vip-badge">VIP</view>
            <view class="compare-label">高清导出</view>
            <view class="compare-img-wrap">
              <image class="compare-img compare-img--hd" lazy-load :src="hdPreview" mode="aspectFill" />
              <view class="compare-hd-badge">高清</view>
            </view>
            <view class="compare-desc">无水印 · 1440px</view>
          </view>
        </view>
        <view class="compare-action">
          <button class="btn-primary" @click="goToVip">高清导出</button>
          <button
            class="btn-secondary"
            :class="{ 'btn--loading': exportingLoading }"
            :disabled="exportingLoading"
            @click="exportFree"
          >
            <view v-if="exportingLoading" class="btn-loading-wrap">
              <view class="btn-loading-spinner"></view>
              <text>导出中...</text>
            </view>
            <text v-else>免费导出</text>
          </button>
        </view>
      </view>

      <!-- 婚礼推荐 -->
      <view class="shop-recommend-preview animate-fade-up" v-if="recommendProducts.length > 0">
        <view class="shop-rec-header">
          <text class="shop-rec-title">&#128722; 为你的婚礼推荐</text>
          <text class="shop-rec-more" @click="goToMall">更多 ></text>
        </view>
        <scroll-view class="shop-rec-scroll" scroll-x>
          <view class="shop-rec-list">
            <view v-for="(p, idx) in recommendProducts" :key="p.id" class="shop-rec-card animate-stagger-item" :style="{ animationDelay: (idx * 0.08) + 's' }" @click="goToProduct(p)">
              <image class="shop-rec-img" lazy-load :src="p.image" mode="aspectFill" />
              <text class="shop-rec-name">{{ p.name }}</text>
              <text class="shop-rec-price">{{ p.price }}元</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </scroll-view>

    <!-- 缩放控制 -->
    <view class="zoom-controls animate-fade-scale" v-if="isZoomable">
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

    <view class="vip-bar animate-slide-up" v-if="!userStore.isVip()" @click="goToVip">
      <text class="vip-icon">👑</text>
      <text class="vip-text">开通VIP，本次请柬免费导出 + 全模板解锁 + 商城9折</text>
      <text class="vip-btn">去开通 →</text>
    </view>

    <view class="preview-footer animate-slide-up">
      <view class="create-button" @click="handleCreate">
        <text class="button-text">立即制作</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { onShareAppMessage } from '@dcloudio/uni-app'
import { useTemplateStore } from '@/stores/template'
import { useEditorStore } from '@/stores/editor'
import { useUserStore } from '@/stores/user'
import { useWorksStore } from '@/stores/works'
import { loadFontsForElements, formatBiDi } from '@/utils/font-loader'
import { RTL_CHAR_REGEX, FONT_FAMILY_BASE } from '@/constants/editor'
import { track } from '@/utils/track'
import { resolveDatePlaceholders } from '@/utils/placeholders'
import { useCanvasRender } from '@/composables/useCanvasRender'
import { useGoBack } from '@/composables/useGoBack'
import { useFeedback } from '@/composables/useFeedback'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { exportInvitation, fetchSimilarTemplates, fetchRecommendProducts } from '@/api'
import type { EditableElement, Work } from '@/types'

const templateStore = useTemplateStore()
const editorStore = useEditorStore()
const userStore = useUserStore()
const worksStore = useWorksStore()

const { haptic, feedbackSuccess, feedbackError, feedbackWarning } = useFeedback()
const { loading: exportingLoading, run: runExport } = useAsyncAction()

// 跟踪所有 setTimeout，组件卸载时统一清理，防止内存泄漏
let _timers: ReturnType<typeof setTimeout>[] = []
function trackTimer(fn: () => void, ms: number) {
  const t = setTimeout(fn, ms)
  _timers.push(t)
  return t
}

onUnmounted(() => {
  _timers.forEach(t => clearTimeout(t))
  _timers = []
})

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
  return 'TOYtamaxia'
})

const templateId = ref('')
const loadError = ref(false)

// 免费导出预览图（通过 CSS 类 compare-img--watermarked 降低不透明度并加模糊）
const watermarkedPreview = computed(() => editorStore.renderedImage || '')
// 高清导出预览图（通过 CSS 类 compare-img--hd 增强 contrast/saturate 以示区分）
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

// 查找作品：优先从 store，回退到本地存储
function findWork(workId: string): Work | undefined {
  const fromStore = worksStore.works.find(w => w.id === workId) || worksStore.drafts.find(w => w.id === workId)
  if (fromStore) return fromStore
  try {
    const saved = uni.getStorageSync('TOYtamaxia_works')
    if (saved) {
      const all = [...(saved.works || []), ...(saved.drafts || [])]
      return all.find((w: Work) => w.id === workId)
    }
  } catch (e) { /* ignore */ }
  return undefined
}

async function loadData() {
  try {
    loadError.value = false
    const pages = getCurrentPages()
    const curPage = pages[pages.length - 1] as any
    const options = curPage?.options || {}

  const workId = options.workId
  if (workId) {
    // 通过 workId 加载对应作品数据
    const work = findWork(workId)
    if (work) {
      editorStore.setCurrentWorkId(work.id)
      const id = work.templateId || options.templateId || options.id
      if (id) {
        templateId.value = id
        if (editorStore.currentTemplateId !== id) {
          await editorStore.loadTemplateById(id)
        }
      }
      if (work.data) {
        editorStore.restoreFromWorkData(work.data, work.musicId)
      }
    } else {
      const id = options.templateId || options.id
      if (id) {
        templateId.value = id
        if (editorStore.currentTemplateId !== id) {
          await editorStore.loadTemplateById(id)
        }
      }
    }
  } else {
    const id = options.templateId || options.id
    if (id) {
      templateId.value = id
      if (editorStore.currentTemplateId !== id) {
        await editorStore.loadTemplateById(id)
      }
    }
  }
  track('preview_view', { template_id: templateId.value })
  nextTick(() => {
    trackTimer(() => updateCardSize(), 100)
    trackTimer(() => measureZoomHeight(), 150)
  })
  loadSimilarTemplates()
  loadRecommendProducts()
  } catch (e) {
    console.error('preview mount failed:', e)
    loadError.value = true
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

// 重试加载：重置错误状态并重新执行加载逻辑
function retryLoad() {
  loadData()
}

onMounted(() => {
  loadData()
})

watch(() => editorStore.templateLoading, (loading) => {
  if (!loading) {
    // 根据模板类型加载对应模式的元素字体（与编辑器保持一致）
    // 修复阿拉伯文显示混乱：等待字体加载完成后再触发尺寸计算
    nextTick(async () => {
      try {
        if (editorStore.templateType === 'flip') {
          await Promise.all(editorStore.flipPages.map(p => loadFontsForElements(p.elements as any)))
        } else if (editorStore.templateType === 'page') {
          await loadFontsForElements(editorStore.pageSections as any)
        } else {
          await loadFontsForElements(editorStore.editableElements as any)
        }
      } catch (e) {
        console.warn('[Preview] font load failed', e)
      }
      // 关键修复：字体加载完成后强制 <text> 重渲染（与 editor/index.vue 同步）
      // wx.loadFontFace 注册字体后，已渲染的 <text> 不会自动应用新字体。
      // 通过对 style 做浅拷贝替换触发 Vue 重算 :style 绑定。
      if (editorStore.templateType === 'flip') {
        editorStore.flipPages.forEach(page => {
          const els = [...page.elements]
          page.elements.splice(0, els.length, ...els.map(e => ({ ...e, style: e.style ? { ...e.style } : undefined })))
        })
      } else if (editorStore.templateType === 'page') {
        const secs = [...editorStore.pageSections]
        editorStore.pageSections.splice(0, secs.length, ...secs.map(s => ({ ...s, style: s.style ? { ...s.style } : undefined })))
      } else {
        const els = [...editorStore.editableElements]
        editorStore.editableElements.splice(0, els.length, ...els.map(e => ({ ...e, style: e.style ? { ...e.style } : undefined })))
      }
      trackTimer(() => updateCardSize(), 100)
      trackTimer(() => measureZoomHeight(), 150)
    })
  }
})

watch(() => editorStore.currentTemplateId, () => {
  previewScale.value = 1
  nextTick(() => trackTimer(() => measureZoomHeight(), 150))
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

const { goBack } = useGoBack()

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
  const title = groom && bride ? `${groom} ❤ ${bride} 的婚礼邀请` : 'TOYtamaxia'
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
  if (!editorStore.currentWorkId) {
    uni.showToast({ title: '请先保存作品', icon: 'none' })
    return
  }
  try {
    const wasFavorited = isFavorited.value
    await worksStore.toggleFavorite(editorStore.currentWorkId)
    if (wasFavorited !== isFavorited.value) {
      uni.showToast({ title: isFavorited.value ? '已收藏' : '已取消收藏', icon: isFavorited.value ? 'success' : 'none' })
    }
  } catch (e) {
    console.error('toggleFavorite failed:', e)
    uni.showToast({ title: '操作失败', icon: 'none' })
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
  if (!userStore.requireLogin()) return
  haptic('medium')
  const templateId = editorStore.currentTemplateId
  if (templateId) {
    uni.navigateTo({ url: `/pages/editor/index?templateId=${templateId}` })
  } else {
    uni.navigateTo({ url: '/pages/editor/index' })
  }
}

const goToVip = () => {
  haptic('light')
  uni.navigateTo({ url: '/pages/vip/index' })
}

async function exportFree() {
  if (exportingLoading.value) return
  if (!editorStore.currentWorkId) {
    feedbackWarning('请先保存作品')
    return
  }
  haptic('medium')
  await runExport(async () => {
    const res = await exportInvitation(editorStore.currentWorkId!, { watermark: true, quality: 'normal' })
    if (!res || !res.url) throw new Error('导出失败')

    // 下载并保存到相册
    await new Promise<void>((resolve, reject) => {
      uni.downloadFile({
        url: res.url,
        success: (downloadRes) => {
          if (downloadRes.statusCode !== 200) {
            reject(new Error('下载失败'))
            return
          }
          uni.saveImageToPhotosAlbum({
            filePath: downloadRes.tempFilePath,
            success: () => {
              feedbackSuccess('已保存到相册')
              resolve()
            },
            fail: (err) => {
              if (err.errMsg?.includes('auth')) {
                uni.showModal({
                  title: '提示',
                  content: '需要相册权限才能保存图片，请在设置中开启',
                  confirmText: '去设置',
                  success: (r) => { if (r.confirm) uni.openSetting({}) },
                })
              } else {
                feedbackError('保存失败，请授权相册权限')
              }
              reject(new Error('保存失败'))
            },
          })
        },
        fail: () => reject(new Error('下载失败')),
      })
    })
  }, { successMessage: '导出成功', minLoadingDuration: 500 })
}

const goToMall = () => {
  uni.switchTab({ url: '/pages/mall/index' })
}

const goToProduct = (p: any) => {
  uni.switchTab({
    url: '/pages/mall/index',
    success: () => {
      // 通过全局事件将 productId 传递给 mall 页面
      uni.$emit('selectProduct', { id: p.id })
    }
  })
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
  const w = cs.width || 1
  const h = cs.height || 1
  return {
    position: 'absolute',
    left: (el.x / w * 100) + '%',
    top: (el.y / h * 100) + '%',
    width: (el.width / w * 100) + '%',
    height: (el.height / h * 100) + '%',
    transform: `rotate(${el.rotation || 0}deg)`,
    opacity: el.opacity ?? 1,
    zIndex: el.zIndex || 1,
  }
}

function getFlipTextStyle(el: any): Record<string, string> {
  const style = el.style || {}
  const detectedDirection = RTL_CHAR_REGEX.test(el.text) ? 'rtl' : 'ltr'
  const direction = style.direction === 'auto' ? detectedDirection : (style.direction || 'ltr')
  const isRtl = direction === 'rtl'
  return {
    fontFamily: style.font ? `"${style.font}", ${FONT_FAMILY_BASE}` : FONT_FAMILY_BASE,
    fontSize: (style.fontSize || 28) + 'rpx',
    color: style.color || '#333333',
    letterSpacing: isRtl ? 'normal' : (style.spacing || 0) + 'rpx',
    lineHeight: style.lineHeight || 1.5,
    fontWeight: style.fontWeight || 'normal',
    fontStyle: style.fontStyle || 'normal',
    textAlign: isRtl ? (style.textAlign || 'right') : (style.textAlign || 'center'),
    direction: isRtl ? 'rtl' : 'ltr',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    writingMode: 'horizontal-tb',
    unicodeBidi: isRtl ? 'isolate' : 'normal',
    textDecoration: style.textDecoration || 'none',
  }
}

const PLACEHOLDER_IMAGE = '/static/images/icons/img-placeholder.svg'

// 节流：记录上次 toast 时间，避免图片错误刷屏
const lastImageErrorToastTime = ref(0)

const onImageError = () => {
  console.warn('Preview image load failed')
  const now = Date.now()
  if (now - lastImageErrorToastTime.value > 3000) {
    lastImageErrorToastTime.value = now
    uni.showToast({ title: '部分图片加载失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.preview-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #fff5f7 0%, #f8f0f2 30%, #f2f2f7 100%);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.preview-page::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 600rpx;
  background: radial-gradient(ellipse at top, rgba(232, 74, 110, 0.08) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  padding-top: calc(24rpx + env(safe-area-inset-top));
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 240, 245, 0.92) 100%);
  backdrop-filter: blur(24rpx);
  -webkit-backdrop-filter: blur(24rpx);
  flex-shrink: 0;
  position: relative;
  z-index: 10;
  box-shadow: 0 4rpx 24rpx rgba(232, 74, 110, 0.08), 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  border-bottom: 1rpx solid rgba(232, 74, 110, 0.1);
}

.header-back {
  min-width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff6b8a 0%, #e84a6e 100%);
  box-shadow: 0 6rpx 16rpx rgba(232, 74, 110, 0.3);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.header-back:active {
  transform: scale(0.88);
  box-shadow: 0 2rpx 8rpx rgba(232, 74, 110, 0.25);
}

.back-icon {
  font-size: 48rpx;
  color: #ffffff;
  font-weight: 400;
  line-height: 1;
  margin-left: -4rpx;
}

.header-title {
  font-size: 32rpx;
  font-weight: 700;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 50%, #d6385c 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-align: center;
  flex: 1;
  letter-spacing: 2rpx;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.header-action {
  min-width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: transform 0.2s ease, background-color 0.2s ease;
}

.header-action:active {
  transform: scale(0.88);
  background-color: rgba(232, 74, 110, 0.08);
}

.header-action--share {
  min-width: 80rpx;
  height: 80rpx;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  box-shadow: 0 6rpx 18rpx rgba(232, 74, 110, 0.35);
}

.header-action--share .action-icon {
  color: #ffffff;
  font-size: 34rpx;
  font-weight: 600;
}

.header-action--share:active {
  background: linear-gradient(135deg, #d63f61 0%, #f55d7e 100%);
  transform: scale(0.92);
  background-color: transparent;
}

.action-icon {
  font-size: 36rpx;
  color: #e84a6e;
  font-weight: 500;
}

.action-icon--share {
  font-size: 32rpx;
}

.preview-content {
  flex: 1;
  overflow: hidden;
  position: relative;
  z-index: 1;
}

.preview-skeleton {
  padding: 24rpx 32rpx;
}

/* 加载失败错误状态 */
.preview-error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 48rpx;
}

.error-icon-wrap {
  width: 120rpx;
  height: 120rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(232, 74, 110, 0.1) 0%, rgba(255, 107, 138, 0.06) 100%);
  border-radius: 50%;
  margin-bottom: 32rpx;
}

.error-icon {
  font-size: 56rpx;
}

.error-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 12rpx;
}

.error-desc {
  font-size: 26rpx;
  color: #8a8a9a;
  margin-bottom: 40rpx;
}

.error-retry-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  border-radius: 44rpx;
  padding: 20rpx 56rpx;
  box-shadow: 0 8rpx 24rpx rgba(232, 74, 110, 0.3);
  transition: transform 0.2s ease;
}

.error-retry-btn:active {
  transform: scale(0.96);
}

.error-retry-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #ffffff;
}

.skeleton-card {
  background: #ffffff;
  border-radius: 28rpx;
  padding: 28rpx;
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.08), 0 4rpx 12rpx rgba(0, 0, 0, 0.04);
  border: 1rpx solid rgba(232, 74, 110, 0.08);
}

.skeleton-block {
  border-radius: 16rpx;
  background: linear-gradient(90deg, #eee5e8 25%, #f6f0f2 37%, #eee5e8 63%);
  background-size: 400% 100%;
  animation: skeletonShimmer 1.4s ease infinite;
}

.skeleton-cover {
  width: 100%;
  height: 360rpx;
  border-radius: 24rpx;
  margin-bottom: 28rpx;
}

.skeleton-line {
  height: 32rpx;
  margin-bottom: 20rpx;
}

.skeleton-line--title {
  width: 50%;
  height: 44rpx;
  margin: 0 auto 28rpx;
}

.skeleton-line--text {
  width: 100%;
}

.skeleton-line--text-short {
  width: 65%;
}

@keyframes skeletonShimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
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

.preview-card--canvas::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 2rpx solid rgba(232, 74, 110, 0.15);
  border-radius: inherit;
  pointer-events: none;
  z-index: 5;
  box-shadow: inset 0 0 40rpx rgba(232, 74, 110, 0.05);
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
  padding: 24rpx;
  margin: 24rpx 32rpx;
  border-radius: 28rpx;
  background: #ffffff;
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.08), 0 4rpx 12rpx rgba(0, 0, 0, 0.04);
  border: 1rpx solid rgba(232, 74, 110, 0.08);
}

.preview-page-section {
  position: relative;
  margin-bottom: 36rpx;
  padding: 20rpx;
  border-radius: 24rpx;
}

.preview-page-section + .preview-page-section::before {
  content: '';
  position: absolute;
  top: -18rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 1rpx;
  background: linear-gradient(90deg, transparent, rgba(232, 74, 110, 0.15), transparent);
}

.preview-page-section--title .section-title {
  font-size: 44rpx;
  font-weight: 700;
  text-align: center;
  color: #1a1a2e;
  line-height: 1.5;
}

.preview-page-section--date .section-date {
  font-size: 30rpx;
  text-align: center;
  color: #6e6e80;
  margin-top: 12rpx;
}

.preview-page-section--image .section-image {
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 24rpx;
  background: #f2f2f7;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.1);
}

.preview-page-section--text .section-text {
  font-size: 30rpx;
  color: #6e6e80;
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
  color: #6e6e80;
}

.preview-page-section--divider .divider-line {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx 0;
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
  color: #6e6e80;
  letter-spacing: 4rpx;
}

.preview-page-section--countdown .countdown-section {
  text-align: center;
  padding: 40rpx 30rpx;
  background: linear-gradient(135deg, rgba(255, 240, 245, 0.6) 0%, rgba(255, 220, 230, 0.4) 100%);
  border-radius: 28rpx;
  position: relative;
  overflow: hidden;
  border: 1rpx solid rgba(232, 74, 110, 0.15);
}

.preview-page-section--countdown .countdown-section::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(232, 74, 110, 0.08) 0%, transparent 60%);
  animation: countdownPulse 3s ease-in-out infinite;
}

@keyframes countdownPulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.1); opacity: 1; }
}

.preview-page-section--countdown .countdown-label {
  display: block;
  font-size: 26rpx;
  color: #8a6a70;
  margin-bottom: 16rpx;
  position: relative;
  z-index: 1;
  letter-spacing: 4rpx;
  font-weight: 500;
}

.preview-page-section--countdown .countdown-days {
  font-size: 96rpx;
  font-weight: 800;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 50%, #d6385c 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1;
  position: relative;
  z-index: 1;
  text-shadow: 0 4rpx 20rpx rgba(232, 74, 110, 0.3);
  filter: drop-shadow(0 4rpx 12rpx rgba(232, 74, 110, 0.25));
  animation: countdownNumPulse 2s ease-in-out infinite;
}

@keyframes countdownNumPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
}

.preview-page-section--countdown .countdown-unit {
  font-size: 32rpx;
  color: #e84a6e;
  margin-left: 12rpx;
  font-weight: 600;
  position: relative;
  z-index: 1;
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

/* 翻页指示器精致样式：圆点 -> 激活时变为椭圆胶囊 */
.flip-swiper :deep(.uni-swiper-dot),
.flip-swiper :deep(.wx-swiper-dot) {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  margin: 0 10rpx;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0.5;
  background: rgba(255, 255, 255, 0.5);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
}

.flip-swiper :deep(.uni-swiper-dot-active),
.flip-swiper :deep(.wx-swiper-dot-active) {
  width: 40rpx;
  height: 14rpx;
  border-radius: 7rpx;
  background: linear-gradient(90deg, #ff6b8a, #e84a6e);
  opacity: 1;
  box-shadow: 0 4rpx 16rpx rgba(232, 74, 110, 0.5), 0 2rpx 8rpx rgba(0, 0, 0, 0.2);
}

.flip-page-card {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #f2f2f7;
}

.flip-page-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  box-shadow: inset 0 0 60rpx rgba(0, 0, 0, 0.08);
  pointer-events: none;
  z-index: 10;
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
  word-break: break-word;
  white-space: pre-wrap;
}

/* Flex 模式 */
.preview-card {
  display: flex;
  flex-direction: column;
  padding: 24rpx 32rpx;
  gap: 24rpx;
}

.preview-card--flex {
  margin: 24rpx 32rpx;
  padding: 28rpx;
  background: #ffffff;
  border-radius: 28rpx;
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.08), 0 4rpx 12rpx rgba(0, 0, 0, 0.04);
  border: 1rpx solid rgba(232, 74, 110, 0.08);
  gap: 24rpx;
}

.preview-image-section {
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.1);
}

.preview-section-image {
  width: 100%;
  min-height: 400rpx;
  aspect-ratio: 3 / 4;
  background: #f2f2f7;
}

.preview-text-section {
  padding: 28rpx;
  background: linear-gradient(135deg, #fff8fa 0%, #ffffff 100%);
  border-radius: 24rpx;
  text-align: center;
  min-height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(232, 74, 110, 0.08);
}

.preview-section-text {
  font-size: 30rpx;
  color: #1a1a2e;
  line-height: 1.6;
}

/* 相似推荐 */
.similar-section {
  padding: 32rpx;
  padding-top: 16rpx;
}

.similar-title-bar {
  margin-bottom: 24rpx;
  position: relative;
  display: inline-block;
}

.similar-bar-text {
  font-size: 32rpx;
  font-weight: 700;
  color: #1a1a2e;
  letter-spacing: 2rpx;
}

.similar-title-underline {
  margin-top: 10rpx;
  width: 60rpx;
  height: 6rpx;
  background: linear-gradient(90deg, #e84a6e 0%, #ff6b8a 100%);
  border-radius: 3rpx;
  box-shadow: 0 2rpx 8rpx rgba(232, 74, 110, 0.4);
}

.similar-list {
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}

.similar-item {
  width: 100%;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
}

.similar-item:active {
  transform: scale(0.96) translateY(-4rpx);
  opacity: 0.95;
}

.similar-image-wrap {
  width: 100%;
  height: 520rpx;
  border-radius: 28rpx;
  overflow: hidden;
  position: relative;
  box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.15), 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}

.similar-item:active .similar-image-wrap {
  box-shadow: 0 8rpx 28rpx rgba(232, 74, 110, 0.2), 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}

.similar-image {
  width: 100%;
  height: 100%;
  transition: transform 0.5s ease;
}

.similar-item:active .similar-image {
  transform: scale(1.05);
}

.similar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.4) 60%, rgba(0, 0, 0, 0.6) 100%);
}

.similar-title {
  font-size: 44rpx;
  color: #ffffff;
  font-weight: bold;
  font-family: STKaiti, KaiTi, serif;
  text-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.4);
}

.similar-sub {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 4rpx;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
}

.similar-stats {
  position: absolute;
  bottom: 24rpx;
  left: 24rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(16rpx);
  -webkit-backdrop-filter: blur(16rpx);
  padding: 12rpx 20rpx;
  border-radius: 24rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.3);
}

.similar-stat-icon { font-size: 22rpx; }

.similar-stat-value {
  font-size: 22rpx;
  color: #fff;
  font-weight: 500;
}

.preview-footer {
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(24rpx);
  -webkit-backdrop-filter: blur(24rpx);
  box-shadow: 0 -4rpx 24rpx rgba(0, 0, 0, 0.08), 0 -1rpx 0 rgba(232, 74, 110, 0.06);
  flex-shrink: 0;
  position: relative;
  z-index: 20;
}

.create-button {
  width: 100%;
  height: 96rpx;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 50%, #e84a6e 100%);
  background-size: 200% 200%;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 32rpx rgba(232, 74, 110, 0.4), 0 4rpx 12rpx rgba(232, 74, 110, 0.25), 0 0 0 1rpx rgba(255, 255, 255, 0.3) inset;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease;
  position: relative;
  overflow: hidden;
  animation: btnGradientShift 4s ease-in-out infinite;
}

@keyframes btnGradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.create-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.45), transparent);
  transform: translateX(-150%) skewX(-15deg);
  animation: btnShimmer 3s ease-in-out infinite;
  pointer-events: none;
}

@keyframes btnShimmer {
  0% { transform: translateX(-150%) skewX(-15deg); }
  60%, 100% { transform: translateX(200%) skewX(-15deg); }
}

.create-button:active {
  transform: scale(0.96);
  box-shadow: 0 6rpx 18rpx rgba(232, 74, 110, 0.35), 0 2rpx 8rpx rgba(232, 74, 110, 0.2);
}

.button-text {
  font-size: 34rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 6rpx;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 1;
}

/* 导出效果对比 */
.watermark-compare {
  margin: 24rpx 32rpx;
  padding: 32rpx;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-radius: 28rpx;
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.08), 0 4rpx 12rpx rgba(0, 0, 0, 0.04);
  border: 1rpx solid rgba(255, 255, 255, 0.6);
  position: relative;
  overflow: hidden;
}

.watermark-compare::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2rpx;
  background: linear-gradient(90deg, transparent, #e84a6e, transparent);
  opacity: 0.3;
}

.compare-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 28rpx;
  letter-spacing: 2rpx;
}

.compare-row {
  display: flex;
  gap: 20rpx;
  margin-bottom: 28rpx;
}

.compare-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
  padding: 24rpx 16rpx;
  background: #f7f7fa;
  border-radius: 24rpx;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  position: relative;
}

.compare-highlight {
  background: linear-gradient(135deg, #fffaf0 0%, #fff5e0 100%);
  border: 2rpx solid rgba(255, 183, 0, 0.5);
  box-shadow: 0 8rpx 28rpx rgba(255, 183, 0, 0.25), 0 0 0 1rpx rgba(255, 215, 0, 0.3) inset;
}

.compare-vip-badge {
  position: absolute;
  top: -2rpx;
  right: 16rpx;
  padding: 4rpx 16rpx;
  background: linear-gradient(135deg, #ffd700 0%, #ffb800 100%);
  color: #8B4513;
  font-size: 20rpx;
  font-weight: 700;
  border-radius: 0 0 12rpx 12rpx;
  letter-spacing: 1rpx;
  box-shadow: 0 4rpx 12rpx rgba(255, 183, 0, 0.4);
  z-index: 2;
}

.compare-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a2e;
}

.compare-highlight .compare-label {
  background: linear-gradient(135deg, #d48806 0%, #fa8c16 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.compare-img {
  width: 100%;
  height: 220rpx;
  border-radius: 20rpx;
  background: #e8e8ed;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}

.compare-img-wrap {
  position: relative;
  width: 100%;
  border-radius: 20rpx;
  overflow: hidden;
}

/* 水印预览图：降低不透明度 + 轻微模糊，模拟低质量效果 */
.compare-img--watermarked {
  opacity: 0.7;
  filter: blur(0.5rpx) brightness(0.95);
}

/* 高清预览图：增强对比度与饱和度，模拟高质量效果 */
.compare-img--hd {
  filter: contrast(1.1) saturate(1.1);
}

/* 水印文字遮罩 */
.compare-watermark-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.12);
  pointer-events: none;
}

.compare-watermark-text {
  font-size: 36rpx;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 700;
  letter-spacing: 8rpx;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
  transform: rotate(-20deg);
  border: 2rpx solid rgba(255, 255, 255, 0.6);
  padding: 8rpx 20rpx;
  border-radius: 12rpx;
}

/* 高清角标 */
.compare-hd-badge {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  padding: 4rpx 14rpx;
  background: linear-gradient(135deg, #f5d76e 0%, #f5a623 100%);
  color: #1a0f2e;
  font-size: 20rpx;
  font-weight: 700;
  border-radius: 8rpx;
  box-shadow: 0 2rpx 8rpx rgba(245, 166, 35, 0.4);
}

.compare-desc {
  font-size: 22rpx;
  color: #6e6e80;
}

.compare-highlight .compare-desc {
  color: #d48806;
  font-weight: 500;
}

.compare-action {
  display: flex;
  gap: 20rpx;
}

.btn-primary {
  flex: 1;
  height: 88rpx;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  color: #fff;
  border-radius: 44rpx;
  font-size: 28rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  line-height: 1;
  box-shadow: 0 8rpx 24rpx rgba(232, 74, 110, 0.35), 0 2rpx 8rpx rgba(232, 74, 110, 0.2);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease;
  position: relative;
  overflow: hidden;
  letter-spacing: 2rpx;
}

.btn-primary:active {
  transform: scale(0.96);
  box-shadow: 0 4rpx 14rpx rgba(232, 74, 110, 0.3);
}

.btn-primary::after {
  border: none;
}

.btn-secondary {
  flex: 1;
  height: 88rpx;
  background: #ffffff;
  color: #6e6e80;
  border-radius: 44rpx;
  font-size: 28rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid #e8e8ed;
  line-height: 1;
  transition: transform 0.2s ease, background-color 0.2s ease;
}

.btn-secondary:active {
  transform: scale(0.96);
  background: #f7f7fa;
}

.btn-secondary::after {
  border: none;
}

/* 商城推荐 */
.shop-recommend-preview {
  margin: 24rpx 32rpx;
  padding: 28rpx;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-radius: 28rpx;
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.08), 0 4rpx 12rpx rgba(0, 0, 0, 0.04);
  border: 1rpx solid rgba(255, 255, 255, 0.6);
}

.shop-rec-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.shop-rec-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1a1a2e;
  letter-spacing: 2rpx;
}

.shop-rec-more {
  font-size: 24rpx;
  color: #e84a6e;
  transition: opacity 0.2s ease;
  font-weight: 500;
}

.shop-rec-more:active {
  opacity: 0.6;
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
  gap: 10rpx;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.shop-rec-card:active {
  transform: scale(0.94) translateY(-4rpx);
}

.shop-rec-img {
  width: 200rpx;
  height: 200rpx;
  border-radius: 24rpx;
  background: #f2f2f7;
  box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s ease;
}

.shop-rec-card:active .shop-rec-img {
  box-shadow: 0 4rpx 12rpx rgba(232, 74, 110, 0.2);
}

.shop-rec-name {
  font-size: 24rpx;
  color: #1a1a2e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.shop-rec-price {
  font-size: 28rpx;
  color: #e84a6e;
  font-weight: 700;
  position: relative;
  display: inline-block;
}

.shop-rec-price::before {
  content: '¥';
  font-size: 22rpx;
  margin-right: 2rpx;
}

/* VIP 提示条：精致金色渐变 */
.vip-bar {
  padding: 22rpx 32rpx;
  background: linear-gradient(135deg, #fff1b8 0%, #ffd700 25%, #ffb800 50%, #ffa000 75%, #ff8c00 100%);
  background-size: 200% 200%;
  display: flex;
  align-items: center;
  gap: 14rpx;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8rpx 32rpx rgba(255, 160, 0, 0.35), 0 2rpx 8rpx rgba(255, 183, 0, 0.2);
  animation: vipBarPulse 2.5s ease-in-out infinite;
}

@keyframes vipBarPulse {
  0%, 100% { box-shadow: 0 8rpx 32rpx rgba(255, 160, 0, 0.35), 0 2rpx 8rpx rgba(255, 183, 0, 0.2); }
  50% { box-shadow: 0 12rpx 40rpx rgba(255, 160, 0, 0.5), 0 4rpx 12rpx rgba(255, 183, 0, 0.3); }
}

/* 光泽扫过动画 - 使用 transform 代替 left 以优化性能 */
.vip-bar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 60%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
  transform: translateX(-170%);
  animation: vipGloss 3s ease-in-out infinite;
  pointer-events: none;
}

@keyframes vipGloss {
  0% { transform: translateX(-170%); }
  60%, 100% { transform: translateX(170%); }
}

.vip-bar::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(ellipse at center top, rgba(255, 255, 255, 0.3) 0%, transparent 60%);
  pointer-events: none;
}

.vip-bar .vip-icon {
  font-size: 36rpx;
  color: #fff;
  text-shadow: 0 2rpx 8rpx rgba(180, 100, 0, 0.4);
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 2rpx 4rpx rgba(0, 0, 0, 0.2));
}

.vip-bar .vip-text {
  flex: 1;
  font-size: 26rpx;
  color: #fff;
  font-weight: 600;
  text-shadow: 0 2rpx 8rpx rgba(180, 100, 0, 0.35);
  position: relative;
  z-index: 1;
  line-height: 1.4;
}

.vip-bar .vip-btn {
  font-size: 26rpx;
  color: #d48806;
  font-weight: 700;
  background: linear-gradient(135deg, #ffffff 0%, #fff8e1 100%);
  padding: 10rpx 24rpx;
  border-radius: 28rpx;
  position: relative;
  z-index: 1;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 4rpx 12rpx rgba(180, 100, 0, 0.25);
  letter-spacing: 1rpx;
}

.vip-bar:active .vip-btn {
  transform: scale(0.94);
  box-shadow: 0 2rpx 6rpx rgba(180, 100, 0, 0.2);
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

/* 缩放控制：毛玻璃效果 */
.zoom-controls {
  position: fixed;
  right: 24rpx;
  bottom: 240rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  z-index: 50;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(24rpx);
  -webkit-backdrop-filter: blur(24rpx);
  border-radius: 44rpx;
  padding: 18rpx 14rpx;
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.15), 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
  border: 1rpx solid rgba(255, 255, 255, 0.7);
}

.zoom-btn {
  width: 68rpx;
  height: 68rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255, 107, 138, 0.15) 0%, rgba(232, 74, 110, 0.1) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 2rpx 8rpx rgba(232, 74, 110, 0.1);
}

.zoom-btn:active {
  transform: scale(0.85);
  background: linear-gradient(135deg, #ff6b8a 0%, #e84a6e 100%);
  box-shadow: 0 4rpx 12rpx rgba(232, 74, 110, 0.3);
}

.zoom-btn:active .zoom-btn-text {
  color: #ffffff;
}

.zoom-btn-text {
  font-size: 40rpx;
  color: #e84a6e;
  font-weight: 700;
  line-height: 1;
  transition: color 0.2s ease;
}

.zoom-reset {
  background: linear-gradient(135deg, rgba(232, 74, 110, 0.2) 0%, rgba(214, 56, 92, 0.15) 100%);
}

.zoom-reset .zoom-btn-text {
  font-size: 22rpx;
  font-weight: 700;
}

.zoom-level {
  font-size: 20rpx;
  color: #e84a6e;
  font-weight: 600;
}

/* ============ 入场动画 ============ */
.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-fade-up {
  animation: fadeUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  opacity: 0;
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(30rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-scale {
  animation: fadeScale 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  opacity: 0;
}

@keyframes fadeScale {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-slide-down {
  animation: slideDown 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  opacity: 0;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-up {
  animation: slideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  opacity: 0;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-stagger-item {
  animation: staggerFadeUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  opacity: 0;
}

@keyframes staggerFadeUp {
  from {
    opacity: 0;
    transform: translateY(20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ===== 按钮 loading 态 ===== */
.btn--loading {
  opacity: 0.7;
  pointer-events: none;
}

.btn-loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
}

.btn-loading-spinner {
  width: 28rpx;
  height: 28rpx;
  border: 3rpx solid rgba(232, 74, 110, 0.2);
  border-top-color: #e84a6e;
  border-radius: 50%;
  animation: btnSpin 0.6s linear infinite;
}

@keyframes btnSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
