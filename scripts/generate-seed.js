/**
 * 生成种子数据云函数（去掉 base64 图片，只保留元数据）
 */
const path = require('path')
const fs = require('fs')
const initSqlJs = require('sql.js')

const SERVER_DIR = path.resolve(__dirname, '..', 'server')
const MAIN_DB_PATH = path.join(SERVER_DIR, 'data.db')
const POSTER_DB_PATH = path.join(SERVER_DIR, 'poster.db')
const OUT_DIR = path.resolve(__dirname, '..', 'cloudfunctions', 'seed-data')
const ENV_ID = 'cloud1-d4gyvmo1d9a1e148a'

// base64 图片正则
const BASE64_RE = /^data:image\/\w+;base64,/

const resultToObjects = (result) => {
  if (!result || !result.length || !result[0].values.length) return []
  const cols = result[0].columns
  return result[0].values.map(row => {
    const obj = {}
    row.forEach((val, i) => { obj[cols[i]] = val })
    return obj
  })
}

// 递归清除对象中的 base64 图片数据
function stripBase64(obj) {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'string' && BASE64_RE.test(obj)) {
    return '' // 清空 base64 图片
  }
  if (Array.isArray(obj)) return obj.map(stripBase64)
  if (typeof obj === 'object') {
    const result = {}
    for (const [k, v] of Object.entries(obj)) {
      result[k] = stripBase64(v)
    }
    return result
  }
  return obj
}

const deserializeJsonFields = (obj, fields) => {
  (fields || []).forEach(f => {
    if (obj[f] !== undefined && obj[f] !== null && typeof obj[f] === 'string') {
      try {
        const parsed = JSON.parse(obj[f])
        obj[f] = stripBase64(parsed) // 清空 base64
      } catch (_) {
        // 检查是否是 base64 字符串
        if (BASE64_RE.test(obj[f])) obj[f] = ''
      }
    }
  })
  return obj
}

const main = async () => {
  console.log('📂 读取 SQLite...')
  const SQL = await initSqlJs()
  const mainDb = new SQL.Database(fs.readFileSync(MAIN_DB_PATH))

  let posterDb = null
  if (fs.existsSync(POSTER_DB_PATH)) {
    posterDb = new SQL.Database(fs.readFileSync(POSTER_DB_PATH))
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  const seedData = {}
  const tables = [
    { name: 'templates', db: mainDb, jsonFields: ['data', 'elements', 'tags', 'canvasSize', 'background', 'pages'], pk: 'id' },
    { name: 'categories', db: mainDb, jsonFields: [], pk: 'id' },
    { name: 'music', db: mainDb, jsonFields: [], pk: 'id' },
    { name: 'settings', db: mainDb, jsonFields: [], pk: 'key' },
    { name: 'poster_templates', db: posterDb, jsonFields: ['config'], pk: 'id' },
  ]

  for (const { name, db, jsonFields, pk } of tables) {
    if (!db) continue
    try {
      const result = db.exec(`SELECT * FROM ${name}`)
      if (!result || !result.length || !result[0].values.length) continue
      const rows = resultToObjects(result).map(r => deserializeJsonFields(r, jsonFields))
      seedData[name] = rows

      const size = JSON.stringify(rows).length
      console.log(`  ${name}: ${rows.length} 条, ${(size / 1024).toFixed(1)} KB`)
    } catch (e) {
      console.log(`  ${name}: 跳过 (${e.message})`)
    }
  }

  const jsonPath = path.join(OUT_DIR, 'seed.json')
  fs.writeFileSync(jsonPath, JSON.stringify(seedData, null, 2), 'utf-8')
  const totalSize = fs.statSync(jsonPath).size
  console.log(`\n📦 种子数据: ${(totalSize / 1024).toFixed(0)} KB`)

  // 生成 index.js
  const indexCode = `/**
 * 种子数据导入云函数（无图片版）
 * 导入模板、分类、音乐、设置的基础数据
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: '${ENV_ID}' })
const db = cloud.database()
const seedData = require('./seed.json')

const TABLE_MAP = {
  templates: { collection: 'templates', pk: 'id' },
  categories: { collection: 'categories', pk: 'id' },
  music: { collection: 'music', pk: 'id' },
  settings: { collection: 'settings', pk: 'key' },
  poster_templates: { collection: 'poster_templates', pk: 'id' }
}

async function importTable(name, rows) {
  const cfg = TABLE_MAP[name]
  if (!cfg) return { error: 'unknown table: ' + name }

  let created = 0, updated = 0, failed = 0

  for (const row of rows) {
    const data = { ...row }
    try {
      if (cfg.pk && data[cfg.pk] !== undefined && data[cfg.pk] !== null) {
        const _id = String(data[cfg.pk])
        delete data._id
        delete data[cfg.pk]
        try {
          await db.collection(cfg.collection).doc(_id).get()
          await db.collection(cfg.collection).doc(_id).update(data)
          updated++
        } catch (getErr) {
          await db.collection(cfg.collection).doc(_id).set(data)
          created++
        }
      } else {
        await db.collection(cfg.collection).add(data)
        created++
      }
    } catch (e) {
      failed++
      if (failed <= 5) console.warn('⚠️', cfg.collection, '失败:', e.message?.substring(0, 80))
    }
  }

  return { total: rows.length, created, updated, failed }
}

exports.main = async (event, context) => {
  const target = event.table || 'all'
  const results = {}

  console.log('📋 开始导入种子数据，目标:', target)

  for (const [name, rows] of Object.entries(seedData)) {
    if (target !== 'all' && name !== target) continue
    if (!rows || rows.length === 0) continue

    console.log(\`  导入 \${name}: \${rows.length} 条...\`)
    try {
      results[name] = await importTable(name, rows)
      console.log(\`  ✅ \${name}: created \${results[name].created}, updated \${results[name].updated}, failed \${results[name].failed}\`)
    } catch (e) {
      results[name] = { error: e.message?.substring(0, 100) }
      console.error(\`  ❌ \${name}: \${e.message}\`)
    }
  }

  return { success: true, results }
}
`

  fs.writeFileSync(path.join(OUT_DIR, 'index.js'), indexCode, 'utf-8')

  // package.json
  if (!fs.existsSync(path.join(OUT_DIR, 'package.json'))) {
    fs.writeFileSync(path.join(OUT_DIR, 'package.json'), JSON.stringify({
      name: 'seed-data',
      version: '1.0.0',
      main: 'index.js',
      dependencies: { 'wx-server-sdk': 'latest' }
    }, null, 2), 'utf-8')
  }

  console.log('✅ seed-data 已生成！')
  console.log('   部署后云端测试：{"table":"all"} 即可导入全部基础数据')
}

main().catch(e => { console.error('失败:', e); process.exit(1) })
