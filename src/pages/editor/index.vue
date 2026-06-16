<template>
  <view class="editor-page">
    <view class="editor-header">
      <view class="header-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="header-title">编辑器</text>
      <view class="header-right"></view>
    </view>

    <view class="editor-body">
      <view class="preview-area">
        <scroll-view class="preview-scroll" scroll-y>
          <view class="preview-card">
            <view class="page-content">
              <!-- Cover -->
              <view class="section cover-section" @click="onPreviewClick(0)">
                <image class="cover-image" :src="t.templateData.coverImage" mode="aspectFill" @error="onImageError"></image>
                <view v-if="selectedPreviewIdx === 0" class="preview-active-border"></view>
                <view class="cover-overlay">
                  <text class="welcome-text" @click.stop="onPreviewClick(7)">{{ t.templateData.coverSubtitle }}</text>
                  <text
                    class="main-title"
                    :style="getElementStyle(6)"
                    @click.stop="onPreviewClick(6)"
                  >{{ t.templateData.coverTitle }}</text>
                </view>
              </view>

              <!-- Couple info -->
              <view class="section couple-info-section" @click="onPreviewClick(5)">
                <view v-if="selectedPreviewIdx === 5" class="preview-active-border"></view>
                <view class="couple-names">
                  <text class="name">{{ t.basicInfo.groomName || '新郎' }}</text>
                  <text class="groom-bride">GROOM</text>
                </view>
                <text class="shuangxi-icon">囍</text>
                <view class="couple-names">
                  <text class="name">{{ t.basicInfo.brideName || '新娘' }}</text>
                  <text class="groom-bride">BRIDE</text>
                </view>
                <text class="wedding-date">{{ t.basicInfo.weddingDate || '选择婚礼日期' }}</text>
                <text class="wedding-address">{{ t.basicInfo.detailAddress || '填写婚礼地址' }}</text>
              </view>

              <!-- Footer border -->
              <view class="section footer-border">
                <text class="footer-text-left">WEDDING</text>
                <text class="footer-text-center">INVITATION</text>
                <text class="footer-text-right">2050</text>
              </view>

              <!-- Photo 1 -->
              <view class="section photo-section" @click="onPreviewClick(1)">
                <image class="photo-image" :src="t.templateData.photo1" mode="aspectFill" @error="onImageError"></image>
                <view v-if="selectedPreviewIdx === 1" class="preview-active-border"></view>
                <view class="photo-overlay">
                  <text
                    class="photo-title"
                    :style="getElementStyle(8)"
                    @click.stop="onPreviewClick(8)"
                  >{{ t.templateData.photoTitle }}</text>
                  <text
                    class="photo-sub"
                    :style="getElementStyle(9)"
                    @click.stop="onPreviewClick(9)"
                  >{{ t.templateData.photoSubtitle }}</text>
                </view>
              </view>

              <!-- Love story -->
              <view class="section love-story-section">
                <text class="story-title">我的情书</text>
                <text class="story-sub">OUR LOVE STORY</text>
              </view>

              <!-- Photo 2 -->
              <view class="section photo-section small" @click="onPreviewClick(2)">
                <image class="photo-image" :src="t.templateData.photo2" mode="aspectFill" @error="onImageError"></image>
                <view v-if="selectedPreviewIdx === 2" class="preview-active-border"></view>
              </view>

              <!-- Simple footer -->
              <view class="section simple-section" @click="onPreviewClick(10)">
                <view v-if="selectedPreviewIdx === 10" class="preview-active-border"></view>
                <text
                  class="simple-title"
                  :style="getElementStyle(10)"
                  @click.stop="onPreviewClick(10)"
                >{{ t.templateData.footerText }}</text>
                <text
                  class="simple-sub"
                  :style="getElementStyle(11)"
                  @click.stop="onPreviewClick(11)"
                >{{ t.templateData.footerSubText }}</text>
              </view>
            </view>
          </view>
        </scroll-view>

        <!-- Thumb strip -->
        <scroll-view class="thumb-strip" scroll-x>
          <view
            v-for="(page, idx) in pageList"
            :key="idx"
            class="thumb-item"
            :class="{ active: currentPageIndex === idx }"
            @click="currentPageIndex = idx"
          >
            <image v-if="page.type === 'cover'" class="thumb-img" :src="page.image" mode="aspectFill" @error="onImageError"></image>
            <view v-else-if="page.type === 'info'" class="thumb-placeholder info-thumb">
              <text class="thumb-icon">💑</text>
            </view>
            <view v-else-if="page.type === 'footer'" class="thumb-placeholder footer-thumb">
              <text class="thumb-label">W</text>
            </view>
            <view v-else-if="page.type === 'story'" class="thumb-placeholder story-thumb">
              <text class="thumb-icon">💌</text>
            </view>
            <view v-else class="thumb-placeholder photo-thumb">
              <text class="thumb-icon">🖼</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="sidebar-area">
        <RightPanel
          :active-panel-tab="editorStore.activePanelTab"
          :editable-elements="editorStore.editableElements"
          :selected-element="editorStore.selectedElement"
          :material-list="editorStore.materialList"
          :current-font="editorStore.currentFont"
          :current-color="editorStore.currentColor"
          :current-font-size="editorStore.currentFontSize"
          :current-spacing="editorStore.currentSpacing"
          :current-line-height="editorStore.currentLineHeight"
          :settings="t.settings"
          @update:active-panel-tab="editorStore.activePanelTab = $event"
          @open-editor="editorStore.openEditor"
          @select-material="onSelectMaterial"
          @show-font-picker="showFontPickerModal = true"
          @show-color-picker="showColorPickerModal = true"
          @decrease-font-size="editorStore.decreaseFontSize"
          @increase-font-size="editorStore.increaseFontSize"
          @decrease-spacing="editorStore.decreaseSpacing"
          @increase-spacing="editorStore.increaseSpacing"
          @decrease-line-height="editorStore.decreaseLineHeight"
          @increase-line-height="editorStore.increaseLineHeight"
          @reset-style="editorStore.resetStyle"
          @toggle-setting="t.toggleSetting"
        />
      </view>
    </view>

    <view class="editor-footer">
      <view class="footer-item" @click="handleMusic">
        <text class="footer-icon">🎵</text>
        <text class="footer-label">音乐</text>
      </view>
      <view class="footer-item" @click="showSettings = true">
        <text class="footer-icon">⚙️</text>
        <text class="footer-label">设置</text>
      </view>
      <view class="footer-item" @click="handleSave">
        <text class="footer-icon">💾</text>
        <text class="footer-label">保存</text>
      </view>
      <view class="preview-btn" @click="handlePreviewShare">
        <text class="preview-text">预览分享</text>
      </view>
    </view>

    <!-- Settings Popup -->
    <view v-if="showSettings" class="popup-overlay" @click="showSettings = false">
      <view class="popup-content settings-popup" @click.stop>
        <view class="popup-title">作品设置</view>
        <view class="settings-list">
          <view v-for="s in settingDefs" :key="s.key" class="setting-item">
            <view class="setting-info">
              <text class="setting-name">{{ s.name }}</text>
              <text v-if="s.desc" class="setting-desc">{{ s.desc }}</text>
            </view>
            <view class="setting-switch" :class="{ active: t.settings[s.key] }" @click="t.toggleSetting(s.key)">
              <view class="switch-thumb"></view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- Basic Info Form -->
    <BasicInfoForm
      :visible="showBasicInfo"
      :basic-info="t.basicInfo"
      @close="showBasicInfo = false"
      @confirm="handleConfirmBasicInfo"
      @location="handleLocation"
      @date-picker="handleDatePicker"
      @update="onBasicInfoUpdate"
    />

    
    <!-- Text Editor Popup -->
    <TextEditorPopup
      :visible="editorStore.showTextEditor"
      :editing-text="editorStore.editingText"
      :current-font="editorStore.currentFont"
      :current-color="editorStore.currentColor"
      :current-font-size="editorStore.currentFontSize"
      :current-spacing="editorStore.currentSpacing"
      :current-line-height="editorStore.currentLineHeight"
      @close="editorStore.closeTextEditor"
      @confirm="editorStore.confirmTextEdit"
      @input="editorStore.editingText = $event"
      @show-font-picker="showFontPickerModal = true"
      @show-color-picker="showColorPickerModal = true"
      @decrease-font-size="editorStore.decreaseFontSize"
      @increase-font-size="editorStore.increaseFontSize"
      @decrease-spacing="editorStore.decreaseSpacing"
      @increase-spacing="editorStore.increaseSpacing"
      @decrease-line-height="editorStore.decreaseLineHeight"
      @increase-line-height="editorStore.increaseLineHeight"
      @reset-style="editorStore.resetStyle"
    />

    <!-- Font Picker Modal -->
    <view v-if="showFontPickerModal" class="modal-overlay" @click="showFontPickerModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">选择字体</text>
          <text class="modal-close" @click="showFontPickerModal = false">完成</text>
        </view>
        <scroll-view class="modal-scroll" scroll-y>
          <view
            v-for="font in FONT_LIST"
            :key="font"
            class="modal-option"
            :class="{ active: editorStore.currentFont === font }"
            @click="onSelectFont(font)"
          >
            <text class="modal-option-text" :style="{ fontFamily: font === '华文楷体' ? 'STKaiti,KaiTi,serif' : font === '华文行楷' ? 'STXingkai,cursive' : font === '华文隶书' ? 'STLiti,cursive' : 'sans-serif' }">{{ font }}</text>
            <text v-if="editorStore.currentFont === font" class="modal-check">✓</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- Color Picker Modal -->
    <view v-if="showColorPickerModal" class="modal-overlay" @click="showColorPickerModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">选择颜色</text>
          <text class="modal-close" @click="showColorPickerModal = false">完成</text>
        </view>
        <view class="color-grid">
          <view
            v-for="color in COLOR_LIST"
            :key="color"
            class="color-item"
            :class="{ active: editorStore.currentColor === color }"
            @click="onSelectColor(color)"
          >
            <view class="color-swatch" :style="{ background: color, border: color === '#ffffff' ? '2rpx solid #ddd' : 'none' }">
              <text v-if="editorStore.currentColor === color" class="color-check">✓</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useTemplateStore } from '@/stores/template'
