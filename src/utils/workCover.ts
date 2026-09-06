/**
 * 作品封面绘制器：把当前编辑作品（canvas 模式）用 canvas 2d 绘制成一张图片，
 * 用作分享页默认封面（用户编辑后的请柬画面，而非模板原始封面）。
 *
 * 几何与 useCanvasRender 的 DOM 渲染保持一致：元素 x/y/width/height 为 canvas px
 * （基准 canvasSize，通常宽 750）；rpx 样式按 width/750 换算。
 * 仅支持 canvas 模式（page/flip 模式回退模板封面）。
 */
import { downloadToTemp } from './imageFilter'

interface DrawElement {
  type?: string
  text?: string
  x?: number
  y?: number
  width?: number
  height?: number
  zIndex?: number
  rotation?: number
  opacity?: number
  imageScale?: number
  imageOffsetX?: number
  image_offset_x?: number
  imageOffsetY?: number
  image_offset_y?: number
  borderRadius?: number
  mask?: string
  maskSrc?: string
  style?: any
}

interface DrawBackground {
  type?: string
  color1?: string
  color2?: string
  angle?: number
  image?: string
  imageUrl?: string
  imageOpacity?: number
  imageScale?: string
}

function loadCanvasImage(canvas: any, src: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const img = canvas.createImage ? canvas.createImage() : new Image()
    img.onload = () => resolve(img)
    img.onerror = (e: any) => reject(e || new Error('image load fail'))
    img.src = src
  })
}

/** cover 绘制（背景图默认 aspectFill） */
function drawCover(ctx: any, img: any, x: number, y: number, w: number, h: number) {
  const iw = img.width || 1
  const ih = img.height || 1
  const s = Math.max(w / iw, h / ih)
  const dw = iw * s
  const dh = ih * s
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

/** contain 绘制（aspectFit） */
function drawContain(ctx: any, img: any, x: number, y: number, w: number, h: number) {
  const iw = img.width || 1
  const ih = img.height || 1
  const s = Math.min(w / iw, h / ih)
  const dw = iw * s
  const dh = ih * s
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

function roundedRectPath(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

async function drawBackground(ctx: any, bg: DrawBackground | undefined, W: number, H: number, canvas: any) {
  if (!bg) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)
    return
  }
  // 底色 / 渐变
  if (bg.type === 'linear-gradient' && bg.color1) {
    const angle = ((bg.angle ?? 135) * Math.PI) / 180
    const cx = W / 2
    const cy = H / 2
    const len = Math.abs(Math.sin(angle)) * W / 2 + Math.abs(Math.cos(angle)) * H / 2
    const g = ctx.createLinearGradient(
      cx - Math.cos(angle) * len,
      cy - Math.sin(angle) * len,
      cx + Math.cos(angle) * len,
      cy + Math.sin(angle) * len,
    )
    g.addColorStop(0, bg.color1)
    g.addColorStop(1, bg.color2 || bg.color1)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  } else if (bg.type === 'radial-gradient' && bg.color1) {
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) / 1.4)
    g.addColorStop(0, bg.color1)
    g.addColorStop(1, bg.color2 || bg.color1)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  } else {
    ctx.fillStyle = bg.color1 || '#ffffff'
    ctx.fillRect(0, 0, W, H)
  }
  // 图片背景
  const bgUrl = bg.image || bg.imageUrl
  if (bg.type === 'image' && bgUrl) {
    try {
      const local = await downloadToTemp(bgUrl)
      const img = await loadCanvasImage(canvas, local)
      ctx.save()
      ctx.globalAlpha = typeof bg.imageOpacity === 'number' ? bg.imageOpacity : 1
      if (bg.imageScale === 'contain' || bg.imageScale === 'aspectFit') {
        drawContain(ctx, img, 0, 0, W, H)
      } else {
        drawCover(ctx, img, 0, 0, W, H)
      }
      ctx.restore()
    } catch (e) {
      console.warn('[work-cover] 背景图绘制失败:', e)
    }
  }
}

