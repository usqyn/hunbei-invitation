import axios from 'axios'
import type { TemplateItem, Category } from '../types/template'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const ADMIN_PHONE = import.meta.env.VITE_ADMIN_PHONE || '13800138000'
const DEV_CODE = import.meta.env.VITE_DEV_CODE || '000000'

const api = axios.create({
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

export async function initApi(): Promise<boolean> {
  const saved = localStorage.getItem('admin_token')
  if (saved) {
    setAdminToken(saved)
    return true
  }
  try {
    const res = await api.post('/api/user/login', { phone: ADMIN_PHONE, code: DEV_CODE })
    if (res.data.success && res.data.data?.token) {
      setAdminToken(res.data.data.token)
      return true
    }
  } catch (_) {}
  return false
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
  const res = await axios.post(`${API_BASE}/api/fonts/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
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
