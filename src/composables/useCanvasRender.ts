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
import { buildImageCssFilterFromElement } from '@/utils/imageFilter'

interface BackgroundConfig {
  type: 'solid' | 'linear-gradient' | 'radial-gradient' | 'image'
  color1?: string
  color2?: string
  angle?: number
  image?: string
  // 历史字段：admin 早期版本存 imageUrl，渲染时优先用 image
  imageUrl?: string
  imageScale?: string
  imageOpacity?: number
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
      // 兼容 admin 标准字段 image 与历史字段 imageUrl
      const bgImage = bg.image || bg.imageUrl
      // 背景图 URL 为空时回退到纯色背景，避免渲染空 url()
      if (!bgImage) {
        return { background: bg.color1 || '#ffffff' }
      }
      // 应用背景图缩放（imageScale: 'cover' | 'contain' | '100%'）与透明度
      const scale = bg.imageScale
      const bgSize = scale === 'contain' ? 'contain' : (scale === '100%' ? '100% 100%' : 'cover')
      const opacity = bg.imageOpacity
      if (opacity != null && opacity < 1) {
        // opacity<1 时用伪背景层无法实现，这里用 rgba 叠加近似（uniapp view 不支持 ::before）
        return {
          backgroundImage: `url(${bgImage})`,
          backgroundPosition: 'center',
          backgroundSize: bgSize,
          backgroundRepeat: 'no-repeat',
          opacity: opacity,
        }
      }
      return {
        backgroundImage: `url(${bgImage})`,
        backgroundPosition: 'center',
        backgroundSize: bgSize,
        backgroundRepeat: 'no-repeat',
      }
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

    // 图片滤镜：brightness / contrast / saturate / blur / grayscale
    // 使用统一工具 utils/imageFilter.ts，与 admin 端 useCanvas.ts applyImagePatch 公式完全对齐：
    //   brightness(${brightness}%) contrast(${100 + contrast}%) saturate(${saturate}%) blur(${blur}px) grayscale(${grayscale}%)
    // 字段默认值：brightness=100 / contrast=0(偏移量,0=不变) / saturate=100 / blur=0 / grayscale=0
    // 任一非默认值时输出完整 filter 串，避免部分字段缺失导致渲染跳变
    if (el.type === 'image') {
      const cssFilter = buildImageCssFilterFromElement(el)
      if (cssFilter) {
        style.filter = cssFilter
        // 兼容 iOS 旧版本（参考微信开放社区反馈：iOS 18.4 前 filter 需前缀）
        style.WebkitFilter = cssFilter
      }
      // 图片边框（admin 序列化器输出 borderColor/borderWidth）
      const borderColor = el.borderColor ?? st.borderColor
      const borderWidth = el.borderWidth ?? st.borderWidth
      if (borderColor && borderColor !== 'transparent' && borderWidth) {
        style.borderColor = borderColor
        style.borderWidth = `${borderWidth}rpx`
        style.borderStyle = 'solid'
      }
      // 图片遮罩 mask（仅支持 'circle'，其余回退矩形）
      const mask = el.mask ?? st.mask
      if (mask === 'circle') {
        style.borderRadius = '50%'
      }
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

    // RTL 文本（含哈语占位符替换后的实际哈语内容）强制使用 KazakhSoftAsilya 字体，
    // 即使 admin 端 style.font 是中文字体，也能保证字符正确连写。
    // 这是对 admin element-serializer 预标记的兜底：避免旧模板或手动改 DB 的数据未标记 RTL。
    const fontFamily = direction === 'rtl'
      ? `'KazakhSoftAsilya', ${FONT_FAMILY_BASE}`
      : getFontFamily(style.font)

    const result: Record<string, string | number | undefined> = {
      fontSize: `${fontSize}rpx`,
      color: style.color || '#333333',
      lineHeight: String(style.lineHeight || DEFAULT_LINE_HEIGHT),
      // admin 编辑态字间距是 0.02em（相对字号），序列化后变成 rpx 绝对值。
      // 这里转回 em 单位，保持与 admin 一致的相对语义，避免不同字号下字间距失真
      letterSpacing: direction === 'rtl' ? 'normal' : `${((style.spacing ?? DEFAULT_LETTER_SPACING) / fontSize).toFixed(4)}em`,
      fontFamily,
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

    // 文字渐变填充（admin Fabric 支持，小程序通过 background-clip 还原）
    const st: any = style
    if (st.gradientFill && st.gradientStart && st.gradientEnd) {
      const angle = st.gradientAngle ?? 90
      result.backgroundImage = `linear-gradient(${angle}deg, ${st.gradientStart}, ${st.gradientEnd})`
      result.WebkitBackgroundClip = 'text'
      result.backgroundClip = 'text'
      result.color = 'transparent'
      result.WebkitTextFillColor = 'transparent'
    }

    // 长阴影特效（多层 textShadow 模拟）
    if (st.longShadowEnabled && st.longShadowColor && st.longShadowColor !== 'transparent') {
      const len = st.longShadowLength ?? 8
      const angle = ((st.longShadowAngle ?? 45) * Math.PI) / 180
      const dx = Math.round(Math.cos(angle))
      const dy = Math.round(Math.sin(angle))
      const shadows: string[] = []
      for (let i = 1; i <= len; i++) {
        shadows.push(`${i * dx}rpx ${i * dy}rpx 0 ${st.longShadowColor}`)
      }
      // 合并已有 textShadow
      const existing = result.textShadow
      result.textShadow = (existing ? existing + ', ' : '') + shadows.join(', ')
    }

    // 霓虹发光特效
    if (st.neonGlowEnabled && st.neonGlowColor && st.neonGlowColor !== 'transparent') {
      const size = st.neonGlowSize ?? 4
      const blur = st.neonGlowBlur ?? 8
      const glow = `0 0 ${size}rpx ${st.neonGlowColor}, 0 0 ${blur}rpx ${st.neonGlowColor}`
      const existing = result.textShadow
      result.textShadow = (existing ? existing + ', ' : '') + glow
    }

    return result
  }

  function getShapeStyle(el: EditableElement): Record<string, string> {
    const st: any = el.style || {}
    const style: Record<string, string> = {
      width: '100%',
      height: '100%',
    }
    // 形状填充：渐变 > 纯色
    if (st.gradientFill && st.gradientStart && st.gradientEnd) {
      const angle = st.gradientAngle ?? 90
      style.background = `linear-gradient(${angle}deg, ${st.gradientStart}, ${st.gradientEnd})`
    } else if (st.color) {
      style.background = st.color
    } else {
      style.background = st.background || '#cccccc'
    }
    // 边框
    if (st.borderColor && st.borderColor !== 'transparent' && st.borderWidth) {
      style.borderColor = st.borderColor
      style.borderWidth = `${st.borderWidth}rpx`
      style.borderStyle = 'solid'
    }
    // 圆角 / 圆形
    const mask = el.mask ?? st.mask
    if (mask === 'circle') {
      style.borderRadius = '50%'
    } else if (el.borderRadius ?? st.borderRadius) {
      style.borderRadius = `${el.borderRadius ?? st.borderRadius}rpx`
    }
    // 透明度
    if (el.opacity != null && el.opacity < 1) {
      style.opacity = String(el.opacity)
    }
    return style
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
    getShapeStyle,
  }
}
