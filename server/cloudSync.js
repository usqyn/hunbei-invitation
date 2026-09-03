/**
 * 云同步模块
 * 在 admin 发布模板时，通过 CloudBase Node SDK 直接写入微信云数据库
 *
 * 流程：
 *   server POST/PUT template → 保存本地 SQLite → 响应返回
 *   → 异步通过 SDK 写入云 DB
 */

const tcb = require('@cloudbase/node-sdk')
const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')

const ENV_ID = 'cloud1-d4gyvmo1d9a1e148a'
const API_KEY = process.env.CLOUDBASE_APIKEY || ''
const UPLOADS_ROOT = path.join(__dirname, 'uploads')

const syncEnabled = !!API_KEY
console.log(`[cloudSync] 初始化: env=${ENV_ID}, apiKey=${syncEnabled ? '已配置' : '❌ 未配置'}`)

// 初始化 SDK（仅在 API_KEY 配置时）
let app, db
if (syncEnabled) {
  try {
    app = tcb.init({
      env: ENV_ID,
      accessKey: API_KEY,
      endpoint: `https://${ENV_ID}.api.tcloudbasegateway.com`,
    })
    db = app.database()
    console.log('[cloudSync] CloudBase SDK 初始化成功')
  } catch (e) {
    console.error('[cloudSync] ❌ CloudBase SDK 初始化失败:', e.message)
  }
} else {
  console.warn('[cloudSync] ⚠️ CLOUDBASE_APIKEY 未配置，云同步已禁用')
}

/**
 * 将本地资源 URL（127.0.0.1/localhost）或相对路径（/uploads/xxx）映射为本地磁盘文件路径。
 * admin 上传的图片都落在 server/uploads，直接读磁盘即可，无需网络下载。
 */
function localUrlToFilePath(url) {
  if (!url || typeof url !== 'string') return ''
  let pathname = url
  try {
    if (/^https?:\/\//i.test(url)) pathname = new URL(url).pathname
  } catch (_) { pathname = url }
  // 兼容 /uploads/xxx、uploads/xxx、http://host/uploads/xxx 三种写法
  // 统一提取为相对于 UPLOADS_ROOT 的相对路径（如 poster/xxx.jpg）
  if (pathname.startsWith('/uploads/')) pathname = pathname.slice(1)
  if (pathname.startsWith('uploads/')) pathname = pathname.slice('uploads/'.length)
  // 防目录穿越：解析后的绝对路径必须位于 UPLOADS_ROOT 内
  const abs = path.resolve(UPLOADS_ROOT, pathname)
  if (abs !== UPLOADS_ROOT && !abs.startsWith(UPLOADS_ROOT + path.sep)) return ''
  return fs.existsSync(abs) ? abs : ''
}

/**
 * 判断 URL 是否为本地资源（本地 server 或相对路径）
 */
function isLocalAssetUrl(url) {
  if (!url || typeof url !== 'string') return false
  return url.includes('127.0.0.1') || url.includes('localhost') ||
    url.startsWith('/uploads/') || url.startsWith('uploads/')
}

/**
 * 解析资源 URL：仅做类型识别，不改写地址。
 * - cloud:// / data: → 原样返回
 * - 本地 /uploads/ 相对路径 → 返回相对路径，由 uploadFileToCloud 从磁盘读取
 * - 其余完整 URL → 原样返回（uploadFileToCloud 尝试网络下载）
 * 不再拼装任何生产资源域名（图片统一走云存储 cloud://，本地相对路径直接读磁盘上传）。
 */
function resolveAssetUrl(url) {
  if (!url || typeof url !== 'string') return ''
  if (url.startsWith('cloud://') || url.startsWith('data:')) return url
  return url
}

/**
 * 确保字段为正确的类型（对象/数组），如果是字符串则尝试解析
 */
function ensureFieldType(value, fieldName) {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      console.log(`[cloudSync] 🔧 ${fieldName}: string -> ${Array.isArray(parsed) ? 'array' : 'object'}`)
      return parsed
    } catch (e) {
      // 无法解析，保持原值
      return value
    }
  }
  return value
}

