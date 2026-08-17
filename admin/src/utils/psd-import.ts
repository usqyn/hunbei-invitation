// PSD 文件解析与导入工具
// 基于 ag-psd（Photopea 同款解析库）在浏览器端解析 Photoshop 源文件：
//  - 安全校验（先读结构、拒绝超大尺寸，防 DoS）
//  - 图层树展平（跳过隐藏层 / 调整层）
//  - 文字层提取：文本 NFKC 归一化（处理已成形/视觉序字符）、字号换算、样式映射
//  - 字体模糊匹配到系统字体表（哈萨克阿拉伯文 RTL 文本由现有链路兜底 KazakhSoftAsilya）
//  - 图层样式部分还原：文字层投影/描边 → 元素字段；图片层投影/描边 → canvas 合成近似
//  - 智能对象嵌入文件提取（外链/无栅格数据无法恢复）
import { readPsd } from 'ag-psd'
import type { Psd, Layer, LayerTextData, TextStyle, Color, Justification, ImageResources } from 'ag-psd'
import { containsRtl, visualToLogicalRtl } from './bidi'

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
  /** 图层样式投影（文字层：从 dropShadow 效果映射） */
  shadowColor?: string
  shadowOffsetX?: number
  shadowOffsetY?: number
  shadowBlur?: number
  /** 该层是否带图层样式（阴影/描边/叠加等，栅格图中不含效果） */
  hasEffects: boolean
  warnings: string[]
  /** 文字方向（由内容自动判定；PSD 内哈萨克文本为视觉序存储，导入时已转为逻辑序） */
  direction?: 'ltr' | 'rtl'
  /** 用户是否可编辑（导入对话框按 defaultEditable 规则勾选，提交时写入） */
  editable?: boolean
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

// 预成形字形（阿拉伯文连写形式 U+FB50+ / U+FE70+）：PSD 中哈萨克文本通常以「视觉顺序 + 预成形字形」存储，
// 而 ag-psd 往返/Photoshop 原生逻辑序文本为基础字母。检测到成形字形才做视觉→逻辑转换，避免误伤逻辑序文本。
const SHAPED_RTL_RE = /[\uFB50-\uFDFF\uFE70-\uFEFF]/

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

/**
 * 文字层仿射矩阵 → 水平缩放系数。
 * 用 Ctrl+T 自由变换缩放过的文字层，style.fontSize 是缩放前的值，实际渲染大小 = fontSize × scale；
 * 旋转/镜像矩阵的 a/b 组合模长恒为 1，不会误伤。偏离 1 不足 1% 视为无缩放。
 */
export function transformScale(transform: number[] | undefined): number {
  if (!transform || transform.length < 2) return 1
  const [a, b] = transform
  const scale = Math.hypot(a, b)
  if (!isFinite(scale) || scale <= 0) return 1
  return Math.abs(scale - 1) < 0.01 ? 1 : scale
}

/**
 * 多样式段落（styleRuns）的字号兜底：style.fontSize 缺失时取最长 run 的字号（正文主体）。
 * 例如升学宴 PSD 正文层：run1 长 1 字 70pt（前导空格），run2 长 130 字 60pt → 取 60。
 */
export function dominantRunFontSize(
  styleRuns: Array<{ length?: number; style?: { fontSize?: number } }> | undefined,
): number | undefined {
  if (!styleRuns || styleRuns.length === 0) return undefined
  let best: number | undefined
  let bestLen = -1
  for (const run of styleRuns) {
    const len = run?.length ?? 0
    if (len > bestLen && run?.style?.fontSize && run.style.fontSize > 0) {
      best = run.style.fontSize
      bestLen = len
    }
  }
  return best
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

// PSD 内常见的字体拉丁/英文名 → 系统字体名别名（模糊匹配失败后的兜底）
const FONT_ALIASES: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /sourcehanserif/i, name: '思源宋体' },
  { pattern: /sourcehansans/i, name: '思源黑体' },
  { pattern: /alimama\w*yuan/i, name: 'AlimamaFangYuanTiVF' },
  { pattern: /kaiti|kaitisc/i, name: '华文楷体' },
  { pattern: /xingkai/i, name: '华文行楷' },
  { pattern: /lisu/i, name: '华文隶书' },
]

