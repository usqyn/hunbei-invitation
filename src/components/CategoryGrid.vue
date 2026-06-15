<template>
  <view class="category-grid">
    <view
      v-for="item in items"
      :key="item.id"
      class="category-item"
      @click="handleClick(item)"
    >
      <view class="category-icon" :style="{ background: item.bgColor }">
        <text class="icon-text">{{ item.icon }}</text>
      </view>
      <text class="category-name">{{ item.name }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { Category } from '@/types'

defineProps<{ items: Category[] }>()
const emit = defineEmits<{ click: [item: Category] }>()

const handleClick = (item: Category) => {
  emit('click', item)
}
</script>

<style lang="scss" scoped>
.category-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 24rpx;
  padding: 24rpx;
  background: #ffffff;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.category-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
}

.icon-text {
  font-size: 40rpx;
}

.category-name {
  font-size: 22rpx;
  color: #333333;
}
</style>
