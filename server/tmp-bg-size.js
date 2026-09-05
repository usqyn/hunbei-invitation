/* 临时诊断：下载 921929 的背景图/元素图，报告文件大小与图片尺寸，排查"图本身空白" */
const tcb = require('@cloudbase/node-sdk')
require('dotenv').config({ path: require('path').join(__dirname, '.env') })

const ENV_ID = 'cloud1-d4gyvmo1d9a1e148a'
const API_KEY = process.env.CLOUDBASE_APIKEY || ''
const BUCKET = '636c-cloud1-d4gyvmo1d9a1e148a-1459215386'
const TID = 'f7b2c731-4869-4d02-89d9-bd3744f45bdb'
const FILES = [
  ['bg-png', `cloud://${ENV_ID}.${BUCKET}/templates/bg/${TID}/1788434985113_n2nckn.png`],
  ['el1-png', `cloud://${ENV_ID}.${BUCKET}/templates/elements/${TID}/1788434985150_agpnrq.png`],
  ['cover-jpg', `cloud://${ENV_ID}.${BUCKET}/templates/cover/${TID}_1788434985112.jpg`],
  ['data-jpg', `cloud://${ENV_ID}.${BUCKET}/templates/data/${TID}/1788434985112_i85rdz.jpg`],
]

function pngSize(buf) {
  // PNG: 8B sig, IHDR length(4)+type(4)+width(4)+height(4)
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50) {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), fmt: 'png' }
  }
  return null
}

async function main() {
  const app = tcb.init({ env: ENV_ID, accessKey: API_KEY, endpoint: `https://${ENV_ID}.api.tcloudbasegateway.com` })
  for (const [tag, fileID] of FILES) {
    try {
      const r = await app.downloadFile({ fileID })
      const buf = r.fileContent
      const meta = pngSize(buf)
      console.log(`[${tag}] bytes=${(buf.length / 1024).toFixed(0)}KB ${meta ? meta.fmt + ' ' + meta.w + 'x' + meta.h : '(jpg/other)'}`)
    } catch (e) {
      console.log(`[${tag}] 下载失败:`, e.message || e)
    }
  }
}
main()
