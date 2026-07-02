<template>
  <view class="orders-page">
    <view class="status-tabs">
      <view
        class="status-tab"
        :class="{ active: activeStatus === status }"
        v-for="(label, status) in statusMap"
        :key="status"
        @click="switchStatus(status)"
      >
        {{ label }}
      </view>
    </view>

    <view class="empty-orders" v-if="filteredOrders.length === 0">
      <view class="empty-icon">📋</view>
      <view class="empty-text">暂无订单</view>
    </view>

    <view class="order-list">
      <view class="order-card" v-for="order in filteredOrders" :key="order.orderNo">
        <view class="order-header">
          <view class="order-no">订单编号: {{ order.orderNo }}</view>
          <view class="order-status" :class="'status-' + order.status">{{ statusMap[order.status] || order.status }}</view>
        </view>

        <view class="order-goods">
          <view class="goods-item" v-for="goods in order.items" :key="goods.id">
            <image class="goods-img" :src="goods.image" mode="aspectFill" />
            <view class="goods-info">
              <view class="goods-name">{{ goods.name }}</view>
              <view class="goods-price-row">
                <view class="goods-price">¥{{ goods.price }}</view>
                <view class="goods-qty">x{{ goods.quantity }}</view>
              </view>
            </view>
          </view>
        </view>

        <view class="order-footer">
          <view class="order-total">
            共 {{ totalCount(order) }} 件
            <text class="total-amount">订单总额: ¥{{ order.totalAmount }}</text>
          </view>
          <view class="order-actions">
            <view class="action-btn" v-if="order.status === 'pending'" @click="payOrder(order)">立即支付</view>
            <view class="action-btn secondary" @click="viewDetail(order)">查看详情</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'

interface Order {
  orderNo: string
  items: Array<{ id: number; name: string; image: string; price: string; quantity: number }>
  totalAmount: string
  status: string
  createTime: string
}

const statusMap: Record<string, string> = {
  all: '全部',
  pending: '待付款',
  paid: '已付款',
  shipped: '已发货',
  completed: '已完成'
}

const orders = ref<Order[]>([])
const activeStatus = ref('all')

const filteredOrders = computed(() => {
  if (activeStatus.value === 'all') return orders.value
  return orders.value.filter(order => order.status === activeStatus.value)
})

const totalCount = (order: Order) => {
  return order.items.reduce((sum, item) => sum + item.quantity, 0)
}

const loadOrders = () => {
  try {
    const savedOrders = uni.getStorageSync('mall_orders') || []
    orders.value = savedOrders.sort((a: Order, b: Order) => {
      return (b.createTime || '').localeCompare(a.createTime || '')
    })
  } catch (e) {
    orders.value = []
  }
}

const switchStatus = (status: string) => {
  activeStatus.value = status
}

const payOrder = (order: Order) => {
  uni.showModal({
    title: '提示',
    content: `确认支付 ¥${order.totalAmount}？`,
    success: (res) => {
      if (res.confirm) {
        const allOrders = uni.getStorageSync('mall_orders') || []
        const idx = allOrders.findIndex((o: Order) => o.orderNo === order.orderNo)
        if (idx === -1) {
          uni.showToast({ title: '订单数据异常', icon: 'none' })
          return
        }
        allOrders[idx].status = 'paid'
        uni.setStorageSync('mall_orders', allOrders)
        // 同步本地 reactive 状态
        order.status = 'paid'
        uni.redirectTo({ url: `/pages/mall/pay-result?orderNo=${order.orderNo}&amount=${order.totalAmount}&status=success` })
      }
    }
  })
}

const viewDetail = (order: Order) => {
  uni.showModal({
    title: '订单详情',
    content: `订单号: ${order.orderNo}\n金额: ¥${order.totalAmount}\n状态: ${statusMap[order.status] || order.status}`,
    showCancel: false
  })
}

onShow(() => {
  loadOrders()
})
</script>

<style lang="scss" scoped>
.orders-page {
  min-height: 100vh;
  background: #F5F5F5;
  padding-bottom: 40rpx;
}

.status-tabs {
  display: flex;
  background: #fff;
  padding: 0 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.status-tab {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  font-size: 26rpx;
  color: #666;
  position: relative;
}

.status-tab.active {
  color: #e84a6e;
  font-weight: 600;
}

.status-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40rpx;
  height: 4rpx;
  background: #e84a6e;
  border-radius: 2rpx;
}

.empty-orders {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 30rpx;
  opacity: 0.5;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.order-list { padding: 20rpx; }

.order-card {
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.order-no {
  font-size: 24rpx;
  color: #666;
}

.order-status { font-size: 24rpx; font-weight: 600; }

.status-pending { color: #FF9800; }
.status-paid { color: #2196F3; }
.status-shipped { color: #4CAF50; }
.status-completed { color: #999; }

.order-goods { padding: 20rpx; }

.order-goods .goods-item {
  display: flex;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.order-goods .goods-item:last-child { border-bottom: none; }

.order-goods .goods-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
}

.order-goods .goods-info {
  flex: 1;
  padding-left: 20rpx;
}

.order-goods .goods-name {
  font-size: 26rpx;
  color: #333;
  margin-bottom: 16rpx;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.order-goods .goods-price-row {
  display: flex;
  justify-content: space-between;
}

.order-goods .goods-price {
  font-size: 26rpx;
  color: #e84a6e;
}

.order-goods .goods-qty {
  font-size: 24rpx;
  color: #999;
}

.order-footer {
  padding: 20rpx;
  border-top: 1rpx solid #f0f0f0;
}

.order-total {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 16rpx;
}

.total-amount {
  color: #e84a6e;
  font-weight: 600;
  margin-left: 20rpx;
}

.order-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
}

.action-btn {
  padding: 12rpx 30rpx;
  border-radius: 30rpx;
  font-size: 24rpx;
  background: #e84a6e;
  color: #fff;
}

.action-btn.secondary {
  background: #fff;
  color: #e84a6e;
  border: 1rpx solid #e84a6e;
}
</style>
