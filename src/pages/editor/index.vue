<template>
  <view class="editor-page">
    <!-- Header -->
    <view class="editor-header">
      <view class="header-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="header-title">编辑器</text>
      <view class="header-right"></view>
    </view>

    <!-- Body: 全屏画布 + 浮动右侧面板 / 横屏模式：上预览 + 下编辑 -->
    <view v-if="editorStore.templateLoading" class="loading-overlay">
      <text class="loading-overlay-text">加载模板中...</text>
    </view>
    <view v-else class="editor-body" :class="{ 'editor-body--landscape': isLandscape }">
      <!-- 预览区：全屏宽度 -->
      <view class="preview-area" :class="{ 'preview-area--landscape': isLandscape }">
        <scroll-view class="preview-scroll" scroll-y>
          <!-- 画布模式：admin 发布的绝对定位模板 -->
          <template v-if="isCanvasMode">
            <!-- 编辑器始终显示可编辑元素，不使用 renderedImage -->
            <view class="preview-card preview-card--canvas" :style="{ ...canvasCardStyle, ...canvasBackgroundStyle }">
              <view
                v-for="(el, idx) in editorStore.editableElements" :key="idx"
                class="canvas-element"
                :class="{
                  'active-element': editorStore.selectedElement === idx,
                  'text-element': el.type === 'text',
                  'non-editable': el.editable === false,
                  'canvas-element--no-interact': el.editable === false
                }"
                :style="getCanvasElementStyle(el)"
                @click="el.editable === false ? null : onOpenEditor(idx)"
              >
                <image
                  v-if="el.type === 'image'"
                  class="canvas-image"
                  :src="el.text"
                  mode="aspectFit"
                  @error="onImageError"
                />
                <text
                  v-else-if="el.type === 'text'"
                  class="canvas-text"
                  :style="getTextStyle(el)"
                >{{ resolveText(el.text) }}</text>
              </view>
            </view>
          </template>
          <!-- Flex 模式：静态模板的垂直排列 -->
          <template v-else>
            <view class="preview-card preview-card--flex">
              <block v-for="(el, idx) in editorStore.editableElements" :key="idx">
                <view
                  v-if="el.type === 'image'"
                  class="section image-section"
                  :class="{ 'active-section': el.editable !== false && editorStore.selectedElement === idx, 'non-editable': el.editable === false }"
                  @click="el.editable === false ? null : onOpenEditor(idx)"
                >
                  <image
                    class="section-image"
                    :src="el.text"
                    mode="aspectFill"
                    @error="onImageError"
                  ></image>
                  <view v-if="idx === 0" class="image-overlay">
                    <text class="overlay-label">{{ templateName }}</text>
                  </view>
                </view>
                <view
                  v-else-if="el.type === 'text'"
                  class="section text-section"
                  :class="{ 'active-section': el.editable !== false && editorStore.selectedElement === idx, 'non-editable': el.editable === false }"
                  @click="el.editable === false ? null : onOpenEditor(idx)"
                >
                  <text
                    class="section-text"
                    :style="getTextStyle(el)"
                  >{{ resolveText(el.text) }}</text>
                </view>
              </block>
            </view>
          </template>
        </scroll-view>
      </view>

      <!-- 右侧浮动编辑面板（竖屏模式） -->
      <view v-if="!isLandscape" class="sidebar-area">
        <view class="sidebar-main">
          <RightPanel
            :active-panel-tab="editorStore.activePanelTab"
            :editable-elements="editorStore.editableElements"
            :selected-element="editorStore.selectedElement"
            :material-list="editorStore.materialList"
            :settings="templateStore.settings"
            mode="sidebar"
            @update:active-panel-tab="editorStore.activePanelTab = $event"
            @open-editor="onOpenEditor"
            @select-material="onSelectMaterial"
            @toggle-setting="toggleSetting"
          />
        </view>
        <!-- 商城推荐 -->
        <view class="shop-recommend" v-if="recommendProducts.length > 0">
          <view class="shop-rec-title">\u{1F6D2} 婚礼推荐</view>
          <view class="shop-rec-list">
            <view v-for="product in recommendProducts.slice(0, 3)" :key="product.id" class="shop-rec-item" @click="goToShop(product)">
              <image class="shop-rec-img" :src="product.image" mode="aspectFill" />
              <text class="shop-rec-name">{{ product.name }}</text>
              <text class="shop-rec-price">{{ product.price }}元</text>
            </view>
          </view>
        </view>
      </view>
      <!-- 底部面板（横屏模式） -->
      <view v-else class="bottom-panel">
        <RightPanel
          :active-panel-tab="editorStore.activePanelTab"
          :editable-elements="editorStore.editableElements"
          :selected-element="editorStore.selectedElement"
          :material-list="editorStore.materialList"
          :settings="templateStore.settings"
          mode="bottom"
          @update:active-panel-tab="editorStore.activePanelTab = $event"
          @open-editor="onOpenEditor"
          @select-material="onSelectMaterial"
          @toggle-setting="toggleSetting"
        />
      </view>
    </view>

    <!-- Footer Toolbar -->
    <view class="editor-footer">
      <view class="footer-item" @click="handleMusic">
        <text class="footer-icon">🎵</text>
        <text class="footer-label">音乐</text>
      </view>
      <view class="footer-item" @click="handleSettings">
        <text class="footer-icon">⚙️</text>
        <text class="footer-label">设置</text>
      </view>
      <view class="footer-item" @click="openBasicInfoEditor">
        <text class="footer-icon">📋</text>
        <text class="footer-label">基本信息</text>
      </view>
      <view class="footer-item" @click="openQuickEdit">
        <text class="footer-icon">✏️</text>
        <text class="footer-label">快捷填写</text>
      </view>
      <view class="footer-item" @click="handleSave">
        <text class="footer-icon">💾</text>
        <text class="footer-label">保存</text>
      </view>
      <view class="footer-item" @click="handleExport">
        <text class="footer-icon">📤</text>
        <text class="footer-label">导出</text>
      </view>
      <view class="footer-share-btn" @click="handleShare">
        <text class="share-btn-text">预览分享</text>
      </view>
    </view>

    <!-- Text Editor Popup -->
    <TextEditorPopup
      v-if="editorStore.showTextEditor"
      :visible="editorStore.showTextEditor"
      :editing-text="editorStore.editingText"
      @input="(v: string) => editorStore.editingText = v"
      @close="editorStore.closeTextEditor"
      @confirm="editorStore.confirmTextEdit"
    />

    <!-- Basic Info Popup -->
    <BasicInfoForm
      v-if="editorStore.showBasicInfoEditor"
      :visible="editorStore.showBasicInfoEditor"
      :basic-info="basicInfo"
      @close="editorStore.closeBasicInfoEditor"
      @confirm="editorStore.closeBasicInfoEditor"
      @location="handleLocation"
    />

    <!-- Quick Edit Popup -->
    <QuickEditForm
      v-if="editorStore.showQuickEdit"
      :visible="editorStore.showQuickEdit"
      :elements="editorStore.editableElements"
      :template-data="templateStore.templateData"
      @close="editorStore.closeQuickEdit"
      @update="onSmartFieldUpdate"
    />

  </view>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, nextTick, watch } from 'vue'
