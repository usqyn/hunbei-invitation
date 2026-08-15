/**
 * 修复云数据库中无效的图片 URL / 缺失的字体映射
 *
 * 背景：poster_templates / templates / works 中的图片 URL 是相对路径
 * （/uploads/xxx.jpg），前端/云函数会把它拼成无 bucket 段的假 fileID
 * （cloud://env/uploads/xxx.jpg），getTempFileURL 必然失败 → 图片全部加载失败。
 * 云存储中真实文件位于 cloud://env.636c-xxx/<path>（路径不带 uploads/ 前缀）。
 *
 * 修复策略：
 *   1. /uploads/<path> → 候选 fileID cloud://env.636c-xxx/<path>，getTempFileURL 探测
 *   2. 探测失败 → 从本地 server/uploads/<path> 重新上传，用返回的真实 fileID
 *   3. 深度替换集合中的 URL 字段（含 config/data/elements/pages 嵌套 JSON）
 *   4. 补全 settings.font_map（字体文件已上传到 uploads/fonts/ 则直接引用）
 *
 * 用法: node scripts/fix-cloud-urls.js [--dry-run]
 */
const tcb = require('@cloudbase/node-sdk')
const fs = require('fs')
const path = require('path')

const ENV_ID = 'cloud1-d4gyvmo1d9a1e148a'
const BUCKET = '636c-cloud1-d4gyvmo1d9a1e148a-1459215386'
const BUCKET_FILE_ID_PREFIX = `cloud://${ENV_ID}.${BUCKET}`

let API_KEY = process.env.CLOUDBASE_APIKEY
if (!API_KEY) {
  try {
    const envContent = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf-8')
    const match = envContent.match(/^CLOUDBASE_APIKEY=(.+)$/m)
    if (match) API_KEY = match[1].trim()
  } catch (_) {}
}
if (!API_KEY) {
  console.error('❌ CLOUDBASE_APIKEY 未配置')
  process.exit(1)
}

const app = tcb.init({
  env: ENV_ID,
  accessKey: API_KEY,
  endpoint: `https://${ENV_ID}.api.tcloudbasegateway.com`,
})
const db = app.database()

const dryRun = process.argv.includes('--dry-run')
if (dryRun) console.log('🔍 DRY-RUN 模式：只扫描，不修改')

const UPLOADS_DIR = path.join(__dirname, '../server/uploads')
const FONTS_DIR = path.join(__dirname, '../admin/public/fonts')

// ============ 工具 ============

