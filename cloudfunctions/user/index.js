// ============ user 云函数 ============
// 用户中心，包含 15 个路由：
//   GET  /api/user/info
//   PUT  /api/user/profile
//   GET  /api/vip/status
//   POST /api/favorites + DELETE /api/favorites/:workId + GET /api/favorites
//   POST /api/footprints + GET /api/footprints
//   GET  /api/notifications + PUT /api/notifications/read-all + PUT /api/notifications/:id/read + DELETE /api/notifications/:id
//   POST /api/notifications/send (admin)

const {
  db, collection, _, now, nowMs, uuid,
  getUser, requireAuth, requireAdmin,
  ok, okMsg, fail, httpOK, httpFail, httpOptions,
  parsePagination, paginateResponse, parseBody, matchRoute,
  refreshVipStatus, isUserVip, createRouter,
  resolveCloudFields, normalizeUploadPaths,
} = require('./_shared')

// ============ 用户信息 ============

// GET /api/user/info
const getUserInfo = async (ctx) => {
  const user = getUser(ctx.event)
  const phone = user ? user.phone : ''
  if (!phone) {
    return ok({ nickname: '用户', phone: '', avatar: '', vip_status: 0, vip_expire_at: null, vip_plan: null, vip_level: 0 })
  }
  const u = await refreshVipStatus(phone)
  if (u) {
    // 去除内部 _id 等字段
    return ok({
      id: u.id, phone: u.phone, nickname: u.nickname || '',
      avatar: u.avatar || '', vip_status: u.vip_status || 0,
      vip_expire_at: u.vip_expire_at || null, vip_plan: u.vip_plan || null,
      vip_level: u.vip_level || 0,
      createdAt: u.createdAt, updatedAt: u.updatedAt,
    })
  }
  return ok({ nickname: '用户', phone, avatar: '', vip_status: 0, vip_expire_at: null, vip_plan: null, vip_level: 0 })
}

// PUT /api/user/profile — 更新昵称/头像
const updateProfile = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const { nickname, avatar } = ctx.body
  const fields = {}
  if (nickname !== undefined) fields.nickname = nickname
  if (avatar !== undefined) fields.avatar = avatar
  if (Object.keys(fields).length === 0) return httpFail('没有需要更新的字段')
  fields.updatedAt = now()
  await collection('users').where({ phone: auth.user.phone }).update({ data: fields })
  const res = await collection('users').where({ phone: auth.user.phone }).limit(1).get()
  const u = (res.data && res.data[0]) || {}
  return ok({
    id: u.id, phone: u.phone, nickname: u.nickname || '',
    avatar: u.avatar || '', vip_status: u.vip_status || 0,
    vip_expire_at: u.vip_expire_at || null, vip_plan: u.vip_plan || null,
    vip_level: u.vip_level || 0,
  })
}

// ============ VIP 系统 ============

// GET /api/vip/status
const getVipStatus = async (ctx) => {
  const user = getUser(ctx.event)
  const phone = user ? user.phone : ''
  if (!phone) return ok({ isVip: false, expireAt: null, plan: null })
  const u = await refreshVipStatus(phone)
  if (!u) return ok({ isVip: false, expireAt: null, plan: null })
  const isVip = !!(u.vip_status === 1 && u.vip_expire_at && nowMs() < parseInt(u.vip_expire_at, 10))
  return ok({ isVip, level: u.vip_level || 0, expireAt: u.vip_expire_at || null, plan: u.vip_plan || null })
}

// ============ 收藏系统 ============

// POST /api/favorites
const addFavorite = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const { workId, templateId, title, image } = ctx.body
  if (!workId) return httpFail('缺少 workId')
  if (templateId) {
    const tpl = await collection('templates').where({ id: templateId, status: _.neq('deleted') }).limit(1).get()
    if (!tpl.data || !tpl.data.length) return httpFail('模板不存在')
  }
  // 唯一性：同一 phone+work_id 不重复收藏
  const existing = await collection('favorites').where({ phone: auth.user.phone, work_id: workId }).limit(1).get()
  if (existing.data && existing.data.length) return okMsg('已收藏')
  await collection('favorites').add({ data: {
    phone: auth.user.phone, work_id: workId, template_id: templateId || '',
    title: title || '', image: image || '', createdAt: now(),
  } })
  return okMsg('收藏成功')
}

