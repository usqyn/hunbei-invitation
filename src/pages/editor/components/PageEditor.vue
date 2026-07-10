<template>
  <view class="page-editor">
    <!-- 顶部导航 -->
    <view class="editor-header">
      <view class="header-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="header-title">编辑请柬</text>
      <view class="header-actions">
        <text class="header-action" @click="handleUndo">↩</text>
        <text class="header-action" @click="handleRedo">↪</text>
      </view>
    </view>

    <!-- 主预览区：全屏滚动 -->
    <scroll-view class="preview-scroll" scroll-y>
      <view class="preview-card" :style="canvasBackgroundStyle">
        <view
          v-for="(sec, idx) in editorStore.pageSections"
          :key="sec.id"
          class="page-section"
          :class="[
            `page-section--${sec.type}`,
            { 'page-section--active': editorStore.activeSectionId === sec.id },
            { 'page-section--non-editable': sec.editable === false }
          ]"
          @click="onSectionClick(sec)"
        >
          <template v-if="sec.type === 'title'">
            <text class="section-title" :style="getTextStyle(sec)">{{ sec.text || sec.placeholder || '请输入标题' }}</text>
          </template>
          <template v-else-if="sec.type === 'date'">
            <text class="section-date" :style="getTextStyle(sec)">{{ sec.text || sec.placeholder || 'YYYY/MM/DD' }}</text>
          </template>
          <template v-else-if="sec.type === 'image'">
            <image
              class="section-image"
              :src="sec.image || '/static/images/icons/img-placeholder.svg'"
              mode="aspectFit"
              @error="onImageError"
            />
            <view v-if="!sec.image" class="image-placeholder">
              <text class="placeholder-icon">📷</text>
              <text class="placeholder-text">{{ sec.placeholder || '点击上传照片' }}</text>
            </view>
          </template>
          <template v-else-if="sec.type === 'text'">
            <text class="section-text" :style="getTextStyle(sec)">{{ sec.text || sec.placeholder || '请输入正文内容' }}</text>
          </template>
          <template v-else-if="sec.type === 'location'">
            <view class="location-row">
              <text class="location-icon">📍</text>
              <text class="location-text" :style="getTextStyle(sec)">{{ sec.text || sec.placeholder || '请输入地址' }}</text>
            </view>
          </template>
          <template v-else-if="sec.type === 'rsvp'">
            <view class="rsvp-section">
              <text class="rsvp-title">RSVP</text>
              <view class="rsvp-form">
                <view class="form-item">
                  <text class="form-label">姓名</text>
                  <input class="form-input" placeholder="请输入姓名" />
                </view>
                <view class="form-item">
                  <text class="form-label">出席人数</text>
                  <input class="form-input" type="number" placeholder="请输入人数" />
                </view>
                <view class="rsvp-submit">提交</view>
              </view>
            </view>
          </template>
          <template v-else-if="sec.type === 'map'">
            <view class="map-section">
              <image
                class="map-image"
                src="/static/images/icons/map-placeholder.svg"
                mode="aspectFit"
              />
              <text class="map-address">{{ sec.text || '请输入地址' }}</text>
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
    </scroll-view>

    <!-- 底部工具栏 -->
    <view class="editor-footer">
      <!-- 选中元素时的上下文工具栏 -->
      <view v-if="editorStore.activeSectionId !== null" class="context-toolbar">
        <view class="ctx-btn" @click="handleEditSection">
          <text class="ctx-icon">✏️</text>
          <text class="ctx-label">编辑</text>
        </view>
        <view v-if="activeSection?.type === 'image'" class="ctx-btn" @click="handleReplaceImage">
          <text class="ctx-icon">🖼️</text>
          <text class="ctx-label">换图</text>
        </view>
        <view class="ctx-btn" :class="{ 'ctx-btn--disabled': !editorStore.canUndo }" @click="handleUndo">
          <text class="ctx-icon">↩</text>
          <text class="ctx-label">撤销</text>
        </view>
        <view class="ctx-btn" :class="{ 'ctx-btn--disabled': !editorStore.canRedo }" @click="handleRedo">
          <text class="ctx-icon">↪</text>
          <text class="ctx-label">重做</text>
        </view>
        <view class="ctx-btn ctx-btn--danger" @click="deselectSection">
          <text class="ctx-icon">✕</text>
          <text class="ctx-label">取消</text>
        </view>
      </view>
      <!-- 底部主操作区 -->
      <view class="footer-main">
        <view class="footer-tabs">
          <view class="footer-tab" @click="openUnifiedEdit">
            <text class="tab-icon">📋</text>
            <text class="tab-label">信息</text>
          </view>
          <view class="footer-tab" @click="handleEditSection">
            <text class="tab-icon">✏️</text>
            <text class="tab-label">文字</text>
          </view>
          <view class="footer-tab" @click="handleReplaceImage">
            <text class="tab-icon">🖼️</text>
            <text class="tab-label">图片</text>
          </view>
          <view class="footer-tab" @click="handleMusic">
            <text class="tab-icon">🎵</text>
            <text class="tab-label">音乐</text>
          </view>
          <view class="footer-tab" @click="handleMore">
            <text class="tab-icon">⋯</text>
            <text class="tab-label">更多</text>
          </view>
        </view>
        <view class="footer-actions">
          <view class="footer-action-btn footer-save-btn" @click="handleSave">
            <text class="action-btn-text">保存</text>
          </view>
          <view class="footer-action-btn footer-share-btn" @click="handleShare">
            <text class="action-btn-text">预览分享</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 文本编辑弹窗 -->
    <TextEditorPopup
      v-if="editorStore.showSectionTextEditor"
      :visible="editorStore.showSectionTextEditor"
      :editing-text="editorStore.editingText"
      @input="(v: string) => editorStore.editingText = v"
      @close="editorStore.closeSectionTextEditor"
      @confirm="onTextEditorConfirm"
    />

    <!-- 统一编辑表单 -->
    <UnifiedEditForm
      v-if="editorStore.showBasicInfoEditor"
      :visible="editorStore.showBasicInfoEditor"
      :basic-info="templateStore.basicInfo"
      :elements="editorStore.pageSections as any"
      :template-data="templateStore.templateData"
      @close="onUnifiedEditCancel"
      @confirm="onUnifiedEditConfirm"
      @update="onSmartFieldUpdate"
      @location="handleLocation"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useTemplateStore } from '@/stores/template'
