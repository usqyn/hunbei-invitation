/**
 * 路线 A：资产迁移到云存储（一次性脚本）
 *
 * 背景：云数据库模板图片 URL 曾指向一个公网不存在的生产域名（NXDOMAIN），
 * 导致线上图片全部加载失败。
 *
 * 本脚本做两件事：
 *   1. 将 server/uploads 下所有文件（排除 fonts/，字体走 font_map）上传到云存储，
 *      cloudPath 保持相对路径（如 uploads/xxx.jpg），返回 cloud:// fileID 映射表
 *   2. 扫描云数据库 templates / works 集合，深度替换所有
 *      线上生产域名 uploads 路径 → cloud://envId.xxx/uploads/xxx
 *
 * 用法：node scripts/migrate-assets-to-cloud.js
 * 环境变量：CLOUDBASE_APIKEY 可覆盖内置 API Key
 */
const fs = require('fs')
const path = require('path')
const tcb = require('@cloudbase/node-sdk')

const ENV_ID = 'cloud1-d4gyvmo1d9a1e148a'
const API_KEY = process.env.CLOUDBASE_APIKEY || 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjlkMWRjMzFlLWI0ZDAtNDQ4Yi1hNzZmLWIwY2M2M2Q4MTQ5OCJ9.eyJhdWQiOiJjbG91ZDEtZDRneXZtbzFkOWExZTE0OGEiLCJleHAiOjI1MzQwMjMwMDc5OSwiaWF0IjoxNzg1ODQ0ODQ5LCJhdF9oYXNoIjoibTBKZ2dGV2xTUXkzclJwMmliTUV5QSIsInByb2plY3RfaWQiOiJjbG91ZDEtZDRneXZtbzFkOWExZTE0OGEiLCJtZXRhIjp7InBsYXRmb3JtIjoiQXBpS2V5In0sImFkbWluaXN0cmF0b3JfaWQiOiIyMDgxNzAwNjQ4Mjc4NTk3NjM0IiwidXNlcl90eXBlIjoiIiwiY2xpZW50X3R5cGUiOiJjbGllbnRfc2VydmVyIiwiaXNfc3lzdGVtX2FkbWluIjp0cnVlfQ.Y5TYJuE3uqS2GIYJLxNm6-BobPE9Nycj9P7du0kICs0HF9ApclF4qNwh2Shi-j-hC9we-RD5uH99twQfbKLqgnrOxDmgjPm6IuollzgOgI1T3wxw0xyZVczYOLZFbp-Yjpg00G8gfQZQoEUXzNA0Sedv4qCQagegc1XcRXIJ20JgtlEoeNY1_QUw4rnhfv2Vi-BuuEyO44e3BMq6UIeTaK1FsFZ8kcBFLmccyKeUj_8jKbIXbtui-0omZ3-k453mhcg_KfW4JaxwCm0Fe2Hi20J6LZXZlTtEJGKJJBJjKdLg1cvYYxC8YyrPmIHDDAI-7TLuk01eqIZnLQdFguZUiw'
const UPLOADS_DIR = path.join(__dirname, '..', 'server', 'uploads')
const MAP_FILE = path.join(__dirname, 'asset-map.json')
// 历史迁移脚本：任务已完成（templates/works 已全部为 cloud://，零残留）
const ASSETS_BASE = process.env.ASSETS_BASE || 'https://cloud1-d4gyvmo1d9a1e148a.service.tcloudbase.com'
const CONCURRENCY = 8

const app = tcb.init({
  env: ENV_ID,
  accessKey: API_KEY,
  endpoint: `https://${ENV_ID}.api.tcloudbasegateway.com`,
})
const db = app.database()

// ---------- 1. 本地文件扫描 ----------
function listFiles(dir, base = '') {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.posix.join(base, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'fonts') continue // 字体已走 font_map 云存储，不重复上传
      out.push(...listFiles(path.join(dir, entry.name), rel))
    } else {
      out.push(rel)
    }
  }
  return out
}

const EXT_MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.aac': 'audio/aac',
}
const mimeOf = (rel) => EXT_MIME[path.extname(rel).toLowerCase()] || 'application/octet-stream'

// ---------- 2. 并发上传 ----------
async function runPool(items, concurrency, worker) {
  let idx = 0
  const results = new Array(items.length)
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (idx < items.length) {
      const i = idx++
      results[i] = await worker(items[i], i)
    }
  })
  await Promise.all(runners)
  return results
}

