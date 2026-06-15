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

      <view v-if="activePanelTab === 'edit'" class="edit-panel">
        <view class="panel-section">
          <view class="section-header">
            <text class="section-title">修改对应内容</text>
          </view>
          <view class="element-list">
            <view
              v-for="(element, idx) in editableElements"
              :key="idx"
              class="element-item"
              :class="{ selected: selectedElement === idx }"
              @click="$emit('openEditor', idx)"
            >
              <view v-if="element.type === 'image'" class="element-preview">
                <image class="preview-img" :src="element.text" mode="aspectFill" @error="$emit('imageError')"></image>
                <view class="replace-icon">🔄</view>
              </view>
              <view v-else-if="element.type === 'basic'" class="element-text-preview">
                <text class="preview-text">{{ element.text }}</text>
                <text class="element-tag">基本信息</text>
              </view>
              <view v-else class="element-text-preview">
                <text class="preview-text">{{ element.text }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view v-if="activePanelTab === 'material'" class="material-panel">
        <view class="panel-section">
          <view class="section-header">
            <text class="section-title">素材库</text>
          </view>
          <view class="material-grid">
            <view
              v-for="(material, idx) in materialList"
              :key="idx"
              class="material-item"
              @click="$emit('selectMaterial', material)"
            >
              <image class="material-img" :src="material.url" mode="aspectFill" @error="$emit('imageError')"></image>
              <text class="material-name">{{ material.name }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="activePanelTab === 'text'" class="text-panel">
        <view class="panel-section">
          <view class="section-header">
            <text class="section-title">文字样式</text>
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
                <view class="size-btn" @click="$emit('decreaseFontSize')">—</view>
                <text class="size-value">{{ currentFontSize }}</text>
                <view class="size-btn" @click="$emit('increaseFontSize')">+</view>
              </view>
            </view>
            <view class="style-row">
              <view class="style-label">
                <text class="label-icon">⫿</text>
                <text class="label-text">字符间距</text>
              </view>
              <view class="font-size-controls">
                <view class="size-btn" @click="$emit('decreaseSpacing')">—</view>
                <text class="size-value">{{ currentSpacing }}</text>
                <view class="size-btn" @click="$emit('increaseSpacing')">+</view>
              </view>
            </view>
            <view class="style-row">
              <view class="style-label">
                <text class="label-icon">Ā</text>
                <text class="label-text">行间距</text>
              </view>
              <view class="font-size-controls">
                <view class="size-btn" @click="$emit('decreaseLineHeight')">—</view>
                <text class="size-value">{{ currentLineHeight }}</text>
                <view class="size-btn" @click="$emit('increaseLineHeight')">+</view>
              </view>
            </view>
            <view class="reset-btn" @click="$emit('resetStyle')">
              <text class="reset-text">还原</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="activePanelTab === 'settings'" class="settings-panel">
        <view class="panel-section">
          <view class="section-header">
            <text class="section-title">作品设置</text>
          </view>
          <view class="settings-list">
            <view v-for="item in settingItems" :key="item.key" class="setting-item">
              <view class="setting-info">
                <text class="setting-name">{{ item.name }}</text>
                <text v-if="item.desc" class="setting-desc">{{ item.desc }}</text>
              </view>
              <switch
                :checked="settings[item.key]"
                @change="$emit('toggleSetting', item.key)"
                color="#e84a6e"
              />
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import type { EditableElement, Material, TemplateSettings } from '@/types'
import { PANEL_TABS } from '@/constants'

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
  flex: 1;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.panel-scroll {
  height: 100%;
}

.panel-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
}

.panel-tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 0;
  gap: 8rpx;
  border-bottom: 4rpx solid transparent;

  &.active {
    border-bottom-color: var(--color-primary);

    .tab-text {
      color: var(--color-primary);
      font-weight: 600;
    }
  }
}

.tab-icon {
  font-size: 36rpx;
}

.tab-text {
  font-size: 24rpx;
  color: var(--color-text-secondary);
}

.panel-section {
  padding: 20rpx;
}

.section-header {
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.element-list {
  display: flex;
  flex-direction: column;
  gap: 15rpx;
}

.element-item {
  padding: 20rpx;
  background: var(--color-bg-input);
  border-radius: 12rpx;
  border: 3rpx solid transparent;

  &.selected {
    border-color: var(--color-primary);
    background: #fff0f3;
  }
}

.element-preview {
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

.replace-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255,255,255,0.9);
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
}

.element-text-preview {
  min-height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.preview-text {
  font-size: 28rpx;
  color: var(--color-text-primary);
  line-height: 1.6;
}

.element-tag {
  font-size: 22rpx;
  color: var(--color-primary);
  background: var(--color-primary-light);
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.material-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 15rpx;
}

.material-item {
  width: calc(50% - 8rpx);
  border-radius: 12rpx;
  overflow: hidden;
  background: var(--color-bg-input);
}

.material-img {
  width: 100%;
  height: 180rpx;
}

.material-name {
  display: block;
  padding: 15rpx;
  font-size: 26rpx;
  color: var(--color-text-secondary);
  text-align: center;
}

.style-options {
  padding: 0;
}

.style-row {
  display: flex;
  align-items: center;
  padding: 25rpx 0;
  border-bottom: 1px solid var(--color-border);

  &:last-child {
    border-bottom: none;
  }
}

.style-label {
  display: flex;
  align-items: center;
  gap: 15rpx;
  flex: 1;
}

.label-icon {
  font-size: 36rpx;
  opacity: 0.7;
}

.label-text {
  font-size: 30rpx;
  color: var(--color-text-primary);
}

.style-value {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.value-text {
  font-size: 28rpx;
  color: var(--color-text-primary);
}

.color-preview {
  width: 50rpx;
  height: 50rpx;
  border-radius: 8rpx;
  border: 2rpx solid #ddd;
}

.arrow {
  font-size: 28rpx;
  color: #ccc;
}

.font-size-controls {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: var(--color-bg-input);
  padding: 5rpx 15rpx;
  border-radius: 12rpx;
}

.size-btn {
  width: 60rpx;
  height: 60rpx;
  background: var(--color-bg-white);
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: var(--color-text-secondary);
}

.size-value {
  font-size: 30rpx;
  color: var(--color-text-primary);
  min-width: 60rpx;
  text-align: center;
}

.reset-btn {
  margin-top: 20rpx;
  padding: 20rpx;
  border: 2rpx solid #ddd;
  border-radius: 12rpx;
  text-align: center;
}

.reset-text {
  font-size: 28rpx;
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
  padding: 25rpx 0;
  border-bottom: 1px solid var(--color-border);

  &:last-child {
    border-bottom: none;
  }
}

.setting-info {
  flex: 1;
}

.setting-name {
  display: block;
  font-size: 30rpx;
  color: var(--color-text-primary);
}

.setting-desc {
  display: block;
  font-size: 24rpx;
  color: var(--color-text-secondary);
  margin-top: 8rpx;
}
</style>