import { useWorksStore } from '@/stores/works'
import { useCanvasRender } from '@/composables/useCanvasRender'
import { useGoBack } from '@/composables/useGoBack'
import { uploadImage } from '@/api'
import TextEditorPopup from './TextEditorPopup.vue'
import UnifiedEditForm from './UnifiedEditForm.vue'
import type { PageSection, Work } from '@/types'

const editorStore = useEditorStore()
const templateStore = useTemplateStore()
const worksStore = useWorksStore()
const goBack = useGoBack()

const { canvasBackgroundStyle, getTextStyle } = useCanvasRender({
  getElements: () => [],
  getCanvasSize: () => editorStore.canvasSize,
  getBackground: () => editorStore.background as any,
})

const activeSection = computed(() => {
  return editorStore.pageSections.find(s => s.id === editorStore.activeSectionId)
})

function onSectionClick(sec: PageSection) {
  if (sec.editable === false) return
  editorStore.activeSectionId = sec.id
  if (sec.type === 'image') {
    chooseImage(sec.id)
  } else if (sec.type === 'title' || sec.type === 'text' || sec.type === 'date' || sec.type === 'location') {
    editorStore.openSectionTextEditor(sec.id)
  }
}

function deselectSection() {
  editorStore.activeSectionId = null
}

function handleEditSection() {
  if (!activeSection.value) {
    uni.showToast({ title: '请先点击选择要编辑的内容', icon: 'none' })
    return
  }
  onSectionClick(activeSection.value)
}