/** 字体模糊匹配：PSD 字体名 → 系统字体名。
 *  两遍匹配：先精确（忽略大小写/空格/连字符），再子串包含；最后特殊别名（kz/kazakh/arabic → 哈萨克字体兜底）。
 *  精确匹配优先，避免 KazakhSoftAsilyaQaniq 被短名 KazakhSoftAsilya 的子串匹配抢先。
 *  注意：此处不做「用其他字体顶替缺失字体」的假修复——匹配不到时返回空，由调用方上报缺失 */
export function mapFontName(psdFont: string | undefined, available: string[]): { mapped?: string; replacement: boolean } {
  if (!psdFont) return { replacement: false }
  const norm = normalizeFontName(psdFont)
  if (!norm) return { replacement: false }

  // 第一遍：精确匹配（归一化后完全一致）
  for (const candidate of available) {
    const base = normalizeFontName(candidate)
    if (base === norm) {
      return { mapped: candidate, replacement: false }
    }
  }
  // 第二遍：互为子串（PostScript 名 → 族名，如 AlimamaFangYuanTiVF-Regular → AlimamaFangYuanTiVF）
  for (const candidate of available) {
    const base = normalizeFontName(candidate)
    if (!base) continue
    if (base.includes(norm) || norm.includes(base)) {
      return { mapped: candidate, replacement: base !== norm }
    }
  }
  // 第三遍：别名兜底（拉丁名，如 SourceHanSerifCN-Regular → 思源宋体）
  for (const alias of FONT_ALIASES) {
    if (!alias.pattern.test(norm)) continue
    const aliasBase = normalizeFontName(alias.name)
    for (const candidate of available) {
      const base = normalizeFontName(candidate)
      if (base.includes(aliasBase)) {
        return { mapped: candidate, replacement: true }
      }
    }
  }
  return { replacement: false }
}

// ============ 行高 ============

/** 行高可渲染范围：过小会裁掉字形，过大撑爆文本框 */
export const LINE_HEIGHT_MIN = 0.8
export const LINE_HEIGHT_MAX = 3

/**
 * PSD leading → 行高比值。
 * - leading > 0：leading / fontSize（PSD leading 与字号同单位）
 * - leading 为 0 且 autoLeading：Photoshop 自动行距默认 1.2
 * - 其余情况：undefined（编辑器用默认行高）
 * 结果限制在 [LINE_HEIGHT_MIN, LINE_HEIGHT_MAX]，超限标记 clamped。
 */
export function resolveLineHeight(
  leading: number | undefined,
  fontSize: number | undefined,
  autoLeading: boolean | undefined,
): { value: number | undefined; clamped: boolean } {
  let ratio: number | undefined
  if (leading != null && leading > 0 && fontSize && fontSize > 0) {
    ratio = leading / fontSize
  } else if (autoLeading) {
    ratio = 1.2
  }
  if (ratio == null) return { value: undefined, clamped: false }
  const clamped = ratio < LINE_HEIGHT_MIN || ratio > LINE_HEIGHT_MAX
  const value = Math.round(Math.min(LINE_HEIGHT_MAX, Math.max(LINE_HEIGHT_MIN, ratio)) * 100) / 100
  return { value, clamped }
}

// ============ 图层样式（效果）解析与合成 ============

interface EffectUnits {
  value: number
  units: string
}

/** 效果尺寸单位 → px（Percent 以图层尺寸为基准） */
function effectUnitsToPx(u: EffectUnits | undefined, resolution: number, unit: 'PPI' | 'PPCM', percentBase = 100, fallback = 0): number {
  if (!u || typeof u.value !== 'number') return fallback
  const pxPerPt = unit === 'PPCM' ? (resolution * 2.54) / 72 : resolution / 72
  switch (u.units) {
    case 'Pixels': return u.value
    case 'Points': return u.value * pxPerPt
    case 'Millimeters': return u.value * (72 / 25.4) * pxPerPt
    case 'Centimeters': return u.value * (72 / 2.54) * pxPerPt
    case 'Inches': return u.value * 72 * pxPerPt
    case 'Picas': return u.value * 12 * pxPerPt
    case 'Percent': return (u.value / 100) * percentBase
    default: return u.value
  }
}

export interface ParsedLayerEffects {
  dropShadow?: { color: string; opacity: number; offsetX: number; offsetY: number; blur: number }
  stroke?: { color: string; opacity: number; size: number; position: string }
  /** 颜色叠加：文字层可见颜色（Photoshop 文字层启用 solidFill 时 fillColor 可能不是实际显示色） */
  solidFill?: { color: string }
  /** 无法还原的效果名（中文） */
  lost: string[]
}

