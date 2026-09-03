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
import { isCloudUrl, resolveCloudUrl, resolveCloudUrlSync, resolveUrl } from '@/utils/url'

// ---- 背景图 cloud:// URL 解析（模块级共享缓存）----
// 小程序 WXSS 的 background-image 只支持 https 网络图/base64，
// cloud:// 文件 ID 直接放进 url() 会静默失败（无任何报错），表现为"背景加载不出来"。
// 先用缓存中的临时 URL 同步渲染；无缓存时异步换取 https URL，成功后写入映射触发响应式刷新。
const cloudBgUrlMap = ref<Record<string, string>>({})
// bump 计数器：每次写入 cloudBgUrlMap 时 bump 一下，getImageFillStyle 开头读它强制建立
// Vue 响应式依赖（因为 getImageFillStyle 是方法调用，Vue 3 不会自动追踪方法内的 ref 访问），
// 确保异步 resolveCloudUrl 完成后 mask-image 能重渲染。
const cloudBgBump = ref(0)

function setCloudBgUrl(key: string, value: string) {
  cloudBgUrlMap.value = { ...cloudBgUrlMap.value, [key]: value }
  cloudBgBump.value++
}

export function resolveBackgroundImageUrl(url: string | undefined | null): string {
  if (!url) return ''
  // 先用 resolveUrl 处理所有格式（/uploads/ → cloud://、http → https、相对路径拼接等）
  const resolved = resolveUrl(url)
  if (!resolved) return ''
  if (!isCloudUrl(resolved)) return resolved
  // cloud:// URL 需换取 https 临时 URL
  // 1) 组件级映射缓存
  const cached = cloudBgUrlMap.value[resolved]
  if (cached) return cached
  // 2) url.ts 同步缓存（含持久化冷启动加载）——命中可立即渲染，避免首帧空白回退纯色
  const syncCached = resolveCloudUrlSync(resolved)
  if (syncCached && !isCloudUrl(syncCached)) {
    setCloudBgUrl(resolved, syncCached)
    return syncCached
  }
  // 3) 未命中：异步换取，成功后写入映射触发响应式刷新
  resolveCloudUrl(resolved)
    .then((httpsUrl) => {
      if (httpsUrl && !isCloudUrl(httpsUrl)) {
        setCloudBgUrl(resolved, httpsUrl)
      }
    })
    .catch(() => {})
  // 未就绪时返回空串：调用方回退纯色背景，避免渲染非法的 url(cloud://...)
  return ''
}

// ---- alpha 蒙版兜底（供 FlipEditor/PageEditor/ImageAdjuster 复用）----
// 用 maskSrc（原模板图，形状烘焙在 alpha 通道）裁剪换过的新图。
// cloud:// 先同步查缓存（含持久化冷启动加载）命中立即渲染；未命中异步换取后响应式刷新。

/**
 * alpha 蒙版 URL 解析（单一实现，供 getMaskOverlayStyle 与 getImageFillStyle 复用）：
 * cloud:// 查缓存（组件映射 → url.ts 同步缓存）→ 未命中异步换取并写缓存触发刷新；
 * https 直接可用；wxfile://tmp 等本地路径在 WXSS mask-image 中不可靠，返回空。
 */
function resolveMaskRenderUrl(maskSrc: string | undefined | null): string {
  if (!maskSrc) return ''
  const resolved = resolveUrl(maskSrc)
  if (!resolved) return ''
  if (!isCloudUrl(resolved)) {
    return resolved.startsWith('http') ? resolved : ''
  }
  let httpsUrl = cloudBgUrlMap.value[resolved] || ''
  if (!httpsUrl) {
    const syncCached = resolveCloudUrlSync(resolved)
    if (syncCached && !isCloudUrl(syncCached)) {
      httpsUrl = syncCached
      setCloudBgUrl(resolved, syncCached)
    } else {
      void resolveCloudUrl(resolved).then(u => {
        if (u && !isCloudUrl(u)) {
          setCloudBgUrl(resolved, u)
        }
      }).catch(() => {})
    }
  }
  return httpsUrl
}

function buildMaskStyle(httpsUrl: string): Record<string, string> {
  return {
    WebkitMaskImage: `url(${httpsUrl})`,
    maskImage: `url(${httpsUrl})`,
    WebkitMaskSize: 'contain',
    maskSize: 'contain',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
  }
}

