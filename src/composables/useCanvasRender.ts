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
    return {
      aspectRatio: `${w} / ${h}`,
      height: cardHeight.value > 0 ? cardHeight.value + 'px' : undefined,
      width: '100%',
      margin: '0',
      maxWidth: '100%',
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
    if (bg.type === 'image' && bg.image) {
      return { background: `url(${bg.image}) center/cover no-repeat` }
    }
    return { background: bg?.color1 || '#ffffff' }
  })

  function getCanvasElementStyle(el: EditableElement): Record<string, string> {
    if (el.x == null || el.y == null || el.width == null || el.height == null) return {}

    const style: Record<string, string> = {
      position: 'absolute',
      left: `${(el.x / canvasWidth.value) * 100}%`,
      top: `${(el.y / canvasHeight.value) * 100}%`,
      width: `${(el.width / canvasWidth.value) * 100}%`,
      height: `${(el.height / canvasHeight.value) * 100}%`,
      zIndex: String(el.zIndex ?? 0),
      opacity: String(el.opacity ?? 1),
    }

    if (el.type === 'text') {
      style.overflow = 'hidden'
    }

    if (el.rotation) {
      style.transform = `rotate(${el.rotation}deg)`
    }

    if (el.type === 'image' && el.style?.borderRadius) {
      style.borderRadius = `${el.style.borderRadius}rpx`
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

    const result: Record<string, string | number | undefined> = {
      fontSize: `${style.fontSize || DEFAULT_FONT_SIZE}rpx`,
      color: style.color || '#333333',
      lineHeight: String(style.lineHeight || DEFAULT_LINE_HEIGHT),
      letterSpacing: direction === 'rtl' ? 'normal' : `${style.spacing ?? DEFAULT_LETTER_SPACING}rpx`,
      fontFamily: getFontFamily(style.font),
      fontWeight: style.fontWeight || 'normal',
      fontStyle: style.fontStyle || 'normal',
      textAlign,
      direction,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
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
