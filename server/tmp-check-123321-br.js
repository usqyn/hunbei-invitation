// 查 123321 元素 13/16/14 的完整 style（重点 borderRadius）
const tcb = require('@cloudbase/node-sdk')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
;(async () => {
  const app = tcb.init({ env: 'cloud1-d4gyvmo1d9a1e148a', accessKey: process.env.CLOUDBASE_APIKEY, endpoint: 'https://cloud1-d4gyvmo1d9a1e148a.api.tcloudbasegateway.com' })
  const db = app.database()
  const r = (await db.collection('templates').where({ _id: '62db221d-3023-4676-920c-309574de516c' }).limit(1).get()).data[0]
  ;[13, 16, 14].forEach((i) => {
    const el = r.elements[i]
    console.log(`element[${i}] mask=${el.style.mask} borderRadius=${JSON.stringify(el.style.borderRadius)} el.borderRadius=${JSON.stringify(el.borderRadius)} scale=${JSON.stringify(el.style.scale)}`)
  })
})().catch(e => console.log('ERR', e.message))
