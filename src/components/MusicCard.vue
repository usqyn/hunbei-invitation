<template>
  <view class="music-item" @click="$emit('select', music)">
    <view class="music-info">
      <text class="music-name">{{ music.name }}</text>
    </view>
    <view v-if="music.hot" class="hot-badge">HOT</view>
    <view class="select-icon" :class="{ selected: isSelected }">
      <text v-if="isSelected">✓</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { Music } from '@/types'

defineProps<{
  music: Music
  isSelected?: boolean
}>()

defineEmits<{ select: [music: Music] }>()
</script>

<style lang="scss" scoped>
.music-item {
  display: flex;
  align-items: center;
  padding: 28rpx 30rpx;
  background: #ffffff;
  border-bottom: 1px solid #f0f0f0;
}

.music-info {
  flex: 1;
}

.music-name {
  font-size: 28rpx;
  color: #333333;
}

.hot-badge {
  padding: 4rpx 12rpx;
  background: var(--color-primary-gradient);
  border-radius: 20rpx;
  font-size: 20rpx;
  color: var(--color-white);
  margin-right: 20rpx;
}

.select-icon {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: var(--color-white);
  background: var(--color-bg-input);

  &.selected {
    background: var(--color-primary);
    border-color: var(--color-primary);
  }
}
</style>
