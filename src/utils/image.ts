import { resolveUrl } from './url'

/** @deprecated 使用 resolveUrl 替代 */
export function resolveImageUrl(url: string): string {
  return resolveUrl(url)
}
