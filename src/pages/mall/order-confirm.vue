<template>
  <view class="order-confirm-page">
    <view class="goods-section">
      <view class="section-title">商品清单</view>
      <view class="goods-item" v-for="item in orderItems" :key="item.id">
        <image class="goods-img" :src="item.image" mode="aspectFill" />
        <view class="goods-info">
          <view class="goods-name">{{ item.name }}</view>
          <view class="goods-spec" v-if="item.spec">{{ item.spec }}</view>
          <view class="goods-price-row">
            <view class="goods-price">¥{{ item.price }}</view>
            <view class="goods-qty">x{{ item.quantity }}</view>
          </view>
        </view>
      </view>
    </view>

    <view class="remark-section">
      <view class="section-title">订单备注</view>
      <textarea class="remark-input" placeholder="选填，请输入备注信息" v-model="remark" />
    </view>

    <view class="price-section">
      <view class="price-row">
        <text>商品金额</text>
        <text>¥{{ goodsTotal }}</text>
      </view>
      <view class="price-row">
        <text>运费</text>
        <text>{{ freight > 0 ? '¥' + freight : '免运费' }}</text>
      </view>
      <view class="price-row total">
        <text>订单总额</text>
        <text class="total-price">¥{{ orderTotal }}</text>
      </view>
    </view>

    <view class="submit-footer">
      <view class="footer-price">
        <text>订单总额:</text>
        <text class="price-symbol">¥</text>
        <text class="price-num">{{ orderTotal }}</text>
      </view>
      <view class="submit-btn" @click="submitOrder">提交订单</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'

interface OrderItem {
  id: number
  name: string
  spec?: string
  image: string
  price: string
  quantity: number
}

const orderItems = ref<OrderItem[]>([])
const remark = ref('')
const discount = ref(0)

const goodsTotal = computed(() => {
  let total = 0
  orderItems.value.forEach(item => {
    total += parseFloat(item.price) * item.quantity
  })
  return total.toFixed(2)
})

const freight = computed(() => {
  return parseFloat(goodsTotal.value) >= 99 ? 0 : 10
})

const orderTotal = computed(() => {
  const total = parseFloat(goodsTotal.value) + freight.value - discount.value
  return total.toFixed(2)
})

const loadOrderItems = () => {
  try {
    const items = uni.getStorageSync('mall_orderItems') || []
    orderItems.value = items
  } catch (e) {
    orderItems.value = []
  }
}

const submitOrder = async () => {
  if (orderItems.value.length === 0) {
    uni.showToast({ title: '订单商品为空', icon: 'none' })
    return
  }

  try {
    uni.showLoading({ title: '提交中...' })

    const orderNo = 'HB' + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase()

    const order = {
      orderNo,
      items: orderItems.value,
      remark: remark.value,
      totalAmount: orderTotal.value,
      status: 'pending',
      createTime: new Date().toISOString()
    }

    const savedOrders = uni.getStorageSync('mall_orders') || []
    savedOrders.unshift(order)
    uni.setStorageSync('mall_orders', savedOrders)

    let cart = uni.getStorageSync('mall_cart') || []
    for (const ordered of orderItems.value) {
      const idx = cart.findIndex((c: any) => c.id === ordered.id)
      if (idx === -1) continue
      if (cart[idx].quantity <= ordered.quantity) {
        cart.splice(idx, 1)
      } else {
        cart[idx].quantity -= ordered.quantity
      }
    }
    uni.setStorageSync('mall_cart', cart)
    uni.removeStorageSync('mall_orderItems')

    uni.hideLoading()

    uni.showModal({
      title: '提示',
      content: `订单提交成功！订单号: ${orderNo}\n金额: ¥${orderTotal.value}`,
      showCancel: false,
      success: () => {
        uni.redirectTo({ url: '/pages/mall/orders' })
      }
    })
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: '提交失败', icon: 'none' })
  }
}

onShow(() => {
  loadOrderItems()
})
</script>

<style lang="scss" scoped>
.order-confirm-page {
  min-height: 100vh;
  background: #F5F5F5;
  padding-bottom: 140rpx;
}

.goods-section {
  background: #fff;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
}

.goods-item {
  display: flex;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.goods-item:last-child { border-bottom: none; }

.goods-img {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
}

.goods-info {
  flex: 1;
  padding-left: 20rpx;
}

.goods-name {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 8rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.goods-spec {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 16rpx;
}

.goods-price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.goods-price {
  font-size: 28rpx;
  font-weight: 600;
  color: #e84a6e;
}

.goods-qty {
  font-size: 26rpx;
  color: #999;
}

.remark-section {
  background: #fff;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.remark-input {
  width: 100%;
  height: 150rpx;
  font-size: 26rpx;
  padding: 20rpx;
  background: #F5F5F5;
  border-radius: 12rpx;
  box-sizing: border-box;
}

.price-section {
  background: #fff;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  font-size: 26rpx;
  color: #666;
}

.price-row.total {
  border-top: 1rpx solid #f0f0f0;
  padding-top: 20rpx;
  margin-top: 10rpx;
}

.total-price {
  font-size: 36rpx;
  font-weight: 700;
  color: #e84a6e;
}

.submit-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 20rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 30rpx;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.footer-price {
  display: flex;
  align-items: baseline;
  font-size: 26rpx;
  color: #333;
}

.footer-price .price-symbol {
  font-size: 24rpx;
  font-weight: 700;
  color: #e84a6e;
}

.footer-price .price-num {
  font-size: 40rpx;
  font-weight: 700;
  color: #e84a6e;
}

.submit-btn {
  background: #e84a6e;
  color: #fff;
  padding: 24rpx 60rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  font-weight: 600;
}
</style>
