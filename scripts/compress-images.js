/**
 * 压缩 static 中过大的 jpg 图片，减小主包体积
 * 用法: node scripts/compress-images.js
 */
const Jimp = require('jimp')
const path = require('path')
const fs = require('fs')

const TARGETS = [
  // banner 图片 - 压缩到质量 60%，宽 750px
  'src/static/images/banners/banner-1.jpg',
  'src/static/images/banners/banner-2.jpg',
  'src/static/images/banners/banner-3.jpg',
  // mall 图片 - 压缩到质量 65%，宽 600px
  'src/static/images/mall/banner1.jpg',
  'src/static/images/mall/banner2.jpg',
  'src/static/images/mall/banner3.jpg',
]

const BANNER_MAX_WIDTH = 750
const MALL_MAX_WIDTH = 600

async function compress(inputPath) {
  const fullPath = path.resolve(__dirname, '..', inputPath)
  const origSize = fs.statSync(fullPath).size

  const image = await Jimp.Jimp.read(fullPath)

  const isBanner = inputPath.includes('banners')
  const maxWidth = isBanner ? BANNER_MAX_WIDTH : MALL_MAX_WIDTH
  const quality = isBanner ? 60 : 65

  if (image.width > maxWidth) {
    image.resize({ w: maxWidth })
  }

  // jimp 1.x 用 getBuffer 控制 JPEG 质量
  const buf = await image.getBuffer('image/jpeg', { quality })
  const tempPath = fullPath + '.tmp'
  fs.writeFileSync(tempPath, buf)

  const newSize = fs.statSync(tempPath).size
  const saved = origSize - newSize
  const pct = ((saved / origSize) * 100).toFixed(1)

  // 只有当新文件确实更小时才替换
  if (newSize < origSize) {
    fs.renameSync(tempPath, fullPath)
    console.log(`  ${path.basename(inputPath)}: ${(origSize/1024).toFixed(0)}KB → ${(newSize/1024).toFixed(0)}KB (${pct}%)`)
  } else {
    fs.unlinkSync(tempPath)
    console.log(`  ${path.basename(inputPath)}: ${(origSize/1024).toFixed(0)}KB (已是最优)`)
  }
}

async function main() {
  console.log('压缩图片中...\n')
  let totalSaved = 0

  for (const file of TARGETS) {
    try {
      const fullPath = path.resolve(__dirname, '..', file)
      const origSize = fs.statSync(fullPath).size
      await compress(file)
      const newSize = fs.statSync(fullPath).size
      totalSaved += (origSize - newSize)
    } catch (err) {
      console.error(`  ${path.basename(file)}: 失败 - ${err.message}`)
    }
  }

  console.log(`\n总计节省: ${(totalSaved/1024).toFixed(0)} KB`)
}

main().catch(console.error)
