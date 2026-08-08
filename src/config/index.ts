// API 基地址（生产环境通过 .env.production 覆盖）
// 注意：生产环境必须使用 HTTPS 保证传输安全
// H5 dev 环境下 .env.development 设置 VITE_API_BASE=（空字符串），走 vite proxy 避免跨域
// 小程序端不能用空字符串（uni.request 需要绝对 URL），用条件编译区分
// #ifdef H5
const _envBase = import.meta.env.VITE_API_BASE
export const API_BASE = _envBase !== undefined ? _envBase : 'http://localhost:3001'
// #endif
// #ifndef H5
// ─── 微信小程序：运行时自动检测版本环境，切换 API 地址 ───
// #ifdef MP-WEIXIN
function getWechatApiBase(fallbackBase: string): string {
  try {
    // @ts-ignore - wx 由微信运行时注入
    if (typeof wx === 'undefined' || typeof wx.getAccountInfoSync !== 'function') return fallbackBase
    const env = wx.getAccountInfoSync()?.miniProgram?.envVersion as string | undefined

    switch (env) {
      case 'develop': {
        // 开发者工具 / 预览扫码 → 优先使用 VITE_WECHAT_DEV_API，否则用 VITE_API_BASE
        const devApi = import.meta.env.VITE_WECHAT_DEV_API
        if (devApi) return devApi
        // develop 模式 + VITE_API_BASE 为空 → 连本地 dev server
        if (!fallbackBase || fallbackBase === '') return 'http://127.0.0.1:3001'
        return fallbackBase
      }
      case 'trial': {
        // 体验版 → 优先使用 VITE_WECHAT_TRIAL_API（独立测试环境），回落 VITE_API_BASE
        const trialApi = import.meta.env.VITE_WECHAT_TRIAL_API
        return (trialApi && trialApi !== '') ? trialApi : fallbackBase
      }
      case 'release':
      default: {
        // 正式版 → 优先使用 VITE_WECHAT_RELEASE_API，回落 VITE_API_BASE
        const releaseApi = import.meta.env.VITE_WECHAT_RELEASE_API
        return (releaseApi && releaseApi !== '') ? releaseApi : fallbackBase
      }
    }
  } catch {
    // 获取失败降级
    return fallbackBase
  }
}

export const API_BASE = getWechatApiBase(import.meta.env.VITE_API_BASE || 'http://127.0.0.1:3001')
// #endif
// #ifndef MP-WEIXIN
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:3001'
// #endif
// #endif

// ============ 云开发（CloudBase）配置 ============
// 云函数 HTTP 触发器 URL 形如：https://{envId}.service.tcloudbase.com/{functionName}
// 当 VITE_USE_CLOUD=1 时启用云函数模式，请求会按 path 前缀分发到对应云函数。
// H5 dev 默认关闭（走 vite proxy → 旧 Express 服务），生产环境通过 .env.production 开启。
export const CLOUD_ENV_ID = import.meta.env.VITE_CLOUD_ENV_ID || 'cloud1-d4gyvmo1d9a1e148a'
export const CLOUD_BASE = import.meta.env.VITE_CLOUD_BASE || `https://${CLOUD_ENV_ID}.service.tcloudbase.com`
export const USE_CLOUD_FUNCTIONS = import.meta.env.VITE_USE_CLOUD === '1' || import.meta.env.VITE_USE_CLOUD === 'true'

// 8 个云函数名常量
export const FN = {
  common: 'common',
  user: 'user',
  template: 'template',
  work: 'work',
  order: 'order',
  upload: 'upload',
  poster: 'poster',
  export: 'export',
} as const