// DELETE /api/favorites/:workId
const removeFavorite = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  await collection('favorites').where({ phone: auth.user.phone, work_id: ctx.params.workId }).remove()
  return okMsg('已取消收藏')
}

// GET /api/favorites
const listFavorites = async (ctx) => {
  const user = getUser(ctx.event)
  const phone = user ? user.phone : ''
  if (!phone) return ok([])
  const { page, limit, skip, hasPaging } = parsePagination(ctx.query)
  const countRes = await collection('favorites').where({ phone }).count()
  const total = countRes.total || 0
  let q = collection('favorites').where({ phone }).orderBy('createdAt', 'desc')
  let res
  if (hasPaging) {
    res = await q.skip(skip).limit(limit).get()
  } else {
    res = await q.limit(100).get()
  }
  // 兼容小程序 store 读取的字段名（workId / image 等），并解析 cloud:// 协议
  const items = (res.data || []).map(f => ({
    id: f._id,
    workId: f.work_id || f.workId || '',
    templateId: f.template_id || f.templateId || '',
    title: f.title || '',
    image: f.image || '',
    createdAt: f.createdAt || '',
  }))
  await resolveCloudFields(items, ['image'])
  normalizeUploadPaths(items, ['image'])
  if (hasPaging) return paginateResponse(items, page, limit, total)
  return ok(items)
}

// ============ 足迹系统 ============

// 内部：记录足迹（同一用户同一模板 24 小时内不重复）
const recordFootprint = async (phone, templateId, templateName, templateCover) => {
  const since = nowMs() - 86400000
  const existing = await collection('footprints').where({ phone, template_id: templateId, timestamp: _.gt(since) }).limit(1).get()
  if (existing.data && existing.data.length) return false
  await collection('footprints').add({ data: {
    phone, template_id: templateId, template_name: templateName || '',
    template_cover: templateCover || '', timestamp: nowMs(),
  } })
  return true
}

// POST /api/footprints
const addFootprint = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const { templateId } = ctx.body
  if (!templateId) return httpFail('缺少 templateId')
  const tpl = await collection('templates').where({ id: templateId, status: _.neq('deleted') }).limit(1).get()
  if (!tpl.data || !tpl.data.length) return httpFail('模板不存在')
  const t = tpl.data[0]
  await recordFootprint(auth.user.phone, templateId, t.name || '', t.cover || '')
  return okMsg('足迹已记录')
}

// GET /api/footprints
const listFootprints = async (ctx) => {
  const user = getUser(ctx.event)
  const phone = user ? user.phone : ''
  if (!phone) return ok([])
  const { page, limit, skip, hasPaging } = parsePagination(ctx.query)
  const countRes = await collection('footprints').where({ phone }).count()
  const total = countRes.total || 0
  let q = collection('footprints').where({ phone }).orderBy('timestamp', 'desc')
  let res
  if (hasPaging) {
    res = await q.skip(skip).limit(limit).get()
  } else {
    res = await q.limit(50).get()
  }
  // 兼容小程序页面读取的字段名（image/title/time/templateId），并解析 cloud:// 协议
  const items = (res.data || []).map(f => ({
    id: f._id,
    templateId: f.template_id || f.templateId || '',
    title: f.template_name || f.title || '',
    image: f.template_cover || f.image || '',
    time: f.timestamp ? new Date(f.timestamp).toLocaleString('zh-CN', { hour12: false }) : '',
    timestamp: f.timestamp,
  }))
  await resolveCloudFields(items, ['image'])
  normalizeUploadPaths(items, ['image'])
  if (hasPaging) return paginateResponse(items, page, limit, total)
  return ok(items)
}

