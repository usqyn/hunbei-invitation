import { API_BASE, USE_CLOUD_FUNCTIONS } from '@/config'

/**
 * 将后端返回的相对路径解析为完整 URL
 * 支持: http/https, data:, blob:, wxfile://, cloud://, 以及 /uploads/ 等相对路径
 * /static/ 开头为小程序包内本地资源，不拼接服务器地址
 */
export function resolveUrl(url: string | undefined | null): string {
  if (!url) return ''
  if (
    url.startsWith('http://') ||
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
  return API_BASE + url
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

// 动态 import request，避免循环依赖
let _refreshUrlFn: ((fileID: string) => Promise<string>) | null = null
async function getRefreshUrlFn(): Promise<(fileID: string) => Promise<string>> {
  if (_refreshUrlFn) return _refreshUrlFn
  // 动态加载，避免与 request.ts 形成循环依赖
  const { request } = await import('@/utils/request')
  _refreshUrlFn = async (fileID: string): Promise<string> => {
    const res = await request<{ url: string; fileID: string }>({
      url: '/api/refresh-url',
      method: 'POST',
      data: { fileID },
      hideLoading: true,
    })
    return res.url
  }
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
