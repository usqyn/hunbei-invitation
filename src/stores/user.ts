import { defineStore } from 'pinia'
import { ref } from 'vue'
import { request } from '@/utils/request'
import { resolveUrl } from '@/utils/url'

const STORAGE_KEY = 'TOYtamaxia_user'

export type VipLevel = 0 | 1 | 2

export const VIP_LEVELS = {
  FREE: 0 as const,
  PERSONAL: 1 as const,
  PRO: 2 as const,
}

export const useUserStore = defineStore('user', () => {
  const isLoggedIn = ref(false)
  const nickname = ref('')
  const avatar = ref('')
  const phone = ref('')
  const token = ref('')
  const vipStatus = ref(0)
  const vipExpireAt = ref(0)
  const vipPlan = ref('')
  const vipLevel = ref<VipLevel>(0)

  function getVipLevel(): VipLevel {
    if (vipStatus.value !== 1) return VIP_LEVELS.FREE
    if (vipExpireAt.value && vipExpireAt.value > 0 && vipExpireAt.value < Date.now()) {
      return VIP_LEVELS.FREE
    }
    return vipLevel.value > 0 ? vipLevel.value as VipLevel : VIP_LEVELS.PERSONAL
  }

  function isVip(): boolean {
    return getVipLevel() >= VIP_LEVELS.PERSONAL
  }

  function isPro(): boolean {
    return getVipLevel() >= VIP_LEVELS.PRO
  }

  /** 清理已过期的 VIP 状态（应在 fetchUserInfo 等显式时机调用） */
  function clearExpiredVip() {
    if (vipStatus.value > 0 && vipExpireAt.value && vipExpireAt.value < Date.now()) {
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
        vipLevel: vipLevel.value,
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
        vipStatus.value = saved.vipStatus ?? 0
        vipExpireAt.value = saved.vipExpireAt || 0
        vipPlan.value = saved.vipPlan || ''
        vipLevel.value = (saved.vipLevel ?? 0) as VipLevel
        if (token.value) uni.setStorageSync('token', token.value)
      }
    } catch (e) { console.error('user restore failed', e) }
  }

  function setLogin(phoneNumber: string, nick?: string, tk?: string, vip?: { status?: number; expireAt?: number; plan?: string; level?: number }) {
    isLoggedIn.value = true
    phone.value = phoneNumber
    if (nick) nickname.value = nick
    if (tk) token.value = tk
    if (vip) {
      if (vip.status !== undefined) vipStatus.value = vip.status
      if (vip.expireAt !== undefined) vipExpireAt.value = vip.expireAt
      if (vip.plan !== undefined) vipPlan.value = vip.plan
      if (vip.level !== undefined) vipLevel.value = vip.level as VipLevel
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
    vipLevel.value = 0
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
        vip_level?: number
      }>({ url: '/api/user/login', method: 'POST', data: loginData })
      setLogin(res.phone, res.nickname, res.token, {
        status: res.vip_status,
        expireAt: res.vip_expire_at,
        plan: res.vip_plan,
        level: res.vip_level,
      })
      persist()
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
        vip_level?: number
      }>({ url: '/api/user/info', method: 'GET' })
      nickname.value = res.nickname
      avatar.value = resolveUrl(res.avatar || '')
      phone.value = res.phone
      if (res.vip_status !== undefined) vipStatus.value = res.vip_status
      if (res.vip_expire_at !== undefined) vipExpireAt.value = res.vip_expire_at
      if (res.vip_plan !== undefined) vipPlan.value = res.vip_plan
      if (res.vip_level !== undefined) vipLevel.value = res.vip_level as VipLevel
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

  return {
    isLoggedIn, nickname, avatar, phone, token,
    vipStatus, vipExpireAt, vipPlan, vipLevel,
    isVip, isPro, getVipLevel,
    setLogin, logout, doLogin, fetchUserInfo, requireLogin,
  }
})
