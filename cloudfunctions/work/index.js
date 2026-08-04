// ============ work 云函数 ============
// 作品 CRUD + 回收站，共 7 个路由：
//   GET    /api/works
//   GET    /api/works/:id
//   POST   /api/works
//   PUT    /api/works/:id
//   GET    /api/works/recycle（合并主库 recycle_bin 与 poster 库 recycle_bin_poster）
//   PUT    /api/works/:id/restore
//   DELETE /api/works/:id（两段式：首次软删→回收站；二次永久删）
//
// 注意：recycle 路由必须在 :id 之前注册，否则 'recycle' 会被 :id 匹配。

const {
  db, collection, _, now, uuid,
  getUser, requireAuth,
  ok, okMsg, fail, httpOK, httpFail, httpOptions,
  parsePagination, paginateResponse, parseBody, matchRoute,
  resolveCloudFields, resolveCloudUrlsDeep, normalizeUploadPaths, normalizeUploadPathsDeep, createRouter,
} = require('./_shared')

// ============ 作品 CRUD ============

// GET /api/works — 当前用户作品列表（按 updated_at 倒序）
// works.cover 存的是 cloud:// fileID，需解析为 https 临时 URL
// 合并查询 poster_works，让海报作品也出现在列表中（字段名: user_id）
// poster_works 的字段名（cover_url/content/user_id）需归一化为前端期望的 camelCase（cover/data/phone），
// 与 server/index.js 的 /api/works 列表合并逻辑保持一致
const listWorks = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  // 主库 works（按 phone）
  const res = await collection('works').where({ phone: auth.user.phone }).orderBy('updated_at', 'desc').limit(1000).get()
  // 海报库 poster_works（按 user_id）
  let posterData = []
  try {
    const posterRes = await collection('poster_works').where({ user_id: auth.user.phone }).orderBy('created_at', 'desc').limit(500).get()
    posterData = (posterRes.data || []).map(p => ({
      ...p,
      // 归一化字段：poster_works 用 user_id/cover_url/content，前端读 phone/cover/data
      phone: p.user_id || p.phone || auth.user.phone,
      cover: p.cover_url || p.cover || p.poster_url || '',
      data: p.content || p.data || {},
      templateType: p.template_type || p.templateType || 'poster',
      // 标记来源，便于前端区分
      _source: 'poster',
    }))
  } catch (_) { /* poster_works 集合可能未创建，忽略 */ }
  // 合并后按 updated_at 倒序（poster_works 没有 updated_at，回退 created_at）
  const merged = [...(res.data || []), ...posterData]
  merged.sort((a, b) => {
    const ta = new Date(a.updated_at || a.updatedAt || a.created_at || a.createdAt || 0).getTime()
    const tb = new Date(b.updated_at || b.updatedAt || b.created_at || b.createdAt || 0).getTime()
    return tb - ta
  })
  await resolveCloudFields(merged, ['cover'])
  // 与 getWork/listRecycleBin 一致：把 /uploads/ 相对路径补全为完整 HTTPS URL
  normalizeUploadPaths(merged, ['cover'])
  return ok(merged)
}

// GET /api/works/:id — 作品详情（需校验所有权）
// works.cover 和 works.data（嵌套 JSON）中的 cloud:// URL 需解析
// 同时调用 normalizeUploadPathsDeep 补全 /uploads/ 相对路径为完整 HTTPS URL（与 template/index.js getTemplate 行为一致）
const getWork = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const res = await collection('works').where({ id: ctx.params.id, phone: auth.user.phone }).limit(1).get()
  if (!res.data || !res.data.length) return httpFail('作品不存在', 404)
  const work = res.data[0]
  // 解析顶层 cloud:// URL
  await resolveCloudFields(work, ['cover'])
  // 解析嵌套 JSON 中的 cloud:// URL（data 内含元素图片 URL）
  await resolveCloudUrlsDeep(work.data)
  // 补全 /uploads/ 相对路径与 localhost URL（与 getTemplate 一致）
  normalizeUploadPathsDeep(work.data)
  return ok(work)
}

// GET /api/works/share/:id — 公开访问作品（被分享者通过 workId 查看内容，不校验 phone）
// 仅返回渲染所需的只读字段，不暴露作者 phone
const getSharedWork = async (ctx) => {
  const res = await collection('works').where({ id: ctx.params.id }).limit(1).get()
  if (!res.data || !res.data.length) return httpFail('作品不存在', 404)
  const work = res.data[0]
  await resolveCloudFields(work, ['cover'])
  await resolveCloudUrlsDeep(work.data)
  normalizeUploadPathsDeep(work.data)
  // 仅返回渲染所需字段，剔除 phone 等敏感信息
  const { phone, ...safeWork } = work
  return ok(safeWork)
}

