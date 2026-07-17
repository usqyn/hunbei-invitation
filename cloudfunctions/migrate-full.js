const path = require('path')
const fs = require('fs')
let initSqlJs
try { initSqlJs = require('sql.js') } catch (e) {
  console.error('Need sql.js: npm install sql.js wx-server-sdk')
  process.exit(1)
}

const ENV_ID = process.env.TCB_ENV_ID || 'cloud1-d1g9id3fjffcefe0d'
const SERVER_DIR = path.resolve(__dirname, '..', 'server')
const MAIN_DB_PATH = path.join(SERVER_DIR, 'data.db')
const POSTER_DB_PATH = path.join(SERVER_DIR, 'poster.db')
const BATCH_SIZE = 100

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
  console.log(`\n${table} → ${collName}`)
  const result = sqlDb.exec(`SELECT * FROM ${table}`)
  const rows = resultToObjects(result)
  console.log(`  ${rows.length} records`)

  if (rows.length === 0) {
    stats[collName] = { total: 0, migrated: 0, failed: 0 }
    return
  }

  let migrated = 0
  let failed = 0

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map(r => deserializeJsonFields(r, jsonFields))
    for (const doc of batch) {
      try {
        const data = { ...doc }
        if (pk && data[pk] !== undefined && data[pk] !== null) {
          const _id = String(data[pk])
          delete data._id
          await db.collection(collName).doc(_id).set({ data })
        } else {
          await db.collection(collName).add({ data })
        }
        migrated++
      } catch (e) {
        console.log(`  FAIL ${table}: ${e.errMsg || e.message}`)
        failed++
      }
    }
    process.stdout.write(`  ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}\r`)
  }
  console.log(`  Done: ${migrated} ok, ${failed} failed`)
  stats[collName] = { total: rows.length, migrated, failed }
}

const main = async () => {
  const cloud = require('wx-server-sdk')
  cloud.init({ env: ENV_ID })
  const db = cloud.database()

  // Create all collections first via an admin API call
  const allCollections = [...new Set([
    ...TABLE_MAP.map(t => t.collection),
    ...POSTER_TABLE_MAP.map(t => t.collection),
    'sms_codes'
  ])]

  console.log('Creating collections...')
  for (const coll of allCollections) {
    try {
      // Use a raw MongoDB command via the tcb admin API
      await db.collection(coll).add({ data: { _migrate_dummy: true, _createdAt: new Date() } })
      console.log(`  Created ${coll}`)
    } catch (e) {
      if (e.errCode === -502005) {
        console.log(`  Cannot create ${coll}, may need console`)
      } else {
        console.log(`  ${coll} exists (or error: ${e.errMsg})`)
      }
    }
  }

  // Clean up dummy records
  for (const coll of allCollections) {
    try {
      const res = await db.collection(coll).where({ _migrate_dummy: true }).remove()
      if (res.stats && res.stats.removed > 0) console.log(`  Cleaned dummy from ${coll}`)
    } catch (e) {}
  }

  const SQL = await initSqlJs()
  const mainDb = new SQL.Database(fs.readFileSync(MAIN_DB_PATH))
  const posterDb = fs.existsSync(POSTER_DB_PATH)
    ? new SQL.Database(fs.readFileSync(POSTER_DB_PATH))
    : null

  const stats = {}

  console.log('\n=== Main DB ===')
  for (const tableMap of TABLE_MAP) {
    try { await migrateTable(mainDb, tableMap, db, stats) }
    catch (e) { console.error(`${tableMap.table} error:`, e.message); stats[tableMap.collection] = { error: e.message } }
  }

  if (posterDb) {
    console.log('\n=== Poster DB ===')
    for (const tableMap of POSTER_TABLE_MAP) {
      try { await migrateTable(posterDb, tableMap, db, stats) }
      catch (e) { console.error(`${tableMap.table} error:`, e.message); stats[tableMap.collection] = { error: e.message } }
    }
  }

  console.log('\n=== Summary ===')
  Object.entries(stats).forEach(([coll, s]) => {
    if (s.error) console.log(`  ERR ${coll}: ${s.error}`)
    else console.log(`  ${s.migrated === s.total ? 'OK' : '!!'} ${coll}: ${s.migrated}/${s.total} failed ${s.failed}`)
  })
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
