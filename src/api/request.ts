const BASE_URL = ''

type RequestOptions = {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: Record<string, any>
  header?: Record<string, string>
}

export async function request<T = any>(options: RequestOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...options.header,
      },
      timeout: 10000,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T)
        } else {
          reject(new Error(`请求失败: ${res.statusCode}`))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络异常'))
      },
    })
  })
}

export function get<T = any>(url: string, data?: Record<string, any>) {
  return request<T>({ url, method: 'GET', data })
}

export function post<T = any>(url: string, data?: Record<string, any>) {
  return request<T>({ url, method: 'POST', data })
}

export function put<T = any>(url: string, data?: Record<string, any>) {
  return request<T>({ url, method: 'PUT', data })
}

export function del<T = any>(url: string, data?: Record<string, any>) {
  return request<T>({ url, method: 'DELETE', data })
}