// 根据 API path 返回对应的云函数名
// 路由分发规则（按 path 前缀匹配，注意顺序：更具体的路径优先）：
//   /api/poster/*           → poster
//   /api/export*            → export
//   /api/upload*            → upload
//   /api/fonts*             → upload
//   /api/music*             → upload
//   /api/orders*            → order
//   /api/vip/order          → order（注意：/api/vip/status 归 user）
//   /api/works*             → work
//   /api/categories         → template
//   /api/templates*         → template
//   /api/products*         → template
//   /api/user/login        → common（登录走 common 函数）
//   /api/user/info         → user
//   /api/user/profile      → user
//   /api/vip/status        → user
//   /api/favorites*        → user
//   /api/footprints*       → user
//   /api/notifications*    → user
//   其余（health/version/sms/admin/login/track/feedback）→ common
export function getFunctionName(path: string): string {
  // 优先匹配更具体的路径
  if (path.startsWith('/api/poster/')) return FN.poster
  if (path.startsWith('/api/export')) return FN.export
  if (path.startsWith('/api/upload')) return FN.upload
  if (path.startsWith('/api/fonts')) return FN.upload
  if (path.startsWith('/api/music')) return FN.upload
  if (path.startsWith('/api/orders')) return FN.order
  if (path === '/api/vip/order' || path.startsWith('/api/vip/order')) return FN.order
  if (path.startsWith('/api/works')) return FN.work
  if (path.startsWith('/api/categories') || path.startsWith('/api/templates') || path.startsWith('/api/products')) return FN.template
  // /api/user/login 走 common；其余 /api/user/* 走 user
  if (path === '/api/user/login') return FN.common
  if (path.startsWith('/api/user/') || path === '/api/user/info' || path === '/api/user/profile') return FN.user
  if (path === '/api/vip/status' || path.startsWith('/api/favorites') || path.startsWith('/api/footprints') || path.startsWith('/api/notifications')) return FN.user
  // 其余路径（health/version/sms/send/admin/login/track/feedback）走 common
  return FN.common
}

// 根据 API path 返回对应的云函数 URL（不含 api path 本身）
// 例如 /api/poster/templates → https://xxx.service.tcloudbase.com/poster
// 非云函数模式返回 API_BASE（dev 走 vite proxy）
export function getCloudFunctionUrl(path: string): string {
  if (USE_CLOUD_FUNCTIONS) {
    const fn = getFunctionName(path)
    return `${CLOUD_BASE}/${fn}`
  }
  return API_BASE
}

// 根据 API path 返回完整的请求 URL（云函数基址 + api path）
// - 云函数模式：CLOUD_BASE + '/' + functionName + path
//   例如 /api/poster/templates → https://xxx.service.tcloudbase.com/poster/api/poster/templates
// - 非云函数模式（dev）：API_BASE + path（走 vite proxy 或旧服务）
export function getRequestUrl(path: string): string {
  if (USE_CLOUD_FUNCTIONS) {
    return `${getCloudFunctionUrl(path)}${path}`
  }
  return `${API_BASE}${path}`
}

// ============ 应用版本 ============
// 从 package.json 读取版本号，避免硬编码导致版本不一致
import pkg from '../../package.json'
export const APP_VERSION = pkg.version

// ============ 首页配置 ============
export const HOME_CONFIG = {
  searchPlaceholder: '搜索模板名称/分类',
  defaultTab: '网红爆款',
  sections: {
    featured: { title: '精选模板' },
    allCategories: { title: '全部分类' },
  },
  moreText: '查看全部 ›',
  // banner 图片打包在 static 中（约 350KB），确保体验版可访问
  banners: [
    {
      image: '/static/images/banners/banner-1.jpg',
      linkType: 'category',
      linkValue: 'wedding',
    },
    {
      image: '/static/images/banners/banner-2.jpg',
      linkType: 'category',
      linkValue: 'festival-invitation',
    },
    {
      image: '/static/images/banners/banner-3.jpg',
      linkType: 'category',
      linkValue: 'festival',
    },
  ],
  featureCards: [
    {
      badge: '电子请帖',
      title: '婚礼请柬 免费制作',
      desc: '精美模板一键生成',
      categoryId: 'wedding',
      image: '/static/images/categories/wedding.jpg',
    },
    {
      badge: '节日邀请',
      title: '节日请柬制作',
      desc: '分享美好时光',
      categoryId: 'festival-invitation',
      image: '/static/images/categories/festival-invitation.jpg',
    },
  ],
}

// ============ 作品管理页配置 ============
export const WORKS_CONFIG = {
  notLoggedIn: {
    icon: '/static/images/icons/clipboard.svg',
    text: '登录后才可以看到作品记录哦',
    btnText: '立即登录',
  },
  emptyStates: {
    all: { icon: '/static/images/icons/mailbox.svg', text: '暂无作品', btnText: '去制作' },
    draft: { icon: '/static/images/icons/note.svg', text: '暂无草稿' },
    favorite: { icon: '/static/images/icons/heart.svg', text: '暂无收藏' },
  },
}

// ============ 模板页配置 ============
export const TEMPLATE_PAGE_CONFIG = {
  headerTitle: '模板广场',
  loadingText: '加载中...',
  errorText: '加载失败，点击重试',
  errorIcon: '/static/images/icons/warning.svg',
  emptyIcon: '/static/images/icons/document.svg',
  emptyText: '该分类暂无模板',
  selectBtnText: '立即制作',
  bottomHint: '— 更多模板持续更新中 —',
}
