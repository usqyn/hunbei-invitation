/**
 * 修复云数据库中字段类型错误的模板
 */
const initSqlJs = require('sql.js')
const path = require('path')
const fs = require('fs')
const tcb = require('@cloudbase/node-sdk')

const ENV_ID = 'cloud1-d4gyvmo1d9a1e148a'
const API_KEY = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjlkMWRjMzFlLWI0ZDAtNDQ4Yi1hNzZmLWIwY2M2M2Q4MTQ5OCJ9.eyJhdWQiOiJjbG91ZDEtZDRneXZtbzFkOWExZTE0OGEiLCJleHAiOjI1MzQwMjMwMDc5OSwiaWF0IjoxNzg1ODQ0ODQ5LCJhdF9oYXNoIjoibTBKZ2dGV2xTUXkzclJwMmliTUV5QSIsInByb2plY3RfaWQiOiJjbG91ZDEtZDRneXZtbzFkOWExZTE0OGEiLCJtZXRhIjp7InBsYXRmb3JtIjoiQXBpS2V5In0sImFkbWluaXN0cmF0b3JfaWQiOiIyMDgxNzAwNjQ4Mjc4NTk3NjM0IiwidXNlcl90eXBlIjoiIiwiY2xpZW50X3R5cGUiOiJjbGllbnRfc2VydmVyIiwiaXNfc3lzdGVtX2FkbWluIjp0cnVlfQ.Y5TYJuE3uqS2GIYJLxNm6-BobPE9Nycj9P7du0kICs0HF9ApclF4qNwh2Shi-j-hC9we-RD5uH99twQfbKLqgnrOxDmgjPm6IuollzgOgI1T3wxw0xyZVczYOLZFbp-Yjpg00G8gfQZQoEUXzNA0Sedv4qCQagegc1XcRXIJ20JgtlEoeNY1_QUw4rnhfv2Vi-BuuEyO44e3BMq6UIeTaK1FsFZ8kcBFLmccyKeUj_8jKbIXbtui-0omZ3-k453mhcg_KfW4JaxwCm0Fe2Hi20J6LZXZlTtEJGKJJBJjKdLg1cvYYxC8YyrPmIHDDAI-7TLuk01eqIZnLQdFguZUiw'
// 原生产资源域名（api 子域）公网不存在已废弃；兜底改用云 API 网关域名
const PRODUCTION_ASSETS_BASE = 'https://cloud1-d4gyvmo1d9a1e148a.service.tcloudbase.com'
const SERVER_DB_PATH = path.resolve(__dirname, '..', 'server', 'data.db')

const TARGET_IDS = [
  '0870bf37-44e9-44fa-9fe6-90f2aa6aa14a',
  '1b932703-bb50-4ff2-8bfa-003c4eab8bc1',
  '672e14d1-617d-4852-a8a0-09204747f67f',
  'f81841bf-d2f8-4daf-bebb-e8fe655fe86b',
  'b1303fe4-70ea-4b27-9ce5-5de78e71c348',
  '1ae9cb14-923c-44b0-994c-c7eecf1c3b32',
  '44319915-114d-442c-90e1-057a62c25612',
  '49c2689a-c29b-4a7d-bced-b2cbeb00df3c',
  'a98bd7b0-c367-4212-a939-0f0cf9e353f0',
  '9aba5b53-f25d-41e0-8008-b7e1e55b02dd',
]

function fixLocalhostUrl(url) {
  if (!url || typeof url !== 'string') return url || ''
  if (url.startsWith('cloud://')) return url
  if (url.startsWith('https://')) return url
  if (url.startsWith('http://')) {
    return url.replace(/^https?:\/\/(localhost|127\.0\.0\.1):\d+\//, PRODUCTION_ASSETS_BASE + '/')
  }
  if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
    return PRODUCTION_ASSETS_BASE + (url.startsWith('/') ? url : '/' + url)
  }
  return url
}

function fixLocalhostUrls(obj) {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(fixLocalhostUrls)
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = fixLocalhostUrl(value)
    } else if (typeof value === 'object' && value !== null) {
      result[key] = fixLocalhostUrls(value)
    } else {
      result[key] = value
    }
  }
  return result
}

