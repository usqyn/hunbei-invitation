<template>
  <view class="share-page">
    <!-- 顶部标题栏 -->
    <view class="share-header">
      <view class="header-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="header-title">toy tamaxia</text>
      <view class="header-right"></view>
    </view>

    <!-- 分享设置卡片 -->
    <view class="share-card">
      <text class="share-hint">请设置微信分享标题、描述和封面</text>

      <!-- 标题输入 -->
      <view class="input-row">
        <input
          class="title-input"
          type="text"
          v-model="shareTitle"
          :maxlength="48"
          placeholder="请输入分享标题"
          placeholder-style="color:#cccccc"
          @input="onTitleInput"
        />
        <text class="input-count">{{ shareTitle.length }}/48</text>
      </view>

      <!-- 描述输入 + 封面 -->
      <view class="desc-row">
        <view class="desc-left">
          <textarea
            class="desc-textarea"
            v-model="shareDesc"
            :maxlength="60"
            placeholder="请输入分享描述"
            placeholder-style="color:#cccccc"
            auto-height
            @input="onDescInput"
          />
          <view class="desc-bottom">
            <view class="template-lib" @click="onTemplateLib">
              <text class="lib-icon">📋</text>
              <text class="lib-text">文案库</text>
            </view>
            <text class="input-count">{{ shareDesc.length }}/60</text>
          </view>
        </view>
        <view class="desc-right" @click="onChangeCover">
          <image class="cover-image" :src="coverImage" mode="aspectFill" />
          <view class="cover-tip">
            <text class="tip-emoji">👆</text>
            <text class="tip-text">更换封面</text>
          </view>
        </view>
      </view>

      <!-- 分享至 -->
      <view class="share-section">
        <view class="section-divider">
          <view class="divider-line"></view>
          <text class="divider-text">分享至</text>
          <view class="divider-line"></view>
        </view>

        <view class="share-channels">
          <button class="channel-item" open-type="share">
            <view class="channel-icon channel-icon--wechat">
              <text class="icon-text">💬</text>
            </view>
            <text class="channel-name">微信好友</text>
          </button>
          <view class="channel-item" @click="onShareMoments">
            <view class="channel-icon channel-icon--moments">
              <text class="icon-text">📷</text>
            </view>
            <text class="channel-name">朋友圈</text>
          </view>
          <view class="channel-item" @click="onSharePoster">
            <view class="channel-icon channel-icon--poster">
              <text class="icon-text">💌</text>
            </view>
            <text class="channel-name">请柬海报</text>
          </view>
          <view class="channel-item" @click="onCopyLink">
            <view class="channel-icon channel-icon--link">
              <text class="icon-text">🔗</text>
            </view>
            <text class="channel-name">复制链接</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 文案库弹窗 -->
    <view v-if="showTemplateLib" class="modal-mask" @click="closeTemplateLib">
      <view class="modal-content modal-content--lib" @click.stop>
        <view class="modal-header">
          <text class="modal-title">文案库</text>
          <view class="modal-close" @click="closeTemplateLib">
            <text class="close-text">×</text>
          </view>
        </view>
        <scroll-view class="modal-body" scroll-y>
          <view
            v-for="(item, idx) in templateList"
            :key="idx"
            class="lib-item"
            @click="onSelectTemplate(item)"
          >
            <text class="lib-item-text">{{ item }}</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <view class="share-shop-entry" @click="goToMall">
      <text>&#128722; 为婚礼准备用品</text>
      <text class="arrow">></text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onShareAppMessage } from '@dcloudio/uni-app'
import { useTemplateStore } from '@/stores/template'
import { useEditorStore } from '@/stores/editor'

const templateStore = useTemplateStore()
const editorStore = useEditorStore()

// 分享信息
const shareTitle = ref('')
const shareDesc = ref('')
const coverImage = ref('')
const showTemplateLib = ref(false)

