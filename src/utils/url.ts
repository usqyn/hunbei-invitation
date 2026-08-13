import { API_BASE, USE_CLOUD_FUNCTIONS, getFunctionName, CLOUD_BASE } from '@/config'
import { getWechatEnvVersion, WECHAT_ENV } from '@/config/env'

// 云函数模式下兜底的资源域名（当 API_BASE 为 localhost 时使用）
// 原生产资源域名（api 子域）公网不存在已废弃，统一以云 API 网关域名兜底。
const CLOUD_FALLBACK_ASSETS_BASE = CLOUD_BASE

// 云开发环境 ID：从 CLOUD_BASE（https://<envId>.service.tcloudbase.com）提取
// 用于把 /uploads/ 相对路径映射为云存储文件 ID cloud://envId/uploads/...
// （云网关 /uploads/ 路径不存在，拼网关会产生 404；cloud:// 由 resolveCloudUrl 换临时 URL）
const CLOUD_ENV_ID = CLOUD_BASE.replace(/^https:\/\//, '').replace(/\.service\.tcloudbase\.com$/, '')

// 本地开发（微信开发者工具 develop 模式）：云函数/云数据库返回的封面等资源 URL
// 若指向线上资源域名，本机可能无法解析（历史上曾因假域名导致图片全部加载失败，
// ERR_NAME_NOT_RESOLVED）。此处把线上资源域名主机重写为本地后端
// （VITE_WECHAT_DEV_API），仅 develop 模式生效，trial/release 不受影响。
const DEV_ASSETS_BASE =
  getWechatEnvVersion() === WECHAT_ENV.develop
    ? (import.meta.env.VITE_WECHAT_DEV_API || 'http://127.0.0.1:3001')
    : ''

// 本地开发：将线上资源域名重写为本地后端地址
function rewriteDevAssets(url: string): string {
  if (!DEV_ASSETS_BASE || !url.startsWith(CLOUD_FALLBACK_ASSETS_BASE)) return url
  const path = url.substring(CLOUD_FALLBACK_ASSETS_BASE.length)
  return DEV_ASSETS_BASE + (path.startsWith('/') ? path : '/' + path)
}

/**
 * 将后端返回的相对路径解析为完整 URL
 * 支持: http/https, data:, blob:, wxfile://, cloud://, 以及 /uploads/ 等相对路径
 * /static/ 开头为小程序包内本地资源，不拼接服务器地址
 * 小程序要求 HTTPS，对非 localhost 的 http:// 自动升级
 */
export function resolveUrl(url: string | undefined | null): string {
  if (!url) return ''
  // 输入即线上资源域名 → 直接重写（开发模式）
  const devRewritten = rewriteDevAssets(url)
  if (devRewritten !== url) return devRewritten
  const resolved = resolveUrlInternal(url)
  // 内部拼装也可能落到线上资源域名（CLOUD_FALLBACK_ASSETS_BASE），统一重写
  return rewriteDevAssets(resolved)
}

function resolveUrlInternal(url: string | undefined | null): string {
  if (!url) return ''
  if (url.startsWith('http://')) {
    const isLocalhost = url.includes('127.0.0.1') || url.includes('localhost')
    // 非 localhost HTTP → 自动升级 HTTPS
    if (!isLocalhost) {
      return url.replace('http://', 'https://')
    }
    // localhost HTTP → 云函数模式下映射为云存储文件 ID（/uploads/ 路径）
    if (USE_CLOUD_FUNCTIONS) {
      const pathIdx = url.indexOf('/', url.indexOf('://') + 3)
      const path = pathIdx !== -1 ? url.substring(pathIdx) : '/'
      if (path.startsWith('/uploads/')) return `cloud://${CLOUD_ENV_ID}${path}`
      return CLOUD_FALLBACK_ASSETS_BASE + path
    }
    return url
  }
  if (
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:') ||
    url.startsWith('wxfile://') ||
    url.startsWith('cloud://') ||
    url.startsWith('/static/') ||
    url.startsWith('static/')
  ) {
    return url
  }
  // 云函数模式下：/uploads/ 相对路径直接映射为云存储文件 ID（避免拼网关 404）
  if (USE_CLOUD_FUNCTIONS && (url.startsWith('/uploads/') || url.startsWith('uploads/'))) {
    return `cloud://${CLOUD_ENV_ID}/${url.replace(/^\/+/, '')}`
  }
  // 相对路径拼接 API_BASE
  // 云函数模式下 API_BASE 可能是 localhost（体验版 fallback），此时用生产域名兜底
  let base = API_BASE
  if (USE_CLOUD_FUNCTIONS && (base.includes('127.0.0.1') || base.includes('localhost'))) {
    base = CLOUD_FALLBACK_ASSETS_BASE
  }
  const fullUrl = base + url
  if (fullUrl.startsWith('http://')) {
    const isLocalhost = fullUrl.includes('127.0.0.1') || fullUrl.includes('localhost')
    if (!isLocalhost) {
      return fullUrl.replace('http://', 'https://')
    }
    // localhost HTTP → 云函数模式下替换为 HTTPS 生产域名
    if (USE_CLOUD_FUNCTIONS) {
      const sep = url.startsWith('/') ? url : '/' + url
      return CLOUD_FALLBACK_ASSETS_BASE + sep
    }
  }
  return fullUrl
}

// ============ 云存储 URL 缓存与刷新 ============
// 解决云存储临时 URL 2 小时过期问题：
// 1. 上传时后端返回 cloudFileID（cloud:// 协议），前端缓存
// 2. 需要展示图片时，用 cloudFileID 换取临时 https URL
// 3. 缓存 1.5 小时（留 30 分钟余量），过期后重新换取
// 4. 图片加载失败时，清缓存并重试一次

interface CloudUrlEntry {
  url: string
  expireAt: number // 毫秒时间戳
}

// URL 缓存：cloud://fileID → { url, expireAt }
const cloudUrlCache = new Map<string, CloudUrlEntry>()

// 缓存有效期：1.5 小时（云存储临时 URL 有效期 2 小时，留 30 分钟余量）
const CACHE_TTL = 1.5 * 60 * 60 * 1000

// 是否为 cloud:// 协议 URL
export function isCloudUrl(url: string): boolean {
  return typeof url === 'string' && url.startsWith('cloud://')
}

// 内存缓存读写（避免短时间内重复请求后端）
function getCachedCloudUrl(fileID: string): string | null {
  const entry = cloudUrlCache.get(fileID)
  if (entry && Date.now() < entry.expireAt) {
    return entry.url
  }
  if (entry) cloudUrlCache.delete(fileID)
  return null
}

function setCachedCloudUrl(fileID: string, url: string): void {
  cloudUrlCache.set(fileID, { url, expireAt: Date.now() + CACHE_TTL })
}

// 清除单个 fileID 的缓存（图片加载失败时调用）
export function invalidateCloudUrl(fileID: string): void {
  cloudUrlCache.delete(fileID)
}

// 清除所有缓存
export function invalidateAllCloudUrls(): void {
  cloudUrlCache.clear()
}

// 直接调用 wx.cloud.callFunction 刷新云存储 URL（避免循环依赖）
let _refreshUrlFn: ((fileID: string) => Promise<string>) | null = null
async function getRefreshUrlFn(): Promise<(fileID: string) => Promise<string>> {
  if (_refreshUrlFn) return _refreshUrlFn
  // #ifdef MP-WEIXIN
  _refreshUrlFn = async (fileID: string): Promise<string> => {
    const fnName = getFunctionName('/api/refresh-url')
    const t0 = Date.now()
    // 超时保护：iOS 上云函数偶发 success/fail 均不回调，避免永久挂起
    const res = await new Promise<any>((resolve, reject) => {
      let settled = false
      const timer = setTimeout(() => {
        if (settled) return
        settled = true
        console.error(`[cloud-url] 刷新URL超时(15s): ${fileID}`)
        reject(new Error('刷新 URL 超时'))
      }, 15000)
      wx.cloud.callFunction({
        name: fnName,
        data: {
          path: '/api/refresh-url',
          httpMethod: 'POST',
          query: {},
          body: { fileID },
          headers: {},
        },
        success: (r: any) => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          resolve(r.result)
        },
        fail: (err: any) => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          reject(err)
        },
      })
    })
    const elapsed = Date.now() - t0
    if (res && res.success && res.data?.url) {
      return res.data.url
    }
    console.error(`[cloud-url] 刷新URL失败: elapsed=${elapsed}ms, fileID=${fileID}, res=`, res)
    throw new Error(res?.error || '刷新 URL 失败')
  }
  // #endif
  // #ifndef MP-WEIXIN
  _refreshUrlFn = async (fileID: string): Promise<string> => {
    const { request } = await import('@/utils/request')
    const res = await request<{ url: string; fileID: string }>({
      url: '/api/refresh-url',
      method: 'POST',
      data: { fileID },
      hideLoading: true,
    })
    return res.url
  }
  // #endif
  return _refreshUrlFn
}

