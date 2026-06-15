import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'hunbei_user'

function getToken(): string {
  try { return uni.getStorageSync('token') || '' } catch { return '' }
}

function request<T = any>(options: {
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

export const useUserStore = defineStore('user', () => {
  const isLoggedIn = ref(false)
  const nickname = ref('')
  const phone = ref('')
  const token = ref('')

  function persist() {
    try {
      uni.setStorageSync(STORAGE_KEY, { isLoggedIn: isLoggedIn.value, nickname: nickname.value, phone: phone.value, token: token.value })
      if (token.value) uni.setStorageSync('token', token.value)
    } catch {}
  }

  function restore() {
    try {
      const saved = uni.getStorageSync(STORAGE_KEY)
      if (saved) {
        isLoggedIn.value = saved.isLoggedIn || false
        nickname.value = saved.nickname || ''
        phone.value = saved.phone || ''
        token.value = saved.token || ''
        if (token.value) uni.setStorageSync('token', token.value)
      }
    } catch {}
  }

  function setLogin(phoneNumber: string, nick?: string, tk?: string) {
    isLoggedIn.value = true
    phone.value = phoneNumber
    if (nick) nickname.value = nick
    if (tk) token.value = tk
    persist()
  }

  function logout() {
    isLoggedIn.value = false
    nickname.value = ''
    phone.value = ''
    token.value = ''
    try { uni.removeStorageSync(STORAGE_KEY); uni.removeStorageSync('token') } catch {}
  }

  async function doLogin(loginData: { phone?: string; code?: string; encryptedData?: string; iv?: string }) {
    try {
      const res = await request<{ token: string; nickname: string; phone: string }>({ url: '/api/user/login', method: 'POST', data: loginData })
      setLogin(res.phone, res.nickname, res.token)
      return true
    } catch (e: any) {
      uni.showToast({ title: e.message || '登录失败', icon: 'none' })
      return false
    }
  }

  async function fetchUserInfo() {
    if (!isLoggedIn.value) return
    try {
      const res = await request<{ nickname: string; phone: string; avatar: string }>({ url: '/api/user/info', method: 'GET' })
      nickname.value = res.nickname
      phone.value = res.phone
      persist()
    } catch {}
  }

  restore()

  return { isLoggedIn, nickname, phone, token, setLogin, logout, doLogin, fetchUserInfo }
})
