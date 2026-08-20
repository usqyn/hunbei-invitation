// 模板入口统一逻辑：登录拦截 → 档位判定（限免版漏斗/付费档按次收费） → 进入编辑器
// 计费模型：
//   限免版(limited)：第1次免费 → 第2次分享朋友圈（汉哈双语说明页） → 第3次起每次 ¥6.6
//   VIP版(personal)：个人VIP会员免费，非会员每次新建作品 ¥9.9
//   SVIP版(svip)：专业版免费，其余每次新建作品 ¥18.8
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

export type TemplateTier = 'free' | 'limited' | 'personal' | 'svip' | 'pro'

// 档位默认单次价格（与后端 TIER_DEFAULT_PRICE 保持一致）
export const TIER_DEFAULT_PRICE: Record<TemplateTier, number> = {
  free: 0,
  limited: 6.6,
  personal: 9.9,
  svip: 18.8,
  pro: 0,
}

// 模板档位判定：vipLevel 优先，兼容旧数据（is_paid / is_premium / vip_free）
export function getTemplateTier(t: any): TemplateTier {
  if (!t) return 'free'
  if (t.vipLevel) return t.vipLevel as TemplateTier
  if (t.is_premium) return 'pro'
  if (t.is_paid && t.vip_free) return 'personal'
  if (t.is_paid) return 'limited'
  return 'free'
}

// 限免版模板判定
export function isLimitedTemplate(t: any): boolean {
  return getTemplateTier(t) === 'limited'
}

// 模板按次价格：模板自身 price 优先，缺失时用档位默认价
export function getTierPrice(t: any): number {
  const p = Number(t?.price)
  if (p > 0) return p
  return TIER_DEFAULT_PRICE[getTemplateTier(t)] || 0
}

// 安全获取用户 store：iOS 上任何一步崩溃都会导致页面白屏，失败时用匿名兜底
function getSafeUserStore(): any {
  try {
    return useUserStore()
  } catch (e: any) {
    console.error('[useTemplateEntry] useUserStore FAIL:', e?.message || e)
    return {
      isVip: () => false,
      isPro: () => false,
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

  // 跳转按次付费页（支付成功后跳编辑器）
  function goPayForTemplate(template: any) {
    const price = getTierPrice(template)
    uni.navigateTo({
      url: `/pages/vip/index?mode=purchase&templateId=${template.id}&price=${price}&redirect=editor`,
    })
  }

  // 付费档（VIP版/SVIP版）入口：非特权用户弹 按次付费 / 开通会员
  function handlePaidTier(template: any, vipLabel: string) {
    haptic('light')
    const price = getTierPrice(template)
    uni.showActionSheet({
      itemList: [`¥${price} 制作一次`, vipLabel],
      success: (res: any) => {
        if (res.tapIndex === 0) {
          goPayForTemplate(template)
        } else if (res.tapIndex === 1) {
          uni.navigateTo({ url: '/pages/vip/index' })
        }
      },
    })
  }

  // 限免版模板点击：查剩余免费次数
  //   remaining>0 → 直接进编辑器（次数在编辑器内扣减）
  //   用尽且 used<2（第2次）→ 跳汉哈双语分享说明页（分享朋友圈得次数）
  //   用尽且 used>=2（第3次起）→ 弹 按次付费6.6 / 开通VIP
  async function handleLimitedTemplate(template: any) {
    haptic('light')
    const price = getTierPrice(template)
    let quota: any = null
    try {
      quota = await fetchTemplateQuota(template.id)
    } catch (e) {
      uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
      return
    }
    if (!quota || quota.limitless || quota.remaining > 0) {
      enterEditor(template)
      return
    }
    const used = quota.used ?? 1
    // 第2次使用：分享朋友圈（汉哈双语说明页）
    if (used < 2) {
      uni.navigateTo({
        url: `/pages/share-guide/index?templateId=${template.id}&price=${price}`,
      })
      return
    }
    // 第3次起：按次付费 / 开通VIP
    uni.showActionSheet({
      itemList: [`¥${price} 制作一次`, '开通VIP免费制作'],
      success: (res: any) => {
        if (res.tapIndex === 0) {
          goPayForTemplate(template)
        } else if (res.tapIndex === 1) {
          uni.navigateTo({ url: '/pages/vip/index' })
        }
      },
    })
  }

  // 统一入口：local- 兜底拦截 → 登录拦截 → 档位判定（限免版漏斗/付费档） → 进编辑器
  async function openTemplateEntry(template: any, options?: { isPurchased?: boolean }) {
    if (navigating.value) return
    // 本地兜底模板没有真实数据，点击提示稍后重试
    if (typeof template.id === 'string' && template.id.startsWith('local-')) {
      uni.showToast({ title: '模板数据加载失败，请稍后重试', icon: 'none' })
      return
    }
    // 登录拦截：未登录时跳转登录页
    if (!userStore.requireLogin()) return

    const tier = getTemplateTier(template)

    // 限免版：非 VIP 用户查免费次数，走 免费→分享→付费 漏斗
    if (tier === 'limited' && !userStore.isVip()) {
      await handleLimitedTemplate(template)
      return
    }

    // VIP版：非 VIP 会员每次付费 9.9
    if (tier === 'personal' && !userStore.isVip()) {
      handlePaidTier(template, '开通VIP免费制作')
      return
    }

    // SVIP版：非专业版每次付费 18.8（个人VIP不免费）
    if (tier === 'svip' && !userStore.isPro()) {
      handlePaidTier(template, '开通专业版免费制作')
      return
    }

    // 兼容旧数据：is_paid 但无 vipLevel 的付费模板，非 VIP 且未购买时弹 单买 / 开通VIP
    if (Boolean(template.is_paid)) {
      const isVip = userStore.isVip()
      if (!isVip && !(options?.isPurchased ?? false)) {
        haptic('light')
        const price = getTierPrice(template)
        uni.showActionSheet({
          itemList: [`单买 ${price}元`, '开通VIP免费使用'],
          success: (res: any) => {
            if (res.tapIndex === 0) {
              goPayForTemplate(template)
            } else if (res.tapIndex === 1) {
              uni.navigateTo({ url: '/pages/vip/index' })
            }
          },
        })
        return
      }
    }
    enterEditor(template)
  }

  return { openTemplateEntry, isLimitedTemplate, getTemplateTier, getTierPrice }
}