// 把 /uploads/xxx（或 localhost http 旧地址）归一化为相对路径 xxx（去掉 uploads/ 前缀）
function extractRelPath(url) {
  if (typeof url !== 'string' || !url) return null
  let p = url
  const m = p.match(/^https?:\/\/[^/]+(\/.*)$/i)
  if (m) p = m[1]
  if (!p.startsWith('/uploads/') && !p.startsWith('uploads/')) return null
  p = p.replace(/^\/+/, '').replace(/^uploads\//, '')
  return p
}

// 本地文件是否存在于 server/uploads/<relPath>
function localFileExists(relPath) {
  return fs.existsSync(path.join(UPLOADS_DIR, relPath))
}

// 批量探测 fileID 是否可解析（getTempFileURL 返回 tempFileURL 即存在）
async function probeFileIDs(fileIDs) {
  const ok = new Set()
  const miss = new Set()
  const BATCH = 50
  for (let i = 0; i < fileIDs.length; i += BATCH) {
    const batch = fileIDs.slice(i, i + BATCH)
    const res = await app.getTempFileURL({ fileList: batch })
    ;(res.fileList || []).forEach(item => {
      if (item.tempFileURL) ok.add(item.fileID)
      else miss.add(item.fileID)
    })
  }
  return { ok, miss }
}

// 从本地重新上传文件到云存储，返回真实 fileID
async function uploadLocal(relPath) {
  const fullPath = path.join(UPLOADS_DIR, relPath)
  const buffer = fs.readFileSync(fullPath)
  const res = await app.uploadFile({ cloudPath: relPath, fileContent: buffer })
  if (!res || !res.fileID) throw new Error('上传未返回 fileID')
  return res.fileID
}

// ============ 图片 URL 修复 ============

// 收集所有需要替换的相对路径 → 候选 fileID
async function buildUrlMap() {
  const urlMap = new Map() // relPath → fileID
  const collections = await scanAllCollections()
  const relPaths = new Set()
  for (const { records, fields } of collections) {
    for (const rec of records) {
      collectRelPaths(rec, fields, relPaths)
    }
  }
  console.log(`[url] 发现 ${relPaths.size} 个相对路径引用`)
  if (relPaths.size === 0) return urlMap

  // 候选 fileID：cloud://env.bucket/<relPath>
  const candidates = new Map()
  for (const rel of relPaths) {
    candidates.set(`cloud://${ENV_ID}.${BUCKET}/${rel}`, rel)
  }
  const { ok, miss } = await probeFileIDs(Array.from(candidates.keys()))
  for (const fileID of ok) {
    urlMap.set(candidates.get(fileID), fileID)
    console.log(`  ✅ ${candidates.get(fileID)} → 已在云存储`)
  }
  for (const fileID of miss) {
    const rel = candidates.get(fileID)
    if (localFileExists(rel)) {
      if (dryRun) {
        console.log(`  🔍 [DRY-RUN] ${rel} 不在云存储，将重新上传`)
        urlMap.set(rel, fileID) // dry-run 用候选值做预览
      } else {
        try {
          const real = await uploadLocal(rel)
          urlMap.set(rel, real)
          console.log(`  📤 ${rel} 重新上传 → ${real}`)
        } catch (e) {
          console.warn(`  ⚠️  ${rel} 上传失败: ${e.message}，保留原值`)
        }
      }
    } else {
      console.warn(`  ⚠️  ${rel} 云存储与本地均不存在，保留原值`)
    }
  }
  return urlMap
}

// 扫描各集合记录与待修复字段
async function scanAllCollections() {
  const result = []
  const specs = [
    { coll: 'poster_templates', fields: ['cover_url', 'background_url'] },
    { coll: 'templates', fields: ['cover', 'thumbnail', 'renderedImage', 'backgroundImage'] },
    { coll: 'works', fields: ['cover'] },
  ]
  for (const spec of specs) {
    const res = await db.collection(spec.coll).limit(1000).get()
    result.push({ coll: spec.coll, fields: spec.fields, records: res.data || [] })
  }
  return result
}

function collectRelPaths(obj, fields, out) {
  for (const f of fields) {
    const v = obj[f]
    if (typeof v === 'string') {
      const rel = extractRelPath(v)
      if (rel) out.add(rel)
    }
  }
  // 嵌套 JSON（config/data/elements/pages/background/tags）深度收集
  for (const key of Object.keys(obj)) {
    if (fields.includes(key)) continue
    const v = obj[key]
    if (v && typeof v === 'object') collectRelPathsDeep(v, out)
  }
}

function collectRelPathsDeep(v, out) {
  if (Array.isArray(v)) {
    v.forEach(x => collectRelPathsDeep(x, out))
  } else if (v && typeof v === 'object') {
    for (const key of Object.keys(v)) {
      const val = v[key]
      if (typeof val === 'string') {
        const rel = extractRelPath(val)
        if (rel) out.add(rel)
      } else if (val && typeof val === 'object') {
        collectRelPathsDeep(val, out)
      }
    }
  }
}

// 深度替换：/uploads/<path> → 真实 fileID
function replaceDeep(obj, urlMap) {
  let changed = false
  if (Array.isArray(obj)) {
    obj.forEach(x => { if (replaceDeep(x, urlMap)) changed = true })
    return changed
  }
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const val = obj[key]
      if (typeof val === 'string') {
        const rel = extractRelPath(val)
        if (rel && urlMap.has(rel)) {
          obj[key] = urlMap.get(rel)
          changed = true
        }
      } else if (val && typeof val === 'object') {
        if (replaceDeep(val, urlMap)) changed = true
      }
    }
  }
  return changed
}

