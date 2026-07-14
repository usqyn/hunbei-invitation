// ============ order 云函数 ============
// 订单 + VIP 购买 + 商品，共 7 个路由：
//   POST /api/orders
//   GET  /api/orders + GET /api/orders/:id
//   PUT  /api/orders/:id/status (admin)
//   POST /api/orders/:id/pay（订单支付，含 VIP 权益发放）
//   POST /api/vip/order（VIP 套餐购买，事务：建订单+升级用户）
//
// 与原 Express 差异：
// - runTransaction 改为云数据库 db.runTransaction（原生事务支持）
// - items 字段在 NoSQL 中直接存数组，无需 JSON.stringify/parse

const {
  db, collection, _, now, uuid,
  getUser, requireAuth, requireAdmin,
  ok, okMsg, fail, httpOK, httpFail, httpOptions,
  parsePagination, paginateResponse, parseBody, matchRoute,
} = require('./_shared')

// VIP 套餐配置：时长（天）+ 服务端定价（不信任客户端价格）
const VIP_PLANS = {
  monthly: { days: 30, price: 9.9 },
  quarterly: { days: 90, price: 19.9 },
  yearly: { days: 365, price: 58.0 },
}

// ============ 订单 CRUD ============

// POST /api/orders — 创建订单（服务端计算金额）
const createOrder = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const { items, contactName, contactPhone, address, note } = ctx.body
  if (!items || !items.length) return httpFail('订单商品不能为空')
  // 服务端计算：按 templateId 批量查模板真实价格
  let serverTotal = 0
  const templateIds = items.map(it => it.templateId).filter(Boolean)
  if (templateIds.length > 0) {
    const tplRes = await collection('templates').where({ id: _.in(templateIds), status: 'published' }).limit(100).get()
    const priceMap = {}
    ;(tplRes.data || []).forEach(t => { priceMap[t.id] = t })
    for (const item of items) {
      if (item.templateId) {
        const tpl = priceMap[item.templateId]
        if (!tpl) return httpFail(`模板 ${item.templateId} 不存在`)
        if (tpl.is_paid === 1) serverTotal += parseFloat(tpl.price) || 0
      }
    }
  }
  const totalAmount = String(serverTotal)
  const id = uuid()
  const ts = now()
  await collection('orders').add({ data: {
    id, phone: auth.user.phone, items, totalAmount, status: 'pending',
    contactName: contactName || '', contactPhone: contactPhone || '',
    address: address || '', note: note || '', paid_at: null,
    createdAt: ts, updatedAt: ts,
  } })
  await collection('notifications').add({ data: {
    phone: auth.user.phone, title: '订单创建成功',
    content: `您的订单已创建，金额 ¥${totalAmount}，请尽快完成支付。`,
    type: 'order', read: 0, createdAt: ts,
  } })
  const res = await collection('orders').where({ id }).limit(1).get()
  return ok(res.data[0])
}

// GET /api/orders — 用户订单列表（支持分页）
const listOrders = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const phone = auth.user.phone
  const { page, limit, skip, hasPaging } = parsePagination(ctx.query)
  const countRes = await collection('orders').where({ phone }).count()
  const total = countRes.total || 0
  let q = collection('orders').where({ phone }).orderBy('createdAt', 'desc')
  if (hasPaging) {
    const res = await q.skip(skip).limit(limit).get()
    return paginateResponse(res.data || [], page, limit, total)
  }
  const res = await q.limit(1000).get()
  return ok(res.data || [])
}

// GET /api/orders/:id — 订单详情
const getOrder = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const res = await collection('orders').where({ id: ctx.params.id, phone: auth.user.phone }).limit(1).get()
  if (!res.data || !res.data.length) return httpFail('订单不存在', 404)
  return ok(res.data[0])
}

// PUT /api/orders/:id/status (admin) — 更新订单状态
const updateOrderStatus = async (ctx) => {
  const auth = requireAdmin(ctx.event)
  if (!auth.ok) return auth.body
  const { status } = ctx.body
  const validStatuses = ['pending', 'paid', 'shipped', 'completed', 'cancelled']
  if (!validStatuses.includes(status)) return httpFail('无效的订单状态')
  const existing = await collection('orders').where({ id: ctx.params.id }).limit(1).get()
  if (!existing.data || !existing.data.length) return httpFail('订单不存在', 404)
  await collection('orders').where({ id: ctx.params.id }).update({ data: { status, updatedAt: now() } })
  return okMsg('状态已更新')
}