const UNSUPPORTED_EFFECT_NAMES: Record<string, string> = {
  innerShadow: '内阴影',
  outerGlow: '外发光',
  innerGlow: '内发光',
  bevel: '斜面浮雕',
  satin: '光泽',
  gradientOverlay: '渐变叠加',
  patternOverlay: '图案叠加',
}

function isEnabled(effect: any): boolean {
  if (!effect) return false
  return Array.isArray(effect) ? effect.some(e => e && e.enabled !== false) : effect.enabled !== false
}

/**
 * 解析 ag-psd layer.effects → 可还原的投影/描边 + 无法还原的效果清单。
 * dropShadow 用「角度 + 距离 + 模糊」描述；stroke 支持纯色（渐变/图案描边无法还原）。
 */
export function parseLayerEffects(
  effects: any,
  resolution: number,
  unit: 'PPI' | 'PPCM',
  layerW: number,
  layerH: number,
): ParsedLayerEffects {
  const out: ParsedLayerEffects = { lost: [] }
  if (!effects || effects.disabled) return out
  const percentBase = Math.max(layerW, layerH, 1)
  const scale = typeof effects.scale === 'number' && effects.scale > 0 ? effects.scale : 1

  const drop = Array.isArray(effects.dropShadow) ? effects.dropShadow[0] : effects.dropShadow
  if (drop && drop.enabled !== false) {
    const color = colorToHex(drop.color)
    const distance = effectUnitsToPx(drop.distance, resolution, unit, percentBase)
    const blurRaw = drop.size ?? drop.blur
    const blur = effectUnitsToPx(blurRaw, resolution, unit, percentBase)
    const angle = ((drop.angle ?? 0) * Math.PI) / 180
    if (color && color !== '#00000000' && drop.opacity != null && drop.opacity > 0) {
      out.dropShadow = {
        color,
        opacity: Math.max(0, Math.min(1, drop.opacity ?? 1)),
        // Photoshop 角度 0° = 正右，90° = 正上（canvas y 轴向下，故取负）
        offsetX: Math.round(distance * Math.cos(angle) * scale * 100) / 100 + 0,
        offsetY: Math.round(-distance * Math.sin(angle) * scale * 100) / 100 + 0,
        blur: Math.max(0, Math.round(blur * scale * 100) / 100),
      }
    }
  }

  const strokes = Array.isArray(effects.stroke) ? effects.stroke : effects.stroke ? [effects.stroke] : []
  for (const s of strokes) {
    if (!s || s.enabled === false) continue
    if (s.fillType && s.fillType !== 'color') {
      out.lost.push('渐变/图案描边')
      continue
    }
    const color = colorToHex(s.color)
    const size = effectUnitsToPx(s.size, resolution, unit, percentBase)
    if (color && color !== '#00000000' && size > 0) {
      out.stroke = {
        color,
        opacity: Math.max(0, Math.min(1, s.opacity ?? 1)),
        size: Math.round(size * scale * 100) / 100,
        position: s.position || 'outside',
      }
    }
  }

  // 颜色叠加：enabled 且有颜色时即为文字层实际显示颜色（PSD 该效果作用于文字/图片层）
  const fills = Array.isArray(effects.solidFill) ? effects.solidFill : effects.solidFill ? [effects.solidFill] : []
  for (const f of fills) {
    if (!f || f.enabled === false) continue
    const color = colorToHex(f.color)
    if (color && color !== '#00000000') {
      out.solidFill = { color }
      break
    }
  }

  for (const [key, name] of Object.entries(UNSUPPORTED_EFFECT_NAMES)) {
    if (isEnabled((effects as any)[key])) out.lost.push(name)
  }
  return out
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  return c
}

/**
 * 把投影/描边/颜色叠加合成进图层栅格（canvas 2D 近似）：
 * - 投影：alpha 模糊 + 上色 + 偏移
 * - 描边：8 方向轮廓并集 + 上色（外部描边近似，位置/圆角与 PS 有细微差异）
 * - 颜色叠加（solidFill）：按源形状 alpha 替换为叠加色（source-in），
 *   解决 PSD 中「黑图 + 金色/红色叠加」图标导入后颜色与原稿不一致的问题
 * 返回带 padding 的画布与 padding 值（调用方需同步调整元素位置/尺寸）。
 */
