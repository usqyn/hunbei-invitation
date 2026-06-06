<template>
  <view class="page">
    <view class="header">
      <view class="back-btn" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <view class="header-title">编辑器</view>
      <view class="header-right">
        <view class="header-btn" @click="handleShare">
          <text class="btn-icon">🔗</text>
        </view>
        <view class="header-btn" @click="handleMore">
          <text class="btn-icon">⋯</text>
        </view>
      </view>
    </view>

    <view class="editor-main">
      <scroll-view class="canvas-scroll" scroll-y>
        <view class="canvas-container">
          <view class="canvas-preview">
            <view class="page-content">
              <image class="bg-image" :src="bgImage" mode="aspectFill"></image>
              
              <view class="text-overlay">
                <text class="welcome-text">Welcome to our wedding</text>
                <text class="main-title">好久不见</text>
                <text class="sub-title">婚礼见~</text>
              </view>

              <view class="couple-section">
                <view class="person-item">
                  <text class="person-name">{{ basicInfo.groomName || '满小满' }}</text>
                  <text class="person-role">GROOM</text>
                </view>
                <text class="couple-divider">♥</text>
                <view class="person-item">
                  <text class="person-name">{{ basicInfo.brideName || '美小美' }}</text>
                  <text class="person-role">BRIDE</text>
                </view>
              </view>

              <view class="date-section">
                <text class="wedding-date">{{ basicInfo.weddingDate || '2050.05.20' }}</text>
                <text class="wedding-location">{{ basicInfo.detailAddress || '婚贝大酒店A栋9F幸福宴会厅' }}</text>
              </view>

              <view class="story-section">
                <text class="story-title">OUR LOVE STORY</text>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>

      <view class="right-panel">
        <scroll-view class="panel-scroll" scroll-y>
          <view class="panel-tabs">
            <view 
              v-for="tab in panelTabs" 
              :key="tab.key"
              class="panel-tab-item"
              :class="{ active: activePanelTab === tab.key }"
              @click="activePanelTab = tab.key"
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
                  @click="openEditor(idx)"
                >
                  <view v-if="element.type === 'image'" class="element-preview">
                    <image class="preview-img" :src="element.text" mode="aspectFill"></image>
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
                  @click="selectMaterial(material)"
                >
                  <image class="material-img" :src="material.url" mode="aspectFill"></image>
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
                  <view class="style-value" @click="showFontPicker">
                    <text class="value-text">{{ currentFont }}</text>
                    <text class="arrow">›</text>
                  </view>
                </view>

                <view class="style-row">
                  <view class="style-label">
                    <text class="label-icon">🖊</text>
                    <text class="label-text">字体颜色</text>
                  </view>
                  <view class="style-value" @click="showColorPicker">
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
                    <view class="size-btn" @click="decreaseSize">—</view>
                    <text class="size-value">{{ currentFontSize }}</text>
                    <view class="size-btn" @click="increaseSize">+</view>
                  </view>
                </view>

                <view class="style-row">
                  <view class="style-label">
                    <text class="label-icon">⫿</text>
                    <text class="label-text">字符间距</text>
                  </view>
                  <view class="font-size-controls">
                    <view class="size-btn" @click="decreaseSpacing">—</view>
                    <text class="size-value">{{ currentSpacing }}</text>
                    <view class="size-btn" @click="increaseSpacing">+</view>
                  </view>
                </view>

                <view class="style-row">
                  <view class="style-label">
                    <text class="label-icon">Ā</text>
                    <text class="label-text">行间距</text>
                  </view>
                  <view class="font-size-controls">
                    <view class="size-btn" @click="decreaseLineHeight">—</view>
                    <text class="size-value">{{ currentLineHeight }}</text>
                    <view class="size-btn" @click="increaseLineHeight">+</view>
                  </view>
                </view>

                <view class="reset-btn" @click="resetStyle">
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
                <view class="setting-item">
                  <view class="setting-info">
                    <text class="setting-name">开启弹幕工具栏</text>
                    <text class="setting-desc">关闭后，天鹅婚礼工具栏、祝福互动功能将关闭相关功能</text>
                  </view>
                  <switch :checked="settings.danmaku" @change="toggleSetting('danmaku')" color="#e84a6e" />
                </view>

                <view class="setting-item">
                  <view class="setting-info">
                    <text class="setting-name">礼物相册</text>
                  </view>
                  <switch :checked="settings.giftAlbum" @change="toggleSetting('giftAlbum')" color="#e84a6e" />
                </view>

                <view class="setting-item">
                  <view class="setting-info">
                    <text class="setting-name">礼物购买</text>
                  </view>
                  <switch :checked="settings.giftBuy" @change="toggleSetting('giftBuy')" color="#e84a6e" />
                </view>

                <view class="setting-item">
                  <view class="setting-info">
                    <text class="setting-name">礼金功能</text>
                  </view>
                  <switch :checked="settings.moneyGift" @change="toggleSetting('moneyGift')" color="#e84a6e" />
                </view>

                <view class="setting-item">
                  <view class="setting-info">
                    <text class="setting-name">点赞功能</text>
                  </view>
                  <switch :checked="settings.like" @change="toggleSetting('like')" color="#e84a6e" />
                </view>

                <view class="setting-item">
                  <view class="setting-info">
                    <text class="setting-name">相册功能</text>
                    <text class="setting-desc">打开后可查看宾客在邀请函中使用的相册</text>
                  </view>
                  <switch :checked="settings.album" @change="toggleSetting('album')" color="#e84a6e" />
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <view class="bottom-bar">
      <view class="bottom-btn" @click="handleMusic">
        <text class="btn-icon">🎵</text>
        <text class="btn-text">音乐</text>
      </view>
      <view class="bottom-btn" @click="handleSettings">
        <text class="btn-icon">⚙️</text>
        <text class="btn-text">设置</text>
      </view>
      <view class="bottom-btn" @click="handleSave">
        <view class="save-icon-wrapper">
          <text class="btn-icon">💾</text>
          <text class="save-check">✓</text>
        </view>
        <text class="btn-text">保存</text>
      </view>
      <button class="preview-btn" @click="handlePreviewShare">预览分享</button>
    </view>

    <view v-if="showBasicInfoEditor" class="basic-info-popup" @click="closeBasicInfoEditor">
      <view class="basic-info-content" @click.stop>
        <view class="basic-info-header">
          <view class="back-btn-small" @click="closeBasicInfoEditor">
            <text class="back-icon-small">‹</text>
          </view>
          <text class="basic-info-title">完善基本信息</text>
          <view class="confirm-btn-small" @click="confirmBasicInfo">
            <text class="confirm-icon">✓</text>
          </view>
        </view>

        <scroll-view class="basic-info-scroll" scroll-y>
          <view class="form-list">
            <view class="form-item">
              <view class="form-label">
                <text class="required-mark">*</text>
                <text class="label-text">新郎姓名</text>
              </view>
              <view class="form-input-wrapper">
                <input 
                  class="form-input" 
                  placeholder="请输入新郎真实姓名" 
                  v-model="basicInfo.groomName"
                  maxlength="30"
                />
                <text class="char-count">{{ basicInfo.groomName?.length || 0 }}/30</text>
              </view>
            </view>

            <view class="form-item">
              <view class="form-label">
                <text class="required-mark">*</text>
                <text class="label-text">新娘姓名</text>
              </view>
              <view class="form-input-wrapper">
                <input 
                  class="form-input" 
                  placeholder="请输入新娘真实姓名" 
                  v-model="basicInfo.brideName"
                  maxlength="30"
                />
                <text class="char-count">{{ basicInfo.brideName?.length || 0 }}/30</text>
              </view>
            </view>

            <view class="form-item">
              <view class="form-label">
                <text class="label-text">婚礼时间</text>
              </view>
              <view class="form-input-wrapper" @click="showDatePicker = true">
                <input 
                  class="form-input" 
                  placeholder="选择婚礼时间" 
                  :value="basicInfo.weddingDate"
                  disabled
                />
                <text class="arrow-right">›</text>
              </view>
            </view>

            <view class="form-item">
              <view class="form-label">
                <text class="label-text">位置导航</text>
              </view>
              <view class="form-input-wrapper" @click="handleLocation">
                <input 
                  class="form-input" 
                  placeholder="搜索定位导航位置" 
                  :value="basicInfo.location"
                  disabled
                />
                <view class="location-btn">
                  <text class="location-icon">📍</text>
                  <text class="location-text">定位</text>
                </view>
              </view>
            </view>

            <view v-if="basicInfo.location" class="map-preview">
              <view class="map-placeholder">
                <text class="map-location-text">{{ basicInfo.location }}</text>
                <view class="map-marker">📍</view>
              </view>
            </view>

            <view class="form-item">
              <view class="form-label">
                <text class="label-text">详细地址</text>
              </view>
              <view class="form-input-wrapper">
                <input 
                  class="form-input" 
                  placeholder="例：婚贝大酒店9F幸福宴会厅" 
                  v-model="basicInfo.detailAddress"
                  maxlength="100"
                />
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <view v-if="showTextEditor" class="text-editor-popup" @click="closeTextEditor">
      <view class="editor-content" @click.stop>
        <view class="editor-header">
          <text class="close-btn" @click="closeTextEditor">✕</text>
          <text class="editor-title">修改文字</text>
          <text class="confirm-btn" @click="confirmTextEdit">✓</text>
        </view>

        <view class="text-area">
          <textarea 
            class="text-input" 
            :value="editingText"
            @input="onTextInput"
            :maxlength="500"
          ></textarea>
        </view>

        <view class="style-options">
          <view class="style-row">
            <view class="style-label">
              <text class="label-icon">𝔗</text>
              <text class="label-text">字体</text>
            </view>
            <view class="style-value" @click="showFontPicker">
              <text class="value-text">{{ currentFont }}</text>
              <text class="arrow">›</text>
            </view>
          </view>

          <view class="style-row">
            <view class="style-label">
              <text class="label-icon">🖊</text>
              <text class="label-text">字体颜色</text>
            </view>
            <view class="style-value" @click="showColorPicker">
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
              <view class="size-btn" @click="decreaseSize">—</view>
              <text class="size-value">{{ currentFontSize }}</text>
              <view class="size-btn" @click="increaseSize">+</view>
            </view>
          </view>

          <view class="style-row">
            <view class="style-label">
              <text class="label-icon">⫿</text>
              <text class="label-text">字符间距</text>
            </view>
            <view class="font-size-controls">
              <view class="size-btn" @click="decreaseSpacing">—</view>
              <text class="size-value">{{ currentSpacing }}</text>
              <view class="size-btn" @click="increaseSpacing">+</view>
            </view>
          </view>

          <view class="style-row">
            <view class="style-label">
              <text class="label-icon">Ā</text>
              <text class="label-text">行间距</text>
            </view>
            <view class="font-size-controls">
              <view class="size-btn" @click="decreaseLineHeight">—</view>
              <text class="size-value">{{ currentLineHeight }}</text>
              <view class="size-btn" @click="increaseLineHeight">+</view>
            </view>
          </view>

          <view class="reset-btn" @click="resetStyle">
            <text class="reset-text">还原</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

