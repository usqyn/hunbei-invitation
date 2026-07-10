<template>
  <view class="flip-editor">
    <!-- 顶部工具栏 -->
    <view class="flip-toolbar">
      <view class="toolbar-left">
        <text class="toolbar-title">翻页编辑</text>
      </view>
      <view class="toolbar-right">
        <text class="page-indicator">{{ editorStore.currentFlipPageIndex + 1 }}/{{ editorStore.flipPages.length }}</text>
      </view>
    </view>

    <!-- 主内容区 -->
    <view class="flip-main">
      <!-- 左侧页面列表 -->
      <scroll-view class="flip-page-list" scroll-y>
        <view
          v-for="(page, idx) in editorStore.flipPages"
          :key="page.id"
          class="page-list-item"
          :class="{ 'page-list-item--active': editorStore.currentFlipPageIndex === idx }"
          @click="selectPage(idx)"
        >
          <view class="page-list-thumb">
            <text class="page-list-num">{{ idx + 1 }}</text>
          </view>
          <text class="page-list-name">{{ page.name }}</text>
        </view>
      </scroll-view>

      <!-- 中间预览区 -->
      <swiper
        class="flip-swiper"
        :current="editorStore.currentFlipPageIndex"
        @change="onSwiperChange"
      >
        <swiper-item v-for="(page, idx) in editorStore.flipPages" :key="page.id">
          <view class="flip-page" :style="getPageBgStyle(page)">
            <view
              v-for="(el, eIdx) in page.elements"
              :key="eIdx"
              class="flip-element"
              :class="{ 'flip-element--active': activeElementIndex === eIdx }"
              :style="getElementStyle(el)"
              @click="onElementClick(el, eIdx)"
            >
              <image
                v-if="el.type === 'image'"
                class="flip-image"
                :src="el.text || '/static/images/templates/wedding-1.svg'"
                mode="aspectFit"
              />
              <text
                v-else-if="el.type === 'text'"
                class="flip-text"
                :style="getTextStyle(el)"
              >{{ resolveText(el.text) }}</text>
            </view>
          </view>
        </swiper-item>
      </swiper>

      <!-- 右侧编辑面板 -->
      <view class="flip-panel">
        <view class="panel-header">
          <text class="panel-title">编辑</text>
        </view>
        <scroll-view class="panel-body" scroll-y>
          <!-- 当前页面信息 -->
          <view v-if="currentPage" class="panel-section">
            <text class="section-label">页面名称</text>
            <input class="section-input" v-model="currentPage.name" placeholder="页面名称" />
            <text class="section-label">页面类型</text>
            <text class="section-value">{{ getPageTypeName(currentPage.pageType) }}</text>
          </view>

          <!-- 元素编辑 -->
          <view v-if="selectedElement" class="panel-section">
            <text class="section-label">元素类型</text>
            <text class="section-value">{{ selectedElement.type === 'text' ? '文字' : '图片' }}</text>
            
            <text v-if="selectedElement.type === 'text'" class="section-label">文字内容</text>
            <textarea
              v-if="selectedElement.type === 'text'"
              class="section-textarea"
              :value="selectedElement.text"
              @input="onTextInput"
              placeholder="请输入文字"
            />

            <text v-if="selectedElement.type === 'image'" class="section-label">图片</text>
            <view class="image-upload-area" @click="onImageUpload">
              <image v-if="selectedElement.text" :src="selectedElement.text" class="upload-preview" mode="aspectFit" />
              <view v-else class="upload-placeholder">
                <text class="upload-icon">📷</text>
                <text class="upload-text">上传图片</text>
              </view>
            </view>
          </view>

          <view v-else class="panel-empty">
            <text class="empty-icon">👆</text>
            <text class="empty-text">点击页面元素进行编辑</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useTemplateStore } from '@/stores/template'
import { useCanvasRender } from '@/composables/useCanvasRender'
import { resolveDatePlaceholders } from '@/utils/placeholders'

const editorStore = useEditorStore()
const templateStore = useTemplateStore()
const { getTextStyle } = useCanvasRender({
  getElements: () => [],
  getCanvasSize: () => undefined,
  getBackground: () => undefined,
})

function resolveText(text: string): string {
  return resolveDatePlaceholders(text, templateStore.templateData)
}

const activeElementIndex = ref(-1)
const selectedElement = ref<any>(null)

const currentPage = computed(() => {
  return editorStore.flipPages[editorStore.currentFlipPageIndex]
})

function selectPage(idx: number) {
  editorStore.currentFlipPageIndex = idx
  activeElementIndex.value = -1
  selectedElement.value = null
}

function onSwiperChange(e: any) {
  editorStore.currentFlipPageIndex = e.detail.current
  activeElementIndex.value = -1
  selectedElement.value = null
}

