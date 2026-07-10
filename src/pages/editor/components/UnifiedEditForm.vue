<template>
  <view v-if="visible" class="popup-overlay" @click="$emit('close')">
    <view class="popup-content" @click.stop>
      <view class="popup-header">
        <view class="header-left" @click="$emit('close')">
          <text class="header-back">‹</text>
        </view>
        <text class="header-title">编辑信息</text>
        <view class="header-right" @click="onConfirm">
          <text class="header-confirm">完成</text>
        </view>
      </view>

      <scroll-view class="popup-scroll" scroll-y>
        <view class="form-container">
          <!-- 新人信息 -->
          <view class="form-section">
            <view class="section-title">
              <text class="title-icon">💑</text>
              <text class="title-text">新人信息</text>
            </view>

            <view class="form-item">
              <view class="form-label">
                <text class="required">*</text>
                <text class="label-name">新郎姓名</text>
              </view>
              <view class="input-wrapper">
                <input
                  class="form-input"
                  placeholder="请输入新郎真实姓名"
                  :value="basicInfo.groomName"
                  @input="(e: any) => onInput('groomName', e.detail.value)"
                  maxlength="20"
                  placeholder-class="input-placeholder"
                />
                <text class="char-count">{{ (basicInfo.groomName || '').length }}/20</text>
              </view>
            </view>

            <view class="form-item">
              <view class="form-label">
                <text class="required">*</text>
                <text class="label-name">新娘姓名</text>
              </view>
              <view class="input-wrapper">
                <input
                  class="form-input"
                  placeholder="请输入新娘真实姓名"
                  :value="basicInfo.brideName"
                  @input="(e: any) => onInput('brideName', e.detail.value)"
                  maxlength="20"
                  placeholder-class="input-placeholder"
                />
                <text class="char-count">{{ (basicInfo.brideName || '').length }}/20</text>
              </view>
            </view>
          </view>

          <!-- 婚礼信息 -->
          <view class="form-section">
            <view class="section-title">
              <text class="title-icon">📅</text>
              <text class="title-text">婚礼信息</text>
            </view>

            <view class="form-item">
              <view class="form-label">
                <text class="label-name">婚礼时间</text>
              </view>
              <picker mode="date" :value="basicInfo.weddingDate" @change="onDateChange">
                <view class="input-wrapper clickable">
                  <text v-if="basicInfo.weddingDate" class="form-value">{{ basicInfo.weddingDate }}</text>
                  <text v-else class="input-placeholder">选择婚礼时间</text>
                  <text class="input-arrow">›</text>
                </view>
              </picker>
            </view>

            <view class="form-item" @click="$emit('location')">
              <view class="form-label">
                <text class="label-name">婚礼地点</text>
              </view>
              <view class="input-wrapper clickable">
                <text v-if="basicInfo.location" class="form-value">{{ basicInfo.location }}</text>
                <text v-else class="input-placeholder">搜索定位导航位置</text>
                <view class="location-btn">
                  <text class="location-icon">📍</text>
                  <text class="location-text">定位</text>
                </view>
              </view>
            </view>

            <view class="form-item">
              <view class="form-label">
                <text class="label-name">详细地址</text>
              </view>
              <view class="input-wrapper">
                <input
                  class="form-input"
                  placeholder="例：婚贝大酒店9F幸福宴会厅"
                  :value="basicInfo.detailAddress"
                  @input="(e: any) => onInput('address', e.detail.value)"
                  maxlength="100"
                  placeholder-class="input-placeholder"
                />
              </view>
            </view>
          </view>

          <!-- 其他信息（动态字段） -->
          <view v-if="extraFields.length > 0" class="form-section">
            <view class="section-title">
              <text class="title-icon">📝</text>
              <text class="title-text">其他信息</text>
            </view>

            <view v-for="field in extraFields" :key="field.key" class="form-item">
              <view class="form-label">
                <text class="label-icon">{{ field.icon }}</text>
                <text class="label-name">{{ field.label }}</text>
              </view>
              <view class="input-wrapper">
                <input
                  class="form-input"
                  :placeholder="field.placeholder"
                  :value="field.value"
                  @input="(e: any) => onInput(field.key, e.detail.value)"
                  maxlength="100"
                  placeholder-class="input-placeholder"
                />
              </view>
            </view>
          </view>

          <view class="tip-box">
            <text class="tip-icon">💡</text>
            <text class="tip-text">填写完整的信息可以让您的婚礼邀请函更加温馨动人</text>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EditableElement, BasicInfo } from '@/types'

