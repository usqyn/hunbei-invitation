import { API_BASE, USE_CLOUD_FUNCTIONS, getFunctionName } from '@/config'
import { RTL_CHAR_REGEX } from '@/constants/editor'
import { isCloudUrl, resolveCloudUrl } from '@/utils/url'

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
    // #ifdef MP-WEIXIN
    if (USE_CLOUD_FUNCTIONS && typeof wx !== 'undefined' && wx.cloud) {
      const fnName = getFunctionName('/api/fonts')
      console.log('[FontLoader] Fetching font map via cloud function:', fnName)
      wx.cloud.callFunction({
        name: fnName,
        data: {
          path: '/api/fonts',
          httpMethod: 'GET',
          query: {},
          body: {},
          headers: {},
        },
        success: (res: any) => {
          const result = res.result
          const raw = (result?.success && result.data) || result || {}
          fontMap = Array.isArray(raw)
            ? raw.reduce((m: Record<string, string>, f: any) => { m[f.filename] = f.url; return m }, {} as Record<string, string>)
            : raw
          console.log('[FontLoader] Font map loaded:', Object.keys(fontMap).length, 'fonts')
          resolve()
        },
        fail: (err: any) => {
          console.warn('[FontLoader] Cloud function failed:', err)
          fontMap = {}
          resolve()
        },
      })
      return
    }
    // #endif
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
      if (USE_CLOUD_FUNCTIONS) console.warn(`[FontLoader] Font not available (cloud mode): ${fontFamily} - 请通过管理后台上传字体到云存储`)
      resolve()
      return
    }
    // cloud:// fileID（云数据库 font_map 存的是云存储 fileID）→ 先异步换取 https 临时 URL
    if (isCloudUrl(rawFontUrl)) {
      resolveCloudUrl(rawFontUrl)
        .then((httpsUrl) => { downloadAndLoadFont(fontFamily, httpsUrl || rawFontUrl, resolve, rawFontUrl) })
        .catch(() => {
          if (USE_CLOUD_FUNCTIONS) console.warn(`[FontLoader] cloud:// 字体换取失败: ${fontFamily}`)
          resolve()
        })
      return
    }
    // 字体 URL HTTPS 升级（非 localhost）
    let fullUrl = rawFontUrl.startsWith('http') ? rawFontUrl : API_BASE + rawFontUrl
    if (fullUrl.startsWith('http://') && !fullUrl.includes('127.0.0.1') && !fullUrl.includes('localhost')) {
      fullUrl = fullUrl.replace('http://', 'https://')
    }

    downloadAndLoadFont(fontFamily, fullUrl, resolve)
  })
}

/**
 * 下载字体文件并调用 loadFontFace 注册。
 * MP-WEIXIN 按平台分流：
 *   开发者工具：webview 加载网络字体有已知 ERR_CACHE_MISS bug，
 *     直接下载到本地 → loadFontFace(local tempFilePath)（工具内本地路径可用）
 *   真机：loadFontFace(https URL)（需 downloadFile 合法域名）
 *     → 失败降级 cloud.downloadFile(cloud:// fileID) → base64 data URL → loadFontFace
 *       （真机不支持本地路径，但支持 data URL；cloud.downloadFile 免域名白名单）
 * 其他平台：直接 loadFontFace(https URL)。
 */
