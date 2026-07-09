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
            <view class="work-action-btn danger" @click="onDeleteWork(work)">
              <text class="action-icon">🗑</text>
              <text class="action-label">删除</text>
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
          <button class="preview-btn primary" @click="onEditWork(previewWork!)">编辑</button>
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
import { ref, onMounted } from 'vue'
import { getPosterWorks, deletePosterWork } from '@/api/index'
import { API_BASE } from '@/config'

interface PosterWork {
  id: string
  template_id: string
  template_name?: string
  cover_url?: string
  content?: any
  created_at: string
}

const works = ref<PosterWork[]>([])
const loading = ref(true)
const refreshing = ref(false)
const previewVisible = ref(false)
const previewWork = ref<PosterWork | null>(null)
const toastVisible = ref(false)
const toastMsg = ref('')
let toastTimer: any = null

function showToast(msg: string) {
  toastMsg.value = msg
  toastVisible.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastVisible.value = false }, 2000)
}

function resolveUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url
  return API_BASE + url
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
    } else if (data && (data as any).data) {
      works.value = (data as any).data
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

function onRefresh() {
  loadWorks()
  showToast('已刷新')
}

function onPullRefresh() {
  refreshing.value = true
  loadWorks().finally(() => {
    refreshing.value = false
  })
}

function onEditWork(work: PosterWork) {
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

  try {
    await deletePosterWork(work.id)
    works.value = works.value.filter(w => w.id !== work.id)
    showToast('已删除')
  } catch (e) {
    console.warn('删除失败:', e)
    showToast('删除失败')
  }
}

function onShareWork() {
  if (!previewWork.value) return
  // #ifdef MP-WEIXIN
  uni.share({
    provider: 'weixin',
    scene: 'WXSceneSession',
    type: 2,
    imageUrl: previewWork.value.cover_url ? resolveUrl(previewWork.value.cover_url) : '',
    success: () => showToast('分享成功'),
    fail: () => showToast('分享取消'),
  })
  // #endif
  // #ifndef MP-WEIXIN
  showToast('请在微信小程序中使用分享功能')
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
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f5f6fa;
  display: flex;
  flex-direction: column;
}

/* 顶部标题栏 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  background: #fff;
  border-bottom: 2rpx solid #f0f0f0;
}

.back-btn {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 60rpx;
  color: #333;
  font-weight: 300;
}

.header-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
  flex: 1;
  text-align: center;
}

.header-right { width: 80rpx; display: flex; align-items: center; justify-content: center; }

.header-action {
  font-size: 40rpx;
  color: #666;
  padding: 8rpx;
}

/* 统计条 */
.stats-bar {
  padding: 16rpx 30rpx;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
}

.stats-text {
  font-size: 24rpx;
  color: #999;
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
  color: #999;
}

/* 空状态 */
.empty-state { gap: 20rpx; }

.empty-icon {
  font-size: 100rpx;
  opacity: 0.5;
}

.empty-title {
  font-size: 32rpx;
  color: #333;
  font-weight: 600;
}

.empty-desc {
  font-size: 26rpx;
  color: #999;
  text-align: center;
  line-height: 1.5;
}

.empty-btn {
  margin-top: 20rpx;
  padding: 20rpx 60rpx;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  color: #fff;
  font-size: 28rpx;
  border-radius: 40rpx;
  border: none;
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
  border-radius: 18rpx;
  overflow: hidden;
  box-shadow: 0 3rpx 16rpx rgba(0,0,0,0.06);
  transition: transform 0.2s;
  &:active { transform: scale(0.97); }

  &:nth-child(odd) { margin-right: 24rpx; }
}

.work-cover {
  width: 100%;
  height: 380rpx;
  background: #f5f5f5;
  position: relative;
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
  color: #999;
}

.work-info {
  padding: 16rpx 20rpx 8rpx;
}

.work-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-date {
  font-size: 22rpx;
  color: #999;
  margin-top: 6rpx;
  display: block;
}

.work-actions {
  display: flex;
  padding: 0 20rpx 16rpx;
  gap: 8rpx;
}

.work-action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  padding: 12rpx 0;
  background: #f5f5f5;
  border-radius: 8rpx;

  &.danger { background: #fff0f0; }
}

.action-icon {
  font-size: 24rpx;
}

.action-label {
  font-size: 22rpx;
  color: #666;
}

.work-action-btn.danger .action-label { color: #e84a6e; }

/* 底部 */
.page-bottom {
  padding: 40rpx 0 60rpx;
  text-align: center;
}

.bottom-text {
  font-size: 24rpx;
  color: #ccc;
}

/* 预览弹窗 */
.preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
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
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
  flex-shrink: 0;
}

.preview-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.preview-close {
  font-size: 36rpx;
  color: #999;
  padding: 8rpx 16rpx;
}

.preview-body {
  flex: 1;
  min-height: 0;
  padding: 20rpx;
}

.preview-img {
  width: 100%;
  border-radius: 12rpx;
}

.preview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400rpx;
  color: #999;
  font-size: 28rpx;
}

.preview-footer {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 30rpx;
  border-top: 1rpx solid #f0f0f0;
  flex-shrink: 0;
}

.preview-btn {
  flex: 1;
  font-size: 28rpx;
  border-radius: 12rpx;
}

.preview-btn.primary {
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  color: #fff;
}

.preview-btn.secondary {
  background: #f5f5f5;
  color: #333;
}

/* Toast */
.toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0,0,0,0.8);
  color: #fff;
  padding: 20rpx 40rpx;
  border-radius: 12rpx;
  z-index: 9999;
  pointer-events: none;
}

.toast-text {
  font-size: 28rpx;
  color: #fff;
}
</style>