import { useTemplateStore } from '@/stores/template'
import { useEditorStore } from '@/stores/editor'
import { useWorksStore } from '@/stores/works'
import { useUserStore } from '@/stores/user'
import { DEFAULT_TEMPLATE_ID } from '@/constants/templates'
import { loadFontsForElements } from '@/stores/editor'
import { track } from '@/utils/track'
import { resolveDatePlaceholders } from '@/utils/placeholders'
import { useCanvasRender } from '@/composables/useCanvasRender'
import { useGoBack } from '@/composables/useGoBack'
import { exportInvitation, fetchRecommendProducts } from '@/api'
import RightPanel from './components/RightPanel.vue'
import TextEditorPopup from './components/TextEditorPopup.vue'
import BasicInfoForm from './components/BasicInfoForm.vue'
import QuickEditForm from './components/QuickEditForm.vue'
import type { Material, EditableElement, Work } from '@/types'

const templateStore = useTemplateStore()
const editorStore = useEditorStore()
const worksStore = useWorksStore()
const userStore = useUserStore()

const {
  isCanvasMode,
  isLandscape,
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

const editProgress = ref(0)
const hasShownProgressPopup = ref(false)
const editStartTime = ref(Date.now())

const templateName = computed(() => {
  return templateStore.templateData.coverTitle || '请柬'
})

const basicInfo = computed(() => templateStore.basicInfo)

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

// 计算编辑完成度
function calculateProgress(): number {
  const elements = editorStore.editableElements
  if (!elements.length) return 0
  let completed = 0
  elements.forEach(el => {
    if (el.type === 'text' && el.text && el.text.trim()) completed++
    if (el.type === 'image' && el.text && !el.text.includes('default')) completed++
  })
  // 基本信息也算进度
  if (templateStore.basicInfo?.groomName || templateStore.basicInfo?.brideName) completed += 2
  return Math.min(100, Math.round((completed / (elements.length + 2)) * 100))
}

// 监听进度变化
watch(editProgress, (val) => {
  if (val >= 30 && val < 40 && !hasShownProgressPopup.value && !userStore.isVip()) {
    hasShownProgressPopup.value = true
    showProgressPopup()
  }
})

// 30% 完成度弹窗
function showProgressPopup() {
  track('edit_progress_30', { elapsed_time: Date.now() - editStartTime.value })
  uni.showModal({
    title: '\u{1F389} 您的请柬已初具雏形',
    content: '解锁高级模板、去水印导出、高清大图，让请柬更完美',
    confirmText: '解锁全部 9.9元/月',
    cancelText: '继续免费编辑',
    success: (res) => {
      if (res.confirm) {
        track('click_unlock_vip', { trigger_point: 'edit_progress_30' })
        uni.navigateTo({ url: '/pages/vip/index' })
      }
    }
  })
}

// 打开编辑器
function onOpenEditor(idx: number) {
  const el = editorStore.editableElements[idx]
  if (!el || el.editable === false) return

  // 付费元素拦截
  if (el.isPremium && !userStore.isVip()) {
    track('click_premium_element', { element_type: el.type })
    uni.showModal({
      title: '\u{1F512} 高级素材',
      content: '该素材为 VIP 专属，开通 VIP 立即可用',
      confirmText: '开通VIP',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          uni.navigateTo({ url: '/pages/vip/index' })
        }
      }
    })
    return
  }

  track('edit_element_click', { element_type: el.type })
  editorStore.selectedElement = idx

  if (el.type === 'image') {
    // 图片 - 直接让用户选择本地图片
    chooseLocalImage(idx)
  } else if (el.type === 'text') {
    // 文字 - 打开文字编辑器
    editorStore.editingText = el.text
    editorStore.showTextEditor = true
  }
}

