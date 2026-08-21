/**
 * 上传字体到微信云存储
 * 用法: node scripts/upload-fonts.js
 */
const tcb = require('@cloudbase/node-sdk')
const fs = require('fs')
const path = require('path')

const ENV_ID = 'cloud1-d4gyvmo1d9a1e148a'

// 从 server/.env 读取 API Key
let API_KEY = process.env.CLOUDBASE_APIKEY
if (!API_KEY) {
  try {
    const envPath = path.join(__dirname, '../server/.env')
    const envContent = fs.readFileSync(envPath, 'utf-8')
    const match = envContent.match(/^CLOUDBASE_APIKEY=(.+)$/m)
    if (match) API_KEY = match[1].trim()
  } catch (_) {}
}

if (!API_KEY) {
  console.error('❌ CLOUDBASE_APIKEY 未配置')
  process.exit(1)
}

const app = tcb.init({
  env: ENV_ID,
  accessKey: API_KEY,
  endpoint: `https://${ENV_ID}.api.tcloudbasegateway.com`,
})
const db = app.database()

const FONTS_DIR = path.join(__dirname, '../admin/public/fonts')
const FONT_FILES = ['KazakhSoftAsilya.ttf', 'KazakhSoftAsilyaQaniq.ttf', 'AlimamaFangYuanTiVF.ttf']

async function main() {
  console.log('📤 开始上传字体到云存储...\n')

  // 读取现有 font_map
  let fontMap = {}
  try {
    const res = await db.collection('settings').doc('font_map').get()
    fontMap = (res.data && res.data.value) || {}
    if (typeof fontMap === 'string') fontMap = JSON.parse(fontMap)
    console.log('📖 已读取现有 font_map:', Object.keys(fontMap).join(', ') || '(空)')
  } catch (e) {
    console.log('📖 font_map 不存在，将创建新的')
  }

  for (const filename of FONT_FILES) {
    const fontName = filename.replace(/\.[^.]+$/, '')
    const filePath = path.join(FONTS_DIR, filename)

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  文件不存在: ${filePath}`)
      continue
    }

    const fileBuffer = fs.readFileSync(filePath)
    const cloudPath = `uploads/fonts/${fontName}.ttf`

    console.log(`\n📎 上传 ${filename} (${(fileBuffer.length / 1024).toFixed(1)} KB)...`)

    try {
      const uploadRes = await app.uploadFile({
        cloudPath,
        fileContent: fileBuffer,
      })

      if (uploadRes && uploadRes.fileID) {
        fontMap[fontName] = uploadRes.fileID
        console.log(`✅ ${fontName} -> ${uploadRes.fileID}`)
      }
    } catch (e) {
      console.error(`❌ ${fontName} 上传失败:`, e.message)
    }
  }

  // 写回 font_map
  try {
    await db.collection('settings').doc('font_map').update({ data: { value: fontMap } })
    console.log('\n✅ font_map 已更新')
  } catch (_) {
    await db.collection('settings').add({ data: { _id: 'font_map', value: fontMap } })
    console.log('\n✅ font_map 已创建')
  }

  console.log('\n🎉 完成! 当前 font_map:', JSON.stringify(fontMap, null, 2))
}

main().catch(e => {
  console.error('❌ 执行失败:', e.message)
  process.exit(1)
})
