/* 临时脚本：
 *   node tmp-repair-template.js <关键词> diagnose  — 仅诊断（本地 vs 云数据库 URL 对比），不写云
 *   node tmp-repair-template.js <关键词]           — 重新同步到云数据库（重新上传全部资源）
 */
const initSqlJs = require('sql.js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
const cloudSync = require('./cloudSync')

const kw = process.argv[2] || 'ezong92test1'
const mode = process.argv[3] || 'sync'

// 从模板对象中抽取所有资源类字段（含嵌套 pages[].background / pages[].elements）
function collectUrls(obj, out, prefix) {
  if (!obj || typeof obj !== 'object') return
  if (typeof obj === 'string') return
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'string') {
      if (/^(https?:\/\/|cloud:\/\/|\/uploads\/|uploads\/)/.test(v) || v === '') {
        if (/cover|image|background|thumbnail|url|src|rendered/i.test(k) || v.startsWith('cloud://') || v.includes('127.0.0.1') || v.includes('localhost')) {
          out.push(`${p} = ${v === '' ? '(空字符串)' : v.slice(0, 90)}`)
        }
      }
    } else if (v && typeof v === 'object') {
      collectUrls(v, out, p)
    }
  }
}

function parseMaybeJson(v) {
  if (typeof v !== 'string') return v
  try { return JSON.parse(v) } catch { return v }
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
    console.log('\n================ 模板:', row.id, '|', row.name, '| cloud_synced=', row.cloud_synced)
    // ---- 本地数据诊断 ----
    const localUrls = []
    collectUrls({ cover: row.cover, background: parseMaybeJson(row.background), elements: parseMaybeJson(row.elements), data: parseMaybeJson(row.data), pages: parseMaybeJson(row.pages) }, localUrls, 'local')
    console.log('---- 本地 SQLite 资源 URL ----')
    localUrls.forEach(l => console.log(' ', l))

    if (mode === 'diagnose') {
      // ---- 云数据库诊断（独立初始化 SDK，cloudSync 未导出 db）----
      try {
        const tcb = require('@cloudbase/node-sdk')
        const capp = tcb.init({
          env: 'cloud1-d4gyvmo1d9a1e148a',
          accessKey: process.env.CLOUDBASE_APIKEY || '',
          endpoint: 'https://cloud1-d4gyvmo1d9a1e148a.api.tcloudbasegateway.com',
        })
        const cdb = capp.database()
        const res = await cdb.collection('templates').doc(row.id).get()
        const doc = res.data && res.data[0]
        if (!doc) {
          console.log('---- 云数据库: ❌ 无该文档 ----')
        } else {
          const cloudUrls = []
          collectUrls({ cover: doc.cover, background: doc.background, elements: doc.elements, data: doc.data, pages: doc.pages }, cloudUrls, 'cloud')
          console.log('---- 云数据库 资源 URL ----')
          cloudUrls.forEach(l => console.log(' ', l))
          const bad = cloudUrls.filter(l => l.includes('127.0.0.1') || l.includes('localhost') || l.includes('(空字符串)'))
          console.log(bad.length ? `⚠️ 云数据存在 ${bad.length} 个可疑/空 URL` : '✅ 云数据无可疑 URL')
          // 关键结构诊断
          console.log('---- 云数据库 结构诊断 ----')
          console.log('background =', JSON.stringify(doc.background))
          console.log('renderedImage =', doc.renderedImage || '(无)')
          console.log('canvasSize =', JSON.stringify(doc.canvasSize))
          const els = doc.elements || (doc.data && doc.data.elements) || []
          console.log('elements count =', els.length, (doc.pages && doc.pages.length) ? `pages=${doc.pages.length}` : '')
          els.slice(0, 4).forEach((el, i) => {
            console.log(`el[${i}] type=${el.type} text=${String(el.text || '').slice(0, 40)} src=${String(el.src || '').slice(0, 60)} editable=${el.editable}`)
          })
          const textEls = els.filter(e => e.type === 'text')
          textEls.slice(0, 8).forEach((el, i) => {
            console.log(`text[${i}] "${String(el.text || '').slice(0, 30)}" color=${el.style && el.style.color} font=${el.style && el.style.font}`)
          })
          // 深度收集所有 cloud:// fileID，服务端逐个验证可换取性（模拟小程序 getTempFileURL）
          const fileIDs = new Set()
          ;(function scan(o) {
            if (typeof o === 'string') { if (o.startsWith('cloud://')) fileIDs.add(o.split('?')[0]); return }
            if (!o || typeof o !== 'object') return
            for (const v of Object.values(o)) scan(v)
          })(doc)
          if (fileIDs.size) {
            const list = Array.from(fileIDs)
            console.log(`---- 云存储 fileID 验证（共 ${list.length} 个）----`)
            try {
              const tfRes = await capp.getTempFileURL({ fileList: list })
              console.log('RAW getTempFileURL response:', JSON.stringify(tfRes).slice(0, 1200))
              for (const f of (tfRes.fileList || [])) {
                const shortId = f.fileID.slice(f.fileID.lastIndexOf('/') - 12)
                if (f.status === 0 && f.tempFileURL) {
                  console.log(`  ✅ ${shortId} → ${f.tempFileURL.slice(0, 80)}`)
                } else {
                  console.log(`  ❌ ${shortId} status=${f.status} errMsg=${f.errMsg}`)
                }
              }
            } catch (e) {
              console.log('  getTempFileURL 调用失败:', e.message)
            }
          }
        }
      } catch (e) {
        console.log('---- 云数据库读取失败:', e.message)
      }
      continue
    }

    console.log('=== 重新同步...')
    const ok = await cloudSync.syncTemplateToCloud(row.id, row, 'repair-resync')
    console.log(ok ? '✅ 同步成功' : '❌ 同步失败')
  }
  process.exit(0)
}
main().catch((e) => { console.error('ERR:', e.message || e); process.exit(1) })
