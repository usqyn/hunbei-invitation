import { getRequestUrl } from '@/config'

let loadingCount = 0

// 防止多个 401 响应触发多次 reLaunch 重定向
let _isRedirecting = false

function showLoadingSafe(title = '加载中...') {
  loadingCount++
  if (loadingCount === 1) uni.showLoading({ title, mask: true })
}

function hideLoadingSafe() {
  loadingCount = Math.max(0, loadingCount - 1)
  if (loadingCount === 0) uni.hideLoading()
}

function getToken(): string {
  try { return uni.getStorageSync('token') || '' } catch { return '' }
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
  total?: number
}

export function request<T = any>(options: string | {
  url: string; method?: string; data?: any; header?: any; hideLoading?: boolean
}): Promise<T> {
  if (typeof options === 'string') options = { url: options }
  const token = getToken()
  const header: Record<string, string> = { 'Content-Type': 'application/json', ...options.header }
  if (token) header['Authorization'] = `Bearer ${token}`
  if (!options.hideLoading) showLoadingSafe()
  return new Promise((resolve, reject) => {
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
      fail: (err: any) => reject(new Error(err.errMsg || '网络异常')),
      complete: () => { if (!options.hideLoading) hideLoadingSafe() },
    })
  })
}
