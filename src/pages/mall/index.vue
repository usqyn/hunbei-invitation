<template>
  <view class="mall-page">
    <view class="mall-header">
      <view class="header-row">
        <view class="header-left">
          <view class="mall-title">婚礼商城</view>
          <view class="mall-subtitle">一站式婚礼采购 · 品质保障</view>
        </view>
        <view class="header-right">
          <view class="cart-icon-wrap" @click="goCart">
            <text class="cart-icon">🛒</text>
            <view class="cart-badge" v-if="cartCount > 0">{{ cartCount }}</view>
          </view>
        </view>
      </view>
    </view>

    <scroll-view class="category-bar" scroll-x>
      <view class="category-list">
        <view
          class="category-item"
          :class="{ active: activeCategory === index }"
          v-for="(item, index) in categories"
          :key="index"
          @click="switchCategory(index)"
        >
          {{ item }}
        </view>
      </view>
    </scroll-view>

    <view class="mall-content">
    <view class="product-grid">
      <view class="product-card" v-for="item in filteredProducts" :key="item.id">
        <view class="product-img-wrap" @click="viewDetail(item)">
          <image class="product-img" :src="item.image" mode="aspectFill" />
          <view class="product-badge" v-if="item.badge">{{ item.badge }}</view>
          <view class="product-promo" v-if="item.promo">{{ item.promo }}</view>
        </view>
        <view class="product-info">
          <view class="product-slogan" v-if="item.slogan">{{ item.slogan }}</view>
          <view class="product-name">{{ item.name }}</view>
          <view class="product-spec" v-if="item.spec">{{ item.spec }}</view>
          <view class="product-tags" v-if="item.tags">
            <text class="product-tag" v-for="(tag, tagIndex) in item.tags" :key="tagIndex">{{ tag }}</text>
          </view>
          <view class="product-price-row">
            <view class="product-price">
              <text class="price-symbol">¥</text>
              <text class="price-num">{{ item.price }}</text>
              <text class="price-original" v-if="item.originalPrice">¥{{ item.originalPrice }}</text>
            </view>
            <view class="product-cart" @click.stop="addToCart(item)">
              <text class="cart-icon">+</text>
            </view>
          </view>
        </view>
      </view>
    </view>
    </view>

    <view class="mall-footer" v-if="cartCount > 0">
      <view class="footer-cart" @click="goCart">
        <view class="footer-cart-icon">
          <text>🛒</text>
          <view class="footer-cart-badge">{{ cartCount }}</view>
        </view>
        <view class="footer-cart-total">
          <text>合计: </text>
          <text class="total-price">¥{{ cartTotal }}</text>
        </view>
      </view>
      <view class="footer-checkout" @click.stop="goCheckout">去结算</view>
    </view>

    <view class="modal-overlay" v-if="showDetail" @click="closeDetail">
      <view class="detail-modal" @click.stop>
        <view class="detail-close" @click="closeDetail">✕</view>
        <image class="detail-img" :src="detailProduct.image" mode="aspectFill" />
        <view class="detail-body">
          <view class="detail-badge" v-if="detailProduct.badge">{{ detailProduct.badge }}</view>
          <view class="detail-name">{{ detailProduct.name }}</view>
          <view class="detail-slogan" v-if="detailProduct.slogan">{{ detailProduct.slogan }}</view>
          <view class="detail-spec" v-if="detailProduct.spec">{{ detailProduct.spec }}</view>
          <view class="detail-tags" v-if="detailProduct.tags">
            <text class="detail-tag" v-for="(tag, tagIndex) in detailProduct.tags" :key="tagIndex">{{ tag }}</text>
          </view>
          <view class="detail-desc" v-if="detailProduct.detail">{{ detailProduct.detail }}</view>
          <view class="detail-price-row">
            <view class="detail-price">
              <text class="price-symbol">¥</text>
              <text class="price-num">{{ detailProduct.price }}</text>
              <text class="price-original" v-if="detailProduct.originalPrice">¥{{ detailProduct.originalPrice }}</text>
            </view>
          </view>
          <view class="detail-actions">
            <view class="detail-btn cart" @click="detailAddToCart">加入购物车</view>
            <view class="detail-btn buy" @click="buyNow">立即购买</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'

