<template>
  <view class="page">
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="nav-back-icon">&#x276e;</text>
      </view>
      <text class="nav-title">回收站</text>
      <view class="nav-placeholder"></view>
    </view>

    <view class="content">
      <view v-if="loading" class="loading">
        <text>加载中...</text>
      </view>

      <view v-else-if="recycleList.length === 0" class="empty-state">
        <text class="empty-text">回收站为空</text>
      </view>

      <view v-else class="card">
        <view
          v-for="item in recycleList"
          :key="item.id"
          class="recycle-item"
        >
          <image class="recycle-image" lazy-load :src="item.image" mode="aspectFill" />
          <view class="recycle-info">
            <text class="recycle-title">{{ item.title }}</text>
            <text class="recycle-time">删除于 {{ item.deletedAt || item.deleted_at || '未知时间' }}</text>
          </view>
          <view class="recycle-actions">
            <view class="action-btn restore" @click="handleRestore(item)">恢复</view>
            <view class="action-btn delete" @click="handlePermanentDelete(item)">彻底删除</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useGoBack } from '@/composables/useGoBack'
import { fetchRecycleBin, restoreWork, permanentDelete } from '@/api'
import { useWorksStore } from '@/stores/works'

const { goBack } = useGoBack()
const worksStore = useWorksStore()

interface RecycleItem {
  id: string
  title: string
  image: string
  deletedAt: string
}

const recycleList = ref<RecycleItem[]>([])
const loading = ref(false)
const operating = ref(false)

const loadRecycleBin = async () => {
  loading.value = true
  try {
    const res = await fetchRecycleBin()
    recycleList.value = res || []
  } catch (e) {
    uni.showToast({ title: '获取回收站失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const handleRestore = async (item: RecycleItem) => {
  if (operating.value) return
  operating.value = true
  uni.showModal({
    title: '确认恢复',
    content: `确定要恢复「${item.title}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await restoreWork(item.id)
          uni.showToast({ title: '已恢复', icon: 'success' })
          recycleList.value = recycleList.value.filter(i => i.id !== item.id)
          // 刷新作品列表
          worksStore.loadAll()
        } catch (e) {
          uni.showToast({ title: '恢复失败', icon: 'none' })
        } finally {
          operating.value = false
        }
      } else {
        operating.value = false
      }
    },
    fail: () => {
      operating.value = false
    }
  })
}

const handlePermanentDelete = async (item: RecycleItem) => {
  if (operating.value) return
  operating.value = true
  uni.showModal({
    title: '确认删除',
    content: `确定要彻底删除「${item.title}」吗？删除后不可恢复。`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await permanentDelete(item.id)
          uni.showToast({ title: '已彻底删除', icon: 'success' })
          recycleList.value = recycleList.value.filter(i => i.id !== item.id)
          worksStore.loadAll()
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        } finally {
          operating.value = false
        }
      } else {
        operating.value = false
      }
    },
    fail: () => {
      operating.value = false
    }
  })
}

onMounted(() => {
  loadRecycleBin()
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

.recycle-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  border-bottom: 2rpx solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
}

.recycle-image {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.recycle-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.recycle-title {
  font-size: 30rpx;
  color: #333333;
  font-weight: 500;
  margin-bottom: 12rpx;
  display: block;
}

.recycle-time {
  font-size: 24rpx;
  color: #999999;
}

.recycle-actions {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-left: 16rpx;
}

.action-btn {
  padding: 10rpx 20rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  text-align: center;

  &.restore {
    background: #e84a6e;
    color: #ffffff;
  }

  &.delete {
    background: #fef2f2;
    color: #ef4444;
  }
}
</style>