function handleReplaceImage() {
  if (!activeSection.value || activeSection.value.type !== 'image') {
    uni.showToast({ title: '请先选择图片区域', icon: 'none' })
    return
  }
  chooseImage(activeSection.value.id)
}

function chooseImage(sectionId: string) {
  editorStore.activeSectionId = sectionId

  const applyImage = async (tempPath: string) => {
    uni.showLoading({ title: '上传中...' })
    try {
      const permanentUrl = await uploadImage(tempPath)
      editorStore.updatePageSectionImage(sectionId, permanentUrl)
      editorStore.pushHistory()
    } catch (e) {
      console.warn('图片上传失败:', e)
      editorStore.updatePageSectionImage(sectionId, tempPath)
      uni.showToast({ title: '图片上传失败，已使用本地图片', icon: 'none' })
    } finally {
      uni.hideLoading()
    }
  }

  // #ifdef MP-WEIXIN
  uni.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sourceType: ['album', 'camera'],
    success: (res: any) => {
      if (res.tempFiles && res.tempFiles.length > 0) {
        applyImage(res.tempFiles[0].tempFilePath)
      }
    },
    fail: () => {
      uni.showToast({ title: '图片选择失败', icon: 'none' })
    },
  })
  // #endif

  // #ifndef MP-WEIXIN
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res: any) => {
      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        applyImage(res.tempFilePaths[0])
      }
    },
    fail: () => {
      uni.showToast({ title: '图片选择失败', icon: 'none' })
    },
  })
  // #endif
}

function onTextEditorConfirm() {
  editorStore.confirmTextEdit()
  editorStore.pushHistory()
}

function openUnifiedEdit() {
  editorStore.showBasicInfoEditor = true
}

function onUnifiedEditConfirm() {
  editorStore.syncBasicInfoToElements()
  editorStore.closeBasicInfoEditor()
}

function onUnifiedEditCancel() {
  editorStore.closeBasicInfoEditor()
}

function onSmartFieldUpdate(key: string, value: string) {
  editorStore.syncSmartField(key, value)
}

function handleUndo() {
  if (!editorStore.canUndo) return
  editorStore.undo()
}

function handleRedo() {
  if (!editorStore.canRedo) return
  editorStore.redo()
}

function handleMusic() {
  uni.navigateTo({ url: '/pages/music/index' })
}

function handleMore() {
  uni.showActionSheet({
    itemList: ['撤销', '重做', '设置', '更换模板', '导出'],
    success: (res: any) => {
      switch (res.tapIndex) {
        case 0: handleUndo(); break
        case 1: handleRedo(); break
        case 2: handleSettings(); break
        case 3: handleChangeTemplate(); break
        case 4: handleExport(); break
      }
    },
  })
}

function handleSettings() {
  const settingItems = [
    { name: '礼物相册', key: 'giftAlbum' },
    { name: '礼物购买', key: 'giftBuy' },
    { name: '礼金功能', key: 'moneyGift' },
    { name: '点赞功能', key: 'like' },
    { name: '弹幕功能', key: 'danmaku' },
    { name: '相册功能', key: 'album' },
  ]
  uni.showActionSheet({
    itemList: settingItems.map(s => {
      const enabled = (templateStore.settings as any)[s.key]
      return `${s.name}${enabled ? ' ✓' : ''}`
    }),
    success: (res: any) => {
      const item = settingItems[res.tapIndex]
      if (item) {
        templateStore.toggleSetting(item.key)
        const enabled = (templateStore.settings as any)[item.key]
        uni.showToast({ title: `${item.name}已${enabled ? '开启' : '关闭'}`, icon: 'none' })
      }
    },
  })
}

function handleChangeTemplate() {
  uni.showModal({
    title: '更换模板',
    content: '切换模板可能会丢失当前编辑内容，确定要继续吗？',
    confirmText: '继续',
    confirmColor: '#e84a6e',
    success: (res) => {
      if (res.confirm) {
        uni.navigateTo({ url: '/pages/template/index?from=editor' })
      }
    },
  })
}