export function compositeLayerEffects(
  src: HTMLCanvasElement,
  effects: { dropShadow?: ParsedLayerEffects['dropShadow']; stroke?: ParsedLayerEffects['stroke']; solidFill?: ParsedLayerEffects['solidFill'] },
): { canvas: HTMLCanvasElement; pad: number } {
  const drop = effects.dropShadow
  const stroke = effects.stroke
  const solidFill = effects.solidFill
  const needPad = (drop ? drop.blur + Math.max(Math.abs(drop.offsetX), Math.abs(drop.offsetY)) : 0) + (stroke ? stroke.size : 0)
  const pad = Math.max(2, Math.ceil(needPad + 4))
  const w = src.width
  const h = src.height
  const out = makeCanvas(w + pad * 2, h + pad * 2)
  const octx = out.getContext('2d')
  if (!octx) return { canvas: src, pad: 0 }

  // 颜色叠加：替换图层形状颜色（保留 alpha），后续投影/描边/主体均使用着色后的画布
  let base = src
  if (solidFill && solidFill.color) {
    const tinted = makeCanvas(w, h)
    const tctx = tinted.getContext('2d')
    if (tctx) {
      tctx.drawImage(src, 0, 0)
      tctx.globalCompositeOperation = 'source-in'
      tctx.fillStyle = solidFill.color
      tctx.fillRect(0, 0, w, h)
      tctx.globalCompositeOperation = 'source-over'
      base = tinted
    }
  }

  // 投影
  if (drop) {
    const blurred = makeCanvas(w, h)
    const bctx = blurred.getContext('2d')
    if (!bctx) return { canvas: src, pad: 0 }
    bctx.drawImage(base, 0, 0)
    if ('filter' in bctx) {
      bctx.filter = `blur(${Math.max(0.1, drop.blur)}px)`
      bctx.drawImage(blurred, 0, 0)
      bctx.filter = 'none'
    }
    // 用源形状 alpha 上色为投影颜色
    bctx.globalCompositeOperation = 'source-in'
    bctx.fillStyle = drop.color
    bctx.fillRect(0, 0, w, h)
    bctx.globalCompositeOperation = 'source-over'
    octx.globalAlpha = drop.opacity
    octx.drawImage(blurred, pad + drop.offsetX, pad + drop.offsetY)
    octx.globalAlpha = 1
  }

  // 描边（8 方向并集 → 源形状外扩轮廓）
  if (stroke && stroke.size > 0) {
    const s = stroke.size
    const sil = makeCanvas(w + s * 2, h + s * 2)
    const sctx = sil.getContext('2d')
    if (sctx) {
      sctx.globalCompositeOperation = 'lighter'
      const offsets = [
        [s, 0], [-s, 0], [0, s], [0, -s],
        [s, s], [-s, s], [s, -s], [-s, -s],
      ]
      for (const [dx, dy] of offsets) sctx.drawImage(base, s + dx, s + dy)
      sctx.globalCompositeOperation = 'source-over'
      sctx.globalCompositeOperation = 'source-in'
      sctx.fillStyle = stroke.color
      sctx.fillRect(0, 0, sil.width, sil.height)
      sctx.globalCompositeOperation = 'source-over'
      octx.globalAlpha = stroke.opacity
      octx.drawImage(sil, pad - s, pad - s)
      octx.globalAlpha = 1
    }
  }

  octx.drawImage(base, pad, pad)
  return { canvas: out, pad }
}

// ============ 智能对象嵌入文件提取 ============

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image decode failed'))
    img.src = src
  })
}

/** 解码嵌入文件（智能对象）为 canvas，失败返回 null */
export async function decodeLinkedFileToCanvas(data: Uint8Array | undefined): Promise<HTMLCanvasElement | null> {
  if (!data || !data.byteLength) return null
  try {
    const blob = new Blob([data])
    const url = URL.createObjectURL(blob)
    try {
      const img = await loadImage(url)
      const canvas = makeCanvas(img.width || 1, img.height || 1)
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(img, 0, 0)
      return canvas
    } finally {
      URL.revokeObjectURL(url)
    }
  } catch {
    return null
  }
}

