// ============ 图片滤镜工具 ============
import { tempHttpsToCloudFileId } from './url'

// 把元素上的滤镜字段（brightness/contrast/saturate/blur/grayscale）转为 CSS filter 字符串。
// 在 editor 三种模式（canvas/flip/page）以及 preview 页复用，保证编辑与预览效果一致。
//
// 字段格式与默认值（与 admin/src/composables/useCanvas.ts applyImagePatch + admin RightPanel.vue 完全对齐）：
//   brightness: 0~200，默认 100（100% = 原始，>100 变亮，<100 变暗）
//   contrast:   -100~100，默认 0（偏移量，0 = 不变，>0 增强对比，<0 降低对比）
//   saturate:   0~200，默认 100（100% = 原始，0 = 灰度，>100 鲜艳）
//   blur:       0~20，默认 0（单位 px，0 = 无模糊）
//   grayscale:  0~100，默认 0（0 = 彩色，100 = 完全灰度）
//
// CSS filter 公式（与 admin useCanvas.ts cssFilter 一致）：
//   brightness(${brightness}%) contrast(${100 + contrast}%) saturate(${saturate}%) blur(${blur}px) grayscale(${grayscale}%)
//
// 注意：微信小程序对 CSS filter 支持度有限（grayscale/blur 等部分滤镜在真机可能被静默忽略），
// 但开发工具与 H5 端正常工作。生产真机渲染需后续 Canvas 像素级处理。

export interface FilterFields {
  brightness?: number
  contrast?: number
  saturate?: number
  blur?: number
  grayscale?: number
}

export const FILTER_DEFAULTS = {
  brightness: 100,
  contrast: 0,
  saturate: 100,
  blur: 0,
  grayscale: 0,
} as const

/**
 * 判断元素是否设置了非默认滤镜（用于决定是否输出 filter 属性）。
 */
export function hasImageFilter(el: FilterFields | null | undefined): boolean {
  if (!el) return false
  return (
    (el.brightness != null && el.brightness !== FILTER_DEFAULTS.brightness) ||
    (el.contrast != null && el.contrast !== FILTER_DEFAULTS.contrast) ||
    (el.saturate != null && el.saturate !== FILTER_DEFAULTS.saturate) ||
    (el.blur != null && el.blur !== FILTER_DEFAULTS.blur) ||
    (el.grayscale != null && el.grayscale !== FILTER_DEFAULTS.grayscale)
  )
}

/**
 * 把滤镜字段转换为 CSS filter 字符串。
 * 任一非默认值时返回完整 filter 串（避免部分字段缺失导致渲染跳变）；
 * 全部为默认值时返回空字符串（不写 filter 属性，避免无谓重绘）。
 *
 * 用法：
 *   const f = buildImageCssFilter(el.brightness ?? el.style?.brightness, ...)
 *   if (f) style.filter = f
 *
 * 或更推荐：直接用 buildImageCssFilterFromElement(el)
 */
export function buildImageCssFilter(
  brightness?: number,
  contrast?: number,
  saturate?: number,
  blur?: number,
  grayscale?: number,
): string {
  if (
    (brightness == null || brightness === FILTER_DEFAULTS.brightness) &&
    (contrast == null || contrast === FILTER_DEFAULTS.contrast) &&
    (saturate == null || saturate === FILTER_DEFAULTS.saturate) &&
    (blur == null || blur === FILTER_DEFAULTS.blur) &&
    (grayscale == null || grayscale === FILTER_DEFAULTS.grayscale)
  ) {
    return ''
  }
  const b = brightness ?? FILTER_DEFAULTS.brightness
  const c = contrast ?? FILTER_DEFAULTS.contrast
  const s = saturate ?? FILTER_DEFAULTS.saturate
  const bl = blur ?? FILTER_DEFAULTS.blur
  const g = grayscale ?? FILTER_DEFAULTS.grayscale
  return `brightness(${b}%) contrast(${100 + c}%) saturate(${s}%) blur(${bl}px) grayscale(${g}%)`
}

/**
 * 从元素上读取滤镜字段（优先 element 级别，回退 style 级别），生成 CSS filter 字符串。
 * 与 useCanvasRender.ts getCanvasElementStyle 中滤镜逻辑一致，提取为工具供 flip/page 模式复用。
 */
export function buildImageCssFilterFromElement(el: FilterFields & { style?: FilterFields } | null | undefined): string {
  if (!el) return ''
  const st: FilterFields = (el.style as FilterFields) || {}
  return buildImageCssFilter(
    el.brightness ?? st.brightness,
    el.contrast ?? st.contrast,
    el.saturate ?? st.saturate,
    el.blur ?? st.blur,
    el.grayscale ?? st.grayscale,
  )
}