// POST /api/works — 创建/覆盖作品（INSERT OR REPLACE 语义）
const createWork = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const { id, templateId, template_type, templateType, title, data, music_id, musicId, cover, image } = ctx.body
  // 兼容：image 字段作为 cover 的兜底
  const coverValue = cover || image || ''
  const workId = id || uuid()
  const ts = now()
  // 若指定 id，检查归属
  if (id) {
    const existing = await collection('works').where({ id }).limit(1).get()
    if (existing.data && existing.data.length && existing.data[0].phone !== auth.user.phone) {
      return httpFail('无权操作此作品', 403)
    }
  }
  // 覆盖：先删旧的同 id 记录，再插入新数据（模拟 INSERT OR REPLACE）
  if (id) {
    try { await collection('works').where({ id }).remove() } catch (_) {}
  }
  await collection('works').add({ data: {
    id: workId, phone: auth.user.phone,
    template_id: templateId || '', template_type: templateType || template_type || 'canvas',
    title: title || '', data: data || {}, music_id: musicId || music_id || '',
    cover: coverValue, created_at: ts, updated_at: ts,
  } })
  const res = await collection('works').where({ id: workId }).limit(1).get()
  return ok(res.data[0])
}

// PUT /api/works/:id — 更新作品
const updateWork = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const existing = await collection('works').where({ id: ctx.params.id, phone: auth.user.phone }).limit(1).get()
  if (!existing.data || !existing.data.length) return httpFail('作品不存在', 404)
  const { templateId, template_type, templateType, title, data, music_id, musicId, cover, image } = ctx.body
  const coverValue = cover !== undefined ? cover : image
  const fields = {}
  if (templateId !== undefined) fields.template_id = templateId
  if (templateType !== undefined) fields.template_type = templateType
  else if (template_type !== undefined) fields.template_type = template_type
  if (title !== undefined) fields.title = title
  if (data !== undefined) fields.data = data
  if (musicId !== undefined) fields.music_id = musicId
  else if (music_id !== undefined) fields.music_id = music_id
  if (coverValue !== undefined) fields.cover = coverValue
  fields.updated_at = now()
  await collection('works').where({ id: ctx.params.id }).update({ data: fields })
  const res = await collection('works').where({ id: ctx.params.id }).limit(1).get()
  return ok(res.data[0])
}

// ============ 回收站 ============

// GET /api/works/recycle — 合并主库 recycle_bin 与 poster 库 recycle_bin_poster
// 每条带 source: 'template' | 'poster' 标记，按时间倒序
// 返回结构：{ id, title, image, deletedAt, source }（展平 work_data，供小程序页面直接使用）
const listRecycleBin = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const phone = auth.user.phone
  const { page, limit, skip, hasPaging } = parsePagination(ctx.query)

  // 主库 recycle_bin：按 phone 过滤
  const mainRes = await collection('recycle_bin').where({ phone }).orderBy('deletedAt', 'desc').limit(500).get()
  const mainItems = (mainRes.data || []).map(it => {
    const w = it.work_data || {}
    let wd = w
    if (typeof wd === 'string') { try { wd = JSON.parse(wd) } catch (_) {} }
    return {
      id: it.work_id || wd.id || '',
      title: wd.title || wd.template_name || '',
      image: wd.cover || wd.cover_url || '',
      deletedAt: it.deletedAt || it.deleted_at || '',
      source: 'template',
    }
  })

  // poster 库 recycle_bin_poster：按 user_id 过滤（字段名不同）
  const posterRes = await collection('recycle_bin_poster').where({ user_id: phone }).orderBy('deleted_at', 'desc').limit(500).get()
  const posterItems = (posterRes.data || []).map(it => {
    const w = it.work_data || {}
    let wd = w
    if (typeof wd === 'string') { try { wd = JSON.parse(wd) } catch (_) {} }
    return {
      id: it.work_id || wd.id || '',
      title: wd.title || wd.template_name || '',
      image: wd.cover || wd.cover_url || '',
      deletedAt: it.deletedAt || it.deleted_at || '',
      source: 'poster',
    }
  })

  // 合并并按时间倒序（兼容 deletedAt 和 deleted_at 两种字段名）
  let allItems = [...mainItems, ...posterItems].sort((a, b) => {
    const timeA = a.deletedAt || ''
    const timeB = b.deletedAt || ''
    return String(timeB).localeCompare(String(timeA))
  })

  // 解析 image 中的 cloud:// 协议与相对路径
  await resolveCloudFields(allItems, ['image'])
  normalizeUploadPaths(allItems, ['image'])

  if (hasPaging) {
    const total = allItems.length
    const totalPages = Math.ceil(total / limit)
    const paginated = allItems.slice(skip, skip + limit)
    return paginateResponse(paginated, page, limit, total)
  }
  return ok(allItems)
}

