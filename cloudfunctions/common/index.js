// ============ common 云函数 ============
// 包含 11 个路由：健康检查/版本/短信/登录/事件追踪/反馈
// 路由清单：
//   GET  /api/health
//   GET  /api/version
//   POST /api/version/refresh (admin)
//   POST /api/sms/send
//   POST /api/user/login（手机号+验证码 / 微信 encryptedData 两种模式）
//   POST /api/admin/login
//   POST /api/track
//   POST /api/track/batch
//   POST /api/feedback（用户提交反馈）
//   GET  /api/feedback（admin）
//   PUT  /api/feedback/:id（admin）

const {
  db, collection, _, now, nowMs, uuid,
  signToken, getUser, requireAuth, requireAdmin, isAdmin, isRequestFromAdmin,
  ok, okMsg, fail, httpOK, httpFail, httpOptions,
  parsePagination, parseBody, matchRoute,
  ADMIN_PHONE, DEV_CODE, IS_DEV,
  setSmsCode, getSmsCode, clearExpiredSmsCodes,
  getVersion, bumpVersion,
  getCloudUrl, getCloudUrls, createRouter,
} = require('./_shared')

// ============ 路由处理函数 ============

// GET /api/health — 健康检查，与原 Express 一致：{ success, status, uptime, timestamp }
const getHealth = async (ctx) => ({
  success: true,
  status: 'ok',
  uptime: process.uptime(),
  timestamp: now(),
})

// GET /api/version — 版本号 + 模板数
const getVersionRoute = async (ctx) => {
  const version = await getVersion()
  // 云数据库全表 count（无需 where）
  const countRes = await collection('templates').count()
  return { success: true, version, count: countRes.total || 0 }
}

// POST /api/version/refresh — 管理员刷新版本号
const refreshVersion = async (ctx) => {
  const auth = requireAdmin(ctx.event)
  if (!auth.ok) return auth.body
  const version = await bumpVersion()
  return { success: true, version }
}

// POST /api/sms/send — 发送验证码
const sendSms = async (ctx) => {
  const { phone } = ctx.body
  if (!phone || phone.length < 11) {
    return httpFail('请输入正确的手机号')
  }
  const code = String(Math.floor(100000 + Math.random() * 900000))
  await setSmsCode(phone, code)
  // 非生产环境打印验证码（仅显示后4位手机号）
  if (IS_DEV) {
    console.log(`\n📱 [验证码] ${phone.slice(-4)} → ${code}\n`)
  }
  // 实际生产应调用云开发短信服务 cloud.openapi.cloudbase.sendSms，此处仅存储
  return okMsg('验证码已发送')
}

