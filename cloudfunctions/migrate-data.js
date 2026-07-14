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
const TABLE_MAP = [
  { table: 'templates', collection: 'templates', pk: 'id', jsonFields: ['data', 'elements', 'tags', 'canvasSize', 'background', 'pages'] },
  { table: 'categories', collection: 'categories', pk: 'id', jsonFields: [] },
  { table: 'music', collection: 'music', pk: null, jsonFields: [] },
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

  // 按主键去重：先删除已存在记录
  if (pk) {
    console.log(`   按主键 ${pk} 去重（先删后插）`)
    const pkValues = rows.map(r => r[pk]).filter(Boolean)
    // 分批删除（云数据库 in 查询上限 500）
    for (let i = 0; i < pkValues.length; i += BATCH_SIZE) {
      const batch = pkValues.slice(i, i + BATCH_SIZE)
      try {
        await db.collection(collName).where({ [pk]: db.command.in(batch) }).remove()
      } catch (e) {
        console.warn(`   删除批次 ${i} 失败（可忽略，可能集合为空）:`, e.errMsg || e.message)
      }
    }
  }

  // 反序列化 JSON 字段 + 批量插入
  let migrated = 0
  let failed = 0
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map(r => deserializeJsonFields(r, jsonFields))
    for (const doc of batch) {
      try {
        // 若有主键，把它设为 _id（云数据库 _id 是默认主键）
        // 注意：_id 不能是数字类型，需转字符串
        const data = { ...doc }
        if (pk && data[pk] !== undefined && data[pk] !== null) {
          data._id = String(data[pk])
        }
        await db.collection(collName).add({ data })
        migrated++
      } catch (e) {
        // 主键冲突等错误跳过
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
