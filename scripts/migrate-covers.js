/**
 * 封面图迁移脚本：将云数据库中 /uploads/ 旧 URL 转换为 cloud:// 云存储 URL
 *
 * 用法：
 *   set CLOUDBASE_APIKEY=你的API_Key
 *   node scripts/migrate-covers.js [--dry-run] [--field=cover,image,renderedImage,thumbnail]
 *
 * 选项：
 *   --dry-run    仅扫描，不实际修改
 *   --field=xxx  指定要迁移的字段，默认 cover,thumbnail,renderedImage,backgroundImage
 */
const tcb = require('@cloudbase/node-sdk')
const https = require('https')
const http = require('http')

const ENV_ID = 'cloud1-d4gyvmo1d9a1e148a'
const API_KEY = process.env.CLOUDBASE_APIKEY || ''
const ASSETS_BASE = process.env.ASSETS_BASE || 'https://cloud1-d4gyvmo1d9a1e148a.service.tcloudbase.com'

// 被认定为"旧 URL"的模式
const OLD_URL_PATTERNS = [
  /^\/uploads\//,          // 相对路径
  /\/api\.[^/]+\//,        // 旧 API 子域（原生产域名公网不存在已废弃）
  /\/localhost:\d+\//,     // 本地
]

if (!API_KEY) {
  console.error('❌ 请设置 CLOUDBASE_APIKEY 环境变量')
  process.exit(1)
}

const app = tcb.init({
  env: ENV_ID,
  accessKey: API_KEY,
  endpoint: `https://${ENV_ID}.api.tcloudbasegateway.com`,
})
const db = app.database()

// ── 参数解析 ──
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const fieldArg = args.find(a => a.startsWith('--field='))
const FIELDS = fieldArg
  ? fieldArg.replace('--field=', '').split(',').map(s => s.trim())
  : ['cover', 'thumbnail', 'renderedImage', 'backgroundImage']

if (dryRun) console.log('🔍 DRY-RUN 模式：只扫描，不修改')

// ── 工具 ──
function isOldUrl(url) {
  if (!url || typeof url !== 'string') return false
  if (url.startsWith('cloud://')) return false
  if (url.startsWith('data:')) return false
  return OLD_URL_PATTERNS.some(p => p.test(url))
}

function toFullUrl(url) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const base = ASSETS_BASE.endsWith('/') ? ASSETS_BASE : ASSETS_BASE + '/'
  return base + url.replace(/^\//, '')
}

function downloadFile(fileUrl) {
  return new Promise((resolve, reject) => {
    const client = fileUrl.startsWith('https') ? https : http
    const req = client.get(fileUrl, { timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`HTTP ${res.statusCode}`))
      }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
  })
}

async function uploadToStorage(buffer, cloudPath) {
  const uploadRes = await app.uploadFile({ cloudPath, fileContent: buffer })
  if (!uploadRes || !uploadRes.fileID) {
    throw new Error('上传失败：未返回 fileID')
  }
  return uploadRes.fileID
}

// ── 主流程 ──
async function main() {
  console.log(`[migrate] 环境: ${ENV_ID}`)
  console.log(`[migrate] 字段: ${FIELDS.join(', ')}`)
  console.log(`[migrate] ASSETS_BASE: ${ASSETS_BASE}`)

  // 查询所有模板
  const allRes = await db.collection('templates').get()
  if (!allRes.data || allRes.data.length === 0) {
    console.log('[migrate] 云数据库中没有模板')
    return
  }

  const templates = allRes.data
  console.log(`[migrate] 云数据库中共 ${templates.length} 个模板`)

  let needFix = 0
  let fixed = 0
  let skipped = 0
  let failed = 0

  for (const tpl of templates) {
    const updates = {}
    let hasOld = false

    for (const field of FIELDS) {
      const url = tpl[field]
      if (!isOldUrl(url)) continue
      hasOld = true

      const full = toFullUrl(url)
      console.log(`\n[migrate] 📷 [${tpl.name || tpl.id}] ${field}: ${url} → ${full}`)

      try {
        const buffer = await downloadFile(full)
        const ext = field === 'renderedImage' ? 'png' : 'jpg'
        const ts = Date.now()
        const cloudPath = `templates/${field}/${tpl.id}_${ts}.${ext}`
        const fileID = await uploadToStorage(buffer, cloudPath)
        updates[field] = fileID
        console.log(`  ✅ 已上传: ${fileID}`)
      } catch (err) {
        console.log(`  ⚠️  下载/上传失败 (${err.message})，保留原 URL`)
        skipped++
      }
    }

    if (Object.keys(updates).length > 0) {
      if (!dryRun) {
        try {
          await db.collection('templates').doc(tpl._id).update(updates)
          console.log(`  💾 已更新数据库`)
          fixed++
        } catch (e) {
          console.error(`  ❌ 数据库更新失败: ${e.message}`)
          failed++
        }
      } else {
        console.log(`  🔍 [DRY-RUN] 将更新字段: ${Object.keys(updates).join(', ')}`)
      }
    }

    if (hasOld && Object.keys(updates).length === 0) {
      needFix++
    }
  }

  const summary = dryRun ? '\n🔍 DRY-RUN 扫描完成' : '\n✅ 迁移完成'
  console.log(`\n${summary}`)
  console.log(`  扫描模板: ${templates.length}`)
  console.log(`  需修复:   ${needFix}（有旧URL但下载失败，需手动处理）`)
  console.log(`  ${dryRun ? '将' : '已'}修复:   ${fixed}`)
  console.log(`  跳过:     ${skipped}`)
  console.log(`  失败:     ${failed}`)
}

main().catch(e => {
  console.error('[migrate] 脚本异常:', e)
  process.exit(1)
})
