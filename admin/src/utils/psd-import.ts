// PSD 文件解析与导入工具
// 基于 ag-psd（Photopea 同款解析库）在浏览器端解析 Photoshop 源文件：
//  - 安全校验（先读结构、拒绝超大尺寸，防 DoS）
//  - 图层树展平（跳过隐藏层 / 调整层）
//  - 文字层提取：文本 NFKC 归一化（处理已成形/视觉序字符）、字号换算、样式映射
//  - 字体模糊匹配到系统字体表（哈萨克阿拉伯文 RTL 文本由现有链路兜底 KazakhSoftAsilya）
//  - 图层样式还原：投影/描边/颜色叠加/外发光/内阴影/内发光/光泽/斜面浮雕 canvas 近似合成；
//    非占位符文字层携带无法编辑还原的效果时整层栅格化保留视觉（占位符保持可编辑并明确告警）
//  - 智能对象嵌入文件提取（外链/无栅格数据无法恢复）
import { readPsd } from 'ag-psd'
import type { Psd, Layer, LayerTextData, TextStyle, Color, Justification, ImageResources } from 'ag-psd'
import { containsRtl, visualToLogicalRtl } from './bidi'
import { PLACEHOLDER_DEFS, type PlaceholderDef } from '../constants/placeholder-defs'

/**
 * 占位符自动识别：遍历注册表里的 contentDetect 正则，命中文本则返回 token 形态。
 * - 命中片段替换为 {key}（保留其它无关文字，如「婚礼时间：2026...」→「婚礼时间：{kzDate}」）
 * - defaults 仅存「命中的片段」（如「2026年10月1日」），供画布预览 / 小程序回填使用，
 *   不能存整行原文（否则整行会被当作字段值回填，换日期时整行内容被覆盖）
 * - fullMatch：命中片段是否覆盖整行文本。仅整行命中时才自动绑定 dataKey；
 *   部分命中只弹出确认，由设计师在导入对话框中逐条决定（防止「男方/女方婚礼时间」等
 *   混合内容行被误绑为日期字段，换日期时整行内容全变）
 * - registry 驱动：新增占位符只需在 placeholder-defs.ts 追加一行，此处零改动
 */
export interface DetectedPlaceholder {
  key: string
  token: string
  defaults: Record<string, string>
  displayText: string
  /** 命中片段是否覆盖整行文本（决定是否自动绑定 dataKey） */
  fullMatch: boolean
}

export function detectPlaceholder(raw: string): DetectedPlaceholder | null {
  if (!raw) return null
  for (const def of PLACEHOLDER_DEFS as PlaceholderDef[]) {
    const re = def.contentDetect
    if (!re) continue
    const m = re.exec(raw)
    if (m) {
      const token = `{${def.key}}`
      const matched = m[0]
      const displayText = raw.replace(re, token)
      return {
        key: def.key,
        token,
        defaults: { [def.key]: matched },
        displayText,
        fullMatch: matched === raw.trim(),
      }
    }
  }
  return null
}

// 安全上限：超过该尺寸的 PSD 直接拒绝（ag-psd 官方安全指南建议）
export const MAX_PSD_DIMENSION = 10000

export interface PsdLayerPreview {
  id: string
  name: string
  type: 'image' | 'text' | 'group'
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
  /** PSD horizontalScale：文字水平缩放（0-1，如 0.876 = 横向压扁 87.6%），1 或未设置省略 */
  horizontalScale?: number
  /** 伪粗体（PS fauxBold，字体本身不含 Bold 字重）→ bold 近似 */
  fontWeight?: 'normal' | 'bold'
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
  /** 自动识别出的占位符 key（如 kzDate）；未识别为 undefined */
  dataKey?: string
  /** 部分命中的占位符 key（整行未命中，由导入对话框逐条确认后再绑定） */
  detectedKey?: string
  /** 占位符 token（如 {date}）；与 dataKey 配对，供导入对话框展示 */
  detectedToken?: string
  /** 原文仅把命中片段替换为 token 后的文本（部分命中确认「应用」时使用，避免整行被覆盖） */
  detectedDisplay?: string
  /** 占位符默认值（保留 PSD 原文，供画布预览 / 小程序回填） */
  defaults?: Record<string, string>
  /** 所属组 id（由 importPsdLayers 生成），用于画布端按组整体锁定/拖动 */
  groupId?: string
  /** 是否为组容器占位条目（组本身不入画布，仅作分组信息） */
  isGroupContainer?: boolean
  /** 检测到的蒙版类型（由 vectorMask 路径分析得出：圆形/椭圆/圆角矩形/反相圆，或像素蒙版烘焙后的 alpha） */
  mask?: 'circle' | 'rounded' | 'circle-invert' | 'alpha'
  /** 圆角矩形蒙版的圆角半径（px，随图层宽度缩放；仅 mask='rounded' 时有值） */
  borderRadius?: number
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
  /** 告警分组聚合（按效果名/类别计数，供对话框降噪展示） */
  warningGroups: PsdWarningGroup[]
}

/** 告警分组类型：style-lost 样式无法还原 / line-height 行高调整 / blend-mode 混合模式 / font-mapped 字体替换 / style-approx 样式近似还原 */
export type PsdWarningKind = 'style-lost' | 'line-height' | 'blend-mode' | 'font-mapped' | 'style-approx' | 'other'

export interface PsdWarningGroup {
  kind: PsdWarningKind
  /** 聚合标题，如「光泽」无法还原 ×8 图层 */
  title: string
  /** 逐层明细（完整原始告警文案） */
  items: string[]
}

const STYLE_LOST_RE = /图层样式「([^」]+)」无法还原/
const TEXT_LOST_RE = /文字层「([^」]+)」未还原/

/**
 * 将扁平告警列表按类别聚合：
 * - 样式无法还原：按效果名拆分计数（「光泽、内阴影」→ 光泽 ×N、内阴影 ×N）
 * - 其余按类别聚合，逐层明细保留在 items 中
 */
