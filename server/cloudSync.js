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
const API_KEY = process.env.CLOUDBASE_APIKEY || 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjlkMWRjMzFlLWI0ZDAtNDQ4Yi1hNzZmLWIwY2M2M2Q4MTQ5OCJ9.eyJhdWQiOiJjbG91ZDEtZDRneXZtbzFkOWExZTE0OGEiLCJleHAiOjI1MzQwMjMwMDc5OSwiaWF0IjoxNzg1ODQ0ODQ5LCJhdF9oYXNoIjoibTBKZ2dGV2xTUXkzclJwMmliTUV5QSIsInByb2plY3RfaWQiOiJjbG91ZDEtZDRneXZtbzFkOWExZTE0OGEiLCJtZXRhIjp7InBsYXRmb3JtIjoiQXBpS2V5In0sImFkbWluaXN0cmF0b3JfaWQiOiIyMDgxNzAwNjQ4Mjc4NTk3NjM0IiwidXNlcl90eXBlIjoiIiwiY2xpZW50X3R5cGUiOiJjbGllbnRfc2VydmVyIiwiaXNfc3lzdGVtX2FkbWluIjp0cnVlfQ.Y5TYJuE3uqS2GIYJLxNm6-BobPE9Nycj9P7du0kICs0HF9ApclF4qNwh2Shi-j-hC9we-RD5uH99twQfbKLqgnrOxDmgjPm6IuollzgOgI1T3wxw0xyZVczYOLZFbp-Yjpg00G8gfQZQoEUXzNA0Sedv4qCQagegc1XcRXIJ20JgtlEoeNY1_QUw4rnhfv2Vi-BuuEyO44e3BMq6UIeTaK1FsFZ8kcBFLmccyKeUj_8jKbIXbtui-0omZ3-k453mhcg_KfW4JaxwCm0Fe2Hi20J6LZXZlTtEJGKJJBJjKdLg1cvYYxC8YyrPmIHDDAI-7TLuk01eqIZnLQdFguZUiw'
const ASSETS_BASE = process.env.ASSETS_BASE || 'https://api.TOYtamaxia.com'

// 初始化 SDK
const app = tcb.init({
  env: ENV_ID,
  accessKey: API_KEY,
  endpoint: `https://${ENV_ID}.api.tcloudbasegateway.com`,
})
const db = app.database()

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
  return true
}

/**
 * 同步模板到云数据库（直接写入）
 */
async function syncTemplateToCloud(id, templateData, action = 'create') {
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

    if (action === 'create') {
      await db.collection('templates').doc(id).set(payload)
    } else {
      await db.collection('templates').doc(id).set(payload)
    }

    console.log(`[cloudSync] ✅ 模板已同步: ${action} ${id} (${payload.name})`)
    return true
  } catch (e) {
    console.warn(`[cloudSync] ⚠️ 模板同步失败: ${action} ${id},`, e.message)
    return false
  }
}

/**
 * 从云数据库删除模板
 */
async function deleteTemplateFromCloud(id) {
  try {
    await db.collection('templates').doc(id).remove()
    console.log(`[cloudSync] ✅ 模板已删除: ${id}`)
    return true
  } catch (e) {
    console.warn(`[cloudSync] ⚠️ 模板删除失败: ${id},`, e.message)
    return false
  }
}

module.exports = {
  isEnabled,
  syncTemplateToCloud,
  deleteTemplateFromCloud,
}