async function uploadAll() {
  const files = listFiles(UPLOADS_DIR)
  console.log(`扫描到 ${files.length} 个文件（已排除 fonts/），开始上传到云存储...\n`)
  const map = {}
  let ok = 0

  const results = await runPool(files, CONCURRENCY, async (rel, i) => {
    const abs = path.join(UPLOADS_DIR, rel)
    try {
      const res = await app.uploadFile({
        cloudPath: rel,
        fileContent: fs.readFileSync(abs),
        contentType: mimeOf(rel),
      })
      if (res && res.fileID) {
        ok++
        return { rel, fileID: res.fileID }
      }
      return { rel, error: '上传成功但无 fileID' }
    } catch (e) {
      return { rel, error: e.message || String(e) }
    }
  })

  for (const r of results) {
    if (r.fileID) {
      map[r.rel] = r.fileID
      console.log(`  [ok] ${r.rel} -> ${r.fileID}`)
    } else {
      console.error(`  [fail] ${r.rel}: ${r.error}`)
    }
  }

  console.log(`\n上传完成: ${ok}/${files.length} 成功`)
  return map
}

// ---------- 3. 深度替换 URL ----------
// 数据库 URL 形如 {ASSETS_BASE}/uploads/xxx.jpg，
// 本地文件相对 uploads 目录的路径是 xxx.jpg（或 poster/xxx.jpg）。
// map 的 key 是相对 uploads 的路径，所以替换时要去掉 "/uploads/" 前缀。
function replaceInValue(v, map) {
  if (typeof v === 'string') {
    const upPrefix = ASSETS_BASE + '/uploads/'
    if (v.startsWith(upPrefix)) {
      const rel = v.substring(upPrefix.length)
      if (map[rel]) return map[rel]
    }
    return v
  }
  if (Array.isArray(v)) return v.map((x) => replaceInValue(x, map))
  if (v && typeof v === 'object') {
    const out = {}
    for (const [k, val] of Object.entries(v)) out[k] = replaceInValue(val, map)
    return out
  }
  return v
}

// ---------- 4. 迁移单个集合 ----------
async function migrateCollection(name, map) {
  const col = db.collection(name)
  let all = []
  let skip = 0
  while (true) {
    const res = await col.skip(skip).limit(100).get()
    all = all.concat(res.data || [])
    if (!res.data || res.data.length < 100) break
    skip += res.data.length
  }

  const seen = new Set()
  const leftover = []
  let updated = 0

  for (const doc of all) {
    const newDoc = replaceInValue(doc, map)
    if (JSON.stringify(newDoc) !== JSON.stringify(doc)) {
      const { _id, ...patch } = newDoc
      await col.doc(doc._id).update(patch)
      updated++
    }
    // 在替换后的文档中统计残留假域名（真正需要人工处理的）
    const str = JSON.stringify(newDoc)
    const re = /\/uploads\/([^"\\\s]+)/g
    let m
    while ((m = re.exec(str)) !== null) {
      if (seen.has(m[1])) continue
      seen.add(m[1])
      leftover.push(map[m[1]] ? `${m[1]} (已上传但URL不匹配?)` : `${m[1]} (本地无此文件!)`)
    }
  }

  return { name, total: all.length, updated, leftover }
}

// ---------- 5. 主流程 ----------
async function main() {
  const replaceOnly = process.argv.includes('--replace-only')
  console.log('=== 路线A：资产迁移到云存储 ===\n')
  console.log(`环境: ${ENV_ID}`)
  console.log(`本地目录: ${UPLOADS_DIR}`)
  console.log(`替换域名: ${ASSETS_BASE}\n`)

  let map
  if (replaceOnly) {
    map = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'))
    console.log(`--replace-only 模式，从 ${MAP_FILE} 读取映射表（${Object.keys(map).length} 条）\n`)
  } else {
    map = await uploadAll()
    fs.writeFileSync(MAP_FILE, JSON.stringify(map, null, 2))
    console.log(`映射表已保存到 ${MAP_FILE}`)
  }

  if (!Object.keys(map).length) {
    console.error('没有可用的文件映射，终止后续替换。')
    process.exit(1)
  }

  console.log('\n开始替换云数据库 URL...')
  for (const name of ['templates', 'works']) {
    try {
      const r = await migrateCollection(name, map)
      console.log(`\n[${r.name}] 共 ${r.total} 个文档，更新 ${r.updated} 个`)
      if (r.leftover.length) {
        console.log(`  ⚠ 未替换的假域名引用（${r.leftover.length} 个）：`)
        r.leftover.forEach((x) => console.log(`    - ${x}`))
      } else {
        console.log('  ✓ 无残留假域名引用')
      }
    } catch (e) {
      console.log(`\n[${name}] 跳过（${e.message || e}）`)
    }
  }

  console.log('\n=== 迁移完成 ===')
}

main().catch((e) => {
  console.error('FATAL:', e.message || e)
  process.exit(1)
})
