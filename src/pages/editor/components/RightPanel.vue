<template>
  <view class="right-panel">
    <scroll-view class="panel-scroll" scroll-y>
      <!-- 自由编辑 -->
      <view class="free-edit-btn" @click="onFreeEditToggle">
        <text class="free-edit-icon">🖼️</text>
        <text class="free-edit-text">自由编辑</text>
      </view>

      <!-- 修改对应内容 -->
      <view class="content-header" @click="onToggleContent">
        <text class="content-title">修改对应内容</text>
        <text class="content-arrow" :class="{ open: contentOpen }">▼</text>
      </view>

      <view v-if="contentOpen" class="content-list">
        <view
          v-for="(element, idx) in editableElements"
          :key="idx"
          class="content-item"
          :class="{ selected: selectedElement === idx }"
          @click="$emit('openEditor', idx)"
        >
          <!-- 图片项 -->
          <view v-if="element.type === 'image'" class="image-item">
            <image class="item-image" :src="element.text" mode="aspectFill" @error="$emit('imageError')"></image>
            <view class="replace-icon-wrapper">
              <text class="replace-icon">🖼️</text>
            </view>
          </view>

          <!-- 文字项 -->
          <view v-else class="text-item">
            <text class="item-text">{{ element.text }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { EditableElement, Material, TemplateSettings } from '@/types'

defineProps<{
  activePanelTab: string
  editableElements: EditableElement[]
  selectedElement: number | null
  materialList: Material[]
  currentFont: string
  currentColor: string
  currentFontSize: number
  currentSpacing: number
  currentLineHeight: number
  settings: TemplateSettings
}>()

defineEmits<{
  'update:activePanelTab': [key: string]
  openEditor: [idx: number]
  selectMaterial: [material: Material]
  showFontPicker: []
  showColorPicker: []
  decreaseFontSize: []
  increaseFontSize: []
  decreaseSpacing: []
  increaseSpacing: []
  decreaseLineHeight: []
  increaseLineHeight: []
  resetStyle: []
  toggleSetting: [key: string]
  imageError: []
}>()

const contentOpen = ref(true)

function onFreeEditToggle() {
  uni.showToast({ title: '切换编辑模式', icon: 'none' })
}

function onToggleContent() {
  contentOpen.value = !contentOpen.value
}
</script>

<style lang="scss" scoped>
.right-panel {
  width: 100%;
  height: 100%;
  background: #fff;
  display: flex;
  flex-direction: column;
  border-radius: 16rpx;
  overflow: hidden;
}

.panel-scroll {
  flex: 1;
  height: 100%;
  min-height: 0;
  padding: 16rpx;
}

/* 自由编辑按钮 */
.free-edit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 20rpx;
  background: #fff;
  border: 2rpx solid #e8e8e8;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
}

.free-edit-icon {
  font-size: 28rpx;
}

.free-edit-text {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}

/* 内容标题 */
.content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 8rpx;
  margin-bottom: 12rpx;
}

.content-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
}

.content-arrow {
  font-size: 16rpx;
  color: #999;
  transition: transform 0.2s ease;

  &.open {
    transform: rotate(0deg);
  }

  &:not(.open) {
    transform: rotate(-90deg);
  }
}

/* 内容列表 */
.content-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.content-item {
  border-radius: 12rpx;
  overflow: hidden;
  border: 3rpx solid transparent;
  transition: all 0.2s ease;

  &.selected {
    border-color: #e84a6e;
  }
}

/* 图片项 */
.image-item {
  position: relative;
  width: 100%;
  height: 240rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  overflow: hidden;
}

.item-image {
  width: 100%;
  height: 100%;
}

.replace-icon-wrapper {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  width: 48rpx;
  height: 48rpx;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.replace-icon {
  font-size: 24rpx;
}

/* 文字项 */
.text-item {
  background: #fafafa;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
}

.item-text {
  font-size: 24rpx;
  color: #333;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