// ============ 通知系统 ============

// GET /api/notifications
const listNotifications = async (ctx) => {
  const user = getUser(ctx.event)
  const phone = user ? user.phone : ''
  if (!phone) return ok([])
  const { page, limit, skip, hasPaging } = parsePagination(ctx.query)
  const countRes = await collection('notifications').where({ phone }).count()
  const total = countRes.total || 0
  let q = collection('notifications').where({ phone }).orderBy('createdAt', 'desc')
  if (hasPaging) {
    const res = await q.skip(skip).limit(limit).get()
    return paginateResponse(res.data || [], page, limit, total)
  }
  const res = await q.limit(50).get()
  return ok(res.data || [])
}

// PUT /api/notifications/read-all
const markAllRead = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  await collection('notifications').where({ phone: auth.user.phone, read: 0 }).update({ data: { read: 1 } })
  return okMsg('已全部标记已读')
}

// PUT /api/notifications/:id/read
const markRead = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  await collection('notifications').where({ _id: ctx.params.id, phone: auth.user.phone }).update({ data: { read: 1 } })
  return okMsg('已标记已读')
}

// DELETE /api/notifications/:id
const deleteNotification = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  await collection('notifications').where({ _id: ctx.params.id, phone: auth.user.phone }).remove()
  return okMsg('已删除')
}

// POST /api/notifications/send (admin) — 发送通知（单用户或全体广播）
// 广播模式分批处理：默认每批 100 用户，通过 page 参数分页调用，避免单次超过云函数 60 秒超时
const sendNotification = async (ctx) => {
  const auth = requireAdmin(ctx.event)
  if (!auth.ok) return auth.body
  const { phone, title, content, type, page, size } = ctx.body
  if (!title) return httpFail('缺少 title')
  const ts = now()
  if (phone) {
    // 单发
    await collection('notifications').add({ data: { phone, title, content: content || '', type: type || 'system', read: 0, createdAt: ts } })
    return ok({ sent: 1, total: 1, hasMore: false, page: 1 })
  }
  // 广播：分批处理
  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  const pageSize = Math.min(parseInt(size, 10) || 100, 500)
  const skip = (pageNum - 1) * pageSize
  const users = await collection('users').skip(skip).limit(pageSize).get()
  for (const u of (users.data || [])) {
    await collection('notifications').add({ data: {
      phone: u.phone, title, content: content || '', type: type || 'system', read: 0, createdAt: ts,
    } })
  }
  // 返回是否还有更多用户需要发送
  const totalRes = await collection('users').count()
  const totalUsers = totalRes.total || 0
  const hasMore = skip + pageSize < totalUsers
  return ok({
    sent: (users.data || []).length,
    total: totalUsers,
    hasMore,
    page: pageNum,
    nextPage: hasMore ? pageNum + 1 : null,
    message: hasMore ? `已发送第 ${pageNum} 批，请继续调用 page=${pageNum + 1}` : '全部发送完成',
  })
}

// ============ 路由表 ============
// 注意路由顺序：静态路径（read-all）必须在 :id 之前
const routes = [
  ['GET', '/api/user/info', getUserInfo],
  ['PUT', '/api/user/profile', updateProfile],
  ['GET', '/api/vip/status', getVipStatus],
  ['POST', '/api/favorites', addFavorite],
  ['GET', '/api/favorites', listFavorites],
  ['DELETE', '/api/favorites/:workId', removeFavorite],
  ['POST', '/api/footprints', addFootprint],
  ['GET', '/api/footprints', listFootprints],
  ['GET', '/api/notifications', listNotifications],
  ['PUT', '/api/notifications/read-all', markAllRead],
  ['PUT', '/api/notifications/:id/read', markRead],
  ['DELETE', '/api/notifications/:id', deleteNotification],
  ['POST', '/api/notifications/send', sendNotification],
]

// ============ 云函数入口 ============
exports.main = createRouter(routes, 'user')