/** 展平图层树（跳过隐藏层），保留文档顺序（自底向上）。返回预处理后的图层列表 */
export async function flattenPsdLayers(
  psd: Psd,
  options: {
    resolution: number
    resolutionUnit: 'PPI' | 'PPCM'
    availableFonts: string[]
  },
): Promise<{ layers: PsdLayerPreview[]; skipped: { name: string; reason: string }[]; warnings: string[] }> {
  const { resolution, resolutionUnit, availableFonts } = options
  const layers: PsdLayerPreview[] = []
  const skipped: { name: string; reason: string }[] = []
  const warnings: string[] = []

  const walk = async (children: Layer[] | undefined, depth: number) => {
    if (!children || depth > 50) return
    for (const layer of children) {
      // 组节点：递归子层，组本身不入画布
      if (layer.children && layer.children.length > 0) {
        await walk(layer.children, depth + 1)
        continue
      }
      const name = (containsRtl(layer.name) && SHAPED_RTL_RE.test(layer.name)) ? visualToLogicalRtl(layer.name) : (layer.name || '未命名图层')
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
      const effects = parseLayerEffects(layer.effects, resolution, resolutionUnit, layer.right - (layer.left ?? 0), layer.bottom - (layer.top ?? 0))
      const layerWarnings: string[] = []
      if (hasEffects) {
        const applied: string[] = []
        if (effects.dropShadow) applied.push('投影')
        if (effects.stroke) applied.push('描边')
        if (applied.length) {
          layerWarnings.push(`已近似还原图层样式（${applied.join('、')}）`)
          warnings.push(`图层「${name}」图层样式已近似还原（${applied.join('、')}）`)
        }
        if (effects.lost.length) {
          layerWarnings.push(`图层样式「${effects.lost.join('、')}」无法还原，栅格图中不包含这些效果`)
          warnings.push(`图层「${name}」图层样式「${effects.lost.join('、')}」无法还原（建议在 Photoshop 中先栅格化图层样式）`)
        }
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
      let canvas = layer.canvas as HTMLCanvasElement | undefined
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

      // ag-psd 的 Layer.opacity 已是 0-1 归一化值（PSD 字节 / 255），直接使用
      const opacity = layer.opacity == null ? 1 : Math.max(0, Math.min(1, layer.opacity))
      const blendMode = layer.blendMode || 'normal'

      if (isTextLayer) {
        const style: TextStyle | undefined = textData.style
        const rawText = textData.text || ''
        // 1) NFKC 还原预成形字形（视觉序存储的文本字形是已连写形式）
        // 2) 若为 RTL 且含成形字形（视觉顺序存储）：视觉顺序 → 逻辑顺序（不转换会导致画布/小程序渲染时
        //    bidi 二次重排而乱码）；逻辑序（基础字母）文本保持原样
        let text = normalizeText(rawText)
        if (containsRtl(text) && SHAPED_RTL_RE.test(rawText)) {
          text = visualToLogicalRtl(text)
        }
        const fontName = style?.font?.name
        const mapped = mapFontName(fontName, availableFonts)
        // 多样式段落（styleRuns）时 style.fontSize 缺失，用正文主体 run 的字号兜底；
        // 自由变换缩放过的文字层实际渲染大小 = fontSize × scale（如升学宴 PSD 标题 1.28 倍）
        const effectiveFontSizePt = style?.fontSize ?? dominantRunFontSize(textData.styleRuns as any)
        const textScale = transformScale(textData.transform)
        const scaledFontSizePt = effectiveFontSizePt ? Math.round(effectiveFontSizePt * textScale * 100) / 100 : undefined
        const fontSizePx = resolveFontSizePx(scaledFontSizePt, resolution, resolutionUnit)
        const fontSizePt = scaledFontSizePt
        if (mapped.replacement) {
          warnings.push(`图层「${name}」字体「${fontName}」映射为「${mapped.mapped}」`)
        } else if (fontName && !mapped.mapped) {
          warnings.push(`图层「${name}」字体「${fontName}」系统中不存在（可登录管理后台 → 字体上传 添加该字体后重新导入），RTL 文本将使用 KazakhSoftAsilya，其余使用默认字体`)
        }

        // PSD 文字样式 → 编辑器文字样式
        // 颜色叠加效果优先于 fillColor：Photoshop 文字层启用 solidFill 时 fillColor 可能不是
        // 实际显示色（如升学宴 PSD 金色标题，fillColor 为黑色、solidFill 为金色）
        const color = effects.solidFill?.color || colorToHex(style?.fillColor) || '#333333'
        const strokeColor = colorToHex(style?.strokeColor) || 'transparent'
        const strokeWidth = style?.outlineWidth ? Math.round(style.outlineWidth) : 0
        const justification = mapJustification(textData.paragraphStyle?.justification)
        // tracking 单位 1/1000 em，与编辑器 letterSpacing 语义一致（RTL 由现有链路强制 0）
        const tracking = style?.tracking != null ? Math.round(style.tracking) : 0
        // leading → lineHeight 比值（行高钳制到可渲染范围）
        const { value: lineHeight, clamped } = resolveLineHeight(style?.leading, effectiveFontSizePt, style?.autoLeading)
        if (clamped) {
          const original = style?.leading && effectiveFontSizePt ? Math.round((style.leading / effectiveFontSizePt) * 100) / 100 : undefined
          layerWarnings.push(`行高 ${original} 超出可渲染范围，调整为 ${lineHeight}`)
          warnings.push(`图层「${name}」行高 ${original} 超出可渲染范围，调整为 ${lineHeight}`)
        }
        // 图层样式效果：描边效果优先于文字内描边；投影映射为 shadow 字段
        const effectStroke = effects.stroke
        const effStrokeColor = effectStroke ? effectStroke.color : undefined
        const effStrokeWidth = effectStroke ? effectStroke.size : undefined
        const drop = effects.dropShadow

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
          lineHeight,
          letterSpacing: tracking || 0,
          strokeColor: effStrokeColor || (strokeColor !== '#00000000' ? strokeColor : 'transparent'),
          strokeWidth: effStrokeWidth != null && effStrokeWidth > 0 ? Math.round(effStrokeWidth * 100) / 100 : strokeWidth > 0 ? strokeWidth : 0,
          shadowColor: drop?.color || 'transparent',
          shadowOffsetX: drop?.offsetX ?? 0,
          shadowOffsetY: drop?.offsetY ?? 0,
          shadowBlur: drop?.blur ?? 0,
          hasEffects,
          warnings: layerWarnings,
          direction: containsRtl(text) ? 'rtl' : 'ltr',
        })
        continue
      }

      // 图片类图层（含智能对象/矢量层，均有栅格预览）
      if (!canvas) {
        const placed = layer.placedLayer as any
        // ag-psd：linkedFiles[].id 为 PascalString，placedLayer.id 来自 descriptor（数值），统一转字符串比较
        const linkedFile = placed?.id != null ? psd.linkedFiles?.find(f => String(f.id) === String(placed.id)) : undefined
        if (linkedFile?.data?.byteLength) {
          const decoded = await decodeLinkedFileToCanvas(linkedFile.data)
          if (decoded) {
            canvas = decoded
            if (width <= 0 || height <= 0) {
              width = canvas.width
              height = canvas.height
            }
            layerWarnings.push('智能对象已从嵌入文件提取')
            warnings.push(`图层「${name}」智能对象已从嵌入文件提取`)
          } else {
            skipped.push({ name, reason: '智能对象嵌入文件解析失败' })
            continue
          }
        } else {
          skipped.push({ name, reason: placed ? '智能对象无嵌入文件（外链智能对象，无法导入）' : '无栅格数据（无法导入）' })
          continue
        }
      }
      let dataUrl: string
      let pad = 0
      try {
        if (effects.dropShadow || effects.stroke || effects.solidFill) {
          const composed = compositeLayerEffects(canvas, {
            dropShadow: effects.dropShadow,
            stroke: effects.stroke,
            solidFill: effects.solidFill,
          })
          canvas = composed.canvas
          pad = composed.pad
        }
        dataUrl = canvas.toDataURL('image/png')
      } catch (_) {
        skipped.push({ name, reason: '图层栅格转换失败' })
        continue
      }

      layers.push({
        id: `psd_${layers.length}`,
        name,
        type: 'image',
        left: left - pad,
        top: top - pad,
        width: Math.max(1, width + pad * 2),
        height: Math.max(1, height + pad * 2),
        rotation: 0,
        opacity,
        blendMode,
        dataUrl,
        hasEffects,
        warnings: layerWarnings,
      })
    }
  }

  await walk(psd.children, 0)
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

  // 第二遍：完整解析（含图层位图与智能对象嵌入文件）
  const psd = readPsd(buffer, { skipThumbnail: true })
  const { resolution, unit } = getResolutionInfo(psd.imageResources)
  const { layers, skipped, warnings } = await flattenPsdLayers(psd, {
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