import { API_BASE } from '@/config'
import { RTL_CHAR_REGEX } from '@/constants/editor'

// re-export 供外部直接引用
export { RTL_CHAR_REGEX }

// ============ 字体加载 ============
const SYSTEM_FONTS = ['sans-serif', 'serif', 'monospace', 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', 'Arial', 'Georgia', 'KaiTi']
const loadedFonts = new Set<string>()
let fontMap: Record<string, string> | null = null
let fontMapLoading = false
let fontLoadCallbacks: Array<() => void> = []
let fontsLoading = 0

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
    const rawFontUrl = fontMap[fontFamily]
    if (typeof rawFontUrl !== 'string' || !rawFontUrl) {
      console.warn(`[FontLoader] Font not in map or invalid: ${fontFamily}`, typeof rawFontUrl)
      resolve()
      return
    }
    const fullUrl = rawFontUrl.startsWith('http') ? rawFontUrl : API_BASE + rawFontUrl

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
