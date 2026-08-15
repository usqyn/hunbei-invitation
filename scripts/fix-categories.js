/**
 * 对齐云数据库 categories 集合，使其与模板数据/前端静态分类完全一致
 * 用法: node scripts/fix-categories.js [--dry-run]
 * 注意：@cloudbase/node-sdk v3 的 add/update/set 直接接收文档对象，无需 { data: } 包装
 */
const tcb = require('@cloudbase/node-sdk')
const fs = require('fs')
const path = require('path')

const ENV_ID = 'cloud1-d4gyvmo1d9a1e148a'

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

// 目标分类（与模板数据 category 值 + 前端 STATIC_CATEGORIES 完全一致）
const RENAME = {
  proposal: { id: 'engagement', name: '求婚', icon: '💍' },
  housewarming: { id: 'house', name: '乔迁', icon: '🏠' },
}
const REMOVE = ['ceremony'] // 仪式：无模板数据，多余标签
const RENAME_NAME = { wedding: '婚礼请柬' } // 名称与前端静态配置一致

async function main() {
  const res = await db.collection('categories').limit(100).get()
  const cats = res.data || []
  console.log(`[categories] 当前 ${cats.length} 条:`)
  cats.forEach(c => console.log(`  - _id=${c._id}  name=${c.name}  hasData=${typeof c.data === 'object' && c.data !== null}`))

  for (const c of cats) {
    const oldId = c._id
    // 0. 清理历史错误写入（data 包装导致的结构：{ _id, data: {...} }，无 name 字段）
    if (typeof c.name !== 'string' && c.data && typeof c.data === 'object') {
      console.log(`🧹 清理历史错误记录 ${oldId}（data 包装残留）`)
      if (!dryRun) await db.collection('categories').doc(oldId).remove()
      continue
    }
    // 1. 重命名 _id（proposal→engagement, housewarming→house）
    if (RENAME[oldId]) {
      const target = RENAME[oldId]
      if (cats.some(x => x._id === target.id)) {
        console.log(`⚠️  ${oldId}→${target.id} 已存在，跳过重命名`)
      } else {
        console.log(`🔄 ${oldId}(name=${c.name}) → ${target.id}`)
        if (!dryRun) {
          await db.collection('categories').add({ _id: target.id, name: target.name, icon: target.icon })
          await db.collection('categories').doc(oldId).remove()
        }
      }
    }
    // 2. 名称修正（wedding → 婚礼请柬），同时清掉可能的 data 残留字段
    if (RENAME_NAME[oldId] && c.name !== RENAME_NAME[oldId]) {
      console.log(`✏️  ${oldId}: name "${c.name}" → "${RENAME_NAME[oldId]}"`)
      if (!dryRun) {
        const patch = { name: RENAME_NAME[oldId] }
        if (c.data && typeof c.data === 'object') patch.data = null
        await db.collection('categories').doc(oldId).update(patch)
      }
    } else if (RENAME_NAME[oldId] && c.data && typeof c.data === 'object') {
      console.log(`🧹 ${oldId}: 清理 data 残留字段`)
      if (!dryRun) await db.collection('categories').doc(oldId).update({ data: null })
    }
    // 3. 删除多余分类
    if (REMOVE.includes(oldId)) {
      console.log(`🗑  删除 ${oldId}(name=${c.name})`)
      if (!dryRun) await db.collection('categories').doc(oldId).remove()
    }
  }

  const after = dryRun ? null : await db.collection('categories').limit(100).get()
  console.log('\n✅ 完成' + (dryRun ? '（DRY-RUN，未修改）' : '，当前分类：'))
  if (after) (after.data || []).forEach(c => console.log(`  - ${c._id}: ${c.name}`))
}

main().catch(e => {
  console.error('❌ 执行失败:', e)
  process.exit(1)
})