// 选择本地图片
function chooseLocalImage(idx: number) {
  // 微信小程序端
  // #ifdef MP-WEIXIN
  uni.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sourceType: ['album', 'camera'],
    success: (res: any) => {
      if (res.tempFiles && res.tempFiles.length > 0) {
        editorStore.applyImageToElement(idx, res.tempFiles[0].tempFilePath)
      }
    },
    fail: () => {
      uni.showToast({ title: '图片选择失败', icon: 'none' })
    },
  })
  // #endif

  // H5 / App 端
  // #ifndef MP-WEIXIN
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res: any) => {
      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        editorStore.applyImageToElement(idx, res.tempFilePaths[0])
      }
    },
    fail: () => {
      uni.showToast({ title: '图片选择失败', icon: 'none' })
    },
  })
  // #endif
}

// 选择素材
function onSelectMaterial(material: Material) {
  if (editorStore.selectedElement === null) return
  const idx = editorStore.selectedElement
  editorStore.applyImageToElement(idx, material.url)
}

// 打开基本信息编辑器
function openBasicInfoEditor() {
  editorStore.showBasicInfoEditor = true
}

function openQuickEdit() {
  editorStore.openQuickEdit()
}

function onSmartFieldUpdate(key: string, value: string) {
  editorStore.syncSmartField(key, value)
}