// ============ 换图蒙版合成 ============
// 用户替换 alpha 蒙版图片时，把新图与原模板图（形状烘焙在 alpha 通道）
// 在离屏 canvas 上合成，生成自带蒙版形状的新图再上传。
// 与 admin 端 PSD 导入 bakeClipMask 逻辑一致，合成结果对
// webview / skyline / canvas / 导出渲染全部有效，不依赖 CSS mask-image 兼容性。

/**
 * 把任意图片来源解析为「本地可绘制路径」（供 canvas drawImage 使用）。
 * 通道优先级：
 *   本地路径/data URL → 直接返回
 *   cloud:// → wx.cloud.downloadFile（免域名白名单）
 *   云存储签名 https（tcb 主机）→ 反推 fileID → wx.cloud.downloadFile
 *   其它 https → uni.downloadFile（需 downloadFile 白名单，最后兜底）
 * 真机上 uni.downloadFile 加载云存储 https 需要配置合法域名，未配置必失败；
 * 云通道按 fileID 下载，不受白名单限制。
 */
export function resolveLocalPath(src: string): Promise<string> {
  if (!src) return Promise.reject(new Error('空 URL'))
  // 本地 / data URL 直接可用
  if (/^(wxfile|file):\/\//i.test(src) || /^http:\/\/tmp\//i.test(src) || src.startsWith('data:')) {
    return Promise.resolve(src)
  }
  // #ifdef MP-WEIXIN
  const viaCloud = (fileID: string) =>
    new Promise<string>((resolve, reject) => {
      if (typeof wx === 'undefined' || !wx.cloud || typeof wx.cloud.downloadFile !== 'function') {
        reject(new Error('wx.cloud.downloadFile 不可用'))
        return
      }
      wx.cloud.downloadFile({
        fileID,
        success: (r: any) => (r.tempFilePath ? resolve(r.tempFilePath) : reject(new Error('无 tempFilePath'))),
        fail: reject,
      })
    })
  if (src.startsWith('cloud://')) return viaCloud(src)
  if (/^https?:\/\//i.test(src)) {
    // 云存储签名链接：优先反推 fileID 走云通道（免白名单）
    try {
      const fileId = tempHttpsToCloudFileId(src)
      if (fileId) return viaCloud(fileId)
    } catch { /* 反推失败走 https 兜底 */ }
  }
  // #endif
  return downloadToTemp(src)
}

/** 下载任意资源 URL 到本地临时文件（cloud:// 走 cloud.downloadFile，免域名白名单） */
export function downloadToTemp(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!url) { reject(new Error('空 URL')); return }
    // #ifdef MP-WEIXIN
    if (url.startsWith('cloud://')) {
      if (typeof wx === 'undefined' || !wx.cloud || typeof wx.cloud.downloadFile !== 'function') {
        reject(new Error('wx.cloud.downloadFile 不可用'))
        return
      }
      wx.cloud.downloadFile({
        fileID: url,
        success: (r: any) => {
          if (r.tempFilePath) resolve(r.tempFilePath)
          else reject(new Error('cloud 下载无 tempFilePath'))
        },
        fail: (e: any) => reject(e),
      })
      return
    }
    // #endif
    if (/^https?:\/\//.test(url)) {
      uni.downloadFile({
        url,
        success: (r: any) => {
          if (r.statusCode === 200 && r.tempFilePath) resolve(r.tempFilePath)
          else reject(new Error('下载失败 status=' + r.statusCode))
        },
        fail: (e: any) => reject(e),
      })
      return
    }
    // 本地路径（wxfile://tmp、http://tmp 等）直接返回
    resolve(url)
  })
}

// 离屏 canvas 单例：真机上 wx.createOffscreenCanvas 第二次调用会返回异常 canvas，
// 合成结果全黑（表现为「第一次换图正常、第二次开始变黑且再也换不掉」）。
// 此处复用同一实例规避，并在每次绘制前显式清空 + 重置合成模式（与 compositeWithPageCanvas 一致）。
let _offscreenCanvas: any = null
function getOffscreenCanvas(): any {
  if (!_offscreenCanvas) {
    _offscreenCanvas = wx.createOffscreenCanvas({ type: '2d' })
  }
  return _offscreenCanvas
}

/**
 * 合成蒙版图：
 * 1. 以原模板图（蒙版源）的原始尺寸建离屏 canvas
 * 2. 新图按 cover 填充绘制
 * 3. globalCompositeOperation = destination-in 绘制原图 → 只保留形状内像素
 * 4. 导出 PNG 写入用户目录，返回本地文件路径
 */
