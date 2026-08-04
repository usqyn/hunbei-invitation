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

function isEnabled() {
  return true
}

/**
 * 同步模板到云数据库（直接写入）
 */
async function syncTemplateToCloud(id, templateData, action = 'create') {
  try {
    const payload = {
      id,
      name: templateData.name || '',
      subtitle: templateData.subtitle || '',
      category: templateData.category || '',
      cover: rewriteLocalhostUrl(templateData.cover),
      primaryColor: templateData.primaryColor || '#e84a6e',
      likes: templateData.likes || 0,
      pageCount: templateData.pageCount || 10,
      data: rewriteLocalhostUrls(templateData.data || {}),
      elements: templateData.elements || [],
      canvasSize: templateData.canvasSize || { width: 375, height: 667 },
      orientation: templateData.orientation || 'portrait',
      background: rewriteLocalhostUrl(templateData.background),
      tags: templateData.tags || [],
      status: templateData.status || 'published',
      renderedImage: rewriteLocalhostUrl(templateData.renderedImage),
      is_paid: templateData.is_paid || templateData.isPaid || 0,
      price: templateData.price || 0,
      is_premium: templateData.is_premium || templateData.isPremium || 0,
      vipLevel: templateData.vipLevel || (templateData.is_premium || templateData.isPremium ? 'pro' : (templateData.is_paid || templateData.isPaid ? 'personal' : 'free')),
      templateType: templateData.templateType || 'canvas',
      pages: rewriteLocalhostUrls(templateData.pages || []),
      createdAt: templateData.createdAt || Date.now(),
      updatedAt: Date.now(),
    }

    if (action === 'create') {
      await db.collection('templates').add(payload)
    } else {
      const existing = await db.collection('templates').where({ id }).get()
      if (existing.data.length > 0) {
        await db.collection('templates').doc(existing.data[0]._id).update(payload)
      } else {
        await db.collection('templates').add(payload)
      }
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
    const existing = await db.collection('templates').where({ id }).get()
    if (existing.data.length > 0) {
      await db.collection('templates').doc(existing.data[0]._id).remove()
      console.log(`[cloudSync] ✅ 模板已删除: ${id}`)
      return true
    }
    console.warn(`[cloudSync] ⚠️ 模板删除失败: ${id}, 云数据库中不存在`)
    return false
  } catch (e) {
    console.warn(`[cloudSync] ⚠️ 模板删除请求失败: ${id},`, e.message)
    return false
  }
}

module.exports = {
  isEnabled,
  syncTemplateToCloud,
  deleteTemplateFromCloud,
}
