import { API_BASE, USE_CLOUD_FUNCTIONS } from '@/config'
import { RTL_CHAR_REGEX } from '@/constants/editor'

// ============ 字体加载 ============
// 系统字体白名单（不需下载，直接跳过）。包含华文系列和思源系列别名
const SYSTEM_FONTS = [
  'sans-serif', 'serif', 'monospace',
  'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB',
  'Arial', 'Georgia', 'KaiTi',
  // 华文系列（系统自带或与 KaiTi 等效）
  '华文楷体', '华文行楷', '华文隶书', '华文宋体', '华文黑体',
  // 思源系列（部分系统自带）
  '思源宋体', '思源宋体极细', '思源黑体',
]
const loadedFonts = new Set<string>()
let fontMap: Record<string, string> | null = null
let fontMapPromise: Promise<void> | null = null
let fontLoadCallbacks: Array<() => void> = []
let fontsLoading = 0

/** 字体别名映射：当 fontMap 中找不到原名时，尝试用别名查找 */
const FONT_ALIASES: Record<string, string> = {
  '华文楷体': 'KaiTi',
  '华文行楷': 'STXingkai',
  '华文隶书': 'STLiti',
  '华文宋体': 'STSong',
  '华文黑体': 'STHeiti',
}

/**
 * 获取字体映射表（Promise 缓存模式，替代 setInterval 轮询）
 * 多次调用复用同一个 Promise，避免重复请求
 */
function fetchFontMap(): Promise<void> {
  if (fontMap) return Promise.resolve()
  if (fontMapPromise) return fontMapPromise
  fontMapPromise = new Promise<void>((resolve) => {
    // 云函数模式下字体接口不可用，直接跳过
    if (USE_CLOUD_FUNCTIONS) {
      fontMap = {}
      resolve()
      return
    }
    uni.request({
      url: API_BASE + '/api/fonts',
      method: 'GET',
      timeout: 5000,
      success: (res: any) => {
        const data = res.data
        const raw = (data?.success && data.data) || {}
        fontMap = Array.isArray(raw)
          ? raw.reduce((m: Record<string, string>, f: any) => { m[f.filename] = f.url; return m }, {} as Record<string, string>)
          : raw
        resolve()
      },
      fail: () => { fontMap = {}; resolve() },
    })
  })
  return fontMapPromise
}

function notifyFontLoadComplete() {
  fontsLoading = 0
  fontLoadCallbacks.forEach(cb => {
    try { cb() } catch (e) { console.warn('[FontLoader] Callback error:', e) }
  })
  fontLoadCallbacks = []
}

