/**
 * 一键同步脚本：本地 SQLite → 微信云数据库
 * 用法：node scripts/sync-to-cloud.js [模板ID|all]
 *   不传参：同步所有已发布模板
 *   传模板ID：只同步指定模板
 */
const initSqlJs = require('sql.js')
const fs = require('fs')
const path = require('path')
const tcb = require('@cloudbase/node-sdk')

const ENV_ID = 'cloud1-d4gyvmo1d9a1e148a'
const DB_PATH = path.join(__dirname, '..', 'server', 'data.db')

// 生产域名：与 server/cloudSync.js 保持一致
const ASSETS_BASE = process.env.ASSETS_BASE || 'https://api.TOYtamaxia.com'

/**
 * 将 localhost/127.0.0.1 的 URL 替换为 HTTPS 生产域名
 * 与 server/cloudSync.js 的 rewriteLocalhostUrl 行为一致
 */
function rewriteLocalhostUrl(url) {
  if (!url || typeof url !== 'string') return url || ''
  return url
    .replace(/https?:\/\/(localhost|127\.0\.0\.1):\d+\//g, ASSETS_BASE.endsWith('/') ? ASSETS_BASE : ASSETS_BASE + '/')
}

/**
 * 递归替换对象/数组中的所有字符串值中的 localhost URL
 * 用于 data / elements / pages / background 等嵌套结构
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

// 初始化云开发（使用 API Key 鉴权）
const API_KEY = process.env.CLOUDBASE_APIKEY || 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjlkMWRjMzFlLWI0ZDAtNDQ4Yi1hNzZmLWIwY2M2M2Q4MTQ5OCJ9.eyJhdWQiOiJjbG91ZDEtZDRneXZtbzFkOWExZTE0OGEiLCJleHAiOjI1MzQwMjMwMDc5OSwiaWF0IjoxNzg1ODQ0ODQ5LCJhdF9oYXNoIjoibTBKZ2dGV2xTUXkzclJwMmliTUV5QSIsInByb2plY3RfaWQiOiJjbG91ZDEtZDRneXZtbzFkOWExZTE0OGEiLCJtZXRhIjp7InBsYXRmb3JtIjoiQXBpS2V5In0sImFkbWluaXN0cmF0b3JfaWQiOiIyMDgxNzAwNjQ4Mjc4NTk3NjM0IiwidXNlcl90eXBlIjoiIiwiY2xpZW50X3R5cGUiOiJjbGllbnRfc2VydmVyIiwiaXNfc3lzdGVtX2FkbWluIjp0cnVlfQ.Y5TYJuE3uqS2GIYJLxNm6-BobPE9Nycj9P7du0kICs0HF9ApclF4qNwh2Shi-j-hC9we-RD5uH99twQfbKLqgnrOxDmgjPm6IuollzgOgI1T3wxw0xyZVczYOLZFbp-Yjpg00G8gfQZQoEUXzNA0Sedv4qCQagegc1XcRXIJ20JgtlEoeNY1_QUw4rnhfv2Vi-BuuEyO44e3BMq6UIeTaK1FsFZ8kcBFLmccyKeUj_8jKbIXbtui-0omZ3-k453mhcg_KfW4JaxwCm0Fe2Hi20J6LZXZlTtEJGKJJBJjKdLg1cvYYxC8YyrPmIHDDAI-7TLuk01eqIZnLQdFguZUiw'
const app = tcb.init({
  env: ENV_ID,
  accessKey: API_KEY,
  endpoint: `https://${ENV_ID}.api.tcloudbasegateway.com`,
})

const db = app.database()

async function main() {
  const targetId = process.argv[2] || null

  // 读取本地 SQLite
  const SQL = await initSqlJs()
  const fileBuffer = fs.readFileSync(DB_PATH)
  const sqlDb = new SQL.Database(fileBuffer)

  let query = "SELECT * FROM templates WHERE status = 'published'"
  if (targetId && targetId !== 'all') {
    query += " AND id = ?"
  }
  const result = sqlDb.exec(query, targetId && targetId !== 'all' ? [targetId] : [])
  sqlDb.close()

  if (!result.length || !result[0].values.length) {
    console.log(targetId ? `未找到模板: ${targetId}` : '没有已发布模板')
    return
  }

  const cols = result[0].columns
  const templates = result[0].values.map(row => {
    const obj = {}
    row.forEach((v, i) => { obj[cols[i]] = v })
    return obj
  })

  console.log(`找到 ${templates.length} 个模板，开始同步...`)

  for (const t of templates) {
    // 解析 JSON 字段
    let data = {}
    try { data = typeof t.data === 'string' ? JSON.parse(t.data) : (t.data || {}) } catch {}
    let elements = []
    try { elements = typeof t.elements === 'string' ? JSON.parse(t.elements) : (t.elements || []) } catch {}
    let tags = []
    try { tags = typeof t.tags === 'string' ? JSON.parse(t.tags) : (t.tags || []) } catch {}
    let pages = []
    try { pages = typeof t.pages === 'string' ? JSON.parse(t.pages) : (t.pages || []) } catch {}
    let canvasSize = {}
    try { canvasSize = typeof t.canvas_size === 'string' ? JSON.parse(t.canvas_size) : (t.canvas_size || { width: 375, height: 667 }) } catch {}
    // background：SQLite 存的是 JSON 字符串，需 parse 成对象后递归改写 localhost URL
    let background = {}
    try { background = typeof t.background === 'string' ? JSON.parse(t.background) : (t.background || {}) } catch {}

    // 云数据库文档格式（字段名与 SQLite 一致）
    // 所有可能含 localhost URL 的字段都做改写，与 server/cloudSync.js 行为一致
    const cloudDoc = {
      id: t.id,
      name: t.name || '',
      subtitle: t.subtitle || '',
      category: t.category || '',
      cover: rewriteLocalhostUrl(t.cover || ''),
      primaryColor: t.primaryColor || '#e84a6e',
      likes: t.likes || 0,
      pageCount: t.pageCount || 10,
      data: rewriteLocalhostUrls(data),
      elements: rewriteLocalhostUrls(elements),
      tags,
      pages: rewriteLocalhostUrls(pages),
      canvasSize,
      orientation: t.orientation || 'portrait',
      background: rewriteLocalhostUrls(background),
      status: t.status || 'published',
      renderedImage: rewriteLocalhostUrl(t.renderedImage || ''),
      is_paid: t.is_paid || 0,
      price: t.price || 0,
      is_premium: t.is_premium || 0,
      vipLevel: t.vipLevel || 'free',
      templateType: t.templateType || 'canvas',
      createdAt: t.createdAt || new Date().toISOString(),
      updatedAt: t.updatedAt || new Date().toISOString(),
    }

    try {
      // 先查是否存在（用 id 字段匹配）
      const existRes = await db.collection('templates').where({ id: t.id }).get()

      if (existRes.data && existRes.data.length > 0) {
        // 更新
        const docId = existRes.data[0]._id
        await db.collection('templates').doc(docId).update(cloudDoc)
        console.log(`✅ 已更新: ${t.name} (${t.id})`)
      } else {
        // 新增
        await db.collection('templates').add(cloudDoc)
        console.log(`✅ 已新增: ${t.name} (${t.id})`)
      }
    } catch (e) {
      console.error(`❌ 同步失败: ${t.name} (${t.id})`, e.message)
    }
  }

  console.log('\n同步完成！')
}

main().catch(e => {
  console.error('同步脚本执行失败:', e.message)
  process.exit(1)
})
