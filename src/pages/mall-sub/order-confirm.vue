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

    <view class="address-section">
      <view class="section-title">收货地址</view>
      <view class="address-form">
        <view class="addr-row">
          <text class="addr-label">姓名</text>
          <input class="addr-input" v-model="address.name" placeholder="请输入收货人姓名" maxlength="20" :class="{ 'rtl-input': nameRtl.isRtl.value }" />
        </view>
        <view class="addr-row">
          <text class="addr-label">手机号</text>
          <input class="addr-input" v-model="address.phone" type="number" placeholder="请输入手机号" maxlength="11" />
        </view>
        <view class="addr-row addr-row--top">
          <text class="addr-label">详细地址</text>
          <textarea class="addr-textarea" v-model="address.detail" placeholder="请输入省市区及详细收货地址" maxlength="200" :class="{ 'rtl-input': addressRtl.isRtl.value }" />
        </view>
      </view>
    </view>

    <view class="remark-section">
      <view class="section-title">订单备注</view>
      <textarea class="remark-input" placeholder="选填，请输入备注信息" v-model="remark" :class="{ 'rtl-input': noteRtl.isRtl.value }" />
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
      <view v-if="discount > 0" class="price-row discount-row">
        <text>VIP 9折优惠</text>
        <text class="discount-text">-¥{{ discount }}</text>
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
      <view class="submit-btn" :class="{ disabled: submitting }" :disabled="submitting" @click="submitOrder">提交订单</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { createOrder } from '@/api'
import { useUserStore } from '@/stores/user'
import { useRtl } from '@/composables/useRtl'

interface OrderItem {
  id: number
  name: string
  spec?: string
  image: string
  cover?: string
  price: string
  quantity: number
}

const orderItems = ref<OrderItem[]>([])
const remark = ref('')
const submitting = ref(false)
const userStore = useUserStore()

// 收货地址
const address = ref({ name: '', phone: '', detail: '' })

// 哈萨克语阿拉伯文 RTL 输入支持
const nameRtl = useRtl(() => address.value.name || '')
const addressRtl = useRtl(() => address.value.detail || '')
const noteRtl = useRtl(() => remark.value || '')

// 加载已保存的收货地址（复用上次填写）
function loadSavedAddress() {
  try {
    const saved = uni.getStorageSync('mall_shipping_address')
    if (saved && saved.name) {
      address.value = { name: saved.name || '', phone: saved.phone || '', detail: saved.detail || '' }
    }
  } catch (e) { /* ignore */ }
}

// 保存收货地址到本地（下次复用）
function saveAddress() {
  try {
    uni.setStorageSync('mall_shipping_address', { ...address.value })
  } catch (e) { /* ignore */ }
}

// 校验收货地址
function validateAddress(): boolean {
  if (!address.value.name.trim()) {
    uni.showToast({ title: '请填写收货人姓名', icon: 'none' })
    return false
  }
  if (!/^1[3-9]\d{9}$/.test(address.value.phone)) {
    uni.showToast({ title: '请填写正确的手机号', icon: 'none' })
    return false
  }
  if (address.value.detail.trim().length < 5) {
    uni.showToast({ title: '请填写完整收货地址', icon: 'none' })
    return false
  }
  return true
}
const goodsTotal = computed(() => {
  let total = 0
  orderItems.value.forEach(item => {
    total += parseFloat(item.price) * item.quantity
  })
  return total.toFixed(2)
})

const discount = computed(() => {
  if (userStore.isVip()) {
    return Math.floor(parseFloat(goodsTotal.value) * 0.1 * 100) / 100
  }
  return 0
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
  if (submitting.value) return
  submitting.value = true
  if (orderItems.value.length === 0) {
    submitting.value = false
    uni.showToast({ title: '订单商品为空', icon: 'none' })
    return
  }
  // 校验收货地址
  if (!validateAddress()) {
    submitting.value = false
    return
  }

  const orderData = {
    items: orderItems.value.map(item => ({
      productId: item.id,
      productName: item.name,
      quantity: item.quantity || 1,
      price: item.price,
      image: item.image || item.cover || '',
    })),
    totalAmount: String(orderTotal.value),
    goodsAmount: String(goodsTotal.value),
    freight: String(freight.value),
    discount: String(discount.value),
    status: 'pending',
    contactName: address.value.name,
    contactPhone: address.value.phone,
    address: address.value.detail,
    note: remark.value || '',
  }

  try {
    uni.showLoading({ title: '提交中...' })
    // 先尝试调API
    const res = await createOrder(orderData)

    // 同时存本地备份
    const localOrder = {
      orderNo: res.id || res.orderId || 'HB' + Date.now(),
      ...orderData,
      createTime: new Date().toISOString(),
    }
    const local = uni.getStorageSync('mall_orders') || []
    local.unshift(localOrder)
    uni.setStorageSync('mall_orders', local)

    // 保存收货地址供下次复用
    saveAddress()

    // 清空购物车
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

    uni.showToast({ title: '下单成功', icon: 'success' })
    setTimeout(() => {
      uni.redirectTo({ url: '/pages/mall-sub/orders' })
    }, 1500)
  } catch (e) {
    console.warn('createOrder API failed:', e)
    // API失败时仅保存到本地，明确提示用户
    const localOrder = {
      orderNo: 'HB' + Date.now(),
      ...orderData,
      createTime: new Date().toISOString(),
      _offline: true,  // 标记为离线订单
    }
    const local = uni.getStorageSync('mall_orders') || []
    local.unshift(localOrder)
    uni.setStorageSync('mall_orders', local)

    saveAddress()

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

    uni.showToast({ title: '订单已保存（离线），请稍后联系客服', icon: 'none', duration: 3000 })
    setTimeout(() => {
      uni.redirectTo({ url: '/pages/mall-sub/orders' })
    }, 2000)
  } finally {
    uni.hideLoading()
    submitting.value = false
  }
}

onShow(() => {
  loadOrderItems()
  loadSavedAddress()
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

.address-section {
  background: #fff;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.address-form {
  margin-top: 10rpx;
}

.addr-row {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.addr-row:last-child { border-bottom: none; }
.addr-row--top { align-items: flex-start; }

.addr-label {
  width: 160rpx;
  font-size: 28rpx;
  color: #333;
  flex-shrink: 0;
}

.addr-input {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

.addr-textarea {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  min-height: 80rpx;
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

.discount-row {
  color: #d4af37;
  font-weight: 500;
}

.discount-text {
  color: #d4af37;
  font-weight: 600;
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
