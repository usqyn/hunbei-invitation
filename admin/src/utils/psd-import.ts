// PSD 文件解析与导入工具
// 基于 ag-psd（Photopea 同款解析库）在浏览器端解析 Photoshop 源文件：
//  - 安全校验（先读结构、拒绝超大尺寸，防 DoS）
//  - 图层树展平（跳过隐藏层 / 调整层）
//  - 文字层提取：文本 NFKC 归一化（处理已成形/视觉序字符）、字号换算、样式映射
//  - 字体模糊匹配到系统字体表（哈萨克阿拉伯文 RTL 文本由现有链路兜底 KazakhSoftAsilya）
import { readPsd } from 'ag-psd'
import type { Psd, Layer, LayerTextData, TextStyle, Color, Justification, ImageResources } from 'ag-psd'

// 安全上限：超过该尺寸的 PSD 直接拒绝（ag-psd 官方安全指南建议）
export const MAX_PSD_DIMENSION = 10000

export interface PsdLayerPreview {
  id: string
  name: string
  type: 'image' | 'text'
  left: number
  top: number
  width: number
  height: number
  rotation: number
  opacity: number
  blendMode: string
  /** 图层栅格图（PNG dataURL），文字层为空 */
  dataUrl: string
  // ===== 文字层字段 =====
  text?: string
  /** 字号（px，已按 PSD 分辨率换算） */
  fontSize?: number
  /** PSD 原始字号（pt） */
  fontSizePt?: number
  /** PSD 原始字体名 */
  fontName?: string
  /** 映射后的系统字体名 */
  mappedFont?: string
  color?: string
  textAlign?: 'left' | 'center' | 'right' | 'justify'
  lineHeight?: number
  letterSpacing?: number
  strokeColor?: string
  strokeWidth?: number
  /** 该层是否带图层样式（阴影/描边/叠加等，栅格图中不含效果） */
  hasEffects: boolean
  warnings: string[]
}

export interface PsdImportResult {
  width: number
  height: number
  /** 文档分辨率（dpi 或 dpcm） */
  resolution: number
  resolutionUnit: 'PPI' | 'PPCM'
  layers: PsdLayerPreview[]
  skipped: { name: string; reason: string }[]
  warnings: string[]
}

/** RGBA/RGB/FRGB 颜色 → #rrggbb 或 #rrggbbaa */
export function colorToHex(color: Color | undefined): string | undefined {
  if (!color) return undefined
  const c = color as any
  if (c.r != null && c.g != null && c.b != null) {
    const to2 = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
    const alpha = c.a != null && c.a < 255 ? to2(c.a) : ''
    return `#${to2(c.r)}${to2(c.g)}${to2(c.b)}${alpha}`
  }
  if (c.fr != null && c.fg != null && c.fb != null) {
    const to2 = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255))).toString(16).padStart(2, '0')
    return `#${to2(c.fr)}${to2(c.fg)}${to2(c.fb)}`
  }
  return undefined
}

/** 文本归一化：NFKC 将展示形式（已成形阿拉伯字形 U+FB50+ / U+FE70+）还原为基础字母，
 *  避免二次 shaping 导致哈萨克阿拉伯文显示错乱 */
export function normalizeText(value: string): string {
  if (!value) return ''
  return value.normalize('NFKC').replace(/\u0000/g, '').trim()
}

/** PSD 文字字号（pt）→ px：按文档分辨率换算（1pt = 1/72 英寸） */
export function resolveFontSizePx(fontSizePt: number | undefined, resolution: number, unit: 'PPI' | 'PPCM'): number {
  if (!fontSizePt || fontSizePt <= 0) return 0
  const pxPerPt = unit === 'PPCM' ? (resolution * 2.54) / 72 : resolution / 72
  return Math.round(fontSizePt * pxPerPt * 100) / 100
}

/** 从 PSD 分辨率资源取 dpi/dpcm（默认 72 PPI） */
export function getResolutionInfo(info: ImageResources | undefined): { resolution: number; unit: 'PPI' | 'PPCM' } {
  const res = info?.resolutionInfo
  if (!res || !res.horizontalResolution) return { resolution: 72, unit: 'PPI' }
  return {
    resolution: res.horizontalResolution,
    unit: res.horizontalResolutionUnit === 'PPCM' ? 'PPCM' : 'PPI',
  }
}

/** 文字层 6 元素仿射矩阵 → 旋转角（度）。矩阵约定 [a, b, c, d, tx, ty]，a/b 为水平轴 */
export function extractRotationFromTransform(transform: number[] | undefined): number {
  if (!transform || transform.length < 4) return 0
  const [a, b] = transform
  if (a === 0 && b === 0) return 0
  return Math.round((Math.atan2(b, a) * 180) / Math.PI * 100) / 100
}