import { useEditorStore } from '@/stores/editor'
import { useWorksStore } from '@/stores/works'
import { FONT_LIST, COLOR_LIST } from '@/constants/editor'
import BasicInfoForm from './components/BasicInfoForm.vue'
import RightPanel from './components/RightPanel.vue'
import TextEditorPopup from './components/TextEditorPopup.vue'

// Map: preview element index -> editableElements index (or -1 for basic info)
const PREVIEW_MAP: Record<number, number> = {
  0: 0,   // cover image -> coverImage
  1: 1,   // photo1
  2: 2,   // photo2
  5: -1,  // couple info -> basic info form
  6: 6,   // coverTitle
  7: 7,   // coverSubtitle
  8: 8,   // photoTitle
  9: 9,   // photoSubtitle
  10: 10, // footerText
  11: 11, // footerSubText
}

const t = useTemplateStore()
const editorStore = useEditorStore()
const worksStore = useWorksStore()

const isFreeEdit = ref(false)
const currentPageIndex = ref(0)
const showSettings = ref(false)
const showBasicInfo = ref(false)

const showFontPickerModal = ref(false)
const showColorPickerModal = ref(false)
const selectedPreviewIdx = ref<number | null>(null)

const pageList = ref([
  { type: 'cover', label: '封面', image: t.templateData.coverImage },
  { type: 'info', label: '新人信息' },
  { type: 'footer', label: 'WEDDING' },
  { type: 'photo', label: '合卺', image: t.templateData.photo1 },
  { type: 'story', label: '我的情书' },
  { type: 'photo', label: '满小满', image: t.templateData.photo2 },
  { type: 'simple', label: 'GROOM' },
])