// 切换设置
function toggleSetting(key: string) {
  templateStore.toggleSetting(key)
}

const goBack = useGoBack()

function onImageError(e: any) {
  console.warn('Editor image load failed')
}

function handleMusic() {
  uni.navigateTo({ url: '/pages/music/index' })
}

function handleSettings() {
  uni.showActionSheet({
    itemList: ['礼物功能', '礼金功能', '点赞功能', '相册功能'],
    success: (res: any) => {
      const keys = ['giftAlbum', 'moneyGift', 'like', 'album']
      const key = keys[res.tapIndex]
      if (key) toggleSetting(key)
    },
  })
}

function handleSave() {
  track('edit_save', { progress: editProgress.value })
  if (editorStore.currentWorkId) {
    const existing = worksStore.works.find(w => w.id === editorStore.currentWorkId)
    if (existing) {
      existing.title = templateStore.templateData.coverTitle || '未命名作品'
      existing.date = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })
      existing.image = templateStore.templateData.coverImage
      existing.templateType = editorStore.currentTemplateId
      worksStore.saveAsWork(existing)
      uni.showToast({ title: '已保存', icon: 'success' })
      return
    }
  }
  const id = editorStore.currentWorkId || Date.now()
  if (!editorStore.currentWorkId) {
    editorStore.setCurrentWorkId(id)
  }
  const work: Work = {
    id,
    title: templateStore.templateData.coverTitle || '未命名作品',
    date: new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }),
    image: templateStore.templateData.coverImage,
    templateType: editorStore.currentTemplateId,
    status: 'draft',
  }
  worksStore.saveAsWork(work)
  uni.showToast({ title: '已保存', icon: 'success' })
}

function handleExport() {
  track('click_export')
  if (userStore.isVip()) {
    // VIP：直接高清无水印导出
    doExport({ watermark: false, quality: 'high' })
  } else {
    // 免费用户：弹出选择
    uni.showActionSheet({
      title: '选择导出方式',
      itemList: ['\u{1F4E6} 高清无水印导出（3元）', '\u{1F4E6} 免费导出（带水印）'],
      success: (res: any) => {
        if (res.tapIndex === 0) {
          track('click_export', { export_type: 'paid' })
          // 跳转支付流程（简化版：直接提示）
          uni.showModal({
            title: '高清导出',
            content: '支付 3 元即可高清无水印导出',
            confirmText: '立即支付',
            success: (r) => {
              if (r.confirm) {
                // TODO: 调用微信支付
                doExport({ watermark: false, quality: 'high' })
              }
            }
          })
        } else {
          track('click_export', { export_type: 'free' })
          doExport({ watermark: true, quality: 'normal' })
        }
      }
    })
  }
}

async function doExport(options: { watermark: boolean; quality: string }) {
  uni.showLoading({ title: '导出中...' })
  try {
    const res = await exportInvitation(String(editorStore.currentWorkId), options)
    uni.hideLoading()
    uni.showToast({ title: options.watermark ? '已导出（带水印）' : '高清导出成功', icon: 'success' })
    // 可以下载图片
    uni.downloadFile({ url: res.url, success: (r) => {
      uni.saveImageToPhotosAlbum({ filePath: r.tempFilePath })
    }})
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: '导出失败', icon: 'none' })
  }
}

