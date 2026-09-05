/* 临时诊断：test931302 data 顶层 keys + elements 列坐标 + 背景图尺寸 */
const initSqlJs = require('sql.js')
const fs = require('fs')
const path = require('path')

async function main() {
  const SQL = await initSqlJs({
    locateFile: (f) => path.join(__dirname, 'node_modules', 'sql.js', 'dist', f),
  })
  const db = new SQL.Database(fs.readFileSync(path.join(__dirname, 'data.db')))
  const stmt = db.prepare("SELECT data, elements, canvasSize, background FROM templates WHERE name = 'test931302'")
  stmt.step()
  const row = stmt.getAsObject()
  stmt.free()
  const data = JSON.parse(row.data || '{}')
  console.log('data 顶层 keys:', Object.keys(data).join(','))
  console.log('data.canvasSize:', JSON.stringify(data.canvasSize || null))
  console.log('data.background:', JSON.stringify(data.background || null).slice(0, 200))
  console.log('data.templateType:', data.templateType)
  const els = JSON.parse(row.elements || '[]')
  console.log('elements 列数量:', els.length)
  for (const el of els) {
    console.log(
      `- [${el.type}] x=${el.x} y=${el.y} w=${el.width} h=${el.height} z=${el.zIndex} rot=${el.rotation} text=${String(el.text || '').slice(0, 24).replace(/\n/g, '\\n')}`
    )
  }
  // 背景图尺寸
  const bg = JSON.parse(row.background || '{}')
  const bgUrl = bg.image || bg.imageUrl || ''
  console.log('bgUrl:', bgUrl, '| imageScale:', bg.imageScale)
  const fname = bgUrl.split('/').pop()
  const local = path.join(__dirname, 'uploads', 'cloud-pull', fname)
  if (fs.existsSync(local)) {
    const buf = fs.readFileSync(local)
    if (buf[0] === 0x89 && buf[1] === 0x50) console.log('bg PNG size:', buf.readUInt32BE(16), 'x', buf.readUInt32BE(20))
  } else {
    console.log('bg 本地不存在:', local)
  }
  // 元素引用的图片尺寸
  for (const el of els) {
    if (el.type === 'image' && el.text) {
      const f2 = el.text.split('/').pop()
      const p2 = path.join(__dirname, 'uploads', 'cloud-pull', f2)
      if (fs.existsSync(p2)) {
        const b2 = fs.readFileSync(p2)
        if (b2[0] === 0x89) console.log(`el img ${f2}:`, b2.readUInt32BE(16), 'x', b2.readUInt32BE(20))
      }
    }
  }
}

main().catch((e) => { console.error(e); process.exit(0) })