// POST /api/user/login — 用户登录（手机号+验证码 / 微信 encryptedData）
const userLogin = async (ctx) => {
  const { phone, code, encryptedData } = ctx.body

  // 微信小程序登录模式（encryptedData + code）
  if (encryptedData && code) {
    // 基本防护：encryptedData 格式校验
    if (typeof encryptedData !== 'string' || encryptedData.length === 0 || encryptedData.length > 10 * 1024) {
      return httpFail('encryptedData 格式不正确')
    }
    // 用 encryptedData 的 hash 作为稳定标识（与原实现一致）
    const crypto = require('crypto')
    const wechatId = 'wx_' + crypto.createHash('md5').update(encryptedData).digest('hex').slice(0, 16)

    const existing = await collection('users').where({ phone: wechatId }).limit(1).get()
    if (existing.data && existing.data.length) {
      const u = existing.data[0]
      const token = signToken({ phone: wechatId, role: 'user' })
      return ok({ token, nickname: u.nickname || '微信用户', phone: wechatId, vip_status: u.vip_status || 0, vip_expire_at: u.vip_expire_at || null })
    }
    // 新用户：创建 + 发欢迎通知
    const token = signToken({ phone: wechatId, role: 'user' })
    const ts = now()
    await collection('users').add({ data: { id: uuid(), phone: wechatId, nickname: '微信用户', avatar: '', vip_status: 0, createdAt: ts, updatedAt: ts } })
    await collection('notifications').add({ data: { phone: wechatId, title: '欢迎使用TOYtamaxia', content: '感谢您的注册，快来制作您的第一张请柬吧！', type: 'system', read: 0, createdAt: ts } })
    return ok({ token, nickname: '微信用户', phone: wechatId, vip_status: 0, vip_expire_at: null })
  }

  // 手机号+验证码登录
  if (phone) {
    if (!code) return httpFail('请输入验证码')
    // 开发环境支持万能验证码（DEV_CODE）
    const devCode = IS_DEV ? DEV_CODE : null
    if (!IS_DEV || code !== devCode) {
      const stored = await getSmsCode(phone)
      if (!stored) return httpFail('请先获取验证码')
      if (stored !== code) return httpFail('验证码错误')
    }
    // 管理员账号签发 admin 角色
    const role = phone === ADMIN_PHONE ? 'admin' : 'user'
    const token = signToken({ phone, role })
    const ts = now()
    const userCheck = await collection('users').where({ phone }).limit(1).get()
    if (!userCheck.data || !userCheck.data.length) {
      await collection('users').add({ data: { id: uuid(), phone, nickname: phone.substring(0, 3) + '****' + phone.substring(7), avatar: '', vip_status: 0, createdAt: ts, updatedAt: ts } })
      await collection('notifications').add({ data: { phone, title: '欢迎使用TOYtamaxia', content: '感谢您的注册，快来制作您的第一张请柬吧！', type: 'system', read: 0, createdAt: ts } })
    }
    // 返回用户 VIP 状态
    const u = (await collection('users').where({ phone }).limit(1).get()).data[0] || {}
    return ok({ token, nickname: phone.substring(0, 3) + '****' + phone.substring(7), phone, vip_status: u.vip_status || 0, vip_expire_at: u.vip_expire_at || null })
  }

  return httpFail('缺少登录参数')
}

// POST /api/admin/login — 管理员登录
const adminLogin = async (ctx) => {
  const { phone, code } = ctx.body
  if (!phone) return httpFail('请输入手机号')
  if (phone !== ADMIN_PHONE) return httpFail('该账号无管理员权限', 403)
  if (!code) return httpFail('请输入验证码')
  const devCode = IS_DEV ? DEV_CODE : null
  if (!IS_DEV || code !== devCode) {
    const stored = await getSmsCode(phone)
    if (!stored) return httpFail('请先获取验证码')
    if (stored !== code) return httpFail('验证码错误')
  }
  // 管理员令牌有效期 7 天
  const token = signToken({ phone, role: 'admin' }, '7d')
  return ok({ token, phone })
}

// POST /api/track — 事件追踪
const track = async (ctx) => {
  const { event, params, platform, version } = ctx.body
  if (!event) return httpFail('缺少 event 字段')
  const sessionId = ctx.headers['x-session-id'] || ctx.headers['X-Session-Id'] || ctx.headers['Session-Id'] || uuid()
  const user = getUser(ctx.event)
  await collection('events').add({ data: {
    event, user_id: user ? user.phone : null, session_id: sessionId,
    timestamp: nowMs(), params: params || null,
    platform: platform || '', version: version || '',
  } })
  return { success: true }
}

// POST /api/track/batch — 批量事件追踪（单次最多 100 条）
const trackBatch = async (ctx) => {
  const { events } = ctx.body
  if (!events || !Array.isArray(events)) return httpFail('缺少 events 数组')
  if (events.length > 100) return httpFail('单次上报事件数不能超过 100 条')
  const sessionId = ctx.headers['x-session-id'] || ctx.headers['X-Session-Id'] || ctx.headers['Session-Id'] || uuid()
  const user = getUser(ctx.event)
  // 云数据库批量插入：循环 add（云函数 SDK 不支持单次插入数组，需循环）
  for (const evt of events) {
    await collection('events').add({ data: {
      event: evt.event || '', user_id: user ? user.phone : null, session_id: sessionId,
      timestamp: evt.timestamp || nowMs(), params: evt.params || null,
      platform: evt.platform || '', version: evt.version || '',
    } })
  }
  return { success: true }
}

