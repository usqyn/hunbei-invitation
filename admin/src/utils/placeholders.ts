/**
 * 替换文本中的日期占位符 {year} {month} {day}
 * 例如: "في سنة {year} شهر {month} يوم {day}" → "في سنة 2025 شهر 6 يوم 15"
 */
export function resolveDatePlaceholders(text: string, data: Record<string, string | undefined>): string {
  if (!text) return text
  return text
    .replace(/\{year\}/g, data.year ?? '')
    .replace(/\{month\}/g, data.month ?? '')
    .replace(/\{day\}/g, data.day ?? '')
}

/**
 * 检测文本是否包含日期占位符
 */
export function hasDatePlaceholders(text: string): boolean {
  return /\{year\}|\{month\}|\{day\}/.test(text)
}
