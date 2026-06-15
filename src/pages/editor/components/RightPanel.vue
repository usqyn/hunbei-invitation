<template>
  <view class="right-panel">
    <scroll-view class="panel-scroll" scroll-y>
      <view class="panel-tabs">
        <view
          v-for="tab in panelTabs"
          :key="tab.key"
          class="panel-tab-item"
          :class="{ active: activePanelTab === tab.key }"
          @click="$emit('update:activePanelTab', tab.key)"
        >
          <text class="tab-icon">{{ tab.icon }}</text>
          <text class="tab-text">{{ tab.name }}</text>
        </view>
      </view>

      <view v-if="activePanelTab === 'edit'" class="panel-content">
        <view class="section-header">
          <view class="section-line"></view>
          <text class="section-title">修改对应内容</text>
          <view class="section-line"></view>
        </view>
        <view class="element-list">
          <view
            v-for="(element, idx) in editableElements"
            :key="idx"
            class="element-item"
            :class="{ selected: selectedElement === idx }"
            @click="$emit('openEditor', idx)"
          >
            <view v-if="element.type === 'image'" class="element-preview image-preview">
              <image class="preview-img" :src="element.text" mode="aspectFill" @error="$emit('imageError')"></image>
              <view class="replace-overlay">
                <text class="replace-icon">🔄</text>
                <text class="replace-text">点击替换</text>
              </view>
            </view>
            <view v-else-if="element.type === 'basic'" class="element-text-preview">
              <view class="text-info">
                <text class="preview-text">{{ element.text }}</text>
                <text class="preview-sub">{{ element.label || '基本信息' }}</text>
              </view>
              <view class="element-tag basic-tag">基本信息</view>
            </view>
            <view v-else class="element-text-preview">
              <view class="text-info">
                <text class="preview-text">{{ element.text }}</text>
                <text class="preview-sub">{{ element.label || '文字内容' }}</text>
              </view>
              <view class="element-tag text-tag">文字</view>
            </view>
          </view>
        </view>
      </view>

      <view v-if="activePanelTab === 'material'" class="panel-content">
        <view class="section-header">
          <view class="section-line"></view>
          <text class="section-title">素材库</text>
          <view class="section-line"></view>
        </view>
        <view class="material-grid">
          <view
            v-for="(material, idx) in materialList"
            :key="idx"
            class="material-item"
            @click="$emit('selectMaterial', material)"
          >
            <view class="material-img-wrapper">
              <image class="material-img" :src="material.url" mode="aspectFill" @error="$emit('imageError')"></image>
              <view class="material-hover">
                <text class="hover-icon">✓</text>
              </view>
            </view>
            <text class="material-name">{{ material.name }}</text>
          </view>
        </view>
      </view>

      <view v-if="activePanelTab === 'text'" class="panel-content">
        <view class="section-header">
          <view class="section-line"></view>
          <text class="section-title">文字样式</text>
          <view class="section-line"></view>
        </view>
        <view class="style-options">
          <view class="style-row">
            <view class="style-label">
              <text class="label-icon">𝔗</text>
              <text class="label-text">字体</text>
            </view>
            <view class="style-value" @click="$emit('showFontPicker')">
              <text class="value-text">{{ currentFont }}</text>
              <text class="arrow">›</text>
            </view>
          </view>
          <view class="style-row">
            <view class="style-label">
              <text class="label-icon">🖊</text>
              <text class="label-text">字体颜色</text>
            </view>
            <view class="style-value" @click="$emit('showColorPicker')">
              <view class="color-preview" :style="{ background: currentColor }"></view>
              <text class="arrow">›</text>
            </view>
          </view>
          <view class="style-row">
            <view class="style-label">
              <text class="label-icon">Aa</text>
              <text class="label-text">字体大小</text>
            </view>
            <view class="font-size-controls">
              <view class="size-btn" @click="$emit('decreaseFontSize')">-</view>
              <view class="size-value-wrapper">
                <text class="size-value">{{ currentFontSize }}</text>
              </view>
              <view class="size-btn" @click="$emit('increaseFontSize')">+</view>
            </view>
          </view>
          <view class="style-row">
            <view class="style-label">
              <text class="label-icon">⫿</text>
              <text class="label-text">字符间距</text>
            </view>
            <view class="font-size-controls">
              <view class="size-btn" @click="$emit('decreaseSpacing')">-</view>
              <view class="size-value-wrapper">
                <text class="size-value">{{ currentSpacing }}</text>
              </view>
              <view class="size-btn" @click="$emit('increaseSpacing')">+</view>
            </view>
          </view>
          <view class="style-row">
            <view class="style-label">
              <text class="label-icon">Ā</text>
              <text class="label-text">行间距</text>
            </view>
            <view class="font-size-controls">
              <view class="size-btn" @click="$emit('decreaseLineHeight')">-</view>
              <view class="size-value-wrapper">
                <text class="size-value">{{ currentLineHeight }}</text>
              </view>
              <view class="size-btn" @click="$emit('increaseLineHeight')">+</view>
            </view>
          </view>
          <view class="reset-btn" @click="$emit('resetStyle')">
            <text class="reset-icon">↻</text>
            <text class="reset-text">还原默认样式</text>
          </view>
        </view>
      </view>

      <view v-if="activePanelTab === 'settings'" class="panel-content">
        <view class="section-header">
          <view class="section-line"></view>
          <text class="section-title">作品设置</text>
          <view class="section-line"></view>
        </view>
        <view class="settings-list">
          <view v-for="item in settingItems" :key="item.key" class="setting-item">
            <view class="setting-info">
              <text class="setting-name">{{ item.name }}</text>
              <text v-if="item.desc" class="setting-desc">{{ item.desc }}</text>
            </view>
            <view class="setting-switch-wrapper" @click="$emit('toggleSetting', item.key)">
              <view class="switch-track" :class="{ active: settings[item.key] }">
                <view class="switch-thumb"></view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import type { EditableElement, Material, TemplateSettings } from '@/types'

