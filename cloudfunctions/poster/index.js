// ============ poster 云函数 ============
// 海报模板/作品/贴纸/统计，共 17 个路由：
// 用户路由（13个）：
//   GET    /api/poster/templates 列表（含 hot 推荐）
//   GET    /api/poster/templates/hot
//   GET    /api/poster/templates/:id 详情
//   GET    /api/poster/works + GET /api/poster/works/recycle + GET /api/poster/works/:id
//   POST   /api/poster/works + PUT /api/poster/works/:id
//   PUT    /api/poster/works/:id/restore
//   DELETE /api/poster/works/:id/permanent
//   DELETE /api/poster/works/:id（软删→recycle_bin_poster）
//   POST   /api/poster/works/:id/upload（base64）
//   GET    /api/poster/stickers
// 管理员路由（4个）：
//   POST   /api/poster/templates + PUT /api/poster/templates/:id + DELETE /api/poster/templates/:id
//   GET    /api/poster/stats
//
// 注意：
// 1. poster_templates / poster_works / recycle_bin_poster 是独立 collection
// 2. poster works 的 content 在 NoSQL 中直接存对象，无需 parse/stringify
// 3. /works/recycle 必须在 /works/:id 之前注册

const {
  db, collection, _, now, uuid,
  getUser, requireAuth, requireAdmin, isRequestFromAdmin,
  ok, okMsg, fail, httpOK, httpFail, httpOptions,
  parsePagination, paginateResponse, parseBody, matchRoute,
  uploadToCloud, getCloudUrl, getCloudUrls, resolveCloudFields,
} = require('./_shared')

// ============ 贴纸资源集合（云存储路径前缀） ============
// 贴纸列表从 settings.poster_stickers 读取（migrate-assets.js 会把本地贴纸上传到云存储并写入此设置）
const getStickerList = async () => {
  const res = await collection('settings').doc('poster_stickers').get().catch(() => ({ data: null }))
  let stickers = (res.data && res.data.value) || []
  if (typeof stickers === 'string') { try { stickers = JSON.parse(stickers) } catch (_) { stickers = [] } }
  return stickers
}

// ============ 模板列表 ============

// GET /api/poster/templates — 模板列表（含分页、category_id、keyword 过滤）
const listPosterTemplates = async (ctx) => {
  const { category_id, keyword, all } = ctx.query
  const { page, limit, skip, hasPaging } = parsePagination(ctx.query)
  // all=true 仅管理员可查下架模板
  const showAll = (all === 'true' || all === '1') && isRequestFromAdmin(ctx.event)
  const conditions = {}
  if (!showAll) conditions.is_active = 1
  if (category_id) conditions.category_id = category_id
  if (keyword) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    conditions.name = db.RegExp({ regexp: escaped, options: 'i' })
  }
  const countRes = await collection('poster_templates').where(conditions).count()
  const total = countRes.total || 0
  let q = collection('poster_templates').where(conditions)
  // 按 use_count 倒序、like_count 倒序
  q = q.orderBy('use_count', 'desc').orderBy('like_count', 'desc')
  const res = await q.skip(skip).limit(limit).get()
  const templates = res.data || []
  // 把 cover_url/background_url 的 cloud:// fileID 转为临时 https URL
  await resolveCloudFields(templates, ['cover_url', 'background_url'])
  return {
    success: true,
    data: templates,
    total,
    page,
    limit,
    hasMore: skip + templates.length < total,
  }
}

// GET /api/poster/templates/hot — 热门模板（最多 20 个）
const listHotPosterTemplates = async (ctx) => {
  const limit = Math.min(20, parseInt(ctx.query.limit, 10) || 10)
  const res = await collection('poster_templates')
    .where({ is_active: 1 })
    .orderBy('use_count', 'desc')
    .orderBy('like_count', 'desc')
    .limit(limit)
    .get()
  const templates = res.data || []
  await resolveCloudFields(templates, ['cover_url', 'background_url'])
  return ok(templates)
}

// GET /api/poster/templates/:id — 模板详情
const getPosterTemplate = async (ctx) => {
  const res = await collection('poster_templates').where({ id: ctx.params.id }).limit(1).get()
  if (!res.data || !res.data.length) return httpFail('模板不存在', 404)
  const template = res.data[0]
  // 非管理员不能查看已下架模板
  if (!template.is_active && !isRequestFromAdmin(ctx.event)) return httpFail('模板不存在', 404)
  await resolveCloudFields(template, ['cover_url', 'background_url'])
  return ok(template)
}