export function groupPsdWarnings(warnings: string[]): PsdWarningGroup[] {
  const groups: PsdWarningGroup[] = []
  const byKind = new Map<PsdWarningKind, PsdWarningGroup>()
  const styleLost = new Map<string, string[]>()

  const getGroup = (kind: PsdWarningKind, title: string): PsdWarningGroup => {
    let g = byKind.get(kind)
    if (!g) {
      g = { kind, title, items: [] }
      byKind.set(kind, g)
      groups.push(g)
    }
    return g
  }

  for (const w of warnings) {
    const m = w.match(STYLE_LOST_RE)
    if (m) {
      const effects = m[1].split('、')
      for (const e of effects) {
        if (!styleLost.has(e)) styleLost.set(e, [])
        styleLost.get(e)!.push(w)
      }
      continue
    }
    const tm = w.match(TEXT_LOST_RE)
    if (tm) {
      // 文字层未还原的效果与图片层按同名效果合并计数（「内阴影」×N 图层）
      const effects = tm[1].split('、')
      for (const e of effects) {
        if (!styleLost.has(e)) styleLost.set(e, [])
        styleLost.get(e)!.push(w)
      }
      continue
    }
    if (w.includes('文字层已栅格化')) getGroup('style-approx', '文字层已栅格化保留样式（逐层明细含原文字）').items.push(w)
    else if (w.includes('已还原图层样式') || w.includes('已近似还原')) getGroup('style-approx', '图层样式已还原/近似还原').items.push(w)
    else if (w.includes('行高')) getGroup('line-height', '行高已调整至可渲染范围').items.push(w)
    else if (w.includes('混合模式')) getGroup('blend-mode', '混合模式无法还原（按普通模式显示）').items.push(w)
    else if (w.includes('映射为')) getGroup('font-mapped', '字体已映射到系统字体').items.push(w)
    else getGroup('other', '其他提示').items.push(w)
  }

  for (const [effect, items] of styleLost) {
    const suffix = /.*（.*）$/.test(items[0] ?? '') ? '（建议在 Photoshop 中先栅格化图层样式）' : ''
    groups.push({
      kind: 'style-lost',
      title: `「${effect}」无法还原 ×${items.length} 图层${suffix}`,
      items,
    })
  }

  return groups
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

/**
 * 多样式段落（styleRuns）的主体样式兜底：取最长 run 的字体/填充色/描边色。
 * textData.style 是图层默认样式，混合样式的文字层（如金色标题+白色正文共用一层）里
 * 常与正文主体不一致，导致导入后字体/颜色与设计稿不符。
 */
export function dominantRunTextStyle(
  styleRuns: Array<{ length?: number; style?: TextStyle }> | undefined,
  text?: string,
): { fontName?: string; fillColor?: Color; strokeColor?: Color; style?: TextStyle } {
  if (!styleRuns || styleRuns.length === 0) return {}
  let best: TextStyle | undefined
  let bestLen = -1
  let cursor = 0
  for (const run of styleRuns) {
    const len = run?.length ?? 0
    // 权重按非空白字符数计算：尾随换行/空格的 run 常带默认样式，避免抢正文主体
    const slice = text ? text.slice(cursor, cursor + len) : ''
    cursor += len
    const weight = text ? slice.replace(/\s+/g, '').length : len
    if (weight > bestLen && run?.style) {
      best = run.style
      bestLen = weight
    }
  }
  if (!best) return {}
  return {
    fontName: best.font?.name,
    fillColor: best.fillColor,
    strokeColor: best.strokeColor,
    style: best,
  }
}

/**
 * 两层文字样式合并：主体 run 样式优先，图层默认样式补缺（字段级，null/undefined 不覆盖）。
 * 多样式段落里 Photoshop 的 textData.style 是「默认样式」，与正文主体常不一致。
 */
export function mergeTextStyles(primary: TextStyle | undefined, fallback: TextStyle | undefined): TextStyle | undefined {
  if (!primary) return fallback
  if (!fallback) return primary
  const out: any = { ...fallback }
  for (const [k, v] of Object.entries(primary)) {
    if (v != null) out[k] = v
  }
  return out as TextStyle
}

/** 8 位 hex（#rrggbbaa）→ 6 位 hex。编辑器颜色输入框只接受 #rrggbb，
 *  PSD 文字填充色带 alpha 时（fillOpacity）直接截断，避免 <input type=color> 解析失败 */
export function toHex6(hex: string | undefined): string | undefined {
  if (!hex) return undefined
  return /^#[0-9a-fA-F]{8}$/.test(hex) ? hex.slice(0, 7) : hex
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
// 注意：字重别名必须排在基础名之前（短名优先会被子串抢先，所以粗体等字重单独列出）
const FONT_ALIASES: Array<{ pattern: RegExp; name: string }> = [
  // 思源宋体各字重（精确匹配字重关键词）
  { pattern: /sourcehanserif.*semibold/i, name: 'SourceHanSerifCN-SemiBold' },
  { pattern: /sourcehanserif.*medium/i, name: 'SourceHanSerifCN-Medium' },
  { pattern: /sourcehanserif.*bold/i, name: 'SourceHanSerifCN-Bold' },
  { pattern: /sourcehanserif.*heavy/i, name: 'SourceHanSerifCN-Heavy' },
  { pattern: /sourcehanserif.*light/i, name: 'SourceHanSerifCN-Light' },
  { pattern: /sourcehanserif.*extralight/i, name: '思源宋体极细' },
  { pattern: /sourcehanserif/i, name: '思源宋体' },
  // 思源黑体各字重
  { pattern: /sourcehansans.*bold/i, name: 'SourceHanSansSC-Bold' },
  { pattern: /sourcehansans/i, name: '思源黑体' },
  // 其他字体
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

/** 行高可渲染范围：渲染链路（Fabric.js / 小程序 DOM）支持任意行高，仅对极端值兜底防字形严重重叠/间距失控 */
export const LINE_HEIGHT_MIN = 0.5
export const LINE_HEIGHT_MAX = 6

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
  /** 内阴影：形状内部边缘暗色（图片层 canvas 近似合成） */
  innerShadow?: { color: string; opacity: number; offsetX: number; offsetY: number; size: number }
  /** 光泽：形状内部双向渐变折痕（图片层 canvas 近似合成，忽略 contour 细节） */
  satin?: { color: string; opacity: number; angle: number; blendMode: string }
  /** 外发光：主体外部彩色光晕（canvas 近似 = 无偏移投影，忽略等高线/噪声） */
  outerGlow?: { color: string; opacity: number; blur: number }
  /** 内发光：主体边缘均匀亮/暗环（canvas 近似 = 无偏移内阴影） */
  innerGlow?: { color: string; opacity: number; blur: number }
  /** 斜面浮雕：朝光源边缘高光带 + 背光边缘阴影带（内嵌近似，忽略等高线/纹理/高度图） */
  bevelEmboss?: {
    highlightColor: string
    highlightOpacity: number
    shadowColor: string
    shadowOpacity: number
    /** 边缘带宽 px */
    depth: number
    /** 光源角度（度） */
    angle: number
  }
  /** 无法还原的效果名（中文） */
  lost: string[]
}

const UNSUPPORTED_EFFECT_NAMES: Record<string, string> = {
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
        // Photoshop 角度 = 光源方向（0°=正右，90°=正上，逆时针），阴影投向背光侧（canvas y 轴向下）
        offsetX: Math.round(-distance * Math.cos(angle) * scale * 100) / 100 + 0,
        offsetY: Math.round(distance * Math.sin(angle) * scale * 100) / 100 + 0,
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

  // 内阴影：形状内部边缘的暗色（角度/距离/模糊），图片层用 canvas 近似合成
  const inner = Array.isArray(effects.innerShadow) ? effects.innerShadow[0] : effects.innerShadow
  if (inner && inner.enabled !== false) {
    const color = colorToHex(inner.color)
    const distance = effectUnitsToPx(inner.distance, resolution, unit, percentBase)
    const size = effectUnitsToPx(inner.size, resolution, unit, percentBase)
    const angle = ((inner.angle ?? 0) * Math.PI) / 180
    if (color && color !== '#00000000' && inner.opacity != null && inner.opacity > 0) {
      out.innerShadow = {
        color,
        opacity: Math.max(0, Math.min(1, inner.opacity ?? 1)),
        // 偏移方向与投影一致（背光侧），合成时用于挖空主体、露出朝光边缘的暗带
        offsetX: Math.round(-distance * Math.cos(angle) * scale * 100) / 100 + 0,
        offsetY: Math.round(distance * Math.sin(angle) * scale * 100) / 100 + 0,
        size: Math.max(0, Math.round(size * scale * 100) / 100),
      }
    }
  }

  // 光泽：形状内部的双向渐变折痕（角度/距离/尺寸/混合模式），图片层用 canvas 近似合成
  const satinE = Array.isArray(effects.satin) ? effects.satin[0] : effects.satin
  if (satinE && satinE.enabled !== false) {
    const color = colorToHex(satinE.color)
    if (color && color !== '#00000000' && satinE.opacity != null && satinE.opacity > 0) {
      out.satin = {
        color,
        opacity: Math.max(0, Math.min(1, satinE.opacity ?? 1)),
        angle: satinE.angle ?? 0,
        blendMode: (satinE.blendMode || 'multiply').toLowerCase(),
      }
    }
  }

  // 外发光：主体外部彩色光晕（无偏移投影近似）
  const glow = Array.isArray(effects.outerGlow) ? effects.outerGlow[0] : effects.outerGlow
  if (glow && glow.enabled !== false) {
    const color = colorToHex(glow.color)
    const blurRaw = glow.size ?? glow.blur
    const blur = effectUnitsToPx(blurRaw, resolution, unit, percentBase)
    if (color && color !== '#00000000' && glow.opacity != null && glow.opacity > 0) {
      out.outerGlow = {
        color,
        opacity: Math.max(0, Math.min(1, glow.opacity ?? 1)),
        blur: Math.max(0, Math.round(blur * scale * 100) / 100),
      }
    } else if (!out.outerGlow) {
      out.lost.push('外发光')
    }
  }

  // 内发光：主体边缘均匀亮/暗环（无偏移内阴影近似）
  const iglow = Array.isArray(effects.innerGlow) ? effects.innerGlow[0] : effects.innerGlow
  if (iglow && iglow.enabled !== false) {
    const color = colorToHex(iglow.color)
    const blurRaw = iglow.size ?? iglow.blur
    const blur = effectUnitsToPx(blurRaw, resolution, unit, percentBase)
    if (color && color !== '#00000000' && iglow.opacity != null && iglow.opacity > 0) {
      out.innerGlow = {
        color,
        opacity: Math.max(0, Math.min(1, iglow.opacity ?? 1)),
        blur: Math.max(0, Math.round(blur * scale * 100) / 100),
      }
    } else if (!out.innerGlow) {
      out.lost.push('内发光')
    }
  }

  // 斜面浮雕：朝光源边缘高光带 + 背光边缘阴影带（内嵌近似）
  const bevelE = Array.isArray(effects.bevel) ? effects.bevel[0] : effects.bevel
  if (bevelE && bevelE.enabled !== false) {
    const depthRaw = bevelE.size ?? bevelE.depth
    const depth = effectUnitsToPx(depthRaw, resolution, unit, percentBase)
    const hl = colorToHex(bevelE.highlightColor)
    const sh = colorToHex(bevelE.shadowColor)
    if (depth > 0 && (hl || sh)) {
      out.bevelEmboss = {
        highlightColor: !hl || hl === '#00000000' ? '#ffffff' : hl,
        highlightOpacity: Math.max(0, Math.min(1, bevelE.highlightOpacity ?? 1)),
        shadowColor: !sh || sh === '#00000000' ? '#000000' : sh,
        shadowOpacity: Math.max(0, Math.min(1, bevelE.shadowOpacity ?? 1)),
        // 带宽钳制到图层短边的 20%：部分 PSD 缺 size 时 depth 回退值过大，防止浮雕带吞没整个图层
        depth: Math.max(1, Math.round(Math.min(depth * scale, Math.min(layerW, layerH) * 0.2 || depth * scale))),
        angle: bevelE.angle ?? 120,
      }
    } else if (!out.bevelEmboss) {
      out.lost.push('斜面浮雕')
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

/** PS 混合模式 → canvas composite 操作（不支持时回退 source-over） */
export function mapBlendMode(mode: string): GlobalCompositeOperation {
  const map: Record<string, GlobalCompositeOperation> = {
    multiply: 'multiply',
    screen: 'screen',
    overlay: 'overlay',
    darken: 'darken',
    lighten: 'lighten',
    'color-dodge': 'color-dodge',
    'color-burn': 'color-burn',
    'hard-light': 'hard-light',
    'soft-light': 'soft-light',
    normal: 'source-over',
    dissolve: 'source-over',
  }
  return map[mode] || 'source-over'
}

/**
 * 把图层样式合成进图层栅格（canvas 2D 近似）：
 * - 投影：alpha 模糊 + 上色 + 偏移（背光侧）
 * - 描边：8 方向轮廓并集 + 上色（外部描边近似，位置/圆角与 PS 有细微差异）
 * - 颜色叠加（solidFill）：按源形状 alpha 替换为叠加色（source-in）
 * - 外发光：无偏移投影近似（最底层）
 * - 内阴影：模糊上色剪影裁剪进形状内部，再挖掉偏移后的主体 → 朝光边缘露出暗带；
 *   距离 0 时退化为均匀内环（同内发光方式）
 * - 内发光：上色形状 − 模糊侵蚀形状 → 边缘均匀环带
 * - 斜面浮雕：朝光边缘高光带 + 背光边缘阴影带（主体减去平移主体得到边缘带）
 * - 光泽：沿角度方向的双向渐变带，裁剪进形状内部后按混合模式叠加
 * 返回带 padding 的画布与 padding 值（调用方需同步调整元素位置/尺寸）。
 */
export function compositeLayerEffects(
  src: HTMLCanvasElement,
  effects: {
    dropShadow?: ParsedLayerEffects['dropShadow']
    stroke?: ParsedLayerEffects['stroke']
    solidFill?: ParsedLayerEffects['solidFill']
    innerShadow?: ParsedLayerEffects['innerShadow']
    satin?: ParsedLayerEffects['satin']
    outerGlow?: ParsedLayerEffects['outerGlow']
    innerGlow?: ParsedLayerEffects['innerGlow']
    bevelEmboss?: ParsedLayerEffects['bevelEmboss']
  },
): { canvas: HTMLCanvasElement; pad: number } {
  const drop = effects.dropShadow
  const glow = effects.outerGlow
  const stroke = effects.stroke
  const solidFill = effects.solidFill
  const innerShadow = effects.innerShadow
  const innerGlow = effects.innerGlow
  const bevel = effects.bevelEmboss
  const satin = effects.satin
  // 只有无偏移外扩的效果（投影/外发光/描边）需要 padding；内阴影/内发光/浮雕/光泽都在形状内部
  const outerExtent =
    (drop ? drop.blur + Math.max(Math.abs(drop.offsetX), Math.abs(drop.offsetY)) : 0) +
    (glow ? glow.blur : 0) +
    (stroke ? stroke.size : 0)
  const pad = Math.max(2, Math.ceil(outerExtent + 4))
  const w = src.width
  const h = src.height
  const out = makeCanvas(w + pad * 2, h + pad * 2)
  const octx = out.getContext('2d')
  if (!octx) return { canvas: src, pad: 0 }

  // 颜色叠加：替换图层形状颜色（保留 alpha），后续所有效果均使用着色后的画布
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

  /** 模糊 + 上色的形状剪影（可带偏移）；blur=0 时保留锐利边缘 */
  const tintedBlurSilhouette = (color: string, blur: number, dx: number, dy: number): HTMLCanvasElement | null => {
    const c = makeCanvas(w, h)
    const cctx = c.getContext('2d')
    if (!cctx) return null
    cctx.drawImage(base, dx, dy)
    if (blur > 0 && 'filter' in cctx) {
      cctx.filter = `blur(${Math.max(0.1, blur)}px)`
      cctx.drawImage(c, 0, 0)
      cctx.filter = 'none'
    }
    cctx.globalCompositeOperation = 'source-in'
    cctx.fillStyle = color
    cctx.fillRect(0, 0, w, h)
    cctx.globalCompositeOperation = 'source-over'
    return c
  }

  /** 内部环带：上色形状 − 模糊侵蚀形状（用于内发光 / 距离 0 的内阴影） */
  const innerRing = (color: string, blur: number): HTMLCanvasElement | null => {
    const c = makeCanvas(w, h)
    const cctx = c.getContext('2d')
    if (!cctx) return null
    cctx.drawImage(base, 0, 0)
    cctx.globalCompositeOperation = 'source-in'
    cctx.fillStyle = color
    cctx.fillRect(0, 0, w, h)
    if (blur > 0 && 'filter' in cctx) {
      cctx.globalCompositeOperation = 'destination-out'
      cctx.filter = `blur(${Math.max(0.1, blur)}px)`
      cctx.drawImage(base, 0, 0)
      cctx.filter = 'none'
    }
    cctx.globalCompositeOperation = 'source-over'
    return c
  }

  // 外发光（无偏移投影近似，位于最底层）
  if (glow) {
    const g = tintedBlurSilhouette(glow.color, glow.blur, 0, 0)
    if (g) {
      octx.globalAlpha = glow.opacity
      octx.drawImage(g, pad, pad)
      octx.globalAlpha = 1
    }
  }

  // 投影（背光侧偏移）
  if (drop) {
    const s = tintedBlurSilhouette(drop.color, drop.blur, drop.offsetX, drop.offsetY)
    if (s) {
      octx.globalAlpha = drop.opacity
      octx.drawImage(s, pad, pad)
      octx.globalAlpha = 1
    }
  }

  // 描边（8 方向并集 → 源形状外扩轮廓，主体覆盖后仅外圈露出）
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

  // 主体
  octx.drawImage(base, pad, pad)

  // 内阴影（主体之上：模糊上色剪影 ∩ 主体 − 偏移后主体 → 朝光边缘暗带；距离 0 → 均匀内环）
  if (innerShadow) {
    const dist = Math.hypot(innerShadow.offsetX, innerShadow.offsetY)
    if (dist >= 1) {
      const s = tintedBlurSilhouette(innerShadow.color, innerShadow.size, 0, 0)
      if (s) {
        const sctx = s.getContext('2d')
        if (sctx) {
          sctx.globalCompositeOperation = 'destination-in'
          sctx.drawImage(base, 0, 0)
          sctx.globalCompositeOperation = 'destination-out'
          sctx.drawImage(base, innerShadow.offsetX, innerShadow.offsetY)
          sctx.globalCompositeOperation = 'source-over'
          octx.globalAlpha = innerShadow.opacity
          octx.drawImage(s, pad, pad)
          octx.globalAlpha = 1
        }
      }
    } else {
      const ring = innerRing(innerShadow.color, innerShadow.size)
      if (ring) {
        octx.globalAlpha = innerShadow.opacity
        octx.drawImage(ring, pad, pad)
        octx.globalAlpha = 1
      }
    }
  }

  // 内发光（主体之上：边缘均匀环带）
  if (innerGlow) {
    const ring = innerRing(innerGlow.color, innerGlow.blur)
    if (ring) {
      octx.globalAlpha = innerGlow.opacity
      octx.drawImage(ring, pad, pad)
      octx.globalAlpha = 1
    }
  }

  // 斜面浮雕（主体之上：主体 − 平移主体 = 边缘带）
  if (bevel) {
    const rad = (bevel.angle * Math.PI) / 180
    // 朝光源方向（canvas y 向下；PS 角度 0°=右、90°=上、逆时针）
    const lx = Math.cos(rad)
    const ly = -Math.sin(rad)
    const d = bevel.depth
    const drawBand = (color: string, opacity: number, ox: number, oy: number) => {
      const c = makeCanvas(w, h)
      const cctx = c.getContext('2d')
      if (!cctx) return
      cctx.drawImage(base, 0, 0)
      cctx.globalCompositeOperation = 'destination-out'
      cctx.drawImage(base, ox, oy)
      cctx.globalCompositeOperation = 'source-in'
      cctx.fillStyle = color
      cctx.fillRect(0, 0, w, h)
      cctx.globalCompositeOperation = 'source-over'
      octx.globalAlpha = opacity
      octx.drawImage(c, pad, pad)
      octx.globalAlpha = 1
    }
    // 高光带：挖掉远离光源平移的主体 → 露出朝光边缘
    drawBand(bevel.highlightColor, bevel.highlightOpacity, -lx * d, -ly * d)
    // 阴影带：挖掉朝光源平移的主体 → 露出背光边缘
    drawBand(bevel.shadowColor, bevel.shadowOpacity, lx * d, ly * d)
  }

  // 光泽（形状内部双向渐变带：按混合模式叠加）
  if (satin) {
    const sat = makeCanvas(w, h)
    const sctx = sat.getContext('2d')
    if (sctx) {
      const rad = (satin.angle * Math.PI) / 180
      const span = Math.max(w, h) * 0.7
      const cx = w / 2
      const cy = h / 2
      const dx = Math.cos(rad)
      const dy = Math.sin(rad)
      const g = sctx.createLinearGradient(cx - dx * span, cy - dy * span, cx + dx * span, cy + dy * span)
      g.addColorStop(0, satin.color)
      g.addColorStop(0.25, 'rgba(0,0,0,0)')
      g.addColorStop(0.5, satin.color)
      g.addColorStop(0.75, 'rgba(0,0,0,0)')
      g.addColorStop(1, satin.color)
      sctx.globalAlpha = satin.opacity
      sctx.fillStyle = g
      sctx.fillRect(0, 0, w, h)
      sctx.globalAlpha = 1
      sctx.globalCompositeOperation = 'destination-in'
      sctx.drawImage(base, 0, 0)
      sctx.globalCompositeOperation = 'source-over'
      octx.save()
      octx.globalCompositeOperation = mapBlendMode(satin.blendMode)
      octx.drawImage(sat, pad, pad)
      octx.restore()
    }
  }

  return { canvas: out, pad }
}

// ============ PSD 矢量蒙版 / 剪贴蒙版 → 圆形蒙版识别 ============

/**
 * 由图层矢量蒙版路径分析出简单蒙版类型（参考 ag-psd LayerVectorMask 结构）。
 * 仅处理「单一闭合路径、≤12 个节点、路径填满图层、宽高比合理」的形状，
 * 圆/椭圆统一映射为 'circle'（小程序端 border-radius:50% 对非正方元素自动产生椭圆）。
 * 允许少量角点（≤4个），因为椭圆的起止点可能表现为角点。
 * 任意复杂形状（布尔运算/多路径）返回 null，由 ag-psd 已烘焙的栅格效果兜底。
 *
 * 对照 ag-psd 官方字段补充两点安全帽：
 * - vectorMask.disable：蒙版被禁用时不识别（返回 null）
 * - vectorMask.invert：反相蒙版（如圆环头像框）返回 'circle-invert'，
 *   由 useCanvas 暂回退为 circle 并告警，待小程序端支持挖洞再细做
 */
export interface VectorMaskShape {
  mask: 'circle' | 'circle-invert' | 'rounded' | null
  /** 圆角矩形：圆角半径 / 路径包围盒宽度（0~0.5）；仅 mask='rounded' 时有值 */
  radiusRatio?: number
}

/**
 * 矢量蒙版形状分析（detectMaskFromVectorMask 的完整版，附带圆角半径）。
 *
 * 通过锚点控制柄形态区分形状：
 * - 椭圆/圆：每个锚点两侧控制柄均非零 → 'circle'
 * - 圆角矩形：锚点一半为直线侧（单侧零柄）、一半在圆弧上 → 'rounded'，半径由圆弧柄长反推
 * - 直角矩形/多边形：所有控制柄长度为 0 → 无需蒙版（null）
 *
 * 修复历史误判：直角矩形（4 锚点全角点）此前会被误判为 'circle'，
 * 导致矩形照片框被裁成椭圆；现返回 null（rect 不需要蒙版）。
 */
export function analyzeVectorMaskShape(
  vectorMask: { disable?: boolean; disabled?: boolean; invert?: boolean; paths: Array<{ open: boolean; knots: Array<{ linked: boolean; points: number[] }> }> } | undefined,
  layerWidth: number,
  layerHeight: number,
): VectorMaskShape {
  if (!vectorMask?.paths?.length) return { mask: null }
  if (vectorMask.disable || (vectorMask as any).disabled) return { mask: null } // 蒙版被禁用 → 忽略
  // 只处理简单形状：1 条闭合路径、≤12 个节点
  const path = vectorMask.paths[0]
  if (path.open || vectorMask.paths.length > 1 || path.knots.length > 12) return { mask: null }

  // 图层宽高比需合理（容差 0.3~3.0），覆盖椭圆/胶囊形等常见形状
  if (layerWidth < 1 || layerHeight < 1) return { mask: null }
  const layerAspect = layerWidth / layerHeight
  if (layerAspect < 0.3 || layerAspect > 3.0) return { mask: null }

  // 统计锚点控制柄形态 + 路径包围盒
  // ag-psd Knot.points 格式为 [beforeX, beforeY, anchorX, anchorY, afterX, afterY]，
  // points[2..3] 才是锚点本体（readBezierKnot 按 PSD 规范先读 before 再读 anchor 再读 after）
  let zeroHandleAnchors = 0
  let twoZeroKnots = 0
  let maxHandle = 0
  let handleSum = 0
  let handleCount = 0
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const knot of path.knots) {
    const [bx, by, ax, ay, fx, fy] = knot.points
    const hBefore = Math.hypot(ax - bx, ay - by)
    const hAfter = Math.hypot(ax - fx, ay - fy)
    const zeros = (hBefore === 0 ? 1 : 0) + (hAfter === 0 ? 1 : 0)
    zeroHandleAnchors += zeros
    if (zeros === 2) twoZeroKnots++
    if (hBefore > 0) { maxHandle = Math.max(maxHandle, hBefore); handleSum += hBefore; handleCount++ }
    if (hAfter > 0) { maxHandle = Math.max(maxHandle, hAfter); handleSum += hAfter; handleCount++ }
    minX = Math.min(minX, ax); minY = Math.min(minY, ay)
    maxX = Math.max(maxX, ax); maxY = Math.max(maxY, ay)
  }
  const pathW = maxX - minX
  const pathH = maxY - minY
  if (pathW < 1 || pathH < 1) return { mask: null }

  // 包围盒需接近图层尺寸（容差 35%）
  const wRatio = pathW / layerWidth
  const hRatio = pathH / layerHeight
  if (wRatio < 0.65 || wRatio > 1.35 || hRatio < 0.65 || hRatio > 1.35) return { mask: null }

  // 所有锚点均有曲线控制柄 → 椭圆/圆
  if (zeroHandleAnchors === 0) {
    return { mask: vectorMask.invert ? 'circle-invert' : 'circle' }
  }
  // 圆角矩形（含胶囊形）：每个锚点恰好 1 个零柄（直线侧）+ 1 个等长弧柄。
  // PS 标准 8 锚点圆角矩形每段 90° 圆弧 = 1 段 Bezier，弧柄长 ≈ r × 0.5523；
  // 全零柄 → 直角矩形，无需蒙版（rect 裁剪是恒等变换）。
  if (maxHandle === 0) return { mask: null }
  if (zeroHandleAnchors === path.knots.length && twoZeroKnots === 0) {
    // 非零弧柄需近似等长，排除不规则圆角（混合半径）
    const avgHandle = handleSum / Math.max(1, handleCount)
    if (maxHandle / avgHandle > 1.25) return { mask: null }
    const radius = avgHandle / 0.5523
    const rRatio = radius / Math.max(pathW, 1)
    if (rRatio > 0.01 && rRatio <= 0.5) {
      return { mask: 'rounded', radiusRatio: rRatio }
    }
    return { mask: null }
  }
  return { mask: null }
}

/**
 * 由图层矢量蒙版路径分析出简单蒙版类型（参考 ag-psd LayerVectorMask 结构）。
 * 仅处理「单一闭合路径、≤12 个节点、路径填满图层、宽高比合理」的形状，
 * 圆/椭圆统一映射为 'circle'（小程序端 border-radius:50% 对非正方元素自动产生椭圆）。
 * 圆角矩形返回 'rounded'（配合 borderRadius 半径）。
 * 任意复杂形状（布尔运算/多路径）返回 null，由 ag-psd 已烘焙的栅格效果兜底。
 *
 * 对照 ag-psd 官方字段补充两点安全帽：
 * - disable/disabled：蒙版被禁用时不识别（返回 null）
 * - invert：反相蒙版（如圆环头像框）返回 'circle-invert'，
 *   由 useCanvas 暂回退为 circle 并告警，待小程序端支持挖洞再细做
 */
export function detectMaskFromVectorMask(
  vectorMask: { disable?: boolean; disabled?: boolean; invert?: boolean; paths: Array<{ open: boolean; knots: Array<{ linked: boolean; points: number[] }> }> } | undefined,
  layerWidth: number,
  layerHeight: number,
): 'circle' | 'circle-invert' | 'rounded' | null {
  return analyzeVectorMaskShape(vectorMask, layerWidth, layerHeight).mask
}

/**
 * 检测 canvas 是否有显著的 alpha 透明通道，用于识别非规则形状（星形、花形等）。
 * 降采样扫描，阈值：>5% 全透明 + >0.3% 半透明 + 透明区域深度 >10%。
 */
export function detectAlphaMaskFromCanvas(
  canvas: HTMLCanvasElement,
  opts?: { relaxed?: boolean },
): 'alpha' | null {
  const relaxed = !!opts?.relaxed
  const w = canvas.width
  const h = canvas.height
  if (w < 10 || h < 10) return null
  const ctx = canvas.getContext('2d')
  if (!ctx || typeof ctx.getImageData !== 'function') return null

  const stride = Math.max(1, Math.floor(Math.min(w, h) / 64))
  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data

  let transparentCount = 0
  let semiTransparentCount = 0
  let opaqueCount = 0
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity

  for (let y = 0; y < h; y += stride) {
    for (let x = 0; x < w; x += stride) {
      const alpha = data[(y * w + x) * 4 + 3]
      if (alpha <= 5) {
        transparentCount++
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      } else if (alpha < 250) {
        semiTransparentCount++
      } else {
        opaqueCount++
      }
    }
  }

  const total = transparentCount + semiTransparentCount + opaqueCount
  if (total === 0) return null

  if (relaxed) {
    // 剪贴蒙版放宽模式：只要有显著透明区域（>2%）即认定为 alpha 蒙版
    return transparentCount / total >= 0.02 ? 'alpha' : null
  }

  // 严格模式：非规则形状（星形、花形等）
  if (transparentCount / total < 0.05) return null
  if (semiTransparentCount / total < 0.003) return null
  const depthRatio = Math.max((maxX - minX) / w, (maxY - minY) / h)
  if (depthRatio < 0.10) return null

  return 'alpha'
}

// ============ 像素蒙版（图层蒙版/组蒙版）烘焙 ============

/** ag-psd 图层像素蒙版结构（仅用到烘焙所需字段；v31 字段名为 disabled / positionRelativeToLayer） */
export interface PixelMaskInfo {
  canvas?: HTMLCanvasElement
  left?: number
  top?: number
  right?: number
  bottom?: number
  disabled?: boolean
  positionRelativeToLayer?: boolean
  /** 蒙版矩形外的默认亮度（255=白=显示，0=黑=隐藏） */
  defaultColor?: number
}

/**
 * 将 PSD 像素蒙版（灰度位图）烘焙进图层 canvas：白=显示、黑=隐藏（luminance → alpha）。
 *
 * - mask.canvas 尺寸 = 蒙版矩形 (right-left)×(bottom-top)，坐标系为文档坐标
 *   （positionRelativeToLayer 时为图层本地坐标）
 * - 蒙版矩形外区域按 defaultColor 填充（本工程 PSD 均为 255=保留）
 * - 返回烘焙后的新 canvas；蒙版缺失/禁用/尺寸非法时返回 null（调用方沿用原图）
 */
export function applyPixelMaskToCanvas(
  src: HTMLCanvasElement,
  mask: PixelMaskInfo | undefined,
  layerLeft: number,
  layerTop: number,
): HTMLCanvasElement | null {
  if (!mask || mask.disabled || !mask.canvas) return null
  const maskW = (mask.right ?? 0) - (mask.left ?? 0)
  const maskH = (mask.bottom ?? 0) - (mask.top ?? 0)
  if (maskW <= 0 || maskH <= 0 || src.width <= 0 || src.height <= 0) return null

  // 蒙版位图在图层画布内的偏移
  const offsetX = mask.positionRelativeToLayer ? (mask.left ?? 0) : (mask.left ?? 0) - layerLeft
  const offsetY = mask.positionRelativeToLayer ? (mask.top ?? 0) : (mask.top ?? 0) - layerTop

  // 1) 灰度蒙版 → alpha 蒙版
  const maskAlpha = document.createElement('canvas')
  maskAlpha.width = src.width
  maskAlpha.height = src.height
  const mctx = maskAlpha.getContext('2d')
  if (!mctx) return null
  const dc = (mask.defaultColor ?? 255) & 0xff
  mctx.fillStyle = `rgb(${dc},${dc},${dc})`
  mctx.fillRect(0, 0, src.width, src.height)
  mctx.drawImage(mask.canvas, offsetX, offsetY)
  const mdata = mctx.getImageData(0, 0, src.width, src.height)
  const md = mdata.data
  for (let i = 0; i < md.length; i += 4) {
    const lum = md[i] // setupGrayscale 后 RGB 相等，取 R 即亮度
    md[i] = 0
    md[i + 1] = 0
    md[i + 2] = 0
    md[i + 3] = lum
  }
  mctx.putImageData(mdata, 0, 0)

  // 2) destination-in 合成：图层像素 × 蒙版 alpha
  const out = document.createElement('canvas')
  out.width = src.width
  out.height = src.height
  const octx = out.getContext('2d')
  if (!octx) return null
  octx.drawImage(src, 0, 0)
  octx.globalCompositeOperation = 'destination-in'
  octx.drawImage(maskAlpha, 0, 0)
  return out
}

/** 剪贴蒙版 base 上下文：bottom→top 遍历中「紧邻 clip 层下方」的第一个非 clipping 图层 */
export interface ClipBaseInfo {
  /** base 条目几何（文档坐标，含效果 pad 偏移） */
  left: number
  top: number
  width: number
  height: number
  /** base 栅格（alpha 通道即形状，任意形状通用：矢量形状/文字/带蒙版图片） */
  canvas?: HTMLCanvasElement
  /** base 无栅格时的几何蒙版兜底（简单矢量形状） */
  shape?: VectorMaskShape
}

/**
 * 将剪贴蒙版 base 的形状烘焙进 clipping 图层 canvas（destination-in）。
 * base 有栅格时用其 alpha 精确裁剪；否则退化为圆/圆角矩形几何蒙版。
 * clipCanvas 的文档坐标原点为 (clipLeft, clipTop)。
 * 返回是否成功烘焙。
 */
export function bakeClipMask(
  clipCanvas: HTMLCanvasElement,
  base: ClipBaseInfo,
  clipLeft: number,
  clipTop: number,
): boolean {
  if (!clipCanvas || clipCanvas.width < 1 || clipCanvas.height < 1) return false
  const octx = clipCanvas.getContext('2d')
  if (!octx) return false
  if (!base.canvas && !base.shape?.mask) return false

  // 1) 构造 base 形状的 alpha 蒙版（clip 画布同尺寸）
  const maskCv = makeCanvas(clipCanvas.width, clipCanvas.height)
  const mctx = maskCv.getContext('2d')
  if (!mctx) return false
  if (base.canvas) {
    mctx.drawImage(base.canvas, Math.round(base.left - clipLeft), Math.round(base.top - clipTop))
  } else {
    const shape = base.shape!
    const bx = base.left - clipLeft
    const by = base.top - clipTop
    mctx.fillStyle = '#ffffff'
    if (shape.mask === 'circle') {
      mctx.beginPath()
      mctx.ellipse(bx + base.width / 2, by + base.height / 2, base.width / 2, base.height / 2, 0, 0, Math.PI * 2)
      mctx.fill()
    } else if (shape.mask === 'circle-invert') {
      // 反相：矩形填充 + 挖去椭圆
      mctx.fillRect(0, 0, clipCanvas.width, clipCanvas.height)
      mctx.globalCompositeOperation = 'destination-out'
      mctx.beginPath()
      mctx.ellipse(bx + base.width / 2, by + base.height / 2, base.width / 2, base.height / 2, 0, 0, Math.PI * 2)
      mctx.fill()
      mctx.globalCompositeOperation = 'source-over'
    } else if (shape.mask === 'rounded' && shape.radiusRatio) {
      const r = Math.min(shape.radiusRatio * base.width, base.width / 2, base.height / 2)
      mctx.beginPath()
      mctx.moveTo(bx + r, by)
      mctx.arcTo(bx + base.width, by, bx + base.width, by + base.height, r)
      mctx.arcTo(bx + base.width, by + base.height, bx, by + base.height, r)
      mctx.arcTo(bx, by + base.height, bx, by, r)
      mctx.arcTo(bx, by, bx + base.width, by, r)
      mctx.closePath()
      mctx.fill()
    } else {
      return false
    }
  }

  // 2) destination-in：clip 像素 × base 形状 alpha
  octx.save()
  octx.globalCompositeOperation = 'destination-in'
  octx.drawImage(maskCv, 0, 0)
  octx.restore()
  return true
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

/** Flatten layer tree (skip hidden layers). ag-psd children for real files are bottom-to-top (lowest layer first), matching z-index order, so returned as-is. */
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

  // 剪贴蒙版 base 追踪。
  // PSD 剪贴蒙版规则：clipping=1 的图层被裁剪到「图层面板中紧邻其下」的第一个非 clipping 图层（base），
  // 连续多个 clipping 图层共享同一 base；组边界会打断剪贴链；base 隐藏则整组 clip 均不可见。
  // ag-psd children 实测为 bottom→top（最底层在前，已用合成图像素比对验证），walk 顺序即 bottom→top，
  // 因此处理 clipping 层时其 base 一定已处理完毕，记录为 lastBase 即可（作用域 = 每个组层级）。

  // 记录每次递归的组 id，使子层继承所属组，便于画布端按组整体锁定/拖动
  // groupMasks：祖先组的像素蒙版栈（外层在前），组内每个图层栅格需依次烘焙这些蒙版
  const walk = async (children: Layer[] | undefined, depth: number, groupId?: string, groupMasks: PixelMaskInfo[] = []) => {
    if (!children || depth > 50) return
    // 当前组层级内最近处理过的非 clipping 图层（潜在剪贴 base）；进入子组/离开时各自独立
    let lastBase: ClipBaseInfo | null = null
    for (const layer of children) {
      // 组节点：生成一个组 id，递归子层时传入；组本身也作为占位条目保留（type: 'group'）
      if (layer.children && layer.children.length > 0) {
        // 组节点也遵循隐藏标记：整组隐藏则整组跳过（避免隐藏组的内容意外导入）
        if (layer.hidden) {
          skipped.push({ name: layer.name || '组', reason: '隐藏组' })
          continue
        }
        const gid = `grp_${layer.name || 'group'}_${depth}_${layers.length}`
        // 组自带像素蒙版（如人物组按蒙版显隐）：烘焙到组内每个图层的栅格中
        const ownGroupMask = (layer.mask && !layer.mask.disabled && (layer.mask as any).canvas) ? (layer.mask as PixelMaskInfo) : null
        layers.push({
          type: 'group',
          name: layer.name || '组',
          groupId: gid,
          isGroupContainer: true,
          left: (layer.left ?? 0),
          top: (layer.top ?? 0),
          width: (layer.right ?? 0) - (layer.left ?? 0),
          height: (layer.bottom ?? 0) - (layer.top ?? 0),
          rotation: 0,
          opacity: (layer.opacity ?? 255) / 255,
          blendMode: layer.blendMode || 'normal',
          dataUrl: '',
          hasEffects: false,
          warnings: ownGroupMask ? ['组像素蒙版已烘焙到组内图层'] : [],
        } as any)
        await walk(layer.children, depth + 1, gid, ownGroupMask ? [...groupMasks, ownGroupMask] : groupMasks)
        // 组边界打断剪贴蒙版链：组后的 clipping 层其 base 不可能跨组（PS 规则）
        lastBase = null
        continue
      }
      const name = (containsRtl(layer.name) && SHAPED_RTL_RE.test(layer.name)) ? visualToLogicalRtl(layer.name) : (layer.name || '未命名图层')
      if (layer.hidden) {
        skipped.push({ name, reason: '隐藏图层' })
        // 隐藏的非 clipping 层本可作为后续 clip 的 base；PS 中 base 隐藏则整组 clip 不可见，
        // 此处置空使后续 clip 层按「base 缺失」跳过（非 clipping 层才可能是 base）
        if (!layer.clipping) lastBase = null
        continue
      }
      // 调整层：无栅格内容，效果在合成图中，无法按层导入
      if (layer.adjustment) {
        skipped.push({ name, reason: '调整层（色阶/曲线等）效果无法单独导入' })
        if (!layer.clipping) lastBase = null
        continue
      }

      const hasEffects = !!(layer.effects && Object.keys(layer.effects).some(k => (layer.effects as any)[k] != null && (layer.effects as any)[k].enabled !== false))
      const effects = parseLayerEffects(layer.effects, resolution, resolutionUnit, layer.right - (layer.left ?? 0), layer.bottom - (layer.top ?? 0))
      const layerWarnings: string[] = []
      // 无法还原的效果对文字/图片层一致（渐变/图案叠加等）；「已近似还原」清单按分支分别声明
      if (effects.lost.length) {
        layerWarnings.push(`图层样式「${effects.lost.join('、')}」无法还原，栅格图中不包含这些效果`)
        warnings.push(`图层「${name}」图层样式「${effects.lost.join('、')}」无法还原（建议在 Photoshop 中先栅格化图层样式）`)
      }
      if (layer.blendMode && layer.blendMode !== 'normal' && layer.blendMode !== 'pass through') {
        layerWarnings.push(`混合模式「${layer.blendMode}」：编辑器画布已支持，小程序端暂不支持`)
        warnings.push(`图层「${name}」混合模式「${layer.blendMode}」在小程序端暂不支持`)
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
          // 文字层 bounds 缺失（ag-psd #251）：transform[4/5] 是 PS 文字原点坐标（第一行基线左端，单位 pt），
          // 不是 bounds 左上角。若直接当 left/top 用，位置会偏上偏左（基线左端比左上少 ascender 高）。
          // 实际校准：用栅格 canvas 的左上在 PSD 文档中的真实位置反推更稳——
          // canvas 是 ag-psd 将该层栅格化后在文档坐标系下的像素位图，其 origin 相对
          // layer.left/top（即文档内 bounds 左上），所以直接用 (layer.left, layer.top) 兜底；
          // 当 layer.left/top 也无效时才用 transform 并加上估算 ascender 偏移（≈ 0.8*fontSize），
          // 避免文字比 PSD 稿高出一截。
          const baselineX = (textData.transform[4] || 0) * pxPerPt
          const baselineY = (textData.transform[5] || 0) * pxPerPt
          if (layer.left != null && layer.left >= 0 && layer.top != null && layer.top >= 0) {
            // bounds 数值存在但 width/height=0：保留 layer.left/top（文档内栅格对齐位置），仅替换尺寸
            left = layer.left
            top = layer.top
          } else {
            // style/mergeTextStyles 在后面才赋值，这里直接从 textData 取原始 fontSize 估算字号
            const rawFontPt: number | undefined = (textData.style as any)?.fontSize ?? dominantRunFontSize(textData.styleRuns as any)
            const scaled = (rawFontPt ?? 0) * transformScale(textData.transform)
            const fontSizeEstimatePx = resolveFontSizePx(scaled || 0, resolution, resolutionUnit) || 24
            left = Math.max(0, baselineX - 2) // 基线左端 x≈文字左边界(通常带一点 left-bearing，-2px 做宽松容忍)
            top = Math.max(0, baselineY - fontSizeEstimatePx * 0.8) // 基线 y - ascender(≈0.8×字号) ≈ 文字顶部
          }
        }
      }

      // ag-psd 的 Layer.opacity 已是 0-1 归一化值（PSD 字节 / 255），直接使用
      const opacity = layer.opacity == null ? 1 : Math.max(0, Math.min(1, layer.opacity))
      const blendMode = layer.blendMode || 'normal'

      if (isTextLayer) {
        // 剪贴蒙版层且 base 缺失（base 被隐藏/组外/无内容）：PS 中该组 clip 均不可见 → 跳过
        if (layer.clipping && !lastBase) {
          skipped.push({ name, reason: '剪贴蒙版 base 缺失或被隐藏，整组跳过' })
          continue
        }
        const rawText = textData.text || ''
        // 1) NFKC 还原预成形字形（视觉序存储的文本字形是已连写形式）
        // 2) 若为 RTL 且含成形字形（视觉顺序存储）：视觉顺序 → 逻辑顺序（不转换会导致画布/小程序渲染时
        //    bidi 二次重排而乱码）；逻辑序（基础字母）文本保持原样
        let text = normalizeText(rawText)
        if (containsRtl(text) && SHAPED_RTL_RE.test(rawText)) {
          text = visualToLogicalRtl(text)
        }
        // 占位符自动识别（前移）：整行命中才自动绑定 dataKey；
        // 部分命中（如「女方婚礼时间：2026年10月1日 20:00」）仅记录 detectedKey，
        // 由导入对话框逐条确认后再绑定，避免混合内容行被字段值整行覆盖
        const detected = detectPlaceholder(text)
        const dataKey = detected?.fullMatch ? detected.key : undefined

        // 保留可编辑性的前提下无法还原的效果（Fabric/小程序文字只支持投影与描边）
        const unrestorableFx = [
          effects.innerShadow && '内阴影',
          effects.innerGlow && '内发光',
          effects.satin && '光泽',
          effects.bevelEmboss && '斜面浮雕',
        ].filter(Boolean) as string[]

        // 文字层一律保留可编辑文本（不再整层栅格化为图片）：
        // 内阴影/光泽/斜面浮雕等效果无法在画布文字上还原，以告警提示设计师在 PS 中栅格化图层样式；
        // 误栅格化会导致「新郎名/地址」等需要编辑的文字变成图片（已回归修复）
        if (unrestorableFx.length > 0) {
          const suffix = dataKey ? '，占位符文字需保留可编辑性' : ''
          layerWarnings.push(`文字层「${unrestorableFx.join('、')}」效果未还原（保留文字可编辑性；如需保留效果请先在 PS 中栅格化该层样式${suffix}）`)
          warnings.push(`图层「${name}」文字层「${unrestorableFx.join('、')}」效果未还原（保留文字可编辑性；如需保留效果请先在 PS 中栅格化该层样式${suffix}）`)
        }

        // 主体样式：多样式段落取「非空白字符最多」的 run 样式，图层默认样式补缺。
        // textData.style 是 PS 的默认样式，混合样式的文字层（金色标题+白色正文共用一层）常与主体不一致
        const dom = dominantRunTextStyle(textData.styleRuns as any, rawText)
        const style: TextStyle | undefined = mergeTextStyles(dom.style, textData.style)
        const fontName = style?.font?.name
        const mapped = mapFontName(fontName, availableFonts)
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
        const color = effects.solidFill?.color || toHex6(colorToHex(style?.fillColor)) || '#333333'
        const strokeColor = toHex6(colorToHex(style?.strokeColor)) || 'transparent'
        const strokeWidth = style?.outlineWidth ? Math.round(style.outlineWidth) : 0
        const justification = mapJustification(textData.paragraphStyle?.justification)
        // tracking 单位 1/1000 em。编辑器 letterSpacing 语义 = 0.01em（默认 2 = 0.02em，
        // admin 画布渲染时 ×10 转 Fabric charSpacing 的 1/1000 em 单位）。
        // 因此必须除以 10 换算：PSD tracking -20（-0.02em）→ letterSpacing -2。
        // 直接透传会被解读成 -0.2em，字间距比 PSD 紧 10 倍，中文挤成一团（已修复）。
        // RTL 由现有链路强制 0（哈语连写脚本加字间距会断开连字）
        const tracking = style?.tracking != null ? Math.round(style.tracking / 10) : 0
        // leading → lineHeight 比值（行高钳制到可渲染范围；单行文本行高不影响渲染，钳制但不告警）
        const { value: lineHeight, clamped } = resolveLineHeight(style?.leading, effectiveFontSizePt, style?.autoLeading)
        if (clamped && text.includes('\n')) {
          const original = style?.leading && effectiveFontSizePt ? Math.round((style.leading / effectiveFontSizePt) * 100) / 100 : undefined
          layerWarnings.push(`行高 ${original} 超出可渲染范围，调整为 ${lineHeight}`)
          warnings.push(`图层「${name}」行高 ${original} 超出可渲染范围，调整为 ${lineHeight}`)
        }
        // 图层样式效果：描边效果优先于文字内描边；投影优先；无投影时外发光映射为无偏移投影近似
        const effectStroke = effects.stroke
        const effStrokeColor = effectStroke ? effectStroke.color : undefined
        const effStrokeWidth = effectStroke ? effectStroke.size : undefined
        const drop = effects.dropShadow
        const textShadow = drop ?? (effects.outerGlow
          ? { color: effects.outerGlow.color, offsetX: 0, offsetY: 0, blur: effects.outerGlow.blur }
          : undefined)
        if (!drop && effects.outerGlow) {
          layerWarnings.push('外发光已用无偏移投影近似还原')
          warnings.push(`图层「${name}」外发光已用无偏移投影近似还原`)
        } else if (drop && effects.outerGlow) {
          layerWarnings.push('外发光与投影并存，仅保留投影')
          warnings.push(`图层「${name}」外发光与投影并存，仅保留投影`)
        }
        // 可编辑文字链路上实际已还原的效果（其余效果已在上方「未还原」告警中说明）
        const textAppliedFx: string[] = []
        if (drop) textAppliedFx.push('投影')
        if (effectStroke) textAppliedFx.push('描边')
        if (!drop && effects.outerGlow) textAppliedFx.push('外发光')
        if (textAppliedFx.length) {
          layerWarnings.push(`已还原图层样式（${textAppliedFx.join('、')}）`)
          warnings.push(`图层「${name}」已还原图层样式（${textAppliedFx.join('、')}）`)
        }

        // 文字方向需按识别前的原始文本判定（哈语原文含 RTL 字符；识别后的 {key} token 已无 RTL 特征）
        const direction: 'ltr' | 'rtl' = containsRtl(text) ? 'rtl' : 'ltr'
        const detectedKey = detected?.key
        const detectedToken = detected?.token
        const detectedDisplay = detected?.displayText
        const defaults = detected?.defaults

        const textEntry: PsdLayerPreview = {
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
          // 文字水平缩放（如 0.876 = 横向压扁 12.4%），admin 预览用 Fabric scaleX 还原
          horizontalScale:
            style?.horizontalScale != null && style.horizontalScale !== 1
              ? Math.round(style.horizontalScale * 1000) / 1000
              : undefined,
          // PS 伪粗体：字体无 Bold 字重时的加粗描边，用 bold 近似
          fontWeight: style?.fauxBold ? 'bold' : undefined,
          strokeColor: effStrokeColor || (strokeColor !== '#00000000' ? strokeColor : 'transparent'),
          strokeWidth: effStrokeWidth != null && effStrokeWidth > 0 ? Math.round(effStrokeWidth * 100) / 100 : strokeWidth > 0 ? strokeWidth : 0,
          shadowColor: textShadow?.color || 'transparent',
          shadowOffsetX: textShadow?.offsetX ?? 0,
          shadowOffsetY: textShadow?.offsetY ?? 0,
          shadowBlur: textShadow?.blur ?? 0,
          hasEffects,
          warnings: layerWarnings,
          direction,
          dataKey,
          detectedKey,
          detectedToken,
          detectedDisplay,
          defaults,
          groupId,
        }
        // 剪贴蒙版文字层：可编辑文字无法烘焙像素裁剪，退化为 base 的简单几何蒙版
        if (layer.clipping) {
          if (lastBase?.shape?.mask) {
            textEntry.mask = lastBase.shape.mask
            if (lastBase.shape.mask === 'rounded' && lastBase.shape.radiusRatio) {
              textEntry.borderRadius = Math.round(lastBase.shape.radiusRatio * Math.max(1, textEntry.width))
            }
          } else {
            layerWarnings.push('剪贴蒙版 base 缺失或形状复杂，未应用裁剪')
          }
          layers.push(textEntry)
          continue
        }
        // 非 clip 文字层成为后续 clip 层的 base（文字栅格 alpha 即形状）
        const textOwnShape = analyzeVectorMaskShape(layer.vectorMask as any, width, height)
        lastBase = {
          left: textEntry.left,
          top: textEntry.top,
          width: textEntry.width,
          height: textEntry.height,
          canvas,
          shape: textOwnShape.mask ? textOwnShape : undefined,
        }
        layers.push(textEntry)
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
            if (!layer.clipping) lastBase = null
            continue
          }
        } else {
          // 无栅格层（矢量形状层等）无法导入本体：若带简单矢量蒙版形状（圆/圆角矩形），
          // 可记录为后续 clipping 层的 base（几何蒙版兜底），如圆形头像框的圆形路径层
          if (!layer.clipping) {
            const baseShape = analyzeVectorMaskShape(layer.vectorMask as any, width, height)
            lastBase = baseShape.mask ? { left, top, width, height, shape: baseShape } : null
          }
          skipped.push({ name, reason: placed ? '智能对象无嵌入文件（外链智能对象，无法导入）' : '无栅格数据（无法导入）' })
          continue
        }
      }
      // 剪贴蒙版层且 base 缺失：PS 中该组 clip 均不可见 → 跳过（与文字分支一致）
      if (layer.clipping && !lastBase) {
        skipped.push({ name, reason: '剪贴蒙版 base 缺失或被隐藏，整组跳过' })
        continue
      }
      // ---- 剪贴蒙版：裁剪到下方 base 的形状（bottom→top 遍历中 base 已处理完毕）----
      // base 有栅格 → 用其 alpha 通道精确裁剪（矢量形状/文字/任意形状通用）；
      // 无栅格但有简单矢量形状 → 几何蒙版兜底。此处烘焙在像素蒙版/效果合成之前（乘法 alpha 与顺序无关）。
      let clipMaskApplied = false
      if (layer.clipping) {
        clipMaskApplied = bakeClipMask(canvas, lastBase!, left, top)
        if (clipMaskApplied) {
          layerWarnings.push('已按剪贴蒙版 base 形状裁剪')
        } else {
          layerWarnings.push('剪贴蒙版 base 形状无法还原，按原始图片导入')
        }
      }
      // ---- 像素蒙版烘焙（图层自身蒙版 + 祖先组蒙版），在效果合成前应用 ----
      // 烘焙后形状已含在像素 alpha 中：无需再做 alpha 蒙版检测，剪贴蒙版检测不受影响
      let pixelMaskApplied = false
      {
        const ownMask = (layer.mask && !layer.mask.disabled && (layer.mask as any).canvas) ? (layer.mask as PixelMaskInfo) : null
        const masksToApply = ownMask ? [ownMask, ...groupMasks] : groupMasks
        let working = canvas
        for (const m of masksToApply) {
          const masked = applyPixelMaskToCanvas(working, m, left, top)
          if (masked) {
            working = masked
            pixelMaskApplied = true
          }
        }
        if (pixelMaskApplied) {
          canvas = working
          layerWarnings.push('像素蒙版已烘焙进图片')
        }
      }

      let dataUrl: string
      let pad = 0
      // 图片层实际近似的全部效果（合成进栅格）
      if (hasEffects) {
        const applied: string[] = []
        if (effects.dropShadow) applied.push('投影')
        if (effects.stroke) applied.push('描边')
        if (effects.solidFill) applied.push('颜色叠加')
        if (effects.innerShadow) applied.push('内阴影')
        if (effects.satin) applied.push('光泽')
        if (effects.outerGlow) applied.push('外发光')
        if (effects.innerGlow) applied.push('内发光')
        if (effects.bevelEmboss) applied.push('斜面浮雕')
        if (applied.length) {
          layerWarnings.push(`已近似还原图层样式（${applied.join('、')}）`)
          warnings.push(`图层「${name}」图层样式已近似还原（${applied.join('、')}）`)
        }
      }
      try {
        if (effects.dropShadow || effects.stroke || effects.solidFill || effects.innerShadow || effects.satin || effects.outerGlow || effects.innerGlow || effects.bevelEmboss) {
          const composed = compositeLayerEffects(canvas, {
            dropShadow: effects.dropShadow,
            stroke: effects.stroke,
            solidFill: effects.solidFill,
            innerShadow: effects.innerShadow,
            satin: effects.satin,
            outerGlow: effects.outerGlow,
            innerGlow: effects.innerGlow,
            bevelEmboss: effects.bevelEmboss,
          })
          canvas = composed.canvas
          pad = composed.pad
        }
        dataUrl = canvas.toDataURL('image/png')
      } catch (_) {
        skipped.push({ name, reason: '图层栅格转换失败' })
        continue
      }

      // 蒙版检测：只检测图层自身 vectorMask（clipping 的 base 裁剪已在上方烘焙进像素）
      const detectedShape = analyzeVectorMaskShape(layer.vectorMask as any, width, height)
      const detectedMask = detectedShape.mask

      // alpha 通道检测：识别非规则形状（星形/花形/剪贴蒙版烘焙后的异形）。
      // 关键：剪贴蒙版（clipMaskApplied）的形状已烘焙进 PNG alpha，但此前因为
      // !clipMaskApplied 条件被跳过，导致 mask 字段为 rect，换图时不做蒙版合成。
      // 修复：剪贴蒙版层也必须检测 alpha，有透明像素即标记为 alpha，确保换图时合成。
      let alphaMask: 'alpha' | null = null
      if (!detectedMask && !pixelMaskApplied && canvas) {
        alphaMask = detectAlphaMaskFromCanvas(canvas)
      }
      // 剪贴蒙版：形状一定在 alpha 里（base 形状已 destination-in 烘焙），
      // 若严格阈值未命中（如大面积透明但边缘锐利），放宽为「有任意透明像素即 alpha」
      if (!detectedMask && !alphaMask && clipMaskApplied && canvas) {
        alphaMask = detectAlphaMaskFromCanvas(canvas, { relaxed: true })
      }

      const entry: PsdLayerPreview = {
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
        groupId,
        mask: detectedMask || alphaMask || undefined,
        borderRadius: detectedMask === 'rounded' && detectedShape.radiusRatio
          ? Math.round(detectedShape.radiusRatio * Math.max(1, width))
          : undefined,
      }
      layers.push(entry)

      // clipping 层不作为 base（连续 clip 链共享同一 base）；
      // 非 clipping 层成为后续 clip 层的 base（栅格 alpha 即形状，矢量形状作几何兜底）
      if (!layer.clipping) {
        lastBase = {
          left: entry.left,
          top: entry.top,
          width: entry.width,
          height: entry.height,
          canvas,
          shape: detectedShape.mask ? detectedShape : undefined,
        }
      }
    }
  }

  await walk(psd.children, 0)
  // walk 按 ag-psd children 顺序遍历，实测为 bottom→top（最底层在前，与合成图像素比对验证），
  // 与画布 z-index 顺序（数组序 = 0 在底）一致，保持原序返回。
  // 注意：ag-psd 自带 README_PSD.md 声称 children 为 top→bottom，与本库实际行为不符，勿按文档反转。

  return { layers, skipped, warnings, warningGroups: groupPsdWarnings(warnings) }
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
