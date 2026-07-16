// ============ migrate-data.js：SQL→NoSQL 数据迁移脚本 ============
// 读取本地 server/data.db 和 server/poster.db（sql.js），转换后批量写入云数据库。
//
// 用法：
//   1. 安装依赖：在 cloudfunctions/ 目录下执行
//      npm install sql.js wx-server-sdk
//   2. 配置环境变量（云开发环境 ID）
//      export TCB_ENV_ID=cloud1-d1g9id3fjffcefe0d
//   3. 执行迁移：
//      node migrate-data.js
//
// 注意：
// - 沙箱无云环境授权，本脚本无法在沙箱运行；请在本地或 CI 环境执行
// - 已存在记录用「先 delete by 主键，再 add」模式（INSERT OR REPLACE 语义）
// - JSON 字符串字段（data/elements/tags/canvasSize/background/pages/config/content/work_data）反序列化为对象存储
// - 时间字段保持原样（字符串或毫秒数值）
// - 每批 100 条批量插入

const path = require('path')
const fs = require('fs')
let initSqlJs
try { initSqlJs = require('sql.js') } catch (e) {
  console.error('❌ 缺少依赖 sql.js，请先执行：npm install sql.js wx-server-sdk')
  process.exit(1)
}

// ============ 配置 ============
const ENV_ID = process.env.TCB_ENV_ID || 'cloud1-d1g9id3fjffcefe0d'
const SERVER_DIR = path.resolve(__dirname, '..', 'server')
const MAIN_DB_PATH = path.join(SERVER_DIR, 'data.db')
const POSTER_DB_PATH = path.join(SERVER_DIR, 'poster.db')
const BATCH_SIZE = 100

// 主库表 → 集合映射（表名: 集合名, 主键字段）
// SQL 表名与集合名一致，主键字段用于去重
// pk 设为 'id' 时，云端 _id = String(id)，保留原 id 连续性（works.music_id 等外键引用不中断）
// pk 为 null 时，云端 _id 自动生成（仅用于无外键引用的日志/记录类表）
const TABLE_MAP = [
  { table: 'templates', collection: 'templates', pk: 'id', jsonFields: ['data', 'elements', 'tags', 'canvasSize', 'background', 'pages'] },
  { table: 'categories', collection: 'categories', pk: 'id', jsonFields: [] },
  // music 用 'id' 作 _id：works.music_id 引用原数字 id，必须保持一致
  { table: 'music', collection: 'music', pk: 'id', jsonFields: [] },
  { table: 'users', collection: 'users', pk: 'id', jsonFields: [] },
  { table: 'works', collection: 'works', pk: 'id', jsonFields: ['data'] },
  { table: 'orders', collection: 'orders', pk: 'id', jsonFields: ['items'] },
  // 以下表无外键引用，用自动 _id 即可；保留原 id 字段供查询
  { table: 'favorites', collection: 'favorites', pk: null, jsonFields: [] },
  { table: 'footprints', collection: 'footprints', pk: null, jsonFields: [] },
  { table: 'notifications', collection: 'notifications', pk: null, jsonFields: [] },
  { table: 'feedback', collection: 'feedback', pk: null, jsonFields: [] },
  { table: 'events', collection: 'events', pk: null, jsonFields: ['params'] },
  { table: 'recycle_bin', collection: 'recycle_bin', pk: null, jsonFields: ['work_data'] },
  { table: 'settings', collection: 'settings', pk: 'key', jsonFields: [] },
]

// poster 库表 → 集合映射
const POSTER_TABLE_MAP = [
  { table: 'poster_templates', collection: 'poster_templates', pk: 'id', jsonFields: ['config'] },
  { table: 'poster_works', collection: 'poster_works', pk: 'id', jsonFields: ['content'] },
  { table: 'recycle_bin', collection: 'recycle_bin_poster', pk: null, jsonFields: ['work_data'] },
]

// ============ 工具：把 sql.js 结果转为对象数组 ============
const resultToObjects = (result) => {
  if (!result || !result.length || !result[0].values.length) return []
  const cols = result[0].columns
  return result[0].values.map(row => {
    const obj = {}
    row.forEach((val, i) => { obj[cols[i]] = val })
    return obj
  })
}

