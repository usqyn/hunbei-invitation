<template>
  <view class="invitation-card" @click="$emit('click')">
    <image
      class="card-image"
      :src="item.image"
      mode="aspectFill"
      @error="onImageError"
    />
    <view class="card-info">
      <text class="card-title">{{ item.title }}</text>
      <text class="card-date">{{ item.date }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { Template } from '@/types'

defineProps<{ item: Template }>()
defineEmits<{ click: [] }>()

const onImageError = () => {}
</script>

<style lang="scss" scoped>
.invitation-card {
  width: 280rpx;
  border-radius: 16rpx;
  overflow: hidden;
  background: var(--color-bg-white);
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.card-image {
  width: 100%;
  height: 360rpx;
}

.card-info {
  padding: 16rpx;
}

.card-title {
  font-size: 26rpx;
  color: var(--color-text-primary);
  font-weight: 500;
  display: block;
  margin-bottom: 8rpx;
}

.card-date {
  font-size: 22rpx;
  color: var(--color-text-secondary);
}
</style>
