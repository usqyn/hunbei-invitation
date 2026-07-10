<template>
  <view class="page">
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="nav-back-icon">&#x276e;</text>
      </view>
      <text class="nav-title">我的足迹</text>
      <view class="nav-placeholder"></view>
    </view>

    <view class="content">
      <view v-if="loading" class="loading">
        <text>加载中...</text>
      </view>

      <view v-else-if="footprints.length === 0" class="empty-state">
        <text class="empty-text">暂无浏览记录</text>
      </view>

      <view v-else class="card">
        <view
          v-for="item in footprints"
          :key="item.id"
          class="footprint-item"
          @click="handleClick(item)"
        >
          <image class="footprint-image" :src="item.image" mode="aspectFill" />
          <view class="footprint-info">
            <text class="footprint-title">{{ item.title }}</text>
            <text class="footprint-time">{{ item.time }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useGoBack } from '@/composables/useGoBack'
import { fetchFootprints } from '@/api'

const goBack = useGoBack()

interface Footprint {
  id: string
  title: string
  image: string
  time: string
}

const footprints = ref<Footprint[]>([])
const loading = ref(false)

const loadFootprints = async () => {
  loading.value = true
  try {
    const res = await fetchFootprints()
    footprints.value = res || []
  } catch (e) {
    uni.showToast({ title: '获取足迹失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const handleClick = (item: Footprint) => {
  uni.navigateTo({ url: `/pages/preview/index?id=${item.id}` })
}

onMounted(() => {
  loadFootprints()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--color-bg-page);
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background: #ffffff;
}

.nav-back {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-back-icon {
  font-size: 36rpx;
  color: #333333;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
}

.nav-placeholder {
  width: 60rpx;
}

.content {
  padding: 24rpx;
}

.loading {
  text-align: center;
  padding: 48rpx 0;
  font-size: 28rpx;
  color: #999999;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #999999;
}

.card {
  background: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
}

.footprint-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  border-bottom: 2rpx solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
}

.footprint-image {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.footprint-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.footprint-title {
  font-size: 30rpx;
  color: #333333;
  font-weight: 500;
  margin-bottom: 12rpx;
  display: block;
}

.footprint-time {
  font-size: 24rpx;
  color: #999999;
}
</style>
