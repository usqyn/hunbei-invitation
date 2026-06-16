import { defineStore } from 'pinia'
import { ref } from 'vue'
import { request } from '@/utils/request'

const STORAGE_KEY = 'hunbei_user'

export const useUserStore = defineStore('user', () => {
  const isLoggedIn = ref(false)
  const nickname = ref('')
  const phone = ref('')
  const token = ref('')

  function persist() {
    try {
      uni.setStorageSync(STORAGE_KEY, { isLoggedIn: isLoggedIn.value, nickname: nickname.value, phone: phone.value, token: token.value })
      if (token.value) uni.setStorageSync('token', token.value)
    } catch (e) { console.error('user persist failed', e) }
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
    } catch (e) { console.error('user restore failed', e) }
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
    } catch (e) { console.error('fetchUserInfo failed', e) }
  }

  restore()

  return { isLoggedIn, nickname, phone, token, setLogin, logout, doLogin, fetchUserInfo }
})
