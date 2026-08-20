// ============ quota 链路本地自测 ============
// 用法：node cloudfunctions/order/quota.selfcheck.js
// 用内存 mock 替换 _shared（模拟云数据库 collection/where/limit/get/add/update + db.command.inc + runTransaction），
// 直接调 index.js 的 main（createRouter）走完整路由，验证：
//   限免版漏斗（免费1次→分享朋友圈→按次付费6.6）、VIP版(9.9)、SVIP版(18.8)、按次付费发额度、VIP/Pro 免费用。
const Module = require('module')
const path = require('path')

// ---------- 内存数据库 ----------
const data = {
  templates: [
    { id: 'tpl-free', vipLevel: 'free', status: 'published' },
    { id: 'tpl-limited', vipLevel: 'limited', status: 'published' },
    { id: 'tpl-personal', vipLevel: 'personal', status: 'published' },
    { id: 'tpl-svip', vipLevel: 'svip', status: 'published' },
    { id: 'tpl-pro', vipLevel: 'pro', status: 'published' },
  ],
  users: [{ phone: '13800138000', vip_status: 0, vip_expire_at: null, vip_level: 0 }],
  orders: [],
  products: [],
  notifications: [],
}
const FIXED_NOW = '2026-08-18T10:00:00.000Z'
const TODAY = FIXED_NOW.slice(0, 10)

function applyUpdate(doc, updates) {
  for (const [key, val] of Object.entries(updates)) {
    const parts = key.split('.')
    let cur = doc
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {}
      cur = cur[parts[i]]
    }
    const last = parts[parts.length - 1]
    if (val && typeof val === 'object' && val.__op === 'inc') {
      cur[last] = (typeof cur[last] === 'number' ? cur[last] : 0) + val.n
    } else {
      cur[last] = val
    }
  }
}

function matches(doc, cond) {
  return Object.entries(cond).every(([k, v]) => {
    const parts = k.split('.')
    let cur = doc
    for (const p of parts) {
      if (cur === undefined || cur === null) return false
      cur = cur[p]
    }
    if (v && typeof v === 'object' && v.__op === 'in') return v.arr.includes(cur)
    if (v && typeof v === 'object' && v.__op === 'gt') return (typeof cur === 'number' ? cur : 0) > v.n
    return cur === v
  })
}

function makeCollection(name) {
  const col = {
    where(cond) {
      let limit = Infinity
      return {
        limit(n) { limit = n; return this },
        async get() {
          const list = data[name] || []
          return { data: list.filter(d => matches(d, cond)).slice(0, limit) }
        },
        async update({ data: updates }) {
          let n = 0
          for (const doc of data[name] || []) {
            if (matches(doc, cond)) { applyUpdate(doc, updates); n++ }
          }
          return { stats: { updated: n } }
        },
        async count() { return { total: (data[name] || []).filter(d => matches(d, cond)).length } },
      }
    },
    doc(id) {
      return {
        async get() { return { data: (data[name] || []).find(d => d.id === id) || null } },
        async set(doc) {
          const list = data[name] || (data[name] = [])
          const idx = list.findIndex(d => d.id === id)
          const merged = { ...(idx >= 0 ? list[idx] : {}), ...doc }
          if (idx >= 0) list[idx] = merged; else list.push(merged)
          return {}
        },
      }
    },
    async add({ data: doc }) {
      const list = data[name] || (data[name] = [])
      const id = doc.id || `mock_${list.length}`
      list.push({ ...doc, _id: id })
      return { _id: id }
    },
  }
  return col
}

