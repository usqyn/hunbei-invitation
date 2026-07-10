<template>
  <view class="page">
    <view class="header-bg"></view>

    <view class="user-section">
      <view class="user-card">
        <view class="avatar" @click="handleAvatarClick">
          <text class="avatar-icon">👤</text>
        </view>
        <view class="user-info">
          <text class="user-name">{{ isLoggedIn ? (nickname || '用户') : '登录/注册' }}</text>
          <text class="user-desc">{{ isLoggedIn ? '管理你的作品和设置' : '登录后查看更多功能' }}</text>
        </view>
        <view class="user-actions">
          <view class="action-icon" @click="handleSetting">⚙️</view>
          <view class="action-icon" @click="handleBell">🔔</view>
        </view>
      </view>
    </view>

    <view class="vip-card" @click="handleVip">
      <view class="vip-content">
        <view class="vip-icon">👑</view>
        <view class="vip-info">
          <text class="vip-title">{{ userStore.isVip() ? 'VIP会员' : '婚贝VIP' }}</text>
          <text class="vip-desc">{{ userStore.isVip() ? vipExpireText : '开通会员享6大权益' }}</text>
        </view>
      </view>
      <view class="vip-btn">{{ userStore.isVip() ? '查看权益 >' : '立即开通 >' }}</view>
    </view>

    <view class="quick-actions">
      <view
        v-for="item in quickActions"
        :key="item.id"
        class="quick-item"
        @click="handleQuickAction(item)"
      >
        <view class="quick-icon" :style="{ background: item.bgColor }">
          <text>{{ item.icon }}</text>
        </view>
        <text class="quick-name">{{ item.name }}</text>
      </view>
    </view>

    <view class="tools-section">
      <view class="section-title">热门工具</view>
      <view class="tools-grid">
        <view
          v-for="tool in hotTools"
          :key="tool.id"
          class="tool-item"
          @click="handleToolClick(tool)"
        >
          <view class="tool-icon" :style="{ background: tool.bgColor }">
            <text>{{ tool.icon }}</text>
          </view>
          <text class="tool-name">{{ tool.name }}</text>
        </view>
      </view>
    </view>

    <view class="menu-section">
      <view
        v-for="item in menuItems"
        :key="item.id"
        class="menu-item"
        @click="handleMenuItemClick(item)"
      >
        <view class="menu-icon">{{ item.icon }}</view>
        <text class="menu-name">{{ item.name }}</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <view v-if="isLoggedIn" class="logout-section">
      <view class="logout-btn" @click="handleLogout">退出登录</view>
    </view>

    <view class="footer">
      <text class="copyright">网页版 www.hunbei.com</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const { isLoggedIn, nickname } = storeToRefs(userStore)

const vipExpireText = computed(() => {
  if (!userStore.vipExpireAt) return ''
  const date = new Date(userStore.vipExpireAt)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `有效期至 ${y}-${m}-${d}`
})

const quickActions = ref([
  { id: 1, name: '收藏', icon: '⭐', bgColor: '#fff3e0' },
  { id: 2, name: '足迹', icon: '👣', bgColor: '#e3f2fd' },
  { id: 3, name: '卡券包', icon: '🎫', bgColor: '#fce4ec' },
  { id: 4, name: '回收站', icon: '🗑️', bgColor: '#e8f5e9' }
])

const hotTools = ref([
  { id: 1, name: '婚礼文案', icon: '📝', bgColor: '#ffe4e8' },
  { id: 2, name: '一键成请柬', icon: '✨', bgColor: '#e6f3ff' },
  { id: 3, name: '婚礼MV', icon: '🎬', bgColor: '#fff3e6' },
  { id: 4, name: '朋友圈图片', icon: '📸', bgColor: '#e8f5e9' },
  { id: 5, name: '迎宾海报', icon: '🎨', bgColor: '#fce4ec' },
  { id: 6, name: '一键出片', icon: '📷', bgColor: '#f3e5f5' },
  { id: 7, name: '我的海报', icon: '🖼️', bgColor: '#e3f2fd' },
  { id: 8, name: '收到的请柬', icon: '💌', bgColor: '#fff9c4' }
])

const menuItems = ref([
  { id: 1, name: '我的订单', icon: '📦' },
  { id: 2, name: '在线客服', icon: '💬' },
  { id: 3, name: '意见反馈', icon: '📧' },
  { id: 4, name: '设置', icon: '⚙️' }
])

const handleAvatarClick = () => {
  if (!isLoggedIn.value) {
    uni.navigateTo({ url: '/pages/login/index' })
  }
}

const handleSetting = () => {
  uni.navigateTo({ url: '/pages/settings/index' })
}

const handleBell = () => {
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
    uni.navigateTo({ url: '/pages/footprint/index' })
  } else if (item.name === '卡券包') {
    uni.showToast({ title: '暂无优惠券', icon: 'none' })
  } else if (item.name === '回收站') {
    uni.navigateTo({ url: '/pages/recycle/index' })
  }
}

const handleToolClick = (tool: any) => {
  if (tool.name === '一键成请柬') {
    uni.navigateTo({ url: '/pages/editor/index' })
  } else if (tool.name === '婚礼文案') {
    uni.navigateTo({ url: '/pages/template/index' })
  } else if (tool.name === '婚礼MV') {
    uni.navigateTo({ url: '/pages/music/index' })
  } else if (tool.name === '收到的请柬') {
    uni.switchTab({ url: '/pages/works/index' })
  } else if (tool.name === '朋友圈图片') {
    uni.navigateTo({ url: '/pages/share/index' })
  } else if (tool.name === '迎宾海报') {
    uni.navigateTo({ url: '/pages/poster/index/index' })
  } else if (tool.name === '我的海报') {
    uni.navigateTo({ url: '/pages/poster/works/index' })
  } else if (tool.name === '一键出片') {
    uni.navigateTo({ url: '/pages/editor/index' })
  }
}

