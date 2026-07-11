import { API_BASE } from '@/config'
import { RTL_CHAR_REGEX } from '@/constants/editor'

// ============ 字体加载 ============
const SYSTEM_FONTS = ['sans-serif', 'serif', 'monospace', 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', 'Arial', 'Georgia', 'KaiTi', 'KazakhSoftAsilya', 'KazakhSoftAsilyaQaniq']
const loadedFonts = new Set<string>()
let fontMap: Record<string, string> | null = null
let fontMapLoading = false

function fetchFontMap(): Promise<void> {
  return new Promise((resolve) => {
    if (fontMap) { resolve(); return }
    if (fontMapLoading) {
      const check = setInterval(() => {
        if (fontMap !== null) { clearInterval(check); resolve() }
      }, 100)
      return
    }
    fontMapLoading = true
    uni.request({
      url: API_BASE + '/api/fonts',
      method: 'GET',
      timeout: 5000,
      success: (res: any) => {
        const data = res.data
        fontMap = (data?.success && data.data) || {}
        fontMapLoading = false
        resolve()
      },
      fail: () => { fontMap = {}; fontMapLoading = false; resolve() },
    })
  })
}

function loadCustomFont(fontFamily: string) {
  if (!fontFamily || loadedFonts.has(fontFamily)) return
  if (SYSTEM_FONTS.some(f => fontFamily.includes(f))) return
  if (!fontMap) { fetchFontMap().then(() => loadCustomFont(fontFamily)); return }
  const fontUrl = fontMap[fontFamily]
  if (!fontUrl) return
  const fullUrl = fontUrl.startsWith('http') ? fontUrl : API_BASE + fontUrl

  // #ifdef MP-WEIXIN
  // 微信小程序需要先下载字体文件再加载
  const downloadTask = (wx as any).downloadFile({
    url: fullUrl,
    success: (res: any) => {
      if (res.statusCode === 200) {
        ;(wx as any).loadFontFace({
          family: fontFamily,
          source: `url("${res.tempFilePath}")`,
          success: () => { loadedFonts.add(fontFamily); console.log(`[FontLoader] Loaded: ${fontFamily}`) },
          fail: (err: any) => { console.warn(`[FontLoader] Failed: ${fontFamily}`, err) },
        })
      } else {
        console.warn(`[FontLoader] Download failed: ${fontFamily}, status: ${res.statusCode}`)
      }
    },
    fail: (err: any) => { console.warn(`[FontLoader] Download error: ${fontFamily}`, err) },
  })
  // #endif

  // #ifndef MP-WEIXIN
  try {
    uni.loadFontFace({
      family: fontFamily,
      source: `url("${fullUrl}")`,
      success: () => { loadedFonts.add(fontFamily) },
      fail: (err: any) => { console.warn(`[FontLoader] Failed: ${fontFamily}`, err) },
    } as any)
  } catch (e) { console.warn(`[FontLoader] Error: ${fontFamily}`, e) }
  // #endif
}

export function loadFontsForElements(elements: Array<{ type: string; style?: { font?: string } }>) {
  const fontSet = new Set<string>()

  elements.forEach(el => {
    if (el.type === 'text') {
      if (el.style?.font) {
        const primary = el.style.font.split(',')[0].trim().replace(/['"]/g, '')
        if (primary) fontSet.add(primary)
      }
      if (el.text && RTL_CHAR_REGEX.test(el.text)) {
        fontSet.add('KazakhSoftAsilya')
        fontSet.add('KazakhSoftAsilyaQaniq')
      }
    }
  })

  fetchFontMap().then(() => {
    fontSet.forEach(f => loadCustomFont(f))
  })
}
