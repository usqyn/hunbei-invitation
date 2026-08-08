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

const ENV_ID = 'cloud1-d4gyvmo1d9a1e148a'
const API_KEY = process.env.CLOUDBASE_APIKEY || ''
const ASSETS_BASE = process.env.ASSETS_BASE || 'https://api.TOYtamaxia.com'

const syncEnabled = !!API_KEY
console.log(`[cloudSync] 初始化: env=${ENV_ID}, apiKey=${syncEnabled ? '已配置' : '❌ 未配置'}, assetsBase=${ASSETS_BASE}`)

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
 * 将 localhost/127.0.0.1 的 URL 替换为 HTTPS 生产域名
 */
function rewriteLocalhostUrl(url) {
  if (!url || typeof url !== 'string') return url || ''
  return url
    .replace(/https?:\/\/(localhost|127\.0\.0\.1):\d+\//g, ASSETS_BASE.endsWith('/') ? ASSETS_BASE : ASSETS_BASE + '/')
}

/**
 * 递归替换对象中的所有字符串值中的 localhost URL
 */
function rewriteLocalhostUrls(obj) {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(rewriteLocalhostUrls)
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = rewriteLocalhostUrl(value)
    } else if (typeof value === 'object' && value !== null) {
      result[key] = rewriteLocalhostUrls(value)
    } else {
      result[key] = value
    }
  }
  return result
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

  // 递归替换所有 localhost URL
  return rewriteLocalhostUrls(data)
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
    } else if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      fileBuffer = await downloadFile(fileUrl)
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

    // 上传图片文件到云存储，获取 cloud:// URL
    const ts = Date.now()
    const coverUrl = rewriteLocalhostUrl(normalized.cover)
    const bgUrl = rewriteLocalhostUrl(normalized.backgroundImage)
    const renderUrl = rewriteLocalhostUrl(normalized.renderedImage)
    const thumbUrl = rewriteLocalhostUrl(normalized.thumbnail)

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
      cover: cloudCover || coverUrl,
      primaryColor: normalized.primaryColor || '#e84a6e',
      likes: normalized.likes || 0,
      pageCount: normalized.pageCount || 10,
      data: normalized.data || {},
      elements: normalized.elements || [],
      canvasSize: normalized.canvasSize || { width: 375, height: 667 },
      orientation: normalized.orientation || 'portrait',
      background: normalized.background || {},
      backgroundImage: cloudBg || bgUrl || '',
      tags: normalized.tags || [],
      status: 'published',
      renderedImage: cloudRender || renderUrl,
      thumbnail: cloudThumb || thumbUrl || '',
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