// ============ 作品 CRUD ============

// GET /api/poster/works — 用户作品列表（分页）
// poster_works 中 cover_url/poster_url 存的是 cloud:// fileID，需批量转为 https 临时 URL
const listPosterWorks = async (ctx) => {
  const user = getUser(ctx.event)
  if (!user || !user.phone) return httpFail('请先登录', 401)
  const userId = user.phone
  const { page, limit, skip, hasPaging } = parsePagination(ctx.query)
  const countRes = await collection('poster_works').where({ user_id: userId }).count()
  const total = countRes.total || 0
  let q = collection('poster_works').where({ user_id: userId }).orderBy('created_at', 'desc')
  let data
  if (hasPaging) {
    const res = await q.skip(skip).limit(limit).get()
    data = res.data || []
  } else {
    const res = await q.limit(1000).get()
    data = res.data || []
  }
  // 把 cover_url/poster_url 的 cloud:// fileID 转为临时 https URL
  await resolveCloudFields(data, ['cover_url', 'poster_url'])
  if (hasPaging) return paginateResponse(data, page, limit, total)
  return Object.assign(ok(data), { total: data.length })
}

// GET /api/poster/works/recycle — 回收站列表
// 必须注册在 /works/:id 之前
const listPosterRecycleBin = async (ctx) => {
  const user = getUser(ctx.event)
  if (!user || !user.phone) return httpFail('请先登录', 401)
  const userId = user.phone
  const { page, limit, skip, hasPaging } = parsePagination(ctx.query)
  const countRes = await collection('recycle_bin_poster').where({ user_id: userId }).count()
  const total = countRes.total || 0
  let q = collection('recycle_bin_poster').where({ user_id: userId }).orderBy('deleted_at', 'desc')
  let data
  if (hasPaging) {
    const res = await q.skip(skip).limit(limit).get()
    data = res.data || []
  } else {
    const res = await q.limit(1000).get()
    data = res.data || []
  }
  // 回收站 work_data 内可能含 cloud:// URL，一并解析
  await resolveCloudFields(data, ['poster_url', 'cover_url'])
  if (hasPaging) return paginateResponse(data, page, limit, total)
  return ok(data)
}

// GET /api/poster/works/:id — 作品详情（需校验所有权）
const getPosterWork = async (ctx) => {
  const user = getUser(ctx.event)
  if (!user || !user.phone) return httpFail('请先登录', 401)
  const res = await collection('poster_works').where({ id: ctx.params.id, user_id: user.phone }).limit(1).get()
  if (!res.data || !res.data.length) return httpFail('作品不存在', 404)
  const work = res.data[0]
  await resolveCloudFields(work, ['cover_url', 'poster_url'])
  return ok(work)
}

// POST /api/poster/works — 保存作品（同时更新模板使用次数）
const createPosterWork = async (ctx) => {
  const user = getUser(ctx.event)
  if (!user || !user.phone) return httpFail('请先登录', 401)
  const { template_id, template_name, cover_url, content, poster_url } = ctx.body
  const id = uuid()
  const ts = now()
  // 使用云数据库事务：保存作品 + 更新模板使用次数
  try {
    await db.runTransaction(async (transaction) => {
      await transaction.collection('poster_works').add({ data: {
        id, user_id: user.phone,
        template_id: template_id || '', template_name: template_name || '',
        cover_url: cover_url || '', content: content || {}, poster_url: poster_url || '',
        created_at: ts,
      } })
      if (template_id) {
        await transaction.collection('poster_templates').where({ id: template_id }).update({
          data: { use_count: _.inc(1) },
        })
      }
    })
  } catch (e) {
    console.error('createPosterWork transaction failed:', e)
    return httpFail('保存失败', 500)
  }
  const res = await collection('poster_works').where({ id }).limit(1).get()
  return ok(res.data[0])
}

