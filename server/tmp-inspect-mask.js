/* 临时脚本：检查指定模板中图片元素的 mask 相关字段（本地 SQLite + 云数据库） */
const initSqlJs = require('sql.js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const kw = process.argv[2] || 'test9216'

function parseMaybeJson(v) {
  if (typeof v !== 'string') return v
  try { return JSON.parse(v) } catch { return v }
}

function dumpImageElements(label, els) {
  const imgs = (els || []).map((el, i) => ({ el, i })).filter(x => x.el && (x.el.type === 'image' || x.el.src))
  console.log(`---- ${label}: 共 ${els?.length || 0} 个元素，图片元素 ${imgs.length} 个 ----`)
  for (const { el, i } of imgs) {
    console.log(`el[${i}] type=${el.type}`)
    console.log(`  src=${String(el.src || '').slice(0, 70)}`)
    console.log(`  text=${String(el.text || '').slice(0, 70)}`)
    console.log(`  mask=${JSON.stringify(el.mask)} borderRadius=${JSON.stringify(el.borderRadius)} maskSrc=${JSON.stringify(el.maskSrc)}`)
    console.log(`  style.mask=${JSON.stringify(el.style?.mask)} style.borderRadius=${JSON.stringify(el.style?.borderRadius)}`)
    console.log(`  width=${el.width} height=${el.height} x=${el.x} y=${el.y}`)
    console.log(`  clipPath=${JSON.stringify(el.clipPath)} clip=${JSON.stringify(el.clip)}`)
    console.log(`  所有键: ${Object.keys(el).join(',')}`)
  }
}

async function main() {
  const SQL = await initSqlJs({
    locateFile: (f) => path.join(__dirname, 'node_modules', 'sql.js', 'dist', f),
  })
  const buf = fs.readFileSync(path.join(__dirname, 'data.db'))
  const db = new SQL.Database(buf)
  const stmt = db.prepare('SELECT * FROM templates WHERE name LIKE ? OR id LIKE ?')
  stmt.bind([`%${kw}%`, `%${kw}%`])
  const rows = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  if (!rows.length) { console.log('NOT FOUND:', kw); process.exit(1) }

  for (const row of rows) {
    console.log('\n================ 模板:', row.id, '|', row.name)
    const els = parseMaybeJson(row.elements) || parseMaybeJson(row.data)?.elements || []
    dumpImageElements('本地 SQLite', els)
  }

  // 云数据库
  try {
    const tcb = require('@cloudbase/node-sdk')
    const capp = tcb.init({
      env: 'cloud1-d4gyvmo1d9a1e148a',
      accessKey: process.env.CLOUDBASE_APIKEY || '',
      endpoint: 'https://cloud1-d4gyvmo1d9a1e148a.api.tcloudbasegateway.com',
    })
    const cdb = capp.database()
    for (const row of rows) {
      const res = await cdb.collection('templates').doc(row.id).get()
      const doc = res.data && res.data[0]
      if (!doc) { console.log('云数据库无该文档'); continue }
      const els = doc.elements || doc.data?.elements || []
      dumpImageElements('云数据库', els)
    }
  } catch (e) {
    console.log('云数据库读取失败:', e.message)
  }
  process.exit(0)
}
main().catch((e) => { console.error('ERR:', e.message || e); process.exit(1) })