const settingDefs = [
  { key: 'danmaku', name: '开启弹幕工具栏', desc: '关闭后底部工具栏同步关闭' },
  { key: 'giftAlbum', name: '礼物相册' },
  { key: 'giftBuy', name: '礼物购买' },
  { key: 'moneyGift', name: '礼金功能' },
  { key: 'like', name: '点赞功能' },
  { key: 'album', name: '相册功能' },
]

const FONT_MAP: Record<string, string> = {
  '华文楷体': 'STKaiti,KaiTi,serif',
  '华文行楷': 'STXingkai,cursive',
  '华文隶书': 'STLiti,cursive',
  '思源宋体极细': 'SourceHanSerifCN-ExtraLight,serif',
  '思源宋体': 'SourceHanSerifCN-Regular,serif',
  '思源黑体': 'SourceHanSansCN-Regular,sans-serif',
}

function getElementStyle(previewIdx: number) {
  const elIdx = PREVIEW_MAP[previewIdx]
  if (elIdx === undefined || elIdx < 0) return {}
  const el = editorStore.editableElements[elIdx]
  if (!el.style) return {}
  return {
    fontFamily: FONT_MAP[el.style.font] || 'sans-serif',
    fontSize: el.style.fontSize + 'rpx',
    color: el.style.color,
    letterSpacing: el.style.spacing + 'rpx',
    lineHeight: el.style.lineHeight,
  }
}