async function main() {
  console.log('=== 修复云数据库模板数据 ===\n')

  console.log('读取本地 SQLite...')
  const SQL = await initSqlJs()
  if (!fs.existsSync(SERVER_DB_PATH)) {
    console.error('错误: 找不到', SERVER_DB_PATH)
    process.exit(1)
  }
  const localDb = new SQL.Database(fs.readFileSync(SERVER_DB_PATH))

  const localMap = {}
  const result = localDb.exec('SELECT id, name, elements, data, cover, pages, canvasSize, background, tags, status, subtitle, category, primaryColor, likes, pageCount, orientation, renderedImage, is_paid, price, is_premium, vipLevel, templateType FROM templates')
  if (result[0]) {
    result[0].values.forEach(row => {
      localMap[row[0]] = {
        id: row[0], name: row[1],
        elements: JSON.parse(row[2] || '[]'),
        data: JSON.parse(row[3] || '{}'),
        cover: row[4] || '',
        pages: JSON.parse(row[5] || '[]'),
        canvasSize: row[6] ? JSON.parse(row[6]) : null,
        background: row[7] ? JSON.parse(row[7]) : null,
        tags: row[8] ? JSON.parse(row[8]) : null,
        status: row[9] || 'published',
        subtitle: row[10] || '',
        category: row[11] || '',
        primaryColor: row[12] || '#e84a6e',
        likes: row[13] || 0,
        pageCount: row[14] || 10,
        orientation: row[15] || 'portrait',
        renderedImage: row[16] || '',
        is_paid: row[17] || 0,
        price: row[18] || 0,
        is_premium: row[19] || 0,
        vipLevel: row[20] || 'free',
        templateType: row[21] || 'canvas',
      }
    })
  }
  console.log(`本地数据库: ${Object.keys(localMap).length} 个模板\n`)

  console.log('连接云数据库...')
  const app = tcb.init({
    env: ENV_ID,
    accessKey: API_KEY,
    endpoint: `https://${ENV_ID}.api.tcloudbasegateway.com`,
  })
  const db = app.database()

  // 第一步：清理旧文档
  console.log('\n--- 清理旧文档 ---')
  for (const id of TARGET_IDS) {
    const existing = await db.collection('templates').where({ id }).limit(10).get()
    for (const doc of existing.data) {
      await db.collection('templates').doc(doc._id).remove()
      console.log(`  删除 _id=${doc._id}`)
    }
    // 删除 _id = id 的空文档
    try {
      const d = await db.collection('templates').doc(id).get()
      if (d.data) {
        await db.collection('templates').doc(id).remove()
        console.log(`  删除 _id=${id}`)
      }
    } catch (_) {}
  }
  // 也清理嵌套 data 中的文档
  const allDocs = await db.collection('templates').limit(1000).get()
  for (const doc of allDocs.data) {
    if (doc.data && doc.data.id && TARGET_IDS.includes(doc.data.id)) {
      await db.collection('templates').doc(doc._id).remove()
      console.log(`  删除嵌套文档 _id=${doc._id}`)
    }
  }

  // 第二步：重新创建（使用 doc(id).set(doc) 不带 data wrapper）
  console.log('\n--- 重新创建 ---')
  let fixed = 0
  let failed = 0

  for (const id of TARGET_IDS) {
    const local = localMap[id]
    if (!local) {
      console.log(`\n[${id}] 本地不存在，跳过`)
      continue
    }

    console.log(`\n[${id}] ${local.name}`)

    const doc = {
      id,
      name: local.name,
      subtitle: local.subtitle,
      category: local.category,
      cover: fixLocalhostUrl(local.cover),
      primaryColor: local.primaryColor,
      likes: local.likes,
      pageCount: local.pageCount,
      data: fixLocalhostUrls(local.data || {}),
      elements: fixLocalhostUrls(local.elements || []),
      canvasSize: local.canvasSize || { width: 375, height: 667 },
      orientation: local.orientation,
      background: fixLocalhostUrls(local.background || {}),
      tags: local.tags || [],
      status: local.status,
      renderedImage: fixLocalhostUrl(local.renderedImage),
      is_paid: local.is_paid,
      price: local.price,
      is_premium: local.is_premium,
      vipLevel: local.vipLevel,
      templateType: local.templateType,
      pages: fixLocalhostUrls(local.pages || []),
      createdAt: local.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    try {
      // doc(id).set(doc) 直接传文档对象，不带 data wrapper
      await db.collection('templates').doc(id).set(doc)
      console.log(`  [ok] 已创建 (docId: ${id})`)
      fixed++
    } catch (e) {
      console.error(`  [fail] ${e.message || e.errMsg}`)
      failed++
    }
  }

  console.log(`\n=== 修复完成: ${fixed} 成功, ${failed} 失败 ===`)

  // 验证
  console.log('\n--- 验证 ---')
  for (const id of TARGET_IDS) {
    const res = await db.collection('templates').doc(id).get()
    if (res.data) {
      const t = res.data
      const hasId = t.id === id
      const nameOk = t.name && t.name.length > 0
      const elementsOk = Array.isArray(t.elements)
      const dataOk = typeof t.data === 'object' && !Array.isArray(t.data)
      const noLocalhost = !JSON.stringify(t).includes('localhost')
      const status = hasId && nameOk && elementsOk && dataOk && noLocalhost ? 'OK' : 'FAIL'
      console.log(`[${id}] ${t.name} - ${status} (id=${hasId} name=${nameOk} elements=${elementsOk} data=${dataOk} noLocalhost=${noLocalhost})`)
    } else {
      console.log(`[${id}] 不存在!`)
    }
  }
}

main().catch(e => {
  console.error('FATAL:', e.message || e)
  process.exit(1)
})