interface Product {
  id: number
  name: string
  slogan?: string
  spec?: string
  image: string
  badge?: string
  promo?: string
  price: string
  originalPrice?: string
  tags?: string[]
  category: number
  detail?: string
}

const categories = ['全部', '婚礼饰品', '气球装饰', '请柬设计', '婚礼策划', '摄影跟拍']

const products: Product[] = [
  {
    id: 1, name: '哈萨克风格耳环', slogan: '【手工刺绣】', spec: '纯银耳钩+哈萨克刺绣',
    image: '/static/images/categories/earring.jpg', badge: '爆款', promo: '限时包邮', price: '188', originalPrice: '268',
    tags: ['手工制作', '哈萨克风'], category: 1,
    detail: '采用传统哈萨克刺绣工艺，纯银耳钩搭配手工刺绣图案，每对都是独一无二的艺术品。适合婚礼佩戴或作为伴娘礼物，彰显浓郁民族风情。'
  },
  {
    id: 2, name: '哈萨克风格气球套装', slogan: '【婚礼装饰必备】', spec: '含30个气球+装饰配件',
    image: '/static/images/categories/wedding.jpg', badge: '热销', promo: '买2送1', price: '168', originalPrice: '228',
    tags: ['气球装饰', '哈萨克风'], category: 2,
    detail: '哈萨克风格婚礼气球套装，包含30个定制印花气球（哈萨克纹样）、金色流苏、背景挂饰等全套配件。蓝色与金色配色，打造浓郁哈萨克婚礼氛围。'
  },
  {
    id: 3, name: '定制电子请柬', slogan: '【H5互动式】', spec: '在线制作+宾客回执',
    image: '/static/images/mall/banner3.png', badge: '新品', promo: '免费修改3次', price: '99', originalPrice: '199',
    tags: ['电子请柬', '个性定制'], category: 3,
    detail: '婚纱照定制H5电子请柬，支持音乐、相册、地图导航、宾客回执功能。提供哈萨克风格模板可选，一键分享至微信朋友圈。'
  },
  {
    id: 4, name: '婚礼策划全包套餐', slogan: '【一站式服务】', spec: '场地+布置+主持+摄影',
    image: '/static/images/categories/ceremony.jpg', badge: '推荐', promo: '赠新娘造型', price: '16800', originalPrice: '21800',
    tags: ['全包', '省心省力'], category: 4,
    detail: '婚礼策划全包服务，含场地布置、婚礼主持、摄影摄像、化妆造型、婚车租赁。专业策划团队全程跟进，可根据需求定制哈萨克传统婚礼流程。'
  },
  {
    id: 5, name: '婚礼跟拍服务', slogan: '【双机位高清】', spec: '全天跟拍+精修150张',
    image: '/static/images/mall/banner1.jpg', badge: '', promo: '赠30秒短视频', price: '2680', originalPrice: '3680',
    tags: ['双机位', '精修'], category: 5,
    detail: '专业婚礼跟拍服务，双机位全程记录。包含全天跟拍、150张精修照片、全部底片赠送，另赠30秒婚礼精彩短视频，留下最珍贵的回忆。'
  },
  {
    id: 6, name: '婚车装饰定制', slogan: '【哈萨克风格】', spec: '头车鲜花+车队拉花',
    image: '/static/images/mall/banner2.jpg', badge: '', promo: '赠手捧花', price: '888', originalPrice: '1288',
    tags: ['婚车装饰', '鲜花'], category: 2,
    detail: '哈萨克风格婚车装饰，主婚车采用鲜花与民族纹样搭配，车队配哈萨克风格拉花。配色可选蓝金/红金/白绿，赠新娘手捧花一束。'
  },
  {
    id: 7, name: '新娘手捧花定制', slogan: '【永生花/鲜花可选】', spec: '哈萨克风格花束',
    image: '/static/images/mall/banner2.jpg', badge: '精选', promo: '送新郎胸花', price: '398', originalPrice: '',
    tags: ['手捧花', '定制'], category: 1,
    detail: '新娘手捧花定制，可选的鲜花或永生花。融入哈萨克传统纹样与配色元素，搭配民族特色丝带。每束均赠送新郎胸花一朵。'
  },
  {
    id: 8, name: '哈萨克风格婚礼蛋糕', slogan: '【三层定制】', spec: '翻糖蛋糕+民族纹样',
    image: '/static/images/categories/birthday.svg', badge: '精品', promo: '含顶层装饰', price: '1280', originalPrice: '1680',
    tags: ['定制蛋糕', '翻糖'], category: 4,
    detail: '三层翻糖婚礼蛋糕，融合哈萨克传统纹样与金色装饰。口味可选奶油/巧克力/水果夹层，顶部可定制新人公仔，是婚礼现场的视觉焦点。'
  },
  {
    id: 9, name: '伴手礼定制套装', slogan: '【回礼首选】', spec: '50份起订',
    image: '/static/images/mall/banner3.png', badge: '', promo: '免费设计包装', price: '68', originalPrice: '',
    tags: ['伴手礼', '定制'], category: 4,
    detail: '婚礼伴手礼定制，含哈萨克风格定制礼盒、手工香皂、蜜饯糖果、感谢卡。每份独立包装，50份起订，可根据预算调整内容搭配。'
  },
  {
    id: 10, name: '气球拱门定制', slogan: '【婚礼入口】', spec: '跨度3米+鲜花点缀',
    image: '/static/images/mall/banner1.jpg', badge: '热销', promo: '赠花瓣路引', price: '688', originalPrice: '888',
    tags: ['气球拱门', '布置'], category: 2,
    detail: '婚礼气球拱门定制，跨度3米，采用进口珠光气球，搭配鲜花和绿植点缀。哈萨克风格配色可选，赠送花瓣路引布置，打造浪漫入场通道。'
  },
  {
    id: 11, name: '请柬打印服务', slogan: '【烫金工艺】', spec: '100张起印',
    image: '/static/images/mall/banner2.jpg', badge: '', promo: '赠信封+封口贴', price: '299', originalPrice: '399',
    tags: ['纸质请柬', '烫金'], category: 3,
    detail: '纸质婚礼请柬打印服务，采用烫金工艺，300g卡纸对折。哈萨克风格模板可选，支持自定义文案。100张起印，赠配套信封和封口贴。'
  },
  {
    id: 12, name: '新娘化妆造型', slogan: '【哈萨克新娘妆】', spec: '试妆+全天跟妆',
    image: '/static/images/mall/banner1.jpg', badge: '', promo: '赠妈妈妆', price: '1680', originalPrice: '2280',
    tags: ['新娘妆', '跟妆'], category: 4,
    detail: '哈萨克新娘妆造型服务，含婚前试妆、婚礼当天全天跟妆。擅长哈萨克传统新娘妆及现代轻奢妆，赠送妈妈妆和伴娘妆各一份。'
  },
  {
    id: 13, name: '婚礼摄影套餐', slogan: '【精修+相册】', spec: '双机位+12寸相册',
    image: '/static/images/mall/banner3.png', badge: '推荐', promo: '赠摆台2个', price: '3980', originalPrice: '4980',
    tags: ['摄影', '相册'], category: 5,
    detail: '婚礼摄影套餐，双机位全程拍摄，含200张精修照片、12寸水晶相册一本、全部底片。赠送10寸摆台2个，记录婚礼每个动人瞬间。'
  },
  {
    id: 14, name: '婚礼甜品台', slogan: '【精致摆台】', spec: '50人份甜品+茶饮',
    image: '/static/images/categories/festival-invitation.jpg', badge: '新品', promo: '赠桌卡装饰', price: '1280', originalPrice: '',
    tags: ['甜品台', '精致'], category: 4,
    detail: '婚礼甜品台布置，含定制杯子蛋糕、马卡龙、水果塔、饮品等50人份量。哈萨克风格摆台设计，搭配鲜花与民族元素装饰，增添婚礼精致感。'
  }
]

