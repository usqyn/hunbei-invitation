<template>
  <view class="page">
    <view class="header">
      <view class="header-bg">
        <view class="header-blob blob-1"></view>
        <view class="header-blob blob-2"></view>
      </view>
      <view class="header-content">
        <view class="header-btn" @click="handleBack">
          <text class="header-icon">‹</text>
        </view>
        <text class="header-title">我的作品</text>
        <view class="header-btn" @click="handleMore">
          <text class="header-icon">⋯</text>
        </view>
      </view>
    </view>

    <view v-if="!isLoggedIn" class="not-login animate-fade-in-up">
      <view class="empty-illustration">
        <view class="empty-circle circle-1"></view>
        <view class="empty-circle circle-2"></view>
        <view class="empty-circle circle-3"></view>
        <image class="empty-icon-image" :src="worksConfig.notLoggedIn.icon" mode="aspectFit" />
      </view>
      <text class="empty-title">欢迎回来</text>
      <text class="empty-text">{{ worksConfig.notLoggedIn.text }}</text>
      <view class="login-btn" @click="handleLogin">
        <text class="login-btn-text">{{ worksConfig.notLoggedIn.btnText }}</text>
        <text class="login-btn-arrow">→</text>
      </view>
    </view>

    <view v-else class="works-content">
      <view class="tabs-wrap">
        <view class="tabs">
          <view
            v-for="(tab, index) in tabList"
            :key="tab.key"
            class="tab-item"
            :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            <text class="tab-text">{{ tab.name }}</text>
            <text class="tab-badge">{{ getTabCount(tab.key) }}</text>
          </view>
          <view class="tab-indicator" :style="indicatorStyle"></view>
        </view>
      </view>

      <view class="works-grid-wrap">
        <view class="works-grid stagger-list" v-if="activeTab === 'all'">
          <view
            v-for="work in worksStore.works"
            :key="work.id"
            class="work-card"
            @click="handleWorkClick(work)"
          >
            <view class="card-cover">
              <image class="cover-image" lazy-load :src="work.image" mode="aspectFill" @error="onImageError" />
              <view class="cover-gradient"></view>
              <view class="card-badge category-badge">
                <text>作品</text>
              </view>
              <view class="card-favorite" @click.stop="handleToggleFavorite(work)">
                <text class="favorite-icon">{{ isFavoriteWork(work.id) ? '♥' : '♡' }}</text>
              </view>
              <view class="card-info">
                <text class="card-title">{{ work.title }}</text>
                <text class="card-date">{{ work.date }}</text>
              </view>
            </view>
            <view class="card-actions">
              <view class="action-item" @click.stop="handlePreview(work)">
                <text class="action-icon">👁</text>
                <text class="action-text">预览</text>
              </view>
              <view class="action-item primary" @click.stop="handleShare(work)">
                <text class="action-icon">↗</text>
                <text class="action-text">分享</text>
              </view>
              <view class="action-item" @click.stop="handleMoreMenu(work)">
                <text class="action-icon">⋯</text>
                <text class="action-text">更多</text>
              </view>
            </view>
          </view>

          <view v-if="!loading && worksStore.works.length === 0" class="empty-state animate-fade-in-up">
            <view class="empty-illustration">
              <view class="empty-circle circle-1"></view>
              <view class="empty-circle circle-2"></view>
              <image class="empty-icon-image" :src="worksConfig.emptyStates.all.icon" mode="aspectFit" />
            </view>
            <text class="empty-title">还没有作品</text>
            <text class="empty-text">{{ worksConfig.emptyStates.all.text }}</text>
            <view class="create-btn" @click="handleCreate">
              <text class="create-btn-text">{{ worksConfig.emptyStates.all.btnText }}</text>
              <text class="create-btn-arrow">+</text>
            </view>
          </view>
        </view>

        <view class="works-grid stagger-list" v-if="activeTab === 'draft'">
          <view
            v-for="draft in worksStore.drafts"
            :key="draft.id"
            class="work-card"
            @click="handleDraftClick(draft)"
          >
            <view class="card-cover">
              <image class="cover-image" lazy-load :src="draft.image" mode="aspectFill" @error="onImageError" />
              <view class="cover-gradient"></view>
              <view class="card-badge draft-badge">
                <text>草稿</text>
              </view>
              <view class="card-favorite" @click.stop="handleToggleFavorite(draft)">
                <text class="favorite-icon">{{ isFavoriteWork(draft.id) ? '♥' : '♡' }}</text>
              </view>
              <view class="card-info">
                <text class="card-title">{{ draft.title }}</text>
                <text class="card-date">草稿 · {{ draft.date }}</text>
              </view>
            </view>
            <view class="card-actions">
              <view class="action-item primary" @click.stop="handleEdit(draft)">
                <text class="action-icon">✎</text>
                <text class="action-text">编辑</text>
              </view>
              <view class="action-item danger" @click.stop="handleDelete(draft)">
                <text class="action-icon">🗑</text>
                <text class="action-text">删除</text>
              </view>
            </view>
          </view>

          <view v-if="!loading && worksStore.drafts.length === 0" class="empty-state animate-fade-in-up">
            <view class="empty-illustration">
              <view class="empty-circle circle-1"></view>
              <view class="empty-circle circle-3"></view>
              <image class="empty-icon-image" :src="worksConfig.emptyStates.draft.icon" mode="aspectFit" />
            </view>
            <text class="empty-title">暂无草稿</text>
            <text class="empty-text">{{ worksConfig.emptyStates.draft.text }}</text>
          </view>
        </view>

        <view class="works-grid stagger-list" v-if="activeTab === 'favorite'">
          <view
            v-for="fav in worksStore.favorites"
            :key="fav.id"
            class="work-card"
            @click="handleWorkClick(fav)"
          >
            <view class="card-cover">
              <image class="cover-image" lazy-load :src="fav.image" mode="aspectFill" @error="onImageError" />
              <view class="cover-gradient"></view>
              <view class="card-badge favorite-badge">
                <text>♥ 收藏</text>
              </view>
              <view class="card-favorite active" @click.stop="handleToggleFavorite(fav)">
                <text class="favorite-icon">♥</text>
              </view>
              <view class="card-info">
                <text class="card-title">{{ fav.title }}</text>
                <text class="card-date">{{ fav.date }}</text>
              </view>
            </view>
            <view class="card-actions">
              <view class="action-item" @click.stop="handlePreview(fav)">
                <text class="action-icon">👁</text>
                <text class="action-text">预览</text>
              </view>
              <view class="action-item primary" @click.stop="handleShare(fav)">
                <text class="action-icon">↗</text>
                <text class="action-text">分享</text>
              </view>
              <view class="action-item danger" @click.stop="handleRemoveFavorite(fav)">
                <text class="action-icon">♡</text>
                <text class="action-text">取消</text>
              </view>
            </view>
          </view>

          <view v-if="!loading && worksStore.favorites.length === 0" class="empty-state animate-fade-in-up">
            <view class="empty-illustration">
              <view class="empty-circle circle-1"></view>
              <view class="empty-circle circle-2"></view>
              <image class="empty-icon-image" :src="worksConfig.emptyStates.favorite.icon" mode="aspectFit" />
            </view>
            <text class="empty-title">暂无收藏</text>
            <text class="empty-text">{{ worksConfig.emptyStates.favorite.text }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'
import { useWorksStore } from '@/stores/works'
import { WORKS_CONFIG } from '@/config'

const userStore = useUserStore()
const worksStore = useWorksStore()
const { isLoggedIn } = storeToRefs(userStore)
const activeTab = ref('all')
const worksConfig = WORKS_CONFIG
const { loading } = storeToRefs(worksStore)

const tabList = ref([
  { key: 'all', name: '全部' },
  { key: 'draft', name: '草稿' },
  { key: 'favorite', name: '收藏' },
])

const indicatorStyle = computed(() => {
  const index = tabList.value.findIndex(t => t.key === activeTab.value)
  const leftPercent = (index * 33.33) + 16.66
  return {
    transform: `translateX(calc(${leftPercent}% - 60rpx))`,
  }
})

const getTabCount = (key: string) => {
  switch (key) {
    case 'all':
      return worksStore.works.length
    case 'draft':
      return worksStore.drafts.length
    case 'favorite':
      return worksStore.favorites.length
    default:
      return 0
  }
}

const isFavoriteWork = (id: string) => {
  return worksStore.isFavorite(id)
}

const handleToggleFavorite = (work: any) => {
  worksStore.toggleFavorite(work.id)
}

onMounted(async () => {
  if (isLoggedIn.value) {
    await worksStore.loadAll()
  }
})

onPullDownRefresh(async () => {
  if (isLoggedIn.value) {
    await worksStore.loadAll()
  }
  uni.stopPullDownRefresh()
})

const handleBack = () => {
  uni.navigateBack({ fail: () => { uni.switchTab({ url: '/pages/mine/index' }) } })
}

const handleMore = () => {
  uni.showActionSheet({
    itemList: ['批量管理', '刷新列表'],
    success: (res) => {
      if (res.tapIndex === 1) {
        worksStore.loadAll()
      }
    },
  })
}

const handleLogin = () => {
  uni.navigateTo({ url: '/pages/login/index' })
}

const handleWorkClick = (work: any) => {
  uni.navigateTo({ url: `/pages/preview/index?workId=${work.id}&templateId=${work.templateType}` })
}

const handleDraftClick = (draft: any) => {
  if (!userStore.requireLogin()) return
  uni.navigateTo({ url: `/pages/editor/index?workId=${draft.id}` })
}

const handlePreview = (work: any) => {
  uni.navigateTo({ url: `/pages/preview/index?workId=${work.id}&templateId=${work.templateType}` })
}

const handleShare = (work: any) => {
  uni.navigateTo({ url: `/pages/share/index?workId=${work.id}&templateId=${work.templateType || ''}` })
}

const handleEdit = (draft: any) => {
  if (!userStore.requireLogin()) return
  uni.navigateTo({ url: `/pages/editor/index?workId=${draft.id}` })
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
    },
  })
}

