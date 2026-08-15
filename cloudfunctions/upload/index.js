// ============ upload 云函数 ============
// 图片/字体/音乐上传与列表，共 7 个路由：
//   POST /api/upload（多文件，字段名 images，最多10个）
//   POST /api/upload/image（单文件，字段名 image）
//   POST /api/fonts/upload（字体，字段名 fonts）+ GET /api/fonts
//   POST /api/music/upload（音乐，字段名 music）+ GET /api/music（列表+分页+tag 过滤）
//
// 与原 Express 差异：
// - multipart/form-data 在云函数不支持，改为 base64 JSON 方式上传
//   前端改造：把图片转 base64 后用 { image: 'data:image/png;base64,...' } POST
// - 响应返回 cloud://fileID 和 https URL 两个版本
// - font-map.json 存到云数据库 settings 集合（key='font_map'），不再用本地文件系统

const {
  db, collection, _, now, uuid,
  requireAuth,
  ok, okMsg, fail, httpOK, httpFail, httpOptions,
  parsePagination, paginateResponse, parseBody, matchRoute,
  uploadToCloud, getCloudUrl, getCloudUrls, createRouter,
} = require('./_shared')

// 允许的文件扩展名 → MIME 映射
const EXT_MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.aac': 'audio/aac',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2',
}

// 从 base64 data URL 解析出 { buffer, ext, mime }
const parseBase64Image = (dataUrl) => {
  const m = String(dataUrl).match(/^data:([a-z]+\/([a-z0-9.+-]+));base64,(.+)$/i)
  if (!m) return null
  const mime = m[1]
  const subtype = m[2].toLowerCase()
  const buf = Buffer.from(m[3], 'base64')
  // 把 jpeg 归一为 jpg
  const ext = subtype === 'jpeg' ? 'jpg' : subtype
  return { buffer: buf, ext, mime }
}

// 生成云存储路径（按类型分目录）
const buildCloudPath = (category, ext, originalName) => {
  const filename = `${uuid()}${ext ? '.' + ext : ''}`
  return `uploads/${category}/${filename}`
}

// ============ 图片上传 ============

// POST /api/upload — 多文件上传（base64 数组，最多 10 个）
// 请求体：{ images: ['data:image/png;base64,...', ...], names?: ['a.png', ...] }
// 响应：{ success, data: [{ filename, originalName, url, httpsUrl, cloudFileID, size }] }
// 注意：url 返回 fileID（cloud://，永久），httpsUrl 返回临时 https URL（约 2h 过期，仅供即时显示）
const uploadMultiple = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const { images, names } = ctx.body
  if (!images || !Array.isArray(images) || !images.length) return httpFail('未收到图片文件')
  if (images.length > 10) return httpFail('单次最多上传 10 个文件')
  const results = []
  for (let i = 0; i < images.length; i++) {
    const parsed = parseBase64Image(images[i])
    if (!parsed) return httpFail(`第 ${i + 1} 个文件格式不支持，请使用 PNG/JPG/WebP`)
    if (parsed.buffer.length > 10 * 1024 * 1024) return httpFail(`第 ${i + 1} 个文件超过 10MB 限制`, 413)
    const originalName = (names && names[i]) || `image-${i + 1}.${parsed.ext}`
    const cloudPath = buildCloudPath('images', parsed.ext, originalName)
    const fileID = await uploadToCloud(parsed.buffer, cloudPath, parsed.mime)
    const httpsUrl = await getCloudUrl(fileID)
    results.push({
      filename: cloudPath.split('/').pop(),
      originalName,
      url: fileID,        // 永久引用（cloud://），前端存储此值
      httpsUrl,           // 临时 https URL，仅供即时显示（约 2h 过期）
      cloudFileID: fileID,
      cloudUrl: fileID,
      size: parsed.buffer.length,
    })
  }
  return ok(results)
}

