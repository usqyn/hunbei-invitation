/* 临时诊断脚本：查看指定模板在本地 SQLite(data.db) 中的真实数据 */
const initSqlJs = require('sql.js')
const fs = require('fs')
const path = require('path')

const kw = process.argv[2] || 'ezong92test1'

async function main() {
  const SQL = await initSqlJs({
    locateFile: (f) => path.join(__dirname, 'node_modules', 'sql.js', 'dist', f),
  })
  const buf = fs.readFileSync(path.join(__dirname, 'data.db'))
  const db = new SQL.Database(buf)
  const q = (sql, params = []) => {
    const stmt = db.prepare(sql)
    stmt.bind(params)
    const rows = []
    while (stmt.step()) rows.push(stmt.getAsObject())
    stmt.free()
    return rows
  }
  // 打印表结构
  for (const t of q("SELECT name FROM sqlite_master WHERE type='table'")) {
    console.log('TABLE:', t.name, '->', q(`PRAGMA table_info(${t.name})`).map(c => c.name).join(','))
  }
  const tplCols = q('PRAGMA table_info(templates)').map(c => c.name)
  let rows = q('SELECT * FROM templates WHERE name LIKE ? OR id LIKE ?', [`%${kw}%`, `%${kw}%`])
  if (rows.length === 0) {
    console.log('NOT FOUND, listing recent 15:')
    for (const r of q('SELECT * FROM templates ORDER BY rowid DESC LIMIT 15')) {
      console.log('-', r.id, '|', r.name, '|', String(r.data || '').slice(0, 60))
    }
    return
  }
  for (const r of rows) {
    console.log('=== id:', r.id, '| name:', r.name, '| templateType:', r.templateType, '| cloud_synced:', r.cloud_synced)
    console.log('cover:', String(r.cover || '').slice(0, 140))
    // 顶层列
    const parse = (v) => { if (v == null || v === '') return null; try { return JSON.parse(v) } catch (_) { return v } }
    const elsCol = parse(r.elements)
    const pagesCol = parse(r.pages)
    const bgCol = parse(r.background)
    console.log('[col] renderedImage:', String(r.renderedImage || '').slice(0, 120))
    console.log('[col] background:', JSON.stringify(bgCol || {}).slice(0, 220))
    console.log('[col] canvasSize:', r.canvasSize, '| orientation:', r.orientation)
    const els = elsCol || []
    console.log('[col] elements:', els.length)
    els.slice(0, 50).forEach((e, i) => console.log('  [' + i + ']', e.type, '| editable=' + e.editable, '| text=' + String(e.text || '').slice(0, 70)))
    const pages = pagesCol || []
    console.log('[col] pages:', pages.length)
    pages.forEach((p, pi) => {
      console.log(' page[' + pi + '] bg:', JSON.stringify(p.background || {}).slice(0, 180), '| elements:', (p.elements || []).length)
      ;(p.elements || []).slice(0, 50).forEach((e, i) => console.log('    p' + pi + '[' + i + ']', e.type, '| editable=' + e.editable, '| text=' + String(e.text || '').slice(0, 70)))
    })
    // data 列
    let d = parse(r.data) || {}
    console.log('[col] data keys:', Object.keys(d).join(','))
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