function downloadAndLoadFont(fontFamily: string, fullUrl: string, resolve: () => void, cloudFileID?: string) {
  fontsLoading++

  // #ifdef MP-WEIXIN
  const finish = (ok: boolean) => {
    if (ok) loadedFonts.add(fontFamily)
    else console.warn('[FontLoader] Failed: ' + fontFamily + ', src=' + fullUrl.slice(0, 80))
    fontsLoading--
    if (fontsLoading <= 0) notifyFontLoadComplete()
    resolve()
  }
  const loadViaUrl = (url: string, onFail: () => void) => {
    if (typeof wx === 'undefined' || typeof wx.loadFontFace !== 'function') {
      console.warn(`[FontLoader] wx.loadFontFace not available, skip: ${fontFamily}`)
      finish(false)
      return
    }
    wx.loadFontFace({
      family: fontFamily,
      source: 'url("' + url + '")',
      global: true,
      scopes: ['webview', 'canvas'],
      success: () => {
        console.log('[FontLoader] Loaded: ' + fontFamily)
        finish(true)
      },
      fail: onFail,
    })
  }

  // 下载字体到本地临时文件（cloud:// 走 cloud.downloadFile 免域名；https 走 downloadFile）
  const downloadToLocal = (onOk: (p: string) => void, onFail: () => void) => {
    const tryHttp = () => {
      if (typeof wx === 'undefined' || typeof wx.downloadFile !== 'function' || !/^https?:\/\//.test(fullUrl)) {
        onFail()
        return
      }
      wx.downloadFile({
        url: fullUrl,
        success: (r: any) => {
          if (r.statusCode === 200 && r.tempFilePath) onOk(r.tempFilePath)
          else {
            console.warn('[FontLoader] downloadFile failed: ' + fontFamily + ', status: ' + r.statusCode)
            onFail()
          }
        },
        fail: (err: any) => {
          console.warn('[FontLoader] downloadFile error: ' + fontFamily, err)
          onFail()
        },
      })
    }
    if (cloudFileID && wx.cloud && typeof wx.cloud.downloadFile === 'function') {
      wx.cloud.downloadFile({
        fileID: cloudFileID,
        success: (r: any) => {
          if (r.tempFilePath) onOk(r.tempFilePath)
          else tryHttp()
        },
        fail: (err: any) => {
          console.warn('[FontLoader] cloud.downloadFile failed: ' + fontFamily, err)
          tryHttp()
        },
      })
    } else {
      tryHttp()
    }
  }

  // 读取本地文件为 base64 → data URL（真机 loadFontFace 不支持本地路径，但支持 data URL）
  const loadViaDataUrl = (localPath: string, onFail: () => void) => {
    try {
      wx.getFileSystemManager().readFile({
        filePath: localPath,
        encoding: 'base64',
        success: (r: any) => {
          const src = cloudFileID || fullUrl
          const ext = src.includes('.woff2') ? 'font/woff2'
            : src.includes('.woff') ? 'font/woff'
            : 'font/ttf'
          loadViaUrl(`data:${ext};charset=utf-8;base64,${r.data}`, onFail)
        },
        fail: () => {
          console.warn('[FontLoader] readFile base64 failed: ' + fontFamily)
          onFail()
        },
      })
    } catch {
      onFail()
    }
  }

  // 判定是否开发者工具：用于决定字体加载策略（微信 devtools 有 ERR_CACHE_MISS）。
  // 使用 getDeviceInfo/getWindowInfo 拆分新 API，避免 deprecated getSystemInfoSync 告警。
  const isDevtools = (() => {
    try {
      // @ts-ignore getDeviceInfo 基础库 2.20.1+
      if (typeof uni.getDeviceInfo === 'function') {
        const info = (uni as any).getDeviceInfo()
        if (info?.platform === 'devtools') return true
        if (info?.platform) return false
      }
      // @ts-ignore 兜底 getAppBaseInfo（小程序基础库 2.20.2+）
      if (typeof uni.getAppBaseInfo === 'function') {
        const info = (uni as any).getAppBaseInfo()
        if (info?.host?.envType === 'develop' || info?.envVersion === 'develop') return true
      }
      // 旧基础库兜底（已 deprecated，但兼容旧环境）
      const info = uni.getSystemInfoSync() as any
      return info?.platform === 'devtools'
    } catch { return false }
  })()

  if (isDevtools) {
    // 开发者工具：wx.loadFontFace(https) 有已知 ERR_CACHE_MISS bug，直接 downloadFile→本地 tempPath→loadFontFace
    downloadToLocal((p) => loadViaUrl(p, () => finish(false)), () => finish(false))
  } else {
    // 真机：wx.loadFontFace(https URL) 需要域名在「downloadFile 合法域名」白名单（mp 控制台配置）。
    // 生产域名 636c-cloud1-d4gyvmo1d9a1e148a-1459215386.tcb.qcloud.la 未配置白名单时会失败，
    // 然后自动降级为 cloud.downloadFile（免白名单）+ base64 data URL 加载。该降级属于正常流程，
    // 仅用 info 级日志，避免与真实报错混淆。
    loadViaUrl(fullUrl, () => {
      console.info('[FontLoader] https 直连未生效（未配置 downloadFile 合法域名或临时链接过期），降级 cloud.downloadFile + data URL: ' + fontFamily)
      // 真机 loadFontFace 不支持本地 tempFilePath（只支持 https / data URL），
      // data URL 加载失败后不要再回退 loadFontFace(本地路径)——必然失败，直接终止
      downloadToLocal(
        (p) => loadViaDataUrl(p, () => finish(false)),
        () => finish(false),
      )
    })
  }
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
