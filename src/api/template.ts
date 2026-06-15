import { get, post } from './request'
import type { Template } from '@/types'

export function getTemplateList() {
  return get<Template[]>('/api/templates')
}

export function getTemplateDetail(id: number) {
  return get<Template>(`/api/templates/${id}`)
}

export function saveTemplate(data: Record<string, any>) {
  return post('/api/templates/save', data)
}
