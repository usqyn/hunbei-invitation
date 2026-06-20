<template>
  <view class="right-panel">
    <scroll-view class="panel-scroll" scroll-y>
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
          <view v-if="element.type === 'image'" class="image-item">
            <image class="item-image" :src="element.text" mode="aspectFill"></image>
            <view class="replace-icon-wrapper">
              <text class="replace-icon">🖼️</text>
            </view>
          </view>
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
  settings: TemplateSettings
}>()

defineEmits<{
  'update:activePanelTab': [key: string]
  openEditor: [idx: number]
  selectMaterial: [material: Material]
  toggleSetting: [key: string]
}>()

const contentOpen = ref(true)

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
  border-radius: 12rpx;
  overflow: hidden;
}

.panel-scroll {
  flex: 1;
  height: 100%;
  min-height: 0;
  padding: 12rpx;
}

/* 内容标题 */
.content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 4rpx;
  margin-bottom: 10rpx;
}

.content-title {
  font-size: 22rpx;
  font-weight: 600;
  color: #333;
}

.content-arrow {
  font-size: 14rpx;
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
  gap: 10rpx;
}

.content-item {
  border-radius: 10rpx;
  overflow: hidden;
  border: 2rpx solid transparent;
  transition: all 0.2s ease;

  &.selected {
    border-color: #e84a6e;
  }
}

/* 图片项 */
.image-item {
  position: relative;
  width: 100%;
  height: 180rpx;
  background: #f5f5f5;
  border-radius: 10rpx;
  overflow: hidden;
}

.item-image {
  width: 100%;
  height: 100%;
}

.replace-icon-wrapper {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 40rpx;
  height: 40rpx;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 6rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.replace-icon {
  font-size: 20rpx;
}

/* 文字项 */
.text-item {
  background: #fafafa;
  border-radius: 10rpx;
  padding: 12rpx 14rpx;
}

.item-text {
  font-size: 20rpx;
  color: #333;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
