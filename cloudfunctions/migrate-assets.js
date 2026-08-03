// ============ migrate-assets.js：静态资源→云存储迁移脚本 ============
// 把本地 server/uploads/ 全部文件迁移到云存储。
//
// 用法：
//   1. 安装依赖：在 cloudfunctions/ 目录下执行
//      npm install wx-server-sdk
//   2. 配置环境变量（云开发环境 ID）
//      export TCB_ENV_ID=cloud1-d4gyvmo1d9a1e148a
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
const ENV_ID = process.env.TCB_ENV_ID || 'cloud1-d4gyvmo1d9a1e148a'
const SERVER_DIR = path.resolve(__dirname, '..', 'server')
const UPLOADS_DIR = path.join(SERVER_DIR, 'uploads')
const MUSIC_DIR = path.join(SERVER_DIR, 'music')
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

// ============ URL 归一化 ============
// 把各种形态的本地 URL 归一化为 /uploads/xxx 形式，用于 urlMap 匹配
// 支持：
//   /uploads/xxx          → /uploads/xxx
//   uploads/xxx           → /uploads/xxx
//   http://host/uploads/xxx  → /uploads/xxx
//   https://host/uploads/xxx → /uploads/xxx
//   已是 cloud:// 或非 uploads 路径 → 返回 null（不需替换）
const normalizeLocalPath = (url) => {
  if (typeof url !== 'string' || !url) return null
  // cloud:// 已是永久引用，跳过
  if (url.startsWith('cloud://')) return null
  // data: URL 跳过
  if (url.startsWith('data:')) return null
  // 剥离 http(s)://host 前缀
  let p = url
  const m = p.match(/^https?:\/\/[^/]+(\/.*)$/i)
  if (m) p = m[1]
  // 现在 p 应该是 /uploads/xxx 或 uploads/xxx 或 /xxx
  if (!p.startsWith('/uploads/') && !p.startsWith('uploads/')) {
    // 非 uploads 路径（如 /static/xxx），跳过
    return null
  }
  // 统一为 /uploads/xxx
  if (!p.startsWith('/')) p = '/' + p
  return p
}

// 递归遍历对象/数组，把所有匹配 urlMap 的本地 URL 字符串替换为 fileID
// 返回 { obj: 修改后的对象, changed: 是否有改动 }
const replaceUrlsDeep = (obj, urlMap) => {
  let changed = false
  if (obj === null || obj === undefined) return { obj, changed }
  if (typeof obj === 'string') {
    const normalized = normalizeLocalPath(obj)
    if (normalized && urlMap[normalized]) {
      return { obj: urlMap[normalized], changed: true }
    }
    return { obj, changed }
  }
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const res = replaceUrlsDeep(obj[i], urlMap)
      if (res.changed) { obj[i] = res.obj; changed = true }
    }
    return { obj, changed }
  }
  if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const res = replaceUrlsDeep(obj[key], urlMap)
      if (res.changed) { obj[key] = res.obj; changed = true }
    }
    return { obj, changed }
  }
  return { obj, changed }
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
// 把本地 url 替换为 cloud:// fileID（永久引用），写入云数据库 settings.font_map
// 运行时 listFonts 会用 getCloudUrls 批量换取临时 https URL
const migrateFontMap = async (manifest, db) => {
  const fontMapPath = path.join(UPLOADS_DIR, 'fonts', 'font-map.json')
  if (!fs.existsSync(fontMapPath)) {
    console.log('  ℹ️  font-map.json 不存在，跳过')
    return
  }
  let fontMap = JSON.parse(fs.readFileSync(fontMapPath, 'utf-8'))
  // 用 manifest 中的 fileID 替换本地 url
  Object.keys(fontMap).forEach(name => {
    const url = fontMap[name]
    if (typeof url !== 'string') return
    // 归一化本地路径：剥离 protocol://host，统一为 /uploads/xxx 形式
    const normalized = normalizeLocalPath(url)
    if (!normalized) return  // 已是 https/cloud URL，跳过
    // 找到 manifest 中 cloudPath 匹配的记录
    const record = manifest.find(m => '/' + m.cloudPath === normalized)
    if (record) {
      // 存 fileID（cloud://，永久），而非临时 https URL（2h 过期）
      fontMap[name] = record.fileID
      console.log(`  字体 ${name}: ${url} → ${record.fileID}`)
    }
  })
  // 写入云数据库 settings.font_map（upsert：用 set 原子替换）
  try {
    await db.collection('settings').doc('font_map').set({ data: { value: fontMap } })
  } catch (_) {
    await db.collection('settings').add({ data: { _id: 'font_map', value: fontMap } })
  }
  console.log(`  ✅ font_map 已写入云数据库 settings 集合（共 ${Object.keys(fontMap).length} 个字体）`)
}