async function fixCollections(urlMap) {
  const collections = await scanAllCollections()
  let updatedDocs = 0
  let changedFields = 0
  for (const { coll, fields, records } of collections) {
    let collChanged = 0
    for (const rec of records) {
      const updates = {}
      for (const f of fields) {
        const v = rec[f]
        if (typeof v === 'string') {
          const rel = extractRelPath(v)
          if (rel && urlMap.has(rel) && urlMap.get(rel) !== v) {
            updates[f] = urlMap.get(rel)
          }
        }
      }
      if (replaceDeep(rec, urlMap)) {
        // 深度替换后把修改过的嵌套字段写回（先收集，再整体更新）
        for (const key of Object.keys(rec)) {
          if (fields.includes(key)) continue
          if (typeof rec[key] === 'object' && rec[key] !== null) updates[key] = rec[key]
        }
      }
      if (Object.keys(updates).length > 0) {
        changedFields += Object.keys(updates).length
        if (dryRun) {
          console.log(`  🔍 [DRY-RUN] ${coll}/${rec._id}: 将更新 ${Object.keys(updates).join(', ')}`)
        } else {
          await db.collection(coll).doc(rec._id).update(updates)
        }
        collChanged++
      }
    }
    updatedDocs += collChanged
    console.log(`[url] ${coll}: ${collChanged} 条待更新`)
  }
  console.log(`[url] 共 ${updatedDocs} 条记录、${changedFields} 个字段${dryRun ? '（DRY-RUN）' : ' 已更新'}`)
}

// ============ 字体映射修复 ============

async function fixFontMap() {
  const fontNames = ['KazakhSoftAsilya', 'KazakhSoftAsilyaQaniq']
  const fontMap = {}

  for (const name of fontNames) {
    // 候选路径：uploads/fonts/<name>.ttf（历史上传位置）
    const candidates = [
      `cloud://${ENV_ID}.${BUCKET}/uploads/fonts/${name}.ttf`,
      `cloud://${ENV_ID}.${BUCKET}/fonts/${name}.ttf`,
    ]
    const { ok } = await probeFileIDs(candidates)
    if (ok.size > 0) {
      fontMap[name] = candidates.find(c => ok.has(c))
      console.log(`[font] ✅ ${name} → ${fontMap[name]}`)
      continue
    }
    // 本地重新上传
    const localPath = path.join(FONTS_DIR, `${name}.ttf`)
    if (!fs.existsSync(localPath)) {
      console.warn(`[font] ⚠️  ${name} 云存储与本地均不存在，跳过`)
      continue
    }
    if (dryRun) {
      console.log(`[font] 🔍 [DRY-RUN] ${name} 将重新上传`)
      continue
    }
    const buffer = fs.readFileSync(localPath)
    const res = await app.uploadFile({ cloudPath: `uploads/fonts/${name}.ttf`, fileContent: buffer })
    fontMap[name] = res.fileID
    console.log(`[font] 📤 ${name} 重新上传 → ${res.fileID}`)
  }

  if (Object.keys(fontMap).length === 0) {
    console.warn('[font] 无可写入的字体，跳过 font_map 更新')
    return
  }
  if (dryRun) {
    console.log(`[font] 🔍 [DRY-RUN] font_map 将更新为:`, JSON.stringify(fontMap))
    return
  }
  try {
    await db.collection('settings').doc('font_map').update({ value: fontMap })
  } catch (_) {
    await db.collection('settings').add({ _id: 'font_map', value: fontMap })
  }
  console.log(`[font] ✅ settings.font_map 已写入 ${Object.keys(fontMap).length} 个字体`)
}

// ============ 主流程 ============

async function main() {
  console.log(`[fix-cloud-urls] 环境: ${ENV_ID}${dryRun ? '（DRY-RUN）' : ''}\n`)
  const urlMap = await buildUrlMap()
  if (urlMap.size > 0) {
    await fixCollections(urlMap)
  } else {
    console.log('[url] 无相对路径引用，跳过')
  }
  console.log('')
  await fixFontMap()
  console.log('\n✅ 全部完成')
}

main().catch(e => {
  console.error('❌ 执行失败:', e)
  process.exit(1)
})