export async function compositeImageWithMask(newImagePath: string, maskSrcUrl: string): Promise<string> {
  // #ifdef MP-WEIXIN
  if (typeof wx === 'undefined' || typeof wx.createOffscreenCanvas !== 'function') {
    throw new Error('offscreen canvas 不可用')
  }
  const maskPath = await downloadToTemp(maskSrcUrl)
  console.log('[composite] maskSrc=', maskSrcUrl.slice(0, 60), 'maskLocal=', maskPath)
  const canvas = getOffscreenCanvas()
  const ctx = canvas.getContext('2d') as any
  const loadImg = (src: string) => new Promise<any>((resolve, reject) => {
    const img = canvas.createImage()
    img.onload = () => resolve(img)
    img.onerror = (e: any) => reject(new Error('图片加载失败: ' + String(src).slice(0, 60) + ' ' + JSON.stringify(e)))
    img.src = src
  })
  const [newImg, maskImg] = await Promise.all([loadImg(newImagePath), loadImg(maskPath)])
  const W = maskImg.width
  const H = maskImg.height
  if (!W || !H) throw new Error('蒙版图尺寸异常')
  console.log('[composite] 新图', newImg.width + 'x' + newImg.height, '蒙版', W + 'x' + H)

  canvas.width = W
  canvas.height = H
  // 显式重置：设置 width 理论上会重置画布，但复用单例时真机可能残留上一次的像素与
  // destination-in 合成模式，不清空会导致第二次合成得到黑图。
  // 与 compositeWithPageCanvas 的处理保持一致。
  ctx.globalCompositeOperation = 'source-over'
  ctx.clearRect(0, 0, W, H)
  // 新图 cover 填充整个画布
  const scale = Math.max(W / newImg.width, H / newImg.height)
  const dw = newImg.width * scale
  const dh = newImg.height * scale
  ctx.drawImage(newImg, (W - dw) / 2, (H - dh) / 2, dw, dh)
  // 原图 alpha 裁剪（保留形状内像素）
  ctx.globalCompositeOperation = 'destination-in'
  ctx.drawImage(maskImg, 0, 0, W, H)
  // 合成后立即设回 source-over，避免下次复用时残留 destination-in
  ctx.globalCompositeOperation = 'source-over'

  // 导出：优先 toDataURL（同步，能立即拿到像素），失败再用 canvasToTempFilePath。
  // 真机上 canvasToTempFilePath 对 offscreen canvas 偶发黑图，故 toDataURL 优先。
  let filePath: string | null = null
  try {
    const dataUrl = canvas.toDataURL('image/png')
    if (dataUrl && dataUrl.length > 100 && dataUrl.startsWith('data:image/png')) {
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
      // 校验：base64 至少几 KB 才算有效（避免空/黑图）
      if (base64.length > 2048) {
        const fp = `${wx.env.USER_DATA_PATH}/masked_${Date.now()}_${Math.floor(Math.random() * 1e4)}.png`
        await new Promise<void>((resolve, reject) => {
          wx.getFileSystemManager().writeFile({
            filePath: fp,
            data: base64,
            encoding: 'base64',
            success: () => resolve(),
            fail: (e: any) => reject(e),
          })
        })
        filePath = fp
        console.log('[composite] toDataURL 导出成功', fp, 'base64长度', base64.length)
      } else {
        console.warn('[composite] toDataURL 结果过小，疑似黑图，长度=', base64.length)
      }
    } else {
      console.warn('[composite] toDataURL 无效:', dataUrl ? dataUrl.slice(0, 60) : '空')
    }
  } catch (e) {
    console.warn('[composite] toDataURL 异常:', e)
  }

  // toDataURL 失败时回退 canvasToTempFilePath
  if (!filePath) {
    const tmpPath = await new Promise<string>((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvas,
        fileType: 'png',
        success: (r: any) => {
          console.log('[composite] canvasToTempFilePath 导出成功', r.tempFilePath)
          resolve(r.tempFilePath)
        },
        fail: (e: any) => reject(new Error('导出失败: ' + JSON.stringify(e))),
      } as any)
    })
    // 确保返回路径带 .png 扩展名，否则 uploadImage 会走压缩转 JPEG 丢 alpha
    if (!/\.png$/i.test(tmpPath)) {
      const fp = `${wx.env.USER_DATA_PATH}/masked_${Date.now()}_${Math.floor(Math.random() * 1e4)}.png`
      const buf = await new Promise<ArrayBuffer>((resolve, reject) => {
        wx.getFileSystemManager().readFile({
          filePath: tmpPath,
          success: (r: any) => resolve(r.data),
          fail: reject,
        })
      })
      await new Promise<void>((resolve, reject) => {
        wx.getFileSystemManager().writeFile({
          filePath: fp,
          data: buf,
          success: () => resolve(),
          fail: reject,
        })
      })
      filePath = fp
      console.log('[composite] 已复制为 .png 路径', fp)
    } else {
      filePath = tmpPath
    }
  }

  return filePath
  // #endif
  // #ifndef MP-WEIXIN
  throw new Error('蒙版合成仅支持微信小程序')
  // #endif
}
