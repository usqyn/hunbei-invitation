import { computed, ref } from 'vue'
import {
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_SIZE_FALLBACK,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_LETTER_SPACING,
  RTL_CHAR_REGEX,
  FONT_FAMILY_BASE,
} from '@/constants/editor'
import type { EditableElement, ElementStyle } from '@/types'

interface BackgroundConfig {
  type: 'solid' | 'linear-gradient' | 'radial-gradient' | 'image'
  color1?: string
  color2?: string
  angle?: number
  image?: string
}

interface CanvasSize {
  width?: number
  height?: number
}

export function useCanvasRender(options: {
  getElements: () => EditableElement[]
  getCanvasSize: () => CanvasSize | undefined
  getBackground: () => BackgroundConfig | undefined
}) {
  const { getElements, getCanvasSize, getBackground } = options

  const cardHeight = ref(0)

  const canvasWidth = computed(() => getCanvasSize()?.width ?? DEFAULT_CANVAS_WIDTH)
  const canvasHeight = computed(() => getCanvasSize()?.height ?? DEFAULT_CANVAS_HEIGHT)

  const isCanvasMode = computed(() => {
    const elements = getElements()
    return elements.length > 0 &&
      elements.some(el => el.x != null && el.y != null && el.width != null && el.height != null)
  })

  const isLandscape = computed(() => {
    if (!isCanvasMode.value) return false
    return canvasWidth.value > canvasHeight.value
  })

  function updateCardHeight(cardWidth: number) {
    const w = canvasWidth.value
    const h = canvasHeight.value
    if (cardWidth > 0) {
      cardHeight.value = Math.round(cardWidth * (h / w))
    }
  }

  const canvasCardStyle = computed(() => {
    const w = canvasWidth.value
    const h = canvasHeight.value
    // 只管尺寸比例，width/maxWidth/margin 交给 CSS 类控制
    // 避免内联样式覆盖 CSS 导致 box-sizing + padding 溢出
    return {
      aspectRatio: `${w} / ${h}`,
      height: cardHeight.value > 0 ? cardHeight.value + 'px' : undefined,
    }
  })

  const canvasBackgroundStyle = computed(() => {
    const bg = getBackground()
    if (!bg || bg.type === 'solid') {
      return { background: bg?.color1 || '#ffffff' }
    }
    if (bg.type === 'linear-gradient') {
      const angle = bg.angle ?? 135
      return { background: `linear-gradient(${angle}deg, ${bg.color1}, ${bg.color2 || bg.color1})` }
    }
    if (bg.type === 'radial-gradient') {
      return { background: `radial-gradient(circle, ${bg.color1}, ${bg.color2 || bg.color1})` }
    }
    if (bg.type === 'image') {
      // 背景图 URL 为空时回退到纯色背景，避免渲染空 url()
      if (!bg.image) {
        return { background: bg.color1 || '#ffffff' }
      }
      return { background: `url(${bg.image}) center/cover no-repeat` }
    }
    return { background: bg?.color1 || '#ffffff' }
  })

  function getCanvasElementStyle(el: EditableElement): Record<string, string> {
    if (el.x == null || el.y == null || el.width == null || el.height == null) return {}

    // 限制最小尺寸，避免 width/height 为 0 或负值时产生非法比例
    const cw = Math.max(canvasWidth.value, 1)
    const ch = Math.max(canvasHeight.value, 1)
    const w = Math.max(el.width || 0, 1)
    const h = Math.max(el.height || 0, 1)

    const style: Record<string, string> = {
      position: 'absolute',
      left: `${(el.x / cw) * 100}%`,
      top: `${(el.y / ch) * 100}%`,
      width: `${(w / cw) * 100}%`,
      height: `${(h / ch) * 100}%`,
      zIndex: String(el.zIndex ?? 0),
      opacity: String(el.opacity ?? 1),
    }

    // 文本元素：不限制宽高，让文本自然撑开（与 admin Fabric IText 行为一致）
    // admin 的 IText 不设 width、不换行、不裁切，小程序也应如此
    if (el.type === 'text') {
      style.width = 'auto'
      style.height = 'auto'
      style.minHeight = `${(h / ch) * 100}%`
    }

    // 构建复合 transform：旋转 + 图片缩放 + 图片偏移
    const transforms: string[] = []
    if (el.rotation) {
      transforms.push(`rotate(${el.rotation}deg)`)
    }
    if (el.type === 'image' && el.imageScale && el.imageScale !== 1) {
      transforms.push(`scale(${el.imageScale})`)
    }
    if (transforms.length > 0) {
      style.transform = transforms.join(' ')
    }

    // 图片圆角：优先用 element 级别 borderRadius，回退到 style.borderRadius
    const br = el.borderRadius ?? el.style?.borderRadius
    if (el.type === 'image' && br) {
      style.borderRadius = `${br}rpx`
      style.overflow = 'hidden'
    }

    return style
  }

  function getFontFamily(font: string | undefined): string {
    if (!font) return FONT_FAMILY_BASE
    return `"${font}", ${FONT_FAMILY_BASE}`
  }

  function detectTextDirection(text: string): 'ltr' | 'rtl' {
    return RTL_CHAR_REGEX.test(text) ? 'rtl' : 'ltr'
  }

  function getTextStyle(el: EditableElement): Record<string, string | number | undefined> {
    if (!el || !el.style) {
      return {
        fontSize: `${DEFAULT_FONT_SIZE_FALLBACK}rpx`,
        color: '#333333',
        lineHeight: DEFAULT_LINE_HEIGHT,
        letterSpacing: `${DEFAULT_LETTER_SPACING}rpx`,
      }
    }

    const style: ElementStyle = el.style

    const detectedDirection = detectTextDirection(el.text)
    const direction = style.direction === 'auto' ? detectedDirection : (style.direction || 'ltr')
    const textAlign = style.textAlign || (direction === 'rtl' ? 'right' : 'center')
    // 限制最小字号，避免 fontSize 为 0 或极小值导致文字不可见
    const fontSize = Math.max(style.fontSize || DEFAULT_FONT_SIZE, 8)

    const result: Record<string, string | number | undefined> = {
      fontSize: `${fontSize}rpx`,
      color: style.color || '#333333',
      lineHeight: String(style.lineHeight || DEFAULT_LINE_HEIGHT),
      // admin 编辑态字间距是 0.02em（相对字号），序列化后变成 rpx 绝对值。
      // 这里转回 em 单位，保持与 admin 一致的相对语义，避免不同字号下字间距失真
      letterSpacing: direction === 'rtl' ? 'normal' : `${((style.spacing ?? DEFAULT_LETTER_SPACING) / fontSize).toFixed(4)}em`,
      fontFamily: getFontFamily(style.font),
      fontWeight: style.fontWeight || 'normal',
      fontStyle: style.fontStyle || 'normal',
      textAlign,
      direction,
      // 与 admin Fabric IText 一致：不自动换行，文本按自然宽度排布
      whiteSpace: 'pre',
      writingMode: 'horizontal-tb',
      textDecoration: style.textDecoration || 'none',
    }

    if (direction === 'rtl') {
      result.unicodeBidi = 'isolate'
    }

    if (style.strokeWidth) {
      result.WebkitTextStroke = `${style.strokeWidth}rpx ${style.strokeColor || 'transparent'}`
    }

    if (style.shadowBlur) {
      result.textShadow = `${style.shadowOffsetX ?? 0}rpx ${style.shadowOffsetY ?? 0}rpx ${style.shadowBlur}rpx ${style.shadowColor || 'transparent'}`
    }

    return result
  }

  return {
    cardHeight,
    canvasWidth,
    canvasHeight,
    isCanvasMode,
    isLandscape,
    updateCardHeight,
    canvasCardStyle,
    canvasBackgroundStyle,
    getCanvasElementStyle,
    getFontFamily,
    detectTextDirection,
    getTextStyle,
  }
}
