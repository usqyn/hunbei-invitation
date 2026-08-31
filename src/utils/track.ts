import { APP_VERSION, USE_CLOUD_FUNCTIONS, getFunctionName } from '@/config'

let sessionId = ''

function getSessionId(): string {
  if (!sessionId) {
    sessionId = uni.getStorageSync('track_session_id') || ''
    if (!sessionId) {
      sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
      uni.setStorageSync('track_session_id', sessionId)
    }
  }
  return sessionId
}

function getUserId(): string {
  try {
    const user = uni.getStorageSync('TOYtamaxia_user')
    return user?.phone || ''
  } catch {
    return ''
  }
}

let _platformCache: string | null = null
function getPlatform(): string {
  if (_platformCache !== null) return _platformCache
  try {
    // 优先使用新的 uni.getAppBaseInfo（小程序基础库 2.20.2+），失败则回退到 getSystemInfoSync
    let uniPlatform = ''
    // @ts-ignore uni.getAppBaseInfo 在部分平台不支持，需做兜底
    if (typeof uni.getAppBaseInfo === 'function') {
      // @ts-ignore
      const info = uni.getAppBaseInfo()
      uniPlatform = info?.uniPlatform || ''
    }
    if (!uniPlatform && typeof uni.getDeviceInfo === 'function') {
      // @ts-ignore
      const info = uni.getDeviceInfo()
      uniPlatform = info?.platform || ''
    }
    if (!uniPlatform) {
      // 兜底：旧基础库仍可使用 getSystemInfoSync（已废弃但不影响功能）
      const sysInfo = uni.getSystemInfoSync()
      // @ts-ignore
      uniPlatform = sysInfo?.uniPlatform || sysInfo?.platform || ''
    }
    _platformCache = uniPlatform || 'unknown'
  } catch (e) {
    _platformCache = 'unknown'
  }
  return _platformCache
}

/**
 * 埋点上报函数
 * @param event 事件名
 * @param params 事件参数对象
 * @param immediate 是否立即上报（默认 true，false 则加入队列批量上报）
 */
export function track(event: string, params?: Record<string, any>, immediate = true) {
  const payload = {
    event,
    params: params ? JSON.stringify(params) : '{}',
    platform: getPlatform(),
    version: APP_VERSION,
    session_id: getSessionId(),
    user_id: getUserId(),
    timestamp: Date.now(),
  }

  if (immediate) {
    // 立即上报
    callTrackApi('/api/track', payload, () => enqueue(payload))
  } else {
    enqueue(payload)
  }
}

/** 通过云函数 SDK 调用 track 接口（与 request.ts 一致，避免 HTTP 路由 404） */
function callTrackApi(path: string, data: any, onFail?: () => void) {
  // #ifdef MP-WEIXIN
  if (USE_CLOUD_FUNCTIONS) {
    wx.cloud.callFunction({
      name: getFunctionName(path),
      data: { path, httpMethod: 'POST', body: data, headers: { 'Content-Type': 'application/json' } },
      fail: () => { if (onFail) onFail() },
    })
    return
  }
  // #endif
  // 非云函数模式（H5 dev）回退 HTTP
  uni.request({
    url: `/api/track`,
    method: 'POST',
    data,
    header: { 'Content-Type': 'application/json' },
    timeout: 5000,
    fail: () => { if (onFail) onFail() },
  })
}

// 本地队列（批量上报）
const QUEUE_KEY = 'track_queue'
const MAX_QUEUE_SIZE = 100

function enqueue(payload: any) {
  try {
    let queue = uni.getStorageSync(QUEUE_KEY) || []
    if (!Array.isArray(queue)) queue = []
    queue.push(payload)
    if (queue.length > MAX_QUEUE_SIZE) queue = queue.slice(-MAX_QUEUE_SIZE)
    uni.setStorageSync(QUEUE_KEY, queue)
  } catch (e) { /* ignore */ }
}

/**
 * 批量上报队列中的事件（建议在 App.onShow 或页面 onShow 时调用）
 */
export function flushTrackQueue() {
  try {
    const queue = uni.getStorageSync(QUEUE_KEY) || []
    if (!Array.isArray(queue) || queue.length === 0) return

    // 清空队列
    uni.setStorageSync(QUEUE_KEY, [])

    // 批量上报
    callTrackApi('/api/track/batch', { events: queue }, () => {
      // 重新入队
      const existing = uni.getStorageSync(QUEUE_KEY) || []
      const combined = (Array.isArray(existing) ? existing : []).concat(queue)
      uni.setStorageSync(QUEUE_KEY, combined.slice(-MAX_QUEUE_SIZE))
    })
  } catch (e) { /* ignore */ }
}

// 页面曝光埋点（自动）
export function trackPageView(pageName: string, params?: Record<string, any>) {
  track('page_view', { page: pageName, ...params })
}

// 按钮点击埋点（自动）
export function trackClick(eventName: string, params?: Record<string, any>) {
  track(eventName, params)
}
