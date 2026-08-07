/**
 * 云同步模块
 * 在 admin 发布模板时，通过 CloudBase Node SDK 直接写入微信云数据库
 *
 * 流程：
 *   server POST/PUT template → 保存本地 SQLite → 响应返回
 *   → 异步通过 SDK 写入云 DB
 */

const tcb = require('@cloudbase/node-sdk')

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
    const payload = {
      id,
      name: normalized.name || '',
      subtitle: normalized.subtitle || '',
      category: normalized.category || '',
      cover: rewriteLocalhostUrl(normalized.cover),
      primaryColor: normalized.primaryColor || '#e84a6e',
      likes: normalized.likes || 0,
      pageCount: normalized.pageCount || 10,
      data: normalized.data || {},
      elements: normalized.elements || [],
      canvasSize: normalized.canvasSize || { width: 375, height: 667 },
      orientation: normalized.orientation || 'portrait',
      background: normalized.background || {},
      tags: normalized.tags || [],
      status: normalized.status || 'published',
      renderedImage: rewriteLocalhostUrl(normalized.renderedImage),
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

module.exports = {
  isEnabled,
  syncTemplateToCloud,
  deleteTemplateFromCloud,
}
