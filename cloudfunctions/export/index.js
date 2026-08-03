// ============ export 云函数 ============
// 请柬导出/海报导出，共 2 个路由：
//   POST /api/export（请柬导出，VIP 校验：非VIP强制 watermark=true）
//   POST /api/export/poster（海报导出，占位实现返回 placeholder URL）

const {
  db, collection, _, now,
  getUser, requireAuth,
  ok, okMsg, fail, httpOK, httpFail, httpOptions,
  parseBody, matchRoute, isUserVip, createRouter,
} = require('./_shared')

// POST /api/export — 请柬导出
// VIP 校验：非 VIP 强制 watermark=true
// 导出 URL 解析逻辑（与原 Express 一致）：
// 1. 先从 works 表查 template_id
// 2. 用 template_id 查 templates 表的 renderedImage
// 3. template_id 为空时直接用 workId 查（兼容旧数据）
// 4. 都查不到则用作品 data 中的 renderedImage
const exportInvitation = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const phone = auth.user.phone
  const { workId, watermark, quality } = ctx.body
  if (!workId) return httpFail('缺少 workId')
  // VIP 状态检查：非 VIP 只能带水印导出
  const isVip = await isUserVip(phone)
  const forceWatermark = !isVip
  let url = ''
  let templateId = ''
  let workData = null
  // 1. 从 works 表查 template_id 和 data
  const workRes = await collection('works').where({ id: workId, phone }).limit(1).get()
  if (workRes.data && workRes.data.length) {
    templateId = workRes.data[0].template_id || ''
    workData = workRes.data[0].data || null
  }
  // 2. 用 template_id 查 templates 表 renderedImage
  if (!url && templateId) {
    const tplRes = await collection('templates').where({ id: templateId, status: _.neq('deleted') }).limit(1).get()
    if (tplRes.data && tplRes.data[0] && tplRes.data[0].renderedImage) {
      url = tplRes.data[0].renderedImage
    }
  }
  // 3. template_id 为空时直接用 workId 查（兼容旧数据）
  if (!url && !templateId) {
    const res = await collection('templates').where({ id: workId }).limit(1).get()
    if (res.data && res.data[0] && res.data[0].renderedImage) {
      url = res.data[0].renderedImage
    }
  }
  // 4. 兜底：作品 data 中的 renderedImage
  if (!url && workData) {
    if (workData.renderedImage) url = workData.renderedImage
    else if (workData.templateData && workData.templateData.renderedImage) url = workData.templateData.renderedImage
  }
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000
  return ok({
    url: url || '/static/images/placeholder.png',
    expiresAt,
    watermark: forceWatermark || watermark,
  })
}

// POST /api/export/poster — 海报导出（占位实现）
const exportPoster = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const { workId } = ctx.body
  if (!workId) return httpFail('缺少 workId')
  return ok({ url: '/static/images/poster-placeholder.png' })
}

// ============ 路由表 ============
const routes = [
  ['POST', '/api/export', exportInvitation],
  ['POST', '/api/export/poster', exportPoster],
]

// ============ 云函数入口 ============
exports.main = createRouter(routes, 'export')
