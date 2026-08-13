// ============ restore-covers 一次性恢复云函数 ============
// 用途：修复 40 条 cover=cloud:// 但云存储文件不存在的模板封面
//   （此前用 API Key 沙箱误操作：数据库 update 生效但文件未真正上传）
// 方法：从 data/elements/pages/background 字段中提取 data:image base64 原图，
//       重新上传到云存储 covers/ 目录（云端运行，上传真实），更新 cover
// 使用：微信开发者工具 → 右键此目录 → 上传并部署（云端安装依赖）
//       云开发控制台 → 云函数 → restore-covers → 云端测试（直接运行即可）
// 注意：云函数超时时间设置为 60 秒（云开发控制台 → 配置）

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const BATCH = 10

function extractBase64Images(doc) {
  const found = []
  for (const field of ['data', 'elements', 'pages', 'background']) {
    const v = doc[field]
    if (!v) continue
    const s = JSON.stringify(v)
    const re = /data:(image\/(?:png|jpe?g|gif|webp));base64,([A-Za-z0-9+/=\s]+)/g
    let m
    while ((m = re.exec(s)) !== null) found.push({ mime: m[1], b64: m[2].replace(/\s/g, '') })
  }
  return found
}

exports.main = async () => {
  const total = { scanned: 0, restored: 0, noCopy: [], failed: [] }
  let offset = 0

  while (true) {
    const res = await db.collection('templates')
      .skip(offset).limit(BATCH)
      .field({ cover: true, data: true, elements: true, pages: true, background: true })
      .get()
    const rows = res.data || []
    if (!rows.length) break
    total.scanned += rows.length

    for (const t of rows) {
      const cover = t.cover || ''
      if (!cover.startsWith('cloud://')) continue

      const imgs = extractBase64Images(t)
      if (!imgs.length) {
        total.noCopy.push(t._id)
        console.warn(`[NOCOPY] ${t._id}`)
        continue
      }

      try {
        // 优先挑选最大的图片（封面通常是最大的那张）
        const sizes = imgs.map(img => img.b64.length)
        const bestIdx = sizes.indexOf(Math.max(...sizes))
        const img = imgs[bestIdx]
        const ext = img.mime === 'image/jpeg' ? 'jpg' : img.mime.replace('image/', '')
        const buf = Buffer.from(img.b64, 'base64')
        if (!buf.length) throw new Error('base64 解码为空')
        const fileID = await cloud.uploadFile({
          cloudPath: `covers/${t._id}.${ext}`,
          fileContent: buf,
        }).then(r => r.fileID)
        // 自检：确认文件真实存在（防止假成功）
        const chk = await cloud.getTempFileURL({ fileList: [fileID] })
        const item = (chk.fileList || [])[0]
        if (!item || item.status !== 0) throw new Error('上传自检失败')
        await db.collection('templates').doc(t._id).update({ data: { cover: fileID } })
        total.restored++
        console.log(`[OK] ${t._id.slice(0, 8)} ${(buf.length / 1024).toFixed(0)}KB -> ${fileID.slice(-30)}`)
      } catch (e) {
        total.failed.push({ id: t._id, error: e.message })
        console.error(`[FAIL] ${t._id}: ${e.message}`)
      }
    }

    if (rows.length < BATCH) break
    offset += rows.length
  }

  console.log('恢复完成:', JSON.stringify(total))
  return total
}