/**
 * 规范化模板数据，确保字段类型正确且 URL 无 localhost
 */
function normalizeTemplateData(templateData) {
  const data = { ...templateData }

  // 解析可能被错误存储为字符串的 JSON 字段
  const jsonFields = ['data', 'elements', 'pages', 'canvasSize', 'background', 'tags']
  for (const field of jsonFields) {
    if (data[field] !== undefined && data[field] !== null) {
      data[field] = ensureFieldType(data[field], field)
    }
  }

  return data
}

function isEnabled() {
  return syncEnabled
}

/**
 * 下载文件并上传到云存储
 * @param {string} fileUrl - 文件的 HTTP/HTTPS URL 或 data: URI
 * @param {string} cloudPath - 云存储路径，如 templates/cover/xxx.jpg
 * @returns {Promise<string>} cloud:// 文件 ID 或空字符串
 */
async function uploadFileToCloud(fileUrl, cloudPath) {
  if (!syncEnabled || !app || !fileUrl) return ''
  // 跳过已有的 cloud:// URL
  if (fileUrl.startsWith('cloud://')) return fileUrl

  // 读取文件内容（本地磁盘优先，网络下载兜底）
  async function readFileBuffer() {
    let fileBuffer = null
    if (fileUrl.startsWith('data:')) {
      const base64 = fileUrl.split(',')[1]
      if (!base64) return null
      return Buffer.from(base64, 'base64')
    }
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://') ||
        fileUrl.startsWith('/uploads/') || fileUrl.startsWith('uploads/')) {
      // 1) 本地磁盘优先：admin 上传的图片就存在 server/uploads，直接读文件
      const localPath = localUrlToFilePath(fileUrl)
      if (localPath) {
        try {
          fileBuffer = fs.readFileSync(localPath)
          console.log(`[cloudSync] 📂 从本地磁盘读取: ${localPath}`)
        } catch (_) { fileBuffer = null }
      }
      // 2) 本地读不到再尝试网络下载（远程 https 资源）
      if (!fileBuffer && (fileUrl.startsWith('http://') || fileUrl.startsWith('https://'))) {
        fileBuffer = await downloadFile(fileUrl)
      }
    }
    return fileBuffer && fileBuffer.length ? fileBuffer : null
  }

  // 最多 3 次尝试（网络抖动/大文件超时重试），指数退避 500ms → 1500ms
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const fileBuffer = await readFileBuffer()
      if (!fileBuffer) {
        console.warn(`[cloudSync] 资源不可用(本地无文件且网络下载失败): ${fileUrl.slice(0, 80)}`)
        return ''
      }
      const uploadRes = await app.uploadFile({
        cloudPath,
        fileContent: fileBuffer,
      })
      if (uploadRes && uploadRes.fileID) {
        console.log(`[cloudSync] ☁️  文件已上传到云存储: ${cloudPath} -> ${uploadRes.fileID}`)
        return uploadRes.fileID
      }
      console.warn(`[cloudSync] 上传响应无 fileID（第 ${attempt}/3 次）: ${cloudPath}`)
    } catch (e) {
      console.warn(`[cloudSync] 上传失败（第 ${attempt}/3 次）: ${fileUrl.slice(0, 80)}... -> ${cloudPath}:`, e.message)
    }
    if (attempt < 3) await new Promise(r => setTimeout(r, 500 * attempt * 3))
  }
  return ''
}

/**
 * 递归迁移对象中的本地资源 URL 到云存储
 * @param {*} obj 模板数据对象（data/elements/pages/background 等）
 * @param {string} prefix 云存储路径前缀
 */
// 本次同步的上传统计（由 syncTemplateToCloud 在每次同步前重置）
let _syncUploadStats = { ok: 0, failed: 0, failedUrls: [] }