const activeCategory = ref(0)
const searchText = ref('')
const showDetail = ref(false)
const detailProduct = ref<Product | null>(null)
const cartCount = ref(0)
const cartTotal = ref('0.00')

const filteredProducts = computed(() => {
  if (activeCategory.value === 0) return products
  return products.filter(p => p.category === activeCategory.value)
})

const updateCartInfo = () => {
  try {
    const cart = uni.getStorageSync('mall_cart') || []
    let count = 0
    let total = 0
    cart.forEach((item: any) => {
      count += item.quantity
      total += parseFloat(item.price) * item.quantity
    })
    cartCount.value = count
    cartTotal.value = total.toFixed(2)
  } catch (e) {
    cartCount.value = 0
    cartTotal.value = '0.00'
  }
}

const switchCategory = (index: number) => {
  activeCategory.value = index
}

const viewDetail = (item: Product) => {
  detailProduct.value = item
  showDetail.value = true
}

const closeDetail = () => {
  showDetail.value = false
  detailProduct.value = null
}

const addToCart = (product: Product) => {
  try {
    const cart = uni.getStorageSync('mall_cart') || []
    const existIndex = cart.findIndex((item: any) => item.id === product.id)
    if (existIndex > -1) {
      cart[existIndex].quantity += 1
    } else {
      cart.push({ ...product, quantity: 1, selected: true })
    }
    uni.setStorageSync('mall_cart', cart)
    updateCartInfo()
    uni.showToast({ title: '已加入购物车', icon: 'success' })
  } catch (err) {
    uni.showToast({ title: '加入失败', icon: 'none' })
  }
}