// ---------- mock _shared ----------
// 注意：真实 _shared 的 requireAuth/requireAdmin 是同步函数（handler 内无 await），mock 必须同步
// 可变登录态：shareReward 鉴权用例通过改 MOCK_AUTH_PHONE 模拟"他人账号"
let MOCK_AUTH_PHONE = '13800138000'
const getUser = (event) => {
  const phone = MOCK_AUTH_PHONE
  return { ok: true, user: { phone, openid: 'mock_openid' }, body: null }
}
const requireAuth = (event) => getUser(event)
const requireAdmin = (event) => getUser(event)
const isUserVip = async (phone) => {
  const u = (data.users || []).find(x => x.phone === phone)
  return !!(u && u.vip_status === 1 && u.vip_expire_at && parseInt(u.vip_expire_at, 10) > Date.parse(FIXED_NOW))
}
const ok = (payload, extra) => Object.assign({ success: true, data: payload }, extra || {})
const okMsg = (msg) => ({ success: true, message: msg })
const fail = (error) => ({ success: false, error })
const httpOK = (body, statusCode = 200) => ({ statusCode, body: JSON.stringify(body) })
const httpFail = (error, statusCode = 400) => ({ statusCode, body: JSON.stringify({ success: false, error }) })
const httpOptions = () => ({ statusCode: 204, body: '' })
const parseBody = (event) => {
  try { return event.body ? JSON.parse(event.body) : {} } catch { return {} }
}
const parsePagination = (query) => ({ page: 1, limit: 10, skip: 0, hasPaging: false })
const paginateResponse = (list, page, limit, total) => ({ success: true, data: list, page, limit, total })
const matchRoute = (pattern, eventPath) => {
  const keys = []
  const rx = new RegExp('^' + pattern.replace(/:[^/]+/g, (m) => { keys.push(m.slice(1)); return '([^/]+)' }) + '$')
  const m = eventPath.match(rx)
  if (!m) return null
  const params = {}
  keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]) })
  return params
}
const normalizeEvent = (event) => {
  if (event.queryStringParameters !== undefined) {
    event._source = 'http'
    return event
  }
  return {
    httpMethod: event.httpMethod || 'GET',
    path: event.path || '/',
    body: event.body != null ? JSON.stringify(event.body) : '',
    queryStringParameters: event.query || {},
    headers: event.headers || {},
    isBase64Encoded: false,
    _source: 'callFunction',
  }
}
const createRouter = (routes) => async (event) => {
  const normalizedEvent = normalizeEvent(event)
  const { httpMethod, path: eventPath, queryStringParameters } = normalizedEvent
  for (const [method, pattern, handler] of routes) {
    if (method !== httpMethod) continue
    const params = matchRoute(pattern, eventPath)
    if (params === null) continue
    const ctx = {
      method: httpMethod, path: eventPath,
      query: queryStringParameters || {}, body: parseBody(normalizedEvent),
      params, headers: normalizedEvent.headers || {},
      event: normalizedEvent,
    }
    const result = await handler(ctx)
    if (result && result.statusCode) return JSON.parse(result.body)
    return result
  }
  return { success: false, error: '接口不存在' }
}

const db = {
  command: {
    inc: (n) => ({ __op: 'inc', n }),
    in: (arr) => ({ __op: 'in', arr }),
    gt: (n) => ({ __op: 'gt', n }),
  },
  // 简化事务：直接复用同一内存数据（同步内存库，顺序执行等价）
  runTransaction: async (fn) => {
    const tx = { collection: (name) => makeCollection(name) }
    return fn(tx)
  },
}
const collection = (name) => makeCollection(name)

const mockShared = {
  db, collection, _: db.command,
  now: () => FIXED_NOW, nowMs: () => Date.parse(FIXED_NOW),
  uuid: () => 'mock-uuid-' + Math.random().toString(36).slice(2),
  getUser, requireAuth, requireAdmin, isUserVip,
  ok, okMsg, fail, httpOK, httpFail, httpOptions,
  parsePagination, paginateResponse, parseBody, matchRoute, normalizeEvent, createRouter,
  extractPathParams: (pattern, p) => matchRoute(pattern, p) || {},
}

const origLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request === './_shared' || request === path.join(path.dirname(require.resolve('./index.js')), '_shared')) {
    return mockShared
  }
  return origLoad.call(this, request, parent, isMain)
}

