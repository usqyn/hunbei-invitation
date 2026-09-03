// ============ 图片滤镜工具 ============
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
  const canvas = wx.createOffscreenCanvas({ type: '2d' })
  const ctx = canvas.getContext('2d') as any
  const loadImg = (src: string) => new Promise<any>((resolve, reject) => {
    const img = canvas.createImage()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败: ' + String(src).slice(0, 60)))
    img.src = src
  })
  const [newImg, maskImg] = await Promise.all([loadImg(newImagePath), loadImg(maskPath)])
  const W = maskImg.width
  const H = maskImg.height
  if (!W || !H) throw new Error('蒙版图尺寸异常')

  canvas.width = W
  canvas.height = H
  // 新图 cover 填充整个画布
  const scale = Math.max(W / newImg.width, H / newImg.height)
  const dw = newImg.width * scale
  const dh = newImg.height * scale
  ctx.drawImage(newImg, (W - dw) / 2, (H - dh) / 2, dw, dh)
  // 原图 alpha 裁剪（保留形状内像素）
  ctx.globalCompositeOperation = 'destination-in'
  ctx.drawImage(maskImg, 0, 0, W, H)

  const dataUrl = canvas.toDataURL('image/png')
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
  const filePath = `${wx.env.USER_DATA_PATH}/masked_${Date.now()}_${Math.floor(Math.random() * 1e4)}.png`
  await new Promise<void>((resolve, reject) => {
    wx.getFileSystemManager().writeFile({
      filePath,
      data: base64,
      encoding: 'base64',
      success: () => resolve(),
      fail: (e: any) => reject(e),
    })
  })
  return filePath
  // #endif
  // #ifndef MP-WEIXIN
  throw new Error('蒙版合成仅支持微信小程序')
  // #endif
}