/** PSD 段落对齐 → 编辑器 textAlign */
export function mapJustification(j: Justification | undefined): 'left' | 'center' | 'right' | 'justify' | undefined {
  if (!j) return undefined
  switch (j) {
    case 'left': return 'left'
    case 'center': return 'center'
    case 'right': return 'right'
    case 'justify-left':
    case 'justify-right':
    case 'justify-center':
    case 'justify-all':
      return 'justify'
    default: return undefined
  }
}

/** 归一化字体名用于模糊匹配（去空格/连字符/大小写） */
function normalizeFontName(name: string): string {
  return name.toLowerCase().replace(/[\s\-_.]+/g, '').replace(/,.*$/, '')
}

/** 字体模糊匹配：PSD 字体名 → 系统字体名。
 *  匹配规则：忽略大小写/空格/连字符后包含或被包含；特殊别名（kz/kazakh/arabic → 哈萨克字体兜底） */
export function mapFontName(psdFont: string | undefined, available: string[]): { mapped?: string; replacement: boolean } {
  if (!psdFont) return { replacement: false }
  const norm = normalizeFontName(psdFont)
  if (!norm) return { replacement: false }

  for (const candidate of available) {
    const base = normalizeFontName(candidate)
    if (!base) continue
    // 完全一致或互为子串（去除字体栈尾缀后）
    if (base === norm || base.includes(norm) || norm.includes(base)) {
      return { mapped: candidate, replacement: base !== norm }
    }
  }
  return { replacement: false }
}

/** 展平图层树（跳过隐藏层），保留文档顺序（自底向上）。返回预处理后的图层列表 */
export function flattenPsdLayers(
  psd: Psd,
  options: {
    resolution: number
    resolutionUnit: 'PPI' | 'PPCM'
    availableFonts: string[]
  },
): { layers: PsdLayerPreview[]; skipped: { name: string; reason: string }[]; warnings: string[] } {
  const { resolution, resolutionUnit, availableFonts } = options
  const layers: PsdLayerPreview[] = []
  const skipped: { name: string; reason: string }[] = []
  const warnings: string[] = []

  const walk = (children: Layer[] | undefined, depth: number) => {
    if (!children || depth > 50) return
    for (const layer of children) {
      // 组节点：递归子层，组本身不入画布
      if (layer.children && layer.children.length > 0) {
        walk(layer.children, depth + 1)
        continue
      }
      const name = layer.name || '未命名图层'
      if (layer.hidden) {
        skipped.push({ name, reason: '隐藏图层' })
        continue
      }
      // 调整层：无栅格内容，效果在合成图中，无法按层导入
      if (layer.adjustment) {
        skipped.push({ name, reason: '调整层（色阶/曲线等）效果无法单独导入' })
        continue
      }

      const hasEffects = !!(layer.effects && Object.keys(layer.effects).some(k => (layer.effects as any)[k] != null && (layer.effects as any)[k].enabled !== false))
      const layerWarnings: string[] = []
      if (hasEffects) {
        layerWarnings.push('含图层样式（阴影/描边/叠加等），栅格图中不包含这些效果')
        warnings.push(`图层「${name}」含图层样式，导入后效果将丢失（建议在 Photoshop 中先栅格化图层样式）`)
      }
      if (layer.blendMode && layer.blendMode !== 'normal' && layer.blendMode !== 'pass through') {
        layerWarnings.push(`混合模式「${layer.blendMode}」：编辑器画布与小程序端均不支持，将按普通模式显示`)
        warnings.push(`图层「${name}」混合模式「${layer.blendMode}」无法还原`)
      }

      // 边界：文字层 bounds 可能为 0x0（ag-psd 已知问题 #251），用栅格尺寸兜底
      let left = layer.left ?? 0
      let top = layer.top ?? 0
      let width = (layer.right ?? 0) - left
      let height = (layer.bottom ?? 0) - top

      const textData: LayerTextData | null | undefined = layer.text
      const canvas = layer.canvas as HTMLCanvasElement | undefined
      const isTextLayer = !!textData && textData.text != null && textData.text.length > 0

      if ((width <= 0 || height <= 0) && canvas) {
        width = canvas.width
        height = canvas.height
        if (isTextLayer && textData?.transform) {
          // 文字层 bounds 缺失时，用 transform 平移量定位（pt → px）
          const pxPerPt = resolutionUnit === 'PPCM' ? (resolution * 2.54) / 72 : resolution / 72
          left = (textData.transform[4] || 0) * pxPerPt
          top = (textData.transform[5] || 0) * pxPerPt
        }
      }

      const opacity = layer.opacity == null ? 1 : Math.max(0, Math.min(1, layer.opacity / 255))
      const blendMode = layer.blendMode || 'normal'

      if (isTextLayer) {
        const style: TextStyle | undefined = textData.style
        const rawText = textData.text || ''
        const text = normalizeText(rawText)
        const fontName = style?.font?.name
        const mapped = mapFontName(fontName, availableFonts)
        const fontSizePx = resolveFontSizePx(style?.fontSize, resolution, resolutionUnit)
        const fontSizePt = style?.fontSize
        if (mapped.replacement) {
          warnings.push(`图层「${name}」字体「${fontName}」映射为「${mapped.mapped}」`)
        } else if (fontName && !mapped.mapped) {
          warnings.push(`图层「${name}」字体「${fontName}」系统中不存在，RTL 文本将使用 KazakhSoftAsilya，其余使用默认字体`)
        }

        // PSD 文字样式 → 编辑器文字样式
        const color = colorToHex(style?.fillColor) || '#333333'
        const strokeColor = style?.strokeColor ? colorToHex(style.strokeColor) : undefined
        const strokeWidth = style?.outlineWidth ? Math.round(style.outlineWidth) : 0
        const justification = mapJustification(textData.paragraphStyle?.justification)
        // tracking 单位 1/1000 em，与编辑器 letterSpacing 语义一致（RTL 由现有链路强制 0）
        const tracking = style?.tracking != null ? Math.round(style.tracking) : 0
        // leading → lineHeight 比值：PSD leading 单位 1/1000 em
        const lineHeight = style?.leading != null && style.fontSize ? style.leading / style.fontSize : undefined

        layers.push({
          id: `psd_${layers.length}`,
          name,
          type: 'text',
          left,
          top,
          width: Math.max(1, width),
          height: Math.max(1, height),
          rotation: extractRotationFromTransform(textData.transform),
          opacity,
          blendMode,
          dataUrl: canvas ? canvas.toDataURL('image/png') : '',
          text,
          fontSize: fontSizePx || undefined,
          fontSizePt,
          fontName,
          mappedFont: mapped.mapped,
          color,
          textAlign: justification,
          lineHeight: lineHeight != null && lineHeight > 0 ? Math.round(lineHeight * 100) / 100 : undefined,
          letterSpacing: tracking || 0,
          strokeColor: strokeColor && strokeColor !== '#00000000' ? strokeColor : 'transparent',
          strokeWidth: strokeWidth > 0 ? strokeWidth : 0,
          hasEffects,
          warnings: layerWarnings,
        })
        continue
      }

      // 图片类图层（含智能对象/矢量层，均有栅格预览）
      if (!canvas) {
        skipped.push({ name, reason: layer.placedLayer ? '智能对象无预览数据' : '无栅格数据（无法导入）' })
        continue
      }
      let dataUrl: string
      try {
        dataUrl = canvas.toDataURL('image/png')
      } catch (_) {
        skipped.push({ name, reason: '图层栅格转换失败' })
        continue
      }

      layers.push({
        id: `psd_${layers.length}`,
        name,
        type: 'image',
        left,
        top,
        width: Math.max(1, width),
        height: Math.max(1, height),
        rotation: 0,
        opacity,
        blendMode,
        dataUrl,
        hasEffects,
        warnings: layerWarnings,
      })
    }
  }

  walk(psd.children, 0)
  return { layers, skipped, warnings }
}

