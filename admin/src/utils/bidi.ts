/**
 * BiDi 文本处理工具
 * 集成 bidi-shaper（UAX #9 + Arabic shaping）解决 Fabric.js Canvas 渲染阿拉伯文时的：
 * - 字符不连写（缺少 contextual shaping）
 * - 顺序错乱（缺少 BiDi 算法重排）
 * - 括号方向错误（缺少镜像）
 *
 * 应用场景：导出 PNG 前 shaping；不影响 admin 画布编辑态（依赖浏览器原生 BiDi）。
 */
import { render } from 'bidi-shaper'

const RTL_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

/**
 * 检测文本是否包含阿拉伯/哈萨克 RTL 字符
 */
export function containsRtl(text: string | undefined | null): boolean {
  if (!text) return false
  return RTL_REGEX.test(text)
}

/**
 * 对文本应用 BiDi 算法 + Arabic shaping
 * - 不含 RTL 字符的文本原样返回
 * - 含 RTL 字符的文本返回视觉顺序的 shaped 字符串
 *
 * 用法：在导出 PNG 前用此函数处理所有文本元素的 text 字段
 */
export function shapeText(text: string | undefined | null): string {
  if (!text) return ''
  if (!containsRtl(text)) return text
  try {
    return render(text)
  } catch (e) {
    console.warn('[BiDi] shapeText failed:', e)
    return text
  }
}