// POST /api/feedback — 用户提交反馈
const submitFeedback = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const { content, contact } = ctx.body
  if (!content) return httpFail('请输入反馈内容')
  await collection('feedback').add({ data: {
    phone: auth.user.phone, content, contact: contact || '',
    status: 'pending', createdAt: now(),
  } })
  return okMsg('反馈已提交')
}

// GET /api/feedback — 管理员查看反馈列表（分页）
const listFeedback = async (ctx) => {
  const auth = requireAdmin(ctx.event)
  if (!auth.ok) return auth.body
  const { page, limit, skip, hasPaging } = parsePagination(ctx.query)
  const countRes = await collection('feedback').count()
  const total = countRes.total || 0
  let q = collection('feedback').orderBy('createdAt', 'desc')
  if (hasPaging) {
    const res = await q.skip(skip).limit(limit).get()
    return {
      success: true,
      data: res.data || [],
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }
  const res = await q.limit(100).get()
  return { success: true, data: res.data || [], pagination: { page: 1, limit: total, total } }
}

// PUT /api/feedback/:id — 管理员更新反馈状态
const updateFeedback = async (ctx) => {
  const auth = requireAdmin(ctx.event)
  if (!auth.ok) return auth.body
  const { status } = ctx.body
  const validStatuses = ['pending', 'processing', 'resolved', 'closed']
  if (!validStatuses.includes(status)) return httpFail('无效的状态')
  const id = ctx.params.id
  const existing = await collection('feedback').doc(id).get().catch(() => null)
  if (!existing || !existing.data) return httpFail('反馈不存在', 404)
  await collection('feedback').doc(id).update({ data: { status } })
  return okMsg('状态已更新')
}

// ============ 云存储 URL 刷新 ============
// 用于解决云存储临时 URL（getTempFileURL 返回的 https URL）2 小时过期问题。
// 前端图片加载失败时，调用此接口用 fileID 重新换取临时 URL。

// POST /api/refresh-url — 单个 fileID 换取新临时 URL
// 请求体：{ fileID: 'cloud://xxx' }
// 响应：{ success, data: { url, fileID } }
const refreshUrl = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const { fileID } = ctx.body
  if (!fileID || typeof fileID !== 'string') return httpFail('缺少 fileID')
  // 仅支持 cloud:// 协议（https URL 无法刷新）
  if (!fileID.startsWith('cloud://')) return ok({ url: fileID, fileID })
  const url = await getCloudUrl(fileID)
  if (!url) return httpFail('获取临时 URL 失败', 500)
  return ok({ url, fileID })
}

// POST /api/refresh-urls — 批量 fileID 换取临时 URL（单次最多 50 个）
// 请求体：{ fileIDs: ['cloud://xxx', ...] }
// 响应：{ success, data: [{ url, fileID }] }
const refreshUrls = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const { fileIDs } = ctx.body
  if (!fileIDs || !Array.isArray(fileIDs)) return httpFail('缺少 fileIDs 数组')
  if (fileIDs.length > 50) return httpFail('单次最多 50 个 fileID')
  const urls = await getCloudUrls(fileIDs)
  const result = fileIDs.map((f, i) => ({
    fileID: f,
    url: typeof f === 'string' && f.startsWith('cloud://') ? (urls[i] || '') : f,
  }))
  return ok(result)
}

// ============ 路由表（顺序敏感：静态路由放在动态 :id 之前） ============
const routes = [
  ['GET', '/api/health', getHealth],
  ['GET', '/api/version', getVersionRoute],
  ['POST', '/api/version/refresh', refreshVersion],
  ['POST', '/api/sms/send', sendSms],
  ['POST', '/api/user/login', userLogin],
  ['POST', '/api/admin/login', adminLogin],
  ['POST', '/api/track', track],
  ['POST', '/api/track/batch', trackBatch],
  ['POST', '/api/feedback', submitFeedback],
  ['GET', '/api/feedback', listFeedback],
  ['PUT', '/api/feedback/:id', updateFeedback],
  ['POST', '/api/refresh-url', refreshUrl],
  ['POST', '/api/refresh-urls', refreshUrls],
]

// ============ 云函数入口 ============
exports.main = createRouter(routes, 'common')
