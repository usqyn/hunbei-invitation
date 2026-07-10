import axios from 'axios'
import type { TemplateItem, Category } from '../types/template'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const ADMIN_PHONE = import.meta.env.VITE_ADMIN_PHONE || '13800138000'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// 响应拦截器：统一处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status
      const msg = error.response.data?.error || error.response.data?.message || ''
      console.error(`[API Error] ${status}: ${msg}`, error.config?.url)
      if (status === 401) {
        // Token 过期或无效：清除本地登录信息并刷新页面以触发重新登录
        console.error('[API Error] Token expired or invalid, clearing session and reloading')
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_phone')
        // 刷新页面，App.vue onMounted 会因无 token 而显示登录界面
        window.location.reload()
        return Promise.reject(error)
      }
    } else if (error.request) {
      console.error('[API Error] No response received:', error.config?.url)
    } else {
      console.error('[API Error]', error.message)
    }
    return Promise.reject(error)
  }
)

export { api }

let adminToken = ''

export function setAdminToken(token: string) {
  adminToken = token
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  localStorage.setItem('admin_token', token)
}

export function getAdminToken(): string {
  return adminToken || localStorage.getItem('admin_token') || ''
}

export async function initApi(): Promise<boolean> {
  // 检查 localStorage 中是否有之前登录保存的管理员令牌
  const saved = localStorage.getItem('admin_token')
  if (saved) {
    setAdminToken(saved)
    return true
  }
  // 没有有效令牌，返回 false 以触发登录界面
  return false
}

// 管理员登录：调用专用登录接口获取带 role:'admin' 的 JWT
export async function adminLogin(phone: string, code: string): Promise<boolean> {
  const res = await api.post('/api/admin/login', { phone, code })
  if (res.data.success && res.data.data?.token) {
    setAdminToken(res.data.data.token)
    return true
  }
  return false
}

// 发送管理员登录验证码（复用通用短信接口）
export async function sendAdminSmsCode(phone: string): Promise<void> {
  await api.post('/api/sms/send', { phone })
}

export function logoutAdmin(): void {
  adminToken = ''
  delete api.defaults.headers.common['Authorization']
  localStorage.removeItem('admin_token')
}

export { ADMIN_PHONE }

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
  const res = await api.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
  if (!res.data.success) throw new Error(res.data.error)
  return res.data.data.map((f: any) => f.url)
}

export async function uploadImage(file: File): Promise<string> {
  const urls = await uploadImages([file])
  return urls[0]
}

export { API_BASE }

// ============ 字体 API ============

export async function uploadFonts(files: File[]): Promise<Array<{ filename: string; originalName: string; url: string; size: number }>> {
  const formData = new FormData()
  files.forEach(f => {
    formData.append('fonts', f)
    // 使用文件名（去掉扩展名）作为字体名
    const name = f.name.replace(/\.[^.]+$/, '')
    formData.append('names', name)
  })
  const res = await api.post('/api/fonts/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
  if (!res.data.success) throw new Error(res.data.error)
  return res.data.data
}

export async function fetchFonts(): Promise<Array<{ filename: string; url: string; size: number }>> {
  const res = await api.get('/api/fonts')
  if (!res.data.success) throw new Error(res.data.error)
  return res.data.data || []
}
