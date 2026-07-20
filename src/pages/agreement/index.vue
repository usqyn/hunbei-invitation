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
        <!-- 法律主体信息（信任建设要素） -->
        <view class="legal-entity">
          <text class="entity-title">运营主体信息</text>
          <text class="entity-row">运营公司：__________________________（待填写）</text>
          <text class="entity-row">统一社会信用代码：__________________（待填写）</text>
          <text class="entity-row">ICP 备案号：________________________（待填写）</text>
          <text class="entity-row">客服电话：__________________________（待填写）</text>
          <text class="entity-row">联系邮箱：__________________________（待填写）</text>
          <text class="entity-row">办公地址：__________________________（待填写）</text>
          <text class="entity-tip">提示：上线前请填写真实法律主体信息并通过微信小程序备案审核</text>
        </view>

        <view v-if="activeTab === 'user'" class="agreement-text">
          <text class="paragraph">欢迎使用本平台服务。本用户协议（以下简称"协议"）是您与平台运营方之间就使用本平台服务所订立的协议。</text>
          <text class="paragraph">生效日期：2026年7月20日</text>
          <text class="paragraph">1. 服务条款的确认和接纳</text>
          <text class="paragraph">您在使用本平台提供的各项服务之前，应仔细阅读本协议。如您不同意本协议及/或随时对其的修改，请您立即停止使用本平台所提供的全部服务。您使用本平台服务即视为您已阅读、理解并同意接受本协议的全部条款。</text>
          <text class="paragraph">2. 服务内容</text>
          <text class="paragraph">本平台服务的具体内容由本平台根据实际情况提供，包括但不限于婚礼请柬制作、模板浏览、作品管理、付费模板购买、VIP 会员服务等。</text>
          <text class="paragraph">3. 用户账号</text>
          <text class="paragraph">您在使用本平台服务时可能需要注册账号。您保证在注册时提供真实、准确、完整的信息，并及时更新。您应妥善保管账号及密码，因账号泄露造成的损失由您自行承担。</text>
          <text class="paragraph">4. 用户行为规范</text>
          <text class="paragraph">您在使用本平台服务时，必须遵守中华人民共和国相关法律法规，不得利用本平台从事违法活动，不得侵犯他人知识产权、隐私权等合法权益。</text>
          <text class="paragraph">5. 知识产权</text>
          <text class="paragraph">本平台上的所有内容，包括但不限于文字、图片、音频、视频、软件、代码、模板设计等，均受知识产权法律保护。未经本平台书面许可，您不得复制、转载、传播或用于商业用途。</text>
          <text class="paragraph">6. 付费服务</text>
          <text class="paragraph">本平台提供付费模板、VIP 会员等付费服务。付费服务的具体内容、价格、有效期以购买时页面展示为准。除法律规定的情形外，付费服务费用一经支付不予退款。</text>
          <text class="paragraph">7. 免责声明</text>
          <text class="paragraph">本平台将尽力确保服务的稳定性和安全性，但不对服务的及时性、准确性、完整性作绝对保证。因不可抗力、系统维护、网络故障等原因导致服务中断，本平台不承担责任。</text>
          <text class="paragraph">8. 协议修改</text>
          <text class="paragraph">本平台有权根据需要不时地制定、修改本协议，如本协议有任何变更，我们将在平台上公布修改后的协议。修改后的协议自公布之日起生效。</text>
          <text class="paragraph">9. 法律适用</text>
          <text class="paragraph">本协议的订立、执行和解释及争议的解决均应适用中华人民共和国法律。</text>
          <text class="paragraph">10. 争议解决</text>
          <text class="paragraph">因本协议引起的或与本协议有关的任何争议，双方应友好协商解决；协商不成的，任何一方均可向本平台运营方所在地有管辖权的人民法院提起诉讼。</text>
          <text class="paragraph">11. 其他</text>
          <text class="paragraph">本协议中的标题仅为方便阅读而设，不影响本协议的解释。本协议未尽事宜，按照国家有关法律法规执行。</text>
        </view>

        <view v-else class="agreement-text">
          <text class="paragraph">我们非常重视您的隐私保护，本隐私协议旨在帮助您了解我们如何收集、使用、存储和共享您的个人信息。</text>
          <text class="paragraph">生效日期：2026年7月20日</text>
          <text class="paragraph">1. 信息收集</text>
          <text class="paragraph">我们可能收集的信息包括：您提供的注册信息（手机号、昵称、头像）、使用服务过程中产生的日志信息、设备信息、订单信息（含收货地址）、支付信息等。</text>
          <text class="paragraph">2. 信息使用</text>
          <text class="paragraph">我们使用您的信息主要用于：提供和改进服务、保障账号安全、向您推送相关通知、处理订单与售后、提供客户服务等。</text>
          <text class="paragraph">3. 信息共享</text>
          <text class="paragraph">我们不会向第三方出售您的个人信息。仅在以下情形下可能会共享：获得您的明确同意、完成订单履约（如发货）、法律法规要求、保护我们的合法权益等。</text>
          <text class="paragraph">4. 信息存储</text>
          <text class="paragraph">我们将采取合理的安全措施保护您的个人信息，防止信息泄露、损毁或丢失。您的信息存储于中华人民共和国境内的服务器。</text>
          <text class="paragraph">5. Cookie 和类似技术</text>
          <text class="paragraph">我们可能会使用 Cookie 和类似技术来改善您的使用体验，您可以根据浏览器设置拒绝 Cookie。</text>
          <text class="paragraph">6. 您的权利</text>
          <text class="paragraph">您有权访问、更正、删除您的个人信息，也有权撤回同意、注销账号等。如需行使上述权利，请通过客服联系方式与我们联系。</text>
          <text class="paragraph">7. 未成年人保护</text>
          <text class="paragraph">我们非常重视对未成年人个人信息的保护。如果您是未成年人，请在监护人的陪同下使用我们的服务，并在监护人同意后提交个人信息。</text>
          <text class="paragraph">8. 数据安全</text>
          <text class="paragraph">我们采用 HTTPS 加密传输、Token 鉴权、敏感信息脱敏存储等技术手段保护您的数据安全。支付信息由微信支付平台处理，本平台不存储您的支付凭证。</text>
          <text class="paragraph">9. 跨境数据传输</text>
          <text class="paragraph">您的个人信息原则上存储于中华人民共和国境内。如因业务需要进行跨境传输，我们将另行获取您的授权并遵守相关法律法规。</text>
          <text class="paragraph">10. 隐私政策更新</text>
          <text class="paragraph">我们可能会不时更新本隐私政策，更新后的政策将在平台上公布，请您定期查阅。重大变更将以站内信或推送方式通知您。</text>
          <text class="paragraph">11. 联系我们</text>
          <text class="paragraph">如果您对本隐私政策有任何疑问或建议，请通过本页顶部"运营主体信息"中的联系方式与我们联系。</text>
          <text class="paragraph">12. 生效日期</text>
          <text class="paragraph">本隐私政策自 2026 年 7 月 20 日起生效。继续使用我们的服务，即表示您同意本隐私政策的全部内容。</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useGoBack } from '@/composables/useGoBack'

const { goBack } = useGoBack()
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

.legal-entity {
  background: #fff8f0;
  border: 2rpx solid #ffd9a8;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  display: flex;
  flex-direction: column;
}

.entity-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #d97706;
  margin-bottom: 12rpx;
  display: block;
}

.entity-row {
  font-size: 24rpx;
  color: #666666;
  line-height: 1.8;
  display: block;
}

.entity-tip {
  font-size: 22rpx;
  color: #d97706;
  margin-top: 8rpx;
  display: block;
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
