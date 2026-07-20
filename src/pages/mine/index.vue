<template>
  <view class="page animate-fade-in">
    <view class="header-bg">
      <view class="header-blob blob-1"></view>
      <view class="header-blob blob-2"></view>
      <view class="header-blob blob-3"></view>
      <view class="header-blob blob-4"></view>
    </view>

    <view class="user-section">
      <view class="user-card animate-fade-in-up">
        <view class="avatar animate-float" @click="handleAvatarClick">
          <text class="avatar-icon">👤</text>
        </view>
        <view class="user-info">
          <text class="user-name delay-100">{{ isLoggedIn ? (nickname || '用户') : '登录/注册' }}</text>
          <text class="user-desc delay-200">{{ isLoggedIn ? '管理你的作品和设置' : '登录后查看更多功能' }}</text>
          <view v-if="isLoggedIn" class="user-stats delay-300">
            <text class="stat-item">作品数: <text class="stat-num">{{ worksCount }}</text></text>
            <text class="stat-divider">|</text>
            <text class="stat-item">收藏: <text class="stat-num">{{ favoritesCount }}</text></text>
          </view>
          <text v-else class="login-hint delay-300">登录后查看</text>
        </view>
        <view class="user-actions delay-200">
          <view class="action-icon" @click="handleSetting">⚙️</view>
          <view class="action-icon bell-icon" @click="handleBell">
            🔔
            <view class="bell-dot"></view>
          </view>
        </view>
      </view>
    </view>

    <view class="vip-card animate-fade-in-up delay-100" @click="handleVip">
      <view class="vip-watermark">VIP</view>
      <view class="vip-save-badge">立省¥99</view>
      <view class="vip-content">
        <view class="vip-icon">👑</view>
        <view class="vip-info">
          <text class="vip-title">{{ userStore.isVip() ? 'VIP会员' : 'TOYtamaxia VIP' }}</text>
          <text class="vip-desc">{{ userStore.isVip() ? vipExpireText : '开通会员享6大权益' }}</text>
        </view>
      </view>
      <view class="vip-btn">{{ userStore.isVip() ? '查看权益 >' : '立即开通 >' }}</view>
    </view>

    <view class="quick-actions stagger-list animate-fade-in-up delay-200">
      <view
        v-for="item in quickActions"
        :key="item.id"
        class="quick-item"
        @click="handleQuickAction(item)"
      >
        <view class="quick-icon-wrap">
          <view class="quick-icon" :style="{ background: item.bgColor }">
            <text>{{ item.icon }}</text>
          </view>
          <view v-if="item.badge" class="quick-badge">{{ item.badge }}</view>
        </view>
        <text class="quick-name">{{ item.name }}</text>
      </view>
    </view>

    <view class="tools-section animate-fade-in-up delay-300">
      <view class="section-title">
        <text>热门工具</text>
        <text class="section-more">全部 ›</text>
      </view>
      <view class="tools-grid stagger-list">
        <view
          v-for="tool in hotTools"
          :key="tool.id"
          class="tool-item"
          @click="handleToolClick(tool)"
        >
          <view class="tool-icon-wrap">
            <view class="tool-icon" :style="{ background: tool.bgColor }">
              <text>{{ tool.icon }}</text>
            </view>
            <view v-if="tool.tag" class="tool-tag" :class="'tag-' + tool.tag">{{ tool.tag === 'hot' ? 'HOT' : 'NEW' }}</view>
          </view>
          <text class="tool-name">{{ tool.name }}</text>
        </view>
      </view>
    </view>

    <view class="menu-section animate-fade-in-up delay-400">
      <view
        v-for="item in menuItems"
        :key="item.id"
        class="menu-item"
        @click="handleMenuItemClick(item)"
      >
        <view class="menu-left">
          <view class="menu-icon">{{ item.icon }}</view>
          <text class="menu-name">{{ item.name }}</text>
        </view>
        <view class="menu-right">
          <view v-if="item.badge" class="menu-badge-dot"></view>
          <text class="menu-arrow">›</text>
        </view>
      </view>
    </view>

    <view v-if="isLoggedIn" class="logout-section animate-fade-in-up delay-500">
      <view class="logout-btn" @click="handleLogout">
        <text class="logout-icon">🚪</text>
        <text>退出登录</text>
      </view>
    </view>

    <view class="footer safe-area-bottom">
      <text class="copyright">网页版 www.TOYtamaxia.com</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { useWorksStore } from '@/stores/works'

const userStore = useUserStore()
const worksStore = useWorksStore()
const { isLoggedIn, nickname } = storeToRefs(userStore)