const handleMoreMenu = (work: any) => {
  uni.showActionSheet({
    itemList: ['重命名', '删除'],
    success: (res) => {
      if (res.tapIndex === 0) {
        handleRename(work)
      } else if (res.tapIndex === 1) {
        handleDeleteWork(work)
      }
    },
  })
}

const handleRename = (work: any) => {
  uni.showModal({
    title: '重命名',
    editable: true,
    placeholderText: '请输入新的作品名称',
    content: work.title,
    success: (res) => {
      if (res.confirm && res.content) {
        worksStore.renameWork(work.id, res.content)
        uni.showToast({ title: '已重命名', icon: 'success' })
      }
    },
  })
}

const handleDeleteWork = (work: any) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这个作品吗？删除后不可恢复。',
    confirmColor: '#ef4444',
    success: (res) => {
      if (res.confirm) {
        worksStore.deleteWork(work.id)
        uni.showToast({ title: '已删除', icon: 'success' })
      }
    },
  })
}

const handleRemoveFavorite = (fav: any) => {
  uni.showModal({
    title: '取消收藏',
    content: '确定要取消收藏这个作品吗？',
    success: (res) => {
      if (res.confirm) {
        worksStore.toggleFavorite(fav.id)
        uni.showToast({ title: '已取消收藏', icon: 'success' })
      }
    },
  })
}