/**
 * 解析 PSD 文件（浏览器端）。
 * 先按 ag-psd 官方安全指南用 useRawData 读结构校验尺寸，再完整解析位图。
 */
export async function parsePsdFile(file: File, availableFonts: string[]): Promise<PsdImportResult> {
  const buffer = await file.arrayBuffer()

  // 第一遍：只读结构（不解码位图），校验尺寸防止恶意文件耗尽内存
  let structure: Psd
  try {
    structure = readPsd(buffer, { useRawData: true, useRawThumbnail: true, skipLinkedFilesData: true, skipThumbnail: true })
  } catch (err) {
    throw new Error(`PSD 解析失败（文件可能已损坏或不是有效的 Photoshop 源文件）：${(err as Error).message}`)
  }
  if (!structure.width || !structure.height) {
    throw new Error('PSD 尺寸无效')
  }
  if (structure.width > MAX_PSD_DIMENSION || structure.height > MAX_PSD_DIMENSION) {
    throw new Error(`PSD 尺寸 ${structure.width}×${structure.height} 超过安全上限 ${MAX_PSD_DIMENSION}px，请缩小画布后重试`)
  }

  // 第二遍：完整解析（含图层位图）
  const psd = readPsd(buffer, { skipThumbnail: true, skipLinkedFilesData: true })
  const { resolution, unit } = getResolutionInfo(psd.imageResources)
  const { layers, skipped, warnings } = flattenPsdLayers(psd, {
    resolution,
    resolutionUnit: unit,
    availableFonts,
  })

  return {
    width: psd.width,
    height: psd.height,
    resolution,
    resolutionUnit: unit,
    layers,
    skipped,
    warnings,
  }
}