// PUT /api/poster/works/:id — 更新作品
const updatePosterWork = async (ctx) => {
  const user = getUser(ctx.event)
  if (!user || !user.phone) return httpFail('请先登录', 401)
  const existing = await collection('poster_works').where({ id: ctx.params.id, user_id: user.phone }).limit(1).get()
  if (!existing.data || !existing.data.length) return httpFail('作品不存在', 404)
  const { template_id, template_name, cover_url, content, poster_url } = ctx.body
  const fields = {}
  if (template_id !== undefined) fields.template_id = template_id
  if (template_name !== undefined) fields.template_name = template_name
  if (cover_url !== undefined) fields.cover_url = cover_url
  if (content !== undefined) fields.content = content
  if (poster_url !== undefined) fields.poster_url = poster_url
  if (Object.keys(fields).length === 0) return ok(existing.data[0])
  await collection('poster_works').where({ id: ctx.params.id }).update({ data: fields })
  const res = await collection('poster_works').where({ id: ctx.params.id }).limit(1).get()
  return ok(res.data[0])
}

// POST /api/poster/works/:id/upload — 上传作品海报图（base64）
// 请求体：{ image: 'data:image/png;base64,...' }
// 上传到云存储后更新 poster_works.poster_url
const uploadPosterWorkImage = async (ctx) => {
  const user = getUser(ctx.event)
  if (!user || !user.phone) return httpFail('请先登录', 401)
  const workId = ctx.params.id
  const existing = await collection('poster_works').where({ id: workId, user_id: user.phone }).limit(1).get()
  if (!existing.data || !existing.data.length) return httpFail('作品不存在', 404)
  const { image } = ctx.body
  if (!image) return httpFail('请上传图片文件')
  const m = String(image).match(/^data:image\/(png|jpg|jpeg|webp);base64,(.+)$/i)
  if (!m) return httpFail('图片格式不支持，请使用 PNG/JPG/WebP')
  const buf = Buffer.from(m[2], 'base64')
  if (buf.length > 10 * 1024 * 1024) return httpFail('图片大小不能超过 10MB', 413)
  const ext = m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase()
  const cloudPath = `uploads/poster/works/${workId}.${ext}`
  const fileID = await uploadToCloud(buf, cloudPath, `image/${m[1].toLowerCase()}`)
  const httpsUrl = await getCloudUrl(fileID)
  // poster_url 存 fileID（永久引用 cloud://），运行时按需换取临时 URL
  await collection('poster_works').where({ id: workId }).update({ data: { poster_url: fileID } })
  return ok({ url: fileID, httpsUrl, cloudFileID: fileID })
}

// PUT /api/poster/works/:id/restore — 从回收站恢复
const restorePosterWork = async (ctx) => {
  const user = getUser(ctx.event)
  if (!user || !user.phone) return httpFail('请先登录', 401)
  const userId = user.phone
  const id = ctx.params.id
  // 按 work_id 查询回收站记录（软删除时存的是 work_id）
  const res = await collection('recycle_bin_poster').where({ work_id: id, user_id: userId }).limit(1).get()
  if (!res.data || !res.data.length) return httpFail('记录不存在', 404)
  const item = res.data[0]
  let workData = item.work_data
  if (typeof workData === 'string') { try { workData = JSON.parse(workData) } catch (_) {} }
  // 事务：恢复作品 + 删除回收站记录
  try {
    await db.runTransaction(async (transaction) => {
      await transaction.collection('poster_works').add({ data: {
        id: workData.id || id, user_id: workData.user_id || userId,
        template_id: workData.template_id || '', template_name: workData.template_name || '',
        cover_url: workData.cover_url || '', content: workData.content || {},
        poster_url: workData.poster_url || '', created_at: workData.created_at || now(),
      } })
      await transaction.collection('recycle_bin_poster').doc(item._id).remove()
    })
  } catch (e) {
    console.error('restorePosterWork failed:', e)
    return httpFail('恢复失败', 500)
  }
  return okMsg('已恢复')
}

// DELETE /api/poster/works/:id/permanent — 永久删除
const permanentDeletePosterWork = async (ctx) => {
  const user = getUser(ctx.event)
  if (!user || !user.phone) return httpFail('请先登录', 401)
  // 按 work_id 查询回收站记录（软删除时存的是 work_id）
  await collection('recycle_bin_poster').where({ work_id: ctx.params.id, user_id: user.phone }).remove()
  return okMsg('已永久删除')
}

