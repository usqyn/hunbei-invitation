const cloud = require('wx-server-sdk')
const path = require('path')
const fs = require('fs')

cloud.init({ env: 'cloud1-d4gyvmo1d9a1e148a' })
const db = cloud.database()
const MAX_TIME = 2800 // 留 200ms 余量

function buildBatchList() {
  const batchDir = path.resolve(__dirname, 'batches')
  const manifest = JSON.parse(fs.readFileSync(path.join(batchDir, '_manifest.json'), 'utf8'))
  const list = []
  for (const entry of manifest) {
    if (!entry.chunkFiles) continue
    for (const cf of entry.chunkFiles) {
      list.push({
        collection: entry.collection,
        pk: entry.pk || null,
        file: cf.file,
        count: cf.count
      })
    }
  }
  return list
}

async function importOneBatch(batchInfo) {
  const batchDir = path.resolve(__dirname, 'batches')
  const data = require(path.join(batchDir, batchInfo.file))
  const { collection, pk } = batchInfo

  let ok = 0
  const tasks = data.map(async (doc) => {
    const clean = { ...doc }
    delete clean._id
    try {
      if (pk && clean[pk] !== undefined && clean[pk] !== null) {
        const id = String(clean[pk])
        delete clean[pk]
        await db.collection(collection).doc(id).set({ data: clean })
      } else {
        await db.collection(collection).add({ data: clean })
      }
      return true
    } catch (e) {
      return false
    }
  })

  const results = await Promise.allSettled(tasks)
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value === true) ok++
  }
  return { ok, fail: batchInfo.count - ok }
}

exports.main = async (event) => {
  const allBatches = buildBatchList()
  const total = allBatches.length
  const startTime = Date.now()
  let idx = event.batchIndex !== undefined ? event.batchIndex : 0
  let totalOk = 0, totalFail = 0, processed = 0

  if (idx >= total) {
    return { done: true, message: `全部 ${total} 批已完成` }
  }

  console.log(`从第 ${idx + 1}/${total} 批开始，时间窗口 ${MAX_TIME}ms...`)

  while (idx < total) {
    if (Date.now() - startTime > MAX_TIME) break

    const batch = allBatches[idx]
    console.log(`[${idx + 1}/${total}] ${batch.collection}(${batch.count}) ← ${batch.file}`)
    const { ok, fail } = await importOneBatch(batch)
    totalOk += ok; totalFail += fail
    processed++
    idx++
  }

  const elapsed = Date.now() - startTime
  console.log(`本轮完成: ${processed} 批, ${totalOk} ok, ${totalFail} fail, 耗时 ${elapsed}ms`)

  if (idx < total) {
    console.log(`剩余 ${total - idx} 批，请传入 { "batchIndex": ${idx} } 继续`)
    return {
      done: false,
      processed,
      totalOk, totalFail,
      progress: `${idx}/${total}`,
      nextBatchIndex: idx,
      hint: `传入 { "batchIndex": ${idx} } 继续`
    }
  }

  console.log(`全部 ${total} 批完成！`)
  return { done: true, total, totalOk, totalFail }
}
