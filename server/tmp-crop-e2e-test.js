/* 端到端功能测试：图片裁剪 + 蒙版合成
 * 1. 构造"短视频截图"（含播放按钮/字幕/点赞按钮等多余 UI）
 * 2. 逐字节复现 ImageAdjuster.vue 的裁剪数学（cover + pan/pinch + clamp + sx/sy/sw/sh）
 * 3. 用 sharp 真实裁剪输出，像素断言：多余 UI 被剔除、人像保留
 * 4. 下载云端 123321 真实蒙版 PNG，复现 compositeImageWithMask（destination-in）
 * 5. 像素断言：圆角/异形形状保留、新照片内容在形状内
 */
const sharp = require('sharp')
const tcb = require('@cloudbase/node-sdk')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

let passed = 0
let failed = 0
function assert(cond, label) {
  if (cond) { passed++; console.log(`  ✅ ${label}`) }
  else { failed++; console.log(`  ❌ ${label}`) }
}

// ===== 复现 ImageAdjuster 的裁剪数学（与 src/pages/editor/components/ImageAdjuster.vue 一致）=====
function computeCrop({ imgW, imgH, viewW, viewH, userScale, offsetX, offsetY }) {
  const MIN_SCALE = 1, MAX_SCALE = 5
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, userScale))
  const coverScale = Math.max(viewW / imgW, viewH / imgH)
  const drawW = imgW * coverScale * scale
  const drawH = imgH * coverScale * scale
  // clampOffset
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
  // 防御性夹紧（renderCrop 同款）
  if (sx < 0) { sw += sx; sx = 0 }
  if (sy < 0) { sh += sy; sy = 0 }
  if (sx + sw > imgW) sw = imgW - sx
  if (sy + sh > imgH) sh = imgH - sy
  return { sx: Math.round(sx), sy: Math.round(sy), sw: Math.round(sw), sh: Math.round(sh), outW: Math.round(viewW * 3), outH: Math.round(viewH * 3) }
}

