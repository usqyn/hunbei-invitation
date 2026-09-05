// 直接调云函数 template，验证 921929 返回的图片 URL
const tcb = require('@cloudbase/node-sdk')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const ENV_ID = 'cloud1-d4gyvmo1d9a1e148a'
const API_KEY = process.env.CLOUDBASE_APIKEY || ''

;(async () => {
  const app = tcb.init({ env: ENV_ID, accessKey: API_KEY, endpoint: `https://${ENV_ID}.api.tcloudbasegateway.com` })
  // 列表
  const listRes = await app.callFunction({
    name: 'template',
    data: { path: '/api/templates', httpMethod: 'GET', query: { page: '1', limit: '100' } },
  })
  const listData = listRes.result
  if (listData && listData.data && Array.isArray(listData.data)) {
    const t = listData.data.find((x) => x.name && x.name.includes('921929'))
    if (t) {
      console.log('=== 列表中 921929 cover ===')
      console.log('cover:', String(t.cover).slice(0, 200))
      console.log('thumbnail:', String(t.thumbnail || '').slice(0, 200))
    } else {
      console.log('921929 not in list, count:', listData.data.length)
    }
  } else {
    console.log('list response unexpected:', JSON.stringify(listData).slice(0, 300))
  }

  // 详情
  const detailRes = await app.callFunction({
    name: 'template',
    data: { path: '/api/templates/f7b2c731-4869-4d02-89d9-bd3744f45bdb', httpMethod: 'GET', query: {} },
  })
  const d = detailRes.result
  if (d && d.data) {
    const t = d.data
    console.log('\n=== 详情 921929 ===')
    console.log('cover:', String(t.cover || '').slice(0, 200))
    let bg = t.background
    if (typeof bg === 'string') { try { bg = JSON.parse(bg) } catch (_) {} }
    console.log('background.imageUrl:', String(bg && bg.imageUrl || '').slice(0, 200))
    if (t.elements && Array.isArray(t.elements)) {
      t.elements.forEach((el, i) => {
        if (el.type === 'image') console.log('element[' + i + '] image:', String(el.text || '').slice(0, 150))
      })
    }
  } else {
    console.log('detail response unexpected:', JSON.stringify(d).slice(0, 300))
  }
})().catch((e) => console.log('ERR', e.message || e))
