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