/**
 * 把 cloud:// URL 换取 https 临时 URL（带缓存）
 *
 * - 非 cloud:// 协议：原样返回
 * - cloud:// 且缓存有效：直接返回缓存
 * - cloud:// 且缓存过期或无：调用后端 /api/refresh-url 换取新 URL
 *
 * 注意：此函数仅云函数模式下有效；非云函数模式下原样返回（dev 不涉及云存储）
 *
 * @param url 原始 URL（可能是 cloud://、https://、相对路径等）
 * @returns 可直接用于 <image src> 的 https URL
 */
export async function resolveCloudUrl(url: string): Promise<string> {
  if (!url || !isCloudUrl(url)) return url
  // 非云函数模式：原样返回（dev 不应该出现 cloud:// URL，但兜底处理）
  if (!USE_CLOUD_FUNCTIONS) return url

  // 检查缓存
  const cached = getCachedCloudUrl(url)
  if (cached) return cached

  // 调用后端换取临时 URL
  try {
    const refreshUrl = await getRefreshUrlFn()
    const httpsUrl = await refreshUrl(url)
    setCachedCloudUrl(url, httpsUrl)
    return httpsUrl
  } catch (e) {
    console.warn('[cloud-url] 刷新 URL 失败:', url, e)
    return url // 返回原始 cloud:// URL，让 image 加载失败
  }
}

/**
 * 同步版本：从缓存中获取临时 URL，无缓存则返回原 URL
 * 适用于组件首次渲染（不阻塞），异步刷新后通过响应式更新触发重渲染
 */
export function resolveCloudUrlSync(url: string): string {
  if (!url || !isCloudUrl(url)) return url
  const cached = getCachedCloudUrl(url)
  return cached || url
}
