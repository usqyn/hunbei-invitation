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
              <view class="section cover-section">
                <image class="cover-image" :src="templateStore.templateData.coverImage" mode="aspectFill" @error="onImageError"></image>
                <view class="cover-overlay">
                  <text class="welcome-text">Welcome to our wedding</text>
                  <text class="main-title">好久不见</text>
                  <text class="sub-title">婚礼见~</text>
                </view>
              </view>

              <view class="section couple-info-section">
                <view class="couple-names">
                  <text class="name">{{ templateStore.basicInfo.groomName || '满小满' }}</text>
                  <text class="groom-bride">GROOM</text>
                </view>
                <text class="shuangxi-icon">囍</text>
                <view class="couple-names">
                  <text class="name">{{ templateStore.basicInfo.brideName || '美小美' }}</text>
                  <text class="groom-bride">BRIDE</text>
                </view>
                <text class="wedding-date">{{ templateStore.basicInfo.weddingDate || '2050.05.20' }}</text>
                <text class="wedding-address">{{ templateStore.basicInfo.detailAddress || '婚贝大酒店A栋9F幸福宴会厅' }}</text>
              </view>

              <view class="section footer-border">
                <text class="footer-text-left">WEDDING</text>
                <text class="footer-text-center">INVITATION</text>
                <text class="footer-text-right">2050</text>
              </view>

              <view class="section photo-section">
                <image class="photo-image" :src="templateStore.templateData.photo1" mode="aspectFill" @error="onImageError"></image>
                <view class="photo-overlay">
                  <text class="photo-title">合卺</text>
                  <text class="photo-sub">He jin &amp; Ju hua</text>
                  <text class="photo-content">To dear family and friends</text>
                </view>
              </view>

              <view class="section love-story-section">
                <text class="story-title">我的情书</text>
                <text class="story-sub">OUR LOVE STORY</text>
              </view>

              <view class="section photo-section small">
                <image class="photo-image" :src="templateStore.templateData.photo2" mode="aspectFill" @error="onImageError"></image>
              </view>

              <view class="section simple-section">
                <text class="simple-title">满小满</text>
                <text class="simple-sub">GROOM</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="sidebar-area">
        <view class="sidebar-top">
          <view class="edit-switch-row">
            <text class="switch-label">自由编辑</text>
            <view class="switch-toggle" :class="{ active: isFreeEdit }" @click="isFreeEdit = !isFreeEdit">
              <view class="switch-dot"></view>
            </view>
          </view>
          <view class="edit-content-btn" @click="handleOpenBasicInfo">
            <text class="btn-icon">✏️</text>
            <text class="btn-text">修改对应内容</text>
            <text class="btn-arrow">›</text>
          </view>
        </view>

        <scroll-view class="sidebar-pages" scroll-y>
          <view
            v-for="(page, idx) in pageList"
            :key="idx"
            class="page-thumb"
            :class="{ active: currentPageIndex === idx }"
            @click="currentPageIndex = idx"
          >
            <image v-if="page.type === 'cover'" class="thumb-image" :src="page.image" mode="aspectFill" @error="onImageError"></image>
            <view v-else-if="page.type === 'info'" class="thumb-placeholder info-thumb">
              <text class="thumb-icon">💑</text>
              <text class="thumb-label">{{ page.label }}</text>
            </view>
            <view v-else-if="page.type === 'footer'" class="thumb-placeholder footer-thumb">
              <text class="thumb-label">{{ page.label }}</text>
            </view>
            <view v-else-if="page.type === 'story'" class="thumb-placeholder story-thumb">
              <text class="thumb-icon">💌</text>
              <text class="thumb-label">{{ page.label }}</text>
            </view>
            <view v-else class="thumb-placeholder photo-thumb">
              <text class="thumb-label">{{ page.label }}</text>
            </view>
          </view>
        </scroll-view>
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

    <view v-if="showSettings" class="popup-overlay" @click="showSettings = false">
      <view class="popup-content settings-popup" @click.stop>
        <view class="popup-title">作品设置</view>
        <view class="settings-list">
          <view class="setting-item">
            <view class="setting-info">
              <text class="setting-name">开启弹幕工具栏</text>
              <text class="setting-desc">提示：关闭底部工具栏后，礼物/礼金/点赞/弹幕功能同步关闭相关功能</text>
            </view>
            <view class="setting-switch" :class="{ active: templateStore.settings.danmaku }" @click="templateStore.toggleSetting('danmaku')">
              <view class="switch-thumb"></view>
            </view>
          </view>
          <view class="setting-item">
            <view class="setting-info">
              <text class="setting-name">礼物功能</text>
            </view>
            <view class="setting-switch" :class="{ active: templateStore.settings.giftAlbum }" @click="templateStore.toggleSetting('giftAlbum')">
              <view class="switch-thumb"></view>
            </view>
          </view>
          <view class="setting-item">
            <view class="setting-info">
              <text class="setting-name">礼物尾页</text>
            </view>
            <view class="setting-switch" :class="{ active: templateStore.settings.giftBuy }" @click="templateStore.toggleSetting('giftBuy')">
              <view class="switch-thumb"></view>
            </view>
          </view>
          <view class="setting-item">
            <view class="setting-info">
              <text class="setting-name">礼金功能</text>
            </view>
            <view class="setting-switch" :class="{ active: templateStore.settings.moneyGift }" @click="templateStore.toggleSetting('moneyGift')">
              <view class="switch-thumb"></view>
            </view>
          </view>
          <view class="setting-item">
            <view class="setting-info">
              <text class="setting-name">点赞功能</text>
            </view>
            <view class="setting-switch" :class="{ active: templateStore.settings.like }" @click="templateStore.toggleSetting('like')">
              <view class="switch-thumb"></view>
            </view>
          </view>
          <view class="setting-item">
            <view class="setting-info">
              <text class="setting-name">相册功能</text>
              <text class="setting-desc">提示：打开时访客可查看邀请函中使用的图片相册</text>
            </view>
            <view class="setting-switch" :class="{ active: templateStore.settings.album }" @click="templateStore.toggleSetting('album')">
              <view class="switch-thumb"></view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="showBasicInfo" class="popup-overlay" @click="showBasicInfo = false">
      <view class="popup-content basicinfo-popup" @click.stop>
        <view class="popup-header">
          <view class="popup-back" @click="showBasicInfo = false">
            <text class="back-arrow">‹</text>
          </view>
          <text class="popup-header-title">完善基本信息</text>
          <view class="popup-confirm" @click="handleConfirmBasicInfo">
            <text class="confirm-text">完成</text>
          </view>
        </view>

        <scroll-view class="form-scroll" scroll-y>
          <view class="form-content">
            <view class="form-item">
              <text class="form-label">新郎姓名</text>
              <input class="form-input" v-model="templateStore.basicInfo.groomName" placeholder="请输入新郎真实姓名" placeholder-class="input-placeholder" maxlength="30" />
              <text class="char-count">{{ (templateStore.basicInfo.groomName || '').length }}/30</text>
            </view>

            <view class="form-item">
              <text class="form-label">新娘姓名</text>
              <input class="form-input" v-model="templateStore.basicInfo.brideName" placeholder="请输入新娘真实姓名" placeholder-class="input-placeholder" maxlength="30" />
              <text class="char-count">{{ (templateStore.basicInfo.brideName || '').length }}/30</text>
            </view>

            <view class="form-item" @click="handleDatePicker">
              <text class="form-label">婚礼时间</text>
              <view class="form-value">
                <text v-if="templateStore.basicInfo.weddingDate" class="value-text">{{ templateStore.basicInfo.weddingDate }}</text>
                <text v-else class="input-placeholder">请选择婚礼时间</text>
                <text class="value-arrow">›</text>
              </view>
            </view>

            <view class="form-item" @click="handleLocation">
              <text class="form-label">位置导航</text>
              <view class="form-value">
                <view class="location-input">
                  <text v-if="templateStore.basicInfo.location" class="value-text">{{ templateStore.basicInfo.location }}</text>
                  <text v-else class="input-placeholder">搜索定位导航位置</text>
                </view>
                <view class="location-btn">
                  <text class="location-icon">📍</text>
                  <text class="location-label">定位</text>
                </view>
              </view>
            </view>

            <view class="map-preview">
              <view class="map-bg">
                <view class="map-marker-area">
                  <text class="map-pin">📍</text>
                  <text class="map-venue">{{ templateStore.basicInfo.location || '李 大管家品牌酒店' }}</text>
                </view>
              </view>
            </view>

            <view class="form-item">
              <text class="form-label">详细地址</text>
              <input class="form-input" v-model="templateStore.basicInfo.detailAddress" placeholder="例：婚贝大酒店9F幸福宴会厅" placeholder-class="input-placeholder" />
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useTemplateStore } from '@/stores/template'

