<template>
  <view class="page">
    <!-- 顶部标题栏 -->
    <view class="header">
      <view class="back-btn" @click="onBack">
        <text class="back-icon">‹</text>
      </view>
      <view class="header-title">我的海报</view>
      <view class="header-right">
        <text class="header-action" @click="onRefresh">⟳</text>
      </view>
    </view>

    <!-- 统计信息 -->
    <view class="stats-bar">
      <text class="stats-text">共 {{ works.length }} 张海报</text>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="state-view">
      <text class="state-text">加载中...</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="works.length === 0" class="state-view empty-state">
      <text class="empty-icon">📋</text>
      <text class="empty-title">还没有制作过海报</text>
      <text class="empty-desc">挑选一个模板，开始制作你的专属海报吧</text>
      <button class="empty-btn" @click="goToTemplates">去挑选模板</button>
    </view>

    <!-- 作品网格 -->
    <scroll-view v-else class="works-scroll" scroll-y refresher-enabled @refresherrefresh="onPullRefresh" :refresher-triggered="refreshing">
      <view class="works-grid">
        <view
          v-for="work in works"
          :key="work.id"
          class="work-card"
        >
          <!-- 封面图 -->
          <view class="work-cover" @click="onEditWork(work)">
            <image
              v-if="work.cover_url"
              class="cover-img"
              :src="resolveUrl(work.cover_url)"
              mode="aspectFill"
            />
            <view v-else class="cover-placeholder">
              <text class="cover-placeholder-icon">🎨</text>
              <text class="cover-placeholder-text">海报作品</text>
            </view>
          </view>

          <!-- 信息区 -->
          <view class="work-info">
            <text class="work-name">{{ work.template_name || '未命名海报' }}</text>
            <text class="work-date">{{ formatDate(work.created_at) }}</text>
          </view>

          <!-- 操作区 -->
          <view class="work-actions">
            <view class="work-action-btn" @click="onEditWork(work)">
              <text class="action-icon">✎</text>
              <text class="action-label">编辑</text>
            </view>
            <view class="work-action-btn" @click="onPreviewWork(work)">
              <text class="action-icon">👁</text>
              <text class="action-label">预览</text>
            </view>
            <view class="work-action-btn danger" :class="{ 'work-action-btn--disabled': deleting }" @click="onDeleteWork(work)">
              <text class="action-icon">🗑</text>
              <text class="action-label">{{ deleting ? '删除中' : '删除' }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部提示 -->
      <view class="page-bottom">
        <text class="bottom-text">— 长按海报可分享给好友 —</text>
      </view>
    </scroll-view>

    <!-- 预览弹窗 -->
    <view v-if="previewVisible" class="preview-overlay" @click="previewVisible = false">
      <view class="preview-modal" @click.stop>
        <view class="preview-header">
          <text class="preview-title">预览海报</text>
          <text class="preview-close" @click="previewVisible = false">✕</text>
        </view>
        <scroll-view class="preview-body" scroll-y>
          <image
            v-if="previewWork?.cover_url"
            class="preview-img"
            :src="resolveUrl(previewWork.cover_url)"
            mode="widthFix"
          />
          <view v-else class="preview-empty">
            <text>暂无可预览的图片</text>
          </view>
        </scroll-view>
        <view class="preview-footer">
          <button class="preview-btn secondary" @click="onShareWork">分享好友</button>
          <button class="preview-btn primary" @click="onEditWork(previewWork)">编辑</button>
        </view>
      </view>
    </view>

    <!-- 提示 Toast -->
    <view v-if="toastVisible" class="toast">
      <text class="toast-text">{{ toastMsg }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getPosterWorks, deletePosterWork } from '@/api/index'
import { resolveUrl } from '@/utils/url'
import type { PosterWork } from '@/types/poster'

const works = ref<PosterWork[]>([])
const loading = ref(true)
const refreshing = ref(false)
const previewVisible = ref(false)
const previewWork = ref<PosterWork | null>(null)
const toastVisible = ref(false)
const toastMsg = ref('')
const deleting = ref(false)
let toastTimer: any = null

function showToast(msg: string) {
  toastMsg.value = msg
  toastVisible.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastVisible.value = false }, 2000)
}

function formatDate(iso: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  } catch { return iso }
}

async function loadWorks() {
  loading.value = true
  try {
    const data = await getPosterWorks()
    if (data && Array.isArray(data)) {
      works.value = data
    } else {
      works.value = []
    }
  } catch (e) {
    console.warn('加载海报作品失败:', e)
    works.value = []
  } finally {
    loading.value = false
  }
}