async function drawImageElement(ctx: any, el: DrawElement, canvas: any, rpx: number) {
  if (!el.text || el.x == null || el.y == null || el.width == null || el.height == null) return
  const x = el.x
  const y = el.y
  const w = el.width
  const h = el.height
  let img: any
  try {
    const local = await downloadToTemp(el.text)
    img = await loadCanvasImage(canvas, local)
  } catch (e) {
    console.warn('[work-cover] 图片下载失败，跳过:', String(el.text).slice(0, 60), e)
    return
  }

  ctx.save()
  if (el.opacity != null) ctx.globalAlpha = el.opacity
  // 旋转：绕元素中心
  if (el.rotation) {
    ctx.translate(x + w / 2, y + h / 2)
    ctx.rotate((el.rotation * Math.PI) / 180)
    ctx.translate(-(x + w / 2), -(y + h / 2))
  }

  // 裁剪形状：circle / rounded / alpha
  const mask = el.mask ?? el.style?.mask
  let alphaMaskImg: any = null
  if (mask === 'circle') {
    ctx.beginPath()
    ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2)
    ctx.clip()
  } else if (mask === 'rounded') {
    const br = (el.borderRadius ?? el.style?.borderRadius ?? 0)
    roundedRectPath(ctx, x, y, w, h, br)
    ctx.clip()
  } else if (mask === 'alpha' && el.maskSrc) {
    // 形状烘焙在 maskSrc 的 alpha 通道：先正常画图，再 destination-in 叠蒙版
    try {
      const maskLocal = await downloadToTemp(el.maskSrc)
      alphaMaskImg = await loadCanvasImage(canvas, maskLocal)
    } catch (e) {
      console.warn('[work-cover] 蒙版下载失败，按矩形绘制:', e)
    }
  } else {
    const br = el.borderRadius ?? el.style?.borderRadius
    if (br) {
      roundedRectPath(ctx, x, y, w, h, br)
      ctx.clip()
    }
  }

  // 图片填充：默认 scaleToFill（拉伸满框，admin 框比例即图比例），
  // contain 时 aspectFit；用户双指缩放/位移 imageScale/imageOffset 在其上叠加
  const mode = el.style?.scale
  const userScale = el.imageScale ?? 1
  const offX = el.imageOffsetX ?? el.image_offset_x ?? 0
  const offY = el.imageOffsetY ?? el.image_offset_y ?? 0
  let dw = w
  let dh = h
  if (mode === 'contain') {
    const iw = img.width || 1
    const ih = img.height || 1
    const s = Math.min(w / iw, h / ih)
    dw = iw * s
    dh = ih * s
  }
  dw *= userScale
  dh *= userScale
  const dx = x + (w - dw) / 2 + offX
  const dy = y + (h - dh) / 2 + offY
  ctx.drawImage(img, dx, dy, dw, dh)

  // alpha 蒙版：destination-in 叠形状（contain 居中于元素框）
  if (alphaMaskImg) {
    ctx.globalCompositeOperation = 'destination-in'
    const mw = alphaMaskImg.width || 1
    const mh = alphaMaskImg.height || 1
    const ms = Math.min(w / mw, h / mh)
    const mdw = mw * ms
    const mdh = mh * ms
    ctx.drawImage(alphaMaskImg, x + (w - mdw) / 2, y + (h - mdh) / 2, mdw, mdh)
    ctx.globalCompositeOperation = 'source-over'
  }
  ctx.restore()
}

function drawTextElement(ctx: any, el: DrawElement, W: number) {
  const st = el.style || {}
  const text = el.text || ''
  if (!text || el.x == null || el.y == null) return
  const rpx = W / 750
  const fontSize = (st.fontSize || 28) * rpx
  const lineHeight = st.lineHeight || 1.4
  const fontWeight = st.fontWeight || '400'
  const fontStyle = st.fontStyle === 'italic' ? 'italic' : 'normal'
  const fontFamily = st.font
    ? `"${st.font}", "PingFang SC", "Microsoft YaHei", sans-serif`
    : '"PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.save()
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`
  ctx.fillStyle = st.color || '#333333'
  ctx.textBaseline = 'middle'

  // 对齐 / 方向
  const isRtl = /[\u0600-\u06FF\u0750-\u077F]/.test(text)
  const align = st.textAlign || (isRtl ? 'right' : 'center')
  ctx.textAlign = align as CanvasTextAlign
  let tx = el.x + (el.width || 0) / 2
  if (align === 'left') tx = el.x
  if (align === 'right') tx = el.x + (el.width || 0)

  // 字间距（微信 canvas 2d 支持 letterSpacing，best-effort）
  try {
    if (!isRtl && st.spacing) (ctx as any).letterSpacing = `${st.spacing * rpx}px`
  } catch { /* 旧基础库无此属性 */ }

  // 水平缩放（PS horizontalScale）
  const hs = st.horizontalScale
  if (hs && hs !== 1) {
    ctx.translate(tx, el.y)
    ctx.scale(hs, 1)
    tx = 0
  }

  if (el.opacity != null) ctx.globalAlpha = el.opacity
  if (el.rotation) {
    const cx = el.x + (el.width || 0) / 2
    const cy = el.y + (el.height || 0) / 2
    if (hs && hs !== 1) {
      // 已 translate 到 (tx, el.y)，旋转中心需换算
      ctx.translate(-(tx), -(el.y))
    }
    ctx.translate(cx, cy)
    ctx.rotate((el.rotation * Math.PI) / 180)
    ctx.translate(-cx, -cy)
    if (hs && hs !== 1) {
      ctx.translate(tx, el.y)
      tx = 0
    }
  }

  // 逐行绘制（按 \n 分段，与 DOM 一致不做自动折行）
  const lines = text.split('\n')
  const lineGap = fontSize * lineHeight
  const startY = el.y + lineGap / 2
  lines.forEach((line, i) => {
    ctx.fillText(line, tx, startY + i * lineGap)
  })
  try { (ctx as any).letterSpacing = '0px' } catch { /* ignore */ }
  ctx.restore()
}

/**
 * 绘制作品封面并导出临时图片路径。
 * @returns tempFilePath；失败时 reject，调用方回退模板封面
 */
export function drawWorkCover(
  canvas: any,
  options: {
    width: number
    height: number
    background?: DrawBackground
    elements: DrawElement[]
    dpr?: number
  },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const W = options.width || 750
    const H = options.height || 1334
    const dpr = options.dpr || 2
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    ;(async () => {
      await drawBackground(ctx, options.background, W, H, canvas)
      const els = (options.elements || [])
        .filter((el) => el.x != null && el.y != null)
        .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
      for (const el of els) {
        try {
          if (el.type === 'image') {
            await drawImageElement(ctx, el, canvas, W / 750)
          } else if (el.type === 'text') {
            drawTextElement(ctx, el, W)
          }
        } catch (e) {
          console.warn('[work-cover] 元素绘制失败，跳过:', e)
        }
      }
      uni.canvasToTempFilePath({
        canvas,
        fileType: 'jpg',
        quality: 0.92,
        success: (res: any) => resolve(res.tempFilePath),
        fail: (err: any) => reject(err),
      } as any)
    })().catch(reject)
  })
}
