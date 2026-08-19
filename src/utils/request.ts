import { getRequestUrl, USE_CLOUD_FUNCTIONS, getFunctionName } from '@/config'

let loadingCount = 0

// 防止多个 401 响应触发多次 reLaunch 重定向
let _isRedirecting = false

function showLoadingSafe(title = '加载中...') {
  loadingCount++
  if (loadingCount === 1) uni.showLoading({ title, mask: true })
}

function hideLoadingSafe() {
  loadingCount = Math.max(0, loadingCount - 1)
  if (loadingCount === 0) {
    // 当 showToast 覆盖了 loading 时，hideLoading 会报 "toast can't be found"
    // fail 回调静默吞掉该错误，不影响业务
    uni.hideLoading({ fail: () => {} })
  }
}

function getToken(): string {
  try { return uni.getStorageSync('token') || '' } catch { return '' }
}

function parseUrlQuery(url: string): Record<string, string> {
  const idx = url.indexOf('?')
  if (idx === -1) return {}
  const search = url.slice(idx + 1)
  const params: Record<string, string> = {}
  search.split('&').forEach(pair => {
    const eq = pair.indexOf('=')
    if (eq === -1) return
    params[decodeURIComponent(pair.slice(0, eq))] = decodeURIComponent(pair.slice(eq + 1))
  })
  return params
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
  total?: number
}

