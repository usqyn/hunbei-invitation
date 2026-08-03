/**
 * 种子数据导入云函数（无图片版）
 * 导入模板、分类、音乐、设置的基础数据
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-d4gyvmo1d9a1e148a' })
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

  let created = 0, failed = 0

  for (const row of rows) {
    const doc = { ...row }
    try {
      if (cfg.pk && doc[cfg.pk] !== undefined && doc[cfg.pk] !== null) {
        const _id = String(doc[cfg.pk])
        // 保留 pk 字段（如 id）在 data 中，云函数查询需要用到
        await db.collection(cfg.collection).doc(_id).set({ data: doc })
      } else {
        await db.collection(cfg.collection).add({ data: doc })
      }
      created++
    } catch (e) {
      failed++
      if (failed <= 3) console.warn('⚠️', name, '失败:', e.message?.substring(0, 60))
    }
  }

  return { total: rows.length, created, failed }
}

exports.main = async (event, context) => {
  const target = event.table || 'all'
  const start = event.start || 0
  const end = event.end
  const results = {}

  console.log('📋 开始导入种子数据，目标:', target, start !== undefined ? `[${start}~${end || 'end'}]` : '')

  for (const [name, rows] of Object.entries(seedData)) {
    if (target !== 'all' && name !== target) continue
    if (!rows || rows.length === 0) continue

    // 支持分批：按 start/end 切片
    const slice = end ? rows.slice(start, end) : rows

    try {
      results[name] = await importTable(name, slice)
      console.log(`✅ ${name}: created ${results[name].created}/${results[name].total}, failed ${results[name].failed}`)
    } catch (e) {
      results[name] = { error: e.message?.substring(0, 100) }
      console.error(`❌ ${name}: ${e.message}`)
    }
  }

  return { success: true, results }
}