function handleShare() {
  handleSave()
  const templateId = editorStore.currentTemplateId
  if (templateId) {
    uni.navigateTo({ url: `/pages/share/index?templateId=${templateId}` })
  } else {
    uni.navigateTo({ url: '/pages/share/index' })
  }
}

// 商城推荐数据
const recommendProducts = ref<Array<{ id: string; name: string; price: number; image: string; category: string }>>([])

// 根据模板分类映射商品分类
function getCategoryByTemplate(): string {
  const category = (templateStore.templateData as any).category || '婚礼'
  if (category.includes('婚礼')) return '婚礼饰品/摄影'
  if (category.includes('割礼')) return '仪式用品'
  if (category.includes('生日')) return '生日派对用品'
  if (category.includes('节日')) return '节日装饰品'
  return '婚礼饰品/摄影'
}

// 加载推荐商品
async function loadRecommendProducts() {
  const category = getCategoryByTemplate()
  try {
    const data = await fetchRecommendProducts(category)
    if (data && Array.isArray(data)) {
      recommendProducts.value = data
    }
  } catch (e) {
    console.warn('加载推荐商品失败:', e)
  }
}

function goToShop(product: { id: string; name: string; price: number; image: string; category: string }) {
  track('click_shop_recommend', { product_id: product.id, product_name: product.name, price: product.price })
  uni.navigateTo({ url: `/pages/mall/index?productId=${product.id}` })
}

function handleLocation() {
  uni.chooseLocation({
    success: (res) => {
      templateStore.basicInfo.location = res.name
      templateStore.basicInfo.detailAddress = res.address
    }
  })
}

onMounted(() => {
  editStartTime.value = Date.now()
  const pages = getCurrentPages()
  const curPage = pages[pages.length - 1] as any
  const options = curPage?.options || {}

  if (options.templateId) {
    editorStore.loadTemplateById(options.templateId)
    track('edit_start', { template_id: options.templateId })
  } else {
    editorStore.loadTemplateById(DEFAULT_TEMPLATE_ID)
    track('edit_start', { template_id: DEFAULT_TEMPLATE_ID })
  }

  nextTick(() => {
    setTimeout(() => updateCardSize(), 100)
  })

  loadRecommendProducts()
})

watch(isLandscape, () => {
  nextTick(() => updateCardSize())
})

watch(() => editorStore.templateLoading, (loading) => {
  if (!loading) {
    nextTick(() => {
      setTimeout(() => updateCardSize(), 100)
      loadFontsForElements(editorStore.editableElements as any)
    })
  }
})

watch(() => editorStore.editableElements.length, () => {
  nextTick(() => updateCardSize())
})

// 监听元素内容变化，更新完成度
watch(() => editorStore.editableElements, () => {
  editProgress.value = calculateProgress()
}, { deep: true })
</script>

<style lang="scss" scoped>
.editor-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #fdf6f8 0%, #fef9fa 100%);
}

/* Header */
.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  background: #fff;
  border-bottom: 1rpx solid #f0e0e5;
  flex-shrink: 0;
}

.header-back {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 48rpx;
  color: #333;
  font-weight: 300;
}

.header-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #333;
}

.header-right {
  width: 60rpx;
}

/* Body */
.editor-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

/* Preview Area - 全屏宽度 */
.preview-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 0;
  overflow: hidden;
  min-height: 0;
  min-width: 0;
}

.preview-scroll {
  flex: 1;
  height: 100%;
  min-height: 0;
}

.preview-card {
  display: flex;
  flex-direction: column;
  padding: 16rpx;
  gap: 20rpx;
}

.section {
  position: relative;
  width: 100%;
}

/* 图片区块 */
.image-section {
  border-radius: 12rpx;
  overflow: hidden;
}

.section-image {
  width: 100%;
  min-height: 400rpx;
  aspect-ratio: 3 / 4;
  background: #f5f5f5;
}

.image-overlay {
  position: absolute;
  bottom: 20rpx;
  left: 0;
  right: 0;
  text-align: center;
}