export function request<T = any>(options: string | {
  url: string; method?: string; data?: any; header?: any; hideLoading?: boolean; timeout?: number
}): Promise<T> {
  if (typeof options === 'string') options = { url: options }
  const token = getToken()
  const header: Record<string, string> = { 'Content-Type': 'application/json', ...options.header }
  if (token) header['Authorization'] = `Bearer ${token}`
  if (!options.hideLoading) showLoadingSafe()
  return new Promise((resolve, reject) => {
    // ── 云函数模式：wx.cloud.callFunction ──
    if (USE_CLOUD_FUNCTIONS) {
      // #ifdef MP-WEIXIN
      const fnName = getFunctionName(options.url)
      const cleanPath = options.url.indexOf('?') === -1 ? options.url : options.url.slice(0, options.url.indexOf('?'))
      const queryObj = parseUrlQuery(options.url)
      const _method = (options.method || 'GET').toUpperCase()
      const isGetLike = _method === 'GET' || _method === 'HEAD' || _method === 'DELETE'
      const _t0 = Date.now()
      // 云函数调用偶发 success/fail 均不回调导致 Promise 永久挂起，
      // 必须加超时保护：超时后 reject，页面可重试或回退兜底数据
      // 20s：与模板广场等页面的统一超时一致，覆盖真机冷启动场景；上传等重操作可传 timeout 覆盖
      const _cloudTimeout = options.timeout || 20000
      let _cloudSettled = false
      const _timer = setTimeout(() => {
        if (_cloudSettled) return
        _cloudSettled = true
        if (!options.hideLoading) hideLoadingSafe()
        console.error(`[request] 云函数调用超时(${_cloudTimeout}ms): ${options.url}`)
        reject(new Error('请求超时'))
      }, _cloudTimeout)
      const _finishCloud = () => {
        if (_cloudSettled) return
        _cloudSettled = true
        clearTimeout(_timer)
      }
      wx.cloud.callFunction({
        name: fnName,
        data: {
          path: cleanPath,
          httpMethod: _method,
          // GET/HEAD/DELETE：options.data 与本地 uni.request 语义一致（拼入 query），
          // 否则云函数 handler 从 ctx.query 读取时参数丢失（如 /api/quota 的 templateId）
          query: { ...queryObj, ...(isGetLike && options.data ? options.data : {}) },
          body: isGetLike ? undefined : (options.data || {}),
          headers: header,
        },
        success: (res: any) => {
          _finishCloud()
          const elapsed = Date.now() - _t0
          if (!options.hideLoading) hideLoadingSafe()
          const result = res.result
          if (result && typeof result === 'object' && 'success' in result) {
            if (result.success) {
              resolve(result.data !== undefined ? (result.data as T) : (result as T))
            } else {
              console.error(`[request] 云函数业务失败: ${options.url}, elapsed=${elapsed}ms, error=`, result.error)
              if (result.error === '登录已过期' || result.error === '请先登录') {
                if (!_isRedirecting) {
                  _isRedirecting = true
                  setTimeout(() => { _isRedirecting = false }, 3000)
                  try { uni.removeStorageSync('token') } catch {}
                  try { uni.removeStorageSync('TOYtamaxia_user') } catch {}
                  uni.reLaunch({ url: '/pages/login/index', complete: () => { _isRedirecting = false } })
                  reject(new Error('登录已过期'))
                } else {
                  reject(new Error('redirecting'))
                }
              } else {
                reject(new Error(result.error || '请求失败'))
              }
            }
          } else {
            // iOS 微信云函数可能返回 null/undefined 或不完整响应
            if (result === null || result === undefined) {
              console.error(`[request] 云函数返回为空: ${options.url}, elapsed=${Date.now() - _t0}ms, result=`, result)
              reject(new Error('云函数返回为空'))
            } else {
              console.warn(`[request] 云函数返回非标准格式: ${options.url}, elapsed=${Date.now() - _t0}ms, keys=`, Object.keys(result))
              resolve(result as T)
            }
          }
        },
        fail: (err: any) => {
          _finishCloud()
          const elapsed = Date.now() - _t0
          if (!options.hideLoading) hideLoadingSafe()
          console.error(`[request] 云函数调用失败: ${options.url}, elapsed=${elapsed}ms, err=`, err)
          uni.showToast({ title: '网络异常', icon: 'none' })
          reject(new Error(err.errMsg || '网络异常'))
        },
      })
      return
      // #endif
    }

    uni.request({
      // 云函数模式下按 path 前缀分发到对应云函数 HTTP 触发器；
      // 非云函数模式（dev）退化为 API_BASE + path（走 vite proxy）
      url: getRequestUrl(options.url),
      method: (options.method as any) || 'GET',
      data: options.data,
      header,
      timeout: 30000,
      success: (res: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const body = res.data as ApiResponse<T>
          if (body && typeof body === 'object' && 'success' in body && body.data !== undefined) {
            if (body.success) resolve(body.data)
            else reject(new Error(body.error || '请求失败'))
          } else {
            resolve(body as any as T)
          }
        } else if (res.statusCode === 401) {
          if (!_isRedirecting) {
            _isRedirecting = true
            // 超时保护：3 秒后自动释放，防止 reLaunch 失败导致永久锁死
            setTimeout(() => { _isRedirecting = false }, 3000)
            try {
              uni.removeStorageSync('token')
              uni.removeStorageSync('TOYtamaxia_user')
              // 延迟重置 userStore 内存状态（避免循环依赖）
              import('@/stores/user').then(({ useUserStore }) => {
                try {
                  useUserStore().logout(false)
                } catch {}
              }).catch(() => {})
            } catch {}
            uni.reLaunch({
              url: '/pages/login/index',
              complete: () => {
                _isRedirecting = false
              }
            })
            reject(new Error('登录已过期'))
          } else {
            // 已经在重定向中，静默拒绝，避免调用方弹出重复提示
            reject(new Error('redirecting'))
            return
          }
        } else {
          // 解析服务端返回的错误详情
          const body = res.data
          let msg = `请求失败: ${res.statusCode}`
          if (body && typeof body === 'object') {
            msg = body.error || body.message || body.msg || msg
          }
          reject(new Error(msg))
        }
      },
      fail: (err: any) => {
        console.error(`[request] HTTP请求失败: ${options.url}, err=`, err)
        reject(new Error(err.errMsg || '网络异常'))
      },
      complete: () => { if (!options.hideLoading) hideLoadingSafe() },
    })
  })
}
