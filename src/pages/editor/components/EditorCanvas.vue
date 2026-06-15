<template>
  <scroll-view class="canvas-scroll" scroll-y>
    <view class="canvas-container">
      <view class="canvas-preview">
        <view class="page-content">
          <view class="section cover-section">
            <image class="cover-image" :src="templateData.coverImage" mode="aspectFill" @error="$emit('imageError')">
            </image>
            <view class="cover-overlay">
              <text class="shuangxi-decor">囍</text>
              <text class="cover-title">{{ templateData.coverTitle }}</text>
              <text class="cover-subtitle">{{ templateData.coverSubtitle }}</text>
            </view>
          </view>

          <view class="section couple-info-section">
            <view class="couple-info-content">
              <view class="person-info">
                <text class="person-name">{{ basicInfo.groomName || '满小满' }}</text>
                <text class="person-role">新郎</text>
              </view>
              <text class="heart-divider">♥</text>
              <view class="person-info">
                <text class="person-name">{{ basicInfo.brideName || '美小美' }}</text>
                <text class="person-role">新娘</text>
              </view>
            </view>
            <text class="wedding-date">{{ basicInfo.weddingDate || '2050/05/20' }}</text>
          </view>

          <view class="section photo-section">
            <image class="photo-image" :src="templateData.photo1" mode="aspectFill" @error="$emit('imageError')">
            </image>
          </view>

          <view class="section photo-section">
            <image class="photo-image" :src="templateData.photo2" mode="aspectFill" @error="$emit('imageError')">
            </image>
          </view>

          <view class="section wedding-info-section">
            <view class="info-item">
              <text class="info-icon">🔴</text>
              <view class="info-content">
                <text class="info-label">婚礼时间</text>
                <text class="info-value">{{ basicInfo.weddingDate || '2050年5月20日 星期六' }}</text>
                <text class="info-value">农历四月廿三 12:00PM</text>
              </view>
            </view>
            <view class="info-item">
              <text class="info-icon">🔴</text>
              <view class="info-content">
                <text class="info-label">婚礼地点</text>
                <text class="info-value">{{ basicInfo.detailAddress || '婚贝大酒店9F幸福宴会厅' }}</text>
              </view>
            </view>
          </view>

          <view class="section address-section">
            <text class="address-label">📍 ADDRESS</text>
            <text class="address-detail">{{ basicInfo.detailAddress || '婚贝大酒店9F幸福宴会厅' }}</text>
          </view>

          <view class="section map-section" @click="$emit('location')">
            <view class="map-placeholder">
              <text class="map-text">{{ basicInfo.location || '点击选择位置' }}</text>
              <view class="map-marker">📍</view>
            </view>
          </view>

          <view class="section photo-section">
            <image class="photo-image" :src="templateData.photo3" mode="aspectFill" @error="$emit('imageError')">
            </image>
            <view class="photo-text-overlay">
              <text class="photo-title">{{ templateData.photoTitle }}</text>
              <text class="photo-subtitle">{{ templateData.photoSubtitle }}</text>
            </view>
          </view>

          <view class="section photo-section">
            <image class="photo-image" :src="templateData.photo4" mode="aspectFill" @error="$emit('imageError')">
            </image>
          </view>

          <view class="section countdown-section">
            <view class="countdown-box">
              <text class="countdown-num">{{ countdown.days }}</text>
              <text class="countdown-label">天</text>
            </view>
            <view class="countdown-box">
              <text class="countdown-num">{{ countdown.hours }}</text>
              <text class="countdown-label">时</text>
            </view>
            <view class="countdown-box">
              <text class="countdown-num">{{ countdown.minutes }}</text>
              <text class="countdown-label">分</text>
            </view>
            <view class="countdown-box">
              <text class="countdown-num">{{ countdown.seconds }}</text>
              <text class="countdown-label">秒</text>
            </view>
          </view>

          <view class="section signin-section">
            <text class="signin-title">好久不见</text>
            <text class="signin-subtitle">婚礼见~</text>
            <view class="signin-form">
              <input class="signin-input" placeholder="姓名" v-model="signinForm.name" />
              <input class="signin-input" placeholder="出席人数" v-model="signinForm.count" />
              <button class="signin-btn" @click="$emit('signin')">提交</button>
            </view>
          </view>
        </view>
      </view>
    </view>
  </scroll-view>
</template>

<script setup lang="ts">
import type { TemplateData, BasicInfo } from '@/types'

defineProps<{
  templateData: TemplateData
  basicInfo: BasicInfo
  countdown: { days: string; hours: string; minutes: string; seconds: string }
  signinForm: { name: string; count: string }
}>()

defineEmits<{
  signin: []
  location: []
  imageError: []
}>()
</script>

<style lang="scss">
@use '../editor-canvas';
</style>
