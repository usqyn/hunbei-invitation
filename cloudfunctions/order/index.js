// ============ order 云函数 ============
// 订单 + VIP 购买 + 商品 + 限数配额 + 分享奖励，共 10 个路由：
//   POST /api/orders
//   GET  /api/orders + GET /api/orders/:id
//   PUT  /api/orders/:id/status (admin)
//   POST /api/orders/:id/pay（订单支付，含 VIP 权益 + 单次解锁权益发放）
//   POST /api/vip/order（VIP 套餐购买，事务：建订单+升级用户）
//   GET  /api/quota（限数版配额查询）
//   POST /api/quota/consume（限数版配额扣减）
//   POST /api/share/reward（分享奖励 +1 次数）
//
// 与原 Express 差异：
// - runTransaction 改为云数据库 db.runTransaction（原生事务支持）
// - items 字段在 NoSQL 中直接存数组，无需 JSON.stringify/parse
// - 限流：本地进程内 rateLimit 在云函数无状态场景不可用，
//   防刷依赖登录鉴权 + 数据层限制（分享每日每模板 1 次）

const {
  db, collection, _, now, uuid,
  getUser, requireAuth, requireAdmin, isUserVip,
  ok, okMsg, fail, httpOK, httpFail, httpOptions,
  parsePagination, paginateResponse, parseBody, matchRoute, createRouter,
} = require('./_shared')

// VIP 套餐配置：时长（天）+ 服务端定价（不信任客户端价格）
// 注意：与前端 src/pages/vip/index.vue plans 数组保持一致
const VIP_PLANS = {
  monthly: { days: 30, price: 29 },
  quarterly: { days: 90, price: 69 },
  yearly: { days: 365, price: 199 },
}

// ============ 订单 CRUD ============

// POST /api/orders — 创建订单（服务端计算金额）
const createOrder = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const { items, contactName, contactPhone, address, note } = ctx.body
  if (!items || !items.length) return httpFail('订单商品不能为空')
  // 服务端计算：分别按 templateId（付费模板）和 productId（商城商品）计价
  let serverTotal = 0
  const templateIds = items.map(it => it.templateId).filter(Boolean)
  const productIds = items.map(it => it.productId).filter(Boolean)

  // 1. 付费模板
  const tplPriceMap = {}
  if (templateIds.length > 0) {
    const tplRes = await collection('templates').where({ id: _.in(templateIds), status: 'published' }).limit(100).get()
    ;(tplRes.data || []).forEach(t => { tplPriceMap[t.id] = t })
    for (const item of items) {
      if (item.templateId) {
        const tpl = tplPriceMap[item.templateId]
        if (!tpl) return httpFail(`模板 ${item.templateId} 不存在`)
        if (tpl.is_paid === 1) serverTotal += (parseFloat(tpl.price) || 0) * (item.quantity || 1)
      }
    }
  }

  // 2. 商城商品（修复商城订单金额恒为 0 的 bug）
  const prodPriceMap = {}
  if (productIds.length > 0) {
    const prodRes = await collection('products').where({ id: _.in(productIds) }).limit(100).get()
    ;(prodRes.data || []).forEach(p => { prodPriceMap[p.id] = parseFloat(p.price) || 0 })
    for (const item of items) {
      if (item.productId) {
        const prodPrice = prodPriceMap[item.productId]
        const unitPrice = prodPrice !== undefined ? prodPrice : (parseFloat(item.price) || 0)
        serverTotal += unitPrice * (item.quantity || 1)
      }
    }
  }

  const totalAmount = String(serverTotal.toFixed(2))
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
  const res = await q.limit(100).get()
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
// ⚠️ 测试模式说明：
// 当前实现为"前端调用即标记为已付款"，适用于无真实微信支付密钥的测试环境。
// 生产环境部署时必须改造为：
//   1. 本接口仅接收微信支付回调（POST /api/orders/:id/pay 由微信服务器调用，需校验签名）
//   2. 签名校验通过后再 UPDATE status='paid' 并发放 VIP 权益
//   3. 前端通过轮询订单状态或接收 WebSocket 推送来感知支付完成
// 当前实现的已知风险：任何登录用户调用此接口即可将自己的 pending 订单标记为 paid
const payOrder = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const phone = auth.user.phone
  const id = ctx.params.id
  const existing = await collection('orders').where({ id, phone }).limit(1).get()
  if (!existing.data || !existing.data.length) return httpFail('订单不存在', 404)
  const order = existing.data[0]
  if (order.status !== 'pending') return httpFail(`订单状态为 ${order.status}，无法支付`)
  console.log(`[Pay][TestMode] order=${id} phone=${phone} status=pending->paid`)
  const ts = now()
  // 若含 VIP 类型商品，发放 VIP 权益（事务保证）
  const vipItem = (order.items || []).find(it => it.type === 'vip')
  if (vipItem) {
    const plan = VIP_PLANS[vipItem.plan]
    const days = plan ? plan.days : 30
    try {
      await db.runTransaction(async (transaction) => {
        // 在事务内读取用户当前 VIP 状态，避免并发订单读到相同的到期时间
        const userRes = await transaction.collection('users').where({ phone }).limit(1).get()
        let currentExpire = 0
        if (userRes.data && userRes.data[0]) {
          const u = userRes.data[0]
          if (u.vip_status === 1 && u.vip_expire_at) currentExpire = parseInt(u.vip_expire_at, 10) || 0
        }
        const baseExpire = Math.max(currentExpire, Date.now())
        const newExpireAt = baseExpire + days * 24 * 60 * 60 * 1000
        // 更新订单状态
        await transaction.collection('orders').where({ id }).update({ data: { status: 'paid', paid_at: ts, updatedAt: ts } })
        // 发放 VIP 权益
        await transaction.collection('users').where({ phone }).update({ data: {
          vip_status: 1, vip_expire_at: String(newExpireAt),
          vip_plan: vipItem.plan, updatedAt: ts,
        } })
      })
    } catch (e) {
      console.error('payOrder transaction failed:', e)
      return httpFail('支付失败', 500)
    }
  } else {
    // 非 VIP 订单：仅更新订单状态
    await collection('orders').where({ id }).update({ data: { status: 'paid', paid_at: ts, updatedAt: ts } })
  }
  // 单次解锁（9.9 单买模板永久可用）无需额外记录：订单本身即权益凭证，
  // 解锁判断通过查询已付订单中 items 含 unlock 类型实现（见 isTemplateUnlocked）
  return ok({ prepayId: `prepay_${id}`, status: 'paid' })
}