const detailAddToCart = () => {
  if (!detailProduct.value) return
  addToCart(detailProduct.value)
}

const buyNow = () => {
  const product = detailProduct.value
  if (!product) return
  uni.setStorageSync('mall_orderItems', [{ ...product, quantity: 1 }])
  uni.navigateTo({ url: '/pages/mall/order-confirm' })
}

const goCart = () => {
  uni.navigateTo({ url: '/pages/mall/cart' })
}

const goCheckout = () => {
  try {
    const cart = uni.getStorageSync('mall_cart') || []
    const selectedItems = cart.filter((item: any) => item.selected)
    if (selectedItems.length === 0) {
      uni.showToast({ title: '请选择商品', icon: 'none' })
      return
    }
    uni.setStorageSync('mall_orderItems', selectedItems)
    uni.navigateTo({ url: '/pages/mall/order-confirm' })
  } catch (err) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

onShow(() => {
  updateCartInfo()
})
</script>

<style lang="scss" scoped>
.mall-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #F5F5F5;
}

.mall-content {
  flex: 1;
  padding-bottom: 120rpx;
}

.mall-header {
  background: #fff;
  padding: 28rpx 30rpx 24rpx;
  margin-bottom: 2rpx;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left { flex: 1; }

.header-right { padding-left: 20rpx; }

.mall-title {
  font-size: 36rpx;
  font-weight: 900;
  color: #e84a6e;
  margin: 16rpx 0 8rpx;
}

.mall-subtitle {
  font-size: 24rpx;
  color: #667085;
}

.cart-icon-wrap {
  position: relative;
  width: 80rpx;
  height: 80rpx;
  background: #fce4ec;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cart-icon-wrap .cart-icon { font-size: 36rpx; }

.cart-badge {
  position: absolute;
  top: -4rpx;
  right: -4rpx;
  min-width: 32rpx;
  height: 32rpx;
  background: #e84a6e;
  color: #fff;
  font-size: 20rpx;
  font-weight: 600;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
}

.category-bar {
  background: #fff;
  white-space: nowrap;
  padding: 0 30rpx;
  margin-bottom: 2rpx;
}

.category-list {
  display: inline-flex;
  gap: 0;
}

.category-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx 32rpx;
  font-size: 28rpx;
  color: #667085;
  position: relative;
  white-space: nowrap;
}

.category-item.active {
  color: #e84a6e;
  font-weight: 700;
}

.category-item.active::after {
  content: '';
  position: absolute;
  bottom: 8rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 6rpx;
  border-radius: 3rpx;
  background: #e84a6e;
}

.product-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  padding: 16rpx;
}

.product-card {
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 28rpx rgba(232, 74, 110, 0.07);
}

.product-img-wrap {
  position: relative;
  width: 100%;
  height: 260rpx;
  overflow: hidden;
  background: #F5F5F5;
}

.product-img { width: 100%; height: 100%; }

.product-badge {
  position: absolute;
  top: 0;
  left: 0;
  background: #e84a6e;
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
  padding: 6rpx 16rpx;
  border-radius: 0 0 16rpx 0;
  z-index: 2;
}