// 预设文案库
const templateList = ref([
  '诚挚邀请您参加我们的婚礼，见证我们的爱情之路，共享美好时刻！',
  '我们决定携手步入婚姻殿堂，诚邀您共同见证这一美好瞬间。',
  '谨于公历二〇五〇年五月二十日举行结婚典礼，敬备喜筵，恭候光临。',
  '您的出席将是我们最大的荣幸，期待与您分享这份喜悦！',
  '执子之手，与子偕老。我们的婚礼，诚邀您的见证与祝福。',
  '在这美好的日子里，我们将携手步入婚姻殿堂，期待您的光临。',
])

// 从模板 store 初始化
onMounted(() => {
  const info = templateStore.basicInfo
  const groom = info.groomName || '新郎'
  const bride = info.brideName || '新娘'

  // 默认标题：姓名+的婚礼邀请
  shareTitle.value = `${groom}❤${bride}的婚礼邀请`
  if (shareTitle.value.length > 48) {
    shareTitle.value = shareTitle.value.substring(0, 48)
  }

  // 默认描述
  shareDesc.value = `诚挚邀请您参加我们的婚礼，见证我们的爱情之路，共享美好时刻！`

  // 封面使用模板的封面图
  coverImage.value = templateStore.templateData.coverImage || '/static/images/templates/wedding-1.svg'
})

// 微信分享配置 - 同时支持右上角 ... 菜单和自定义按钮
onShareAppMessage(() => {
  const templateId = editorStore.currentTemplateId || ''
  const workId = editorStore.currentWorkId || ''
  let path = '/pages/preview/index'
  const params: string[] = []
  if (templateId) params.push(`templateId=${templateId}`)
  if (workId) params.push(`workId=${workId}`)
  if (params.length) path += '?' + params.join('&')
  return {
    title: shareTitle.value,
    path,
    imageUrl: coverImage.value,
    desc: shareDesc.value,
  }
})

function onTitleInput() {}
function onDescInput() {}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.switchTab({ url: '/pages/index/index' })
  }
}

// 更换封面
function onChangeCover() {
  // #ifdef MP-WEIXIN
  uni.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sourceType: ['album', 'camera'],
    success: (res: any) => {
      if (res.tempFiles && res.tempFiles.length > 0) {
        coverImage.value = res.tempFiles[0].tempFilePath
        uni.showToast({ title: '封面已更新', icon: 'success' })
      }
    },
  })
  // #endif
  // #ifndef MP-WEIXIN
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res: any) => {
      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        coverImage.value = res.tempFilePaths[0]
        uni.showToast({ title: '封面已更新', icon: 'success' })
      }
    },
  })
  // #endif
}

// 文案库
function onTemplateLib() {
  showTemplateLib.value = true
}
function closeTemplateLib() {
  showTemplateLib.value = false
}
function onSelectTemplate(item: string) {
  shareDesc.value = item
  showTemplateLib.value = false
}

// 分享渠道
function onShareMoments() {
  uni.showToast({ title: '请在微信中分享到朋友圈', icon: 'none' })
}

function onSharePoster() {
  uni.showLoading({ title: '生成海报中...' })
  setTimeout(() => {
    uni.hideLoading()
    uni.showModal({
      title: '分享海报',
      content: '如需将请柬分享到朋友圈，请保存下方图片后从相册分享。',
      confirmText: '保存图片',
      success: (res) => {
        if (res.confirm) {
          uni.showToast({ title: '图片已保存到相册', icon: 'success' })
        }
      },
    })
  }, 1000)
}

function onCopyLink() {
  const info = templateStore.basicInfo
  const groom = info.groomName || '新郎'
  const bride = info.brideName || '新娘'
  const link = `【toy tamaxia】${groom}与${bride}的婚礼邀请，点击查看 https://www.hunbei.com/invitation`
  uni.setClipboardData({
    data: link,
    success: () => {
      uni.showToast({ title: '链接已复制', icon: 'success' })
    },
  })
}

