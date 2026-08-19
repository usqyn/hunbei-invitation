// Admin 浏览器端字体加载：把已上传/服务的字体通过 FontFace API 注入浏览器，
// 使 fabric 画布渲染与 PNG 导出真正使用该字体（而不是依赖本机已安装字体）。
// 基础字体（fontListBase）已有 @font-face 声明，无需注入。

const injectedFonts = new Set<string>()

export async function ensureFontLoaded(family: string, url?: string): Promise<void> {
  if (!family || injectedFonts.has(family)) return
  if (!url || typeof document === 'undefined' || !('fonts' in document)) return
  try {
    const face = new FontFace(family, `url(${JSON.stringify(url)})`)
    face.display = 'swap'
    ;(document as any).fonts.add(face)
    await face.load()
    injectedFonts.add(family)
  } catch (e) {
    console.warn(`[AdminFont] 字体「${family}」加载失败，画布将使用本机字体或默认字体`, e)
  }
}

/** 本地打包的基础字体（public/fonts，已有 @font-face 声明但懒加载）。
 *  显式注入 FontFace 并等待就绪，保证 fabric 画布首次渲染即使用真实字体（而非系统回退） */
const BASE_FONTS: Array<{ family: string; url: string }> = [
  { family: 'KazakhSoftAsilya', url: '/fonts/KazakhSoftAsilya.ttf' },
  { family: 'KazakhSoftAsilyaQaniq', url: '/fonts/KazakhSoftAsilyaQaniq.ttf' },
  { family: 'AlimamaFangYuanTiVF', url: '/fonts/AlimamaFangYuanTiVF.ttf' },
]

export async function preloadBaseFonts(): Promise<void> {
  await Promise.all(BASE_FONTS.map(f => ensureFontLoaded(f.family, f.url)))
}