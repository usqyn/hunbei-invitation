/**
 * 一次性脚本：把 server/uploads/fonts 下的全部字体（按 font-map.json）同步到微信云。
 *
 * - 字体文件上传到云存储 uploads/fonts/<字体名><ext>（稳定路径，重复执行覆盖）
 * - 云数据库 settings.font_map（_id: font_map）合并写入 {字体名: cloud://fileID}
 * - 小程序云函数模式 GET /api/fonts 读取该映射，换取临时 https URL 供 wx.loadFontFace
 *
 * 用法：在 server/ 目录执行  node sync-fonts-to-cloud.js
 * 依赖 server/.env 中的 CLOUDBASE_APIKEY。
 */

require('dotenv').config()
const path = require('path')
const fs = require('fs')
const cloudSync = require('./cloudSync')

const FONTS_DIR = path.join(__dirname, 'uploads', 'fonts')
const MAP_PATH = path.join(FONTS_DIR, 'font-map.json')

async function main() {
  if (!cloudSync.isEnabled()) {
    console.error('❌ 云同步未启用：请在 server/.env 配置 CLOUDBASE_APIKEY')
    process.exit(1)
  }
  if (!fs.existsSync(MAP_PATH)) {
    console.error(`❌ 找不到字体映射表: ${MAP_PATH}`)
    process.exit(1)
  }

  const fontMap = JSON.parse(fs.readFileSync(MAP_PATH, 'utf-8'))
  const entries = Object.entries(fontMap)
  console.log(`===== 开始同步 ${entries.length} 个字体到云 =====`)

  let okCount = 0
  const failed = []
  for (const [name, url] of entries) {
    // font-map.json 的 value 形如 /uploads/fonts/xxx.ttf（兼容绝对 http URL）
    const rel = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\/?uploads\//, '')
    const localPath = path.join(__dirname, 'uploads', rel)
    const ok = await cloudSync.syncFontToCloud(name, localPath)
    if (ok) okCount++
    else failed.push(name)
  }

  console.log('===== 同步完成 =====')
  console.log(`✅ 成功: ${okCount}/${entries.length}`)
  if (failed.length) {
    console.log(`❌ 失败: ${failed.join('、')}`)
    process.exit(2)
  }
}

main().catch(e => {
  console.error('同步异常:', e)
  process.exit(1)
})
