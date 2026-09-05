// 查 123321 模板的图片元素 mask 数据
const tcb = require('@cloudbase/node-sdk')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
;(async () => {
  const app = tcb.init({ env: 'cloud1-d4gyvmo1d9a1e148a', accessKey: process.env.CLOUDBASE_APIKEY, endpoint: 'https://cloud1-d4gyvmo1d9a1e148a.api.tcloudbasegateway.com' })
  const db = app.database()
  const list = (await db.collection('templates').where({ name: db.RegExp({ regexp: '123321', options: 'i' }) }).limit(5).get()).data
  if (!list.length) { console.log('123321 not found'); return }
  for (const r of list) {
    console.log('=== template:', r._id, r.name, 'type=', r.templateType)
    const els = r.elements || []
    els.forEach((el, i) => {
      if (el.type === 'image') {
        console.log(`element[${i}]:`)
        console.log('  el.mask=', JSON.stringify(el.mask), ' style.mask=', JSON.stringify(el.style && el.style.mask))
        console.log('  el.maskSrc=', JSON.stringify(el.maskSrc || null))
        console.log('  style keys=', el.style ? Object.keys(el.style).join(',') : '(none)')
        console.log('  text=', String(el.text || '').slice(0, 80))
        console.log('  w x h =', el.width, 'x', el.height)
      }
    })
    // pages 里的 sec 图片（page 模式）
    if (r.pages) {
      r.pages.forEach((p, pi) => {
        ;(p.sections || []).forEach((sec, si) => {
          if (sec.type === 'image') {
            console.log(`pages[${pi}].sections[${si}] image: mask=${JSON.stringify(sec.mask)} maskSrc=${JSON.stringify(sec.maskSrc || null)} image=${String(sec.image || sec.src || '').slice(0, 60)}`)
          }
        })
      })
    }
  }
})().catch(e => console.log('ERR', e.message))