function onElementClick(el: any, idx: number) {
  activeElementIndex.value = idx
  selectedElement.value = el
}

function onTextInput(e: any) {
  if (selectedElement.value) {
    selectedElement.value.text = e.detail.value
    // 持久化文本修改到 store，并同步到所有模式
    if (selectedElement.value.dataKey) {
      editorStore.syncFieldToAllModes(selectedElement.value.dataKey, e.detail.value)
    }
  }
}

function applySelectedImage(tempFilePath: string) {
  if (selectedElement.value) {
    selectedElement.value.text = tempFilePath
    // 持久化图片修改到 store，并同步到所有模式
    if (selectedElement.value.dataKey) {
      editorStore.syncFieldToAllModes(selectedElement.value.dataKey, tempFilePath)
    }
  }
}

function onImageUpload() {
  // 微信小程序端
  // #ifdef MP-WEIXIN
  uni.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sourceType: ['album', 'camera'],
    success: (res: any) => {
      if (res.tempFiles && res.tempFiles.length > 0) {
        applySelectedImage(res.tempFiles[0].tempFilePath)
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
        applySelectedImage(res.tempFilePaths[0])
      }
    },
    fail: () => {
      uni.showToast({ title: '图片选择失败', icon: 'none' })
    },
  })
  // #endif
}

function getPageBgStyle(page: any): Record<string, string> {
  const bg = page.background
  const style: Record<string, string> = {}
  if (bg.type === 'solid') {
    style.background = bg.color1
  } else if (bg.type === 'linear-gradient') {
    style.background = `linear-gradient(${bg.angle || 180}deg, ${bg.color1}, ${bg.color2 || bg.color1})`
  } else if (bg.type === 'image' && bg.imageUrl) {
    style.backgroundImage = `url(${bg.imageUrl})`
    style.backgroundSize = bg.imageScale || 'cover'
    style.backgroundPosition = 'center'
  }
  return style
}

function getElementStyle(el: any): Record<string, string> {
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

function getPageTypeName(type: string): string {
  const map: Record<string, string> = {
    cover: '封面', photo: '照片', invitation: '邀请', info: '时间地点',
    countdown: '倒计时', map: '地图', rsvp: '回执', blessing: '祝福', ending: '尾页', custom: '自定义'
  }
  return map[type] || type
}
</script>

<style lang="scss" scoped>
.flip-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.flip-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 24rpx;
  background: #ffffff;
  border-bottom: 1rpx solid #e0e0e0;
}

.toolbar-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.page-indicator {
  font-size: 28rpx;
  color: #666;
}

.flip-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.flip-page-list {
  width: 120rpx;
  background: #ffffff;
  border-right: 1rpx solid #e0e0e0;
}

.page-list-item {
  padding: 16rpx 8rpx;
  border-bottom: 1rpx solid #f0f0f0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.page-list-item--active {
  background: #e3f2fd;
}

.page-list-thumb {
  width: 60rpx;
  height: 100rpx;
  background: #f0f0f0;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-list-num {
  font-size: 24rpx;
  font-weight: bold;
  color: #999;
}

.page-list-name {
  font-size: 20rpx;
  color: #666;
  margin-top: 8rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  text-align: center;
}

.flip-swiper {
  flex: 1;
  height: 100%;
}

.flip-page {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.flip-element {
  position: absolute;
  overflow: hidden;
}

.flip-image {
  width: 100%;
  height: 100%;
  display: block;
}

.flip-text {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  word-break: break-all;
  white-space: pre-wrap;
}

.flip-panel {
  width: 360rpx;
  background: #ffffff;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 16rpx 20rpx;
  border-bottom: 1rpx solid #e0e0e0;
}

.panel-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.panel-body {
  flex: 1;
  padding: 16rpx 20rpx;
}

.panel-section {
  margin-bottom: 24rpx;
}

.section-label {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 8rpx;
  display: block;
}

.section-input {
  width: 100%;
  padding: 12rpx 16rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  font-size: 26rpx;
}

.section-value {
  font-size: 26rpx;
  color: #333;
  padding: 8rpx 0;
}

.section-textarea {
  width: 100%;
  height: 200rpx;
  padding: 12rpx 16rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  font-size: 26rpx;
}

.image-upload-area {
  width: 100%;
  height: 200rpx;
  border: 2rpx dashed #ddd;
  border-radius: 8rpx;
  overflow: hidden;
}

.upload-preview {
  width: 100%;
  height: 100%;
}

.upload-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.upload-icon {
  font-size: 48rpx;
  margin-bottom: 8rpx;
}

.upload-text {
  font-size: 24rpx;
  color: #999;
}

.panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 100rpx;
}

.empty-icon {
  font-size: 64rpx;
  margin-bottom: 16rpx;
}

.empty-text {
  font-size: 26rpx;
  color: #999;
}
</style>