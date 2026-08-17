import axios from 'axios'
import type { TemplateItem, Category } from '../types/template'

export const API_BASE = import.meta.env.VITE_API_BASE || ''

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

let adminToken = ''

export function setAdminToken(token: string) {
  adminToken = token
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  localStorage.setItem('admin_token', token)
}

export function getAdminToken(): string {
  return adminToken || localStorage.getItem('admin_token') || ''
}

export function clearAdminToken() {
  adminToken = ''
  delete api.defaults.headers.common['Authorization']
  localStorage.removeItem('admin_token')
}

// 解析 JWT payload（不校验签名，仅用于本地判断 role / 过期时间）
function decodeJwtPayload(token: string): { role?: string; phone?: string; exp?: number } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payloadStr = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(payloadStr)
    return payload
  } catch (_) {
    return null
  }
}

// 校验本地保存的 token 是否仍有效且具备 admin 角色
export function verifyAdminToken(): boolean {
  const token = getAdminToken()
  if (!token) return false
  const payload = decodeJwtPayload(token)
  if (!payload) return false
  if (payload.role !== 'admin') return false
  if (payload.exp && payload.exp * 1000 < Date.now()) return false
  return true
}

// 初始化：仅校验本地 token，不再静默使用普通用户登录接口
export async function initApi(): Promise<boolean> {
  if (verifyAdminToken()) {
    setAdminToken(getAdminToken())
    return true
  }
  // 本地无有效管理员 token，清空可能残留的普通用户 token
  clearAdminToken()
  return false
}

// 发送管理员手机号验证码
export async function sendSmsCode(phone: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await api.post('/api/sms/send', { phone })
    return { success: !!res.data.success, error: res.data.error }
  } catch (e: any) {
    return { success: false, error: e?.response?.data?.error || e?.message || '发送失败' }
  }
}

// 管理员登录：调用专用 /api/admin/login 接口签发带 role:'admin' 的 JWT
export async function adminLogin(phone: string, code: string): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const res = await api.post('/api/admin/login', { phone, code })
    if (res.data.success && res.data.data?.token) {
      setAdminToken(res.data.data.token)
      return { success: true, token: res.data.data.token }
    }
    return { success: false, error: res.data.error || '登录失败' }
  } catch (e: any) {
    return { success: false, error: e?.response?.data?.error || e?.message || '登录失败' }
  }
}

// ============ 模板 API ============

export async function fetchTemplates(category?: string): Promise<TemplateItem[]> {
  const params: Record<string, any> = { all: '1' }
  if (category) params.category = category
  const res = await api.get('/api/templates', { params })
  if (!res.data.success) throw new Error(res.data.error)
  return res.data.data || []
}

export async function fetchTemplate(id: string): Promise<TemplateItem> {
  const res = await api.get(`/api/templates/${id}`)
  if (!res.data.success) throw new Error(res.data.error)
  return res.data.data
}

export async function createTemplate(template: Partial<TemplateItem>): Promise<TemplateItem> {
  const res = await api.post('/api/templates', template)
  if (!res.data.success) throw new Error(res.data.error)
  return res.data.data
}

export async function updateTemplate(id: string, template: Partial<TemplateItem>): Promise<TemplateItem> {
  const res = await api.put(`/api/templates/${id}`, template)
  if (!res.data.success) throw new Error(res.data.error)
  return res.data.data
}

export async function deleteTemplate(id: string): Promise<void> {
  const res = await api.delete(`/api/templates/${id}`)
  if (!res.data.success) throw new Error(res.data.error)
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await api.get('/api/categories')
  if (!res.data.success) throw new Error(res.data.error)
  return res.data.data || []
}

export async function fetchVersion(): Promise<number> {
  const res = await api.get('/api/version')
  if (!res.data.success) throw new Error(res.data.error)
  return res.data.version || 1
}

// ============ 文件上传 ============

export async function uploadImages(files: File[]): Promise<string[]> {
  const formData = new FormData()
  files.forEach(f => formData.append('images', f))
  const res = await axios.post(`${API_BASE}/api/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${getAdminToken()}`,
    },
    timeout: 60000,
  })
  if (!res.data.success) throw new Error(res.data.error)
  return res.data.data.map((f: any) => f.url)
}

export async function uploadImage(file: File): Promise<string> {
  const urls = await uploadImages([file])
  return urls[0]
}

// ============ 字体 API ============

export async function uploadFonts(files: File[]): Promise<Array<{ filename: string; originalName: string; url: string; size: number }>> {
  const formData = new FormData()
  files.forEach(f => {
    formData.append('fonts', f)
    // 使用文件名（去掉扩展名）作为字体名
    const name = f.name.replace(/\.[^.]+$/, '')
    formData.append('names', name)
  })
  const res = await axios.post(`${API_BASE}/api/fonts/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${getAdminToken()}`,
    },
    timeout: 60000,
  })
  if (!res.data.success) throw new Error(res.data.error)
  return res.data.data
}