function handleExport() {
  uni.showToast({ title: '导出功能开发中', icon: 'none' })
}

function handleLocation() {
  uni.showToast({ title: '定位功能开发中', icon: 'none' })
}

function handleSave() {
  const editorData = {
    elements: JSON.parse(JSON.stringify(editorStore.editableElements)),
    pageSections: JSON.parse(JSON.stringify(editorStore.pageSections)),
    flipPages: JSON.parse(JSON.stringify(editorStore.flipPages)),
    background: JSON.parse(JSON.stringify(editorStore.background)),
    canvasSize: JSON.parse(JSON.stringify(editorStore.canvasSize)),
    templateType: editorStore.templateType,
    templateData: JSON.parse(JSON.stringify(templateStore.templateData)),
    basicInfo: JSON.parse(JSON.stringify(templateStore.basicInfo)),
    settings: JSON.parse(JSON.stringify(templateStore.settings)),
    currentFlipPageIndex: editorStore.currentFlipPageIndex,
  }
  const musicId = templateStore.selectedMusicId
  if (editorStore.currentWorkId) {
    const existing = worksStore.works.find(w => w.id === editorStore.currentWorkId)
    if (existing) {
      existing.title = templateStore.templateData.coverTitle || '未命名作品'
      existing.date = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })
      existing.image = templateStore.templateData.coverImage
      existing.templateType = editorStore.currentTemplateId
      existing.musicId = musicId
      existing.data = editorData
      existing.updatedAt = new Date().toISOString()
      worksStore.saveAsWork(existing)
      uni.showToast({ title: '已保存', icon: 'success' })
      return
    }
  }
  const id = editorStore.currentWorkId || String(Date.now())
  if (!editorStore.currentWorkId) {
    editorStore.setCurrentWorkId(id)
  }
  const work: Work = {
    id,
    title: templateStore.templateData.coverTitle || '未命名作品',
    date: new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }),
    image: templateStore.templateData.coverImage,
    templateType: editorStore.currentTemplateId,
    musicId,
    status: 'draft',
    data: editorData,
    updatedAt: new Date().toISOString(),
  }
  worksStore.saveAsWork(work)
  uni.showToast({ title: '已保存', icon: 'success' })
}

function handleShare() {
  uni.showToast({ title: '预览分享功能开发中', icon: 'none' })
}

function onImageError() {
  console.warn('PageEditor image load failed')
}
</script>

<style lang="scss" scoped>
.page-editor {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #fdf6f8 0%, #fef9fa 100%);
}

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

.header-actions {
  display: flex;
  gap: 16rpx;
}

.header-action {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #666;
  background: #f5f5f5;
  border-radius: 50%;
}

.preview-scroll {
  flex: 1;
  height: 100%;
  min-height: 0;
}

.preview-card {
  padding: 20rpx;
}

.page-section {
  position: relative;
  margin-bottom: 30rpx;
  padding: 16rpx;
  border-radius: 12rpx;
  transition: all 0.2s;

  &--active {
    background: rgba(232, 74, 110, 0.05);
    outline: 4rpx solid #e84a6e;
    outline-offset: -4rpx;
  }

  &--non-editable {
    pointer-events: none;
    opacity: 0.8;
  }
}

.section-title {
  font-size: 40rpx;
  font-weight: 700;
  text-align: center;
  color: #333;
  line-height: 1.5;
}

.section-date {
  font-size: 28rpx;
  text-align: center;
  color: #999;
  margin-top: 10rpx;
}

.section-image {
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 12rpx;
  background: #f5f5f5;
}

.image-placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.placeholder-icon {
  font-size: 60rpx;
}

.placeholder-text {
  font-size: 24rpx;
  color: #999;
}

.section-text {
  font-size: 28rpx;
  color: #666;
  line-height: 1.8;
  text-align: center;
}