async function migrateLocalUrlsDeep(obj, prefix) {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      await migrateLocalUrlsDeep(obj[i], prefix)
    }
    return obj
  }
  for (const key of Object.keys(obj)) {
    const value = obj[key]
    if (typeof value === 'string') {
      if (isLocalAssetUrl(value)) {
        const ext = path.extname(value.split('?')[0]) || '.jpg'
        const cloudPath = `${prefix}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`
        const fileID = await uploadFileToCloud(value, cloudPath)
        if (fileID) {
          obj[key] = fileID
          _syncUploadStats.ok++
        } else {
          // 上传失败：保留原值（置空会永久丢失资源引用导致小程序背景/图片缺失），
          // 仅统计失败并告警；本地 /uploads/ 值在云端虽不可直接加载，但可通过重新同步修复
          _syncUploadStats.failed++
          _syncUploadStats.failedUrls.push(value.slice(0, 100))
          console.warn(`[cloudSync] ⚠️ 嵌套图片上传失败，保留原值待重试: ${value.slice(0, 60)}`)
        }
      }
    } else if (value && typeof value === 'object') {
      await migrateLocalUrlsDeep(value, prefix)
    }
  }
  return obj
}

/**
 * 下载文件为 Buffer
 */
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https://') ? https : http
    const req = client.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // 跟随重定向
        return downloadFile(res.headers.location).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`HTTP ${res.statusCode}`))
      }
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
  })
}

/**
 * 同步模板到云数据库（直接写入）
 */
async function syncTemplateToCloud(id, templateData, action = 'create') {
  const startTime = Date.now()
  console.log(`[cloudSync] ────────────────────────────────────────`)
  console.log(`[cloudSync] 📤 开始同步: action=${action}, id=${id}`)
  console.log(`[cloudSync]    模板名称: ${templateData.name || '(空)'}`)
  console.log(`[cloudSync]    分类: ${templateData.category || '(空)'}`)
  console.log(`[cloudSync]    状态: ${templateData.status || '(空)'}`)
  console.log(`[cloudSync]    模板类型: ${templateData.templateType || 'canvas'}`)

  if (!syncEnabled || !db) {
    console.warn(`[cloudSync] ⚠️ 云同步已禁用，跳过: ${action} ${id}`)
    return false
  }

  try {
    const normalized = normalizeTemplateData(templateData)

    // 重置上传统计
    _syncUploadStats = { ok: 0, failed: 0, failedUrls: [] }

    // 嵌套字段（data/elements/pages/background）里的本地图片 → 先上传云存储替换为 cloud://
    const ts = Date.now()
    await Promise.all([
      migrateLocalUrlsDeep(normalized.data, `templates/data/${id}`),
      migrateLocalUrlsDeep(normalized.elements, `templates/elements/${id}`),
      migrateLocalUrlsDeep(normalized.pages, `templates/pages/${id}`),
      migrateLocalUrlsDeep(normalized.background, `templates/bg/${id}`),
    ])

    // 上传顶层图片文件到云存储，获取 cloud:// URL
    const coverUrl = resolveAssetUrl(normalized.cover)
    const bgUrl = resolveAssetUrl(normalized.backgroundImage)
    const renderUrl = resolveAssetUrl(normalized.renderedImage)
    const thumbUrl = resolveAssetUrl(normalized.thumbnail)

    const [cloudCover, cloudBg, cloudRender, cloudThumb] = await Promise.all([
      coverUrl ? uploadFileToCloud(coverUrl, `templates/cover/${id}_${ts}.jpg`) : Promise.resolve(''),
      bgUrl ? uploadFileToCloud(bgUrl, `templates/bg/${id}_${ts}.jpg`) : Promise.resolve(''),
      renderUrl ? uploadFileToCloud(renderUrl, `templates/render/${id}_${ts}.jpg`) : Promise.resolve(''),
      thumbUrl ? uploadFileToCloud(thumbUrl, `templates/thumb/${id}_${ts}.jpg`) : Promise.resolve(''),
    ])

    const payload = {
      id,
      name: normalized.name || '',
      subtitle: normalized.subtitle || '',
      category: normalized.category || '',
      // 上传失败且是本地地址 → 置空，绝不让假域名/本地地址进云端
      cover: cloudCover || (isLocalAssetUrl(coverUrl) ? '' : coverUrl),
      primaryColor: normalized.primaryColor || '#e84a6e',
      likes: normalized.likes || 0,
      pageCount: normalized.pageCount || 10,
      data: normalized.data || {},
      elements: normalized.elements || [],
      canvasSize: normalized.canvasSize || { width: 375, height: 667 },
      orientation: normalized.orientation || 'portrait',
      background: normalized.background || {},
      backgroundImage: cloudBg || (isLocalAssetUrl(bgUrl) ? '' : bgUrl || ''),
      tags: normalized.tags || [],
      status: 'published',
      renderedImage: cloudRender || (isLocalAssetUrl(renderUrl) ? '' : renderUrl),
      thumbnail: cloudThumb || (isLocalAssetUrl(thumbUrl) ? '' : thumbUrl || ''),
      is_paid: normalized.is_paid || normalized.isPaid || 0,
      price: normalized.price || 0,
      is_premium: normalized.is_premium || normalized.isPremium || 0,
      vipLevel: normalized.vipLevel || (normalized.is_premium || normalized.isPremium ? 'pro' : (normalized.is_paid || normalized.isPaid ? 'personal' : 'free')),
      templateType: normalized.templateType || 'canvas',
      pages: normalized.pages || [],
      createdAt: normalized.createdAt || Date.now(),
      updatedAt: Date.now(),
    }

    console.log(`[cloudSync]    写入云数据库...`)
    const result = await db.collection('templates').doc(id).set(payload)
    const elapsed = Date.now() - startTime

    console.log(`[cloudSync] ✅ 模板同步成功: ${action} ${id} (${payload.name})`)
    console.log(`[cloudSync]    耗时: ${elapsed}ms`)
    console.log(`[cloudSync]    资源上传: 成功 ${_syncUploadStats.ok} 个${_syncUploadStats.failed ? `，失败 ${_syncUploadStats.failed} 个 ⚠️` : ''}`)
    if (_syncUploadStats.failed) {
      console.warn(`[cloudSync]    失败资源(保留原值，可通过重新同步修复):`, _syncUploadStats.failedUrls)
    }
    console.log(`[cloudSync]    云返回:`, JSON.stringify(result).slice(0, 200))
    console.log(`[cloudSync] ────────────────────────────────────────`)
    return true
  } catch (e) {
    const elapsed = Date.now() - startTime
    console.error(`[cloudSync] ❌ 模板同步失败: ${action} ${id}`)
    console.error(`[cloudSync]    耗时: ${elapsed}ms`)
    console.error(`[cloudSync]    错误: ${e.message}`)
    if (e.stack) console.error(`[cloudSync]    堆栈:`, e.stack.split('\n').slice(0, 3).join('\n'))
    console.log(`[cloudSync] ────────────────────────────────────────`)
    return false
  }
}