export async function fetchFonts(): Promise<Array<{ filename: string; url: string; size: number }>> {
  const res = await axios.get(`${API_BASE}/api/fonts`)
  if (!res.data.success) throw new Error(res.data.error)
  return res.data.data || []
}

// ============ 云同步状态 ============

export async function fetchCloudSyncStatus(): Promise<{ enabled: boolean; envId: string; message: string }> {
  try {
    const res = await api.get('/api/cloud-sync/status')
    if (res.data.success) return res.data.data
    return { enabled: false, envId: '', message: res.data.error || '查询失败' }
  } catch (e: any) {
    return { enabled: false, envId: '', message: e?.response?.data?.error || e?.message || '查询失败' }
  }
}

export async function fetchCloudTemplates(): Promise<Array<{ id: string; name: string; status: string; updatedAt: string }>> {
  try {
    const res = await api.get('/api/cloud-sync/templates')
    if (res.data.success) return res.data.data || []
    return []
  } catch (e: any) {
    console.warn('获取云模板列表失败:', e?.message)
    return []
  }
}

export async function checkCloudTemplateExists(id: string): Promise<{ exists: boolean; data?: any }> {
  try {
    const res = await api.get(`/api/cloud-sync/check/${id}`)
    if (res.data.success) return res.data.data
    return { exists: false }
  } catch (e: any) {
    return { exists: false }
  }
}

export async function resyncTemplate(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await api.post(`/api/cloud-sync/resync/${id}`)
    return { success: res.data.success, message: res.data.message || '' }
  } catch (e: any) {
    return { success: false, message: e?.response?.data?.error || e?.message || '同步失败' }
  }
}

export async function resyncAllTemplates(): Promise<{ success: boolean; message: string; synced: number }> {
  try {
    const res = await api.post('/api/cloud-sync/resync-all')
    return { success: res.data.success, message: res.data.message || '', synced: res.data.synced || 0 }
  } catch (e: any) {
    return { success: false, message: e?.response?.data?.error || e?.message || '批量同步失败', synced: 0 }
  }
}

export async function safeDeleteTemplate(id: string): Promise<{ success: boolean; message: string; cloudDeleted: boolean; localDeleted: boolean }> {
  try {
    const res = await api.delete(`/api/templates/${id}/safe-delete`)
    return { 
      success: res.data.success, 
      message: res.data.message || '',
      cloudDeleted: res.data.cloudDeleted || false,
      localDeleted: res.data.localDeleted || false
    }
  } catch (e: any) {
    return { 
      success: false, 
      message: e?.response?.data?.error || e?.message || '删除失败',
      cloudDeleted: e?.response?.data?.cloudDeleted || false,
      localDeleted: e?.response?.data?.localDeleted || false
    }
  }
}

export async function hardDeleteTemplate(id: string): Promise<{ success: boolean; message: string; cloudDeleted: boolean; localDeleted: boolean }> {
  try {
    const res = await api.delete(`/api/templates/${id}/hard-delete`)
    return {
      success: res.data.success,
      message: res.data.message || '',
      cloudDeleted: res.data.cloudDeleted || false,
      localDeleted: res.data.localDeleted || false
    }
  } catch (e: any) {
    return {
      success: false,
      message: e?.response?.data?.error || e?.message || '彻底删除失败',
      cloudDeleted: e?.response?.data?.cloudDeleted || false,
      localDeleted: e?.response?.data?.localDeleted || false
    }
  }
}

export async function batchCheckCloudSync(): Promise<{ success: boolean; checked: number; synced: number; unsynced: number }> {
  try {
    const res = await api.get('/api/cloud-sync/batch-check')
    if (res.data.success) {
      return {
        success: true,
        checked: res.data.data.checked || 0,
        synced: res.data.data.synced || 0,
        unsynced: res.data.data.unsynced || 0
      }
    }
    return { success: false, checked: 0, synced: 0, unsynced: 0 }
  } catch (e: any) {
    console.warn('批量检查云同步状态失败:', e?.message)
    return { success: false, checked: 0, synced: 0, unsynced: 0 }
  }
}

// ============ 从云端拉取模板到本地 ============
export interface PullCloudTemplatesResult {
  success: boolean
  total?: number
  inserted?: number
  updated?: number
  skipped?: number
  failed?: number
  error?: string
}

export async function pullTemplatesFromCloud(): Promise<PullCloudTemplatesResult> {
  try {
    // 图片下载耗时较长，放宽超时到 120s
    const res = await api.post('/api/cloud-sync/pull', {}, { timeout: 120000 })
    if (res.data.success) {
      return { success: true, ...(res.data.data || {}) }
    }
    return { success: false, error: res.data.error || '拉取失败' }
  } catch (e: any) {
    console.warn('从云端拉取模板失败:', e?.message)
    return { success: false, error: e?.response?.data?.error || e?.message || '拉取失败' }
  }
}
