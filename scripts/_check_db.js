const initSqlJs = require('sql.js')
const fs = require('fs')
initSqlJs().then(SQL => {
  const db = new SQL.Database(fs.readFileSync('server/data.db'))
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'")
  tables.forEach(t => {
    const name = t.values[0][0]
    console.log('\nTable:', name)
    const cols = db.exec('PRAGMA table_info(' + name + ')')
    if (cols.length) cols[0].values.forEach(c => console.log('  ', c[1], '(' + c[2] + ')'))
  })
  db.close()
})