const handleCreate = () => {
  if (!userStore.requireLogin()) return
  uni.navigateTo({ url: '/pages/editor/index' })
}

const onImageError = () => {
  console.warn('Works page image load failed')
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: 120rpx;
}

.header {
  position: sticky;
  top: 0;
  z-index: 100;
  overflow: hidden;
}

.header-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  overflow: hidden;
}

.header-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(30rpx);
  opacity: 0.6;
}

.blob-1 {
  width: 200rpx;
  height: 200rpx;
  background: rgba(255, 138, 190, 0.8);
  top: -40rpx;
  left: -30rpx;
  animation: blobMove1 8s ease-in-out infinite;
}

.blob-2 {
  width: 180rpx;
  height: 180rpx;
  background: rgba(173, 122, 255, 0.4);
  top: -20rpx;
  right: -40rpx;
  animation: blobMove2 10s ease-in-out infinite;
}

@keyframes blobMove1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(20rpx, 15rpx) scale(1.1); }
}

@keyframes blobMove2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-20rpx, 20rpx) scale(1.05); }
}

.header-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  padding-top: calc(88rpx + env(safe-area-inset-top));
  height: calc(140rpx + env(safe-area-inset-top));
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(20rpx) saturate(180%);
  -webkit-backdrop-filter: blur(20rpx) saturate(180%);
}

