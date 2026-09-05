/* 生成可视化验证产物：模拟截图 → 裁剪结果 → 真实蒙版合成结果 */
const sharp = require('sharp')
const tcb = require('@cloudbase/node-sdk')
const path = require('path')
const fs = require('fs')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const OUT = path.join(__dirname, 'tmp-crop-out')
fs.mkdirSync(OUT, { recursive: true })

function computeCrop({ imgW, imgH, viewW, viewH, userScale, offsetX, offsetY }) {
  const scale = Math.min(5, Math.max(1, userScale))
  const coverScale = Math.max(viewW / imgW, viewH / imgH)
  const drawW = imgW * coverScale * scale
  const drawH = imgH * coverScale * scale
  const maxX = Math.max(0, (drawW - viewW) / 2)
  const maxY = Math.max(0, (drawH - viewH) / 2)
  const ox = Math.min(maxX, Math.max(-maxX, offsetX))
  const oy = Math.min(maxY, Math.max(-maxY, offsetY))
  const imgLeft = viewW / 2 + ox - drawW / 2
  const imgTop = viewH / 2 + oy - drawH / 2
  const k = imgW / drawW
  let sx = Math.max(0, -imgLeft) * k
  let sy = Math.max(0, -imgTop) * k
  let sw = viewW * k
  let sh = viewH * k
  if (sx < 0) { sw += sx; sx = 0 }
  if (sy < 0) { sh += sy; sy = 0 }
  if (sx + sw > imgW) sw = imgW - sx
  if (sy + sh > imgH) sh = imgH - sy
  return { sx: Math.round(sx), sy: Math.round(sy), sw: Math.round(sw), sh: Math.round(sh) }
}

async function main() {
  // 1. 模拟短视频截图 720x1280
  const svg = `<svg width="720" height="1280" xmlns="http://www.w3.org/2000/svg">
    <rect width="720" height="1280" fill="#3a3a3a"/>
    <ellipse cx="360" cy="640" rx="150" ry="260" fill="#2ecc40"/>
    <circle cx="360" cy="110" r="48" fill="#ff2020"/>
    <polygon points="345,85 345,135 390,110" fill="#ffffff"/>
    <rect x="60" y="1180" width="600" height="64" rx="8" fill="#2060ff"/>
    <rect x="636" y="480" width="52" height="240" rx="12" fill="#ffe600"/>
    <text x="360" y="1222" font-size="36" fill="#fff" text-anchor="middle" font-family="sans-serif">SUBTITLE 字幕</text>
  </svg>`
  const shot = await sharp(Buffer.from(svg)).png().toBuffer()
  fs.writeFileSync(path.join(OUT, '1-input-screenshot.png'), shot)

  // 2. 裁剪（scale=2 放大居中，3:4 窗口）
  const c = computeCrop({ imgW: 720, imgH: 1280, viewW: 300, viewH: 400, userScale: 2, offsetX: 0, offsetY: 0 })
  const cropped = await sharp(shot)
    .extract({ left: c.sx, top: c.sy, width: c.sw, height: c.sh })
    .resize(900, 1200, { fit: 'fill' })
    .jpeg({ quality: 92 }).toBuffer()
  fs.writeFileSync(path.join(OUT, '2-cropped.jpg'), cropped)

  // 3. 下载 123321 真实 rounded 蒙版，把"裁剪后的照片"按 cover 填入并 destination-in 合成
  const app = tcb.init({ env: 'cloud1-d4gyvmo1d9a1e148a', accessKey: process.env.CLOUDBASE_APIKEY, endpoint: 'https://cloud1-d4gyvmo1d9a1e148a.api.tcloudbasegateway.com' })
  const db = app.database()
  const list = (await db.collection('templates').where({ name: db.RegExp({ regexp: '123321', options: 'i' }) }).limit(5).get()).data
  const el = list[0].elements.find(e => e.type === 'image' && (e.mask === 'rounded' || e.style?.mask === 'rounded'))
  const r = await app.downloadFile({ fileID: el.text })
  fs.writeFileSync(path.join(OUT, '3-mask-original.png'), r.fileContent)
  const mm = await sharp(r.fileContent).metadata()
  // 复现 compositeImageWithMask：画布=蒙版尺寸，新图 cover 填充，destination-in
  const photo = await sharp(cropped).resize(mm.width, mm.height, { fit: 'cover' }).png().toBuffer()
  const baked = await sharp(photo).composite([{ input: r.fileContent, blend: 'dest-in' }]).png().toBuffer()
  fs.writeFileSync(path.join(OUT, '4-baked-final.png'), baked)

  console.log('产物已生成到', OUT)
  for (const f of fs.readdirSync(OUT)) console.log(' -', f, (fs.statSync(path.join(OUT, f)).size / 1024).toFixed(1) + 'KB')
}
main().catch(e => { console.error(e); process.exit(1) })
