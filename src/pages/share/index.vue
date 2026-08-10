<template>
  <view class="share-page">
    <!-- 顶部标题栏 -->
    <view class="share-header">
      <view class="header-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="header-title">分享请柬</text>
      <view class="header-right"></view>
    </view>

    <!-- 微信分享卡片预览 -->
    <view class="share-preview-mock">
      <text class="preview-mock-label">分享效果预览</text>
      <view class="wechat-card">
        <view class="wechat-card-thumb">
          <CloudImage class="wechat-card-img" :src="coverImage" mode="aspectFill" custom-class="wechat-card-img" />
        </view>
        <view class="wechat-card-body">
          <text class="wechat-card-title">{{ shareTitle || '分享标题' }}</text>
          <text class="wechat-card-desc">{{ shareDesc || '分享描述' }}</text>
          <view class="wechat-card-source">
            <text class="source-text">TOYtamaxia</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 分享设置卡片 -->
    <view class="share-card">
      <text class="share-hint">请设置微信分享标题、描述和封面</text>

      <!-- 标题输入 -->
      <view class="input-row">
        <input
          class="title-input"
          :class="{ 'rtl-input': titleRtl.isRtl.value }"
          type="text"
          v-model="shareTitle"
          :maxlength="48"
          placeholder="请输入分享标题"
          placeholder-style="color:#cccccc"
        />
        <text class="input-count">{{ shareTitle.length }}/48</text>
      </view>

      <!-- 描述输入 + 封面 -->
      <view class="desc-row">
        <view class="desc-left">
          <textarea
            class="desc-textarea"
            :class="{ 'rtl-input': descRtl.isRtl.value }"
            v-model="shareDesc"
            :maxlength="60"
            placeholder="请输入分享描述"
            placeholder-style="color:#cccccc"
            auto-height
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
          <CloudImage class="cover-image" :src="coverImage" mode="aspectFill" custom-class="cover-image" />
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
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { useTemplateStore } from '@/stores/template'
import { useEditorStore } from '@/stores/editor'
import { useGoBack } from '@/composables/useGoBack'
import { useFeedback } from '@/composables/useFeedback'
import { useRtl } from '@/composables/useRtl'
import { generatePoster } from '@/api'
import CloudImage from '@/components/CloudImage.vue'

const templateStore = useTemplateStore()
const editorStore = useEditorStore()
const { goBack } = useGoBack()
const { haptic } = useFeedback()

// 分享信息
const shareTitle = ref('')
const shareDesc = ref('')
const coverImage = ref('')
const showTemplateLib = ref(false)
const isGenerating = ref(false)

// 哈萨克语阿拉伯文 RTL 输入支持
const titleRtl = useRtl(() => shareTitle.value || '')
const descRtl = useRtl(() => shareDesc.value || '')

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
  coverImage.value = templateStore.templateData.coverImage || '/static/images/templates/wedding-1.png'

  enableShareMenu()
})

// 页面加载即启用分享菜单（比 onMounted 更早，兼容分包页面）
onLoad(() => {
  enableShareMenu()
})

function enableShareMenu() {
  uni.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline'],
    success: () => console.log('share menu enabled'),
    fail: (err: any) => console.warn('share menu fail:', err?.errMsg || err),
  })
}

