/* 临时诊断脚本：查看云数据库中指定模板的真实数据 */
const tcb = require('@cloudbase/node-sdk')
require('dotenv').config({ path: require('path').join(__dirname, '.env') })

const ENV_ID = 'cloud1-d4gyvmo1d9a1e148a'
const API_KEY = process.env.CLOUDBASE_APIKEY || ''
const kw = process.argv[2] || 'ezong92test1'

if (!API_KEY) { console.error('CLOUDBASE_APIKEY 未配置'); process.exit(1) }

async function main() {
  const app = tcb.init({
    env: ENV_ID,
    accessKey: API_KEY,
    endpoint: `https://${ENV_ID}.api.tcloudbasegateway.com`,
  })
  const db = app.database()
  const col = db.collection('templates')
  // 先按 name 查
  let res = await col.where({ name: db.RegExp({ regexp: kw, options: 'i' }) }).limit(5).get()
  if (!res.data.length) {
    console.log('NOT FOUND by name; total count:')
    const c = await col.count()
    console.log(JSON.stringify(c))
    return
  }
  for (const r of res.data) {
    console.log('=== id:', r._id || r.id, '| name:', r.name, '| templateType:', r.templateType, '| cloud_synced:', r.cloud_synced)
    console.log('cover:', String(r.cover || '').slice(0, 140))
    let d = r.data
    if (typeof d === 'string') { try { d = JSON.parse(d) } catch (e) { console.log('data parse fail'); continue } }
    d = d || {}
    console.log('data keys:', Object.keys(d).join(','))
    console.log('data values:', JSON.stringify(d).slice(0, 500))
    console.log('renderedImage:', String(r.renderedImage || d.renderedImage || '').slice(0, 120))
    console.log('background:', JSON.stringify(r.background || d.background || {}).slice(0, 220))
    const els = d.elements || r.elements || []
    console.log('canvas elements:', els.length)
    els.slice(0, 50).forEach((e, i) => console.log('  [' + i + ']', e.type, '| editable=' + e.editable, '| text=' + String(e.text || '').slice(0, 70)))
    let pages = r.pages || d.pages || []
    if (typeof pages === 'string') { try { pages = JSON.parse(pages) } catch (_) { pages = [] } }
    console.log('pages:', pages.length)
    pages.forEach((p, pi) => {
      console.log(' page[' + pi + '] bg:', JSON.stringify(p.background || {}).slice(0, 180), '| elements:', (p.elements || []).length)
      ;(p.elements || []).slice(0, 50).forEach((e, i) => console.log('    p' + pi + '[' + i + ']', e.type, '| editable=' + e.editable, '| text=' + String(e.text || '').slice(0, 70)))
    })
  }
  process.exit(0)
}
main().catch((e) => { console.error('ERR:', e.message || e); process.exit(1) })
