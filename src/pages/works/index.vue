<template>
  <view class="page">
    <view v-if="!isLoggedIn" class="not-login">
      <view class="empty-icon">📋</view>
      <text class="empty-text">登录后才可以看到作品记录哦</text>
      <button class="login-btn" @click="handleLogin">立即登录</button>
    </view>

    <view v-else class="works-content">
      <view class="tabs">
        <text
          v-for="tab in tabList"
          :key="tab.key"
          class="tab-item"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >{{ tab.name }}</text>
      </view>

      <view class="works-list" v-if="activeTab === 'all'">
        <view
          v-for="work in worksStore.works"
          :key="work.id"
          class="work-card"
          @click="handleWorkClick(work)"
        >
          <image class="work-image" :src="work.image" mode="aspectFill" @error="onImageError" />
          <view class="work-info">
            <text class="work-title">{{ work.title }}</text>
            <text class="work-date">{{ work.date }}</text>
          </view>
          <view class="work-actions">
            <view class="action-btn" @click.stop="handlePreview(work)">
              <text>预览</text>
            </view>
            <view class="action-btn primary" @click.stop="handleShare(work)">
              <text>分享</text>
            </view>
          </view>
        </view>

        <view v-if="worksStore.works.length === 0" class="empty-state">
          <view class="empty-icon">📭</view>
          <text class="empty-text">暂无作品</text>
          <button class="create-btn" @click="handleCreate">去制作</button>
        </view>
      </view>

      <view class="works-list" v-if="activeTab === 'draft'">
        <view v-if="worksStore.drafts.length === 0" class="empty-state">
          <view class="empty-icon">📝</view>
          <text class="empty-text">暂无草稿</text>
        </view>
        <view
          v-for="draft in worksStore.drafts"
          :key="draft.id"
          class="work-card"
          @click="handleDraftClick(draft)"
        >
          <image class="work-image" :src="draft.image" mode="aspectFill" @error="onImageError" />
          <view class="work-info">
            <text class="work-title">{{ draft.title }}</text>
            <text class="work-date">草稿 · {{ draft.date }}</text>
          </view>
          <view class="work-actions">
            <view class="action-btn" @click.stop="handleEdit(draft)">
              <text>编辑</text>
            </view>
            <view class="action-btn danger" @click.stop="handleDelete(draft)">
              <text>删除</text>
            </view>
          </view>
        </view>
      </view>

      <view class="works-list" v-if="activeTab === 'favorite'">
        <view v-if="worksStore.favorites.length === 0" class="empty-state">
          <view class="empty-icon">❤️</view>
          <text class="empty-text">暂无收藏</text>
        </view>
        <view
          v-for="fav in worksStore.favorites"
          :key="fav.id"
          class="work-card"
          @click="handleWorkClick(fav)"
        >
          <image class="work-image" :src="fav.image" mode="aspectFill" @error="onImageError" />
          <view class="work-info">
            <text class="work-title">{{ fav.title }}</text>
            <text class="work-date">{{ fav.date }}</text>
          </view>
          <view class="work-actions">
            <view class="action-btn" @click.stop="handlePreview(fav)">
              <text>预览</text>
            </view>
            <view class="action-btn primary" @click.stop="handleShare(fav)">
              <text>分享</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'
import { useWorksStore } from '@/stores/works'

const userStore = useUserStore()
const worksStore = useWorksStore()
const { isLoggedIn } = storeToRefs(userStore)
const activeTab = ref('all')

const tabList = ref([
  { key: 'all', name: '全部' },
  { key: 'draft', name: '草稿' },
  { key: 'favorite', name: '收藏' }
])

const handleLogin = () => {
  uni.navigateTo({ url: '/pages/login/index' })
}

const handleWorkClick = (work: any) => {
  uni.navigateTo({ url: `/pages/preview/index?id=${work.id}` })
}

const handleDraftClick = (draft: any) => {
  uni.navigateTo({ url: `/pages/editor/index?id=${draft.id}` })
}

const handlePreview = (work: any) => {
  uni.navigateTo({ url: `/pages/preview/index?id=${work.id}` })
}

const handleShare = (work: any) => {
  uni.setClipboardData({
    data: `https://www.hunbei.com/invitation/${work.id}`,
    success: () => uni.showToast({ title: '链接已复制', icon: 'success' }),
  })
}

const handleEdit = (draft: any) => {
  uni.navigateTo({ url: `/pages/editor/index?id=${draft.id}` })
}

const handleDelete = (draft: any) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这个草稿吗？',
    success: (res) => {
      if (res.confirm) {
        worksStore.deleteWork(draft.id)
        uni.showToast({ title: '已删除', icon: 'success' })
      }
    }
  })
}

const handleCreate = () => {
  uni.navigateTo({ url: '/pages/editor/index' })
}

const onImageError = () => {
  console.warn('Works page image load failed')
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f5f5f5;
}

.not-login {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 70vh;
  padding: 0 48rpx;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 32rpx;
  opacity: 0.5;
}

.empty-text {
  font-size: 28rpx;
  color: #999999;
  margin-bottom: 40rpx;
  text-align: center;
}

.login-btn {
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  color: #ffffff;
  border: none;
  border-radius: 40rpx;
  padding: 24rpx 80rpx;
  font-size: 30rpx;
  font-weight: 500;
}

.works-content {
  padding-bottom: 120rpx;
}

.tabs {
  display: flex;
  background: #ffffff;
  padding: 0 24rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.tab-item {
  flex: 1;
  padding: 32rpx 0;
  text-align: center;
  font-size: 28rpx;
  color: #999999;
  position: relative;

  &.active {
    color: #e84a6e;
    font-weight: 500;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 48rpx;
      height: 6rpx;
      background: #e84a6e;
      border-radius: 3rpx;
    }
  }
}

.works-list {
  padding: 24rpx;
}

.work-card {
  background: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 24rpx;
}

.work-image {
  width: 100%;
  height: 320rpx;
}

.work-info {
  padding: 20rpx;
  border-bottom: 2rpx solid #f5f5f5;
}

.work-title {
  font-size: 30rpx;
  color: #333333;
  font-weight: 500;
  display: block;
  margin-bottom: 8rpx;
}

.work-date {
  font-size: 24rpx;
  color: #999999;
}

.work-actions {
  display: flex;
  padding: 20rpx;
  gap: 20rpx;
}

.action-btn {
  flex: 1;
  padding: 16rpx;
  text-align: center;
  border-radius: 8rpx;
  background: #f5f5f5;
  font-size: 26rpx;
  color: #666666;

  &.primary {
    background: #e84a6e;
    color: #ffffff;
  }

  &.danger {
    background: #fef2f2;
    color: #ef4444;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0;
}

.create-btn {
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  color: #ffffff;
  border: none;
  border-radius: 40rpx;
  padding: 20rpx 60rpx;
  font-size: 28rpx;
  margin-top: 24rpx;
}
</style>
