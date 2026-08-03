// ============ 1. 从 SQLite 提取数据 → JSON 分批文件 ============
const path = require('path')
const fs = require('fs')
const initSqlJs = require('sql.js')

const ENV_ID = process.env.TCB_ENV_ID || 'cloud1-d4gyvmo1d9a1e148a'
const SERVER_DIR = path.resolve(__dirname, '..', 'server')
const MAIN_DB_PATH = path.join(SERVER_DIR, 'data.db')
const POSTER_DB_PATH = path.join(SERVER_DIR, 'poster.db')
const OUTPUT_DIR = path.resolve(__dirname, '..', '.migration_batches')
const BATCH_SIZE = 50  // 每批 50 条

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

// ============ 提取并分批写入文件 ============
const extractTable = (db, tableMap) => {
  const { table, collection, pk, jsonFields } = tableMap
  const result = db.exec(`SELECT * FROM "${table}"`)
  const rows = resultToObjects(result).map(r => deserializeJsonFields(r, jsonFields))
  const batches = []
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    batches.push(rows.slice(i, i + BATCH_SIZE))
  }
  return { collection, pk, batches, total: rows.length }
}

const main = async () => {
  console.log('Reading SQLite databases...')
  const SQL = await initSqlJs()

  if (!fs.existsSync(MAIN_DB_PATH)) {
    console.error(`Main DB not found: ${MAIN_DB_PATH}`)
    process.exit(1)
  }

  const mainDb = new SQL.Database(fs.readFileSync(MAIN_DB_PATH))
  const posterDb = fs.existsSync(POSTER_DB_PATH)
    ? new SQL.Database(fs.readFileSync(POSTER_DB_PATH))
    : null

  // 清理旧输出
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true })
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const manifest = []

  const extractAll = (db, maps, dbLabel) => {
    for (const m of maps) {
      try {
        const { collection, pk, batches, total } = extractTable(db, m)
        console.log(`  ${dbLabel}/${m.table} → ${collection}: ${total} records in ${batches.length} batches`)
        for (let i = 0; i < batches.length; i++) {
          const fileName = `${collection}_batch${i.toString().padStart(3, '0')}.json`
          fs.writeFileSync(path.join(OUTPUT_DIR, fileName), JSON.stringify(batches[i]))
        }
        manifest.push({ collection, pk, batchCount: batches.length, total })
      } catch (e) {
        console.log(`  SKIP ${dbLabel}/${m.table}: ${e.message}`)
      }
    }
  }

  extractAll(mainDb, TABLE_MAP, 'main')
  if (posterDb) extractAll(posterDb, POSTER_TABLE_MAP, 'poster')

  // 写入 manifest
  fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))

  const totalRecords = manifest.reduce((s, m) => s + m.total, 0)
  const totalBatches = manifest.reduce((s, m) => s + m.batchCount, 0)
  const totalSize = fs.readdirSync(OUTPUT_DIR).reduce((s, f) => s + fs.statSync(path.join(OUTPUT_DIR, f)).size, 0)

  console.log(`\nDone: ${totalRecords} records → ${totalBatches} batch files (${(totalSize/1024).toFixed(0)} KB)`)
  console.log(`Output: ${OUTPUT_DIR}`)

  // 输出上传命令提示
  console.log(`\n========== NEXT STEP ==========`)
  console.log(`1. 部署 migrate 云函数（含 importBatch 接口）`)
  console.log(`2. 运行: node upload-batches.js`)
}

main().catch(e => { console.error(e); process.exit(1) })