// POST /api/upload/image — 单图上传（base64）
// 请求体：{ image: 'data:image/png;base64,...' }
// 响应：{ success, data: { url, httpsUrl, cloudFileID } }
//   url: fileID（cloud://，永久，前端应存储此值）
//   httpsUrl: 临时 https URL（约 2h 过期，仅供即时显示）
const uploadSingleImage = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const { image } = ctx.body
  if (!image) return httpFail('未收到图片文件')
  const parsed = parseBase64Image(image)
  if (!parsed) return httpFail('图片格式不支持，请使用 PNG/JPG/WebP')
  if (parsed.buffer.length > 10 * 1024 * 1024) return httpFail('图片大小不能超过 10MB', 413)
  const cloudPath = buildCloudPath('images', parsed.ext)
  const fileID = await uploadToCloud(parsed.buffer, cloudPath, parsed.mime)
  const httpsUrl = await getCloudUrl(fileID)
  // url 返回 fileID（永久引用），httpsUrl 供即时显示
  return ok({ url: fileID, httpsUrl, cloudFileID: fileID })
}

// ============ 字体上传 ============

// POST /api/fonts/upload — 字体上传（base64 数组，最多 10 个）
// 请求体：{ fonts: ['data:font/ttf;base64,...'], names?: ['字体名'] }
// 字体映射存到 settings.font_map（{ name: httpsUrl }）
const uploadFonts = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const { fonts, names } = ctx.body
  if (!fonts || !Array.isArray(fonts) || !fonts.length) return httpFail('未收到字体文件')
  if (fonts.length > 10) return httpFail('单次最多上传 10 个文件')
  const allowedExts = ['ttf', 'otf', 'woff', 'woff2']
  // 读取现有 font_map
  const settingsRes = await collection('settings').doc('font_map').get().catch(() => ({ data: null }))
  let fontMap = (settingsRes.data && settingsRes.data.value) || {}
  if (typeof fontMap === 'string') { try { fontMap = JSON.parse(fontMap) } catch (_) { fontMap = {} } }
  const results = []
  for (let i = 0; i < fonts.length; i++) {
    const parsed = parseBase64Image(fonts[i])
    if (!parsed || !allowedExts.includes(parsed.ext)) {
      return httpFail(`第 ${i + 1} 个文件格式不支持，请上传 ttf/otf/woff/woff2`)
    }
    if (parsed.buffer.length > 20 * 1024 * 1024) return httpFail(`第 ${i + 1} 个文件超过 20MB 限制`, 413)
    const originalName = (names && names[i]) || `font-${i + 1}.${parsed.ext}`
    const fontName = originalName.replace(/\.[^.]+$/, '')
    const cloudPath = `uploads/fonts/${uuid()}.${parsed.ext}`
    const fileID = await uploadToCloud(parsed.buffer, cloudPath, parsed.mime)
    const httpsUrl = await getCloudUrl(fileID)
    // 字体映射存 fileID（永久引用 cloud://），运行时按需用 getCloudUrl 换取临时 URL
    fontMap[fontName] = fileID
    results.push({
      filename: cloudPath.split('/').pop(),
      originalName,
      url: fileID,         // 永久引用（cloud://）
      httpsUrl,            // 临时 https URL（约 2h 过期，仅供即时显示）
      cloudFileID: fileID,
      cloudUrl: fileID,
      size: parsed.buffer.length,
    })
  }
  // 写回 settings.font_map（upsert 语义）
  try {
    await collection('settings').doc('font_map').update({ data: { value: fontMap } })
  } catch (_) {
    await collection('settings').add({ data: { _id: 'font_map', value: fontMap } })
  }
  return ok(results)
}

// GET /api/fonts — 字体列表（从 settings.font_map 读取，并把 fileID 转为临时 https URL）
const listFonts = async (ctx) => {
  const res = await collection('settings').doc('font_map').get().catch(() => ({ data: null }))
  let fontMap = (res.data && res.data.value) || {}
  if (typeof fontMap === 'string') { try { fontMap = JSON.parse(fontMap) } catch (_) { fontMap = {} } }
  // font_map 存的是 fileID（cloud://），批量换取临时 https URL 供前端即时使用
  const fileIDs = Object.values(fontMap).filter(v => typeof v === 'string' && v.startsWith('cloud://'))
  const httpsUrls = fileIDs.length ? await getCloudUrls(fileIDs) : []
  const urlMap = {}
  fileIDs.forEach((f, i) => { urlMap[f] = httpsUrls[i] || '' })
  // 转为数组 [{ filename, url, size }]，url 为 https 临时 URL
  const list = Object.entries(fontMap).map(([name, fileID]) => ({
    filename: name, url: (typeof fileID === 'string' && fileID.startsWith('cloud://')) ? (urlMap[fileID] || fileID) : fileID, size: 0,
  }))
  return ok(list)
}