// POST /api/vip/order — VIP 套餐购买
// ⚠️ 安全修复：仅创建 pending 订单，不在此处激活 VIP
// VIP 权益发放移至 POST /api/orders/:id/pay 完成支付后触发
// 避免"下单即激活"漏洞（用户无需付款即可获得 VIP）
const createVipOrder = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const phone = auth.user.phone
  const { plan } = ctx.body
  const planConfig = VIP_PLANS[plan]
  if (!planConfig) return httpFail('无效的套餐')
  const { days, price } = planConfig
  const orderId = uuid()
  const ts = now()
  const orderItems = [{ type: 'vip', plan, days, price }]
  // 仅创建 pending 订单，不读取用户状态、不激活 VIP
  try {
    await collection('orders').add({ data: {
      id: orderId, phone, items: orderItems, totalAmount: String(price),
      status: 'pending', contactName: '', contactPhone: '', address: '', note: '',
      paid_at: null, createdAt: ts, updatedAt: ts,
    } })
  } catch (e) {
    console.error('vip order create failed:', e)
    return httpFail('订单创建失败', 500)
  }
  // 测试模式：返回模拟支付参数（生产环境替换为真实微信支付签名）
  const mockPaySign = `mock_${orderId}_${Date.now()}`
  return ok({
    orderId,
    prepayId: `prepay_${orderId}`,
    paySign: mockPaySign,
    nonceStr: `nonce_${orderId}`,
    timeStamp: String(Math.floor(Date.now() / 1000)),
    package: `prepay_id=prepay_${orderId}`,
    signType: 'MD5',
    expireAt: null,
    testMode: true,
  })
}

// ============ 限数版配额 / 分享奖励 ============
// 限数版模板（vipLevel='limited'）对每位非 VIP 用户可免费制作次数（默认 1 次，进入编辑器时扣减）；
// VIP 用户、已单次解锁用户、免费版模板不受限。remaining=-1 表示不限。
// 存储设计：全部复用已有集合，避免依赖需手工创建的集合——
//   配额状态 → users 文档 quotaMap（{templateId: remaining}）
//   分享计数 → users 文档 shareMap（{templateId_date: count}）
//   单次解锁 → 查询已付订单（orders 集合 items 含 unlock 类型）
const QUOTA_LIMITLESS = -1
const SHARE_REWARD_QUOTA_CAP = 5

async function getTemplateLevel(templateId) {
  const res = await collection('templates').where({ id: templateId }).limit(1).get()
  const t = res.data && res.data[0]
  if (!t) return null
  const vipLevel = t.vipLevel || (t.is_premium === 1 ? 'pro' : (t.is_paid === 1 ? 'personal' : 'free'))
  return { vipLevel, price: parseFloat(t.price) || 0 }
}

async function getUserByPhone(phone) {
  const res = await collection('users').where({ phone }).limit(1).get()
  return res.data && res.data[0] ? res.data[0] : null
}

// 是否已单次解锁该模板：已付订单中 items 含 type='unlock' 且 templateId 匹配
async function isTemplateUnlocked(phone, templateId) {
  const res = await collection('orders').where({ phone, status: 'paid' }).limit(100).get()
  return (res.data || []).some(o => (o.items || []).some(it => it.type === 'unlock' && it.templateId === templateId))
}

