// ============ migrate-assets.js：静态资源→云存储迁移脚本 ============
// 把本地 server/uploads/ 全部文件迁移到云存储。
//
// 用法：
//   1. 安装依赖：在 cloudfunctions/ 目录下执行
//      npm install wx-server-sdk
//   2. 配置环境变量（云开发环境 ID）
//      export TCB_ENV_ID=cloud1-d1g9id3fjffcefe0d
//   3. 执行迁移：
//      node migrate-assets.js
//
// 要点：
// - 遍历 server/uploads/fonts / server/uploads/music / server/uploads/poster/templates
//   / server/uploads/poster/stickers / server/uploads/poster/works / server/uploads/*.png|jpg|jpeg 等
// - 每个文件用 cloud.uploadFile 上传，cloudPath 保持相对路径：
//   uploads/fonts/xxx.otf、uploads/poster/templates/wedding_1.jpg 等
// - 上传成功后用 cloud.getTempFileURL 获取 https URL
// - 把 font-map.json 中的 url 全部替换为云存储 URL，写入云数据库 settings.font_map
// - 把 poster_templates / poster_works 表中所有 url 字段更新为云存储 URL（数据库批量更新）
// - 输出 manifest.json 记录「原路径 → cloud://fileID → https URL」映射
//
// 注意：沙箱无云环境授权，本脚本无法在沙箱运行；请在本地或 CI 环境执行。

const path = require('path')
const fs = require('fs')
let cloud
try { cloud = require('wx-server-sdk') } catch (e) {
  console.error('❌ 缺少依赖 wx-server-sdk，请先执行：npm install wx-server-sdk')
  process.exit(1)
}

// ============ 配置 ============
const ENV_ID = process.env.TCB_ENV_ID || 'cloud1-d1g9id3fjffcefe0d'
const SERVER_DIR = path.resolve(__dirname, '..', 'server')
const UPLOADS_DIR = path.join(SERVER_DIR, 'uploads')
const MANIFEST_PATH = path.join(__dirname, 'manifest.json')

// 支持的文件扩展名
const SUPPORTED_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
  '.mp3', '.wav', '.ogg', '.aac', '.ttf', '.otf', '.woff', '.woff2']

// MIME 类型映射
const MIME_MAP = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.aac': 'audio/aac',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2',
}

// ============ 递归遍历目录，返回所有文件相对路径 ============
const walkDir = (dir, baseDir = dir) => {
  const results = []
  if (!fs.existsSync(dir)) return results
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, baseDir))
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase()
      if (SUPPORTED_EXTS.includes(ext)) {
        // 相对路径（相对于 server/uploads），用作 cloudPath
        const relPath = path.relative(baseDir, fullPath).split(path.sep).join('/')
        results.push({ fullPath, cloudPath: `uploads/${relPath}`, ext })
      }
    }
  }
  return results
}

// ============ 上传单个文件 ============
const uploadFile = async (filePath, cloudPath, ext) => {
  const buffer = fs.readFileSync(filePath)
  const contentType = MIME_MAP[ext]
  const res = await cloud.uploadFile({
    cloudPath,
    fileContent: buffer,
    contentType: contentType || undefined,
  })
  return res.fileID
}

// 获取临时 https URL（云存储临时链接）
const getTempUrl = async (fileID) => {
  const res = await cloud.getTempFileURL({ fileList: [fileID] })
  if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
    return res.fileList[0].tempFileURL
  }
  return ''
}

// ============ 处理 font-map.json ============
// 把本地 url 替换为云存储 URL，写入云数据库 settings.font_map
const migrateFontMap = async (manifest, db) => {
  const fontMapPath = path.join(UPLOADS_DIR, 'fonts', 'font-map.json')
  if (!fs.existsSync(fontMapPath)) {
    console.log('  ℹ️  font-map.json 不存在，跳过')
    return
  }
  let fontMap = JSON.parse(fs.readFileSync(fontMapPath, 'utf-8'))
  // 用 manifest 中的映射替换本地 url
  const uploadsPrefix = 'uploads/'
  Object.keys(fontMap).forEach(name => {
    const url = fontMap[name]
    if (typeof url !== 'string') return
    // 若是本地路径（/uploads/xxx 或 uploads/xxx），找到对应 manifest 记录
    let relPath = url
    if (relPath.startsWith('/uploads/')) relPath = relPath.slice(1)
    else if (relPath.startsWith('uploads/')) { /* 已是相对路径 */ }
    else return  // 已是 https URL，跳过
    // 找到 manifest 中 cloudPath 匹配的记录
    const record = manifest.find(m => m.cloudPath === relPath)
    if (record) {
      fontMap[name] = record.httpsUrl || record.fileID
      console.log(`  字体 ${name}: ${url} → ${fontMap[name]}`)
    }
  })
  // 写入云数据库 settings.font_map（upsert）
  try {
    await db.collection('settings').doc('font_map').update({ data: { value: fontMap } })
  } catch (_) {
    await db.collection('settings').add({ data: { _id: 'font_map', value: fontMap } })
  }
  console.log(`  ✅ font_map 已写入云数据库 settings 集合（共 ${Object.keys(fontMap).length} 个字体）`)
}