const templateStore = useTemplateStore()

const isFreeEdit = ref(false)
const currentPageIndex = ref(0)
const showSettings = ref(false)
const showBasicInfo = ref(false)

const pageList = ref([
  { type: 'cover', label: '封面', image: templateStore.templateData.coverImage },
  { type: 'info', label: '新人信息' },
  { type: 'footer', label: 'WEDDING' },
  { type: 'photo', label: '合卺', image: templateStore.templateData.photo1 },
  { type: 'story', label: '我的情书' },
  { type: 'photo', label: '满小满', image: templateStore.templateData.photo2 },
  { type: 'simple', label: 'GROOM' },
])

const goBack = () => {
  uni.navigateBack()
}

const handleMusic = () => {
  uni.navigateTo({ url: '/pages/music/index' })
}

const handleSave = () => {
  uni.showToast({ title: '已保存', icon: 'success' })
}

const handlePreviewShare = () => {
  uni.navigateTo({ url: '/pages/preview/index' })
}

const handleOpenBasicInfo = () => {
  showBasicInfo.value = true
}

const handleConfirmBasicInfo = () => {
  showBasicInfo.value = false
  uni.showToast({ title: '已保存', icon: 'success' })
}

const handleDatePicker = () => {
  uni.showToast({ title: '选择日期', icon: 'none' })
}

