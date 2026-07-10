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
  label: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  rotation: number
  opacity: number
  editable: boolean
  style?: Record<string, any>
}

interface SerializeOptions {
  /** 画布宽度（px），用于 px→rpx 转换。传入时启用 rpx 转换。 */
  canvasWidth?: number
}

/**
 * 序列化单个画布元素为服务端格式。
 */
export function serializeElement(el: any, options?: SerializeOptions): SerializedElement {
  const topLeftX = el.x - (el.width || 0) / 2
  const topLeftY = el.y - (el.height || 0) / 2
  const pxToRpx = options?.canvasWidth ? 750 / options.canvasWidth : 1

  const base: any = {
    id: el.id,
    type: el.type === 'sticker' ? 'image' : el.type,
    text: el.content || el.text || el.src || '',
    dataKey: el.dataKey,
    label: el.label || el.name,
    x: Math.round(topLeftX * 100) / 100,
    y: Math.round(topLeftY * 100) / 100,
    width: Math.round((el.width || 0) * 100) / 100,
    height: Math.round((el.height || 0) * 100) / 100,
    zIndex: el.zIndex ?? 0,
    rotation: el.rotation ?? 0,
    opacity: el.opacity ?? 1,
    editable: el.editable !== false,
  }

  if (el.type === 'text') {
    const content = el.content || el.text || ''
    const rtlChars = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
    const detectedDirection = rtlChars.test(content) ? 'rtl' : 'ltr'
    const direction = el.direction === 'auto' ? detectedDirection : (el.direction || 'ltr')
    const textAlign = el.textAlign || (direction === 'rtl' ? 'right' : 'center')
    const fontSize = el.fontSize != null ? Math.round(el.fontSize * pxToRpx) : undefined

    base.style = {
      font: el.fontFamily,
      color: el.color,
      fontSize: fontSize ?? 28,
      spacing: Math.round((el.letterSpacing ?? 2) * pxToRpx),
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
    }
  } else if (el.type === 'image') {
    base.style = {
      font: '',
      color: '',
      spacing: 0,
      borderRadius: Math.round((el.borderRadius ?? 0) * pxToRpx),
      borderColor: el.borderColor || 'transparent',
      borderWidth: Math.round((el.borderWidth ?? 0) * pxToRpx),
    } as any
  }

  return base
}