// ============ 更新贴纸列表到 settings.poster_stickers ============
// 贴纸 url 存 fileID（cloud://，永久），运行时按需换取临时 URL
const migrateStickers = async (manifest, db) => {
  // 从 manifest 中筛选 uploads/poster/stickers/ 的记录
  const stickers = manifest
    .filter(m => m.cloudPath.startsWith('uploads/poster/stickers/'))
    .map(m => ({
      id: path.basename(m.cloudPath, path.extname(m.cloudPath)),
      name: path.basename(m.cloudPath, path.extname(m.cloudPath)),
      url: m.fileID,           // 存 fileID（永久引用 cloud://）
      cloudFileID: m.fileID,
    }))
  if (stickers.length === 0) {
    console.log('  ℹ️  未找到贴纸文件，跳过')
    return
  }
  try {
    await db.collection('settings').doc('poster_stickers').set({ data: { value: stickers } })
  } catch (_) {
    await db.collection('settings').add({ data: { _id: 'poster_stickers', value: stickers } })
  }
  console.log(`  ✅ 贴纸列表已写入 settings.poster_stickers（共 ${stickers.length} 个）`)
}

// ============ 更新数据库中的 url 字段 ============
// 把 poster_templates / poster_works / templates / works / music 集合中的本地 URL
// 替换为 cloud:// fileID（永久引用）。运行时各列表接口用 resolveCloudFields 按需换取临时 URL。
const updateDatabaseUrls = async (manifest, db) => {
  // 构建「归一化本地路径 → fileID」映射
  const urlMap = {}
  manifest.forEach(m => {
    if (!m.fileID) return
    // cloudPath 形如 uploads/poster/templates/wedding_1.jpg
    const localPath = '/' + m.cloudPath
    urlMap[localPath] = m.fileID
  })
  console.log(`  urlMap 含 ${Object.keys(urlMap).length} 条映射`)

  // 分页读取工具（云数据库单次最多 100 条）
  const getAll = async (collName) => {
    const PAGE = 100
    const countRes = await db.collection(collName).count()
    const total = countRes.total || 0
    const all = []
    for (let i = 0; i < total; i += PAGE) {
      const res = await db.collection(collName).skip(i).limit(PAGE).get()
      all.push(...(res.data || []))
    }
    return all
  }

  // ---- 1. poster_templates: cover_url, background_url, config（嵌套 JSON） ----
  console.log('  更新 poster_templates...')
  const pTemplates = await getAll('poster_templates')
  let updatedTpls = 0
  for (const t of pTemplates) {
    const fields = {}
    // 顶层字段
    if (t.cover_url !== undefined) {
      const r = replaceUrlsDeep(t.cover_url, urlMap); if (r.changed) fields.cover_url = r.obj
    }
    if (t.background_url !== undefined) {
      const r = replaceUrlsDeep(t.background_url, urlMap); if (r.changed) fields.background_url = r.obj
    }
    // config 嵌套 JSON（可能含图片 URL）
    if (t.config !== undefined) {
      const r = replaceUrlsDeep(t.config, urlMap); if (r.changed) fields.config = r.obj
    }
    if (Object.keys(fields).length > 0) {
      await db.collection('poster_templates').where({ id: t.id }).update({ data: fields })
      updatedTpls++
    }
  }
  console.log(`  ✅ poster_templates: 更新 ${updatedTpls} 条`)

  // ---- 2. poster_works: cover_url, poster_url, content（嵌套 JSON） ----
  console.log('  更新 poster_works...')
  const pWorks = await getAll('poster_works')
  let updatedPWorks = 0
  for (const w of pWorks) {
    const fields = {}
    if (w.cover_url !== undefined) {
      const r = replaceUrlsDeep(w.cover_url, urlMap); if (r.changed) fields.cover_url = r.obj
    }
    if (w.poster_url !== undefined) {
      const r = replaceUrlsDeep(w.poster_url, urlMap); if (r.changed) fields.poster_url = r.obj
    }
    if (w.content !== undefined) {
      const r = replaceUrlsDeep(w.content, urlMap); if (r.changed) fields.content = r.obj
    }
    if (Object.keys(fields).length > 0) {
      await db.collection('poster_works').where({ id: w.id }).update({ data: fields })
      updatedPWorks++
    }
  }
  console.log(`  ✅ poster_works: 更新 ${updatedPWorks} 条`)

  // ---- 3. templates: cover, backgroundImage, renderedImage, data/elements/pages（嵌套 JSON） ----
  console.log('  更新 templates...')
  const templates = await getAll('templates')
  let updatedTemplates = 0
  for (const t of templates) {
    const fields = {}
    for (const f of ['cover', 'backgroundImage', 'renderedImage', 'thumbnail']) {
      if (t[f] !== undefined) {
        const r = replaceUrlsDeep(t[f], urlMap); if (r.changed) fields[f] = r.obj
      }
    }
    // data / elements / pages 是嵌套 JSON，递归替换其中的图片 URL
    for (const f of ['data', 'elements', 'pages', 'tags']) {
      if (t[f] !== undefined) {
        const r = replaceUrlsDeep(t[f], urlMap); if (r.changed) fields[f] = r.obj
      }
    }
    if (Object.keys(fields).length > 0) {
      await db.collection('templates').where({ id: t.id }).update({ data: fields })
      updatedTemplates++
    }
  }
  console.log(`  ✅ templates: 更新 ${updatedTemplates} 条`)

  // ---- 4. works: cover, data（嵌套 JSON） ----
  console.log('  更新 works...')
  const works = await getAll('works')
  let updatedWorks = 0
  for (const w of works) {
    const fields = {}
    if (w.cover !== undefined) {
      const r = replaceUrlsDeep(w.cover, urlMap); if (r.changed) fields.cover = r.obj
    }
    if (w.data !== undefined) {
      const r = replaceUrlsDeep(w.data, urlMap); if (r.changed) fields.data = r.obj
    }
    if (Object.keys(fields).length > 0) {
      await db.collection('works').where({ id: w.id }).update({ data: fields })
      updatedWorks++
    }
  }
  console.log(`  ✅ works: 更新 ${updatedWorks} 条`)

  // ---- 5. music: src ----
  console.log('  更新 music.src...')
  const musics = await getAll('music')
  let updatedMusic = 0
  for (const m of musics) {
    if (m.src === undefined) continue
    const r = replaceUrlsDeep(m.src, urlMap)
    if (r.changed) {
      await db.collection('music').doc(m._id).update({ data: { src: r.obj } })
      updatedMusic++
    }
  }
  console.log(`  ✅ music: 更新 ${updatedMusic} 条 src`)
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
  // 1. server/uploads/ 下的所有文件（字体/贴纸/海报模板/海报作品/用户上传图片）
  const files = walkDir(UPLOADS_DIR)
  // 2. server/music/ 下的音乐文件（原 Express 用 /uploads/music 别名提供，实际在 server/music/）
  //    cloudPath 统一为 uploads/music/<filename>，与 DB 中存的 /uploads/music/xxx.mp3 对齐
  if (fs.existsSync(MUSIC_DIR)) {
    const musicBase = MUSIC_DIR // server/music/
    const musicFiles = walkDir(musicBase) // baseDir 默认为 musicBase，relPath 为 xxx.mp3
    // 把 cloudPath 从 uploads/xxx.mp3 改为 uploads/music/xxx.mp3
    musicFiles.forEach(f => { f.cloudPath = `uploads/music/${f.cloudPath.replace(/^uploads\//, '')}` })
    files.push(...musicFiles)
  }
  console.log(`\n📦 发现 ${files.length} 个文件待迁移（含 ${fs.existsSync(MUSIC_DIR) ? 'music 目录' : '无 music 目录'}）`)

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