// DELETE /api/poster/works/:id — 软删除（移入 recycle_bin_poster）
const deletePosterWork = async (ctx) => {
  const user = getUser(ctx.event)
  if (!user || !user.phone) return httpFail('请先登录', 401)
  const workRes = await collection('poster_works').where({ id: ctx.params.id, user_id: user.phone }).limit(1).get()
  if (!workRes.data || !workRes.data.length) return httpFail('作品不存在', 404)
  const work = workRes.data[0]
  const ts = now()
  // 事务：插入回收站 + 删除作品
  try {
    await db.runTransaction(async (transaction) => {
      await transaction.collection('recycle_bin_poster').add({ data: {
        user_id: user.phone, work_id: ctx.params.id,
        work_data: work, deleted_at: ts,
      } })
      await transaction.collection('poster_works').where({ id: ctx.params.id }).remove()
    })
  } catch (e) {
    console.error('deletePosterWork failed:', e)
    return httpFail('删除失败', 500)
  }
  return okMsg('删除成功，已移入回收站')
}

// ============ 贴纸 ============

// GET /api/poster/stickers — 贴纸列表（从 settings.poster_stickers 读取）
const listStickers = async (ctx) => {
  const stickers = await getStickerList()
  return Object.assign(ok(stickers), { total: stickers.length })
}

// ============ 管理员路由 ============

// POST /api/poster/templates — 创建模板
const createPosterTemplate = async (ctx) => {
  const auth = requireAdmin(ctx.event)
  if (!auth.ok) return auth.body
  const { name, category_id, cover_url, background_url, config, is_free, is_vip, is_active } = ctx.body
  if (!name || !category_id) return httpFail('缺少必填字段: name, category_id')
  if (typeof name !== 'string' || name.length > 100) return httpFail('模板名称不能超过 100 个字符')
  const id = ctx.body.id || `tpl_${uuid().substring(0, 8)}`
  const existing = await collection('poster_templates').where({ id }).limit(1).get()
  if (existing.data && existing.data.length) return httpFail(`模板 ID ${id} 已存在`)
  const ts = now()
  await collection('poster_templates').add({ data: {
    id, name, category_id,
    cover_url: cover_url || '', background_url: background_url || '',
    config: config || {}, is_free: is_free !== undefined ? is_free : 1,
    is_vip: is_vip !== undefined ? is_vip : 0,
    like_count: 0, use_count: 0,
    is_active: is_active !== undefined ? is_active : 1,
    created_at: ts,
  } })
  const res = await collection('poster_templates').where({ id }).limit(1).get()
  return ok(res.data[0])
}

// PUT /api/poster/templates/:id — 更新模板
const updatePosterTemplate = async (ctx) => {
  const auth = requireAdmin(ctx.event)
  if (!auth.ok) return auth.body
  const id = ctx.params.id
  const existing = await collection('poster_templates').where({ id }).limit(1).get()
  if (!existing.data || !existing.data.length) return httpFail('模板不存在', 404)
  const body = ctx.body
  if (body.name !== undefined && (typeof body.name !== 'string' || body.name.length > 100)) {
    return httpFail('模板名称不能超过 100 个字符')
  }
  // 仅允许更新非统计字段（like_count/use_count 不可改）
  const allowed = ['name', 'category_id', 'cover_url', 'background_url', 'config', 'is_free', 'is_vip', 'is_active']
  const fields = {}
  allowed.forEach(f => { if (body[f] !== undefined) fields[f] = body[f] })
  if (Object.keys(fields).length === 0) return ok(existing.data[0])
  await collection('poster_templates').where({ id }).update({ data: fields })
  const res = await collection('poster_templates').where({ id }).limit(1).get()
  return ok(res.data[0])
}

// DELETE /api/poster/templates/:id — 删除模板（物理删除）
const deletePosterTemplate = async (ctx) => {
  const auth = requireAdmin(ctx.event)
  if (!auth.ok) return auth.body
  const id = ctx.params.id
  const existing = await collection('poster_templates').where({ id }).limit(1).get()
  if (!existing.data || !existing.data.length) return httpFail('模板不存在', 404)
  await collection('poster_templates').where({ id }).remove()
  return okMsg('删除成功')
}