// ============ 音乐上传 ============

// POST /api/music/upload — 音乐上传（base64 数组，最多 10 个）
// 上传成功后写入 music 集合（name/tag/src/hot）
const uploadMusic = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const { music } = ctx.body
  if (!music || !Array.isArray(music) || !music.length) return httpFail('未收到音乐文件')
  if (music.length > 10) return httpFail('单次最多上传 10 个文件')
  const allowedExts = ['mp3', 'wav', 'ogg', 'aac']
  const results = []
  for (let i = 0; i < music.length; i++) {
    const parsed = parseBase64Image(music[i])
    if (!parsed || !allowedExts.includes(parsed.ext)) {
      return httpFail(`第 ${i + 1} 个文件格式不支持，请上传 mp3/wav/ogg/aac`)
    }
    if (parsed.buffer.length > 20 * 1024 * 1024) return httpFail(`第 ${i + 1} 个文件超过 20MB 限制`, 413)
    const originalName = `music-${i + 1}.${parsed.ext}`
    const cloudPath = `uploads/music/${uuid()}.${parsed.ext}`
    const fileID = await uploadToCloud(parsed.buffer, cloudPath, parsed.mime)
    const httpsUrl = await getCloudUrl(fileID)
    // music.src 存 fileID（永久引用 cloud://），listMusic 时按需换取临时 URL
    await collection('music').add({ data: {
      name: originalName.replace(/\.[^.]+$/, ''), tag: '本地上传',
      src: fileID, hot: 0, fileID,
    } })
    results.push({
      filename: cloudPath.split('/').pop(),
      originalName,
      url: fileID,         // 永久引用（cloud://）
      httpsUrl,            // 临时 https URL（约 2h 过期，仅供即时显示）
      cloudFileID: fileID,
      cloudUrl: fileID,
      size: parsed.buffer.length,
    })
  }
  return ok(results)
}

// GET /api/music — 音乐列表（分页 + tag 过滤）
// music.src 存的是 fileID（cloud://），需批量换取临时 https URL 返回前端
const listMusic = async (ctx) => {
  const conditions = {}
  if (ctx.query.tag && ctx.query.tag !== '全部') conditions.tag = ctx.query.tag
  const { page, limit, skip, hasPaging } = parsePagination(ctx.query)
  let q = collection('music').where(conditions)
  // 先按 hot 倒序，再按 _id 升序（与原 SQL "ORDER BY hot DESC, id ASC" 一致）
  const countRes = await q.count()
  const total = countRes.total || 0
  q = q.orderBy('hot', 'desc').orderBy('_id', 'asc')
  let rawList
  if (hasPaging) {
    const res = await q.skip(skip).limit(limit).get()
    rawList = res.data || []
  } else {
    const res = await q.limit(100).get()
    rawList = res.data || []
  }
  // 批量把 fileID（cloud://）转为临时 https URL
  const fileIDs = rawList.map(m => m.src).filter(s => typeof s === 'string' && s.startsWith('cloud://'))
  const httpsUrls = fileIDs.length ? await getCloudUrls(fileIDs) : []
  const urlMap = {}
  fileIDs.forEach((f, i) => { urlMap[f] = httpsUrls[i] || '' })
  const list = rawList.map(m => ({
    id: m._id, name: m.name, tag: m.tag,
    src: (typeof m.src === 'string' && m.src.startsWith('cloud://')) ? (urlMap[m.src] || m.src) : m.src,
    hot: !!m.hot,
  }))
  if (hasPaging) return paginateResponse(list, page, limit, total)
  return ok(list)
}

// ============ 路由表 ============
const routes = [
  ['POST', '/api/upload', uploadMultiple],
  ['POST', '/api/upload/image', uploadSingleImage],
  ['POST', '/api/fonts/upload', uploadFonts],
  ['GET', '/api/fonts', listFonts],
  ['POST', '/api/music/upload', uploadMusic],
  ['GET', '/api/music', listMusic],
]

// ============ 云函数入口 ============
exports.main = createRouter(routes, 'upload')