const bgImage = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=virtual%20human%20wedding%20couple%20romantic%20red%20theme%20chinese%20wedding%20invitation&image_size=portrait_4_3'

const showTextEditor = ref(false)
const showBasicInfoEditor = ref(false)
const showDatePicker = ref(false)
const selectedElement = ref<number | null>(null)
const editingText = ref('')
const currentFont = ref('思源宋体极细')
const currentColor = ref('#666666')
const currentFontSize = ref(12)
const currentSpacing = ref(2)
const currentLineHeight = ref(2)
const activePanelTab = ref('edit')

const basicInfo = reactive({
  groomName: '',
  brideName: '',
  weddingDate: '',
  location: '',
  detailAddress: ''
})

const panelTabs = [
  { key: 'edit', name: '自由编辑', icon: '🧩' },
  { key: 'material', name: '素材库', icon: '🖼' },
  { key: 'text', name: '文字', icon: '📝' },
  { key: 'settings', name: '设置', icon: '⚙️' }
]

const editableElements = reactive([
  {
    type: 'image',
    text: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=virtual%20human%20wedding%20couple%20photo%20main%20red%20theme&image_size=square',
    x: 50,
    y: 100,
    fontSize: 32,
    color: '#fff',
    width: 200,
    height: 150
  },
  {
    type: 'image',
    text: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=virtual%20human%20wedding%20couple%20photo%20second&image_size=square',
    x: 50,
    y: 100,
    fontSize: 32,
    color: '#fff',
    width: 200,
    height: 150
  },
  {
    type: 'basic',
    text: '完善基本信息'
  },
  { type: 'text', text: '我们结婚啦' },
  { type: 'text', text: 'Welcome to our wedding' },
  { type: 'text', text: '好久不见' },
  { type: 'text', text: '婚礼见~' }
])

