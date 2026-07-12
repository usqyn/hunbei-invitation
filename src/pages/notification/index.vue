<template>
  <view class="page">
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="nav-back-icon">&#x276e;</text>
      </view>
      <text class="nav-title">通知</text>
      <view class="nav-placeholder"></view>
    </view>

    <view class="content">
      <view v-if="loading" class="loading">
        <text>加载中...</text>
      </view>

      <view v-else-if="notifications.length === 0" class="empty-state">
        <text class="empty-text">暂无通知</text>
      </view>

      <view v-else class="card">
        <view
          v-for="item in notifications"
          :key="item.id"
          class="notice-item"
          :class="{ unread: !item.isRead }"
          @click="handleClick(item)"
        >
          <view class="notice-header">
            <text class="notice-title">{{ item.title }}</text>
            <text class="notice-time">{{ item.time }}</text>
          </view>
          <text class="notice-content">{{ item.content }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useGoBack } from '@/composables/useGoBack'
import { fetchNotifications, markNotificationRead } from '@/api'

const goBack = useGoBack()

interface Notification {
  id: string
  title: string
  content: string
  time: string
  isRead: boolean
}

const notifications = ref<Notification[]>([])
const loading = ref(false)

const loadNotifications = async () => {
  loading.value = true
  try {
    const res = await fetchNotifications()
    notifications.value = res || []
  } catch (e) {
    uni.showToast({ title: '获取通知失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const handleClick = async (item: Notification) => {
  if (!item.isRead) {
    try {
      await markNotificationRead(item.id)
      item.isRead = true
    } catch (e) {
      console.error('标记已读失败', e)
      uni.showToast({ title: '操作失败', icon: 'none' })
    }
  }
}

onMounted(() => {
  loadNotifications()
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

.notice-item {
  padding: 24rpx;
  border-bottom: 2rpx solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }

  &.unread {
    background: #fff5f7;

    .notice-title {
      color: #e84a6e;
      font-weight: 600;
    }

    .notice-title::before {
      content: '';
      display: inline-block;
      width: 16rpx;
      height: 16rpx;
      background: #e84a6e;
      border-radius: 50%;
      margin-right: 12rpx;
      vertical-align: middle;
    }
  }
}

.notice-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.notice-title {
  font-size: 30rpx;
  color: #333333;
}

.notice-time {
  font-size: 24rpx;
  color: #999999;
  flex-shrink: 0;
  margin-left: 16rpx;
}

.notice-content {
  font-size: 26rpx;
  color: #666666;
  line-height: 1.6;
  display: block;
}
</style>