// 反序列化 JSON 字段（NoSQL 原生支持嵌套对象）
const deserializeJsonFields = (obj, jsonFields) => {
  jsonFields.forEach(f => {
    if (obj[f] !== undefined && obj[f] !== null && typeof obj[f] === 'string') {
      try { obj[f] = JSON.parse(obj[f]) } catch (_) { /* 保留原字符串 */ }
    }
  })
  return obj
}

// ============ 迁移单张表 ============
// 策略：有主键的表用 doc(_id).set() 原子 upsert（避免先删后插的数据缺失窗口）
//       无主键的表用 add（自动生成 _id）
const migrateTable = async (sqlDb, tableMap, db, stats) => {
  const { table, collection: collName, pk, jsonFields } = tableMap
  console.log(`\n📋 迁移表 ${table} → 集合 ${collName}`)
  const result = sqlDb.exec(`SELECT * FROM ${table}`)
  const rows = resultToObjects(result)
  console.log(`   读取 ${rows.length} 条记录`)

  if (rows.length === 0) {
    stats[collName] = { total: 0, migrated: 0, failed: 0 }
    return
  }

  // 反序列化 JSON 字段 + upsert/insert
  let migrated = 0
  let failed = 0
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map(r => deserializeJsonFields(r, jsonFields))
    for (const doc of batch) {
      try {
        const data = { ...doc }
        if (pk && data[pk] !== undefined && data[pk] !== null) {
          // 有主键：用 doc(_id).set() 原子替换（upsert 语义，不存在则创建，存在则替换）
          // _id 不能是数字类型，需转字符串；set 时 data 中不应包含 _id
          const _id = String(data[pk])
          delete data._id
          // 保留原始 pk 字段值作为普通字段写入
          await db.collection(collName).doc(_id).set({ data })
        } else {
          // 无主键：直接 add（_id 自动生成）
          await db.collection(collName).add({ data })
        }
        migrated++
      } catch (e) {
        console.warn(`   插入失败 (表 ${table}):`, e.errMsg || e.message)
        failed++
      }
    }
    process.stdout.write(`   进度: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}\r`)
  }
  console.log(`   ✅ 完成：成功 ${migrated}，失败 ${failed}`)
  stats[collName] = { total: rows.length, migrated, failed }
}

// ============ 主流程 ============
const main = async () => {
  console.log('🚀 开始 SQL → NoSQL 数据迁移')
  console.log(`   云环境 ID: ${ENV_ID}`)
  console.log(`   主库: ${MAIN_DB_PATH}`)
  console.log(`   Poster 库: ${POSTER_DB_PATH}`)

  if (!fs.existsSync(MAIN_DB_PATH)) {
    console.error(`❌ 主库不存在: ${MAIN_DB_PATH}`)
    process.exit(1)
  }

  // 初始化 sql.js
  const SQL = await initSqlJs()
  const mainDb = new SQL.Database(fs.readFileSync(MAIN_DB_PATH))
  const posterDb = fs.existsSync(POSTER_DB_PATH)
    ? new SQL.Database(fs.readFileSync(POSTER_DB_PATH))
    : null

  // 初始化云开发 SDK（用 wx-server-sdk 的 tcb 模式）
  const cloud = require('wx-server-sdk')
  cloud.init({ env: ENV_ID })
  const db = cloud.database()

  const stats = {}

  // 迁移主库
  console.log('\n========== 迁移主库 ==========')
  for (const tableMap of TABLE_MAP) {
    try {
      await migrateTable(mainDb, tableMap, db, stats)
    } catch (e) {
      console.error(`❌ 表 ${tableMap.table} 迁移失败:`, e.message)
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
        console.error(`❌ 表 ${tableMap.table} 迁移失败:`, e.message)
        stats[tableMap.collection] = { error: e.message }
      }
    }
  } else {
    console.log('\n⚠️  Poster 库不存在，跳过')
  }

  // 输出统计
  console.log('\n========== 迁移统计 ==========')
  Object.entries(stats).forEach(([coll, s]) => {
    if (s.error) {
      console.log(`  ❌ ${coll}: 错误 - ${s.error}`)
    } else {
      console.log(`  ${s.migrated === s.total ? '✅' : '⚠️'} ${coll}: ${s.migrated}/${s.total} (失败 ${s.failed})`)
    }
  })
  console.log('\n🎉 数据迁移完成')
}

main().catch(e => {
  console.error('迁移失败:', e)
  process.exit(1)
})