async function onRefresh() {
  await loadWorks()
  showToast('已刷新')
}

function onPullRefresh() {
  refreshing.value = true
  loadWorks().finally(() => {
    refreshing.value = false
  })
}

function onEditWork(work: PosterWork | null) {
  if (!work) return
  uni.navigateTo({
    url: `/pages/poster/editor/index?id=${work.template_id}&workId=${work.id}`,
  })
}

function onPreviewWork(work: PosterWork) {
  previewWork.value = work
  previewVisible.value = true
}

async function onDeleteWork(work: PosterWork) {
  const res = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '确认删除',
      content: `确定删除海报「${work.template_name || '未命名'}」吗？`,
      confirmText: '删除',
      cancelText: '取消',
      confirmColor: '#e84a6e',
      success: (r) => resolve(r.confirm),
    })
  })
  if (!res) return

  deleting.value = true
  try {
    await deletePosterWork(work.id)
    works.value = works.value.filter(w => w.id !== work.id)
    showToast('已删除')
  } catch (e) {
    console.warn('删除失败:', e)
    showToast('删除失败')
  } finally {
    deleting.value = false
  }
}

function onShareWork() {
  if (!previewWork.value) return
  // #ifdef MP-WEIXIN
  // 微信小程序不支持 uni.share，使用页面级分享
  showToast('点击右上角「···」分享给好友')
  // #endif
  // #ifndef MP-WEIXIN
  uni.share({
    provider: 'weixin',
    scene: 'WXSceneSession',
    type: 2,
    imageUrl: previewWork.value.cover_url ? resolveUrl(previewWork.value.cover_url) : '',
    success: () => showToast('分享成功'),
    fail: () => showToast('分享取消'),
  })
  // #endif
}

function goToTemplates() {
  uni.navigateTo({
    url: '/pages/poster/index/index',
  })
}

function onBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.switchTab({ url: '/pages/index/index' })
  }
}

onMounted(() => {
  loadWorks()
})

onUnmounted(() => {
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f2f2f7;
  display: flex;
  flex-direction: column;
}

/* 顶部标题栏 - 毛玻璃效果 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.04);
}

.back-btn {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.25s ease;
  &:active {
    background: rgba(0, 0, 0, 0.06);
    transform: scale(0.9);
  }
}

.back-icon {
  font-size: 60rpx;
  color: #1a1a2e;
  font-weight: 300;
}

.header-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #1a1a2e;
  flex: 1;
  text-align: center;
  letter-spacing: 2rpx;
}

.header-right {
  width: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-action {
  font-size: 40rpx;
  color: #6e6e80;
  padding: 8rpx;
  display: inline-block;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  &:active {
    transform: rotate(180deg) scale(0.9);
  }
}

/* 统计条 */
.stats-bar {
  margin: 16rpx 24rpx 0;
  padding: 18rpx 28rpx;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(60, 60, 80, 0.05);
}

.stats-text {
  font-size: 24rpx;
  color: #6e6e80;
  font-weight: 500;
}

/* 状态视图 */
.state-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx 30rpx;
}

.state-text {
  font-size: 28rpx;
  color: #6e6e80;
}

/* 空状态 */
.empty-state { gap: 24rpx; }

.empty-icon {
  font-size: 100rpx;
  opacity: 0.9;
  filter: drop-shadow(0 8rpx 20rpx rgba(232, 74, 110, 0.18));
}

.empty-title {
  font-size: 34rpx;
  color: #1a1a2e;
  font-weight: 600;
  letter-spacing: 1rpx;
}

.empty-desc {
  font-size: 26rpx;
  color: #6e6e80;
  text-align: center;
  line-height: 1.6;
}

.empty-btn {
  margin-top: 24rpx;
  padding: 22rpx 64rpx;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  border-radius: 44rpx;
  border: none;
  box-shadow: 0 10rpx 24rpx rgba(232, 74, 110, 0.32);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  letter-spacing: 2rpx;
  &:active {
    transform: scale(0.95);
    box-shadow: 0 4rpx 12rpx rgba(232, 74, 110, 0.24);
  }
}

/* 作品滚动区 */
.works-scroll {
  flex: 1;
  height: 0;
}

.works-grid {
  padding: 24rpx;
  display: flex;
  flex-wrap: wrap;
}

