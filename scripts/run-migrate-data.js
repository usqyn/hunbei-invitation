/**
 * 数据迁移适配脚本：从本地 SQLite 迁移到云数据库
 * 使用 @cloudbase/node-sdk 替代 wx-server-sdk（支持本地运行）
 */
const path = require('path')
const fs = require('fs')
const initSqlJs = require('sql.js')

const ENV_ID = 'cloud1-d4gyvmo1d9a1e148a'
const SERVER_DIR = path.resolve(__dirname, '..', 'server')
const MAIN_DB_PATH = path.join(SERVER_DIR, 'data.db')
const POSTER_DB_PATH = path.join(SERVER_DIR, 'poster.db')
const BATCH_SIZE = 100

// 尝试加载 @cloudbase/node-sdk（通过 wx-server-sdk 内置）
let cloudbase
try {
  cloudbase = require('@cloudbase/node-sdk')
} catch (e) {
  try {
    // 有些 wx-server-sdk 版本下路径不同
    const sdkPath = require.resolve('wx-server-sdk')
    const nodeModulesPath = sdkPath.substring(0, sdkPath.indexOf('node_modules') + 12)
    cloudbase = require(path.join(nodeModulesPath, '@cloudbase', 'node-sdk'))
  } catch (e2) {
    console.error('❌ 无法加载 @cloudbase/node-sdk，请执行：npm install @cloudbase/node-sdk')
    process.exit(1)
  }
}

// 表映射配置
const TABLE_MAP = [
  { table: 'templates', collection: 'templates', pk: 'id', jsonFields: ['data', 'elements', 'tags', 'canvasSize', 'background', 'pages'] },
  { table: 'categories', collection: 'categories', pk: 'id', jsonFields: [] },
  { table: 'music', collection: 'music', pk: 'id', jsonFields: [] },
  { table: 'users', collection: 'users', pk: 'id', jsonFields: [] },
  { table: 'works', collection: 'works', pk: 'id', jsonFields: ['data'] },
  { table: 'orders', collection: 'orders', pk: 'id', jsonFields: ['items'] },
  { table: 'favorites', collection: 'favorites', pk: null, jsonFields: [] },
  { table: 'footprints', collection: 'footprints', pk: null, jsonFields: [] },
  { table: 'notifications', collection: 'notifications', pk: null, jsonFields: [] },
  { table: 'feedback', collection: 'feedback', pk: null, jsonFields: [] },
  { table: 'events', collection: 'events', pk: null, jsonFields: ['params'] },
  { table: 'recycle_bin', collection: 'recycle_bin', pk: null, jsonFields: ['work_data'] },
  { table: 'settings', collection: 'settings', pk: 'key', jsonFields: [] },
]

const POSTER_TABLE_MAP = [
  { table: 'poster_templates', collection: 'poster_templates', pk: 'id', jsonFields: ['config'] },
  { table: 'poster_works', collection: 'poster_works', pk: 'id', jsonFields: ['content'] },
  { table: 'recycle_bin', collection: 'recycle_bin_poster', pk: null, jsonFields: ['work_data'] },
]

const resultToObjects = (result) => {
  if (!result || !result.length || !result[0].values.length) return []
  const cols = result[0].columns
  return result[0].values.map(row => {
    const obj = {}
    row.forEach((val, i) => { obj[cols[i]] = val })
    return obj
  })
}

const deserializeJsonFields = (obj, jsonFields) => {
  jsonFields.forEach(f => {
    if (obj[f] !== undefined && obj[f] !== null && typeof obj[f] === 'string') {
      try { obj[f] = JSON.parse(obj[f]) } catch (_) {}
    }
  })
  return obj
}

const migrateTable = async (sqlDb, tableMap, db, stats) => {
  const { table, collection: collName, pk, jsonFields } = tableMap
  console.log(`\n📋 ${table} → ${collName}`)
  const result = sqlDb.exec(`SELECT * FROM ${table}`)
  const rows = resultToObjects(result)
  console.log(`   读取 ${rows.length} 条记录`)

  if (rows.length === 0) {
    stats[collName] = { total: 0, migrated: 0, failed: 0 }
    return
  }

  let migrated = 0
  let failed = 0
  const collection = db.collection(collName)

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map(r => deserializeJsonFields(r, jsonFields))
    for (const doc of batch) {
      try {
        const data = { ...doc }
        if (pk && data[pk] !== undefined && data[pk] !== null) {
          const _id = String(data[pk])
          delete data._id
          delete data[pk] // pk 字段作为 _id，不重复存储
          // 先尝试获取，存在则更新，不存在则创建
          try {
            await collection.doc(_id).get()
            await collection.doc(_id).update(data)
          } catch (getErr) {
            // 不存在，创建
            await collection.doc(_id).set(data)
          }
        } else {
          await collection.add(data)
        }
        migrated++
      } catch (e) {
        console.warn(`   ⚠️ 插入失败 (${table}):`, e.message || e.code || e)
        failed++
      }
    }
    const progress = Math.min(i + BATCH_SIZE, rows.length)
    process.stdout.write(`   进度: ${progress}/${rows.length}\r`)
  }
  console.log(`\n   ✅ 完成: 成功 ${migrated}, 失败 ${failed}`)
  stats[collName] = { total: rows.length, migrated, failed }
}

const main = async () => {
  console.log('🚀 开始 SQL → 云数据库 数据迁移')
  console.log(`   环境: ${ENV_ID}`)
  console.log(`   主库: ${MAIN_DB_PATH}`)
  console.log(`   Poster库: ${POSTER_DB_PATH}`)

  if (!fs.existsSync(MAIN_DB_PATH)) {
    console.error('❌ 主库不存在')
    process.exit(1)
  }

  // 初始化云开发
  console.log('\n🔑 初始化云开发连接...')
  const app = cloudbase.init({ env: ENV_ID })
  const db = app.database()

  // 初始化 sql.js
  console.log('📂 读取 SQLite 数据库...')
  const SQL = await initSqlJs()
  const mainDb = new SQL.Database(fs.readFileSync(MAIN_DB_PATH))
  const posterDb = fs.existsSync(POSTER_DB_PATH)
    ? new SQL.Database(fs.readFileSync(POSTER_DB_PATH))
    : null

  const stats = {}

  // 迁移主库
  console.log('\n========== 迁移主库 ==========')
  for (const tableMap of TABLE_MAP) {
    try {
      await migrateTable(mainDb, tableMap, db, stats)
    } catch (e) {
      console.error(`❌ ${tableMap.table} 失败:`, e.message)
      stats[tableMap.collection] = { error: e.message }
    }
  }

  // 迁移 poster 库
  if (posterDb) {
    console.log('\n========== 迁移 Poster 库 ==========')
    for (const tableMap of POSTER_TABLE_MAP) {
      try {
        await migrateTable(posterDb, tableMap, db, stats)
      } catch (e) {
        console.error(`❌ ${tableMap.table} 失败:`, e.message)
        stats[tableMap.collection] = { error: e.message }
      }
    }
  }

  console.log('\n========== 迁移统计 ==========')
  Object.entries(stats).forEach(([coll, s]) => {
    if (s.error) console.log(`  ❌ ${coll}: ${s.error}`)
    else console.log(`  ${s.migrated === s.total ? '✅' : '⚠️'} ${coll}: ${s.migrated}/${s.total} (失败 ${s.failed})`)
  })
  console.log('\n🎉 数据迁移完成！')
}

main().catch(e => {
  console.error('❌ 迁移失败:', e.message || e)
  process.exit(1)
})