// 微信分享配置 - 同时支持右上角 ... 菜单和自定义按钮
onShareAppMessage(() => {
  const workId = editorStore.currentWorkId
  const templateId = editorStore.currentTemplateId
  if (!workId && !templateId) {
    return { title: 'TOYtamaxia', path: '/pages/index/index' }
  }
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

onShareTimeline(() => {
  const workId = editorStore.currentWorkId
  const templateId = editorStore.currentTemplateId
  const params: string[] = []
  if (templateId) params.push(`templateId=${templateId}`)
  if (workId) params.push(`workId=${workId}`)
  return {
    title: shareTitle.value,
    query: params.join('&'),
    imageUrl: coverImage.value,
  }
})

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
    fail: (err) => {
      if (err.errMsg && !err.errMsg.includes('cancel')) {
        uni.showToast({ title: '图片选择失败', icon: 'none' })
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
    fail: (err) => {
      if (err.errMsg && !err.errMsg.includes('cancel')) {
        uni.showToast({ title: '图片选择失败', icon: 'none' })
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
async function onShareMoments() {
  haptic('medium')
  if (isGenerating.value) return
  const workId = editorStore.currentWorkId
  if (!workId) { uni.showToast({ title: '请先创建作品', icon: 'none' }); return }
  isGenerating.value = true
  uni.showLoading({ title: '生成海报中...' })
  try {
    const res = await generatePoster(workId)
    if (!res || !res.url) {
      uni.hideLoading()
      uni.showToast({ title: '生成海报失败', icon: 'none' })
      isGenerating.value = false
      return
    }
    uni.downloadFile({
      url: res.url,
      success: (r) => {
        uni.hideLoading()
        // 校验下载状态码，非 200 视为下载失败
        if (r.statusCode !== 200) {
          uni.showToast({ title: '下载失败', icon: 'none' })
          isGenerating.value = false
          return
        }
        uni.saveImageToPhotosAlbum({
          filePath: r.tempFilePath,
          success: () => {
            uni.showToast({ title: '已保存到相册', icon: 'success' })
            // 整个下载+保存流程完成后再释放锁
            isGenerating.value = false
          },
          fail: (err) => {
            if (err.errMsg && err.errMsg.includes('auth')) {
              uni.showModal({
                title: '提示',
                content: '需要相册权限才能保存图片，请在设置中开启',
                confirmText: '去设置',
                success: (modalRes) => { if (modalRes.confirm) uni.openSetting({}) },
              })
            } else {
              uni.showToast({ title: '保存失败', icon: 'none' })
            }
            // 整个下载+保存流程完成后再释放锁
            isGenerating.value = false
          },
        })
      },
      fail: () => {
        uni.hideLoading()
        uni.showToast({ title: '下载失败', icon: 'none' })
        isGenerating.value = false
      },
    })
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: '生成海报失败', icon: 'none' })
    isGenerating.value = false
  }
}

async function onSharePoster() {
  haptic('medium')
  if (isGenerating.value) return
  const workId = editorStore.currentWorkId
  if (!workId) { uni.showToast({ title: '请先创建作品', icon: 'none' }); return }
  isGenerating.value = true
  uni.showLoading({ title: '生成海报中...' })
  try {
    const res = await generatePoster(workId)
    if (!res || !res.url) {
      uni.hideLoading()
      uni.showToast({ title: '生成海报失败', icon: 'none' })
      isGenerating.value = false
      return
    }
    uni.showModal({
      title: '分享海报',
      content: '如需将请柬分享到朋友圈，请保存下方图片后从相册分享。',
      confirmText: '保存图片',
      success: (modalRes) => {
        if (modalRes.confirm) {
          uni.downloadFile({
            url: res.url,
            success: (r) => {
              uni.hideLoading()
              uni.saveImageToPhotosAlbum({
                filePath: r.tempFilePath,
                success: () => {
                  uni.showToast({ title: '图片已保存到相册', icon: 'success' })
                  // 整个下载+保存流程完成后再释放锁
                  isGenerating.value = false
                },
                fail: (err) => {
                  if (err.errMsg && err.errMsg.includes('auth')) {
                    uni.showModal({
                      title: '提示',
                      content: '需要相册权限才能保存图片，请在设置中开启',
                      confirmText: '去设置',
                      success: (settingsRes) => { if (settingsRes.confirm) uni.openSetting({}) },
                    })
                  } else {
                    uni.showToast({ title: '保存失败', icon: 'none' })
                  }
                  // 整个下载+保存流程完成后再释放锁
                  isGenerating.value = false
                },
              })
            },
            fail: () => {
              uni.hideLoading()
              uni.showToast({ title: '下载失败', icon: 'none' })
              isGenerating.value = false
            },
          })
        } else {
          uni.hideLoading()
          isGenerating.value = false
        }
      },
    })
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: '生成海报失败', icon: 'none' })
    isGenerating.value = false
  }
}

function onCopyLink() {
  haptic('medium')
  const workId = editorStore.currentWorkId
  if (!workId) {
    uni.showToast({ title: '请先创建作品', icon: 'none' })
    return
  }
  const templateId = editorStore.currentTemplateId || ''
  const params: string[] = []
  if (templateId) params.push(`templateId=${templateId}`)
  if (workId) params.push(`workId=${workId}`)
  const query = params.length ? '?' + params.join('&') : ''
  const previewPath = '/pages/preview/index' + query
  // 优先使用当前 H5 站点真实地址，无法获取时回退到默认域名
  let link = 'https://h5.TOYtamaxia.com/#' + previewPath
  try {
    const w = (typeof window !== 'undefined' ? window : null) as any
    if (w && w.location && w.location.origin) {
      link = w.location.origin + '/#' + previewPath
    }
  } catch (e) {
    // 非浏览器环境保持默认域名
  }
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
  background: var(--color-bg-page);
  display: flex;
  flex-direction: column;
}

/* 顶部栏 */
.share-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
  padding-top: calc(env(safe-area-inset-top) + 20rpx);
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

/* 微信分享卡片预览 */
.share-preview-mock {
  padding: 24rpx 30rpx 8rpx;
}

.preview-mock-label {
  font-size: 24rpx;
  color: #999999;
  margin-bottom: 16rpx;
  display: block;
}

.wechat-card {
  display: flex;
  align-items: center;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 20rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.08);
  border: 1rpx solid #f0f0f0;
}

.wechat-card-thumb {
  width: 140rpx;
  height: 112rpx;
  border-radius: 8rpx;
  overflow: hidden;
  flex-shrink: 0;
  background: #f5f5f5;
}

.wechat-card-img {
  width: 100%;
  height: 100%;
}

.wechat-card-body {
  flex: 1;
  margin-left: 20rpx;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 112rpx;
}

.wechat-card-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #1a1a2e;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.wechat-card-desc {
  font-size: 24rpx;
  color: #999999;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wechat-card-source {
  display: flex;
  align-items: center;
}

.source-text {
  font-size: 22rpx;
  color: #bbbbbb;
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
