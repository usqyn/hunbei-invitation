/**
 * 将画布元素序列化为服务端格式。
 *
 * - Fabric.js originX/Y = 'center'，所以 el.x / el.y 是中心坐标，需要转换为左上角坐标。
 * - 可选地将 px 值转换为 rpx（用于小程序端渲染）。
 */

interface SerializedElement {
  id: string
  type: string
  text: string
  dataKey?: string
  /** 占位符标记/识别回填的原文默认值，随模板持久化（发布回填用） */
  defaults?: Record<string, string>
  label: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  rotation: number
  opacity: number
  editable: boolean
  /** PS 混合模式（multiply/screen/overlay 等） */
  blendMode?: string
  style?: Record<string, any>
}

interface SerializeOptions {
  /** 画布宽度（px），用于 px→rpx 转换。传入时启用 rpx 转换。 */
  canvasWidth?: number
}

/**
 * 序列化单个画布元素为服务端格式。
 */
export function serializeElement(el: any, options?: SerializeOptions): SerializedElement | null {
  const validTypes = ['text', 'image', 'sticker']
  if (!el || !validTypes.includes(el.type)) {
    return null
  }
  const topLeftX = el.x - (el.width || 0) / 2
  const topLeftY = el.y - (el.height || 0) / 2
  const pxToRpx = options?.canvasWidth ? 750 / options.canvasWidth : 1

  const base: any = {
    id: el.id,
    type: el.type === 'sticker' ? 'image' : el.type,
    text: el.content || el.text || el.src || '',
    dataKey: el.dataKey,
    defaults: el.defaults,
    label: el.label || el.name,
    x: Math.round(topLeftX * 100) / 100,
    y: Math.round(topLeftY * 100) / 100,
    width: Math.round((el.width || 0) * 100) / 100,
    height: Math.round((el.height || 0) * 100) / 100,
    zIndex: el.zIndex ?? 0,
    rotation: el.rotation ?? 0,
    opacity: el.opacity ?? 1,
    editable: el.editable !== false,
    blendMode: el.blendMode || undefined,
  }

  if (el.type === 'text') {
    const content = el.content || el.text || ''
    // RTL 字符检测正则（阿拉伯/哈萨克文等）
    const RTL_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
    const containsRtl = RTL_REGEX.test(content)
    // 检测 content 是否含哈语占位符：占位符本身是 ASCII，不会触发 RTL 检测，
    // 但替换后会变成哈语文本（RTL），需要预先标记为 RTL，保证小程序端替换后字体格式一致。
    // 哈语占位符清单与 src/utils/placeholders.ts resolveDatePlaceholders 对齐
    const KZ_PLACEHOLDER_RE = /\{(kzDate|kzWeekday|kzWeekdayParen|kzTime|kzGroomName|kzBrideName|kzGroomFullName|kzBrideFullName|kzFatherName|kzMotherName|kzWitnessName|kzGroomsmanName|kzBridesmaidName|kzChildName|kzInviter|kzInvitee|kzClockTime|kzLocation|kzPhone|kzAddress)\}/
    const containsKzPlaceholder = KZ_PLACEHOLDER_RE.test(content)
    const isRtl = containsRtl || containsKzPlaceholder
    // 解析 direction: 'auto'，根据内容自动判定
    // 修复死代码：原实现仅 `el.direction || 'ltr'` 未解析 auto
    const rawDirection = el.direction || 'auto'
    const direction = rawDirection === 'auto'
      ? (isRtl ? 'rtl' : 'ltr')
      : rawDirection
    // RTL 文本渲染字体栈：用户所选字体在前 + KazakhSoftAsilya 兜底。
    // 中文/拉丁部分用所选字体渲染，哈萨克字符回退哈萨克字体连写；
    // 不再强制替换用户选择（与 useCanvas.rtlRenderFontStack 一致）
    const fontFamily = direction === 'rtl'
      ? (el.fontFamily
        ? (el.fontFamily.includes('KazakhSoftAsilya') ? el.fontFamily : `${el.fontFamily}, 'KazakhSoftAsilya'`)
        : "'KazakhSoftAsilya'")
      : el.fontFamily
    // RTL 文本默认右对齐（仅当用户未显式设置时）
    const textAlign = el.textAlign || (direction === 'rtl' ? 'right' : 'center')
    const fontSize = el.fontSize != null ? Math.round(el.fontSize * pxToRpx) : undefined
    // RTL 文本字间距强制为 0（连写要求）
    const spacing = direction === 'rtl' ? 0 : Math.round((el.letterSpacing ?? 2) * pxToRpx)

    base.style = {
      font: fontFamily,
      color: el.color,
      fontSize: fontSize ?? 28,
      spacing,
      lineHeight: el.lineHeight ?? 1.5,
      fontWeight: el.fontWeight === 'bold' ? 'bold' : 'normal',
      fontStyle: el.fontStyle ?? 'normal',
      textAlign,
      direction,
      strokeColor: el.strokeColor || 'transparent',
      strokeWidth: Math.round((el.strokeWidth ?? 0) * pxToRpx),
      shadowColor: el.shadowColor || 'transparent',
      shadowOffsetX: Math.round((el.shadowOffsetX ?? 0) * pxToRpx),
      shadowOffsetY: Math.round((el.shadowOffsetY ?? 0) * pxToRpx),
      shadowBlur: Math.round((el.shadowBlur ?? 0) * pxToRpx),
      textDecoration: el.textDecoration || 'none',
      // 文字渐变填充（admin Fabric Text 支持，小程序 useCanvasRender 需读取并应用）
      gradientFill: el.gradientFill || undefined,
      gradientFillType: el.gradientFillType || undefined,
      gradientStart: el.gradientStart || undefined,
      gradientEnd: el.gradientEnd || undefined,
      gradientAngle: el.gradientAngle ?? undefined,
      // 长阴影特效
      longShadowEnabled: el.longShadowEnabled || false,
      longShadowColor: el.longShadowColor || undefined,
      longShadowLength: el.longShadowLength ?? undefined,
      longShadowAngle: el.longShadowAngle ?? undefined,
      // 霓虹发光特效
      neonGlowEnabled: el.neonGlowEnabled || false,
      neonGlowColor: el.neonGlowColor || undefined,
      neonGlowSize: el.neonGlowSize ?? undefined,
      neonGlowBlur: el.neonGlowBlur ?? undefined,
    }
    // 清理 undefined 值，避免序列化输出大量 undefined 字段
    if (base.style) {
      Object.keys(base.style).forEach(k => {
        if (base.style[k] === undefined) delete base.style[k]
      })
    }
  } else if (el.type === 'image') {
    base.src = el.src
    base.style = {
      font: '',
      color: '',
      spacing: 0,
      borderRadius: Math.round((el.borderRadius ?? 0) * pxToRpx),
      borderColor: el.borderColor || 'transparent',
      borderWidth: Math.round((el.borderWidth ?? 0) * pxToRpx),
      // 图片缩放与裁剪（小程序端 imageScale 需读取）
      scale: el.scale || 'cover',
      mask: el.mask || 'rect',
      // 图片滤镜（小程序端 useCanvasRender 需读取并应用）
      brightness: el.brightness ?? 100,
      contrast: el.contrast ?? 100,
      saturate: el.saturate ?? 100,
      blur: el.blur ?? 0,
      grayscale: el.grayscale ?? 0,
      // 图片偏移（小程序端 ImagePropertyPanel 缺失 UI，但数据需保留）
      imageOffsetX: el.imageOffsetX ?? 0,
      imageOffsetY: el.imageOffsetY ?? 0,
    } as any
  }

  return base
}