// POST /api/orders/:id/pay — 订单支付（pending→paid，含 VIP 权益发放）
const payOrder = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const phone = auth.user.phone
  const id = ctx.params.id
  const existing = await collection('orders').where({ id, phone }).limit(1).get()
  if (!existing.data || !existing.data.length) return httpFail('订单不存在', 404)
  const order = existing.data[0]
  if (order.status !== 'pending') return httpFail(`订单状态为 ${order.status}，无法支付`)
  const ts = now()
  // 支付成功：更新订单状态
  await collection('orders').where({ id }).update({ data: { status: 'paid', paid_at: ts, updatedAt: ts } })
  // 若含 VIP 类型商品，发放 VIP 权益
  const vipItem = (order.items || []).find(it => it.type === 'vip')
  if (vipItem) {
    const plan = VIP_PLANS[vipItem.plan]
    const days = plan ? plan.days : 30
    const nowMsec = Date.now()
    const userRes = await collection('users').where({ phone }).limit(1).get()
    let currentExpire = 0
    if (userRes.data && userRes.data[0]) {
      const u = userRes.data[0]
      if (u.vip_status === 1 && u.vip_expire_at) currentExpire = parseInt(u.vip_expire_at, 10) || 0
    }
    const baseExpire = Math.max(currentExpire, nowMsec)
    const newExpireAt = baseExpire + days * 24 * 60 * 60 * 1000
    await collection('users').where({ phone }).update({ data: {
      vip_status: 1, vip_expire_at: String(newExpireAt),
      vip_plan: vipItem.plan, updatedAt: ts,
    } })
  }
  return ok({ prepayId: `prepay_${id}`, status: 'paid' })
}

// POST /api/vip/order — VIP 套餐购买（事务：建订单+升级用户）
const createVipOrder = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const phone = auth.user.phone
  const { plan } = ctx.body
  const planConfig = VIP_PLANS[plan]
  if (!planConfig) return httpFail('无效的套餐')
  const { days, price } = planConfig
  const nowMsec = Date.now()
  const orderId = uuid()
  const ts = now()
  const orderItems = [{ type: 'vip', plan, days, price }]
  // 查询当前 VIP 状态计算新到期时间
  const userRes = await collection('users').where({ phone }).limit(1).get()
  let currentExpire = 0
  if (userRes.data && userRes.data[0]) {
    const u = userRes.data[0]
    if (u.vip_status === 1 && u.vip_expire_at) currentExpire = parseInt(u.vip_expire_at, 10) || 0
  }
  const baseExpire = Math.max(currentExpire, nowMsec)
  const newExpireAt = baseExpire + days * 24 * 60 * 60 * 1000
  // 使用云数据库原生事务：建订单 + 升级用户，保证原子性
  try {
    await db.runTransaction(async (transaction) => {
      await transaction.collection('orders').add({ data: {
        id: orderId, phone, items: orderItems, totalAmount: String(price),
        status: 'paid', contactName: '', contactPhone: '', address: '', note: '',
        paid_at: ts, createdAt: ts, updatedAt: ts,
      } })
      await transaction.collection('users').where({ phone }).update({ data: {
        vip_status: 1, vip_expire_at: String(newExpireAt), vip_plan: plan, updatedAt: ts,
      } })
    })
  } catch (e) {
    console.error('vip order transaction failed:', e)
    return httpFail('订单创建失败', 500)
  }
  return ok({ orderId, prepayId: `prepay_${orderId}`, expireAt: newExpireAt })
}

// ============ 路由表 ============
const routes = [
  ['POST', '/api/orders', createOrder],
  ['GET', '/api/orders', listOrders],
  ['GET', '/api/orders/:id', getOrder],
  ['PUT', '/api/orders/:id/status', updateOrderStatus],
  ['POST', '/api/orders/:id/pay', payOrder],
  ['POST', '/api/vip/order', createVipOrder],
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
      console.error(`[order] ${httpMethod} ${eventPath} error:`, e)
      return httpFail('服务器内部错误', 500)
    }
  }
  return httpFail('接口不存在', 404)
}
