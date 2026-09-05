/*
 * 存量模板图片压缩迁移
 * 把云存储里已有的大体积图片（典型：4.4MB 照片型 PNG）下载 → 压缩 → 重传 → 更新模板引用。
 *
 * 用法：
 *   node server/tmp-recompress-cloud-templates.js [名称关键词] [--apply]
 *   - 不带 --apply：仅 dry-run，报告能省多少，不写云存储/数据库
 *   - 带 --apply：实际重传并更新 templates 集合中的 fileID 引用
 *   - 不传关键词：处理所有模板（谨慎，建议先用关键词验证）
 *
 * 例：node server/tmp-recompress-cloud-templates.js 921929 --apply
 */
const tcb = require('@cloudbase/node-sdk')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
const { compressImageBuffer } = require('./lib/compressImage')

const ENV_ID = 'cloud1-d4gyvmo1d9a1e148a'
const API_KEY = process.env.CLOUDBASE_APIKEY || ''
const APPLY = process.argv.includes('--apply')
const kw = process.argv.slice(2).find((a) => !a.startsWith('--')) || ''

if (!API_KEY) { console.error('CLOUDBASE_APIKEY 未配置'); process.exit(1) }

const IMG_RE = /\.(png|jpe?g|webp)(\?|$)/i

// fileID(cloud://env.bucket/<cloudPath>) -> cloudPath
function fileIdToCloudPath(fileID) {
  const rest = fileID.slice('cloud://'.length)
  const i = rest.indexOf('/')
  return i >= 0 ? rest.slice(i + 1) : rest
}

function collectCloudUrls(obj, out) {
  if (!obj) return
  if (typeof obj === 'string') {
    if (obj.startsWith('cloud://')) out.add(obj)
    return
  }
  if (Array.isArray(obj)) { obj.forEach((v) => collectCloudUrls(v, out)); return }
  if (typeof obj === 'object') { for (const v of Object.values(obj)) collectCloudUrls(v, out) }
}

// 递归把字符串中出现的旧 fileID 替换为新 fileID（data 为 JSON 字符串时同样生效）
function replaceInObj(obj, map, changedFields, field) {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'string') {
    let s = obj
    for (const [oldF, newF] of map) if (s.includes(oldF)) { s = s.split(oldF).join(newF) }
    if (s !== obj) { changedFields.add(field); return s }
    return obj
  }
  if (Array.isArray(obj)) { for (let i = 0; i < obj.length; i++) obj[i] = replaceInObj(obj[i], map, changedFields, field); return obj }
  if (typeof obj === 'object') { for (const k of Object.keys(obj)) obj[k] = replaceInObj(obj[k], map, changedFields, field); return obj }
  return obj
}

async function processTemplate(app, r) {
  const db = app.database()
  const urls = new Set()
  const fields = ['cover', 'renderedImage', 'thumbnail', 'backgroundImage', 'background', 'pages', 'data', 'elements']
  for (const f of fields) collectCloudUrls(r[f], urls)

  const images = Array.from(urls).filter((u) => IMG_RE.test(u))
  if (!images.length) { console.log(`[${r.name}] 无图片引用`); return { saved: 0, replaced: 0 } }

  const replacement = new Map()
  let savedKB = 0
  for (const fileID of images) {
    try {
      const dl = await app.downloadFile({ fileID })
      const buf = dl.fileContent
      if (!buf || !buf.length) continue
      const srcPath = fileIdToCloudPath(fileID)
      const dir = srcPath.includes('/') ? srcPath.slice(0, srcPath.lastIndexOf('/') + 1) : ''
      const stem = path.basename(srcPath).replace(/\.(png|jpe?g|webp)$/i, '')
      const out = await compressImageBuffer(buf, srcPath)
      if (!out.changed) { continue }
      const newPath = `${dir}${stem}_c${Date.now().toString(36)}.${out.to}`
      if (APPLY) {
        const up = await app.uploadFile({ cloudPath: newPath, fileContent: out.buffer })
        if (!up || !up.fileID) { console.warn('  重传失败:', newPath); continue }
        replacement.set(fileID, up.fileID)
      } else {
        replacement.set(fileID, `cloud://(dry)${newPath}`)
      }
      savedKB += out.savedKB || 0
      console.log(`  ${path.basename(srcPath)} ${(buf.length / 1024).toFixed(0)}KB -> ${(out.buffer.length / 1024).toFixed(0)}KB (${out.from}->${out.to})${APPLY ? '' : ' [dry]'}`)
    } catch (e) {
      console.warn('  处理失败:', fileID.slice(0, 70), e.message)
    }
  }

  if (replacement.size) {
    const changedFields = new Set()
    const mutated = {}
    for (const f of fields) {
      mutated[f] = replaceInObj(r[f] === undefined ? null : JSON.parse(JSON.stringify(r[f])), replacement, changedFields, f)
    }
    if (APPLY) {
      const update = {}
      for (const f of changedFields) update[f] = mutated[f]
      await db.collection('templates').doc(r._id).update(update)
      console.log(`[${r.name}] ✅ 已更新 ${replacement.size} 张图引用，字段: ${Array.from(changedFields).join(',')}，省约 ${(savedKB / 1024).toFixed(1)}MB`)
    } else {
      console.log(`[${r.name}] 🧪 [dry-run] 将更新 ${replacement.size} 张图，预计省约 ${(savedKB / 1024).toFixed(1)}MB（加 --apply 实际执行）`)
    }
  } else {
    console.log(`[${r.name}] 所有图片已足够小，无需压缩`)
  }
  return { saved: savedKB, replaced: replacement.size }
}

async function main() {
  const app = tcb.init({ env: ENV_ID, accessKey: API_KEY, endpoint: `https://${ENV_ID}.api.tcloudbasegateway.com` })
  const db = app.database()
  const _ = db.command
  const where = kw ? { name: db.RegExp({ regexp: kw, options: 'i' }) } : { _id: _.exists(true) }
  // 分页拉全量
  const MAX = 100
  let all = []
  for (let skip = 0; ; skip += MAX) {
    const res = await db.collection('templates').where(where).skip(skip).limit(MAX).get()
    all = all.concat(res.data)
    if (res.data.length < MAX) break
  }
  console.log(`模式: ${APPLY ? 'APPLY（实际写入）' : 'DRY-RUN（只报告）'}；命中模板 ${all.length} 个${kw ? `（关键词 ${kw}）` : ''}\n`)
  let totalSaved = 0
  for (const r of all) {
    const { saved } = await processTemplate(app, r)
    totalSaved += saved
  }
  console.log(`\n合计预计/实际节省: ${(totalSaved / 1024).toFixed(1)}MB`)
  process.exit(0)
}
main().catch((e) => { console.error('ERR:', e.message || e); process.exit(1) })