interface PanelTab {
  key: string
  name: string
  icon: string
}

const panelTabs: PanelTab[] = [
  { key: 'edit', name: '编辑', icon: '✏️' },
  { key: 'material', name: '素材', icon: '🖼️' },
  { key: 'text', name: '文字', icon: '📝' },
  { key: 'settings', name: '设置', icon: '⚙️' },
]

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

const settingItems = [
  { key: 'danmaku', name: '开启弹幕工具栏', desc: '关闭后，天鹅婚礼工具栏、祝福互动功能将关闭相关功能' },
  { key: 'giftAlbum', name: '礼物相册' },
  { key: 'giftBuy', name: '礼物购买' },
  { key: 'moneyGift', name: '礼金功能' },
  { key: 'like', name: '点赞功能' },
  { key: 'album', name: '相册功能', desc: '打开后可查看宾客在邀请函中使用的相册' },
]
</script>

<style lang="scss" scoped>
.right-panel {
  width: 100%;
  height: 100%;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.panel-scroll {
  flex: 1;
  height: 100%;
  min-height: 0;
}

.panel-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
}

.panel-tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 0;
  gap: 6rpx;
  border-bottom: 4rpx solid transparent;
  transition: all 0.2s ease;

  &.active {
    border-bottom-color: var(--color-primary);

    .tab-text {
      color: var(--color-primary);
      font-weight: 600;
    }
  }
}

.tab-icon {
  font-size: 32rpx;
}

.tab-text {
  font-size: 24rpx;
  color: var(--color-text-secondary);
}

.panel-content {
  padding: 20rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
  margin-top: 8rpx;
}

.section-line {
  width: 60rpx;
  height: 2rpx;
  background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: 2rpx;
}

.element-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.element-item {
  padding: 16rpx;
  background: var(--color-bg-input);
  border-radius: 12rpx;
  border: 3rpx solid transparent;
  transition: all 0.2s ease;

  &.selected {
    border-color: var(--color-primary);
    background: #fff0f3;
    box-shadow: 0 0 0 4rpx rgba(232, 74, 110, 0.1);
  }
}

.image-preview {
  width: 100%;
  height: 200rpx;
  border-radius: 12rpx;
  overflow: hidden;
  position: relative;
  background: var(--color-border);
}

