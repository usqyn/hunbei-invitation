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

// 括号镜像（视觉序反转时成对括号需要互换方向）
const BIDI_MIRROR: Record<string, string> = {
  ')': '(', '(': ')', ']': '[', '[': ']', '}': '{', '{': '}', '>': '<', '<': '>',
}
// 哈萨克专属字母：用于判断「哈萨克语境」，从而安全地把成形后落到 0647 的 ە 还原为 06D5
// （哈萨克阿拉伯文不使用阿拉伯 h=ه，其 h 为 ھ 06BE）
const KZ_SPECIFIC_LETTERS = /[\u06C7\u06C6\u06CB\u06D5\u06BE\u06D0\u06AF\u06AD]/

/**
 * 视觉顺序 → 逻辑顺序（针对 RTL 文本）
 * 很多 PSD/设计工具导出的哈萨克·阿拉伯文本以「视觉顺序 + 预成形字形」存储：
 *  1. 保护 لا 系列连字（U+FEF5-FEFC）为单个单元，避免反转后拆开错位
 *  2. NFKC 还原成形字形为基础字母
 *  3. 整行反转 + 括号镜像，再把 [A-Za-z0-9] 连续段反转回来（数字/拉丁段保持 LTR）
 *  4. 哈萨克语境下把成形后落到 0647 的 ە 还原为 06D5
 * 仅处理含 RTL 字符的文本；多行文本逐行反转、保持行序。
 */
export function visualToLogicalRtl(text: string): string {
  if (!containsRtl(text)) return text
  return text
    .split('\n')
    .map((line) => {
      // 保护 لا 连字为单个标记，反转后还原为 لا（0644 0627）
      const protectedLine = line.replace(/[\uFEF5-\uFEFC]/g, '\uE000')
      const chars = [...protectedLine.normalize('NFKC')]
      const reversed = chars.reverse().map((c) => BIDI_MIRROR[c] || c)
      const out: string[] = []
      let i = 0
      while (i < reversed.length) {
        if (/[A-Za-z0-9]/.test(reversed[i])) {
          let j = i
          while (j < reversed.length && /[A-Za-z0-9]/.test(reversed[j])) j++
          out.push(reversed.slice(i, j).reverse().join(''))
          i = j
        } else {
          out.push(reversed[i])
          i++
        }
      }
      let result = out.join('').replace(/\uE000/g, '\u0644\u0627')
      if (KZ_SPECIFIC_LETTERS.test(result)) {
        result = result.replace(/\u0647/g, '\u06D5')
      }
      return result
    })
    .join('\n')
}
