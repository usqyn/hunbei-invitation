<template>
  <view v-if="visible" class="popup-overlay" @click="$emit('close')">
    <view class="popup-content" @click.stop>
      <view class="popup-header">
        <view class="header-left" @click="$emit('close')">
          <text class="header-back">‹</text>
        </view>
        <text class="header-title">快捷填写</text>
        <view class="header-right" @click="$emit('close')">
          <text class="header-confirm">完成</text>
        </view>
      </view>

      <scroll-view class="popup-scroll" scroll-y>
        <view class="form-container">
          <view v-for="(item, idx) in smartFields" :key="idx" class="form-item">
            <view class="form-label">
              <text class="label-icon">{{ item.icon }}</text>
              <text class="label-name">{{ item.label }}</text>
            </view>
            <view class="input-wrapper">
              <input
                class="form-input"
                :placeholder="item.placeholder"
                :value="item.value"
                @input="(e: any) => onInput(item.key, e.detail.value)"
                maxlength="100"
                placeholder-class="input-placeholder"
              />
            </view>
          </view>
          <view v-if="smartFields.length === 0" class="empty-hint">
            <text class="empty-text">暂无快捷字段</text>
            <text class="empty-sub">设计师尚未添加快捷字段到此模板</text>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EditableElement } from '@/types'

interface SmartFieldItem {
  key: string
  label: string
  icon: string
  placeholder: string
  value: string
}

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

// 日期占位符字段（全局字段，不绑定到单个元素）
const DATE_PLACEHOLDER_KEYS = ['year', 'month', 'day']

const props = defineProps<{
  visible: boolean
  elements: EditableElement[]
  templateData?: Record<string, string | undefined>
}>()

const emit = defineEmits<{
  close: []
  update: [key: string, value: string]
}>()

const smartFields = computed<SmartFieldItem[]>(() => {
  const seen = new Set<string>()
  const result: SmartFieldItem[] = []

  // 从元素中收集 dataKey 字段
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

  // 添加日期占位符全局字段（从 templateData 读取值）
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
  height: 70vh;
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

.form-item {
  margin-bottom: 28rpx;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 12rpx;
}

.label-icon {
  font-size: 28rpx;
}

.label-name {
  font-size: 28rpx;
  color: var(--color-text-primary);
  font-weight: 500;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background: #f5f7fa;
  border-radius: 16rpx;
  padding: 24rpx 28rpx;
  border: 2rpx solid transparent;
  transition: border-color 0.2s ease;
}

.form-input {
  flex: 1;
  font-size: 30rpx;
  color: var(--color-text-primary);
}

.input-placeholder {
  font-size: 30rpx;
  color: #bbb;
}

.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 80rpx 0;
}

.empty-text {
  font-size: 30rpx;
  color: var(--color-text-secondary);
}

.empty-sub {
  font-size: 26rpx;
  color: #bbb;
}
</style>
