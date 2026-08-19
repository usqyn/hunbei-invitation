// 模板入口统一逻辑：登录拦截 → 限数版配额校验/三出口 → 付费弹窗（单买/VIP） → 进入编辑器
// 首页精选/付费卡片与模板列表页共用，保证各入口行为一致
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { useFeedback } from '@/composables/useFeedback'
import { fetchTemplateQuota } from '@/api'

// 防重复跳转（页面间共享，避免连点触发多次 navigateTo）
const navigating = ref(false)

// 页面 onShow 时复位导航锁，避免从编辑器返回后点击无响应
export function resetTemplateEntryNavigation() {
  navigating.value = false
}

// 限数版模板判定：vipLevel === 'limited'，或兼容旧数据（is_paid 且非 VIP 免费且非专业版）
export function isLimitedTemplate(t: any): boolean {
  if (!t) return false
  if (t.vipLevel === 'limited') return true
  return Boolean(t.is_paid) && !Boolean(t.is_premium) && !Boolean(t.vip_free)
}

// 安全获取用户 store：iOS 上任何一步崩溃都会导致页面白屏，失败时用匿名兜底
function getSafeUserStore(): any {
  try {
    return useUserStore()
  } catch (e: any) {
    console.error('[useTemplateEntry] useUserStore FAIL:', e?.message || e)
    return {
      isVip: () => false,
      requireLogin: () => true,
    } as any
  }
}

export function useTemplateEntry() {
  const userStore = getSafeUserStore()
  const { haptic } = useFeedback()

  // 进入编辑器（带防重复跳转）
  function enterEditor(template: any) {
    haptic('light')
    navigating.value = true
    uni.navigateTo({
      url: `/pages/editor/index?templateId=${template.id}`,
      fail: () => { navigating.value = false },
    })
  }

  // 引导分享：提示用户分享当前模板给好友，好友打开后即获得免费次数
  function guideShareForQuota(template: any) {
    uni.showModal({
      title: '分享得次数',
      content: '分享本模板给微信好友，好友打开后您即可获得 1 次免费制作机会（每日限 1 次）',
      confirmText: '去分享',
      success: (r: any) => {
        if (r.confirm) {
          uni.navigateTo({
            url: `/pages/preview/index?templateId=${template.id}&shareGuide=1`,
          })
        }
      },
    })
  }

  // 限数版模板点击：查询剩余免费次数，不足时弹出 分享得次数 / 单次解锁 / 开通VIP 三出口
  async function handleLimitedTemplate(template: any) {
    haptic('light')
    const price = template.price || 9.9
    let quota: any = null
    try {
      quota = await fetchTemplateQuota(template.id)
    } catch (e) {
      uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
      return
    }
    if (!quota || quota.limitless || quota.remaining > 0) {
      // 有剩余次数（或已解锁/VIP）：直接进入编辑器（次数在编辑器内扣减）
      enterEditor(template)
      return
    }
    // 免费次数已用完：三出口
    uni.showActionSheet({
      itemList: ['分享好友得免费次数', `¥${price} 解锁模板`, '开通VIP免费使用'],
      success: (res: any) => {
        if (res.tapIndex === 0) {
          guideShareForQuota(template)
        } else if (res.tapIndex === 1) {
          uni.navigateTo({
            url: `/pages/vip/index?mode=purchase&templateId=${template.id}&price=${price}`,
          })
        } else if (res.tapIndex === 2) {
          uni.navigateTo({ url: '/pages/vip/index' })
        }
      },
    })
  }

  // 统一入口：local- 兜底拦截 → 登录拦截 → 限数版 → 付费弹窗 → 进编辑器
  async function openTemplateEntry(template: any, options?: { isPurchased?: boolean }) {
    if (navigating.value) return
    // 本地兜底模板没有真实数据，点击提示稍后重试
    if (typeof template.id === 'string' && template.id.startsWith('local-')) {
      uni.showToast({ title: '模板数据加载失败，请稍后重试', icon: 'none' })
      return
    }
    // 登录拦截：未登录时跳转登录页
    if (!userStore.requireLogin()) return

    // 限数版模板：非 VIP 用户先查免费次数，不足则引导分享/解锁/VIP
    if (isLimitedTemplate(template) && !userStore.isVip()) {
      await handleLimitedTemplate(template)
      return
    }

    // 付费模板（VIP 专属）：非 VIP 且未购买时弹 单买 / 开通VIP
    if (Boolean(template.is_paid)) {
      const isVip = userStore.isVip()
      if (!isVip && !(options?.isPurchased ?? false)) {
        haptic('light')
        const price = template.price || 0
        uni.showActionSheet({
          itemList: [`单买 ${price}元`, '开通VIP免费使用'],
          success: (res: any) => {
            if (res.tapIndex === 0) {
              // 单买流程：跳转支付页
              uni.navigateTo({
                url: `/pages/vip/index?mode=purchase&templateId=${template.id}&price=${price}`,
              })
            } else if (res.tapIndex === 1) {
              // 开通VIP
              uni.navigateTo({
                url: '/pages/vip/index',
              })
            }
          },
        })
        return
      }
    }
    enterEditor(template)
  }

  return { openTemplateEntry, isLimitedTemplate }
}