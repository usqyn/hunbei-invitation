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
  db, collection, _, now, nowMs, uuid,
  getUser, requireAuth, requireAdmin, isUserVip,
  ok, okMsg, fail, httpOK, httpFail, httpOptions,
  parsePagination, paginateResponse, parseBody, matchRoute, createRouter,
} = require('./_shared')

// VIP 套餐配置：时长（天）+ 服务端定价（不信任客户端价格）
// 键格式 {档位}_{周期}，与前端 plan 协议一致：
//   personal_* → 个人VIP（vip_level=1），pro_* → 专业版（vip_level=2）
// 注：当前前端已隐藏会员套餐入口（按次制作模式），保留后端协议以便存量订单兼容/恢复售卖
const VIP_PLANS = {
  personal_monthly: { days: 30, price: 29, level: 1 },
  personal_quarterly: { days: 90, price: 69, level: 1 },
  personal_yearly: { days: 365, price: 199, level: 1 },
  pro_monthly: { days: 30, price: 99, level: 2 },
  pro_quarterly: { days: 90, price: 249, level: 2 },
  pro_yearly: { days: 365, price: 799, level: 2 },
}

// 模板档位默认单次价格（服务端定价，不信任客户端价格）：
//   限免版(limited)：第1次免费/第2次分享朋友圈/第3次起每次 6.6
//   VIP版(personal)：非VIP会员每次 9.9
//   SVIP版(svip)：非专业版每次 18.8
const TIER_DEFAULT_PRICE = {
  free: 0,
  limited: 6.6,
  personal: 9.9,
  svip: 18.8,
  pro: 0,
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

  // 1. 付费模板（按档位定价；type='usage' 为按次制作订单，用档位默认价）
  const tplPriceMap = {}
  if (templateIds.length > 0) {
    const tplRes = await collection('templates').where({ id: _.in(templateIds), status: 'published' }).limit(100).get()
    ;(tplRes.data || []).forEach(t => { tplPriceMap[t.id] = t })
    for (const item of items) {
      if (item.templateId) {
        const tpl = tplPriceMap[item.templateId]
        if (!tpl) return httpFail(`模板 ${item.templateId} 不存在`)
        if (item.type === 'usage') {
          const tier = getTemplateTier(tpl)
          // 会员特权用户无需按次购买（前端入口已豁免，接口层兜底拒绝防误收费）
          if (tier === 'personal' && await isUserVip(auth.user.phone)) return httpFail('您是会员，无需按次购买')
          if (tier === 'svip' && await isUserPro(auth.user.phone)) return httpFail('您是专业版会员，无需按次购买')
          if (tier === 'limited' && await isUserVip(auth.user.phone)) return httpFail('您是会员，无需按次购买')
          // 与 getTemplateLevel 展示价同源：模板自带 price 优先，否则档位默认价
          const unitPrice = parseFloat(tpl.price) > 0 ? parseFloat(tpl.price) : (TIER_DEFAULT_PRICE[tier] || 0)
          serverTotal += unitPrice * (item.quantity || 1)
        } else if (tpl.is_paid === 1) {
          serverTotal += (parseFloat(tpl.price) || 0) * (item.quantity || 1)
        }
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
  // 若含 VIP 类型商品，发放 VIP 权益（事务内条件更新保证幂等：仅 pending 可被支付）
  const vipItem = (order.items || []).find(it => it.type === 'vip')
  // usage 类型商品（限免版6.6/VIP版9.9/SVIP版18.8 按次制作），按 quantity 逐次发放制作额度
  const usageItems = (order.items || []).filter(it => it.type === 'usage')
  if (vipItem) {
    const plan = VIP_PLANS[vipItem.plan]
    const days = plan ? plan.days : 30
    try {
      await db.runTransaction(async (transaction) => {
        // 事务内以 status='pending' 为条件更新订单：并发双支付时仅一方成功（updated=1）
        const upd = await transaction.collection('orders').where({ id, status: 'pending' }).update({ data: { status: 'paid', paid_at: ts, updatedAt: ts } })
        if (!upd || upd.stats?.updated !== 1) throw new Error('ORDER_ALREADY_PAID')
        // 在事务内读取用户当前 VIP 状态，避免并发订单读到相同的到期时间
        const userRes = await transaction.collection('users').where({ phone }).limit(1).get()
        let currentExpire = 0
        if (userRes.data && userRes.data[0]) {
          const u = userRes.data[0]
          if (u.vip_status === 1 && u.vip_expire_at) currentExpire = parseInt(u.vip_expire_at, 10) || 0
        }
        const baseExpire = Math.max(currentExpire, Date.now())
        const newExpireAt = baseExpire + days * 24 * 60 * 60 * 1000
        // 发放 VIP 权益（写入档位 vip_level：1=个人VIP，2=专业版）
        await transaction.collection('users').where({ phone }).update({ data: {
          vip_status: 1, vip_expire_at: String(newExpireAt),
          vip_plan: vipItem.plan, vip_level: plan ? plan.level : 1, updatedAt: ts,
        } })
      })
    } catch (e) {
      console.error('payOrder transaction failed:', e?.message || e)
      return httpFail('支付失败', 500)
    }
  } else if (usageItems.length > 0) {
    try {
      await db.runTransaction(async (transaction) => {
        const upd = await transaction.collection('orders').where({ id, status: 'pending' }).update({ data: { status: 'paid', paid_at: ts, updatedAt: ts } })
        if (!upd || upd.stats?.updated !== 1) throw new Error('ORDER_ALREADY_PAID')
        // 遍历所有 usage 商品并按 quantity 累加发放额度（与 createOrder 计价一致）
        for (const usageItem of usageItems) {
          const templateId = usageItem.templateId
          if (!templateId) continue
          const quotaKey = 'quotaMap.' + templateId
          const inc = Math.max(1, parseInt(usageItem.quantity, 10) || 1)
          const userRes = await transaction.collection('users').where({ phone }).limit(1).get()
          const u = userRes.data && userRes.data[0]
          if (u && u.quotaMap && u.quotaMap[templateId] !== undefined) {
            await transaction.collection('users').where({ phone }).update({ data: { [quotaKey]: _.inc(inc), updatedAt: ts } })
          } else {
            await transaction.collection('users').where({ phone }).update({ data: { [quotaKey]: inc, updatedAt: ts } })
          }
        }
      })
    } catch (e) {
      console.error('payOrder usage transaction failed:', e?.message || e)
      return httpFail('支付失败', 500)
    }
  } else {
    // 非 VIP 订单：仅更新订单状态（带条件更新防并发双支付）
    const upd = await collection('orders').where({ id, status: 'pending' }).update({ data: { status: 'paid', paid_at: ts, updatedAt: ts } })
    if (!upd || upd.stats?.updated !== 1) return httpFail(`订单状态为 paid，无法支付`)
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

// ============ 限数版配额 / 按次付费 / 分享奖励 ============
// 模板档位（vipLevel）：
//   free=免费版（无限次） / limited=限免版（第1次免费→第2次分享朋友圈→第3次起每次6.6）
//   personal=VIP版（非VIP会员每次9.9） / svip=SVIP版（非专业版每次18.8） / pro=专业版（Pro专属）
// 付费档每次新建作品在进入编辑器时扣减 1 次额度（quotaMap），额度来源：支付（+1）/ 分享（+1）。
// VIP会员免费用 VIP版，专业版免费用 SVIP版；旧"永久解锁"订单（type='unlock'）保持兼容。
// 存储设计：全部复用已有集合，避免依赖需手工创建的集合——
//   配额状态 → users 文档 quotaMap（{templateId: remaining}）
//   限免版已使用次数 → users 文档 limitedUseMap（{templateId: count}）
//   分享计数 → users 文档 shareMap（{templateId_date: count}）
//   按次购买 → 已付订单 items 含 usage 类型（支付时 quotaMap+1）
const QUOTA_LIMITLESS = -1
const SHARE_REWARD_QUOTA_CAP = 5

// 从模板记录解析档位（兼容旧字段：is_premium / is_paid / vip_free）
// 档位白名单：脏数据 vipLevel（如 'vip'/'premium'）回退旧字段推断，避免未知档位被兜底为无限免费
const TIER_WHITELIST = ['free', 'limited', 'personal', 'svip', 'pro']
function getTemplateTier(t) {
  if (!t) return 'free'
  if (TIER_WHITELIST.includes(t.vipLevel)) return t.vipLevel
  if (t.is_premium === 1 || t.is_premium === true) return 'pro'
  if (t.is_paid === 1 && t.vip_free === 1) return 'personal'
  if (t.is_paid === 1 || t.is_paid === true) return 'limited'
  return 'free'
}

async function getTemplateLevel(templateId) {
  const res = await collection('templates').where({ id: templateId }).limit(1).get()
  const t = res.data && res.data[0]
  if (!t) return null
  const vipLevel = getTemplateTier(t)
  const price = parseFloat(t.price) > 0 ? parseFloat(t.price) : (TIER_DEFAULT_PRICE[vipLevel] || 0)
  return { vipLevel, price }
}

async function getUserByPhone(phone) {
  const res = await collection('users').where({ phone }).limit(1).get()
  return res.data && res.data[0] ? res.data[0] : null
}

// 判断用户是否为专业版会员（vip_level===2 且未过期）
async function isUserPro(phone) {
  if (!phone) return false
  const user = await getUserByPhone(phone)
  if (!user || user.vip_status !== 1) return false
  if (user.vip_expire_at && nowMs() > parseInt(user.vip_expire_at, 10)) return false
  return parseInt(user.vip_level, 10) === 2
}

// 是否已单次解锁该模板：已付订单中 items 含 type='unlock' 且 templateId 匹配
async function isTemplateUnlocked(phone, templateId) {
  const res = await collection('orders').where({ phone, status: 'paid' }).limit(100).get()
  return (res.data || []).some(o => (o.items || []).some(it => it.type === 'unlock' && it.templateId === templateId))
}

// 查询模板配额：返回 { remaining, limitless, tier, price, used, shareEligible }
//   remaining=-1 表示无限；used=限免版已免费使用次数；shareEligible=是否仍可分享得次数
async function getTemplateQuota(phone, templateId) {
  const level = await getTemplateLevel(templateId)
  if (!level) return null
  const user = await getUserByPhone(phone)
  const used = user && user.limitedUseMap ? parseInt(user.limitedUseMap[templateId], 10) || 0 : 0
  const base = { tier: level.vipLevel, price: level.price, used, shareEligible: false }
  // 免费版 / 专业版：无限
  if (level.vipLevel === 'free' || level.vipLevel === 'pro') {
    return Object.assign(base, { remaining: QUOTA_LIMITLESS, limitless: true })
  }
  // 限免版：VIP 或已永久解锁 → 无限；否则 quotaMap（默认 1，分享 +1）
  if (level.vipLevel === 'limited') {
    if (await isUserVip(phone)) return Object.assign(base, { remaining: QUOTA_LIMITLESS, limitless: true })
    if (await isTemplateUnlocked(phone, templateId)) return Object.assign(base, { remaining: QUOTA_LIMITLESS, limitless: true })
    const remaining = user && user.quotaMap ? user.quotaMap[templateId] : undefined
    return Object.assign(base, {
      remaining: remaining === undefined ? 1 : parseInt(remaining, 10) || 0,
      limitless: false,
      // 第2次使用（used=1）才允许分享得次数；第3次起（used>=2）只能按次付费
      shareEligible: used < 2,
    })
  }
  // VIP版：VIP 会员免费或已永久解锁；否则按次付费（额度来自已付 usage 订单）
  if (level.vipLevel === 'personal') {
    if (await isUserVip(phone)) return Object.assign(base, { remaining: QUOTA_LIMITLESS, limitless: true })
    if (await isTemplateUnlocked(phone, templateId)) return Object.assign(base, { remaining: QUOTA_LIMITLESS, limitless: true })
    const remaining = user && user.quotaMap ? parseInt(user.quotaMap[templateId], 10) || 0 : 0
    return Object.assign(base, { remaining, limitless: false })
  }
  // SVIP版：专业版免费或已永久解锁；否则按次付费
  if (level.vipLevel === 'svip') {
    if (await isUserPro(phone)) return Object.assign(base, { remaining: QUOTA_LIMITLESS, limitless: true })
    if (await isTemplateUnlocked(phone, templateId)) return Object.assign(base, { remaining: QUOTA_LIMITLESS, limitless: true })
    const remaining = user && user.quotaMap ? parseInt(user.quotaMap[templateId], 10) || 0 : 0
    return Object.assign(base, { remaining, limitless: false })
  }
  return Object.assign(base, { remaining: QUOTA_LIMITLESS, limitless: true })
}

// GET /api/quota — 查询模板配额
const getQuota = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const templateId = ctx.query.templateId
  if (!templateId) return httpFail('缺少 templateId')
  const quota = await getTemplateQuota(auth.user.phone, templateId)
  if (!quota) return httpFail('模板不存在', 404)
  return ok(quota)
}

// POST /api/quota/consume — 扣减制作额度（新建作品进入编辑器时调用）
// 注意：云函数无内存限流器（无状态），防刷依赖登录鉴权 + 剩余次数本身
const consumeQuota = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const phone = auth.user.phone
  const { templateId } = ctx.body
  if (!templateId) return httpFail('缺少 templateId')
  const quota = await getTemplateQuota(phone, templateId)
  if (!quota) return httpFail('模板不存在', 404)
  if (quota.limitless) return ok({ remaining: QUOTA_LIMITLESS, limitless: true, tier: quota.tier })
  if (quota.remaining <= 0) return httpFail('QUOTA_EXHAUSTED', 403)
  const nowTs = now()
  // 原子扣减：条件更新 quotaMap>0，并发 consume 时仅一次成功，杜绝超发（check-then-act 竞态）
  const key = 'quotaMap.' + templateId
  const upd = await collection('users').where({ phone, [key]: _.gt(0) }).update({ data: { [key]: _.inc(-1), updatedAt: nowTs } })
  if (!upd || upd.stats?.updated !== 1) {
    // 条件未命中：区分"首次使用（字段缺失，写 0）"与"已耗尽（拒绝）"
    const user = await getUserByPhone(phone)
    if (user && user.quotaMap && user.quotaMap[templateId] !== undefined) {
      if (parseInt(user.quotaMap[templateId], 10) <= 0) return httpFail('QUOTA_EXHAUSTED', 403)
    }
    await collection('users').where({ phone }).update({ data: { [key]: 0, updatedAt: nowTs } })
  }
  // 限免版额外累计已使用次数（第2次→分享、第3次起→付费 的漏斗判断依据）
  if (quota.tier === 'limited') {
    const useKey = 'limitedUseMap.' + templateId
    await collection('users').where({ phone }).update({ data: { [useKey]: _.inc(1), updatedAt: nowTs } })
  }
  return ok({ remaining: quota.remaining - 1, limitless: false, tier: quota.tier })
}

// POST /api/share/reward — 分享奖励（限免版第2次使用：分享朋友圈后点击"我已分享"）
// 给分享者的限免模板剩余次数 +1；仅限免版且已使用次数 < 2 时可获得。
// 鉴权：要求登录态且 phone 必须为当前登录用户（防刷：不能给他人刷额度/占用其每日名额）
const shareReward = async (ctx) => {
  const auth = requireAuth(ctx.event)
  if (!auth.ok) return auth.body
  const { templateId, phone } = ctx.body
  if (!templateId) return httpFail('缺少 templateId')
  if (!phone) return httpFail('缺少 phone')
  if (phone !== auth.user.phone) return httpFail('无权操作他人账号', 403)
  const quota = await getTemplateQuota(phone, templateId)
  if (!quota) return httpFail('模板不存在', 404)
  if (quota.limitless) return ok({ remaining: QUOTA_LIMITLESS, rewarded: false, reason: 'unlimited' })
  // 仅限免版可分享得次数
  if (quota.tier !== 'limited') return ok({ remaining: quota.remaining, rewarded: false, reason: 'not_limited' })
  // 已使用 >= 2 次（已过分享阶段），不再发放
  if (quota.used >= 2) return ok({ remaining: quota.remaining, rewarded: false, reason: 'share_done' })
  const date = now().slice(0, 10)
  const nowTs = now()
  const user = await getUserByPhone(phone)
  const shareMapKey = `${templateId}_${date}`
  const todayCount = user && user.shareMap ? parseInt(user.shareMap[shareMapKey], 10) || 0 : 0
  if (todayCount >= 1) return httpFail('DAILY_LIMIT', 429)
  if (quota.remaining >= SHARE_REWARD_QUOTA_CAP) return ok({ remaining: quota.remaining, rewarded: false, reason: 'capped' })
  const shareKey = 'shareMap.' + shareMapKey
  const quotaKey = 'quotaMap.' + templateId
  const userUpdate = { [shareKey]: todayCount + 1, updatedAt: nowTs }
  if (user && user.quotaMap && user.quotaMap[templateId] !== undefined) {
    userUpdate[quotaKey] = _.inc(1)
  } else {
    userUpdate[quotaKey] = quota.remaining + 1
  }
  await collection('users').where({ phone }).update({ data: userUpdate })
  return ok({ remaining: quota.remaining + 1, rewarded: true })
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