.header-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  transition: all 0.2s ease;

  &:active {
    transform: scale(0.9);
    background: rgba(255, 255, 255, 0.3);
  }
}

.header-icon {
  font-size: 40rpx;
  color: #ffffff;
  font-weight: 300;
}

.header-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #ffffff;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.not-login {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 48rpx 80rpx;
}

.empty-illustration {
  position: relative;
  width: 240rpx;
  height: 240rpx;
  margin-bottom: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-circle {
  position: absolute;
  border-radius: 50%;
}

.circle-1 {
  width: 200rpx;
  height: 200rpx;
  background: linear-gradient(135deg, rgba(232, 74, 110, 0.15) 0%, rgba(255, 107, 138, 0.1) 100%);
  animation: pulse 3s ease-in-out infinite;
}

.circle-2 {
  width: 160rpx;
  height: 160rpx;
  background: linear-gradient(135deg, rgba(232, 74, 110, 0.2) 0%, rgba(255, 107, 138, 0.15) 100%);
  animation: pulse 3s ease-in-out infinite 0.5s;
}

.circle-3 {
  width: 120rpx;
  height: 120rpx;
  background: linear-gradient(135deg, rgba(232, 74, 110, 0.25) 0%, rgba(255, 107, 138, 0.2) 100%);
  animation: pulse 3s ease-in-out infinite 1s;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.8; }
}

.empty-icon-image {
  position: relative;
  z-index: 1;
  width: 120rpx;
  height: 120rpx;
  opacity: 0.9;
}

.empty-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 16rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #8a8a9a;
  margin-bottom: 48rpx;
  text-align: center;
  line-height: 1.6;
}

.login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  border-radius: 48rpx;
  padding: 28rpx 64rpx;
  box-shadow: 0 12rpx 32rpx rgba(232, 74, 110, 0.35);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  &:active {
    transform: scale(0.96);
    box-shadow: 0 6rpx 16rpx rgba(232, 74, 110, 0.25);
  }
}

.login-btn-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #ffffff;
}

.login-btn-arrow {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 500;
}

.works-content {
  position: relative;
}

.tabs-wrap {
  position: sticky;
  top: calc(140rpx + env(safe-area-inset-top));
  z-index: 99;
  background: rgba(245, 246, 250, 0.85);
  backdrop-filter: blur(20rpx) saturate(180%);
  -webkit-backdrop-filter: blur(20rpx) saturate(180%);
  padding: 20rpx 24rpx;
}

.tabs {
  position: relative;
  display: flex;
  background: #ffffff;
  border-radius: 48rpx;
  padding: 8rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 20rpx 0;
  position: relative;
  z-index: 1;
  transition: all 0.2s ease;

  &:active {
    transform: scale(0.96);
  }

  &.active {
    .tab-text {
      color: #ffffff;
      font-weight: 600;
    }

    .tab-badge {
      background: rgba(255, 255, 255, 0.25);
      color: #ffffff;
    }
  }
}

.tab-text {
  font-size: 28rpx;
  color: #8a8a9a;
  font-weight: 500;
  transition: all 0.3s ease;
}

.tab-badge {
  font-size: 22rpx;
  color: #a0a0b0;
  background: #f0f0f5;
  padding: 2rpx 12rpx;
  border-radius: 20rpx;
  font-weight: 500;
  transition: all 0.3s ease;
}

.tab-indicator {
  position: absolute;
  top: 8rpx;
  left: 0;
  width: calc(33.33% - 8rpx);
  height: calc(100% - 16rpx);
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  border-radius: 40rpx;
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4rpx 16rpx rgba(232, 74, 110, 0.3);
}

