/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number = 300): T {
  let timer: ReturnType<typeof setTimeout> | null = null
  return ((...args: any[]) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn(...args)
      timer = null
    }, delay)
  }) as unknown as T
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(fn: T, interval: number = 300): T {
  let lastTime = 0
  return ((...args: any[]) => {
    const now = Date.now()
    if (now - lastTime >= interval) {
      lastTime = now
      fn(...args)
    }
  }) as unknown as T
}

/**
 * 日期格式化
 */
export function formatDate(date: Date | string | number, format: string = 'YYYY-MM-DD'): string {
  const d = new Date(date)
  const map: Record<string, string> = {
    'YYYY': String(d.getFullYear()),
    'MM': String(d.getMonth() + 1).padStart(2, '0'),
    'DD': String(d.getDate()).padStart(2, '0'),
    'HH': String(d.getHours()).padStart(2, '0'),
    'mm': String(d.getMinutes()).padStart(2, '0'),
    'ss': String(d.getSeconds()).padStart(2, '0'),
  }
  let result = format
  for (const [key, value] of Object.entries(map)) {
    result = result.replace(key, value)
  }
  return result
}

/**
 * 安全的 JSON 解析
 */
export function safeJsonParse<T = any>(str: string, fallback: T): T {
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}

/**
 * 生成唯一 ID
 */
export function uniqueId(prefix: string = ''): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/**
 * 深拷贝（替代 JSON.parse(JSON.stringify()) 滥用）
 * 支持 Object/Array/Date/RegExp，其余类型直接返回
 */
export function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  if (value instanceof Date) return new Date(value.getTime()) as unknown as T
  if (value instanceof RegExp) return new RegExp(value.source, value.flags) as unknown as T
  if (Array.isArray(value)) {
    return value.map(item => deepClone(item)) as unknown as T
  }
  const result: Record<string, any> = {}
  for (const key of Object.keys(value as Record<string, any>)) {
    result[key] = deepClone((value as Record<string, any>)[key])
  }
  return result as unknown as T
}
