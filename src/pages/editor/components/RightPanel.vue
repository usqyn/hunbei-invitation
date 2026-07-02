<template>
  <view class="right-panel" :class="[mode === 'bottom' ? 'right-panel--bottom' : 'right-panel--sidebar']">
    <view class="content-header" @click="onToggleContent">
      <text class="content-title">修改对应内容</text>
      <text class="content-arrow" :class="{ open: contentOpen }">▼</text>
    </view>

    <view v-if="contentOpen" class="content-list" :class="{ 'content-list--horizontal': mode === 'bottom' }">
      <view
        v-for="(element, idx) in editableElements"
        :key="idx"
        class="content-item"
        :class="{
          selected: selectedElement === idx,
          'content-item--thumb': mode === 'bottom',
        }"
        @click="$emit('openEditor', idx)"
      >
        <view v-if="element.type === 'image'" class="image-item" :class="{ 'image-item--thumb': mode === 'bottom' }">
          <image class="item-image" :src="element.text" mode="aspectFill"></image>
          <view class="replace-icon-wrapper">
            <text class="replace-icon">🖼️</text>
          </view>
        </view>
        <view v-else class="text-item" :class="{ 'text-item--thumb': mode === 'bottom' }">
          <text class="item-text">{{ element.text }}</text>
        </view>
        <view v-if="mode === 'bottom'" class="item-label">{{ element.label || (element.type === 'image' ? '图片' : '文字') }}</view>
      </view>
    </view>
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
  mode?: 'sidebar' | 'bottom'
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
  background: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.right-panel--sidebar {
  width: 100%;
  height: 100%;
  border-radius: 12rpx;

  .content-list {
    display: flex;
    flex-direction: column;
    gap: 10rpx;
    overflow-y: auto;
    flex: 1;
  }

  .content-item {
    flex-shrink: 0;
  }

  .image-item {
    width: 100%;
    height: 180rpx;
    background: #f5f5f5;
    border-radius: 10rpx;
    overflow: hidden;
  }
}

.right-panel--bottom {
  width: 100%;
  border-radius: 16rpx 16rpx 0 0;

  .content-header {
    padding: 16rpx 20rpx;
    border-bottom: 1rpx solid #f0f0f0;
  }

  .content-list--horizontal {
    display: flex;
    gap: 16rpx;
    overflow-x: auto;
    padding: 16rpx 20rpx;
    white-space: nowrap;
  }

  .content-item--thumb {
    flex-shrink: 0;
    width: 160rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8rpx;
  }

  .image-item--thumb {
    width: 160rpx;
    height: 120rpx;
    background: #f5f5f5;
    border-radius: 10rpx;
    overflow: hidden;
    position: relative;
  }

  .text-item--thumb {
    width: 160rpx;
    height: 120rpx;
    background: #fafafa;
    border-radius: 10rpx;
    padding: 16rpx 12rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .item-label {
    font-size: 18rpx;
    color: #999;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
  }
}

.panel-scroll {
  flex: 1;
  height: 100%;
  min-height: 0;
  padding: 12rpx;
}

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

.content-item {
  border-radius: 10rpx;
  overflow: hidden;
  border: 2rpx solid transparent;
  transition: all 0.2s ease;

  &.selected {
    border-color: #e84a6e;
  }
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
