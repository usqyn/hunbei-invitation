import { API_BASE } from '@/config'

/** 补全 /uploads/ 开头的相对路径为完整 URL */
export function resolveImageUrl(url: string): string {
  if (!url) return url
  if (url.startsWith('/uploads/')) return API_BASE + url
  return url
}