// 从 store 获取真实统计数据
const worksCount = computed(() => worksStore.works.length)
const favoritesCount = computed(() => worksStore.favorites.length)

const vipExpireText = computed(() => {
  if (!userStore.vipExpireAt) return ''
  const date = new Date(userStore.vipExpireAt)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `有效期至 ${y}-${m}-${d}`
})

const quickActions = computed(() => [
  { id: 1, name: '收藏', icon: '⭐', bgColor: '#fff3e0', badge: favoritesCount.value > 0 ? String(favoritesCount.value) : '' },
  { id: 2, name: '足迹', icon: '👣', bgColor: '#e3f2fd' },
  { id: 3, name: '卡券包', icon: '🎫', bgColor: '#fce4ec' },
  { id: 4, name: '回收站', icon: '🗑️', bgColor: '#e8f5e9' }
])

const hotTools = ref([
  { id: 1, name: '婚礼文案', icon: '📝', bgColor: '#ffe4e8', tag: 'hot' },
  { id: 2, name: '一键成请柬', icon: '✨', bgColor: '#e6f3ff', tag: 'hot' },
  { id: 3, name: '婚礼MV', icon: '🎬', bgColor: '#fff3e6' },
  { id: 4, name: '朋友圈图片', icon: '📸', bgColor: '#e8f5e9', tag: 'new' },
  { id: 5, name: '迎宾海报', icon: '🎨', bgColor: '#fce4ec' },
  { id: 6, name: '一键出片', icon: '📷', bgColor: '#f3e5f5', tag: 'new' },
  { id: 7, name: '我的海报', icon: '🖼️', bgColor: '#e3f2fd' },
  { id: 8, name: '收到的请柬', icon: '💌', bgColor: '#fff9c4' }
])

const menuItems = computed(() => [
  { id: 1, name: '我的订单', icon: '📦', badge: hasOrders.value },
  { id: 2, name: '在线客服', icon: '💬' },
  { id: 3, name: '意见反馈', icon: '📧' },
  { id: 4, name: '设置', icon: '⚙️' }
])

// 订单徽标：仅当有实际订单时显示红点
const hasOrders = computed(() => {
  // TODO: 接入真实订单数据后替换此逻辑
  return false
})

const handleAvatarClick = () => {
  if (!isLoggedIn.value) {
    uni.navigateTo({ url: '/pages/login/index' })
  } else {
    uni.navigateTo({ url: '/pages/settings/index' })
  }
}

const handleSetting = () => {
  uni.navigateTo({ url: '/pages/settings/index' })
}

const handleBell = () => {
  if (!userStore.requireLogin()) return
  uni.navigateTo({ url: '/pages/notification/index' })
}

const handleVip = () => {
  if (userStore.isVip()) {
    uni.showToast({ title: '您已是VIP会员', icon: 'none' })
  } else {
    uni.navigateTo({ url: '/pages/vip/index' })
  }
}

const handleQuickAction = (item: any) => {
  if (item.name === '收藏') {
    uni.switchTab({ url: '/pages/works/index' })
  } else if (item.name === '足迹') {
    if (!userStore.requireLogin()) return
    uni.navigateTo({ url: '/pages/footprint/index' })
  } else if (item.name === '卡券包') {
    uni.showToast({ title: '功能开发中', icon: 'none' })
  } else if (item.name === '回收站') {
    if (!userStore.requireLogin()) return
    uni.navigateTo({ url: '/pages/recycle/index' })
  }
}

const handleToolClick = (tool: any) => {
  if (tool.name === '一键成请柬') {
    if (!userStore.requireLogin()) return
    uni.navigateTo({ url: '/pages/editor/index' })
  } else if (tool.name === '婚礼文案') {
    uni.navigateTo({ url: '/pages/template/index' })
  } else if (tool.name === '婚礼MV') {
    uni.navigateTo({ url: '/pages/music/index?title=背景音乐' })
  } else if (tool.name === '收到的请柬') {
    uni.navigateTo({ url: '/pages/footprint/index' })
  } else if (tool.name === '朋友圈图片') {
    if (!userStore.requireLogin()) return
    uni.navigateTo({ url: '/pages/share/index' })
  } else if (tool.name === '迎宾海报') {
    uni.navigateTo({ url: '/pages/poster/index/index' })
  } else if (tool.name === '我的海报') {
    if (!userStore.requireLogin()) return
    uni.navigateTo({ url: '/pages/poster/works/index' })
  } else if (tool.name === '一键出片') {
    if (!userStore.requireLogin()) return
    uni.navigateTo({ url: '/pages/editor/index' })
  }
}

