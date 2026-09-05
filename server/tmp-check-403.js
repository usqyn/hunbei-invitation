/* 临时脚本：批量验证云存储临时 URL 是否 403（定位存储权限问题） */
const tcb = require('@cloudbase/node-sdk')
const https = require('https')
require('dotenv').config({ path: require('path').join(__dirname, '.env') })

const app = tcb.init({
  env: 'cloud1-d4gyvmo1d9a1e148a',
  accessKey: process.env.CLOUDBASE_APIKEY || '',
  endpoint: 'https://cloud1-d4gyvmo1d9a1e148a.api.tcloudbasegateway.com',
})

// 用户报错的字体 fileID + 两个模板的背景
const FILE_IDS = [
  'cloud://cloud1-d4gyvmo1d9a1e148a.636c-cloud1-d4gyvmo1d9a1e148a-1459215386/uploads/fonts/KazakhSoftAsilyaQaniq.ttf',
  'cloud://cloud1-d4gyvmo1d9a1e148a.636c-cloud1-d4gyvmo1d9a1e148a-1459215386/uploads/fonts/KazakhSoftAsilya.ttf',
  'cloud://cloud1-d4gyvmo1d9a1e148a.636c-cloud1-d4gyvmo1d9a1e148a-1459215386/templates/bg/987652e3-2fe4-4e05-b60c-ccc48d9b4576/1788347294144_a9s42q.png',
  'cloud://cloud1-d4gyvmo1d9a1e148a.636c-cloud1-d4gyvmo1d9a1e148a-1459215386/templates/bg/fd20ac3f-3065-40a5-8f4b-2f4a34577cfd/1788337479740_bg6efq.png',
]

function head(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', timeout: 15000 }, (res) => {
      resolve({ status: res.statusCode, errCode: res.headers['x-cos-error-code'] || '', msg: res.headers['x-cos-error-message'] || '' })
      res.resume()
    })
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, errCode: 'timeout', msg: '' }) })
    req.on('error', (e) => resolve({ status: 0, errCode: 'net', msg: e.message }))
    req.end()
  })
}

async function main() {
  const res = await app.getTempFileURL({ fileList: FILE_IDS })
  const list = (res.fileList || [])
  for (const f of list) {
    console.log(`fileID: ...${f.fileID.slice(-60)}`)
    console.log(`  getTempFileURL: code=${f.code} status=${f.status}`)
    if (f.tempFileURL) {
      const r = await head(f.tempFileURL)
      console.log(`  HTTP HEAD: ${r.status} ${r.errCode} ${r.msg.slice(0, 100)}`)
      console.log(`  url: ${f.tempFileURL.slice(0, 120)}`)
    }
    console.log('')
  }
  process.exit(0)
}
main().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
