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

/**
 * <input type="color"> 只接受 #rgb/#rrggbb 格式，'transparent'（数据层表示"无颜色"）
 * 等非法值会导致 Chrome 警告 "does not conform to the required format"。
 * 绑定到颜色输入框时统一用本函数净化；用户改色后正常写回，数据层语义不受影响。
 */
export function toColorInputValue(v: string | null | undefined, fallback = '#000000'): string {
  if (typeof v === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) return v
  return fallback
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