async function getTemplateQuota(phone, templateId) {
  const level = await getTemplateLevel(templateId)
  if (!level) return null
  if (level.vipLevel === 'free' || level.vipLevel !== 'limited') return QUOTA_LIMITLESS
  if (await isUserVip(phone)) return QUOTA_LIMITLESS
  if (await isTemplateUnlocked(phone, templateId)) return QUOTA_LIMITLESS
  const user = await getUserByPhone(phone)
  const remaining = user && user.quotaMap ? user.quotaMap[templateId] : undefined
  return remaining === undefined ? 1 : parseInt(remaining, 10) || 0
}

// GET /api/quota — 查询限数配额
const getQuota = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const templateId = ctx.query.templateId
  if (!templateId) return httpFail('缺少 templateId')
  const remaining = await getTemplateQuota(auth.user.phone, templateId)
  if (remaining === null) return httpFail('模板不存在', 404)
  return ok({ remaining, limitless: remaining === QUOTA_LIMITLESS })
}

// POST /api/quota/consume — 扣减限数配额（进入编辑器时调用）
// 注意：云函数无内存限流器（无状态），防刷依赖登录鉴权 + 剩余次数本身
const consumeQuota = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const phone = auth.user.phone
  const { templateId } = ctx.body
  if (!templateId) return httpFail('缺少 templateId')
  const remaining = await getTemplateQuota(phone, templateId)
  if (remaining === null) return httpFail('模板不存在', 404)
  if (remaining === QUOTA_LIMITLESS) return ok({ remaining: QUOTA_LIMITLESS, limitless: true })
  if (remaining <= 0) return httpFail('QUOTA_EXHAUSTED', 403)
  const nowTs = now()
  // 嵌套字段首次扣减直接写 0（云数据库无 upsert），已有值用原子 inc
  const key = 'quotaMap.' + templateId
  const user = await getUserByPhone(phone)
  if (user && user.quotaMap && user.quotaMap[templateId] !== undefined) {
    await collection('users').where({ phone }).update({ data: { [key]: _.inc(-1), updatedAt: nowTs } })
  } else {
    await collection('users').where({ phone }).update({ data: { [key]: 0, updatedAt: nowTs } })
  }
  return ok({ remaining: remaining - 1, limitless: false })
}

// POST /api/share/reward — 分享奖励
// 任意用户打开分享落地页时触发：给分享者（作品创建者 phone）的限数模板剩余次数 +1。
// 公开访问（无登录态），防刷依赖：同人同模板每日 1 次 + 每日奖励总数上限。
const shareReward = async (ctx) => {
  const { templateId, phone } = ctx.body
  if (!templateId) return httpFail('缺少 templateId')
  if (!phone) return httpFail('缺少 phone')
  const remaining = await getTemplateQuota(phone, templateId)
  if (remaining === null) return httpFail('模板不存在', 404)
  if (remaining === QUOTA_LIMITLESS) return ok({ remaining: QUOTA_LIMITLESS, rewarded: false, reason: 'unlimited' })
  const date = now().slice(0, 10)
  const nowTs = now()
  const user = await getUserByPhone(phone)
  const shareMapKey = `${templateId}_${date}`
  const todayCount = user && user.shareMap ? parseInt(user.shareMap[shareMapKey], 10) || 0 : 0
  if (todayCount >= 1) return httpFail('DAILY_LIMIT', 429)
  if (remaining >= SHARE_REWARD_QUOTA_CAP) return ok({ remaining, rewarded: false, reason: 'capped' })
  const shareKey = 'shareMap.' + shareMapKey
  const quotaKey = 'quotaMap.' + templateId
  const userUpdate = { [shareKey]: todayCount + 1, updatedAt: nowTs }
  if (user && user.quotaMap && user.quotaMap[templateId] !== undefined) {
    userUpdate[quotaKey] = _.inc(1)
  } else {
    userUpdate[quotaKey] = remaining + 1
  }
  await collection('users').where({ phone }).update({ data: userUpdate })
  return ok({ remaining: remaining + 1, rewarded: true })
}

// ============ 路由表 ============
const routes = [
  ['POST', '/api/orders', createOrder],
  ['GET', '/api/orders', listOrders],
  ['GET', '/api/orders/:id', getOrder],
  ['PUT', '/api/orders/:id/status', updateOrderStatus],
  ['POST', '/api/orders/:id/pay', payOrder],
  ['POST', '/api/vip/order', createVipOrder],
  ['GET', '/api/quota', getQuota],
  ['POST', '/api/quota/consume', consumeQuota],
  ['POST', '/api/share/reward', shareReward],
]

// ============ 云函数入口 ============
exports.main = createRouter(routes, 'order')