.product-promo {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(90deg, #e84a6e, #f06292);
  color: #fff;
  font-size: 20rpx;
  font-weight: 600;
  text-align: center;
  padding: 8rpx 0;
  z-index: 2;
}

.product-info { padding: 20rpx; }

.product-slogan {
  font-size: 26rpx;
  font-weight: 700;
  color: #e84a6e;
  line-height: 1.4;
  margin-bottom: 8rpx;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-name {
  font-size: 24rpx;
  color: #333;
  line-height: 1.4;
  margin-bottom: 6rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-spec {
  font-size: 22rpx;
  color: #999;
  margin-bottom: 10rpx;
}

.product-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.product-tag {
  display: inline-flex;
  background: #fce4ec;
  color: #e84a6e;
  border-radius: 8rpx;
  padding: 4rpx 14rpx;
  font-size: 20rpx;
}

.product-price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.product-price {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
}

.price-symbol {
  font-size: 24rpx;
  font-weight: 700;
  color: #e84a6e;
}

.price-num {
  font-size: 36rpx;
  font-weight: 700;
  color: #e84a6e;
  line-height: 1;
}

.price-original {
  font-size: 22rpx;
  color: #999;
  text-decoration: line-through;
  margin-left: 8rpx;
}

.product-cart {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #e84a6e, #f06292);
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-cart .cart-icon {
  font-size: 32rpx;
  color: #fff;
  font-weight: 700;
}

.mall-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  margin: 0 20rpx;
  margin-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-radius: 50rpx;
  padding: 16rpx 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.footer-cart {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
}

.footer-cart-icon {
  position: relative;
  width: 80rpx;
  height: 80rpx;
  background: #e84a6e;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: -30rpx;
}

.footer-cart-icon text { font-size: 36rpx; }

.footer-cart-badge {
  position: absolute;
  top: -4rpx;
  right: -4rpx;
  min-width: 32rpx;
  height: 32rpx;
  background: #fff;
  color: #e84a6e;
  font-size: 20rpx;
  font-weight: 700;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
}

.footer-cart-total {
  font-size: 26rpx;
  color: #333;
}

.footer-cart-total .total-price {
  font-size: 32rpx;
  font-weight: 700;
  color: #e84a6e;
}

.footer-checkout {
  background: linear-gradient(135deg, #e84a6e, #f06292);
  color: #fff;
  padding: 20rpx 40rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.detail-modal {
  width: 100%;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
  padding-bottom: env(safe-area-inset-bottom);
}

.detail-close {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  width: 60rpx;
  height: 60rpx;
  background: rgba(0,0,0,0.5);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  z-index: 10;
}

.detail-img {
  width: 100%;
  height: 400rpx;
  background: #F5F5F5;
}

.detail-body { padding: 30rpx; }

.detail-badge {
  display: inline-block;
  background: #e84a6e;
  color: #fff;
  font-size: 22rpx;
  font-weight: 700;
  padding: 6rpx 20rpx;
  border-radius: 6rpx;
  margin-bottom: 16rpx;
}

.detail-name {
  font-size: 36rpx;
  font-weight: 900;
  color: #e84a6e;
  margin-bottom: 8rpx;
}

.detail-slogan {
  font-size: 28rpx;
  font-weight: 700;
  color: #e84a6e;
  margin-bottom: 12rpx;
}

.detail-spec {
  font-size: 26rpx;
  color: #667085;
  margin-bottom: 16rpx;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 20rpx;
}

.detail-tag {
  background: #fce4ec;
  color: #e84a6e;
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
}

.detail-desc {
  font-size: 26rpx;
  color: #344054;
  line-height: 1.7;
  margin-bottom: 24rpx;
  padding: 20rpx;
  background: #F9FAFB;
  border-radius: 12rpx;
}

.detail-price-row { margin-bottom: 24rpx; }

.detail-price {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
}

.detail-price .price-symbol {
  font-size: 28rpx;
  font-weight: 700;
  color: #e84a6e;
}

.detail-price .price-num {
  font-size: 48rpx;
  font-weight: 900;
  color: #e84a6e;
}

.detail-price .price-original {
  font-size: 26rpx;
  color: #999;
  text-decoration: line-through;
  margin-left: 12rpx;
}

.detail-actions {
  display: flex;
  gap: 20rpx;
}

.detail-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 700;
}

.detail-btn.cart {
  background: #F5F5F5;
  color: #e84a6e;
  border: 2rpx solid #e84a6e;
}

.detail-btn.buy {
  background: linear-gradient(135deg, #e84a6e, #f06292);
  color: #fff;
}
</style>