function onPreviewClick(previewIdx: number) {
  const elIdx = PREVIEW_MAP[previewIdx]
  if (elIdx === undefined) return
  selectedPreviewIdx.value = previewIdx
  if (elIdx === -1) {
    showBasicInfo.value = true
    return
  }
  editorStore.openEditor(elIdx)
}

function onSelectMaterial(material: { url: string; name: string }) {
  editorStore.selectMaterial(material)
  selectedPreviewIdx.value = null
}

function onSelectFont(font: string) {
  editorStore.onFontChange(font)
  showFontPickerModal.value = false
}

function onSelectColor(color: string) {
  editorStore.onColorChange(color)
  showColorPickerModal.value = false
}

const goBack = () => { uni.navigateBack() }

const handleMusic = () => { uni.navigateTo({ url: '/pages/music/index' }) }

const handleSave = () => {
  worksStore.saveAsWork({
    id: Date.now(),
    title: t.basicInfo.groomName ? `${t.basicInfo.groomName} & ${t.basicInfo.brideName} 的婚礼请柬` : '我们的婚礼请柬',
    date: t.basicInfo.weddingDate || new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
    image: t.templateData.coverImage,
    status: 'draft',
    updatedAt: new Date().toISOString(),
  })
  t.persist()
  uni.showToast({ title: '已保存', icon: 'success' })
}

const handlePreviewShare = () => { uni.navigateTo({ url: '/pages/preview/index' }) }

const handleOpenBasicInfo = () => { showBasicInfo.value = true }

const handleConfirmBasicInfo = () => {
  showBasicInfo.value = false
  t.persist()
  uni.showToast({ title: '已保存', icon: 'success' })
}

const handleDatePicker = () => {}

const onBasicInfoUpdate = (field: string, value: string) => {
  if (field === 'weddingDate') {
    t.basicInfo.weddingDate = value
  }
}

const handleLocation = () => {
  try {
    uni.chooseLocation({
      success: (res: any) => { t.basicInfo.location = res.name || res.address }
    })
  } catch (e) {
    uni.showToast({ title: '选择位置失败', icon: 'none' })
  }
}

const onImageError = () => {}
</script>

<style lang="scss" scoped>
.editor-page {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
  position: relative;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background: #fff;
  flex-shrink: 0;
}