// PUT /api/works/:id/restore — 从回收站恢复（先查主库，再查 poster 库）
const restoreWork = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const id = ctx.params.id
  const phone = auth.user.phone

  // 1. 查主库 recycle_bin（按 work_id 查，与原 Express 一致）
  const mainRes = await collection('recycle_bin').where({ work_id: id, phone }).limit(1).get()
  if (mainRes.data && mainRes.data.length) {
    const item = mainRes.data[0]
    let workData = item.work_data
    if (typeof workData === 'string') { try { workData = JSON.parse(workData) } catch (_) {} }
    // 恢复到 works 集合
    const ts = now()
    await collection('works').add({ data: {
      id: workData.id || id, phone,
      template_id: workData.templateId || workData.template_id || '',
      template_type: workData.templateType || workData.template_type || 'canvas',
      title: workData.title || '', data: workData.data || {},
      music_id: workData.musicId || workData.music_id || '',
      cover: workData.cover || '',
      created_at: workData.createdAt || workData.created_at || ts,
      updated_at: ts,
    } })
    // 按 _id 删除（云数据库 doc 删除）
    await collection('recycle_bin').doc(item._id).remove()
    return okMsg('已恢复')
  }

  // 2. 查 poster 库 recycle_bin_poster（按 work_id 查）
  const posterRes = await collection('recycle_bin_poster').where({ work_id: id, user_id: phone }).limit(1).get()
  if (posterRes.data && posterRes.data.length) {
    const item = posterRes.data[0]
    let workData = item.work_data
    if (typeof workData === 'string') { try { workData = JSON.parse(workData) } catch (_) {} }
    // 恢复到 poster_works 集合
    await collection('poster_works').add({ data: {
      id: workData.id || id, user_id: workData.user_id || phone,
      template_id: workData.template_id || '', template_name: workData.template_name || '',
      cover_url: workData.cover_url || '', content: workData.content || '{}',
      poster_url: workData.poster_url || '',
      created_at: workData.created_at || now(),
    } })
    await collection('recycle_bin_poster').doc(item._id).remove()
    return okMsg('已恢复')
  }

  return httpFail('记录不存在', 404)
}

// DELETE /api/works/:id — 两段式删除
// 首次：works 表存在 → 软删到 recycle_bin
// 二次：recycle_bin 中存在 → 永久删除（兼容 _id 和 work_id）
const deleteWork = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const id = ctx.params.id
  const phone = auth.user.phone

  // 1. 软删：works 表有记录则移入 recycle_bin
  const workRes = await collection('works').where({ id, phone }).limit(1).get()
  if (workRes.data && workRes.data.length) {
    const w = workRes.data[0]
    // 转换为 camelCase 格式存储，与恢复逻辑一致
    const workObj = {
      id: w.id, phone: w.phone,
      templateId: w.template_id || '', templateType: w.template_type || 'canvas',
      title: w.title || '', data: w.data || {},
      musicId: w.music_id || '', cover: w.cover || '',
      createdAt: w.created_at || '', updatedAt: w.updated_at || '',
    }
    await collection('recycle_bin').add({ data: {
      phone, work_id: id, work_data: workObj, deletedAt: now(),
    } })
    await collection('works').where({ id }).remove()
    return okMsg('已移入回收站')
  }

  // 2. 永久删：主库 recycle_bin（按 work_id 查询）
  const mainRecycleRes = await collection('recycle_bin').where({ work_id: id, phone }).limit(1).get()
  if (mainRecycleRes.data && mainRecycleRes.data.length) {
    await collection('recycle_bin').doc(mainRecycleRes.data[0]._id).remove()
    return okMsg('已永久删除')
  }

  // 3. 永久删：poster 库 recycle_bin_poster（按 work_id 查询）
  const posterRecycleRes = await collection('recycle_bin_poster').where({ work_id: id, user_id: phone }).limit(1).get()
  if (posterRecycleRes.data && posterRecycleRes.data.length) {
    await collection('recycle_bin_poster').doc(posterRecycleRes.data[0]._id).remove()
    return okMsg('已永久删除')
  }

  return httpFail('记录不存在', 404)
}

// ============ 路由表（recycle 必须在 :id 前） ============
const routes = [
  ['GET', '/api/works/recycle', listRecycleBin],
  ['GET', '/api/works/share/:id', getSharedWork],
  ['GET', '/api/works', listWorks],
  ['GET', '/api/works/:id', getWork],
  ['POST', '/api/works', createWork],
  ['PUT', '/api/works/:id', updateWork],
  ['PUT', '/api/works/:id/restore', restoreWork],
  ['DELETE', '/api/works/:id', deleteWork],
]

// ============ 云函数入口 ============
exports.main = createRouter(routes, 'work')
