// ============ backfill-covers 一次性迁移云函数 ============
// 用途：修复 iOS 模板广场封面问题
//   1. cover 为 data:image 的 base64 → 上传云存储 covers/ 目录，cover 改为 cloud://fileID
//      （base64 封面会使 callFunction 响应超过 1MB 上限，iOS 必失败）
//   2. cover 为 /static/images/templates/*.svg → 改为 .png（微信小程序 image 组件不支持 SVG）
// 使用：微信开发者工具 → 右键此目录 → 上传并部署（云端安装依赖）
//       云开发控制台 → 云函数 → backfill-covers → 云端测试（直接运行即可）
// 注意：云函数超时时间请设置为 60 秒、内存 512MB（云开发控制台 → 配置）

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const BATCH = 20 // 每批只投影 _id/cover，避免拉取超大 data/elements 字段导致内存超限

exports.main = async () => {
  const total = { scanned: 0, uploaded: 0, svgFixed: 0, failed: 0, skipped: [] }
  let offset = 0

  while (true) {
    const res = await db.collection('templates')
      .skip(offset).limit(BATCH)
      .field({ cover: true })
      .get()
    const rows = res.data || []
    if (!rows.length) break
    total.scanned += rows.length

    for (const t of rows) {
      const cover = t.cover || ''
      try {
        if (typeof cover !== 'string' || !cover) continue

        if (cover.startsWith('data:image')) {
          const m = cover.match(/^data:(image\/(\w+));base64,(.+)$/)
          if (!m) { throw new Error('base64 格式无法解析') }
          const ext = m[2] === 'jpeg' ? 'jpg' : m[2]
          const buf = Buffer.from(m[3], 'base64')
          if (!buf.length) { throw new Error('base64 内容为空') }
          const fileID = await cloud.uploadFile({
            cloudPath: `covers/${t._id}.${ext}`,
            fileContent: buf,
          }).then(r => r.fileID)
          await db.collection('templates').doc(t._id).update({ data: { cover: fileID } })
          total.uploaded++
          console.log(`[UPLOAD] ${t._id} ${(buf.length / 1024).toFixed(0)}KB -> ${fileID}`)
        }

        if (cover.endsWith('.svg')) {
          const pngPath = cover.replace(/\.svg$/, '.png')
          await db.collection('templates').doc(t._id).update({ data: { cover: pngPath } })
          total.svgFixed++
          console.log(`[SVG] ${t._id} ${cover} -> ${pngPath}`)
        }
      } catch (e) {
        total.failed++
        total.skipped.push({ id: t._id, error: e.message })
        console.error(`[FAIL] ${t._id}: ${e.message}`)
      }
    }

    if (rows.length < BATCH) break
    offset += rows.length
  }

  console.log('迁移完成:', JSON.stringify(total))
  return total
}