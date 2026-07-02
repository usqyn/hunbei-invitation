<template>
  <view class="cart-page">
    <view class="cart-header">
      <view class="cart-header-title">购物车</view>
    </view>

    <view class="empty-cart" v-if="cartItems.length === 0">
      <view class="empty-icon">🛒</view>
      <view class="empty-text">购物车是空的</view>
      <view class="go-shop-btn" @click="goShop">去逛逛</view>
    </view>

    <view class="cart-list" v-if="cartItems.length > 0">
      <view class="cart-item" v-for="item in cartItems" :key="item.id">
        <view class="item-check" @click="toggleSelect(item.id)">
          <view class="check-box" :class="{ checked: item.selected }">✓</view>
        </view>
        <image class="item-img" :src="item.image" mode="aspectFill" />
        <view class="item-info">
          <view class="item-name">{{ item.name }}</view>
          <view class="item-spec" v-if="item.spec">{{ item.spec }}</view>
          <view class="item-price-row">
            <view class="item-price">
              <text class="price-symbol">¥</text>
              <text class="price-num">{{ item.price }}</text>
            </view>
            <view class="item-qty">
              <view class="qty-btn" @click="decreaseQty(item.id)">-</view>
              <view class="qty-num">{{ item.quantity }}</view>
              <view class="qty-btn" @click="increaseQty(item.id)">+</view>
            </view>
          </view>
        </view>
        <view class="item-delete" @click="removeItem(item.id)">✕</view>
      </view>
    </view>

    <view class="cart-footer" v-if="cartItems.length > 0">
      <view class="footer-left">
        <view class="all-check" @click="toggleAllSelect">
          <view class="check-box" :class="{ checked: allSelected }">✓</view>
          <text>全选</text>
        </view>
      </view>
      <view class="footer-right">
        <view class="total-price">
          <text>合计:</text>
          <text class="price-symbol">¥</text>
          <text class="price-num">{{ totalPrice }}</text>
        </view>
        <view class="checkout-btn" :class="{ disabled: selectedCount === 0 }" @click="goCheckout">
          结算({{ selectedCount }})
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'

interface CartItem {
  id: number
  name: string
  spec?: string
  image: string
  price: string
  quantity: number
  selected: boolean
}

const cartItems = ref<CartItem[]>([])
const allSelected = ref(false)
const selectedCount = ref(0)
const totalPrice = ref('0.00')

const loadCart = () => {
  try {
    const cart = uni.getStorageSync('mall_cart') || []
    cartItems.value = cart
    calculateTotal()
  } catch (e) {
    cartItems.value = []
    selectedCount.value = 0
    totalPrice.value = '0.00'
  }
}

const saveCart = () => {
  try {
    uni.setStorageSync('mall_cart', cartItems.value)
    calculateTotal()
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

const calculateTotal = () => {
  let total = 0
  let count = 0
  let allSel = cartItems.value.length > 0

  cartItems.value.forEach(item => {
    if (item.selected) {
      total += parseFloat(item.price) * item.quantity
      count += item.quantity
    } else {
      allSel = false
    }
  })

  totalPrice.value = total.toFixed(2)
  selectedCount.value = count
  allSelected.value = allSel
}

const toggleSelect = (id: number) => {
  const item = cartItems.value.find(i => i.id === id)
  if (item) {
    item.selected = !item.selected
    saveCart()
  }
}

const toggleAllSelect = () => {
  const newVal = !allSelected.value
  cartItems.value.forEach(item => { item.selected = newVal })
  allSelected.value = newVal
  saveCart()
}

const decreaseQty = (id: number) => {
  const item = cartItems.value.find(i => i.id === id)
  if (item && item.quantity > 1) {
    item.quantity -= 1
    saveCart()
  }
}

const increaseQty = (id: number) => {
  const item = cartItems.value.find(i => i.id === id)
  if (item) {
    item.quantity += 1
    saveCart()
  }
}

const removeItem = (id: number) => {
  uni.showModal({
    title: '提示',
    content: '确定删除该商品吗？',
    success: (res) => {
      if (res.confirm) {
        cartItems.value = cartItems.value.filter(item => item.id !== id)
        saveCart()
      }
    }
  })
}

const goShop = () => {
  uni.switchTab({ url: '/pages/mall/index' })
}

const goCheckout = () => {
  if (selectedCount.value === 0) {
    uni.showToast({ title: '请选择商品', icon: 'none' })
    return
  }
  try {
    const selectedItems = cartItems.value.filter(item => item.selected)
    uni.setStorageSync('mall_orderItems', selectedItems)
    uni.navigateTo({ url: '/pages/mall/order-confirm' })
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

onShow(() => {
  loadCart()
})
</script>

<style lang="scss" scoped>
.cart-page {
  min-height: 100vh;
  background: #F5F5F5;
  padding-bottom: 140rpx;
}

.cart-header {
  background: #fff;
  padding: 28rpx 30rpx;
}

.cart-header-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #333;
}

.empty-cart {
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
  margin-bottom: 40rpx;
}

.go-shop-btn {
  background: #e84a6e;
  color: #fff;
  padding: 20rpx 60rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
}

.cart-list { padding: 20rpx; }

.cart-item {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  position: relative;
}

.item-check { padding-right: 20rpx; }

.check-box {
  width: 40rpx;
  height: 40rpx;
  border: 2rpx solid #D0D5DD;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: transparent;
}

.check-box.checked {
  background: #e84a6e;
  border-color: #e84a6e;
  color: #fff;
}

.item-img {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  padding: 0 20rpx;
}

.item-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-spec {
  font-size: 22rpx;
  color: #999;
  margin-bottom: 16rpx;
}

.item-price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.item-price { display: flex; align-items: baseline; }

.item-price .price-symbol {
  font-size: 24rpx;
  font-weight: 700;
  color: #e84a6e;
}

.item-price .price-num {
  font-size: 36rpx;
  font-weight: 700;
  color: #e84a6e;
}

.item-qty {
  display: flex;
  align-items: center;
  background: #F5F5F5;
  border-radius: 8rpx;
}

.qty-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #666;
}

.qty-num {
  width: 60rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: 600;
}

.item-delete {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #999;
}

.cart-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 20rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.footer-left { display: flex; align-items: center; }

.all-check {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 26rpx;
  color: #333;
}

.footer-right {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.total-price {
  display: flex;
  align-items: baseline;
  font-size: 26rpx;
  color: #333;
}

.total-price .price-symbol {
  font-size: 24rpx;
  font-weight: 700;
  color: #e84a6e;
}

.total-price .price-num {
  font-size: 40rpx;
  font-weight: 700;
  color: #e84a6e;
}

.checkout-btn {
  background: #e84a6e;
  color: #fff;
  padding: 20rpx 40rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.checkout-btn.disabled { background: #ccc; }
</style>