export function getMaskOverlayStyle(maskSrc: string | undefined | null): Record<string, string> {
  const httpsUrl = resolveMaskRenderUrl(maskSrc)
  return httpsUrl ? buildMaskStyle(httpsUrl) : {}
}

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

  // ============ 背景层（拆分「基础底色 + 图片层」，避免 WXSS background-image 的 cloud:// 解析降级）============
  // 基础底色（渐变/纯色）永远存在，作为图片加载前 / imageOpacity<1 叠加层的底色
  const canvasBgBaseStyle = computed((): Record<string, string> => {
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
    // image: 只给底底色，图片交给独立的 <CloudImage> 背景层（直接支持 cloud://，无"降级=空"）
    return { background: bg?.color1 || '#ffffff' }
  })
  // 图片背景 URL：image 类型才非空，返回原始 URL（可能是 cloud:///https//本地），
  // 由 CloudImage 组件内部统一解析，不依赖 WXSS background-image 的 url() 能力。
  const canvasBgImageUrl = computed((): string => {
    const bg = getBackground()
    if (!bg || bg.type !== 'image') return ''
    return resolveUrl(bg.image || bg.imageUrl) || ''
  })
  const canvasBgImageScale = computed((): 'aspectFill' | 'widthFix' | 'aspectFit' => {
    const bg = getBackground()
    const s = bg?.imageScale
    if (s === 'contain' || s === 'aspectFit') return 'aspectFit'
    if (s === '100%' || s === 'widthFix') return 'widthFix'
    return 'aspectFill' // cover 对应 aspectFill（默认）
  })
  const canvasBgImageOpacity = computed((): number => {
    const bg = getBackground()
    if (!bg || bg.type !== 'image') return 1
    const o = bg.imageOpacity
    return typeof o === 'number' ? o : 1
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
      const borderColor = el.borderColor ?? el.style?.borderColor
      const borderWidth = el.borderWidth ?? el.style?.borderWidth
      if (borderColor && borderColor !== 'transparent' && borderWidth) {
        style.borderColor = borderColor
        style.borderWidth = `${borderWidth}rpx`
        style.borderStyle = 'solid'
      }
      // 图片遮罩 mask
      const mask = el.mask ?? el.style?.mask
      if (mask === 'circle') {
        style.borderRadius = '50%'
      } else if (mask === 'alpha') {
        const imgSrc = (el as any).text || (el as any).src || ''
        if (imgSrc) {
          style.WebkitMaskImage = `url(${imgSrc})`
          style.maskImage = `url(${imgSrc})`
          style.WebkitMaskSize = 'contain'
          style.maskSize = 'contain'
          style.WebkitMaskRepeat = 'no-repeat'
          style.maskRepeat = 'no-repeat'
          style.WebkitMaskPosition = 'center'
          style.maskPosition = 'center'
        }
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

    // RTL 文本：用户所选字体渲染 + FONT_FAMILY_BASE 哈萨克兜底（中文用所选字体、
    // 哈萨克字符回退哈萨克字体连写），不再强制替换用户选择（与 admin element-serializer 一致）
    const fontFamily = getFontFamily(style.font)

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

  /**
   * 解析图片元素的 image mode。
   *
   * admin 端 fabric 渲染图片元素时始终按元素框拉伸（scaleX = width/img.width, scaleY = height/img.height，
   * 见 admin/src/composables/useCanvas.ts loadElementsToCanvas），即 fill 语义；
   * 序列化器输出的 style.scale（默认 'cover'）只是一个记录字段，admin 渲染时并未真正裁剪。
   * 小程序端必须对齐该语义（所见即所得），否则比例不匹配的图片（如真实照片放入固定占位框）
   * 会被 aspectFill 等比放大后裁掉一部分，出现"图片被放大、只显示一半"。
   */
  function resolveImageMode(el: EditableElement): string {
    const scale = (el.style as any)?.scale
    if (scale === 'contain') return 'aspectFit'
    return 'scaleToFill'
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

  /**
   * 图片元素的内联样式（直接应用到 <image>，而非容器 <view>）。
   * 小程序 <view> 的 overflow:hidden 不能可靠裁剪子 <image>，
   * 因此 border-radius 必须直接设在 <image> 上才能生效。
   * alpha 蒙版换图后用 maskSrc（原图 alpha）保持形状不变。
   */
  function getImageFillStyle(el: EditableElement): string {
    // 强制 Vue 响应式依赖：cloudBgBump 在 setCloudBgUrl 时递增，
    // 确保异步 resolveCloudUrl 完成后此方法会被重新调用（Vue 3 方法调用内的 ref 访问不自动追踪）。
    cloudBgBump.value
    let s = 'position:absolute;left:0;top:0;width:100%;height:100%'
    const mask = el.mask ?? el.style?.mask
    const br = el.borderRadius ?? el.style?.borderRadius

    if (mask === 'circle') {
      s += ';border-radius:50%;overflow:hidden'
    } else if (br) {
      s += `;border-radius:${br}rpx;overflow:hidden`
    }

    // alpha 蒙版：仅在换过图（有 maskSrc）时用原图 alpha 作为 CSS mask 兜底。
    // 未换图的元素形状烘焙在图片自身 alpha 通道，无需 mask（避免重复加载同一张图）。
    // 正常路径换图时已在 image-mask.ts 中离屏合成（蒙版烘焙进新图像素），此兜底很少触发。
    // URL 解析复用 resolveMaskRenderUrl（与 getMaskOverlayStyle 同一实现，避免三处逻辑漂移）
    if (mask === 'alpha') {
      const resolved = resolveMaskRenderUrl(el.maskSrc)
      if (resolved) {
        s += `;-webkit-mask-image:url(${resolved});mask-image:url(${resolved})`
        s += ';-webkit-mask-size:contain;mask-size:contain'
        s += ';-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat'
        s += ';-webkit-mask-position:center;mask-position:center'
      }
    }

    return s
  }

  return {
    cardHeight,
    canvasWidth,
    canvasHeight,
    isCanvasMode,
    isLandscape,
    updateCardHeight,
    canvasCardStyle,
    // 新的拆分背景层：底色 + 独立图片层，<CloudImage> 原生组件支持 cloud:// 直接渲染，不再有 WXSS 降级空白
    canvasBgBaseStyle,
    canvasBgImageUrl,
    canvasBgImageScale,
    canvasBgImageOpacity,
    // 兼容旧调用方（FlipEditor getPageBgStyle / 预览组件 等仍可能用到）
    canvasBackgroundStyle: canvasBgBaseStyle,
    getCanvasElementStyle,
    getImageFillStyle,
    getFontFamily,
    detectTextDirection,
    getTextStyle,
    getShapeStyle,
    resolveImageMode,
  }
}
