import { API_BASE } from '@/config'

const loadedFonts = new Set<string>()
let fontMap: Record<string, string> | null = null
let fontMapLoading = false

const SYSTEM_FONTS = ['sans-serif', 'serif', 'monospace', 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', 'Arial', 'Georgia', 'KaiTi']

function fetchFontMap() {
  if (fontMap || fontMapLoading) return
  fontMapLoading = true
  uni.request({
    url: API_BASE + '/api/fonts',
    method: 'GET',
    timeout: 5000,
    success: (res: any) => {
      const data = res.data
      fontMap = (data?.success && data.data) || {}
      fontMapLoading = false
    },
    fail: () => {
      fontMap = {}
      fontMapLoading = false
    },
  })
}

export function loadCustomFont(fontFamily: string) {
  if (!fontFamily || loadedFonts.has(fontFamily)) return
  if (SYSTEM_FONTS.some(f => fontFamily.includes(f))) return

  if (!fontMap) {
    fetchFontMap()
    return
  }

  const fontUrl = fontMap[fontFamily]
  if (!fontUrl) return

  const fullUrl = fontUrl.startsWith('http') ? fontUrl : API_BASE + fontUrl
  try {
    ;(wx as any).loadFontFace({
      family: fontFamily,
      source: `url("${fullUrl}")`,
      success: () => {
        loadedFonts.add(fontFamily)
        console.log(`[FontLoader] Loaded: ${fontFamily}`)
      },
      fail: (err: any) => {
        console.warn(`[FontLoader] Failed: ${fontFamily}`, err)
      },
    })
  } catch (e) {
    console.warn(`[FontLoader] Error: ${fontFamily}`, e)
  }
}

export function loadFontsForElements(elements: Array<{ type: string; style?: { font?: string } }>) {
  const fontSet = new Set<string>()
  elements.forEach(el => {
    if (el.type === 'text' && el.style?.font) {
      const primary = el.style.font.split(',')[0].trim().replace(/['"]/g, '')
      if (primary) fontSet.add(primary)
    }
  })
  // 先加载映射表，然后加载字体
  if (!fontMap) {
    fetchFontMap()
    setTimeout(() => fontSet.forEach(f => loadCustomFont(f)), 600)
  } else {
    fontSet.forEach(f => loadCustomFont(f))
  }
}
