import { defineStore } from 'pinia'
import { ref } from 'vue'
import { request } from '@/utils/request'

const STORAGE_KEY = 'hunbei_user'

export const useUserStore = defineStore('user', () => {
  const isLoggedIn = ref(false)
  const nickname = ref('')
  const avatar = ref('')
  const phone = ref('')
  const token = ref('')
  const vipStatus = ref(0)
  const vipExpireAt = ref(0)
  const vipPlan = ref('')

  /** 纯函数：判断是否为 VIP，不修改任何状态 */
  function checkVip(): boolean {
    if (vipStatus.value !== 1) return false
    // vipExpireAt 为 0 表示永久 VIP（服务端未设过期时间），视为有效
    if (vipExpireAt.value && vipExpireAt.value > 0 && vipExpireAt.value < Date.now()) {
      return false
    }
    return true
  }

  /** 判断当前是否为 VIP（纯查询，不产生副作用） */
  function isVip(): boolean {
    return checkVip()
  }

  /** 清理已过期的 VIP 状态（应在 fetchUserInfo 等显式时机调用） */
  function clearExpiredVip() {
    if (vipStatus.value === 1 && vipExpireAt.value && vipExpireAt.value < Date.now()) {
      vipStatus.value = 0
      persist()
    }
  }

  function persist() {
    try {
      uni.setStorageSync(STORAGE_KEY, {
        isLoggedIn: isLoggedIn.value,
        nickname: nickname.value,
        avatar: avatar.value,
        phone: phone.value,
        token: token.value,
        vipStatus: vipStatus.value,
        vipExpireAt: vipExpireAt.value,
        vipPlan: vipPlan.value,
      })
      if (token.value) uni.setStorageSync('token', token.value)
    } catch (e) { console.error('user persist failed', e) }
  }

  function restore() {
    try {
      const saved = uni.getStorageSync(STORAGE_KEY)
      if (saved) {
        isLoggedIn.value = saved.isLoggedIn || false
        nickname.value = saved.nickname || ''
        avatar.value = saved.avatar || ''
        phone.value = saved.phone || ''
        token.value = saved.token || ''
        vipStatus.value = saved.vipStatus || 0
        vipExpireAt.value = saved.vipExpireAt || 0
        vipPlan.value = saved.vipPlan || ''
        if (token.value) uni.setStorageSync('token', token.value)
      }
    } catch (e) { console.error('user restore failed', e) }
  }

  function setLogin(phoneNumber: string, nick?: string, tk?: string, vip?: { status?: number; expireAt?: number; plan?: string }) {
    isLoggedIn.value = true
    phone.value = phoneNumber
    if (nick) nickname.value = nick
    if (tk) token.value = tk
    if (vip) {
      if (vip.status !== undefined) vipStatus.value = vip.status
      if (vip.expireAt !== undefined) vipExpireAt.value = vip.expireAt
      if (vip.plan !== undefined) vipPlan.value = vip.plan
    }
    persist()
  }

  async function logout(navigateToLogin = true) {
    isLoggedIn.value = false
    nickname.value = ''
    avatar.value = ''
    phone.value = ''
    token.value = ''
    vipStatus.value = 0
    vipExpireAt.value = 0
    vipPlan.value = ''
    try { uni.removeStorageSync(STORAGE_KEY); uni.removeStorageSync('token') } catch {}
    // 清除作品数据，防止下个用户看到上个用户的作品
    try {
      const { useWorksStore } = await import('@/stores/works')
      const worksStore = useWorksStore()
      worksStore.reset()
    } catch {}
    if (navigateToLogin) {
      uni.reLaunch({ url: '/pages/login/index' })
    }
  }

  async function doLogin(loginData: { phone?: string; code?: string; encryptedData?: string; iv?: string }) {
    try {
      const res = await request<{
        token: string
        nickname: string
        phone: string
        vip_status?: number
        vip_expire_at?: number
        vip_plan?: string
      }>({ url: '/api/user/login', method: 'POST', data: loginData })
      setLogin(res.phone, res.nickname, res.token, {
        status: res.vip_status,
        expireAt: res.vip_expire_at,
        plan: res.vip_plan,
      })
      return true
    } catch (e: any) {
      uni.showToast({ title: e.message || '登录失败', icon: 'none' })
      return false
    }
  }

  async function fetchUserInfo() {
    if (!isLoggedIn.value) return
    try {
      const res = await request<{
        nickname: string
        phone: string
        avatar: string
        vip_status?: number
        vip_expire_at?: number
        vip_plan?: string
      }>({ url: '/api/user/info', method: 'GET' })
      nickname.value = res.nickname
      avatar.value = res.avatar || ''
      phone.value = res.phone
      if (res.vip_status !== undefined) vipStatus.value = res.vip_status
      if (res.vip_expire_at !== undefined) vipExpireAt.value = res.vip_expire_at
      if (res.vip_plan !== undefined) vipPlan.value = res.vip_plan
      // 拉取最新用户信息后，清理已过期的 VIP 状态（统一在此处做副作用清理）
      clearExpiredVip()
      persist()
    } catch (e) { console.error('fetchUserInfo failed', e) }
  }

  function requireLogin(): boolean {
    if (isLoggedIn.value) return true
    uni.navigateTo({ url: '/pages/login/index' })
    return false
  }

  restore()

  return { isLoggedIn, nickname, avatar, phone, token, vipStatus, vipExpireAt, vipPlan, isVip, checkVip, setLogin, logout, doLogin, fetchUserInfo, requireLogin }
})
