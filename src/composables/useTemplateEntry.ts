// 模板入口统一逻辑：登录拦截 → 进入编辑器（进门不收费）
// 计费模型改为「导出时付费」漏斗：
//   免费用户进任意模板即可编辑；导出图片/生成海报/分享/去水印 时才弹出付费闸门。
//   付费档（limited/personal/svip）为「永久解锁该模板」：在导出闸门处付费，支付成功后端解锁。
//   免费用户也可看广告获得带水印导出，不强制付费。
// 首页精选/付费卡片与模板列表页共用，保证各入口行为一致
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { useFeedback } from '@/composables/useFeedback'
import { addFootprint, fetchTemplateQuota } from '@/api'
import { showRewardedAd } from '@/utils/rewarded-ad'
import { track } from '@/utils/track'
import { prefetchTemplateData } from '@/utils/template-data'

// 防重复跳转（页面间共享，避免连点触发多次 navigateTo）
const navigating = ref(false)

// 页面 onShow 时复位导航锁，避免从编辑器返回后点击无响应
export function resetTemplateEntryNavigation() {
  navigating.value = false
}

// 导出闸门「待恢复动作」：用户选择「付费」跳转 VIP 页面，支付成功返回后由 onShow 恢复现场。
// 用导出对象持有，避免分包打包时把独立命名的导出函数 tree-shake 掉（曾报 not a function）。
export const exportGate = {
  _pending: null as (() => void) | null,
  setPendingGateAction(fn: () => void) {
    this._pending = fn
  },
  takePendingGateAction(): (() => void) | null {
    const fn = this._pending
    this._pending = null
    return fn
  },
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

// 模板档位判定：vipLevel 白名单优先，脏数据回退旧字段（与后端 getTemplateTier 一致）
const TIER_WHITELIST: TemplateTier[] = ['free', 'limited', 'personal', 'svip', 'pro']
export function getTemplateTier(t: any): TemplateTier {
  if (!t) return 'free'
  if (TIER_WHITELIST.includes(t.vipLevel)) return t.vipLevel as TemplateTier
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

// 记录浏览足迹：异步 + 静默失败。
// 后端按 templateId 关联模板名与封面；local- 开头的兜底模板无真实数据，直接跳过。
// 足迹仅供「我的足迹」展示，任何失败都绝不能阻塞进入编辑器/付费页，故吞掉异常。
async function recordFootprint(templateId: string) {
  try {
    if (!templateId || String(templateId).startsWith('local-')) return
    await addFootprint(templateId)
  } catch {
    /* 足迹失败静默忽略 */
  }
}

export function useTemplateEntry() {
  const userStore = getSafeUserStore()
  const { haptic } = useFeedback()

  // 进入编辑器（带防重复跳转）
  function enterEditor(template: any) {
    haptic('light')
    navigating.value = true
    // 点击瞬间预取模板 JSON（与编辑器加载共享去重缓存）：
    // 跳转页面栈初始化的几百毫秒内网络请求已在途，编辑器首屏等待显著缩短
    prefetchTemplateData(template.id)
    uni.navigateTo({
      url: `/pages/editor/index?templateId=${template.id}`,
      fail: () => { navigating.value = false },
    })
  }

  // 跳转付费页（由导出闸门在用户选择「付费解锁」时调用，支付成功 onShow 恢复导出现场）
  function goPayForTemplate(template: any, redirect = 'editor') {
    const price = getTierPrice(template)
    uni.navigateTo({
      url: `/pages/vip/index?mode=purchase&templateId=${template.id}&price=${price}&tier=${getTemplateTier(template)}&redirect=${redirect}`,
    })
  }

  // 统一入口：local- 兜底拦截 → 登录拦截 → 直接进编辑器（进门不收费，导出时才付费）
  function openTemplateEntry(template: any, options?: { isPurchased?: boolean }) {
    if (navigating.value) return
    // 本地兜底模板没有真实数据，点击提示稍后重试
    if (typeof template.id === 'string' && template.id.startsWith('local-')) {
      uni.showToast({ title: '模板数据加载失败，请稍后重试', icon: 'none' })
      return
    }
    // 登录拦截：未登录时跳转登录页
    if (!userStore.requireLogin()) return

    // 记录足迹（不 await：足迹失败不影响进入编辑器，避免网络慢时卡住跳转）
    void recordFootprint(template.id)

    // 计费模型：进门不收费，直接进入编辑器，付费在导出/海报/分享闸门处完成
    enterEditor(template)
  }

  return { openTemplateEntry, isLimitedTemplate, getTemplateTier, getTierPrice, goPayForTemplate }
}

// ====================== 导出 / 海报 / 分享 / 去水印 的付费闸门 ======================
// 注意：此模块同时被主包(pages/index、pages/template)与分包(pages/editor、pages/share)引用，
// 因此合并在此文件内可被主包同步注册，避免分包 LazyCodeLoading 下「同步 require 未注入模块」报错。

export type ExportAction = 'export' | 'poster' | 'share' | 'removeWatermark'

/**
 * 导出 / 海报 / 分享 / 去水印 前的付费闸门。
 * 免费用户：允许看广告后带水印继续（广告位未配置时静默放行，仅带水印）。
 * 已解锁（limitless：永久解锁该模板 / 免费 / 专业版）：直接放行。
 * 未解锁付费模板：弹窗引导「付费解锁 / 看广告带水印 / 取消」。
 *
 * @param templateId   目标模板 id
 * @param tier         模板档位，用于定价与文案
 * @param action       动作类型，决定弹窗文案与跳转回跳
 * @param run          通过闸门后要执行的动作（导出 / 生成海报 / 分享 / 去水印）
 */
export async function runWithExportGate(
  templateId: string,
  tier: 'free' | 'limited' | 'personal' | 'svip' | 'pro',
  action: ExportAction,
  run: () => void,
) {
  if (!templateId) {
    run()
    return
  }

  // 已解锁（永久解锁该模板 / 免费 / 专业版）直接放行：后端对这类返回 limitless=true
  let passed = false
  // 服务端权威档位/价格：云函数 /api/quota 返回 tier + price（模板自带 price 优先）。
  // 旧 Express 后端不返回这两个字段 → 回退调用方传入的 tier 与档位默认价。
  // 修复：此前调用方经 (editorStore as any).currentTemplate（不存在）取档位恒为 free，
  // 导致付费模板分享/导出弹窗显示 ¥0 并按错误档位下单。
  let effTier: TemplateTier = tier
  let effPrice = TIER_DEFAULT_PRICE[tier] || 0
  try {
    const quota = await fetchTemplateQuota(templateId)
    passed = !!quota?.limitless
    if (quota?.tier && TIER_WHITELIST.includes(quota.tier)) effTier = quota.tier
    if (typeof quota?.price === 'number' && quota.price > 0) effPrice = quota.price
  } catch (e) {
    // 查询失败不阻断用户体验，按未解锁走闸门流程
    passed = false
  }
  if (passed) {
    run()
    return
  }

  const actionText =
    action === 'poster'
      ? '生成分享海报'
      : action === 'share'
        ? '分享给好友'
        : action === 'removeWatermark'
          ? '去除水印'
          : '导出作品'

  const price = effPrice
  const priceText = price > 0 ? `¥${price}` : ''

  uni.showModal({
    title: '导出需要解锁',
    content: `${actionText}前需先解锁该模板${priceText ? `（${priceText} 永久解锁）` : ''}。\n现在解锁可导出无水印高清版本，或看广告获得带水印版本。`,
    confirmText: price > 0 ? '付费解锁' : '去解锁',
    cancelText: '看广告',
    success: async (res) => {
      if (res.confirm) {
        // 付费解锁：记录待执行动作，跳 VIP 购买页，支付成功 onShow 恢复
        exportGate.setPendingGateAction(run)
        const redirect = 'editor'
        const params = [
          `mode=purchase`,
          `templateId=${encodeURIComponent(templateId)}`,
          `tier=${effTier}`,
          `price=${price}`,
          `redirect=${redirect}`,
        ].join('&')
        track('export_gate_pay_click', { templateId, tier: effTier, action })
        uni.navigateTo({ url: `/pages/vip/index?${params}` })
      } else if (res.cancel) {
        // 看广告：看完则带水印继续，否则提示
        track('export_gate_ad_click', { templateId, tier, action })
        uni.showLoading({ title: '广告加载中...', mask: true })
        const watched = await showRewardedAd()
        uni.hideLoading({ fail: () => {} })
        if (watched) {
          uni.showToast({ title: '已解锁带水印版本', icon: 'none' })
          run()
        } else {
          uni.showToast({ title: '需看完广告才能带水印导出', icon: 'none' })
        }
      }
    },
  })
}