const api = require('./index.js')

// ---------- 断言工具 ----------
let passed = 0
let failed = 0
function check(name, cond, detail) {
  if (cond) { passed++; console.log('  ✓', name) }
  else { failed++; console.error('  ✗', name, detail === undefined ? '' : JSON.stringify(detail)) }
}
async function call(path, httpMethod, query, body) {
  return api.main({ path, httpMethod, query, body, headers: {} })
}
const PHONE = '13800138000'

function resetUsers() {
  data.users = [{ phone: PHONE, vip_status: 0, vip_expire_at: null, vip_level: 0 }]
  data.orders = []
}
function setVip(level = 1, days = 30) {
  data.users[0].vip_status = 1
  data.users[0].vip_expire_at = String(Date.parse(FIXED_NOW) + days * 86400000)
  data.users[0].vip_level = level
}

// ---------- 用例 ----------
async function run() {
  console.log('=== 1. 免费模板 → limitless ===')
  let r = await call('/api/quota', 'GET', { templateId: 'tpl-free' })
  check('free 模板 remaining=-1', r.success && r.data.remaining === -1 && r.data.limitless === true, r)

  console.log('=== 2. 限免版新用户 → 默认 1 次（第1次免费） ===')
  r = await call('/api/quota', 'GET', { templateId: 'tpl-limited' })
  check('新用户 remaining=1, used=0', r.success && r.data.remaining === 1 && r.data.used === 0 && !r.data.limitless, r)
  check('tier=limited price=6.6', r.data.tier === 'limited' && r.data.price === 6.6, r)
  check('used<2 → shareEligible=true', r.data.shareEligible === true, r)

  console.log('=== 3. 第1次 consume → remaining=0, used=1 ===')
  r = await call('/api/quota/consume', 'POST', {}, { templateId: 'tpl-limited' })
  check('扣减后 remaining=0', r.success && r.data.remaining === 0, r)
  check('users.quotaMap 已写 0', (data.users[0].quotaMap || {})['tpl-limited'] === 0, data.users[0])
  check('users.limitedUseMap 已记 1 次', (data.users[0].limitedUseMap || {})['tpl-limited'] === 1, data.users[0])

  console.log('=== 4. 第2次使用（quota 用尽）→ 需分享/付费 ===')
  r = await call('/api/quota', 'GET', { templateId: 'tpl-limited' })
  check('remaining=0 used=1', r.success && r.data.remaining === 0 && r.data.used === 1, r)
  check('shareEligible=true（第2次可分享）', r.data.shareEligible === true, r)
  r = await call('/api/quota/consume', 'POST', {}, { templateId: 'tpl-limited' })
  check('consume 返回 QUOTA_EXHAUSTED', !r.success && r.error === 'QUOTA_EXHAUSTED', r)

  console.log('=== 5. 第2次分享朋友圈（"我已分享"）→ +1 ===')
  r = await call('/api/share/reward', 'POST', {}, { templateId: 'tpl-limited', phone: PHONE })
  check('奖励后 remaining=1（用尽1次后 +1）', r.success && r.data.remaining === 1 && r.data.rewarded === true, r)
  check('shareMap 已记 1 次', (data.users[0].shareMap || {})[`tpl-limited_${TODAY}`] === 1, data.users[0])

  console.log('=== 6. 同人同模板当日再次分享 → DAILY_LIMIT ===')
  r = await call('/api/share/reward', 'POST', {}, { templateId: 'tpl-limited', phone: PHONE })
  check('返回 DAILY_LIMIT', !r.success && r.error === 'DAILY_LIMIT', r)

  console.log('=== 7. 第3次使用（used=2）→ 分享不再奖励，只能付费 ===')
  r = await call('/api/quota/consume', 'POST', {}, { templateId: 'tpl-limited' })
  check('consume 扣 1（分享所得）', r.success && r.data.remaining === 0, r)
  r = await call('/api/quota', 'GET', { templateId: 'tpl-limited' })
  check('used=2, shareEligible=false', r.data.used === 2 && r.data.shareEligible === false, r)
  r = await call('/api/share/reward', 'POST', {}, { templateId: 'tpl-limited', phone: PHONE })
  check('分享返回 share_done 不 +1', r.success && r.data.rewarded === false && r.data.reason === 'share_done', r)

  console.log('=== 8. 达到上限 5 → capped ===')
  resetUsers()
  r = await call('/api/share/reward', 'POST', {}, { templateId: 'tpl-limited', phone: PHONE })
  check('奖励 +1 → remaining=2', r.success && r.data.remaining === 2, r)
  data.users[0].quotaMap['tpl-limited'] = 5
  data.users[0].shareMap = {}
  r = await call('/api/share/reward', 'POST', {}, { templateId: 'tpl-limited', phone: PHONE })
  check('reason=capped 且不 +1', r.success && r.data.rewarded === false && r.data.reason === 'capped' && r.data.remaining === 5, r)

  console.log('=== 9. VIP 用户限免版 → limitless ===')
  resetUsers()
  setVip(1)
  r = await call('/api/quota', 'GET', { templateId: 'tpl-limited' })
  check('VIP 用户 limitless', r.success && r.data.limitless === true, r)

  console.log('=== 10. 已单次解锁（已付订单含 unlock）→ limitless ===')
  resetUsers()
  data.orders.push({ id: 'o1', phone: PHONE, status: 'paid', items: [{ type: 'unlock', templateId: 'tpl-limited' }] })
  r = await call('/api/quota', 'GET', { templateId: 'tpl-limited' })
  check('解锁后 limitless', r.success && r.data.limitless === true, r)

  console.log('=== 11. VIP版(personal)：非VIP 需按次付费 9.9 ===')
  resetUsers()
  r = await call('/api/quota', 'GET', { templateId: 'tpl-personal' })
  check('remaining=0 tier=personal price=9.9', r.success && r.data.remaining === 0 && r.data.tier === 'personal' && r.data.price === 9.9 && !r.data.limitless, r)
  r = await call('/api/quota/consume', 'POST', {}, { templateId: 'tpl-personal' })
  check('未付费 consume → QUOTA_EXHAUSTED', !r.success && r.error === 'QUOTA_EXHAUSTED', r)
  r = await call('/api/share/reward', 'POST', {}, { templateId: 'tpl-personal', phone: PHONE })
  check('VIP版分享不奖励（not_limited）', r.success && r.data.rewarded === false && r.data.reason === 'not_limited', r)

  console.log('=== 12. VIP版(personal)：VIP 会员 → limitless ===')
  setVip(1)
  r = await call('/api/quota', 'GET', { templateId: 'tpl-personal' })
  check('VIP 会员 limitless', r.success && r.data.limitless === true, r)

  console.log('=== 13. SVIP版(svip)：非专业版 需按次付费 18.8 ===')
  resetUsers()
  r = await call('/api/quota', 'GET', { templateId: 'tpl-svip' })
  check('remaining=0 tier=svip price=18.8', r.success && r.data.remaining === 0 && r.data.tier === 'svip' && r.data.price === 18.8 && !r.data.limitless, r)
  setVip(1)
  r = await call('/api/quota', 'GET', { templateId: 'tpl-svip' })
  check('个人VIP 对 SVIP版 仍付费', r.success && !r.data.limitless && r.data.remaining === 0, r)

  console.log('=== 14. SVIP版(svip)：专业版 → limitless ===')
  setVip(2)
  r = await call('/api/quota', 'GET', { templateId: 'tpl-svip' })
  check('专业版 limitless', r.success && r.data.limitless === true, r)

  console.log('=== 15. 按次付费：创建 usage 订单（服务端按档位计价）→ 支付 → quota+1 → 可 consume ===')
  resetUsers()
  r = await call('/api/orders', 'POST', {}, { items: [{ type: 'usage', templateId: 'tpl-limited' }], contactName: '', contactPhone: '', address: '', note: '' })
  check('限免版 usage 订单金额 6.6', r.success && r.data.totalAmount === '6.60', r)
  const orderId1 = r.data.id
  r = await call('/api/orders', 'POST', {}, { items: [{ type: 'usage', templateId: 'tpl-personal' }], contactName: '', contactPhone: '', address: '', note: '' })
  check('VIP版 usage 订单金额 9.9', r.success && r.data.totalAmount === '9.90', r)
  r = await call('/api/orders', 'POST', {}, { items: [{ type: 'usage', templateId: 'tpl-svip' }], contactName: '', contactPhone: '', address: '', note: '' })
  check('SVIP版 usage 订单金额 18.8', r.success && r.data.totalAmount === '18.80', r)
  r = await call(`/api/orders/${orderId1}/pay`, 'POST', {}, {})
  check('支付成功', r.success && r.data.status === 'paid', r)
  r = await call('/api/quota', 'GET', { templateId: 'tpl-limited' })
  check('支付后 remaining=1', r.success && r.data.remaining === 1, r)
  r = await call('/api/quota/consume', 'POST', {}, { templateId: 'tpl-limited' })
  check('可正常 consume 制作 1 次', r.success && r.data.remaining === 0, r)

  console.log('=== 16. 专业版模板(pro) → limitless（Pro 专属） ===')
  resetUsers()
  r = await call('/api/quota', 'GET', { templateId: 'tpl-pro' })
  check('pro 模板 limitless', r.success && r.data.limitless === true, r)

  console.log('=== 17. 模板不存在 → 404 ===')
  r = await call('/api/quota', 'GET', { templateId: 'tpl-ghost' })
  check('返回 模板不存在', !r.success && r.error === '模板不存在', r)

  console.log('=== 18. 缺 templateId → 缺少 templateId ===')
  r = await call('/api/quota', 'GET', {})
  check('返回 缺少 templateId', !r.success && r.error === '缺少 templateId', r)

  console.log('=== 19. shareReward 鉴权：他人账号 → 403 ===')
  resetUsers()
  MOCK_AUTH_PHONE = '13900139000'
  r = await call('/api/share/reward', 'POST', {}, { templateId: 'tpl-limited', phone: PHONE })
  check('他人 phone 返回 无权操作他人账号', !r.success && r.error === '无权操作他人账号', r)
  MOCK_AUTH_PHONE = PHONE

  console.log('=== 20. SVIP版 shareReward → not_limited ===')
  resetUsers()
  r = await call('/api/share/reward', 'POST', {}, { templateId: 'tpl-svip', phone: PHONE })
  check('SVIP版分享不奖励', r.success && r.data.rewarded === false && r.data.reason === 'not_limited', r)

  console.log('=== 21. 专业版用户 → personal/svip 均 limitless ===')
  resetUsers()
  setVip(2)
  r = await call('/api/quota', 'GET', { templateId: 'tpl-personal' })
  check('专业版用户 personal 模板 limitless', r.success && r.data.limitless === true, r)
  r = await call('/api/quota', 'GET', { templateId: 'tpl-svip' })
  check('专业版用户 svip 模板 limitless', r.success && r.data.limitless === true, r)

  console.log('=== 22. 会员创建 usage 订单 → 拒绝（防接口层误收费） ===')
  resetUsers()
  setVip(1)
  r = await call('/api/orders', 'POST', {}, { items: [{ type: 'usage', templateId: 'tpl-personal' }] })
  check('VIP 用户买 personal 被拒', !r.success && r.error === '您是会员，无需按次购买', r)
  r = await call('/api/orders', 'POST', {}, { items: [{ type: 'usage', templateId: 'tpl-limited' }] })
  check('VIP 用户买 limited 被拒', !r.success && r.error === '您是会员，无需按次购买', r)
  resetUsers()
  setVip(2)
  r = await call('/api/orders', 'POST', {}, { items: [{ type: 'usage', templateId: 'tpl-svip' }] })
  check('专业版买 svip 被拒', !r.success && r.error === '您是专业版会员，无需按次购买', r)

  console.log('=== 23. personal/svip usage 订单支付 → quota+1；quantity=2 → +2 ===')
  resetUsers()
  r = await call('/api/orders', 'POST', {}, { items: [{ type: 'usage', templateId: 'tpl-personal' }] })
  const orderP = r.data.id
  r = await call(`/api/orders/${orderP}/pay`, 'POST', {}, {})
  check('personal 支付成功', r.success && r.data.status === 'paid', r)
  r = await call('/api/quota', 'GET', { templateId: 'tpl-personal' })
  check('personal 支付后 remaining=1', r.success && r.data.remaining === 1, r)
  r = await call('/api/orders', 'POST', {}, { items: [{ type: 'usage', templateId: 'tpl-svip', quantity: 2 }] })
  check('svip quantity=2 订单金额 37.6', r.success && r.data.totalAmount === '37.60', r)
  const orderS = r.data.id
  r = await call(`/api/orders/${orderS}/pay`, 'POST', {}, {})
  check('svip 支付成功', r.success && r.data.status === 'paid', r)
  r = await call('/api/quota', 'GET', { templateId: 'tpl-svip' })
  check('svip quantity=2 支付后 remaining=2', r.success && r.data.remaining === 2, r)

  console.log('=== 24. 已解锁（unlock 订单）→ personal/svip 也 limitless ===')
  resetUsers()
  data.orders.push({ id: 'o2', phone: PHONE, status: 'paid', items: [{ type: 'unlock', templateId: 'tpl-personal' }] })
  r = await call('/api/quota', 'GET', { templateId: 'tpl-personal' })
  check('personal 解锁后 limitless', r.success && r.data.limitless === true, r)
  data.orders.push({ id: 'o3', phone: PHONE, status: 'paid', items: [{ type: 'unlock', templateId: 'tpl-svip' }] })
  r = await call('/api/quota', 'GET', { templateId: 'tpl-svip' })
  check('svip 解锁后 limitless', r.success && r.data.limitless === true, r)

  console.log('=== 25. VIP 订单支付 → 写入 vip_level（1=个人/2=专业版） ===')
  resetUsers()
  r = await call('/api/vip/order', 'POST', {}, { plan: 'personal_yearly' })
  check('创建个人VIP年卡订单', r.success && !!r.data.orderId, r)
  r = await call(`/api/orders/${r.data.orderId}/pay`, 'POST', {}, {})
  check('支付成功', r.success && r.data.status === 'paid', r)
  check('user.vip_level=1', data.users[0].vip_level === 1 && data.users[0].vip_plan === 'personal_yearly', data.users[0])
  r = await call('/api/vip/order', 'POST', {}, { plan: 'pro_monthly' })
  const proOrder = r.data.orderId
  r = await call(`/api/orders/${proOrder}/pay`, 'POST', {}, {})
  check('专业版月卡支付成功', r.success && r.data.status === 'paid', r)
  check('user.vip_level=2', data.users[0].vip_level === 2 && data.users[0].vip_plan === 'pro_monthly', data.users[0])

  console.log('=== 26. 脏数据 vipLevel → 回退旧字段推断 ===')
  resetUsers()
  data.templates.push({ id: 'tpl-dirty', vipLevel: 'vip', is_paid: 1, is_premium: 0, vip_free: 0, status: 'published' })
  r = await call('/api/quota', 'GET', { templateId: 'tpl-dirty' })
  check('脏档位回退为 limited（按次收费）', r.success && r.data.tier === 'limited' && r.data.remaining === 1 && !r.data.limitless, r)

  console.log(`\n结果: ${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}

run().catch(e => { console.error('自测异常:', e); process.exit(1) })