.preview-img {
  width: 100%;
  height: 100%;
}

.replace-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.element-item:active .replace-overlay {
  opacity: 1;
}

.replace-icon {
  font-size: 40rpx;
}

.replace-text {
  font-size: 22rpx;
  color: #fff;
}

.element-text-preview {
  min-height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 0;
}

.text-info {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  flex: 1;
}

.preview-text {
  font-size: 28rpx;
  color: var(--color-text-primary);
  line-height: 1.4;
}

.preview-sub {
  font-size: 22rpx;
  color: var(--color-text-secondary);
}

.element-tag {
  font-size: 20rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  flex-shrink: 0;
  margin-left: 16rpx;
}

.basic-tag {
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.text-tag {
  color: #4a90d9;
  background: #e3f0ff;
}

.material-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.material-item {
  width: calc(50% - 6rpx);
  border-radius: 12rpx;
  overflow: hidden;
  background: var(--color-bg-input);
  transition: transform 0.2s ease;

  &:active {
    transform: scale(0.96);
  }
}

.material-img-wrapper {
  width: 100%;
  height: 180rpx;
  position: relative;
  overflow: hidden;
}

.material-img {
  width: 100%;
  height: 100%;
}

.material-hover {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(232, 74, 110, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.material-item:active .material-hover {
  opacity: 1;
}

.hover-icon {
  font-size: 48rpx;
  color: #fff;
}

.material-name {
  display: block;
  padding: 12rpx;
  font-size: 24rpx;
  color: var(--color-text-secondary);
  text-align: center;
}

.style-options {
  padding: 0;
}

.style-row {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1px solid var(--color-border);

  &:last-child {
    border-bottom: none;
  }
}

.style-label {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex: 1;
}

.label-icon {
  font-size: 32rpx;
  opacity: 0.7;
}

.label-text {
  font-size: 28rpx;
  color: var(--color-text-primary);
}

.style-value {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.value-text {
  font-size: 26rpx;
  color: var(--color-text-secondary);
}

.color-preview {
  width: 48rpx;
  height: 48rpx;
  border-radius: 8rpx;
  border: 2rpx solid #e0e0e0;
  box-shadow: inset 0 0 0 2rpx #fff;
}

.arrow {
  font-size: 32rpx;
  color: #ccc;
  font-weight: 300;
}

.font-size-controls {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: var(--color-bg-input);
  padding: 4rpx;
  border-radius: 12rpx;
}

.size-btn {
  width: 52rpx;
  height: 52rpx;
  background: #fff;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: var(--color-text-primary);
  font-weight: 600;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.05);

  &:active {
    background: var(--color-primary-light);
  }
}

.size-value-wrapper {
  min-width: 80rpx;
  text-align: center;
}

.size-value {
  font-size: 28rpx;
  color: var(--color-text-primary);
  font-weight: 600;
}

.reset-btn {
  margin-top: 24rpx;
  padding: 20rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  background: #fafafa;

  &:active {
    background: #f0f0f0;
  }
}

.reset-icon {
  font-size: 28rpx;
  color: var(--color-text-secondary);
}

.reset-text {
  font-size: 26rpx;
  color: var(--color-text-secondary);
}

.settings-list {
  display: flex;
  flex-direction: column;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  border-bottom: 1px solid var(--color-border);
  gap: 24rpx;

  &:last-child {
    border-bottom: none;
  }
}

.setting-info {
  flex: 1;
}

.setting-name {
  display: block;
  font-size: 28rpx;
  color: var(--color-text-primary);
  font-weight: 500;
}

.setting-desc {
  display: block;
  font-size: 22rpx;
  color: var(--color-text-secondary);
  margin-top: 8rpx;
  line-height: 1.4;
}

.setting-switch-wrapper {
  flex-shrink: 0;
}

.switch-track {
  width: 80rpx;
  height: 44rpx;
  border-radius: 22rpx;
  background: #e0e0e0;
  position: relative;
  transition: background 0.2s ease;

  &.active {
    background: var(--color-primary);

    .switch-thumb {
      left: 40rpx;
    }
  }
}

.switch-thumb {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #fff;
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
  transition: left 0.2s ease;
}
</style>
