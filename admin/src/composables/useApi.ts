import axios from 'axios'
import type { TemplateItem, Category } from '../types/template'

const API_BASE = import.meta.env.VITE_API_BASE || ''

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// 测试阶段跳过所有 token 校验
export async function initApi() {}

// ============ 模板 API ============

export async function fetchTemplates(category?: string): Promise<TemplateItem[]> {
  const params = category ? { category } : {}
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