const SMART_FIELD_META: Record<string, { label: string; icon: string; placeholder: string }> = {
  inviter: { label: '邀请者', icon: '👤', placeholder: '请输入邀请者姓名' },
  invitee: { label: '受邀者', icon: '👥', placeholder: '请输入受邀者姓名' },
  date: { label: '日期', icon: '📅', placeholder: '请选择日期' },
  time: { label: '时间', icon: '⏰', placeholder: '请填写时间' },
  location: { label: '地点', icon: '📍', placeholder: '请填写地点' },
  address: { label: '详细地址', icon: '🏠', placeholder: '请填写详细地址' },
  phone: { label: '联系电话', icon: '📞', placeholder: '请填写联系电话' },
  year: { label: '年份', icon: '📅', placeholder: '例如: 2025' },
  month: { label: '月份', icon: '📅', placeholder: '例如: 6' },
  day: { label: '日', icon: '📅', placeholder: '例如: 15' },
}

// 基础字段 key（始终显示，值从 basicInfo 读取）
const BASIC_FIELD_KEYS = ['groomName', 'brideName', 'date', 'location', 'address']

// 日期占位符全局字段
const DATE_PLACEHOLDER_KEYS = ['year', 'month', 'day']

const props = defineProps<{
  visible: boolean
  basicInfo: BasicInfo
  elements: EditableElement[]
  templateData?: Record<string, string | undefined>
}>()

const emit = defineEmits<{
  close: []
  confirm: []
  location: []
  update: [key: string, value: string]
}>()

// 额外字段（从 elements 的 dataKey 收集，排除基础字段）
const extraFields = computed(() => {
  const seen = new Set(BASIC_FIELD_KEYS)
  const result: Array<{ key: string; label: string; icon: string; placeholder: string; value: string }> = []

  props.elements.forEach(el => {
    if (el.dataKey && el.dataKey in SMART_FIELD_META && !seen.has(el.dataKey)) {
      seen.add(el.dataKey)
      const meta = SMART_FIELD_META[el.dataKey]
      result.push({
        key: el.dataKey,
        label: meta.label,
        icon: meta.icon,
        placeholder: meta.placeholder,
        value: el.text || '',
      })
    }
  })

  // 添加日期占位符全局字段
  if (props.templateData) {
    DATE_PLACEHOLDER_KEYS.forEach(key => {
      if (!seen.has(key) && key in SMART_FIELD_META) {
        seen.add(key)
        const meta = SMART_FIELD_META[key]
        result.push({
          key,
          label: meta.label,
          icon: meta.icon,
          placeholder: meta.placeholder,
          value: props.templateData![key] || '',
        })
      }
    })
  }

  return result
})

function onInput(key: string, value: string) {
  emit('update', key, value)
}

function onDateChange(e: any) {
  emit('update', 'date', e.detail.value)
}

function onConfirm() {
  emit('confirm')
}
</script>

<style lang="scss" scoped>
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
  height: 85vh;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.header-left,
.header-right {
  min-width: 100rpx;
}

.header-back {
  font-size: 56rpx;
  color: var(--color-text-primary);
  font-weight: 300;
}

.header-title {
  font-size: 34rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.header-confirm {
  font-size: 28rpx;
  color: var(--color-primary);
  font-weight: 500;
  text-align: right;
}

.popup-scroll {
  flex: 1;
  min-height: 0;
}

.form-container {
  padding: 24rpx 32rpx 48rpx;
}

.form-section {
  background: #fafafa;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
  padding-bottom: 16rpx;
  border-bottom: 1px solid var(--color-border);
}

.title-icon {
  font-size: 32rpx;
}

.title-text {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.form-item {
  margin-bottom: 28rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.form-label {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.required {
  color: var(--color-primary);
  font-size: 28rpx;
  margin-right: 4rpx;
}

.label-icon {
  font-size: 28rpx;
  margin-right: 8rpx;
}

.label-name {
  font-size: 28rpx;
  color: var(--color-text-primary);
  font-weight: 500;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 28rpx;
  border: 2rpx solid #eee;
  transition: border-color 0.2s ease;
}

.form-input {
  flex: 1;
  font-size: 30rpx;
  color: var(--color-text-primary);
}

.input-placeholder {
  flex: 1;
  font-size: 30rpx;
  color: #bbb;
}

.form-value {
  flex: 1;
  font-size: 30rpx;
  color: var(--color-text-primary);
}

.input-arrow {
  font-size: 36rpx;
  color: #ccc;
  font-weight: 300;
}

.char-count {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.location-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}

.location-icon {
  font-size: 28rpx;
}

.location-text {
  font-size: 26rpx;
  color: var(--color-primary);
}

.tip-box {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 20rpx 24rpx;
  background: #fff8e6;
  border-radius: 16rpx;
  margin-top: 8rpx;
}

.tip-icon {
  font-size: 28rpx;
  flex-shrink: 0;
}

.tip-text {
  font-size: 24rpx;
  color: #8a6d3b;
  line-height: 1.5;
}
</style>
