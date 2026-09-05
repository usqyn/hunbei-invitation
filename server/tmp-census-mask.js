// 全库普查：所有模板的图片元素 mask 值分布 + maskSrc 预置情况
const tcb = require('@cloudbase/node-sdk')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
;(async () => {
  const app = tcb.init({ env: 'cloud1-d4gyvmo1d9a1e148a', accessKey: process.env.CLOUDBASE_APIKEY, endpoint: 'https://cloud1-d4gyvmo1d9a1e148a.api.tcloudbasegateway.com' })
  const db = app.database()
  const MAX = 100
  let offset = 0, all = []
  while (true) {
    const r = (await db.collection('templates').skip(offset).limit(MAX).get()).data
    all = all.concat(r)
    if (r.length < MAX) break
    offset += MAX
  }
  console.log('模板总数:', all.length)
  const stats = {}
  let maskSrcPre = 0
  for (const t of all) {
    const els = t.elements || []
    els.forEach((el) => {
      if (el.type !== 'image') return
      const mask = el.mask ?? (el.style && el.style.mask) ?? '(无)'
      stats[mask] = (stats[mask] || 0) + 1
      if (el.maskSrc) maskSrcPre++
    })
    ;(t.pages || []).forEach((p) => {
      ;(p.sections || []).forEach((sec) => {
        if (sec.type !== 'image') return
        const mask = sec.mask ?? (sec.style && sec.style.mask) ?? '(无)'
        stats['page:' + mask] = (stats['page:' + mask] || 0) + 1
        if (sec.maskSrc) maskSrcPre++
      })
    })
  }
  console.log('图片元素 mask 值分布:', JSON.stringify(stats, null, 0))
  console.log('预置 maskSrc 的元素数:', maskSrcPre)
  // 抽样：每种 mask 各打一个例子
  const seen = new Set()
  for (const t of all) {
    const els = [...(t.elements || []), ...((t.pages || []).flatMap(p => p.sections || []))]
    for (const el of els) {
      if (el.type !== 'image') continue
      const mask = el.mask ?? (el.style && el.style.mask) ?? '(无)'
      const key = String(mask)
      if (!seen.has(key)) {
        seen.add(key)
        console.log(`样例 mask=${key}: 模板${t.name} w=${el.width} h=${el.height} br=${JSON.stringify(el.style && el.style.borderRadius)}`)
      }
    }
  }
})().catch(e => console.log('ERR', e.message))