// GET /api/poster/stats — 管理员统计
const getPosterStats = async (ctx) => {
  const auth = requireAdmin(ctx.event)
  if (!auth.ok) return auth.body
  const $ = db.command.aggregate
  // 模板总数、上架数、免费数、VIP 数
  const totalRes = await collection('poster_templates').count()
  const totalTemplates = totalRes.total || 0
  const activeRes = await collection('poster_templates').where({ is_active: 1 }).count()
  const activeTemplates = activeRes.total || 0
  const freeRes = await collection('poster_templates').where({ is_free: 1 }).count()
  const freeTemplates = freeRes.total || 0
  const vipRes = await collection('poster_templates').where({ is_vip: 1 }).count()
  const vipTemplates = vipRes.total || 0
  // 作品总数
  const worksRes = await collection('poster_works').count()
  const totalWorks = worksRes.total || 0
  // 总使用次数、总点赞数（aggregate sum）
  let totalUses = 0, totalLikes = 0, byCategory = {}
  try {
    const useAgg = await collection('poster_templates').aggregate().group({ _id: null, total: $.sum('$use_count') }).end()
    totalUses = (useAgg.list && useAgg.list[0] && useAgg.list[0].total) || 0
    const likeAgg = await collection('poster_templates').aggregate().group({ _id: null, total: $.sum('$like_count') }).end()
    totalLikes = (likeAgg.list && likeAgg.list[0] && likeAgg.list[0].total) || 0
    const catAgg = await collection('poster_templates').aggregate().group({ _id: '$category_id', count: $.sum(1) }).end()
    ;(catAgg.list || []).forEach(row => { byCategory[row._id] = row.count })
  } catch (e) {
    console.warn('poster stats aggregate failed:', e.message)
  }
  return ok({
    totalTemplates, activeTemplates, freeTemplates, vipTemplates,
    totalWorks, totalUses, totalLikes, byCategory,
  })
}

// ============ 路由表（顺序敏感：hot/recycle/permanent 必须在 :id 前） ============
const routes = [
  // 模板（静态路径优先）
  ['GET', '/api/poster/templates/hot', listHotPosterTemplates],
  ['GET', '/api/poster/templates', listPosterTemplates],
  ['POST', '/api/poster/templates', createPosterTemplate],
  ['GET', '/api/poster/templates/:id', getPosterTemplate],
  ['PUT', '/api/poster/templates/:id', updatePosterTemplate],
  ['DELETE', '/api/poster/templates/:id', deletePosterTemplate],
  // 作品（recycle/permanent/restore/upload 为静态路径，必须在 :id 前）
  ['GET', '/api/poster/works/recycle', listPosterRecycleBin],
  ['GET', '/api/poster/works', listPosterWorks],
  ['POST', '/api/poster/works', createPosterWork],
  ['GET', '/api/poster/works/:id', getPosterWork],
  ['PUT', '/api/poster/works/:id', updatePosterWork],
  ['PUT', '/api/poster/works/:id/restore', restorePosterWork],
  ['DELETE', '/api/poster/works/:id/permanent', permanentDeletePosterWork],
  ['DELETE', '/api/poster/works/:id', deletePosterWork],
  ['POST', '/api/poster/works/:id/upload', uploadPosterWorkImage],
  // 贴纸
  ['GET', '/api/poster/stickers', listStickers],
  // 统计
  ['GET', '/api/poster/stats', getPosterStats],
]

// ============ 云函数入口 ============
exports.main = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') return httpOptions()
  const { httpMethod, path: eventPath, queryStringParameters } = event
  for (const [method, pattern, handler] of routes) {
    if (method !== httpMethod) continue
    const params = matchRoute(pattern, eventPath)
    if (params === null) continue
    try {
      const ctx = {
        method: httpMethod, path: eventPath,
        query: queryStringParameters || {}, body: parseBody(event),
        params, headers: event.headers || {}, event, context,
      }
      const result = await handler(ctx)
      if (result && result.statusCode) return result
      return httpOK(result)
    } catch (e) {
      console.error(`[poster] ${httpMethod} ${eventPath} error:`, e)
      return httpFail('服务器内部错误', 500)
    }
  }
  return httpFail('接口不存在', 404)
}