const handleMenuItemClick = (item: any) => {
  if (item.id === 1) {
    if (!userStore.requireLogin()) return
    uni.navigateTo({ url: '/pages/mall/orders' })
  } else if (item.id === 2) {
    // 客服入口：优先调起微信小程序原生客服会话；非微信环境或未配置时，
    // 兜底为拨打客服电话占位（上线前需在 settings/协议页填写真实客服电话）
    // #ifdef MP-WEIXIN
    try {
      uni.openCustomerServiceConversation({})
      return
    } catch (e) { /* 落入下方兜底 */ }
    // #endif
    uni.showModal({
      title: '联系客服',
      content: '客服电话：________________（待填写）\n工作时间：周一至周五 9:00-18:00\n\n您也可以通过「设置 > 关于我们」查看更多联系方式，或使用「意见反馈」提交问题。',
      confirmText: '去反馈',
      cancelText: '关闭',
      success: (res) => {
        if (res.confirm) {
          if (!userStore.requireLogin()) return
          uni.navigateTo({ url: '/pages/feedback/index' })
        }
      },
    })
  } else if (item.id === 3) {
    if (!userStore.requireLogin()) return
    uni.navigateTo({ url: '/pages/feedback/index' })
  } else if (item.id === 4) {
    uni.navigateTo({ url: '/pages/settings/index' })
  }
}

const handleLogout = () => {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.showToast({ title: '已退出', icon: 'success' })
      }
    }
  })
}

onShow(() => {
  if (isLoggedIn.value) {
    userStore.fetchUserInfo().catch(() => {})
  }
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: 120rpx;
  opacity: 0;
  animation: pageFadeIn 0.5s ease forwards;
}

@keyframes pageFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-fade-in-up {
  opacity: 0;
  transform: translateY(20rpx);
  animation: fadeInUp 0.5s ease forwards;
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

.delay-100 { animation-delay: 0.1s; }
.delay-200 { animation-delay: 0.2s; }
.delay-300 { animation-delay: 0.3s; }
.delay-400 { animation-delay: 0.4s; }
.delay-500 { animation-delay: 0.5s; }

.animate-float {
  animation: avatarFloat 3.5s ease-in-out infinite;
}

@keyframes avatarFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6rpx); }
}

.stagger-list {
  > view {
    opacity: 0;
    transform: translateY(16rpx);
    animation: fadeInUp 0.4s ease forwards;
  }

  > view:nth-child(1) { animation-delay: 0.05s; }
  > view:nth-child(2) { animation-delay: 0.1s; }
  > view:nth-child(3) { animation-delay: 0.15s; }
  > view:nth-child(4) { animation-delay: 0.2s; }
  > view:nth-child(5) { animation-delay: 0.25s; }
  > view:nth-child(6) { animation-delay: 0.3s; }
  > view:nth-child(7) { animation-delay: 0.35s; }
  > view:nth-child(8) { animation-delay: 0.4s; }
}

/* 顶部 mesh gradient：动态径向渐变blob */
.header-bg {
  height: 380rpx;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  overflow: hidden;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
}

.header-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(40rpx);
  opacity: 0.7;
}

.blob-1 {
  width: 300rpx;
  height: 300rpx;
  background: rgba(255, 138, 190, 0.9);
  top: -60rpx;
  left: -40rpx;
  animation: blobMove1 8s ease-in-out infinite;
}

.blob-2 {
  width: 280rpx;
  height: 280rpx;
  background: rgba(173, 122, 255, 0.5);
  top: -40rpx;
  right: -60rpx;
  animation: blobMove2 10s ease-in-out infinite;
}

.blob-3 {
  width: 260rpx;
  height: 260rpx;
  background: rgba(255, 178, 120, 0.55);
  bottom: -80rpx;
  right: 20rpx;
  animation: blobMove3 9s ease-in-out infinite;
}

.blob-4 {
  width: 240rpx;
  height: 240rpx;
  background: rgba(255, 110, 140, 0.6);
  bottom: -60rpx;
  left: 20rpx;
  animation: blobMove4 7s ease-in-out infinite;
}

@keyframes blobMove1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(20rpx, 30rpx) scale(1.1); }
  66% { transform: translate(-10rpx, 20rpx) scale(0.95); }
}

@keyframes blobMove2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-30rpx, 20rpx) scale(1.05); }
  66% { transform: translate(10rpx, 30rpx) scale(1.1); }
}

@keyframes blobMove3 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-20rpx, -30rpx) scale(0.95); }
  66% { transform: translate(30rpx, -10rpx) scale(1.05); }
}

@keyframes blobMove4 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(25rpx, -20rpx) scale(1.1); }
  66% { transform: translate(-20rpx, -25rpx) scale(0.9); }
}

