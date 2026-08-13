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

  try {
    let fileBuffer
    if (fileUrl.startsWith('data:')) {
      // data: URI → 解析 base64
      const base64 = fileUrl.split(',')[1]
      if (!base64) return ''
      fileBuffer = Buffer.from(base64, 'base64')
    } else if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://') ||
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
      if (!fileBuffer || !fileBuffer.length) {
        console.warn(`[cloudSync] 资源不可用(本地无文件且网络下载失败): ${fileUrl.slice(0, 80)}`)
        return ''
      }
    } else {
      return ''
    }

    if (!fileBuffer || !fileBuffer.length) return ''

    // 上传到云存储
    const uploadRes = await app.uploadFile({
      cloudPath,
      fileContent: fileBuffer,
    })
    if (uploadRes && uploadRes.fileID) {
      console.log(`[cloudSync] ☁️  文件已上传到云存储: ${cloudPath} -> ${uploadRes.fileID}`)
      return uploadRes.fileID
    }
  } catch (e) {
    console.warn(`[cloudSync] 文件上传到云存储失败: ${fileUrl.slice(0, 80)}... -> ${cloudPath}:`, e.message)
  }
  return ''
}

/**
 * 递归迁移对象中的本地资源 URL 到云存储
 * @param {*} obj 模板数据对象（data/elements/pages/background 等）
 * @param {string} prefix 云存储路径前缀
 */
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
        } else {
          // 上传失败：本地资源在云端无意义，置空避免假域名/本地地址残留
          console.warn(`[cloudSync] 嵌套图片上传失败，置空: ${value.slice(0, 60)}`)
          obj[key] = ''
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
    console.error(`[cloudSync] ❌ 模板删除失败: ${id}`)
    console.error(`[cloudSync]    耗时: ${elapsed}ms`)
    console.error(`[cloudSync]    错误: ${e.message}`)
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

module.exports = {
  isEnabled,
  syncTemplateToCloud,
  deleteTemplateFromCloud,
  fetchCloudTemplates,
  checkCloudTemplateExists,
}
