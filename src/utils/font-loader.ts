import { API_BASE } from '@/config'
import { RTL_CHAR_REGEX } from '@/constants/editor'

// ============ 字体加载 ============
// 注意：KazakhSoftAsilya 和 KazakhSoftAsilyaQaniq 不能放在此列表中
// 它们需要通过 JS 加载器下载字体文件，不能依赖 CSS @font-face（小程序中不稳定）
const SYSTEM_FONTS = ['sans-serif', 'serif', 'monospace', 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', 'Arial', 'Georgia', 'KaiTi']
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
      // 10秒超时保护：避免请求卡住时无限轮询，超时后置 null 允许后续调用重试
      setTimeout(() => {
        if (fontMap === null) {
          clearInterval(check)
          fontMap = null
          resolve()
        }
      }, 10000)
      return
    }
    fontMapLoading = true
    uni.request({
      url: API_BASE + '/api/fonts',
      method: 'GET',
      timeout: 5000,
      success: (res: any) => {
        const data = res.data
        const raw = (data?.success && data.data) || {}
        // 服务端返回 [{filename, url}] 数组，转为 {filename: url} 映射
        fontMap = Array.isArray(raw)
          ? raw.reduce((m: Record<string, string>, f: any) => { m[f.filename] = f.url; return m }, {} as Record<string, string>)
          : raw
        fontMapLoading = false
        resolve()
      },
      fail: () => { fontMap = {}; fontMapLoading = false; resolve() },
    })
  })
}

function loadCustomFont(fontFamily: string): Promise<void> {
  return new Promise<void>((resolve) => {
    if (!fontFamily || loadedFonts.has(fontFamily)) { resolve(); return }
    if (SYSTEM_FONTS.some(f => fontFamily.includes(f))) { resolve(); return }
    if (!fontMap) {
      fetchFontMap().then(() => loadCustomFont(fontFamily).then(resolve))
      return
    }
    const fontUrl = fontMap[fontFamily]
    if (!fontUrl) {
      console.warn(`[FontLoader] Font not in map: ${fontFamily}`)
      resolve()
      return
    }
    const fullUrl = fontUrl.startsWith('http') ? fontUrl : API_BASE + fontUrl

    // #ifdef MP-WEIXIN
    // 微信小程序需要先下载字体文件再加载
    (wx as any).downloadFile({
      url: fullUrl,
      success: (res: any) => {
        if (res.statusCode === 200) {
          ;(wx as any).loadFontFace({
            family: fontFamily,
            source: `url("${res.tempFilePath}")`,
            success: () => { loadedFonts.add(fontFamily); console.log(`[FontLoader] Loaded: ${fontFamily}`); resolve() },
            fail: (err: any) => { console.warn(`[FontLoader] Failed: ${fontFamily}`, err); resolve() },
          })
        } else {
          console.warn(`[FontLoader] Download failed: ${fontFamily}, status: ${res.statusCode}`)
          resolve()
        }
      },
      fail: (err: any) => { console.warn(`[FontLoader] Download error: ${fontFamily}`, err); resolve() },
    })
    // #endif

    // #ifndef MP-WEIXIN
    try {
      uni.loadFontFace({
        family: fontFamily,
        source: `url("${fullUrl}")`,
        success: () => { loadedFonts.add(fontFamily); console.log(`[FontLoader] Loaded: ${fontFamily}`); resolve() },
        fail: (err: any) => { console.warn(`[FontLoader] Failed: ${fontFamily}`, err); resolve() },
      } as any)
    } catch (e) {
      console.warn(`[FontLoader] Error: ${fontFamily}`, e)
      resolve()
    }
    // #endif
  })
}

/** 从样式中提取主字体名 */
function extractPrimaryFont(fontStr?: string): string | null {
  if (!fontStr) return null
  const primary = fontStr.split(',')[0].trim().replace(/['"]/g, '')
  return primary || null
}

/** 检测文字是否包含 RTL 字符（阿拉伯/哈萨克等），如是则加入对应字体 */
function checkAndAddRtlFonts(text: string | undefined, fontSet: Set<string>) {
  if (text && RTL_CHAR_REGEX.test(text)) {
    fontSet.add('KazakhSoftAsilya')
    fontSet.add('KazakhSoftAsilyaQaniq')
  }
}

export function loadFontsForElements(elements: Array<{ type?: string; style?: { font?: string }; text?: string }>): Promise<void> {
  const fontSet = new Set<string>()

  elements.forEach(el => {
    // 处理所有包含文字的元素类型（text, title, date, location, rsvp 等）
    const fontStyle = el.style?.font
    const primary = extractPrimaryFont(fontStyle)
    if (primary) fontSet.add(primary)

    // 检测 RTL 文字，加载阿拉伯/哈萨克字体
    checkAndAddRtlFonts(el.text, fontSet)
  })

  if (fontSet.size === 0) return Promise.resolve()

  // 等待 fontMap 就绪后逐个加载字体，全部完成才 resolve
  return fetchFontMap().then(() => {
    return Promise.all(Array.from(fontSet).map(f => loadCustomFont(f))).then(() => undefined)
  })
}

/** 加载完成后触发回调，用于重新渲染 */
export function loadFontsForElementsWithCallback(
  elements: Array<{ type?: string; style?: { font?: string }; text?: string }>,
  onComplete?: () => void
) {
  loadFontsForElements(elements)
  // 字体加载为异步且无法可靠追踪单个完成时机，固定延迟后触发回调
  setTimeout(() => onComplete?.(), 500)
}

/** 预加载哈萨克/阿拉伯字体，供非编辑器页面使用 */
export function preloadRtlFonts() {
  const rtlFonts = ['KazakhSoftAsilya', 'KazakhSoftAsilyaQaniq']
  fetchFontMap().then(() => {
    rtlFonts.forEach(f => loadCustomFont(f))
  })
}

/**
 * BiDi 混排处理：用 Unicode 控制字符包裹阿拉伯文段，确保混合文本方向正确
 * - 阿拉伯文段用 \u202B（RTL 嵌入）开头，\u202C（恢复）结尾
 * - 数字段保持原样（数字天然 LTR）
 */
export function formatBiDi(text: string | undefined | null): string {
  if (!text) return ''
  // 匹配连续的阿拉伯文片段
  return String(text).replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g, (m) => `\u202B${m}\u202C`)
}