const handleLocation = () => {
  try {
    uni.chooseLocation({
      success: (res: any) => {
        templateStore.basicInfo.location = res.name || res.address
      }
    })
  } catch (e) {
    uni.showToast({ title: '选择位置', icon: 'none' })
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
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 56rpx;
  color: #333;
  font-weight: 300;
  line-height: 1;
}

.header-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.header-right {
  width: 60rpx;
}

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
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
  min-width: 0;
}

.preview-scroll {
  height: 100%;
  width: 100%;
}

.preview-card {
  width: 100%;
  padding: 16rpx;
  box-sizing: border-box;
}

.page-content {
  width: 100%;
  position: relative;
}

.section {
  width: 100%;
  position: relative;
  overflow: hidden;
}

.cover-section {
  height: 560rpx;
  border-radius: 8rpx;
  overflow: hidden;
}

.cover-image {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.cover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.welcome-text {
  font-size: 18rpx;
  color: #333;
  letter-spacing: 4rpx;
}

.main-title {
  font-size: 56rpx;
  color: #333;
  font-weight: bold;
  margin-top: 16rpx;
  font-family: STKaiti, KaiTi, serif;
}

.sub-title {
  font-size: 40rpx;
  color: #e84a6e;
  font-weight: bold;
  margin-top: 8rpx;
  font-family: STKaiti, KaiTi, serif;
}

.couple-info-section {
  padding: 48rpx 24rpx 32rpx;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 16rpx;
}

.couple-names {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.name {
  font-size: 32rpx;
  color: #333;
  font-weight: 600;
}

.groom-bride {
  font-size: 14rpx;
  color: #999;
  letter-spacing: 2rpx;
  margin-top: 4rpx;
}

.shuangxi-icon {
  font-size: 56rpx;
  color: #e84a6e;
  font-weight: bold;
  margin: 0 24rpx;
}

.wedding-date {
  width: 100%;
  text-align: center;
  font-size: 24rpx;
  color: #333;
  margin-top: 24rpx;
  font-weight: 500;
}

.wedding-address {
  width: 100%;
  text-align: center;
  font-size: 18rpx;
  color: #999;
  margin-top: 8rpx;
}

.footer-border {
  padding: 24rpx;
  background: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1rpx solid #eee;
  border-bottom: 1rpx solid #eee;
}

.footer-text-left,
.footer-text-center,
.footer-text-right {
  font-size: 18rpx;
  color: #999;
  letter-spacing: 2rpx;
  font-weight: 500;
}

.photo-section {
  height: 400rpx;
  border-radius: 8rpx;
  overflow: hidden;
  margin-top: 16rpx;

  &.small {
    height: 280rpx;
  }
}

.photo-image {
  width: 100%;
  height: 100%;
}

.photo-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
}

.photo-title {
  font-size: 48rpx;
  color: #fff;
  font-weight: bold;
  font-family: STKaiti, KaiTi, serif;
}

.photo-sub {
  font-size: 20rpx;
  color: #fff;
  letter-spacing: 4rpx;
  margin-top: 8rpx;
}

.photo-content {
  font-size: 18rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 24rpx;
  letter-spacing: 2rpx;
}

.love-story-section {
  padding: 80rpx 24rpx;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.story-title {
  font-size: 32rpx;
  color: #333;
  font-weight: 500;
}

.story-sub {
  font-size: 18rpx;
  color: #999;
  letter-spacing: 4rpx;
  margin-top: 8rpx;
}

.simple-section {
  padding: 60rpx 24rpx;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.simple-title {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.simple-sub {
  font-size: 14rpx;
  color: #999;
  letter-spacing: 4rpx;
  margin-top: 8rpx;
}

.sidebar-area {
  width: 220rpx;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-top {
  background: #fff;
  border-radius: 16rpx 16rpx 0 0;
  padding: 16rpx 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
  flex-shrink: 0;
}

.edit-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 4rpx;
}

.switch-label {
  font-size: 20rpx;
  color: #333;
}

.switch-toggle {
  width: 60rpx;
  height: 32rpx;
  border-radius: 16rpx;
  background: #e0e0e0;
  position: relative;
  transition: background 0.2s ease;

  &.active {
    background: #e84a6e;

    .switch-dot {
      left: 30rpx;
    }
  }
}

.switch-dot {
  width: 26rpx;
  height: 26rpx;
  border-radius: 50%;
  background: #fff;
  position: absolute;
  top: 3rpx;
  left: 3rpx;
  box-shadow: 0 1rpx 3rpx rgba(0, 0, 0, 0.15);
  transition: left 0.2s ease;
}

.edit-content-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 16rpx 8rpx;
  background: #fff5f5;
  border-radius: 8rpx;
  margin-top: 12rpx;
  border: 1rpx solid #ffe4e8;
}

.btn-icon {
  font-size: 22rpx;
}

.btn-text {
  flex: 1;
  font-size: 20rpx;
  color: #e84a6e;
  font-weight: 500;
}

.btn-arrow {
  font-size: 28rpx;
  color: #e84a6e;
  font-weight: 300;
}

.sidebar-pages {
  flex: 1;
  background: #fff;
  border-radius: 0 0 16rpx 16rpx;
  padding: 12rpx 16rpx 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
  min-height: 0;
}

.page-thumb {
  width: 100%;
  height: 240rpx;
  border-radius: 8rpx;
  margin-bottom: 16rpx;
  overflow: hidden;
  border: 4rpx solid transparent;
  transition: border-color 0.2s ease;

  &.active {
    border-color: #e84a6e;
  }
}

.thumb-image {
  width: 100%;
  height: 100%;
}

.thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  background: linear-gradient(135deg, #fff5f5 0%, #ffe4e8 100%);
}

.info-thumb {
  background: linear-gradient(135deg, #fff8f0 0%, #ffe8d4 100%);
}

.footer-thumb {
  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
}

.story-thumb {
  background: linear-gradient(135deg, #f8f5ff 0%, #e8d4ff 100%);
}

.photo-thumb {
  background: linear-gradient(135deg, #e8f4ff 0%, #d4e8ff 100%);
}

.thumb-icon {
  font-size: 36rpx;
}

.thumb-label {
  font-size: 18rpx;
  color: #666;
  text-align: center;
}

.editor-footer {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  background: #fff;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.03);
  flex-shrink: 0;
  gap: 12rpx;
}

.footer-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 16rpx;
}

.footer-icon {
  font-size: 36rpx;
}

.footer-label {
  font-size: 22rpx;
  color: #666;
}

.preview-btn {
  margin-left: auto;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  color: #fff;
  border-radius: 40rpx;
  padding: 20rpx 40rpx;
  box-shadow: 0 4rpx 16rpx rgba(232, 74, 110, 0.3);
}

.preview-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
}

.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.popup-content {
  width: 100%;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  max-height: 80vh;
}

.settings-popup {
  padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
}

.popup-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  text-align: center;
  margin-bottom: 32rpx;
}

.settings-list {
  display: flex;
  flex-direction: column;
}

.setting-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 28rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
  gap: 24rpx;

  &:last-child {
    border-bottom: none;
  }
}

.setting-info {
  flex: 1;
}

.setting-name {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  display: block;
}

.setting-desc {
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
  display: block;
  line-height: 1.4;
}

.setting-switch {
  width: 88rpx;
  height: 50rpx;
  border-radius: 25rpx;
  background: #e0e0e0;
  position: relative;
  flex-shrink: 0;
  transition: background 0.2s ease;
  margin-top: 4rpx;

  &.active {
    background: #e84a6e;

    .switch-thumb {
      left: 42rpx;
    }
  }
}

.switch-thumb {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: #fff;
  position: absolute;
  top: 3rpx;
  left: 3rpx;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.15);
  transition: left 0.2s ease;
}

.basicinfo-popup {
  display: flex;
  flex-direction: column;
  max-height: 85vh;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
  flex-shrink: 0;
}

.popup-back {
  width: 80rpx;
}

.back-arrow {
  font-size: 56rpx;
  color: #333;
  font-weight: 300;
  line-height: 1;
}

.popup-header-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #333;
}