.header-back {
  width: 60rpx; height: 60rpx;
  display: flex; align-items: center; justify-content: center;
}
.back-icon { font-size: 56rpx; color: #333; font-weight: 300; line-height: 1; }
.header-title { font-size: 32rpx; font-weight: 600; color: #333; }
.header-right { width: 60rpx; }

.editor-body {
  flex: 1;
  display: flex;
  padding: 20rpx;
  gap: 20rpx;
  min-height: 0;
  overflow: hidden;
}

.preview-area {
  flex: 1;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.05);
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.preview-scroll { flex: 1; width: 100%; min-height: 0; }
.preview-card { width: 100%; padding: 16rpx; box-sizing: border-box; }
.page-content { width: 100%; position: relative; }

.section {
  width: 100%;
  position: relative;
  overflow: hidden;
}

.preview-active-border {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  border: 4rpx solid #e84a6e;
  border-radius: 8rpx;
  z-index: 10;
  pointer-events: none;
}

.cover-section {
  height: 560rpx;
  border-radius: 8rpx;
  overflow: hidden;
}
.cover-image {
  width: 100%; height: 100%;
  position: absolute; top: 0; left: 0;
}
.cover-overlay {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.welcome-text {
  font-size: 18rpx; color: #333; letter-spacing: 4rpx;
}
.main-title {
  font-size: 56rpx; color: #333; font-weight: bold; margin-top: 16rpx;
  font-family: STKaiti, KaiTi, serif;
}

.couple-info-section {
  padding: 48rpx 24rpx 32rpx;
  background: #fff;
  display: flex;
  align-items: center; justify-content: center;
  flex-wrap: wrap; gap: 16rpx;
}
.couple-names {
  display: flex; flex-direction: column; align-items: center;
}
.name { font-size: 32rpx; color: #333; font-weight: 600; }
.groom-bride { font-size: 14rpx; color: #999; letter-spacing: 2rpx; margin-top: 4rpx; }
.shuangxi-icon { font-size: 56rpx; color: #e84a6e; font-weight: bold; margin: 0 24rpx; }
.wedding-date {
  width: 100%; text-align: center; font-size: 24rpx; color: #333;
  margin-top: 24rpx; font-weight: 500;
}
.wedding-address {
  width: 100%; text-align: center; font-size: 18rpx; color: #999; margin-top: 8rpx;
}

.footer-border {
  padding: 24rpx; background: #fff;
  display: flex; justify-content: space-between; align-items: center;
  border-top: 1rpx solid #eee; border-bottom: 1rpx solid #eee;
}
.footer-text-left, .footer-text-center, .footer-text-right {
  font-size: 18rpx; color: #999; letter-spacing: 2rpx; font-weight: 500;
}

.photo-section {
  height: 400rpx; border-radius: 8rpx; overflow: hidden; margin-top: 16rpx;
  &.small { height: 280rpx; }
}
.photo-image { width: 100%; height: 100%; }
.photo-overlay {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.3);
}
.photo-title {
  font-size: 48rpx; color: #fff; font-weight: bold; font-family: STKaiti, KaiTi, serif;
}
.photo-sub { font-size: 20rpx; color: #fff; letter-spacing: 4rpx; margin-top: 8rpx; }

.love-story-section {
  padding: 80rpx 24rpx; background: #fff;
  display: flex; flex-direction: column; align-items: center;
}
.story-title { font-size: 32rpx; color: #333; font-weight: 500; }
.story-sub { font-size: 18rpx; color: #999; letter-spacing: 4rpx; margin-top: 8rpx; }

.simple-section {
  padding: 60rpx 24rpx; background: #fff;
  display: flex; flex-direction: column; align-items: center;
}
.simple-title { font-size: 28rpx; color: #333; font-weight: 500; }
.simple-sub { font-size: 14rpx; color: #999; letter-spacing: 4rpx; margin-top: 8rpx; }

.sidebar-area {
  width: 520rpx;
  flex-shrink: 0;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
}

.thumb-strip {
  height: 120rpx;
  white-space: nowrap;
  padding: 12rpx 16rpx;
  box-sizing: border-box;
  background: #fafafa;
  border-top: 1rpx solid #f0f0f0;
  flex-shrink: 0;
}
.thumb-item {
  display: inline-flex;
  width: 80rpx; height: 80rpx;
  border-radius: 8rpx;
  margin-right: 8rpx;
  overflow: hidden;
  border: 3rpx solid transparent;
  vertical-align: top;
  &.active { border-color: #e84a6e; }
}
.thumb-img { width: 100%; height: 100%; }
.thumb-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #fff5f5 0%, #ffe4e8 100%);
}
.info-thumb { background: linear-gradient(135deg, #fff8f0 0%, #ffe8d4 100%); }
.footer-thumb { background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%); }
.story-thumb { background: linear-gradient(135deg, #f8f5ff 0%, #e8d4ff 100%); }
.photo-thumb { background: linear-gradient(135deg, #e8f4ff 0%, #d4e8ff 100%); }
.thumb-icon { font-size: 28rpx; }
.thumb-label { font-size: 18rpx; color: #666; }

.editor-footer {
  display: flex; align-items: center;
  padding: 20rpx 30rpx; background: #fff;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 8rpx rgba(0,0,0,0.03);
  flex-shrink: 0; gap: 12rpx;
}
.footer-item {
  display: flex; flex-direction: column; align-items: center; gap: 6rpx; padding: 8rpx 16rpx;
}
.footer-icon { font-size: 36rpx; }
.footer-label { font-size: 22rpx; color: #666; }
.preview-btn {
  margin-left: auto;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  color: #fff; border-radius: 40rpx; padding: 20rpx 40rpx;
  box-shadow: 0 4rpx 16rpx rgba(232,74,110,0.3);
}
.preview-text { font-size: 28rpx; font-weight: 600; color: #fff; }

.popup-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; z-index: 1000;
}
.popup-content {
  width: 100%; background: #fff;
  border-radius: 32rpx 32rpx 0 0; max-height: 80vh;
}
.settings-popup { padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom)); }
.popup-title {
  font-size: 32rpx; font-weight: 600; color: #333;
  text-align: center; margin-bottom: 32rpx;
}
.settings-list { display: flex; flex-direction: column; }
.setting-item {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 28rpx 0; border-bottom: 1rpx solid #f0f0f0; gap: 24rpx;
  &:last-child { border-bottom: none; }
}
.setting-info { flex: 1; }
.setting-name { font-size: 28rpx; color: #333; font-weight: 500; display: block; }
.setting-desc { font-size: 22rpx; color: #999; margin-top: 8rpx; display: block; line-height: 1.4; }
.setting-switch {
  width: 88rpx; height: 50rpx; border-radius: 25rpx;
  background: #e0e0e0; position: relative; flex-shrink: 0;
  transition: background 0.2s ease; margin-top: 4rpx;
  &.active {
    background: #e84a6e;
    .switch-thumb { left: 42rpx; }
  }
}
.switch-thumb {
  width: 44rpx; height: 44rpx; border-radius: 50%;
  background: #fff; position: absolute; top: 3rpx; left: 3rpx;
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.15);
  transition: left 0.2s ease;
}

/* Modal */
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; z-index: 2000;
}
.modal-content {
  width: 100%; background: #fff;
  border-radius: 32rpx 32rpx 0 0; max-height: 60vh;
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 28rpx 32rpx; border-bottom: 1rpx solid #f0f0f0;
}
.modal-title { font-size: 32rpx; font-weight: 600; color: #333; }
.modal-close { font-size: 28rpx; color: #e84a6e; font-weight: 500; }
.modal-scroll { padding: 16rpx 0; max-height: 50vh; }
.modal-option {
  display: flex; align-items: center; justify-content: space-between;
  padding: 28rpx 32rpx; border-bottom: 1rpx solid #f5f5f5;
  &.active { background: #fff5f5; }
}
.modal-option-text { font-size: 30rpx; color: #333; }
.modal-check { font-size: 28rpx; color: #e84a6e; }

.color-grid {
  display: flex; flex-wrap: wrap; padding: 32rpx; gap: 24rpx;
}
.color-item {
  width: calc(20% - 20rpx);
  display: flex; align-items: center; justify-content: center;
}
.color-swatch {
  width: 80rpx; height: 80rpx; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
.color-check { font-size: 32rpx; color: #fff; text-shadow: 0 1rpx 2rpx rgba(0,0,0,0.5); }
</style>
