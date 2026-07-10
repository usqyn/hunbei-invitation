<template>
  <view class="page-editor">
    <!-- 左侧预览区：长页面滚动 -->
    <view class="page-preview">
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
    </view>

    <!-- 右侧编辑面板 -->
    <view class="page-panel">
      <view class="panel-header">
        <view class="panel-tabs">
          <view
            class="panel-tab"
            :class="{ 'panel-tab--active': panelTab === 'content' }"
            @click="panelTab = 'content'"
          >修改对应内容</view>
          <view
            class="panel-tab"
            :class="{ 'panel-tab--active': panelTab === 'free' }"
            @click="panelTab = 'free'"
          >自由编辑</view>
        </view>
      </view>
      <scroll-view class="panel-content" scroll-y>
        <template v-if="panelTab === 'content'">
          <view
            v-for="(sec, idx) in editorStore.pageSections"
            :key="sec.id"
            class="panel-item"
            :class="{ 'panel-item--active': editorStore.activeSectionId === sec.id }"
            @click="onPanelItemClick(sec)"
          >
            <template v-if="sec.type === 'title' || sec.type === 'text' || sec.type === 'date' || sec.type === 'location'">
              <view class="item-label">{{ sec.label || getSectionLabel(sec.type) }}</view>
              <view class="item-value">{{ sec.text || sec.placeholder }}</view>
            </template>
            <template v-else-if="sec.type === 'image'">
              <view class="item-label">{{ sec.label || '照片' }}</view>
              <image class="item-image" :src="sec.image || ''" mode="aspectFill" />
              <text class="item-placeholder" v-if="!sec.image">{{ sec.placeholder }}</text>
            </template>
            <template v-else-if="sec.type === 'rsvp'">
              <view class="item-label">出席确认</view>
              <text class="item-value">RSVP 表单</text>
            </template>
            <template v-else-if="sec.type === 'map'">
              <view class="item-label">地图</view>
              <text class="item-value">{{ sec.text || '地址信息' }}</text>
            </template>
            <template v-else-if="sec.type === 'countdown'">
              <view class="item-label">倒计时</view>
              <text class="item-value">{{ sec.text || '设置日期' }}</text>
            </template>
          </view>
        </template>
        <template v-else-if="panelTab === 'free'">
          <view class="free-edit-tips">
            <text class="tips-icon">✏️</text>
            <text class="tips-text">点击左侧预览区的元素，即可自由编辑</text>
          </view>
        </template>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useCanvasRender } from '@/composables/useCanvasRender'
import { uploadImage } from '@/api'
import type { PageSection } from '@/types'

const editorStore = useEditorStore()
const panelTab = ref<'content' | 'free'>('content')

const { canvasBackgroundStyle, getTextStyle } = useCanvasRender({
  getElements: () => [],
  getCanvasSize: () => editorStore.canvasSize,
  getBackground: () => editorStore.background as any,
})

function getSectionLabel(type: string): string {
  const labels: Record<string, string> = {
    title: '标题',
    date: '日期',
    image: '照片',
    text: '正文',
    location: '地址',
    rsvp: '出席确认',
    map: '地图',
    divider: '分隔线',
    countdown: '倒计时',
  }
  return labels[type] || type
}

function onSectionClick(sec: PageSection) {
  if (sec.editable === false) return
  if (sec.type === 'image') {
    chooseImage(sec.id)
  } else if (sec.type === 'title' || sec.type === 'text' || sec.type === 'date' || sec.type === 'location') {
    editorStore.openSectionTextEditor(sec.id)
  }
}

function onPanelItemClick(sec: PageSection) {
  if (sec.editable === false) return
  if (sec.type === 'image') {
    chooseImage(sec.id)
  } else if (sec.type === 'title' || sec.type === 'text' || sec.type === 'date' || sec.type === 'location') {
    editorStore.openSectionTextEditor(sec.id)
  }
}

function chooseImage(sectionId: string) {
  editorStore.activeSectionId = sectionId
  editorStore.selectedElement = null

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

function onImageError() {
  console.warn('PageEditor image load failed')
}
</script>

<style lang="scss" scoped>
.page-editor {
  display: flex;
  width: 100%;
  height: 100%;
}

.page-preview {
  flex: 1;
  background: #fff;
  overflow: hidden;
}

.preview-scroll {
  height: 100%;
}

.preview-card {
  padding: 20rpx;
}

.page-section {
  position: relative;
  margin-bottom: 30rpx;
  padding: 16rpx;
  border-radius: 12rpx;
  transition: background 0.2s;

  &--active {
    background: rgba(232, 74, 110, 0.05);
    outline: 3rpx solid #e84a6e;
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

.page-panel {
  width: 360rpx;
  background: #fff;
  border-left: 2rpx solid #f0e0e5;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-header {
  padding: 20rpx;
  border-bottom: 2rpx solid #f0e0e5;
}

.panel-tabs {
  display: flex;
  gap: 10rpx;
}

.panel-tab {
  flex: 1;
  padding: 16rpx;
  text-align: center;
  font-size: 26rpx;
  color: #999;
  border-radius: 8rpx;
  transition: all 0.2s;

  &--active {
    background: #fdf6f8;
    color: #e84a6e;
    font-weight: 600;
  }
}

.panel-content {
  flex: 1;
  padding: 16rpx;
}

.panel-item {
  padding: 16rpx;
  border-radius: 10rpx;
  margin-bottom: 12rpx;
  background: #fafafa;
  transition: all 0.2s;

  &--active {
    background: #fdf6f8;
    border: 2rpx solid #e84a6e;
  }
}

.item-label {
  font-size: 22rpx;
  color: #999;
  margin-bottom: 8rpx;
}

.item-value {
  font-size: 26rpx;
  color: #333;
  word-break: break-all;
  line-height: 1.5;
}

.item-image {
  width: 100%;
  height: 120rpx;
  border-radius: 8rpx;
  background: #f0f0f0;
}

.item-placeholder {
  display: block;
  font-size: 24rpx;
  color: #ccc;
  text-align: center;
  margin-top: 8rpx;
}

.free-edit-tips {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx 20rpx;
  gap: 16rpx;
}

.tips-icon {
  font-size: 60rpx;
}

.tips-text {
  font-size: 26rpx;
  color: #999;
  text-align: center;
  line-height: 1.6;
}
</style>
