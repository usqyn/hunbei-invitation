// ============ 分批上传脚本：读取 JSON 批次文件 → 写入云数据库 ============
// 需要环境变量: TCB_SECRET_ID, TCB_SECRET_KEY
const path = require('path')
const fs = require('fs')

const ENV_ID = process.env.TCB_ENV_ID || 'cloud1-d4gyvmo1d9a1e148a'
const SECRET_ID = process.env.TCB_SECRET_ID
const SECRET_KEY = process.env.TCB_SECRET_KEY
const BATCH_DIR = path.resolve(__dirname, '..', '.migration_batches')
const MANIFEST_PATH = path.join(BATCH_DIR, 'manifest.json')

if (!SECRET_ID || !SECRET_KEY) {
  console.log('需要设置云开发密钥:')
  console.log('  set TCB_SECRET_ID=你的SecretId')
  console.log('  set TCB_SECRET_KEY=你的SecretKey')
  console.log('获取地址: https://console.cloud.tencent.com/cam/capi')
  process.exit(1)
}

const main = async () => {
  const tcb = require('@cloudbase/node-sdk')
  const app = tcb.init({
    env: ENV_ID,
    secretId: SECRET_ID,
    secretKey: SECRET_KEY,
  })
  const db = app.database()

  if (!fs.existsSync(BATCH_DIR)) {
    console.error(`批次目录不存在: ${BATCH_DIR}`)
    console.error('请先运行: node extract-and-upload.js')
    process.exit(1)
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
  console.log(`连接云环境: ${ENV_ID}`)
  console.log(`待导入: ${manifest.length} 个集合, ${manifest.reduce((s,m) => s + m.total, 0)} 条记录\n`)

  let totalOk = 0
  let totalFail = 0

  for (const { collection, pk, batchCount, total } of manifest) {
    if (total === 0) {
      console.log(`  SKIP ${collection}: 空表`)
      continue
    }

    let collOk = 0
    let collFail = 0
    console.log(`  ${collection}: ${total} 条, ${batchCount} 批`)

    for (let b = 0; b < batchCount; b++) {
      const fileName = `${collection}_batch${b.toString().padStart(3, '0')}.json`
      const filePath = path.join(BATCH_DIR, fileName)
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))

      for (const doc of data) {
        try {
          if (pk && doc[pk] !== undefined && doc[pk] !== null) {
            const id = String(doc[pk])
            const clean = { ...doc }
            delete clean._id
            // 先删后加（upsert）
            try { await db.collection(collection).doc(id).remove() } catch (_) {}
            await db.collection(collection).add({ ...clean, _id: id })
          } else {
            await db.collection(collection).add(doc)
          }
          collOk++
        } catch (e) {
          // 如果 _id 冲突就更新
          if (pk && e.code === 'DATABASE_DUPLICATE_KEY') {
            try {
              const id = String(doc[pk])
              const clean = { ...doc }
              delete clean._id
              delete clean[pk]
              await db.collection(collection).doc(id).update(clean)
              collOk++
              continue
            } catch (_) {}
          }
          collFail++
          if (collFail <= 2) {
            console.log(`    FAIL [${collection}]: ${e.message || e.code}`)
          }
        }
      }

      process.stdout.write(`    批次 ${b + 1}/${batchCount} 完成\r`)
    }

    console.log(`  ✓ ${collection}: ${collOk} 条 (${collFail} 失败)`)
    totalOk += collOk
    totalFail += collFail

    // 每集合之间短暂停顿，避免频率限制
    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`\n========== 完成 ==========`)
  console.log(`成功: ${totalOk} 条, 失败: ${totalFail} 条`)
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