.user-section {
  padding: 0 24rpx;
  position: relative;
  z-index: 1;
}

/* 用户卡片：毛玻璃效果 */
.user-card {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20rpx) saturate(180%);
  -webkit-backdrop-filter: blur(20rpx) saturate(180%);
  border: 1rpx solid rgba(255, 255, 255, 0.6);
  border-radius: 28rpx;
  padding: 32rpx;
  margin-top: 140rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.12);
}

/* 头像：渐变边框（外层渐变背景 + 内层留间距） */
.avatar {
  box-sizing: border-box;
  width: 128rpx;
  height: 128rpx;
  padding: 4rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff9a9e 0%, #fad0c4 30%, #a18cd1 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
  box-shadow: 0 8rpx 20rpx rgba(232, 74, 110, 0.25);
  transition: transform 0.3s ease;
  flex-shrink: 0;

  &:active {
    transform: scale(0.94);
  }
}

.avatar-icon {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #fff5f7 0%, #ffe4e8 100%);
  font-size: 56rpx;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a2e;
  display: block;
  margin-bottom: 6rpx;
  opacity: 0;
  animation: fadeInUp 0.4s ease 0.1s forwards;
}

.user-desc {
  font-size: 24rpx;
  color: #6e6e80;
  display: block;
  margin-bottom: 12rpx;
  opacity: 0;
  animation: fadeInUp 0.4s ease 0.2s forwards;
}

.user-stats {
  display: flex;
  align-items: center;
  opacity: 0;
  animation: fadeInUp 0.4s ease 0.3s forwards;
}

.login-hint {
  font-size: 24rpx;
  color: #6e6e80;
  display: block;
  margin-top: 4rpx;
  opacity: 0;
  animation: fadeInUp 0.4s ease 0.3s forwards;
}

.stat-item {
  font-size: 22rpx;
  color: #6e6e80;
}

.stat-num {
  font-weight: 600;
  color: #e84a6e;
}

.stat-divider {
  margin: 0 12rpx;
  font-size: 20rpx;
  color: #d8d8e0;
}

.user-actions {
  display: flex;
  gap: 24rpx;
  opacity: 0;
  animation: fadeInUp 0.4s ease 0.2s forwards;
}

.action-icon {
  font-size: 40rpx;
  transition: transform 0.25s ease;
  position: relative;

  &:active {
    transform: scale(0.88);
  }
}

.bell-icon {
  position: relative;
}

.bell-dot {
  position: absolute;
  top: 4rpx;
  right: 2rpx;
  width: 14rpx;
  height: 14rpx;
  background: #ef4444;
  border-radius: 50%;
  border: 2rpx solid #ffffff;
}

/* VIP 卡片：奢华金色渐变 + 水印 + 立省徽章 */
.vip-card {
  position: relative;
  margin: 24rpx;
  padding: 28rpx 24rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  overflow: hidden;
  background: linear-gradient(135deg, #d4a017 0%, #f5d76e 25%, #f5af19 50%, #e89316 75%, #b8860b 100%);
  box-shadow: 0 16rpx 40rpx rgba(212, 160, 23, 0.35);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease;

  &:active {
    transform: scale(0.97);
    box-shadow: 0 8rpx 20rpx rgba(212, 160, 23, 0.25);
  }

  /* 内部顶部高光 */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 55%;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0) 100%);
    pointer-events: none;
    z-index: 1;
  }

  /* 光泽扫过动画 */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -60%;
    width: 40%;
    height: 100%;
    background: linear-gradient(120deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%);
    transform: skewX(-20deg);
    animation: vipShimmer 3.6s ease-in-out infinite;
    pointer-events: none;
    z-index: 2;
  }
}

.vip-watermark {
  position: absolute;
  right: -20rpx;
  top: 50%;
  transform: translateY(-50%) rotate(-15deg);
  font-size: 120rpx;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.08);
  letter-spacing: 8rpx;
  pointer-events: none;
  z-index: 0;
}

.vip-save-badge {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  color: #ffffff;
  font-size: 20rpx;
  font-weight: 600;
  padding: 6rpx 14rpx;
  border-radius: 20rpx;
  z-index: 3;
  box-shadow: 0 4rpx 10rpx rgba(238, 90, 36, 0.3);
}

@keyframes vipShimmer {
  0% {
    left: -60%;
  }

  60%,
  100% {
    left: 120%;
  }
}

.vip-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.vip-icon {
  font-size: 48rpx;
}

.vip-info {
  display: flex;
  flex-direction: column;
}