.overlay-label {
  font-size: 28rpx;
  color: #fff;
  font-weight: 600;
  text-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.5);
}

/* 文字区块 */
.text-section {
  padding: 20rpx;
  background: #fff;
  border-radius: 12rpx;
  text-align: center;
  min-height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.section-text {
  font-size: 30rpx;
  color: #333;
  line-height: 1.6;
}

/* 高亮样式 */
.active-section {
  outline: 4rpx solid #e84a6e;
  outline-offset: 4rpx;
}

/* ===== 画布模式 ===== */
.preview-card--canvas {
  display: block;
  padding: 0;
  gap: 0;
  position: relative;
  border-radius: 0;
  overflow: hidden;
  margin: 0;
}

.canvas-element {
  overflow: hidden;
}
.canvas-element.text-element {
  overflow: hidden;
}

.rendered-image {
  width: 100%;
  display: block;
}

.canvas-image {
  width: 100%;
  height: 100%;
  display: block;
}

.canvas-text {
  display: block;
  word-break: break-word;
}

.non-editable {
  cursor: default;
  opacity: 1;
}

.canvas-element--no-interact {
  pointer-events: none;
}

.active-element {
  outline: 4rpx solid #e84a6e;
  outline-offset: -4rpx;
}

/* Sidebar Area - 右侧浮动编辑面板 */
.sidebar-area {
  position: fixed;
  right: 0;
  top: 100rpx;
  bottom: 120rpx;
  width: 320rpx;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-left: 1rpx solid #f0e0e5;
  box-shadow: -4rpx 0 20rpx rgba(0, 0, 0, 0.08);
  z-index: 100;
  overflow: hidden;
}

/* Bottom Panel - 横屏模式下底部编辑面板 */
.bottom-panel {
  flex-shrink: 0;
  background: #fff;
  border-top: 1rpx solid #f0e0e5;
  border-radius: 16rpx 16rpx 0 0;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.06);
  min-height: 200rpx;
  max-height: 340rpx;
  overflow: hidden;
}

/* 横屏模式布局 */
.editor-body--landscape {
  flex-direction: column;
  gap: 0;
  padding: 0;
}

.preview-area--landscape {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fdf6f8 0%, #fef9fa 100%);
  padding: 20rpx 16rpx;
  min-height: 0;
}

/* Footer Toolbar */
.editor-footer {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  background: #fff;
  border-top: 1rpx solid #f0e0e5;
  flex-shrink: 0;
}

.footer-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 24rpx;
  gap: 6rpx;
}

.footer-icon {
  font-size: 40rpx;
}

.footer-label {
  font-size: 22rpx;
  color: #666;
}

.footer-share-btn {
  flex: 1;
  margin-left: 20rpx;
  padding: 24rpx 0;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  border-radius: 50rpx;
  text-align: center;
}

.share-btn-text {
  font-size: 28rpx;
  color: #fff;
  font-weight: 600;
}

.loading-overlay {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fdf6f8;
}

.loading-overlay-text {
  font-size: 28rpx;
  color: #999;
}

/* Sidebar 主内容区 */
.sidebar-main {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 商城推荐 */
.shop-recommend {
  flex-shrink: 0;
  background: #fff;
  border-top: 1rpx solid #f0e0e5;
  padding: 16rpx;
  margin-top: 8rpx;
  border-radius: 12rpx;
}

.shop-rec-title {
  font-size: 22rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 12rpx;
}

.shop-rec-list {
  display: flex;
  gap: 12rpx;
  overflow-x: auto;
}

.shop-rec-item {
  flex-shrink: 0;
  width: 140rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.shop-rec-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: 10rpx;
  background: #f5f5f5;
}

.shop-rec-name {
  font-size: 18rpx;
  color: #333;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.shop-rec-price {
  font-size: 18rpx;
  color: #e84a6e;
  font-weight: 600;
}

</style>
