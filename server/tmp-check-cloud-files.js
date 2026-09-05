/* 临时诊断：提取云数据库模板中所有 cloud:// fileID，验证云存储中文件是否存在/可换取 */
const tcb = require('@cloudbase/node-sdk')
require('dotenv').config({ path: require('path').join(__dirname, '.env') })

const ENV_ID = 'cloud1-d4gyvmo1d9a1e148a'
const API_KEY = process.env.CLOUDBASE_APIKEY || ''
const kw = process.argv[2] || 'ezong92test1'

if (!API_KEY) { console.error('CLOUDBASE_APIKEY 未配置'); process.exit(1) }

function collectCloudUrls(obj, out) {
  if (!obj) return
  if (typeof obj === 'string') {
    if (obj.startsWith('cloud://')) out.add(obj)
    return
  }
  if (Array.isArray(obj)) { obj.forEach(v => collectCloudUrls(v, out)); return }
  if (typeof obj === 'object') { for (const v of Object.values(obj)) collectCloudUrls(v, out) }
}

async function main() {
  const app = tcb.init({
    env: ENV_ID,
    accessKey: API_KEY,
    endpoint: `https://${ENV_ID}.api.tcloudbasegateway.com`,
  })
  const db = app.database()
  const res = await db.collection('templates').where({ name: db.RegExp({ regexp: kw, options: 'i' }) }).limit(5).get()
  if (!res.data.length) { console.log('template not found'); process.exit(0) }
  const r = res.data[0]
  console.log('template:', r.name)
  let d = r.data
  if (typeof d === 'string') { try { d = JSON.parse(d) } catch (_) { d = {} } }
  const urls = new Set()
  collectCloudUrls(r.cover, urls)
  collectCloudUrls(r.renderedImage, urls)
  collectCloudUrls(r.background, urls)
  collectCloudUrls(r.pages, urls)
  collectCloudUrls(d, urls)
  collectCloudUrls(r.elements, urls)
  console.log('cloud:// fileID 数量:', urls.size)
  const fileList = Array.from(urls)
  if (!fileList.length) { process.exit(0) }
  // 分批 50
  for (let i = 0; i < fileList.length; i += 50) {
    const chunk = fileList.slice(i, i + 50)
    const resp = await app.getTempFileURL({ fileList: chunk })
    console.log('---- raw response for chunk', i / 50)
    console.log(JSON.stringify(resp, null, 1).slice(0, 3000))
  }
  process.exit(0)
}
main().catch((e) => { console.error('ERR:', e.message || e); process.exit(1) })