.vip-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #ffffff;
  text-shadow: 0 1rpx 3rpx rgba(0, 0, 0, 0.15);
}

.vip-desc {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.1);
}

.vip-btn {
  position: relative;
  z-index: 1;
  background: #ffffff;
  padding: 14rpx 28rpx;
  border-radius: 28rpx;
  font-size: 24rpx;
  color: #d4a017;
  font-weight: 600;
  box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.12);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease;

  &:active {
    transform: scale(0.92);
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
  }
}

/* 快捷操作 */
.quick-actions {
  background: #ffffff;
  margin: 0 24rpx;
  border-radius: 24rpx;
  padding: 32rpx 24rpx;
  display: flex;
  justify-content: space-around;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.06);
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:active {
    transform: scale(0.92);

    .quick-icon {
      box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
    }
  }
}

.quick-icon-wrap {
  position: relative;
  margin-bottom: 12rpx;
}

.quick-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.2s ease;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 50%);
    pointer-events: none;
  }
}

.quick-badge {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 8rpx;
  background: #ef4444;
  color: #ffffff;
  border-radius: 16rpx;
  font-size: 20rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid #ffffff;
  box-sizing: border-box;
}

.quick-name {
  font-size: 24rpx;
  color: #6e6e80;
}

/* 热门工具 */
.tools-section {
  background: #ffffff;
  margin: 24rpx;
  border-radius: 24rpx;
  padding: 32rpx 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.06);
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 28rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-more {
  font-size: 24rpx;
  color: #a0a0b0;
  font-weight: 400;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 32rpx 24rpx;
}

.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:active {
    transform: translateY(-6rpx) scale(0.96);

    .tool-icon {
      box-shadow: 0 12rpx 28rpx rgba(0, 0, 0, 0.12);
    }
  }
}

.tool-icon-wrap {
  position: relative;
  margin-bottom: 14rpx;
}

.tool-icon {
  position: relative;
  width: 96rpx;
  height: 96rpx;
  border-radius: 26rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.2s ease;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 45%, rgba(0, 0, 0, 0.06) 100%);
    pointer-events: none;
  }

  text {
    position: relative;
    z-index: 1;
  }
}

.tool-tag {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  font-size: 18rpx;
  font-weight: 700;
  padding: 4rpx 10rpx;
  border-radius: 12rpx;
  color: #ffffff;
  z-index: 2;

  &.tag-hot {
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  }

  &.tag-new {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  }
}

.tool-name {
  font-size: 24rpx;
  color: #6e6e80;
}

/* 菜单列表 */
.menu-section {
  background: #ffffff;
  margin: 0 24rpx;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.06);
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 28rpx;
  position: relative;
  transition: background 0.2s ease;

  &::after {
    content: '';
    position: absolute;
    left: 84rpx;
    right: 28rpx;
    bottom: 0;
    height: 1rpx;
    background: linear-gradient(90deg, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.08) 50%, rgba(0, 0, 0, 0.05) 100%);
  }

  &:last-child {
    &::after {
      display: none;
    }
  }

  &:active {
    background: rgba(232, 74, 110, 0.04);

    .menu-arrow {
      transform: translateX(6rpx);
    }
  }
}

.menu-left {
  display: flex;
  align-items: center;
}

.menu-icon {
  font-size: 36rpx;
  margin-right: 20rpx;
}

.menu-name {
  font-size: 28rpx;
  color: #1a1a2e;
  font-weight: 500;
}

.menu-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.menu-badge-dot {
  width: 16rpx;
  height: 16rpx;
  background: #ef4444;
  border-radius: 50%;
  box-shadow: 0 0 0 3rpx #ffffff;
}

.menu-arrow {
  font-size: 36rpx;
  color: #c8c8d0;
  transition: transform 0.2s ease;
  font-weight: 300;
}

/* 退出按钮 */
.logout-section {
  padding: 24rpx;
}

.logout-btn {
  width: 100%;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  background: #ffffff;
  border-radius: 24rpx;
  font-size: 28rpx;
  color: #ef4444;
  font-weight: 500;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.06);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2rpx solid rgba(239, 68, 68, 0.1);

  &:active {
    transform: scale(0.97);
    background: #fef2f2;
    box-shadow: 0 4rpx 16rpx rgba(239, 68, 68, 0.15);
  }
}

.logout-icon {
  font-size: 32rpx;
}

/* 底部版权 */
.footer {
  text-align: center;
  padding: 48rpx 0 32rpx;
}

.copyright {
  font-size: 22rpx;
  color: #b8b8c4;
  letter-spacing: 1rpx;
}

.safe-area-bottom {
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
}
</style>