const handleMenuItemClick = (item: any) => {
  if (item.id === 1) {
    uni.navigateTo({ url: '/pages/mall/orders' })
  } else if (item.id === 2) {
    uni.openCustomerServiceConversation({})
  } else if (item.id === 3) {
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
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: 120rpx;
}

/* 顶部 mesh gradient：多色径向渐变叠加 */
.header-bg {
  height: 380rpx;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 12% 18%, rgba(255, 138, 190, 0.92) 0%, transparent 42%),
    radial-gradient(circle at 82% 12%, rgba(173, 122, 255, 0.55) 0%, transparent 48%),
    radial-gradient(circle at 72% 82%, rgba(255, 178, 120, 0.6) 0%, transparent 52%),
    radial-gradient(circle at 22% 88%, rgba(255, 110, 140, 0.7) 0%, transparent 52%),
    linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
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
}

.user-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a2e;
  display: block;
  margin-bottom: 8rpx;
}

.user-desc {
  font-size: 24rpx;
  color: #6e6e80;
}

.user-actions {
  display: flex;
  gap: 24rpx;
}

.action-icon {
  font-size: 40rpx;
  transition: transform 0.25s ease;

  &:active {
    transform: scale(0.88);
  }
}

/* VIP 卡片：精致金色渐变 + 内部高光 + 光泽扫过动画 */
.vip-card {
  position: relative;
  margin: 24rpx;
  padding: 28rpx 24rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  overflow: hidden;
  background: linear-gradient(135deg, #fce38a 0%, #f5af19 45%, #f12711 100%);
  box-shadow: 0 12rpx 32rpx rgba(241, 39, 17, 0.28);
  transition: transform 0.3s ease;

  &:active {
    transform: scale(0.98);
  }

  /* 内部顶部高光 */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 55%;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 100%);
    pointer-events: none;
  }

  /* 光泽扫过动画 */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -60%;
    width: 40%;
    height: 100%;
    background: linear-gradient(120deg, transparent 0%, rgba(255, 255, 255, 0.45) 50%, transparent 100%);
    transform: skewX(-20deg);
    animation: vipShimmer 3.6s ease-in-out infinite;
    pointer-events: none;
  }
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
}

.vip-desc {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
}

.vip-btn {
  position: relative;
  z-index: 1;
  background: #ffffff;
  padding: 12rpx 24rpx;
  border-radius: 24rpx;
  font-size: 24rpx;
  color: #e84a6e;
  font-weight: 600;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.12);
  transition: transform 0.25s ease;

  &:active {
    transform: scale(0.94);
  }
}

.quick-actions {
  background: #ffffff;
  margin: 0 24rpx;
  border-radius: 20rpx;
  padding: 28rpx 24rpx;
  display: flex;
  justify-content: space-around;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.04);
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.2s ease;

  &:active {
    transform: scale(0.92);
  }
}

/* 快捷操作图标：柔和阴影 + :active 微缩放 */
.quick-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
  font-size: 36rpx;
  box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.08);
}

.quick-name {
  font-size: 24rpx;
  color: #6e6e80;
}

.tools-section {
  background: #ffffff;
  margin: 24rpx;
  border-radius: 20rpx;
  padding: 28rpx 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.04);
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 24rpx;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 28rpx 24rpx;
}

.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.2s ease;

  &:active {
    transform: translateY(-4rpx) scale(0.96);
  }
}

/* 工具图标：背景渐变叠加（高光） + 悬浮阴影 */
.tool-icon {
  position: relative;
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14rpx;
  font-size: 40rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.08);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 45%, rgba(0, 0, 0, 0.05) 100%);
    pointer-events: none;
  }

  text {
    position: relative;
    z-index: 1;
  }
}

.tool-name {
  font-size: 24rpx;
  color: #6e6e80;
}

.menu-section {
  background: #ffffff;
  margin: 0 24rpx;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.04);
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 32rpx 28rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.04);
  transition: background 0.2s ease;

  &:last-child {
    border-bottom: none;
  }

  &:active {
    background: rgba(0, 0, 0, 0.03);
  }
}

.menu-icon {
  font-size: 36rpx;
  margin-right: 20rpx;
}

.menu-name {
  flex: 1;
  font-size: 28rpx;
  color: #1a1a2e;
  font-weight: 500;
}

.menu-arrow {
  font-size: 36rpx;
  color: #c8c8d0;
  transition: transform 0.2s ease;
}

.logout-section {
  padding: 24rpx;
}

/* 退出按钮：:active 反馈 */
.logout-btn {
  width: 100%;
  height: 92rpx;
  line-height: 92rpx;
  text-align: center;
  background: #ffffff;
  border-radius: 20rpx;
  font-size: 28rpx;
  color: #ef4444;
  font-weight: 500;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;

  &:active {
    transform: scale(0.98);
    background: #fef2f2;
  }
}

.footer {
  text-align: center;
  padding: 48rpx 0;
}

.copyright {
  font-size: 22rpx;
  color: #b8b8c4;
}
</style>
