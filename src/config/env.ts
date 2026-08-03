/**
 * 微信小程序运行时环境检测
 *
 * 通过 wx.getAccountInfoSync() 获取当前小程序的运行版本环境：
 * - develop: 开发版（微信开发者工具中运行 / 预览扫码）
 * - trial:    体验版（上传后设为体验版，供指定成员测试）
 * - release:  正式版（经过审核并发布）
 *
 * 用法：
 *   import { getWechatEnvVersion, WECHAT_ENV } from '@/config/env'
 *   const env = getWechatEnvVersion()
 *   if (env === WECHAT_ENV.develop) { ... }
 *
 * ┌─────────────────┬──────────────────────────────────┐
 * │ 构建命令          │ 微信工具中    │ 体验版    │ 正式版  │
 * ├─────────────────┼──────────────┼─────────┼────────┤
 * │ dev:mp-weixin   │ develop      │ —       │ —      │
 * │ build:mp-weixin │ develop      │ trial   │ release│
 * └─────────────────┴──────────────┴─────────┴────────┘
 *
 * 建议：只需云打包一次 build:mp-weixin 上传，各环境自动切换 API。
 */

export const WECHAT_ENV = {
  develop: 'develop' as const,
  trial: 'trial' as const,
  release: 'release' as const,
}

export type WechatEnvVersion = (typeof WECHAT_ENV)[keyof typeof WECHAT_ENV]

/**
 * 获取微信小程序当前运行环境版本
 * 非微信小程序环境（H5/App/其他）返回 null
 */
export function getWechatEnvVersion(): WechatEnvVersion | null {
  // #ifdef MP-WEIXIN
  try {
    // @ts-ignore - wx 对象由微信运行时注入，uni-app 条件编译保证此处仅微信有效
    if (typeof wx !== 'undefined' && typeof wx.getAccountInfoSync === 'function') {
      const accountInfo = wx.getAccountInfoSync()
      const env = accountInfo?.miniProgram?.envVersion
      if (env && (env === 'develop' || env === 'trial' || env === 'release')) {
        return env as WechatEnvVersion
      }
    }
    // 微信环境但获取失败（极旧基础库）→ 降级为 release
    console.warn('[env] wx.getAccountInfoSync 不可用，降级为 release')
    return WECHAT_ENV.release
  } catch (e) {
    console.warn('[env] 获取微信环境版本失败，降级为 release:', e)
    return WECHAT_ENV.release
  }
  // #endif
  // #ifndef MP-WEIXIN
  return null
  // #endif
}

/**
 * 根据微信运行时环境获取对应的 API 基地址
 *
 * 优先级（从高到低）：
 * 1. 环境变量 VITE_WECHAT_DEV_API / VITE_WECHAT_TRIAL_API / VITE_WECHAT_RELEASE_API
 * 2. develop 模式：降级到 VITE_API_BASE（dev 模式通常为空字符串 → 走本地代理）
 * 3. trial / release 模式：降级到 VITE_API_BASE
 *
 * 设置示例（.env.mp-weixin）：
 *   VITE_WECHAT_DEV_API=http://127.0.0.1:3001      # 开发者工具连本地
 *   VITE_WECHAT_TRIAL_API=https://test-api.example.com  # 体验版连测试环境（可选）
 *   VITE_WECHAT_RELEASE_API=https://api.example.com     # 正式版连生产环境（可选，默认用 VITE_API_BASE）
 */
export function getWechatApiBase(fallbackBase: string): string {
  const env = getWechatEnvVersion()
  if (!env) return fallbackBase

  // ⚠️ 必须用显式点号访问 import.meta.env，Vite 编译时静态替换，不支持动态 key
  switch (env) {
    case WECHAT_ENV.develop: {
      const devApi = import.meta.env.VITE_WECHAT_DEV_API
      if (devApi !== undefined && devApi !== '') return devApi as string
      // develop 模式 VITE_API_BASE 为空 → 使用本地地址方便调试
      if (!fallbackBase || fallbackBase === '') return 'http://127.0.0.1:3001'
      return fallbackBase
    }
    case WECHAT_ENV.trial: {
      const trialApi = import.meta.env.VITE_WECHAT_TRIAL_API
      if (trialApi !== undefined && trialApi !== '') return trialApi as string
      return fallbackBase
    }
    case WECHAT_ENV.release: {
      const releaseApi = import.meta.env.VITE_WECHAT_RELEASE_API
      if (releaseApi !== undefined && releaseApi !== '') return releaseApi as string
      return fallbackBase
    }
    default:
      return fallbackBase
  }
}