.location-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.location-icon {
  font-size: 32rpx;
}

.location-text {
  font-size: 28rpx;
  color: #666;
}

.rsvp-section {
  background: #fdf6f8;
  border-radius: 12rpx;
  padding: 24rpx;
}

.rsvp-title {
  font-size: 32rpx;
  font-weight: 700;
  text-align: center;
  color: #e84a6e;
  margin-bottom: 20rpx;
}

.rsvp-form {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.form-label {
  font-size: 24rpx;
  color: #999;
}

.form-input {
  width: 100%;
  height: 72rpx;
  border: 2rpx solid #e0d0d5;
  border-radius: 8rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
}

.rsvp-submit {
  width: 100%;
  height: 80rpx;
  background: linear-gradient(135deg, #e84a6e, #ff6b8a);
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  margin-top: 10rpx;
}

.map-section {
  border-radius: 12rpx;
  overflow: hidden;
}

.map-image {
  width: 100%;
  aspect-ratio: 16 / 9;
}

.map-address {
  display: block;
  padding: 16rpx;
  font-size: 26rpx;
  color: #666;
  text-align: center;
}

.divider-line {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 0;
}

.divider-line::before,
.divider-line::after {
  content: '';
  flex: 1;
  height: 2rpx;
  background: linear-gradient(90deg, transparent, #e0d0d5, transparent);
}

.divider-text {
  font-size: 24rpx;
  color: #999;
  letter-spacing: 4rpx;
}

.countdown-section {
  text-align: center;
  padding: 30rpx;
}

.countdown-label {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 10rpx;
}

.countdown-days {
  font-size: 80rpx;
  font-weight: 700;
  color: #e84a6e;
}

.countdown-unit {
  font-size: 28rpx;
  color: #999;
  margin-left: 8rpx;
}

.editor-footer {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-top: 1rpx solid #f0e0e5;
  flex-shrink: 0;
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.context-toolbar {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 16rpx;
  background: linear-gradient(135deg, #fff5f7 0%, #fef0f3 100%);
  border-bottom: 1rpx solid #f0e0e5;
  animation: slide-up 0.2s ease;
}

.ctx-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10rpx 0;
  border-radius: 12rpx;
  background: #fff;
  gap: 4rpx;
  transition: transform 0.1s ease;
}

.ctx-btn:active {
  transform: scale(0.94);
  opacity: 0.8;
}

.ctx-btn--disabled {
  opacity: 0.35;
  pointer-events: none;
}

.ctx-btn--danger {
  background: #fff5f5;
}

.ctx-icon {
  font-size: 28rpx;
}

.ctx-label {
  font-size: 20rpx;
  color: #666;
}

.ctx-btn--danger .ctx-label {
  color: #e84a6e;
}

@keyframes slide-up {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.footer-main {
  display: flex;
  align-items: center;
  padding: 12rpx 24rpx;
  gap: 16rpx;
}

.footer-tabs {
  display: flex;
  align-items: center;
  gap: 4rpx;
  flex: 1;
}

.footer-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 96rpx;
  min-height: 80rpx;
  padding: 8rpx 12rpx;
  gap: 4rpx;
  border-radius: 12rpx;
  transition: transform 0.1s ease, background 0.15s ease;
}

.footer-tab:active {
  transform: scale(0.92);
  background: #fce4ec;
}

.tab-icon {
  font-size: 36rpx;
  line-height: 1;
}

.tab-label {
  font-size: 20rpx;
  color: #666;
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.footer-action-btn {
  padding: 16rpx 28rpx;
  border-radius: 50rpx;
  text-align: center;
}

.footer-save-btn {
  background: #f5f5f5;
}

.footer-share-btn {
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  box-shadow: 0 4rpx 12rpx rgba(232, 74, 110, 0.3);
}

.action-btn-text {
  font-size: 26rpx;
  font-weight: 600;
  color: #fff;
}

.footer-save-btn .action-btn-text {
  color: #666;
}
</style>