/**
 * 从云数据库删除模板
 */
async function deleteTemplateFromCloud(id) {
  const startTime = Date.now()
  console.log(`[cloudSync] ────────────────────────────────────────`)
  console.log(`[cloudSync] 🗑️  开始删除: id=${id}`)

  if (!syncEnabled || !db) {
    console.warn(`[cloudSync] ⚠️ 云同步已禁用，跳过删除: ${id}`)
    return false
  }

  try {
    await db.collection('templates').doc(id).remove()
    const elapsed = Date.now() - startTime
    console.log(`[cloudSync] ✅ 模板删除成功: ${id}, 耗时: ${elapsed}ms`)
    console.log(`[cloudSync] ────────────────────────────────────────`)
    return true
  } catch (e) {
    const elapsed = Date.now() - startTime
    const errMsg = String(e?.message || e || '')
    // 幂等处理：云端文档不存在/已被删除时，视为删除成功
    // 避免"云端文档已丢失 → 本地永远删不掉"的死结
    if (/(not\s+exist|not\s+found|doesn'?t\s+exist|document.*deleted|collection.*not)/i.test(errMsg)) {
      console.log(`[cloudSync] ⚠️ 云端文档不存在，视为删除成功: ${id}`)
      console.log(`[cloudSync]    耗时: ${elapsed}ms`)
      console.log(`[cloudSync] ────────────────────────────────────────`)
      return true
    }
    console.error(`[cloudSync] ❌ 模板删除失败: ${id}`)
    console.error(`[cloudSync]    耗时: ${elapsed}ms`)
    console.error(`[cloudSync]    错误: ${errMsg}`)
    console.log(`[cloudSync] ────────────────────────────────────────`)
    return false
  }
}

/**
 * 查询云数据库中的模板列表（仅返回 id 和 name，用于验证同步状态）
 */
async function fetchCloudTemplates(limit = 100) {
  if (!syncEnabled || !db) {
    return { success: false, error: '云同步未启用', data: [] }
  }

  try {
    const result = await db.collection('templates').limit(limit).get()
    const templates = (result.data || []).map(t => ({
      id: t.id,
      name: t.name,
      status: t.status,
      updatedAt: t.updatedAt,
    }))
    return { success: true, data: templates }
  } catch (e) {
    console.error('[cloudSync] 查询云模板失败:', e.message)
    return { success: false, error: e.message, data: [] }
  }
}

/**
 * 检查单个模板是否存在于云数据库
 */
async function checkCloudTemplateExists(id) {
  if (!syncEnabled || !db) {
    return { exists: false, error: '云同步未启用' }
  }

  try {
    const result = await db.collection('templates').doc(id).get()
    return { exists: !!result.data, data: result.data }
  } catch (e) {
    // doc.get() 在不存在时会抛出异常
    if (e.message && e.message.includes('not exist')) {
      return { exists: false }
    }
    console.error('[cloudSync] 查询云模板失败:', e.message)
    return { exists: false, error: e.message }
  }
}

/**
 * 拉取云端全量模板文档（完整数据，用于「云端 → 本地」同步）
 * 云数据库单次 get() 最多返回 100 条，需要分页循环拉取
 */
async function fetchFullCloudTemplates(limit = 1000) {
  if (!syncEnabled || !db) {
    return { success: false, error: '云同步未启用', data: [] }
  }
  const templates = []
  try {
    const pageSize = 100
    let skip = 0
    while (templates.length < limit) {
      const result = await db.collection('templates').skip(skip).limit(pageSize).get()
      const batch = result.data || []
      if (!batch.length) break
      for (const t of batch) templates.push(t)
      if (batch.length < pageSize) break
      skip += batch.length
    }
    console.log(`[cloudSync] 📥 从云端拉取全量模板: ${templates.length} 条`)
    return { success: true, data: templates }
  } catch (e) {
    console.error('[cloudSync] 拉取云端全量模板失败:', e.message)
    return { success: false, error: e.message, data: [] }
  }
}

// 云端文件下载缓存：同一 fileID 只下载一次，避免重复下载
const cloudFileCache = new Map()
// 简单并发限制：同时最多 6 个云文件下载
const MAX_CONCURRENT_DOWNLOADS = 6
let activeDownloads = 0
const downloadQueue = []

/**
 * 下载云存储文件（cloud://）到本地 uploads/cloud-pull，返回本地可访问 URL
 * @param {string} fileID - cloud:// 格式的文件 ID
 * @returns {Promise<string>} /uploads/cloud-pull/xxx 或空字符串（失败）
 */
async function downloadCloudFileToLocal(fileID) {
  if (!syncEnabled || !app || !fileID || typeof fileID !== 'string') return ''
  // 非 cloud:// 的 URL 无需下载，原样返回（http/https/相对路径 admin 可直接访问）
  if (!fileID.startsWith('cloud://')) return fileID
  // 命中缓存直接返回
  if (cloudFileCache.has(fileID)) return cloudFileCache.get(fileID)

  // 并发限制
  if (activeDownloads >= MAX_CONCURRENT_DOWNLOADS) {
    await new Promise(resolve => downloadQueue.push(resolve))
  }
  activeDownloads++
  try {
    // 从 fileID 推断扩展名
    const extMatch = fileID.match(/\.(jpg|jpeg|png|gif|webp|svg|mp3|mp4|ttf|woff|woff2|json)(?:\?.*)?$/i)
    const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg'
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`
    const pullDir = path.join(UPLOADS_ROOT, 'cloud-pull')
    fs.mkdirSync(pullDir, { recursive: true })
    const localPath = path.join(pullDir, fileName)

    await app.downloadFile({ fileID, tempFilePath: localPath })
    const localUrl = `/uploads/cloud-pull/${fileName}`
    cloudFileCache.set(fileID, localUrl)
    console.log(`[cloudSync] ⬇️  云端文件已下载: ${String(fileID).slice(0, 60)}... -> ${localUrl}`)
    return localUrl
  } catch (e) {
    console.warn(`[cloudSync] 下载云端文件失败: ${String(fileID).slice(0, 60)}... -> ${e.message}`)
    return ''
  } finally {
    activeDownloads--
    if (downloadQueue.length) downloadQueue.shift()()
  }
}

/**
 * 递归迁移对象中的 cloud:// 图片为本地 URL
 * @param {*} obj 模板数据对象（data/elements/pages/background 等）
 */
async function migrateCloudUrlsDeep(obj) {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      await migrateCloudUrlsDeep(obj[i])
    }
    return obj
  }
  for (const key of Object.keys(obj)) {
    const value = obj[key]
    if (typeof value === 'string' && value.startsWith('cloud://')) {
      obj[key] = await downloadCloudFileToLocal(value)
    } else if (value && typeof value === 'object') {
      await migrateCloudUrlsDeep(value)
    }
  }
  return obj
}

/**
 * 同步单个字体文件到云存储，并合并写入云数据库 settings.font_map
 * （小程序云函数模式 GET /api/fonts 从 settings.font_map 读取 {字体名: cloud://fileID}）
 * @param {string} name - 字体名（与本地 font-map.json 的 key 一致）
 * @param {string} localPath - 字体文件在本地磁盘的绝对路径
 * @returns {Promise<boolean>} 是否成功
 */
async function syncFontToCloud(name, localPath) {
  if (!syncEnabled || !app || !db) return false
  try {
    if (!fs.existsSync(localPath)) {
      console.warn(`[cloudSync] 字体文件不存在，跳过: ${localPath}`)
      return false
    }
    const buffer = fs.readFileSync(localPath)
    // cloudPath 用稳定路径（字体名+扩展名），重复同步覆盖同一路径，不产生冗余文件
    const ext = path.extname(localPath).toLowerCase()
    const cloudPath = `uploads/fonts/${name}${ext}`
    const uploadRes = await app.uploadFile({ cloudPath, fileContent: buffer })
    if (!uploadRes || !uploadRes.fileID) {
      console.warn(`[cloudSync] 字体上传云存储失败: ${name}`)
      return false
    }

    // 合并现有 font_map（避免覆盖其他字体），再 upsert 写回
    // 注意：@cloudbase/node-sdk 的 set/add 接收文档内容本身（无 data 包装），与 wx-server-sdk 不同
    const col = db.collection('settings')
    let fontMap = {}
    try {
      const res = await col.doc('font_map').get()
      const docData = res && res.data
      const doc0 = Array.isArray(docData) ? docData[0] : docData
      const v = doc0 && doc0.value
      if (typeof v === 'string') { try { fontMap = JSON.parse(v) } catch (_) { fontMap = {} } }
      else if (v && typeof v === 'object') fontMap = v
    } catch (_) { /* 文档不存在 → 从空 map 开始 */ }
    fontMap[name] = uploadRes.fileID

    try {
      await col.doc('font_map').set({ value: fontMap })
    } catch (_) {
      await col.add({ _id: 'font_map', value: fontMap })
    }
    console.log(`[cloudSync] ☁️  字体已同步: ${name} -> ${uploadRes.fileID}（font_map 共 ${Object.keys(fontMap).length} 个）`)
    return true
  } catch (e) {
    console.warn(`[cloudSync] 字体云同步失败: ${name}:`, e.message)
    return false
  }
}

module.exports = {
  isEnabled,
  syncTemplateToCloud,
  deleteTemplateFromCloud,
  fetchCloudTemplates,
  checkCloudTemplateExists,
  fetchFullCloudTemplates,
  downloadCloudFileToLocal,
  migrateCloudUrlsDeep,
  syncFontToCloud,
}
