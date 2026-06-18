// 画布元素类型定义
// 注：与 Fabric.js 的内部对象区分，我们用前缀 C 表示"可序列化 Canvas 元素"

export type CanvasElementType = 'text' | 'image' | 'sticker'

// 背景类型
export type BackgroundType = 'solid' | 'linear-gradient' | 'radial-gradient' | 'image'

// 画布尺寸
export interface CanvasSize {
  width: number
  height: number
}

// 背景配置
export interface CanvasBackground {
  type: BackgroundType
  color1: string
  color2?: string
  angle?: number
  imageUrl?: string
  imageScale?: 'contain' | 'cover' | 'fill' | 'none'
  imageOpacity?: number
}

// 公共元素字段
export interface BaseElement {
  id: string
  type: CanvasElementType
  name: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  locked: boolean
  visible: boolean
  zIndex: number
}

// 文字元素
export interface TextElement extends BaseElement {
  type: 'text'
  content: string
  fontFamily: string
  fontSize: number
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  color: string
  textAlign: 'left' | 'center' | 'right' | 'justify'
  lineHeight: number
  letterSpacing: number
  strokeColor: string
  strokeWidth: number
  shadowColor: string
  shadowOffsetX: number
  shadowOffsetY: number
  shadowBlur: number
  textDecoration: 'none' | 'underline' | 'line-through'
  underline?: boolean
  linethrough?: boolean
}

// 图片元素
export interface ImageElement extends BaseElement {
  type: 'image'
  src: string
  scale: 'contain' | 'cover' | 'fill' | 'none'
  mask: 'rect' | 'rounded' | 'circle' | 'heart' | 'star'
  borderRadius: number
  borderColor: string
  borderWidth: number
  brightness: number
  contrast: number
  blur: number
  grayscale: number
  saturate: number
}

// 贴纸/形状元素
export interface StickerElement extends BaseElement {
  type: 'sticker'
  svgContent: string
  fillColor: string
  strokeColor: string
  strokeWidth: number
}

// 联合类型
export type AnyCanvasElement = TextElement | ImageElement | StickerElement

// 整个画布草稿（用于保存/恢复/上传）
export interface CanvasDraft {
  canvasSize: CanvasSize
  background: CanvasBackground
  elements: AnyCanvasElement[]
}

// 历史快照（撤销栈中的一条）
export interface HistorySnapshot {
  draft: CanvasDraft
  description: string
  ts: number
}

// 预设尺寸（常见微信小程序尺寸）
export const CANVAS_PRESETS: Array<{ label: string; width: number; height: number }> = [
  { label: '320 × 480', width: 320, height: 480 },
  { label: '375 × 667', width: 375, height: 667 },
  { label: '390 × 844', width: 390, height: 844 },
  { label: '750 × 1334', width: 750, height: 1334 },
]

// 默认画布配置
export const DEFAULT_CANVAS_SIZE: CanvasSize = { width: 375, height: 667 }

export const DEFAULT_BACKGROUND: CanvasBackground = {
  type: 'solid',
  color1: '#ffffff',
  imageScale: 'cover',
  imageOpacity: 1,
}

// 生成一个唯一 ID
export function createId(prefix = 'el'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}
