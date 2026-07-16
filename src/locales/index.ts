type Messages = Record<string, string>

const locales: Record<string, Messages> = {}

export function defineLocale(locale: string, messages: Messages) {
  locales[locale] = messages
}

function getLocale(): string {
  try {
    return uni.getLocale ? uni.getLocale() : 'zh-CN'
  } catch {
    return 'zh-CN'
  }
}

export function t(key: string, locale?: string): string {
  const lang = locale || getLocale()
  return locales[lang]?.[key] || locales['zh-CN']?.[key] || key
}

export { getLocale }