// ============ 更新贴纸列表到 settings.poster_stickers ============
const migrateStickers = async (manifest, db) => {
  // 从 manifest 中筛选 uploads/poster/stickers/ 的记录
  const stickers = manifest
    .filter(m => m.cloudPath.startsWith('uploads/poster/stickers/'))
    .map(m => ({
      id: path.basename(m.cloudPath, path.extname(m.cloudPath)),
      name: path.basename(m.cloudPath, path.extname(m.cloudPath)),
      url: m.httpsUrl || m.fileID,
      cloudFileID: m.fileID,
    }))
  if (stickers.length === 0) {
    console.log('  ℹ️  未找到贴纸文件，跳过')
    return
  }
  try {
    await db.collection('settings').doc('poster_stickers').update({ data: { value: stickers } })
  } catch (_) {
    await db.collection('settings').add({ data: { _id: 'poster_stickers', value: stickers } })
  }
  console.log(`  ✅ 贴纸列表已写入 settings.poster_stickers（共 ${stickers.length} 个）`)
}

// ============ 更新数据库中的 url 字段 ============
// 把 poster_templates / poster_works 表中所有 url 字段更新为云存储 URL
const updateDatabaseUrls = async (manifest, db) => {
  // 构建「本地路径 → https URL」映射
  const urlMap = {}
  manifest.forEach(m => {
    // 本地路径形如 /uploads/poster/templates/wedding_1.jpg
    const localPath = '/' + m.cloudPath
    urlMap[localPath] = m.httpsUrl || m.fileID
  })

  // 更新 poster_templates 的 cover_url 和 background_url
  const templates = await db.collection('poster_templates').limit(1000).get()
  let updatedTpls = 0
  for (const t of (templates.data || [])) {
    const fields = {}
    if (t.cover_url && urlMap[t.cover_url]) fields.cover_url = urlMap[t.cover_url]
    if (t.background_url && urlMap[t.background_url]) fields.background_url = urlMap[t.background_url]
    if (Object.keys(fields).length > 0) {
      await db.collection('poster_templates').where({ id: t.id }).update({ data: fields })
      updatedTpls++
    }
  }
  console.log(`  ✅ poster_templates: 更新 ${updatedTpls} 条 url 字段`)

  // 更新 poster_works 的 cover_url 和 poster_url
  const works = await db.collection('poster_works').limit(1000).get()
  let updatedWorks = 0
  for (const w of (works.data || [])) {
    const fields = {}
    if (w.cover_url && urlMap[w.cover_url]) fields.cover_url = urlMap[w.cover_url]
    if (w.poster_url && urlMap[w.poster_url]) fields.poster_url = urlMap[w.poster_url]
    if (Object.keys(fields).length > 0) {
      await db.collection('poster_works').where({ id: w.id }).update({ data: fields })
      updatedWorks++
    }
  }
  console.log(`  ✅ poster_works: 更新 ${updatedWorks} 条 url 字段`)
}

// ============ 主流程 ============
const main = async () => {
  console.log('🚀 开始静态资源 → 云存储迁移')
  console.log(`   云环境 ID: ${ENV_ID}`)
  console.log(`   上传目录: ${UPLOADS_DIR}`)

  if (!fs.existsSync(UPLOADS_DIR)) {
    console.error(`❌ 上传目录不存在: ${UPLOADS_DIR}`)
    process.exit(1)
  }

  cloud.init({ env: ENV_ID })
  const db = cloud.database()

  // 遍历所有文件
  const files = walkDir(UPLOADS_DIR)
  console.log(`\n📦 发现 ${files.length} 个文件待迁移`)

  const manifest = []
  let success = 0
  let failed = 0

  for (let i = 0; i < files.length; i++) {
    const { fullPath, cloudPath, ext } = files[i]
    process.stdout.write(`  [${i + 1}/${files.length}] ${cloudPath} ... `)
    try {
      const fileID = await uploadFile(fullPath, cloudPath, ext)
      const httpsUrl = await getTempUrl(fileID)
      manifest.push({ localPath: fullPath, cloudPath, fileID, httpsUrl })
      success++
      console.log('✅')
    } catch (e) {
      console.log(`❌ ${e.errMsg || e.message}`)
      manifest.push({ localPath: fullPath, cloudPath, error: e.errMsg || e.message })
      failed++
    }
  }

  // 写 manifest.json
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
  console.log(`\n📝 manifest.json 已生成: ${MANIFEST_PATH}`)

  // 处理 font-map.json
  console.log('\n========== 处理 font-map ==========')
  await migrateFontMap(manifest, db)

  // 处理贴纸列表
  console.log('\n========== 处理贴纸 ==========')
  await migrateStickers(manifest, db)

  // 更新数据库中的 url 字段
  console.log('\n========== 更新数据库 URL ==========')
  await updateDatabaseUrls(manifest, db)

  // 输出统计
  console.log('\n========== 迁移统计 ==========')
  console.log(`  总文件数: ${files.length}`)
  console.log(`  ✅ 成功: ${success}`)
  console.log(`  ❌ 失败: ${failed}`)
  console.log(`  📝 manifest: ${MANIFEST_PATH}`)
  console.log('\n🎉 静态资源迁移完成')
}

main().catch(e => {
  console.error('迁移失败:', e)
  process.exit(1)
})