.works-grid-wrap {
  padding: 8rpx 24rpx 40rpx;
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.stagger-list {
  > * {
    opacity: 0;
    transform: translateY(20rpx);
    animation: fadeInUp 0.5s ease forwards;
  }

  > *:nth-child(1) { animation-delay: 0.05s; }
  > *:nth-child(2) { animation-delay: 0.1s; }
  > *:nth-child(3) { animation-delay: 0.15s; }
  > *:nth-child(4) { animation-delay: 0.2s; }
  > *:nth-child(5) { animation-delay: 0.25s; }
  > *:nth-child(6) { animation-delay: 0.3s; }
  > *:nth-child(7) { animation-delay: 0.35s; }
  > *:nth-child(8) { animation-delay: 0.4s; }
  > *:nth-child(9) { animation-delay: 0.45s; }
  > *:nth-child(10) { animation-delay: 0.5s; }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  opacity: 0;
  transform: translateY(20rpx);
  animation: fadeInUp 0.5s ease forwards;
}

.work-card {
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  &:active {
    transform: translateY(-4rpx) scale(0.98);
    box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.1);
  }
}

.card-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  overflow: hidden;
}

.cover-image {
  width: 100%;
  height: 100%;
}

.cover-gradient {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 60%;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.7) 100%);
  pointer-events: none;
}

.card-badge {
  position: absolute;
  top: 16rpx;
  left: 16rpx;
  padding: 6rpx 14rpx;
  border-radius: 16rpx;
  font-size: 20rpx;
  font-weight: 600;
  z-index: 2;
  backdrop-filter: blur(10rpx);
  -webkit-backdrop-filter: blur(10rpx);

  &.category-badge {
    background: rgba(232, 74, 110, 0.9);
    color: #ffffff;
  }

  &.draft-badge {
    background: rgba(255, 152, 0, 0.9);
    color: #ffffff;
  }

  &.favorite-badge {
    background: rgba(232, 74, 110, 0.9);
    color: #ffffff;
  }
}

.card-favorite {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(10rpx);
  -webkit-backdrop-filter: blur(10rpx);
  border-radius: 50%;
  z-index: 2;
  transition: all 0.2s ease;

  &:active {
    transform: scale(0.85);
  }

  &.active {
    background: rgba(255, 255, 255, 0.9);
  }
}

.favorite-icon {
  font-size: 28rpx;
  color: #ffffff;
  line-height: 1;

  .active & {
    color: #e84a6e;
  }
}

.card-info {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 16rpx;
  z-index: 1;
}

.card-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 6rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.2);
}

.card-date {
  display: block;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
}

.card-actions {
  display: flex;
  padding: 16rpx;
  gap: 12rpx;
}

.action-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  padding: 12rpx 8rpx;
  background: #f5f6fa;
  border-radius: 16rpx;
  transition: all 0.2s ease;

  &:active {
    transform: scale(0.94);
    background: #eef0f5;
  }

  &.primary {
    background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);

    .action-icon,
    .action-text {
      color: #ffffff;
    }

    &:active {
      background: linear-gradient(135deg, #d63f61 0%, #f55d7e 100%);
    }
  }

  &.danger {
    background: #fef2f2;

    .action-icon,
    .action-text {
      color: #ef4444;
    }

    &:active {
      background: #fee2e2;
    }
  }
}

.action-icon {
  font-size: 28rpx;
  color: #6e6e80;
  line-height: 1;
}

.action-text {
  font-size: 22rpx;
  color: #6e6e80;
  font-weight: 500;
}

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0;
}

.create-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  border-radius: 44rpx;
  padding: 24rpx 56rpx;
  box-shadow: 0 10rpx 28rpx rgba(232, 74, 110, 0.35);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  &:active {
    transform: scale(0.96);
    box-shadow: 0 6rpx 16rpx rgba(232, 74, 110, 0.25);
  }
}

.create-btn-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #ffffff;
}

.create-btn-arrow {
  font-size: 32rpx;
  color: #ffffff;
  font-weight: 500;
}
</style>
