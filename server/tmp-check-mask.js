// 查 921929 元素的 mask 字段
const tcb = require('@cloudbase/node-sdk')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
;(async () => {
  const app = tcb.init({ env: 'cloud1-d4gyvmo1d9a1e148a', accessKey: process.env.CLOUDBASE_APIKEY, endpoint: 'https://cloud1-d4gyvmo1d9a1e148a.api.tcloudbasegateway.com' })
  const db = app.database()
  const r = (await db.collection('templates').where({ _id: 'f7b2c731-4869-4d02-89d9-bd3744f45bdb' }).limit(1).get()).data[0]
  const els = r.elements || []
  els.forEach((el, i) => {
    if (el.type === 'image') {
      console.log(`element[${i}] mask=${JSON.stringify(el.mask)} style.mask=${JSON.stringify(el.style && el.style.mask)} maskSrc=${JSON.stringify(el.maskSrc || null)} text=${String(el.text).slice(0, 60)}`)
    }
  })
})().catch(e => console.log('ERR', e.message))
