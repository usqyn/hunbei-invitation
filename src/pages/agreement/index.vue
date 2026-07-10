<template>
  <view class="page">
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="nav-back-icon">&#x276e;</text>
      </view>
      <text class="nav-title">用户协议</text>
      <view class="nav-placeholder"></view>
    </view>

    <view class="tabs">
      <view
        class="tab-item"
        :class="{ active: activeTab === 'user' }"
        @click="activeTab = 'user'"
      >用户协议</view>
      <view
        class="tab-item"
        :class="{ active: activeTab === 'privacy' }"
        @click="activeTab = 'privacy'"
      >隐私协议</view>
    </view>

    <view class="content">
      <view class="card">
        <view v-if="activeTab === 'user'" class="agreement-text">
          <text class="paragraph">欢迎使用本平台服务。本用户协议（以下简称"协议"）是您与平台之间就使用本平台服务所订立的协议。</text>
          <text class="paragraph">1. 服务条款的确认和接纳</text>
          <text class="paragraph">您在使用本平台提供的各项服务之前，应仔细阅读本协议。如您不同意本协议及/或随时对其的修改，请您立即停止使用本平台所提供的全部服务。</text>
          <text class="paragraph">2. 服务内容</text>
          <text class="paragraph">本平台服务的具体内容由本平台根据实际情况提供，包括但不限于婚礼请柬制作、模板浏览、作品管理等。</text>
          <text class="paragraph">3. 用户账号</text>
          <text class="paragraph">您在使用本平台服务时可能需要注册账号。您保证在注册时提供真实、准确、完整的信息，并及时更新。</text>
          <text class="paragraph">4. 用户行为规范</text>
          <text class="paragraph">您在使用本平台服务时，必须遵守中华人民共和国相关法律法规，不得利用本平台从事违法活动。</text>
          <text class="paragraph">5. 知识产权</text>
          <text class="paragraph">本平台上的所有内容，包括但不限于文字、图片、音频、视频、软件、代码等，均受知识产权法律保护。</text>
          <text class="paragraph">6. 免责声明</text>
          <text class="paragraph">本平台将尽力确保服务的稳定性和安全性，但不对服务的及时性、准确性、完整性作绝对保证。</text>
          <text class="paragraph">7. 协议修改</text>
          <text class="paragraph">本平台有权根据需要不时地制定、修改本协议，如本协议有任何变更，我们将在平台上公布修改后的协议。</text>
          <text class="paragraph">8. 法律适用</text>
          <text class="paragraph">本协议的订立、执行和解释及争议的解决均应适用中华人民共和国法律。</text>
          <text class="paragraph">9. 争议解决</text>
          <text class="paragraph">因本协议引起的或与本协议有关的任何争议，双方应友好协商解决；协商不成的，任何一方均可向本平台所在地有管辖权的人民法院提起诉讼。</text>
          <text class="paragraph">10. 其他</text>
          <text class="paragraph">本协议中的标题仅为方便阅读而设，不影响本协议的解释。本协议未尽事宜，按照国家有关法律法规执行。</text>
        </view>

        <view v-else class="agreement-text">
          <text class="paragraph">我们非常重视您的隐私保护，本隐私协议旨在帮助您了解我们如何收集、使用、存储和共享您的个人信息。</text>
          <text class="paragraph">1. 信息收集</text>
          <text class="paragraph">我们可能收集的信息包括：您提供的注册信息、使用服务过程中产生的日志信息、设备信息等。</text>
          <text class="paragraph">2. 信息使用</text>
          <text class="paragraph">我们使用您的信息主要用于：提供和改进服务、保障账号安全、向您推送相关通知等。</text>
          <text class="paragraph">3. 信息共享</text>
          <text class="paragraph">我们不会向第三方出售您的个人信息。仅在以下情形下可能会共享：获得您的明确同意、法律法规要求、保护我们的合法权益等。</text>
          <text class="paragraph">4. 信息存储</text>
          <text class="paragraph">我们将采取合理的安全措施保护您的个人信息，防止信息泄露、损毁或丢失。</text>
          <text class="paragraph">5. Cookie 和类似技术</text>
          <text class="paragraph">我们可能会使用 Cookie 和类似技术来改善您的使用体验，您可以根据浏览器设置拒绝 Cookie。</text>
          <text class="paragraph">6. 您的权利</text>
          <text class="paragraph">您有权访问、更正、删除您的个人信息，也有权撤回同意、注销账号等。</text>
          <text class="paragraph">7. 未成年人保护</text>
          <text class="paragraph">我们非常重视对未成年人个人信息的保护。如果您是未成年人，请在监护人的陪同下使用我们的服务。</text>
          <text class="paragraph">8. 隐私政策更新</text>
          <text class="paragraph">我们可能会不时更新本隐私政策，更新后的政策将在平台上公布，请您定期查阅。</text>
          <text class="paragraph">9. 联系我们</text>
          <text class="paragraph">如果您对本隐私政策有任何疑问或建议，请通过平台提供的联系方式与我们联系。</text>
          <text class="paragraph">10. 生效日期</text>
          <text class="paragraph">本隐私政策自发布之日起生效。继续使用我们的服务，即表示您同意本隐私政策的全部内容。</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useGoBack } from '@/composables/useGoBack'

const goBack = useGoBack()
const activeTab = ref<'user' | 'privacy'>('user')

onMounted(() => {
  const pages = getCurrentPages()
  const curPage = pages[pages.length - 1] as any
  const options = curPage?.options || {}
  if (options.type === 'privacy') {
    activeTab.value = 'privacy'
  } else if (options.type === 'user') {
    activeTab.value = 'user'
  }
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--color-bg-page);
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background: #ffffff;
}

.nav-back {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-back-icon {
  font-size: 36rpx;
  color: #333333;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
}

.nav-placeholder {
  width: 60rpx;
}

.tabs {
  display: flex;
  background: #ffffff;
  border-bottom: 2rpx solid #f0f0f0;
}

.tab-item {
  flex: 1;
  padding: 28rpx 0;
  text-align: center;
  font-size: 28rpx;
  color: #999999;
  position: relative;

  &.active {
    color: #e84a6e;
    font-weight: 500;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 48rpx;
      height: 6rpx;
      background: #e84a6e;
      border-radius: 3rpx;
    }
  }
}

.content {
  padding: 24rpx;
}

.card {
  background: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
  padding: 32rpx;
}

.agreement-text {
  display: flex;
  flex-direction: column;
}

.paragraph {
  font-size: 28rpx;
  color: #666666;
  line-height: 1.8;
  margin-bottom: 16rpx;
  display: block;

  &:first-child {
    font-weight: 500;
    color: #333333;
  }
}
</style>
