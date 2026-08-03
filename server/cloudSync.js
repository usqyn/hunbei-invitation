/**
 * 云同步模块
 * 在 admin 发布模板时，通过云函数 HTTP 接口自动同步到云数据库
 *
 * 流程：
 *   server POST/PUT template → 保存本地 SQLite → 响应返回
 *   → 异步调用云函数 HTTP 接口 → 云函数写云 DB
 *
 * 鉴权：server 签发 admin JWT token，云函数用 requireAdmin 验证
 */

const https = require('https')
const http = require('http')
const jwt = require('jsonwebtoken')

// 云函数 HTTP 触发器地址
const CLOUD_FN_URL = process.env.CLOUD_FN_URL || 'https://cloud1-d4gyvmo1d9a1e148a.ap-guangzhou.app.tcloudbase.com'
const JWT_SECRET = process.env.JWT_SECRET || 'TOYtamaxia-test-secret'
const ADMIN_PHONE = process.env.ADMIN_PHONE || '13800138000'
const ASSETS_BASE = process.env.ASSETS_BASE || 'https://api.TOYtamaxia.com'

/**
 * 将 localhost/127.0.0.1 的 URL 替换为 HTTPS 生产域名
 * 避免同步到云数据库后小程序加载图片被微信拦截
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

let _enabled = true

function isEnabled() {
  return _enabled
}

/**
 * 生成 admin JWT token（与 server JWT 格式完全一致）
 */
function generateAdminToken() {
  return jwt.sign(
    { phone: ADMIN_PHONE, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  )
}

/**
 * HTTP 请求封装
 */
function httpRequest(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const token = generateAdminToken()
    const url = new URL(urlPath, CLOUD_FN_URL)
    const isHttps = url.protocol === 'https:'
    const transport = isHttps ? https : http
    const bodyStr = body ? JSON.stringify(body) : ''

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(bodyStr),
      },
      timeout: 15000,
    }

    const req = transport.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          resolve({ statusCode: res.statusCode, body: json })
        } catch {
          resolve({ statusCode: res.statusCode, body: data })
        }
      })
    })

    req.on('error', (e) => reject(e))
    req.on('timeout', () => { req.destroy(); reject(new Error('请求超时')) })

    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

/**
 * 同步模板到云数据库
 * 通过云函数 HTTP 接口 POST/PUT
 */
async function syncTemplateToCloud(id, templateData, action = 'create') {
  try {
    // 构建云函数模板数据格式（与 createTemplate/updateTemplate 一致）
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
      vipLevel: templateData.vipLevel || 'free',
      templateType: templateData.templateType || 'canvas',
      pages: rewriteLocalhostUrls(templateData.pages || []),
    }

    let result
    if (action === 'create') {
      result = await httpRequest('POST', '/api/templates', payload)
    } else {
      result = await httpRequest('PUT', `/api/templates/${id}`, payload)
    }

    if (result.statusCode >= 200 && result.statusCode < 300) {
      console.log(`[cloudSync] ✅ 模板已同步: ${action} ${id} (${templateData.name})`)
      return true
    } else {
      console.warn(`[cloudSync] ⚠️ 模板同步失败: ${action} ${id}, HTTP ${result.statusCode}:`, JSON.stringify(result.body).substring(0, 200))
      return false
    }
  } catch (e) {
    console.warn(`[cloudSync] ⚠️ 模板同步请求失败: ${action} ${id},`, e.message)
    return false
  }
}

/**
 * 从云数据库删除模板
 */
async function deleteTemplateFromCloud(id) {
  try {
    const result = await httpRequest('DELETE', `/api/templates/${id}`)
    if (result.statusCode >= 200 && result.statusCode < 300) {
      console.log(`[cloudSync] ✅ 模板已删除: ${id}`)
      return true
    } else {
      console.warn(`[cloudSync] ⚠️ 模板删除失败: ${id}, HTTP ${result.statusCode}`)
      return false
    }
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