.popup-confirm {
  width: 80rpx;
  text-align: right;
}

.confirm-text {
  font-size: 28rpx;
  color: #e84a6e;
  font-weight: 500;
}

.form-scroll {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.form-content {
  padding: 24rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
}

.form-item {
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.form-label {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  margin-bottom: 16rpx;
  display: block;
}

.form-input {
  width: 100%;
  height: 64rpx;
  font-size: 28rpx;
  color: #333;
}

.input-placeholder {
  font-size: 28rpx;
  color: #bbb;
}

.char-count {
  font-size: 22rpx;
  color: #999;
  text-align: right;
  margin-top: 8rpx;
  display: block;
}

.form-value {
  display: flex;
  align-items: center;
  padding: 12rpx 0;
}

.location-input {
  flex: 1;
}

.value-text {
  font-size: 28rpx;
  color: #333;
}

.value-arrow {
  font-size: 36rpx;
  color: #ccc;
  font-weight: 300;
  margin-left: 8rpx;
}

.location-btn {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 8rpx 16rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  flex-shrink: 0;
}

.location-icon {
  font-size: 24rpx;
}

.location-label {
  font-size: 22rpx;
  color: #666;
}

.map-preview {
  margin-top: 24rpx;
  height: 300rpx;
  border-radius: 12rpx;
  overflow: hidden;
}

.map-bg {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #e8f4ff 0%, #d4e8ff 50%, #c0d8ff 100%);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.map-marker-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  background: #fff;
  padding: 16rpx 24rpx;
  border-radius: 12rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.map-pin {
  font-size: 36rpx;
}

.map-venue {
  font-size: 24rpx;
  color: #333;
  font-weight: 500;
}
</style>