function goToMall() {
  uni.switchTab({ url: '/pages/mall/index' })
}
</script>

<style lang="scss" scoped>
.share-page {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

/* 顶部栏 */
.share-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
  flex-shrink: 0;
}

.header-back {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 48rpx;
  color: #333333;
  line-height: 1;
}

.header-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #333333;
}

.header-right {
  width: 60rpx;
}

/* 分享设置卡片 */
.share-card {
  margin: 30rpx;
  padding: 40rpx 30rpx 30rpx;
  background: #ffffff;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
}

.share-hint {
  font-size: 28rpx;
  color: #999999;
  margin-bottom: 30rpx;
}

/* 标题输入 */
.input-row {
  display: flex;
  align-items: center;
  background: #f8f8f8;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 24rpx;
}

.title-input {
  flex: 1;
  font-size: 36rpx;
  color: #333333;
  font-weight: 500;
}

.input-count {
  font-size: 26rpx;
  color: #999999;
  flex-shrink: 0;
  margin-left: 16rpx;
}

/* 描述 + 封面 */
.desc-row {
  display: flex;
  align-items: stretch;
  gap: 20rpx;
}

.desc-left {
  flex: 1;
  background: #f8f8f8;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  display: flex;
  flex-direction: column;
}

.desc-textarea {
  flex: 1;
  font-size: 30rpx;
  color: #333333;
  line-height: 1.6;
  width: 100%;
}

.desc-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12rpx;
}

.template-lib {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.lib-icon {
  font-size: 24rpx;
}

.lib-text {
  font-size: 26rpx;
  color: #e84a6e;
}

.desc-right {
  width: 180rpx;
  height: 180rpx;
  border-radius: 16rpx;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
}

.cover-image {
  width: 100%;
  height: 100%;
  display: block;
}

.cover-tip {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.45);
  padding: 10rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.tip-emoji {
  font-size: 48rpx;
  line-height: 1;
}

.tip-text {
  font-size: 22rpx;
  color: #ffffff;
  margin-top: 4rpx;
}

/* 分享至 */
.share-section {
  margin-top: 60rpx;
}

.section-divider {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 40rpx;
}

.divider-line {
  flex: 1;
  height: 2rpx;
  background: #e8e8e8;
}

.divider-text {
  font-size: 32rpx;
  color: #333333;
  font-weight: 600;
}

/* 分享渠道 */
.share-channels {
  display: flex;
  justify-content: space-between;
  padding: 0 10rpx;
}

.channel-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  flex: 1;
  padding: 0;
  margin: 0;
  background: transparent;
  border: none;
  line-height: 1;
  font-size: inherit;
  &::after {
    border: none;
  }
}

.channel-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.channel-icon--wechat {
  background: #2dc100;
}
.channel-icon--moments {
  background: #ffb347;
}
.channel-icon--poster {
  background: #ff7a7a;
}
.channel-icon--link {
  background: #eeeeee;
}

.icon-text {
  font-size: 52rpx;
  line-height: 1;
}

.channel-name {
  font-size: 26rpx;
  color: #333333;
}

/* 文案库弹窗 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 999;
}

.modal-content {
  width: 100%;
  background: #ffffff;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.modal-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
}

.modal-close {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-text {
  font-size: 48rpx;
  color: #999999;
  line-height: 1;
}

.modal-body {
  flex: 1;
  padding: 20rpx 30rpx;
  max-height: 55vh;
}

.lib-item {
  padding: 24rpx 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.lib-item-text {
  font-size: 28rpx;
  color: #333333;
  line-height: 1.6;
}

.share-shop-entry {
  margin: 30rpx;
  padding: 28rpx 30rpx;
  background: #ffffff;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 30rpx;
  color: #333333;
  font-weight: 500;
}

.share-shop-entry .arrow {
  font-size: 28rpx;
  color: #999999;
}
</style>
