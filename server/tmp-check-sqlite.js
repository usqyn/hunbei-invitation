const initSqlJs = require('sql.js')
const fs = require('fs')
const path = require('path')

;(async () => {
  const SQL = await initSqlJs()
  const buf = fs.readFileSync(path.join(__dirname, 'data.db'))
  const db = new SQL.Database(buf)
  const res = db.exec("SELECT name,cover,background FROM templates WHERE name LIKE '%921929%'")
  if (res.length && res[0].values.length) {
    const cols = res[0].columns
    const vals = res[0].values[0]
    vals.forEach((v, i) => console.log(cols[i] + ':', String(v).slice(0, 250)))
  } else {
    console.log('921929 not found, all names:')
    const r2 = db.exec('SELECT name FROM templates')
    if (r2.length) r2[0].values.forEach(r => console.log('-', r[0]))
  }
})().catch(e => console.log('ERR', e.message))
