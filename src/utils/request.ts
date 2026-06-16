function getToken(): string {
  try { return uni.getStorageSync('token') || '' } catch { return '' }
}

export function request<T = any>(options: {
  url: string; method?: string; data?: any; header?: any; hideLoading?: boolean
}): Promise<T> {
  const token = getToken()
  const header: Record<string, string> = { 'Content-Type': 'application/json', ...options.header }
  if (token) header['Authorization'] = `Bearer ${token}`
  if (!options.hideLoading) uni.showLoading({ title: '加载中...', mask: true })
  return new Promise((resolve, reject) => {
    uni.request({
      url: 'https://api.hunbei.com' + options.url,
      method: options.method || 'GET',
      data: options.data,
      header,
      timeout: 15000,
      success: (res: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data as T)
        else if (res.statusCode === 401) {
          try { uni.removeStorageSync('token') } catch {}
          uni.reLaunch({ url: '/pages/login/index' })
          reject(new Error('登录已过期'))
        } else reject(new Error(`请求失败: ${res.statusCode}`))
      },
      fail: (err: any) => reject(new Error(err.errMsg || '网络异常')),
      complete: () => { if (!options.hideLoading) uni.hideLoading() },
    })
  })
}