function loadCustomFont(fontFamily: string): Promise<void> {
  return new Promise<void>((resolve) => {
    if (!fontFamily || loadedFonts.has(fontFamily)) { resolve(); return }
    if (SYSTEM_FONTS.some(f => fontFamily.includes(f))) { resolve(); return }
    if (!fontMap) {
      fetchFontMap().then(() => loadCustomFont(fontFamily).then(resolve))
      return
    }
    const rawFontUrl = fontMap[fontFamily] || (FONT_ALIASES[fontFamily] ? fontMap[FONT_ALIASES[fontFamily]] : '')
    if (typeof rawFontUrl !== 'string' || !rawFontUrl) {
      // 云函数模式下字体不可用属于正常情况，降级为 log
      if (USE_CLOUD_FUNCTIONS) console.log(`[FontLoader] Font not available (cloud mode): ${fontFamily}`)
      resolve()
      return
    }
    // 字体 URL HTTPS 升级（非 localhost）
    let fullUrl = rawFontUrl.startsWith('http') ? rawFontUrl : API_BASE + rawFontUrl
    if (fullUrl.startsWith('http://') && !fullUrl.includes('127.0.0.1') && !fullUrl.includes('localhost')) {
      fullUrl = fullUrl.replace('http://', 'https://')
    }

    fontsLoading++

    // #ifdef MP-WEIXIN
    if (typeof wx === 'undefined' || typeof wx.downloadFile !== 'function') {
      console.warn(`[FontLoader] wx.downloadFile not available, skip: ${fontFamily}`)
      fontsLoading--
      if (fontsLoading <= 0) notifyFontLoadComplete()
      resolve()
      return
    }
    wx.downloadFile({
      url: fullUrl,
      success: (res: any) => {
        if (res.statusCode === 200 && res.tempFilePath) {
          if (typeof wx.loadFontFace !== 'function') {
            console.warn(`[FontLoader] wx.loadFontFace not available, skip: ${fontFamily}`)
            fontsLoading--
            if (fontsLoading <= 0) notifyFontLoadComplete()
            resolve()
            return
          }
          wx.loadFontFace({
            family: fontFamily,
            source: 'url("' + res.tempFilePath + '")',
            global: true,
            scopes: ['webview', 'canvas'],
            success: () => {
              loadedFonts.add(fontFamily)
              console.log('[FontLoader] Loaded: ' + fontFamily)
              fontsLoading--
              if (fontsLoading <= 0) notifyFontLoadComplete()
              resolve()
            },
            fail: (err: any) => {
              console.warn('[FontLoader] Failed: ' + fontFamily, err)
              fontsLoading--
              if (fontsLoading <= 0) notifyFontLoadComplete()
              resolve()
            },
          })
        } else {
          console.warn('[FontLoader] Download failed: ' + fontFamily + ', status: ' + res.statusCode)
          fontsLoading--
          if (fontsLoading <= 0) notifyFontLoadComplete()
          resolve()
        }
      },
      fail: (err: any) => {
        console.warn('[FontLoader] Download error: ' + fontFamily, err)
        fontsLoading--
        if (fontsLoading <= 0) notifyFontLoadComplete()
        resolve()
      },
    })
    // #endif

    // #ifndef MP-WEIXIN
    try {
      uni.loadFontFace({
        family: fontFamily,
        source: 'url("' + fullUrl + '")',
        global: true,
        scopes: ['webview', 'canvas'],
        success: () => {
          loadedFonts.add(fontFamily)
          console.log('[FontLoader] Loaded: ' + fontFamily)
          fontsLoading--
          if (fontsLoading <= 0) notifyFontLoadComplete()
          resolve()
        },
        fail: (err: any) => {
          console.warn('[FontLoader] Failed: ' + fontFamily, err)
          fontsLoading--
          if (fontsLoading <= 0) notifyFontLoadComplete()
          resolve()
        },
      } as any)
    } catch (e) {
      console.warn('[FontLoader] Error: ' + fontFamily, e)
      fontsLoading--
      if (fontsLoading <= 0) notifyFontLoadComplete()
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

export function onFontLoadComplete(callback: () => void): () => void {
  if (fontsLoading <= 0 && loadedFonts.has('KazakhSoftAsilya')) {
    setTimeout(callback, 0)
    return () => {}
  }
  fontLoadCallbacks.push(callback)
  return () => {
    const idx = fontLoadCallbacks.indexOf(callback)
    if (idx > -1) fontLoadCallbacks.splice(idx, 1)
  }
}

export function loadFontsForElementsWithCallback(
  elements: Array<{ type?: string; style?: { font?: string }; text?: string }>,
  onComplete?: () => void
) {
  if (onComplete) {
    const unsubscribe = onFontLoadComplete(() => {
      unsubscribe()
      onComplete!()
    })
  }
  loadFontsForElements(elements)
}

/** 预加载哈萨克/阿拉伯字体，供非编辑器页面使用（返回 Promise 支持等待） */
export function preloadRtlFonts(): Promise<void> {
  const rtlFonts = ['KazakhSoftAsilya', 'KazakhSoftAsilyaQaniq']
  return fetchFontMap().then(() => {
    return Promise.all(rtlFonts.map(f => loadCustomFont(f))).then(() => undefined)
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
