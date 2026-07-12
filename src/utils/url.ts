import { API_BASE } from '@/config'

/**
 * 将后端返回的相对路径解析为完整 URL
 * 支持: http/https, data:, blob:, wxfile://, 以及 /uploads/ 等相对路径
 */
export function resolveUrl(url: string | undefined | null): string {
  if (!url) return ''
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:') ||
    url.startsWith('wxfile://')
  ) {
    return url
  }
  return API_BASE + url
}
