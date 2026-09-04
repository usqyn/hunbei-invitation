/**
 * 图片压缩（上云前 / 存量迁移通用）
 *
 * 背景：模板里的婚礼照片被存成 PNG，单张可达 4.4MB。真机 <image> 对超大图
 *   - https 直连：依赖 downloadFile 白名单，且加载慢
 *   - downloadFile 转 wxfile：部分真机解码成功但像素不渲染
 *   - base64 data URL：超 ~2MB 必空白
 * 因此在源头把图片压到「视觉无损」的小体积是最可靠的优化。
 *
 * 策略（只在确实变小时才替换，绝不增大文件）：
 *   - JPEG：mozjpeg q88 重压缩（照片视觉无损，体积通常降 50%+）
 *   - PNG 且完全不透明（照片型）：转 JPEG q88（收益最大，实测 4.4MB→212KB / 95%）
 *   - PNG 带透明（贴纸/装饰/图形）：无损 deflate level9 重压缩（真·无损）
 *   - WebP：q90 重压缩
 *   - 小文件（< SKIP_BYTES）直接跳过，不浪费 CPU、不引入二次压缩
 *
 * sharp 为原生依赖，加载失败时降级为「原样返回」，绝不阻断上传。
 */
const fs = require('fs')

let _sharp = null
let _sharpTried = false
function getSharp() {
  if (_sharpTried) return _sharp
  _sharpTried = true
  try { _sharp = require('sharp') } catch (_) { _sharp = null }
  return _sharp
}

// 小于该体积不压缩（小图压缩收益 < 二次压缩/CPU 成本）
const SKIP_BYTES = 200 * 1024
// 只有压缩后体积 < 原体积 * RATIO 才采用（避免越压越大或微缩无意义）
const ADOPT_RATIO = 0.92
const JPEG_QUALITY = 88

/**
 * 压缩图片 Buffer
 * @param {Buffer} buf 原始文件内容
 * @param {string} cloudPath 目标云存储路径（可能被改扩展名，如 .png→.jpg）
 * @returns {Promise<{buffer: Buffer, cloudPath: string, changed: boolean, from?: string, to?: string, savedKB?: number}>}
 */
async function compressImageBuffer(buf, cloudPath) {
  const fallback = { buffer: buf, cloudPath, changed: false }
  if (!buf || !Buffer.isBuffer(buf) || buf.length < SKIP_BYTES) return fallback

  const sharp = getSharp()
  if (!sharp) return fallback

  let meta
  try {
    meta = await sharp(buf).metadata()
  } catch (_) {
    return fallback
  }
  if (!meta || !meta.format) return fallback
  const fmt = String(meta.format).toLowerCase()
  if (!['jpeg', 'jpg', 'png', 'webp'].includes(fmt)) return fallback

  /** @type {{buffer: Buffer, ext: string, label: string}[]} */
  const candidates = []

  try {
    if (fmt === 'png') {
      if (meta.isOpaque !== false) {
        // 全不透明照片型 PNG：转 JPEG 收益最大。显式 flatten 白底（isOpaque 时无实际影响）
        candidates.push({
          buffer: await sharp(buf).flatten({ background: '#ffffff' })
            .jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer(),
          ext: '.jpg', label: 'png(opaque)->jpg',
        })
      }
      // 带透明 PNG：无损重压缩（deflate level9，绝不丢像素/透明通道）
      candidates.push({
        buffer: await sharp(buf).png({ compressionLevel: 9, effort: 10 }).toBuffer(),
        ext: '.png', label: 'png-lossless',
      })
    } else if (fmt === 'webp') {
      candidates.push({
        buffer: await sharp(buf).webp({ quality: 90 }).toBuffer(),
        ext: '.webp', label: 'webp-q90',
      })
    } else {
      // jpeg/jpg：mozjpeg 视觉无损重压缩
      candidates.push({
        buffer: await sharp(buf).jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer(),
        ext: '.jpg', label: 'jpeg-mozjpeg',
      })
    }
  } catch (e) {
    console.warn('[compressImage] 压缩失败，使用原图:', cloudPath, e && e.message)
    return fallback
  }

  // 取「明显更小」的最优候选
  let best = null
  for (const c of candidates) {
    if (c.buffer.length < buf.length * ADOPT_RATIO && (!best || c.buffer.length < best.buffer.length)) {
      best = c
    }
  }
  if (!best) return fallback

  const outPath = replaceExt(cloudPath, best.ext)
  return {
    buffer: best.buffer,
    cloudPath: outPath,
    changed: true,
    from: fmt, to: best.ext.replace('.', ''),
    savedKB: Math.round((buf.length - best.buffer.length) / 1024),
  }
}

function replaceExt(p, ext) {
  const base = p.replace(/\.(jpe?g|png|webp)$/i, '')
  return base + ext
}

/** 便利方法：直接压缩本地文件并返回 Buffer（迁移脚本用） */
async function compressLocalFile(filePath, cloudPath) {
  const buf = fs.readFileSync(filePath)
  return compressImageBuffer(buf, cloudPath)
}

module.exports = { compressImageBuffer, compressLocalFile, getSharp }