.work-card {
  width: calc(50% - 12rpx);
  margin-bottom: 24rpx;
  background: #fff;
  border-radius: 28rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 30rpx rgba(60, 60, 80, 0.08), 0 2rpx 8rpx rgba(60, 60, 80, 0.04);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease;
  &:active {
    transform: translateY(-6rpx) scale(0.99);
    box-shadow: 0 16rpx 44rpx rgba(60, 60, 80, 0.14), 0 4rpx 12rpx rgba(60, 60, 80, 0.06);
  }
  &:nth-child(odd) { margin-right: 24rpx; }
}

.work-cover {
  width: 100%;
  height: 380rpx;
  background: #ececf2;
  position: relative;
  /* 封面图底部渐变遮罩 */
  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 100rpx;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.28), transparent);
    pointer-events: none;
  }
}

.cover-img {
  width: 100%;
  height: 100%;
}

.cover-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  gap: 12rpx;
}

.cover-placeholder-icon {
  font-size: 60rpx;
}

.cover-placeholder-text {
  font-size: 24rpx;
  color: #6e6e80;
}

.work-info {
  padding: 18rpx 22rpx 10rpx;
}

.work-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a2e;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-date {
  font-size: 22rpx;
  color: #6e6e80;
  margin-top: 6rpx;
  display: block;
}

.work-actions {
  display: flex;
  padding: 0 22rpx 20rpx;
  gap: 10rpx;
}

.work-action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  padding: 14rpx 0;
  background: rgba(118, 118, 128, 0.1);
  border-radius: 14rpx;
  transition: all 0.2s ease;
  &:active {
    transform: scale(0.94);
    background: rgba(118, 118, 128, 0.18);
  }
  &.danger {
    background: rgba(232, 74, 110, 0.1);
    &:active {
      background: rgba(232, 74, 110, 0.18);
    }
  }
}

.action-icon {
  font-size: 24rpx;
}

.action-label {
  font-size: 22rpx;
  color: #6e6e80;
  font-weight: 500;
}

.work-action-btn.danger .action-label { color: #e84a6e; }

.work-action-btn--disabled {
  opacity: 0.5;
  pointer-events: none;
}

/* 底部 */
.page-bottom {
  padding: 40rpx 0 60rpx;
  text-align: center;
}

.bottom-text {
  font-size: 24rpx;
  color: #aeaeb2;
  letter-spacing: 2rpx;
}

/* 预览弹窗 */
.preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-modal {
  width: 90%;
  max-width: 680rpx;
  max-height: 85vh;
  background: #fff;
  border-radius: 32rpx;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 40rpx 80rpx rgba(0, 0, 0, 0.28), 0 8rpx 24rpx rgba(0, 0, 0, 0.12);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.preview-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a2e;
  letter-spacing: 1rpx;
}

.preview-close {
  font-size: 36rpx;
  color: #6e6e80;
  padding: 8rpx 16rpx;
  border-radius: 50%;
  transition: all 0.2s ease;
  &:active {
    background: rgba(0, 0, 0, 0.06);
    transform: scale(0.9);
  }
}

.preview-body {
  flex: 1;
  min-height: 0;
  padding: 24rpx;
}

.preview-img {
  width: 100%;
  border-radius: 20rpx;
}

.preview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400rpx;
  color: #6e6e80;
  font-size: 28rpx;
}

.preview-footer {
  display: flex;
  gap: 20rpx;
  padding: 24rpx 32rpx;
  border-top: 1rpx solid rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.preview-btn {
  flex: 1;
  font-size: 28rpx;
  font-weight: 600;
  border-radius: 20rpx;
  border: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  letter-spacing: 2rpx;
  &:active {
    transform: scale(0.96);
  }
}

.preview-btn.primary {
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  color: #fff;
  box-shadow: 0 8rpx 20rpx rgba(232, 74, 110, 0.3);
  &:active {
    box-shadow: 0 4rpx 12rpx rgba(232, 74, 110, 0.24);
  }
}

.preview-btn.secondary {
  background: rgba(118, 118, 128, 0.1);
  color: #1a1a2e;
  &:active {
    background: rgba(118, 118, 128, 0.18);
  }
}

/* Toast */
.toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.78);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  color: #fff;
  padding: 22rpx 44rpx;
  border-radius: 20rpx;
  z-index: 9999;
  pointer-events: none;
  box-shadow: 0 16rpx 40rpx rgba(0, 0, 0, 0.3);
}

.toast-text {
  font-size: 28rpx;
  color: #fff;
  font-weight: 500;
}
</style>
