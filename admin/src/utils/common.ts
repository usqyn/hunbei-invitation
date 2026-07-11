import { CATEGORIES } from '../types/template'

/** 清理 SVG 字符串中的脚本与内联事件绑定，防止 XSS */
export function sanitizeSvg(svg: string): string {
  if (!svg) return ''
  return svg
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<foreignObject[\s\S]*?>[\s\S]*?<\/foreignObject>/gi, '')
}

/** 根据分类 id 获取分类名称，未匹配时原样返回 id */
export function getCategoryName(catId: string): string {
  return CATEGORIES.find(c => c.id === catId)?.name || catId
}

/** 格式化时间戳为 M/D H:mm 形式 */
export function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 读取文件为 DataURL 字符串 */
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/** 简单 hex 颜色亮度计算（0~1，越大越亮） */
export function getLuminance(hex: string): number {
  const rgb = parseInt(hex.replace('#', ''), 16)
  const r = (rgb >> 16) & 0xff
  const g = (rgb >> 8) & 0xff
  const b = (rgb >> 0) & 0xff
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}