// 构造模拟截图 720x1280：灰底视频 + 绿色人像 + 红色播放按钮 + 蓝色字幕 + 黄色点赞栏
function makeScreenshot() {
  const svg = `<svg width="720" height="1280" xmlns="http://www.w3.org/2000/svg">
    <rect width="720" height="1280" fill="#3a3a3a"/>
    <ellipse cx="360" cy="640" rx="150" ry="260" fill="#2ecc40"/>
    <circle cx="360" cy="110" r="48" fill="#ff2020"/>
    <polygon points="345,85 345,135 390,110" fill="#ffffff"/>
    <rect x="60" y="1180" width="600" height="64" rx="8" fill="#2060ff"/>
    <rect x="636" y="480" width="52" height="240" rx="12" fill="#ffe600"/>
  </svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

// 统计颜色像素数
async function countColors(buf, w, h) {
  const { data } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const c = { red: 0, blue: 0, yellow: 0, green: 0, nonOpaque: 0 }
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
    if (a < 10) { c.nonOpaque++; continue }
    if (r > 200 && g < 90 && b < 90) c.red++
    else if (b > 180 && r < 90 && g < 120) c.blue++
    else if (r > 220 && g > 200 && b < 90) c.yellow++
    else if (g > 150 && r < 110 && b < 110) c.green++
  }
  return c
}

async function runCropTest(label, { userScale, offsetX, offsetY, expect }) {
  console.log(`\n[裁剪测试] ${label}`)
  const shot = await makeScreenshot()
  const crop = computeCrop({ imgW: 720, imgH: 1280, viewW: 300, viewH: 400, userScale, offsetX, offsetY })
  console.log('  裁剪源矩形 sx,sy,sw,sh =', crop.sx, crop.sy, crop.sw, crop.sh, '→ 输出', crop.outW + 'x' + crop.outH)
  const out = await sharp(shot)
    .extract({ left: crop.sx, top: crop.sy, width: crop.sw, height: crop.sh })
    .resize(crop.outW, crop.outH, { fit: 'fill' })
    .png().toBuffer()
  const meta = await sharp(out).metadata()
  assert(Math.abs(meta.width / meta.height - 3 / 4) < 0.02, `输出宽高比 = 3:4（实际 ${(meta.width / meta.height).toFixed(3)}）`)
  const c = await countColors(out, meta.width, meta.height)
  console.log('  像素统计:', JSON.stringify(c))
  if (expect.noRed) assert(c.red === 0, '红色播放按钮已被裁掉')
  if (expect.noBlue) assert(c.blue === 0, '蓝色字幕条已被裁掉')
  if (expect.noYellow) assert(c.yellow === 0, '黄色点赞栏已被裁掉')
  if (expect.green) assert(c.green > 1000, `绿色人像保留（${c.green} 像素）`)
}

async function main() {
  // ===== 测试 1：scale=1 居中（cover 垂直溢出）→ 顶部播放按钮/底部字幕应被裁掉 =====
  await runCropTest('scale=1 居中：播放按钮+字幕在裁剪框外', {
    userScale: 1, offsetX: 0, offsetY: 0,
    expect: { noRed: true, noBlue: true, green: true },
  })

  // ===== 测试 2：用户双指放大 scale=2 居中 → 右侧点赞栏也应被裁掉 =====
  await runCropTest('scale=2 放大：右侧点赞栏也在框外', {
    userScale: 2, offsetX: 0, offsetY: 0,
    expect: { noRed: true, noBlue: true, noYellow: true, green: true },
  })

  // ===== 测试 3：真实云端蒙版合成（123321 rounded 元素）=====
  console.log('\n[蒙版合成测试] 云端 123321 真实蒙版')
  const app = tcb.init({ env: 'cloud1-d4gyvmo1d9a1e148a', accessKey: process.env.CLOUDBASE_APIKEY, endpoint: 'https://cloud1-d4gyvmo1d9a1e148a.api.tcloudbasegateway.com' })
  const db = app.database()
  const list = (await db.collection('templates').where({ name: db.RegExp({ regexp: '123321', options: 'i' }) }).limit(5).get()).data
  const tpl = list[0]
  if (!tpl) { console.log('  ⚠️ 未找到 123321 模板，跳过'); }
  else {
    const imgEls = (tpl.elements || []).filter(e => e.type === 'image')
    console.log(`  模板 ${tpl.name} 图片元素 ${imgEls.length} 个`)
    // 找 rounded/alpha 且 fileID 为 cloud:// 的元素
    const targets = imgEls
      .map(e => ({ mask: e.mask || (e.style && e.style.mask), fileID: e.text, w: e.width, h: e.height }))
      .filter(x => (x.mask === 'rounded' || x.mask === 'alpha') && /^cloud:\/\//.test(x.fileID || ''))
    assert(targets.length > 0, `找到 ${targets.length} 个带形状蒙版的元素`)
    for (const t of targets.slice(0, 3)) {
      console.log(`  - mask=${t.mask} ${t.w}x${t.h} ${String(t.fileID).slice(0, 60)}...`)
      const r = await app.downloadFile({ fileID: t.fileID })
      const maskBuf = r.fileContent
      const mm = await sharp(maskBuf).metadata()
      // 模拟用户新照片：纯橙色，与蒙版同尺寸
      const photoBuf = await sharp({ create: { width: mm.width, height: mm.height, channels: 4, background: { r: 255, g: 140, b: 0, alpha: 1 } } }).png().toBuffer()
      // destination-in：照片 ∩ 蒙版 alpha（与 compositeImageWithMask 同款操作）
      const baked = await sharp(photoBuf)
        .composite([{ input: maskBuf, blend: 'dest-in' }])
        .png().toBuffer()
      const { data, info } = await sharp(baked).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      const px = (x, y) => { const i = (y * info.width + x) * 4; return [data[i], data[i + 1], data[i + 2], data[i + 3]] }
      const corner = px(2, 2)
      // 蒙版自身角点 alpha（对照基准）
      const { data: md, info: mi } = await sharp(maskBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      const maskCornerA = md[(2 * mi.width + 2) * 4 + 3]
      // 蒙版不透明像素数（形状覆盖面积）
      let maskOpaque = 0
      for (let i = 3; i < md.length; i += 4) if (md[i] > 200) maskOpaque++
      // 合成结果中：不透明像素数、其中是新照片橙色的像素数
      let bakedOpaque = 0, orangeOpaque = 0
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 200) {
          bakedOpaque++
          if (data[i] > 200 && data[i + 1] > 100 && data[i + 1] < 180 && data[i + 2] < 80) orangeOpaque++
        }
      }
      // rounded 类形状几何中心应为不透明（大矩形圆角）；alpha 细装饰条中心可能镂空，改用面积统计
      const isBigRounded = t.mask === 'rounded'
      const center = px(info.width >> 1, info.height >> 1)
      console.log(`    角点 RGBA=${corner.join(',')}（蒙版角点 alpha=${maskCornerA}）形状面积=${maskOpaque}px 中心 RGBA=${center.join(',')}`)
      assert(corner[3] === maskCornerA, `角点 alpha 与蒙版一致（${corner[3]} == ${maskCornerA}）——形状保留`)
      assert(maskOpaque > 50, `蒙版形状面积正常（${maskOpaque} 不透明像素）`)
      assert(bakedOpaque === maskOpaque, `合成后不透明像素数 = 蒙版形状面积（${bakedOpaque} == ${maskOpaque}）`)
      assert(orangeOpaque === bakedOpaque, `形状内像素全部来自新照片橙色（${orangeOpaque}/${bakedOpaque}）——新图填入形状`)
      if (isBigRounded) assert(center[3] > 200 && center[0] > 200, 'rounded 几何中心为新照片颜色且不透明')
    }
  }

  console.log(`\n========== 结果：${passed} 通过 / ${failed} 失败 ==========`)
  process.exit(failed ? 1 : 0)
}
main().catch(e => { console.error(e); process.exit(1) })
