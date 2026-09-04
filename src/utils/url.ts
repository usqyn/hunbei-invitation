import { API_BASE, USE_CLOUD_FUNCTIONS, getFunctionName, CLOUD_BASE, CLOUD_ENV_ID } from '@/config'
import { getWechatEnvVersion, WECHAT_ENV } from '@/config/env'

// 云函数模式下兜底的资源域名（当 API_BASE 为 localhost 时使用）
// 原生产资源域名（api 子域）公网不存在已废弃，统一以云 API 网关域名兜底。
const CLOUD_FALLBACK_ASSETS_BASE = CLOUD_BASE

// 云开发环境 ID：直接取自 config（VITE_CLOUD_ENV_ID），形如 cloud1-xxxxxxxx。
// 用于把 /uploads/ 相对路径映射为云存储文件 ID cloud://<envId>/uploads/...
// （云网关 /uploads/ 路径不存在，拼网关会产生 404；cloud:// 由 resolveCloudUrl 换临时 URL）
//
// ⚠️ 历史 bug：此处曾从 CLOUD_BASE 用正则 /\.service\.tcloudbase\.com$/ 反推 envId，
// 但生产域名是 .app.tcloudbase.com，正则不匹配导致整个域名被当成 envId，
// 拼出非法 fileID（cloud://cloud1-xxx.ap-guangzhou.app.tcloudbase.com/uploads/...），
// 使 /api/refresh-url 换取临时链接全部失败，云存储图片一张都加载不出来。
// 绝不要再从 CLOUD_BASE 反推 envId：域名后缀会随地域/控制台变化。

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
  // 微信本地临时文件（wxfile:// / http://tmp/ / file://）原样返回：
  // 绝不能走 http→https 升级，否则变成非法的 https://tmp/（DNS 解析必失败）
  if (url.startsWith('wxfile://') || url.startsWith('file://') || /^http:\/\/tmp\//.test(url)) {
    return url
  }
  if (url.startsWith('http://')) {
    const isLocalhost = url.includes('127.0.0.1') || url.includes('localhost')
    // 非 localhost HTTP → 自动升级 HTTPS
    if (!isLocalhost) {
      const upgraded = url.replace('http://', 'https://')
      // 历史脏数据兜底：「云网关域名 + /uploads/ 路径」（网关无此路由必然 404）→ cloud:// fileID
      if (USE_CLOUD_FUNCTIONS && CLOUD_ENV_ID && upgraded.startsWith(CLOUD_FALLBACK_ASSETS_BASE)) {
        const p = upgraded.substring(CLOUD_FALLBACK_ASSETS_BASE.length)
        if (p.startsWith('/uploads/')) return `cloud://${CLOUD_ENV_ID}${p}`
      }
      return upgraded
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
    // https://tmp/ 是微信临时文件的错误编码格式，不是合法域名，直接丢弃
    if (url.startsWith('https://tmp/')) return ''
    // 历史脏数据兜底：「云网关域名 + /uploads/ 路径」在网关无此路由（trial/release 必然 404；
    // devtools 因 rewriteDevAssets 重写到本地后端而"看起来正常"）。反推为 cloud:// fileID，
    // 交由 resolveCloudUrl 换临时链接 / cloud.downloadFile 免白名单加载。
    if (USE_CLOUD_FUNCTIONS && CLOUD_ENV_ID && url.startsWith(CLOUD_FALLBACK_ASSETS_BASE)) {
      const p = url.substring(CLOUD_FALLBACK_ASSETS_BASE.length)
      if (p.startsWith('/uploads/')) return `cloud://${CLOUD_ENV_ID}${p}`
    }
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

// ============ 持久化缓存（避免 app 重启后重复换取） ============
// 内存缓存重启即失，所有 cloud:// URL 需重新换取（冷启动 1-5s）。
// 启动时从 uni storage 同步加载到内存，写入时节流（5s）异步持久化。
// LRU 上限 50 条，避免无限增长撑大 storage。
const PERSIST_KEY = 'cloud_url_cache'
const PERSIST_MAX_ENTRIES = 50
const PERSIST_DELAY = 5000
let _persistTimer: ReturnType<typeof setTimeout> | null = null
let _persistLoaded = false

// 惰性加载持久化缓存到内存（同步，仅执行一次）
function ensurePersistLoaded(): void {
  if (_persistLoaded) return
  _persistLoaded = true
  try {
    const stored = uni.getStorageSync(PERSIST_KEY)
    if (stored && typeof stored === 'object') {
      const now = Date.now()
      for (const [fileID, entry] of Object.entries(stored) as [string, CloudUrlEntry][]) {
        if (entry && typeof entry.expireAt === 'number' && now < entry.expireAt) {
          cloudUrlCache.set(fileID, entry)
        }
      }
    }
  } catch { /* uni 不可用时忽略 */ }
}

// 节流异步写入 storage（不阻塞 UI）
function schedulePersist(): void {
  if (_persistTimer) return
  _persistTimer = setTimeout(flushCloudUrlCache, PERSIST_DELAY)
}

// 立即写入 storage（退出时调用，确保数据不丢失）
export function flushCloudUrlCache(): void {
  if (_persistTimer) {
    clearTimeout(_persistTimer)
    _persistTimer = null
  }
  const snapshot: Record<string, CloudUrlEntry> = {}
  let count = 0
  const now = Date.now()
  for (const [fileID, entry] of cloudUrlCache) {
    if (now < entry.expireAt) {
      snapshot[fileID] = entry
      if (++count >= PERSIST_MAX_ENTRIES) break
    }
  }
  try {
    uni.setStorage({ key: PERSIST_KEY, data: snapshot, fail: () => {} })
  } catch { /* uni 不可用时忽略 */ }
}

// 是否为 cloud:// 协议 URL
export function isCloudUrl(url: string): boolean {
  return typeof url === 'string' && url.startsWith('cloud://')
}

/**
 * 从云存储 https 临时链接反推 cloud:// fileID：
 *   https://<bucket>.tcb.qcloud.la/<path>?sign=...&t=...
 *   → cloud://<envId>.<bucket>/<path>
 * 服务端接口可能直接下发已签名的 https 链接（而非 cloud://），链接过期 403 后
 * 可用反推出的 fileID 走 wx.cloud.downloadFile 免白名单降级。
 * 非 tcb.qcloud.la 主机（普通网络图/本地资源）返回空串。
 */
export function tempHttpsToCloudFileId(url: string): string {
  if (!url || !CLOUD_ENV_ID || !url.startsWith('https://')) return ''
  const m = /^https:\/\/([^/]+)\/([^?]+)/.exec(url)
  if (!m) return ''
  const host = m[1]
  const path = m[2]
  const bucket = host.endsWith('.tcb.qcloud.la') ? host.slice(0, -'.tcb.qcloud.la'.length) : ''
  if (!bucket) return ''
  return `cloud://${CLOUD_ENV_ID}.${bucket}/${path}`
}

// 内存缓存读写（避免短时间内重复请求后端）
function getCachedCloudUrl(fileID: string): string | null {
  const entry = cloudUrlCache.get(fileID)
  if (entry && Date.now() < entry.expireAt) {
    return entry.url
  }
  if (entry) cloudUrlCache.delete(fileID)
  // 持久化缓存回填（仅加载一次，同步）
  ensurePersistLoaded()
  // 回填后再查一次内存
  const fromPersist = cloudUrlCache.get(fileID)
  if (fromPersist && Date.now() < fromPersist.expireAt) {
    return fromPersist.url
  }
  return null
}

// 从临时链接的 ?t=<秒级时间戳> 解析链接自身的过期时间。
// 云存储签名 URL 形如 https://<bucket>.tcb.qcloud.la/<path>?sign=...&t=<expireSec>，
// t 是签发方写入的过期时刻（不同签发方有效期不同：客户端 getTempFileURL 约 2h，
// node-sdk/云函数路由可能更短）。本地缓存 TTL 不能假设链接活 2h，必须以 t 为准，
// 否则持久化缓存会把已 403 的死链接当有效链接反复渲染。
function parseTempUrlExpireAt(url: string): number | null {
  try {
    const m = /[?&]t=(\d{10})(?:&|$)/.exec(url)
    if (!m) return null
    const sec = parseInt(m[1], 10)
    return sec > 1_000_000_000 ? sec * 1000 : null
  } catch {
    return null
  }
}

function setCachedCloudUrl(fileID: string, url: string): void {
  const ttlExpireAt = Date.now() + CACHE_TTL
  const urlExpireAt = parseTempUrlExpireAt(url)
  // 以链接签名过期时间为准（预留 60s 安全余量），同时不超过本地 TTL；
  // 解析不到 t 时回退默认 TTL
  const expireAt = urlExpireAt
    ? Math.max(Date.now() + 30_000, Math.min(ttlExpireAt, urlExpireAt - 60_000))
    : ttlExpireAt
  cloudUrlCache.set(fileID, { url, expireAt })
  // LRU：超过上限删除最早插入的条目（Map 保持插入顺序）
  if (cloudUrlCache.size > PERSIST_MAX_ENTRIES) {
    const firstKey = cloudUrlCache.keys().next().value
    if (firstKey) cloudUrlCache.delete(firstKey)
  }
  // 节流异步持久化
  schedulePersist()
}

// 清除单个 fileID 的缓存（图片加载失败时调用）
export function invalidateCloudUrl(fileID: string): void {
  cloudUrlCache.delete(fileID)
  schedulePersist()
}

// 清除所有缓存
export function invalidateAllCloudUrls(): void {
  cloudUrlCache.clear()
  schedulePersist()
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
 * 把 cloud:// URL 换取 https 临时 URL（带缓存 + 并发去重 + 微批合并）
 *
 * - 非 cloud:// 协议：原样返回
 * - cloud:// 且缓存有效：直接返回缓存
 * - cloud:// 且缓存过期或无：调用后端换取新 URL
 *   （20ms 窗口内的请求合并为一次 /api/refresh-urls 批量调用，
 *   避免列表页 N 张封面图 → N 次云函数冷启动调用）
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

  try {
    const httpsUrl = await resolveCloudUrlQueued(url)
    return httpsUrl || url
  } catch (e) {
    console.warn('[cloud-url] 刷新 URL 失败:', url, e)
    return url // 返回原始 cloud:// URL，让 image 加载失败
  }
}

// ============ 批量合并换取（列表页加载性能优化） ============
// 列表页每张封面一个 cloud://，逐个调用云函数受冷启动影响可达数秒。
// 20ms 窗口内到达的请求合并为一次 /api/refresh-urls 批量调用（单次最多 50 个），
// 同一 fileID 的并发请求共享同一 Promise（去重）。

interface BatchWaiter {
  fileID: string
  resolve: (url: string) => void
  reject: (e: any) => void
}

const _inflightCloudUrls = new Map<string, Promise<string>>()
let _batchQueue: BatchWaiter[] = []
let _batchTimer: ReturnType<typeof setTimeout> | null = null
// 批量接口不可用时回退逐个调用（旧版云函数未部署 refresh-urls 路由的场景）
let _batchEndpointBroken = false

const BATCH_WINDOW_MS = 20
const BATCH_MAX_SIZE = 50

// ============ 客户端直连换取（优先路径，无云函数依赖） ============
// wx.cloud.getTempFileURL 是客户端 SDK 能力：无需云函数、无冷启动、支持批量（≤50）。
// <image> 组件加载 https 图片不要求域名白名单，因此这是小程序内最可靠的换取方式。
// 云函数路由（/api/refresh-urls、/api/refresh-url）仅作降级备用。
let _directTempFileFn: ((fileIDs: string[]) => Promise<Map<string, string>>) | null = null
function getTempFileUrlsDirect(): (fileIDs: string[]) => Promise<Map<string, string>> {
  if (_directTempFileFn) return _directTempFileFn
  // #ifdef MP-WEIXIN
  _directTempFileFn = (fileIDs: string[]): Promise<Map<string, string>> => {
    return new Promise((resolve, reject) => {
      if (typeof wx === 'undefined' || !wx.cloud || typeof wx.cloud.getTempFileURL !== 'function') {
        reject(new Error('wx.cloud.getTempFileURL 不可用'))
        return
      }
      wx.cloud.getTempFileURL({
        fileList: fileIDs,
        success: (res: any) => {
          const map = new Map<string, string>()
          for (const f of (res.fileList || [])) {
            // status===0 表示成功；失败项没有 tempFileURL
            if (f?.fileID && f?.tempFileURL && f.status === 0) {
              map.set(f.fileID, f.tempFileURL)
            }
          }
          resolve(map)
        },
        fail: (err: any) => reject(err),
      })
    })
  }
  // #endif
  // #ifndef MP-WEIXIN
  _directTempFileFn = async (): Promise<Map<string, string>> => {
    throw new Error('非小程序环境无客户端直连能力')
  }
  // #endif
  return _directTempFileFn
}

// 批量刷新原始调用（与 getRefreshUrlFn 同构，按运行环境区分）
let _batchRefreshFn: ((fileIDs: string[]) => Promise<Map<string, string>>) | null = null
function getBatchRefreshFn(): (fileIDs: string[]) => Promise<Map<string, string>> {
  if (_batchRefreshFn) return _batchRefreshFn
  // #ifdef MP-WEIXIN
  _batchRefreshFn = async (fileIDs: string[]): Promise<Map<string, string>> => {
    const fnName = getFunctionName('/api/refresh-urls')
    // 超时保护：同 getRefreshUrlFn，防 iOS 云函数回调丢失导致永久挂起
    const res = await new Promise<any>((resolve, reject) => {
      let settled = false
      const timer = setTimeout(() => {
        if (settled) return
        settled = true
        reject(new Error('批量刷新 URL 超时(15s)'))
      }, 15000)
      wx.cloud.callFunction({
        name: fnName,
        data: {
          path: '/api/refresh-urls',
          httpMethod: 'POST',
          query: {},
          body: { fileIDs },
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
    const rows = res && res.success ? res.data : null
    if (!Array.isArray(rows)) throw new Error(res?.error || '批量刷新 URL 失败')
    const map = new Map<string, string>()
    for (const row of rows) {
      if (row?.fileID && row?.url) map.set(row.fileID, row.url)
    }
    return map
  }
  // #endif
  // #ifndef MP-WEIXIN
  _batchRefreshFn = async (fileIDs: string[]): Promise<Map<string, string>> => {
    const { request } = await import('@/utils/request')
    const rows = await request<Array<{ fileID: string; url: string }>>({
      url: '/api/refresh-urls',
      method: 'POST',
      data: { fileIDs },
      hideLoading: true,
    })
    const map = new Map<string, string>()
    for (const row of rows || []) {
      if (row?.fileID && row?.url) map.set(row.fileID, row.url)
    }
    return map
  }
  // #endif
  return _batchRefreshFn
}

// 批量失败时回退：逐个调用单文件接口（并行，量小且仅在回退时发生）
async function refreshChunkIndividually(chunk: BatchWaiter[]): Promise<void> {
  const refreshUrl = await getRefreshUrlFn()
  await Promise.all(chunk.map(async (w) => {
    try {
      const u = await refreshUrl(w.fileID)
      setCachedCloudUrl(w.fileID, u)
      w.resolve(u)
    } catch (e) {
      w.reject(e)
    }
  }))
}

function flushCloudUrlBatch(): void {
  _batchTimer = null
  const batch = _batchQueue
  _batchQueue = []
  if (!batch.length) return
  // 分片（批量接口单次最多 50 个）
  for (let i = 0; i < batch.length; i += BATCH_MAX_SIZE) {
    const chunk = batch.slice(i, i + BATCH_MAX_SIZE)
    void (async () => {
      // 1) 优先客户端直连 wx.cloud.getTempFileURL（无云函数依赖、无冷启动）
      try {
        const directMap = await getTempFileUrlsDirect()(chunk.map(w => w.fileID))
        for (const w of chunk) {
          const u = directMap.get(w.fileID)
          if (u) {
            setCachedCloudUrl(w.fileID, u)
            w.resolve(u)
          } else {
            // 该 fileID 换取失败（可能文件不存在/无权限）
            w.reject(new Error('getTempFileURL 缺少结果: ' + w.fileID))
          }
        }
        return
      } catch {
        // 直连不可用（非 MP 环境或 wx.cloud 未初始化），继续走云函数链路
      }
      try {
        if (_batchEndpointBroken) {
          await refreshChunkIndividually(chunk)
          return
        }
        const map = await getBatchRefreshFn()(chunk.map(w => w.fileID))
        for (const w of chunk) {
          const u = map.get(w.fileID)
          if (u) {
            setCachedCloudUrl(w.fileID, u)
            w.resolve(u)
          } else {
            w.reject(new Error('批量刷新 URL 缺少结果: ' + w.fileID))
          }
        }
      } catch (e) {
        // 批量路由不可用 → 标记并回退逐个换取（本批立即重试）
        _batchEndpointBroken = true
        console.warn('[cloud-url] 批量刷新失败，回退逐个换取:', e)
        await refreshChunkIndividually(chunk)
      } finally {
        for (const w of chunk) _inflightCloudUrls.delete(w.fileID)
      }
    })()
  }
}

/**
 * 带并发去重 + 微批合并的 cloud:// 临时 URL 换取。
 * 同一 fileID 并发请求共享同一 Promise；窗口内请求合并为一次批量调用。
 */
function resolveCloudUrlQueued(fileID: string): Promise<string> {
  const cached = getCachedCloudUrl(fileID)
  if (cached) return Promise.resolve(cached)
  const inflight = _inflightCloudUrls.get(fileID)
  if (inflight) return inflight
  const p = new Promise<string>((resolve, reject) => {
    _batchQueue.push({ fileID, resolve, reject })
  })
  _inflightCloudUrls.set(fileID, p)
  if (!_batchTimer) {
    _batchTimer = setTimeout(flushCloudUrlBatch, BATCH_WINDOW_MS)
  }
  return p
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