const materialList = [
  { url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=virtual%20human%20wedding%20couple%20photo%20photo%201&image_size=square', name: '新人合影1' },
  { url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=virtual%20human%20wedding%20couple%20photo%20photo%202&image_size=square', name: '新人合影2' },
  { url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20wedding%20double%20happiness%20decoration%20red&image_size=square', name: '囍字装饰' },
  { url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=romantic%20wedding%20heart%20decoration%20flower%20hearts%20red&image_size=square', name: '爱心装饰' },
  { url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wedding%20ring%20gold%20ring%20couple&image_size=square', name: '戒指' },
  { url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20wedding%20flowers%20bouquet%20red%20roses&image_size=square', name: '玫瑰花束' }
]

const settings = reactive({
  danmaku: true,
  giftAlbum: true,
  giftBuy: true,
  moneyGift: true,
  like: true,
  album: true
})

const goBack = () => {
  uni.navigateBack()
}

const handleShare = () => {
  uni.showToast({ title: '分享', icon: 'none' })
}

const handleMore = () => {
  uni.showToast({ title: '更多选项', icon: 'none' })
}

const openEditor = (idx: number) => {
  if (editableElements[idx].type === 'basic') {
    showBasicInfoEditor.value = true
  } else if (editableElements[idx].type === 'text') {
    selectedElement.value = idx
    editingText.value = editableElements[idx].text
    showTextEditor.value = true
  } else {
    uni.showToast({ title: '图片编辑', icon: 'none' })
  }
}

const closeBasicInfoEditor = () => {
  showBasicInfoEditor.value = false
}

const confirmBasicInfo = () => {
  showBasicInfoEditor.value = false
  uni.showToast({ title: '已保存', icon: 'success' })
}

const closeTextEditor = () => {
  showTextEditor.value = false
}

const confirmTextEdit = () => {
  if (selectedElement.value !== null) {
    editableElements[selectedElement.value].text = editingText.value
  }
  showTextEditor.value = false
  uni.showToast({ title: '已保存', icon: 'success' })
}

const onTextInput = (e: any) => {
  editingText.value = e.detail.value
}

const decreaseSize = () => {
  if (currentFontSize.value > 8) {
    currentFontSize.value--
  }
}

const increaseSize = () => {
  if (currentFontSize.value < 100) {
    currentFontSize.value++
  }
}

const decreaseSpacing = () => {
  if (currentSpacing.value > 0) {
    currentSpacing.value--
  }
}

const increaseSpacing = () => {
  currentSpacing.value++
}

const decreaseLineHeight = () => {
  if (currentLineHeight.value > 1) {
    currentLineHeight.value--
  }
}

const increaseLineHeight = () => {
  currentLineHeight.value++
}

const showFontPicker = () => {
  uni.showToast({ title: '字体选择', icon: 'none' })
}

const showColorPicker = () => {
  uni.showToast({ title: '颜色选择', icon: 'none' })
}

const resetStyle = () => {
  currentFont.value = '思源宋体极细'
  currentColor.value = '#666666'
  currentFontSize.value = 12
  currentSpacing.value = 2
  currentLineHeight.value = 2
  uni.showToast({ title: '已还原', icon: 'success' })
}

const selectMaterial = (material: any) => {
  uni.showToast({ title: '已添加素材', icon: 'success' })
}

const toggleSetting = (key: string) => {
  settings[key] = !settings[key]
}

const handleMusic = () => {
  uni.navigateTo({ url: '/pages/music/index' })
}

const handleSettings = () => {
  activePanelTab.value = 'settings'
}

const handleSave = () => {
  uni.showToast({ title: '已保存', icon: 'success' })
}

const handlePreviewShare = () => {
  uni.showToast({ title: '生成预览', icon: 'none' })
}

const handleLocation = () => {
  uni.chooseLocation({
    success: (res) => {
      basicInfo.location = res.name || res.address
    }
  })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  background: #ffffff;
}

.back-btn {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 60rpx;
  color: #333;
  font-weight: 300;
}

.header-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
}

.header-right {
  display: flex;
  gap: 20rpx;
}

.header-btn {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon {
  font-size: 40rpx;
}

.editor-main {
  flex: 1;
  display: flex;
  gap: 20rpx;
  padding: 20rpx;
  height: 0;
}

.canvas-scroll {
  flex: 0 0 460rpx;
  height: 100%;
  background: #f0f0f0;
  border-radius: 16rpx;
  overflow: hidden;
}

.canvas-container {
  padding: 20rpx;
}

.canvas-preview {
  width: 100%;
  min-height: 1200rpx;
  border-radius: 12rpx;
  overflow: hidden;
  position: relative;
}

.page-content {
  width: 100%;
  min-height: 1200rpx;
  position: relative;
}

.bg-image {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.text-overlay {
  position: absolute;
  top: 80rpx;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.welcome-text {
  font-size: 32rpx;
  color: #fff;
  text-shadow: 2rpx 2rpx 8rpx rgba(0,0,0,0.5);
  letter-spacing: 8rpx;
}

.main-title {
  font-size: 72rpx;
  color: #fff;
  text-shadow: 2rpx 2rpx 8rpx rgba(0,0,0,0.5);
  margin-top: 20rpx;
  font-weight: bold;
}

.sub-title {
  font-size: 48rpx;
  color: #fff;
  text-shadow: 2rpx 2rpx 8rpx rgba(0,0,0,0.5);
}

.couple-section {
  position: absolute;
  top: 550rpx;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 40rpx;
}

.person-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.person-name {
  font-size: 44rpx;
  color: #fff;
  text-shadow: 2rpx 2rpx 8rpx rgba(0,0,0,0.5);
  font-weight: 600;
}

.person-role {
  font-size: 28rpx;
  color: #fff;
  text-shadow: 2rpx 2rpx 8rpx rgba(0,0,0,0.5);
  letter-spacing: 4rpx;
  margin-top: 10rpx;
}

.couple-divider {
  font-size: 48rpx;
  color: #e84a6e;
}

.date-section {
  position: absolute;
  top: 700rpx;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.wedding-date {
  font-size: 36rpx;
  color: #fff;
  text-shadow: 2rpx 2rpx 8rpx rgba(0,0,0,0.5);
  letter-spacing: 12rpx;
}

.wedding-location {
  font-size: 28rpx;
  color: #fff;
  text-shadow: 2rpx 2rpx 8rpx rgba(0,0,0,0.5);
  margin-top: 15rpx;
}

.story-section {
  position: absolute;
  bottom: 100rpx;
  left: 0;
  right: 0;
  text-align: center;
}

.story-title {
  font-size: 28rpx;
  color: #fff;
  text-shadow: 2rpx 2rpx 8rpx rgba(0,0,0,0.5);
  letter-spacing: 20rpx;
}

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
  border-bottom: 1px solid #eee;
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
    border-bottom-color: #e84a6e;

    .tab-text {
      color: #e84a6e;
      font-weight: 600;
    }
  }
}

.tab-icon {
  font-size: 36rpx;
}

.tab-text {
  font-size: 24rpx;
  color: #666;
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
  color: #333;
}

.element-list {
  display: flex;
  flex-direction: column;
  gap: 15rpx;
}

.element-item {
  padding: 20rpx;
  background: #f9f9f9;
  border-radius: 12rpx;
  border: 3rpx solid transparent;
  position: relative;

  &.selected {
    border-color: #e84a6e;
    background: #fff0f3;
  }
}

.element-preview {
  width: 100%;
  height: 200rpx;
  border-radius: 12rpx;
  overflow: hidden;
  position: relative;
  background: #eee;
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
  color: #333;
  line-height: 1.6;
}

.element-tag {
  font-size: 22rpx;
  color: #e84a6e;
  background: #ffe4e8;
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
  background: #f9f9f9;
}

.material-img {
  width: 100%;
  height: 180rpx;
}

.material-name {
  display: block;
  padding: 15rpx;
  font-size: 26rpx;
  color: #666;
  text-align: center;
}

.style-options {
  padding: 0;
}

.style-row {
  display: flex;
  align-items: center;
  padding: 25rpx 0;
  border-bottom: 1px solid #f0f0f0;

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
  color: #333;
}

.style-value {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.value-text {
  font-size: 28rpx;
  color: #333;
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
  background: #f5f5f5;
  padding: 5rpx 15rpx;
  border-radius: 12rpx;
}

.size-btn {
  width: 60rpx;
  height: 60rpx;
  background: #fff;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #666;
}

.size-value {
  font-size: 30rpx;
  color: #333;
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
  color: #666;
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
  border-bottom: 1px solid #f0f0f0;

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
  color: #333;
}

.setting-desc {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
}

.bottom-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  background: #fff;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  border-top: 1px solid #eee;
  gap: 20rpx;
}

.bottom-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5rpx;
  padding: 10rpx 20rpx;
}

.save-icon-wrapper {
  position: relative;
}

.save-check {
  position: absolute;
  bottom: -5rpx;
  right: -5rpx;
  width: 30rpx;
  height: 30rpx;
  background: #4cd964;
  color: #fff;
  border-radius: 50%;
  font-size: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-text {
  font-size: 24rpx;
  color: #666;
}

.preview-btn {
  margin-left: auto;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  color: #fff;
  border: none;
  border-radius: 40rpx;
  padding: 24rpx 60rpx;
  font-size: 32rpx;
  font-weight: 600;

  &::after {
    border: none;
  }
}

.basic-info-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.basic-info-content {
  width: 100%;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding-bottom: env(safe-area-inset-bottom);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.basic-info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}

.back-btn-small {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon-small {
  font-size: 48rpx;
  color: #333;
  font-weight: 300;
}

.basic-info-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
}

.confirm-btn-small {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-icon {
  font-size: 48rpx;
  color: #e84a6e;
  font-weight: bold;
}

.basic-info-scroll {
  flex: 1;
  height: 0;
}

.form-list {
  padding: 20rpx 30rpx;
}

.form-item {
  margin-bottom: 30rpx;
}

.form-label {
  display: flex;
  align-items: center;
  margin-bottom: 15rpx;
}

.required-mark {
  color: #e84a6e;
  font-size: 32rpx;
  margin-right: 8rpx;
}

.label-text {
  font-size: 32rpx;
  color: #333;
  font-weight: 500;
}

.form-input-wrapper {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 16rpx;
  padding: 24rpx 30rpx;
  position: relative;
}

.form-input {
  flex: 1;
  font-size: 32rpx;
  color: #333;
}

.char-count {
  font-size: 28rpx;
  color: #999;
}

.arrow-right {
  font-size: 32rpx;
  color: #ccc;
}

.location-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.location-icon {
  font-size: 32rpx;
}

.location-text {
  font-size: 28rpx;
  color: #e84a6e;
}

.map-preview {
  margin-top: 20rpx;
  border-radius: 16rpx;
  overflow: hidden;
}

.map-placeholder {
  width: 100%;
  height: 300rpx;
  background: linear-gradient(135deg, #e8f4ff 0%, #d4edda 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.map-location-text {
  font-size: 28rpx;
  color: #333;
  text-align: center;
  padding: 0 40rpx;
}

.map-marker {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 48rpx;
}

.text-editor-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.editor-content {
  width: 100%;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding-bottom: env(safe-area-inset-bottom);
  max-height: 80vh;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  border-bottom: 1px solid #eee;
}

.close-btn, .confirm-btn {
  font-size: 48rpx;
  color: #666;
  width: 80rpx;
  text-align: center;
}

.confirm-btn {
  color: #e84a6e;
  font-weight: bold;
}

.editor-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.text-area {
  padding: 30rpx;
}

.text-input {
  width: 100%;
  min-height: 300rpx;
  border: 2rpx solid #ddd;
  border-radius: 16rpx;
  padding: 20rpx;
  font-size: 28rpx;
  line-height: 1.8;
  box-sizing: border-box;
}
</style>
