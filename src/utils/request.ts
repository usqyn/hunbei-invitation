import { API_BASE } from '@/config'

let loadingCount = 0

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
  console.log('[request-debug] options:', JSON.stringify(options), 'API_BASE:', API_BASE)
  const token = getToken()
  const header: Record<string, string> = { 'Content-Type': 'application/json', ...options.header }
  if (token) header['Authorization'] = `Bearer ${token}`
  if (!options.hideLoading) showLoadingSafe()
  return new Promise((resolve, reject) => {
    console.log('[request-debug] final URL:', API_BASE + options.url)
    uni.request({
      url: API_BASE + options.url,
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
          try { uni.removeStorageSync('token') } catch {}
          uni.reLaunch({ url: '/pages/login/index' })
          reject(new Error('登录已过期'))
        } else reject(new Error(`请求失败: ${res.statusCode}`))
      },
      fail: (err: any) => reject(new Error(err.errMsg || '网络异常')),
      complete: () => { if (!options.hideLoading) hideLoadingSafe() },
    })
  })
}
