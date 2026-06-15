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
          <text class="vip-title">婚贝VIP</text>
          <text class="vip-desc">开通会员享6大权益</text>
        </view>
      </view>
      <view class="vip-btn">立即开通 ></view>
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
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const { isLoggedIn, nickname } = storeToRefs(userStore)

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
  { id: 7, name: '收到的请柬', icon: '💌', bgColor: '#fff9c4' }
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
  uni.showToast({ title: '设置', icon: 'none' })
}

const handleBell = () => {
  uni.showToast({ title: '通知', icon: 'none' })
}

const handleVip = () => {
  uni.showToast({ title: '开通VIP', icon: 'none' })
}

const handleQuickAction = (item: any) => {
  if (item.name === '收藏') {
    uni.switchTab({ url: '/pages/works/index' })
  } else {
    uni.showToast({ title: item.name, icon: 'none' })
  }
}

const handleToolClick = (tool: any) => {
  if (tool.name === '一键成请柬') {
    uni.navigateTo({ url: '/pages/editor/index' })
  } else {
    uni.showToast({ title: tool.name, icon: 'none' })
  }
}

const handleMenuItemClick = (item: any) => {
  uni.showToast({ title: item.name, icon: 'none' })
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
  background: #f5f5f5;
  padding-bottom: 120rpx;
}

.header-bg {
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  height: 320rpx;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}

.user-section {
  padding: 0 24rpx;
  position: relative;
  z-index: 1;
}

.user-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-top: 120rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  background: linear-gradient(135deg, #ffe4e8 0%, #ffcdd2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}

.avatar-icon {
  font-size: 56rpx;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
  display: block;
  margin-bottom: 8rpx;
}

.user-desc {
  font-size: 24rpx;
  color: #999999;
}

.user-actions {
  display: flex;
  gap: 24rpx;
}

.action-icon {
  font-size: 40rpx;
}

.vip-card {
  margin: 24rpx;
  background: linear-gradient(135deg, #ffd93d 0%, #ff9500 100%);
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.vip-content {
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
  color: rgba(255, 255, 255, 0.8);
}

.vip-btn {
  background: #ffffff;
  padding: 12rpx 24rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: #e84a6e;
  font-weight: 500;
}

.quick-actions {
  background: #ffffff;
  margin: 0 24rpx;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  justify-content: space-around;
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.quick-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
  font-size: 32rpx;
}

.quick-name {
  font-size: 24rpx;
  color: #666666;
}

.tools-section {
  background: #ffffff;
  margin: 24rpx;
  border-radius: 16rpx;
  padding: 24rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333333;
  margin-bottom: 24rpx;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24rpx;
}

.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tool-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
  font-size: 36rpx;
}

.tool-name {
  font-size: 24rpx;
  color: #666666;
}

.menu-section {
  background: #ffffff;
  margin: 0 24rpx;
  border-radius: 16rpx;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 28rpx 24rpx;
  border-bottom: 2rpx solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
}

.menu-icon {
  font-size: 36rpx;
  margin-right: 20rpx;
}

.menu-name {
  flex: 1;
  font-size: 28rpx;
  color: #333333;
}

.menu-arrow {
  font-size: 32rpx;
  color: #cccccc;
}

.logout-section {
  padding: 24rpx;
}

.logout-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  background: #fff;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: #ef4444;
  font-weight: 500;
}

.footer {
  text-align: center;
  padding: 48rpx 0;
}

.copyright {
  font-size: 22rpx;
  color: #cccccc;
}
</style>
