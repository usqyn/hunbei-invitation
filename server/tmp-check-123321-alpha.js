// 检查 123321 元素13 原图四角是否透明（烘焙圆角）+ 元素9 alpha 图
const tcb = require('@cloudbase/node-sdk')
const sharp = require('sharp')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
;(async () => {
  const app = tcb.init({ env: 'cloud1-d4gyvmo1d9a1e148a', accessKey: process.env.CLOUDBASE_APIKEY, endpoint: 'https://cloud1-d4gyvmo1d9a1e148a.api.tcloudbasegateway.com' })
  const db = app.database()
  const r = (await db.collection('templates').where({ _id: '62db221d-3023-4676-920c-309574de516c' }).limit(1).get()).data[0]
  for (const i of [13, 9]) {
    const el = r.elements[i]
    const dl = await app.downloadFile({ fileID: el.text })
    const img = sharp(dl.fileContent)
    const meta = await img.metadata()
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
    const px = (x, y) => {
      const idx = (y * info.width + x) * info.channels
      return info.channels === 4 ? data[idx + 3] : 255
    }
    console.log(`element[${i}] ${meta.width}x${meta.height} channels=${info.channels}`)
    console.log(`  四角alpha: TL=${px(0,0)} TR=${px(info.width-1,0)} BL=${px(0,info.height-1)} BR=${px(info.width-1,info.height-1)}`)
    console.log(`  中心alpha: ${px(Math.floor(info.width/2), Math.floor(info.height/2))}`)
    // 找出形状的实际边界：每行第一个/最后一个不透明像素
    let shapeTop = -1, shapeLeft = -1, shapeRight = -1, shapeBottom = -1
    for (let y = 0; y < info.height; y++) {
      let first = -1, last = -1
      for (let x = 0; x < info.width; x++) {
        if (px(x, y) > 128) { if (first < 0) first = x; last = x }
      }
      if (first >= 0) {
        if (shapeTop < 0) { shapeTop = y; shapeLeft = first; shapeRight = last }
        shapeBottom = y
      }
    }
    console.log(`  形状边界: top=${shapeTop} bottom=${shapeBottom} left=${shapeLeft} right=${shapeRight} (图 ${info.width}x${info.height})`)
    // 左上角轮廓：y 从 shapeTop 到 +60，每 4px 打印该行第一个不透明 x
    const profile = []
    for (let y = shapeTop; y < Math.min(shapeTop + 60, info.height); y += 4) {
      let first = -1
      for (let x = 0; x < info.width; x++) { if (px(x, y) > 128) { first = x; break } }
      profile.push(`y${y}:x${first}`)
    }
    console.log('  左上角轮廓: ' + profile.join(' '))
  }
})().catch(e => console.log('ERR', e.message))
