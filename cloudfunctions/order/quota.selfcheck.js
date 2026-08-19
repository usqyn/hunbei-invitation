// ============ quota 链路本地自测 ============
// 用法：node cloudfunctions/order/quota.selfcheck.js
// 用内存 mock 替换 _shared（模拟云数据库 collection/where/limit/get/add/update + db.command.inc），
// 直接调 index.js 的 main（createRouter）走完整路由，验证 quota 查询/扣减/分享奖励/解锁/VIP 判定。
const Module = require('module')
const path = require('path')

// ---------- 内存数据库 ----------
const data = {
  templates: [
    { id: 'tpl-free', vipLevel: 'free' },
    { id: 'tpl-limited', vipLevel: 'limited' },
    { id: 'tpl-pro', vipLevel: 'pro' },
  ],
  users: [{ phone: '13800138000', vip_status: 0, vip_expire_at: null }],
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
const getUser = (event) => {
  const phone = '13800138000'
  return { ok: true, user: { phone, openid: 'mock_openid' }, body: null }
}
const requireAuth = (event) => getUser(event)
const requireAdmin = (event) => getUser(event)
const isUserVip = async (phone) => {
  const u = (data.users || []).find(x => x.phone === phone)
  return !!(u && u.vip_status === 1 && u.vip_expire_at && parseInt(u.vip_expire_at, 10) > Date.now())
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

// ---------- 用例 ----------
async function run() {
  console.log('=== 1. 免费模板 → limitless ===')
  let r = await call('/api/quota', 'GET', { templateId: 'tpl-free' })
  check('free 模板 remaining=-1', r.success && r.data.remaining === -1 && r.data.limitless === true, r)

  console.log('=== 2. 限数模板新用户 → 默认 1 次 ===')
  r = await call('/api/quota', 'GET', { templateId: 'tpl-limited' })
  check('新用户 remaining=1', r.success && r.data.remaining === 1 && !r.data.limitless, r)

  console.log('=== 3. consume 扣减 → 0 ===')
  r = await call('/api/quota/consume', 'POST', {}, { templateId: 'tpl-limited' })
  check('扣减后 remaining=0', r.success && r.data.remaining === 0, r)
  check('users.quotaMap 已写 0', (data.users[0].quotaMap || {})['tpl-limited'] === 0, data.users[0])

  console.log('=== 4. 再次 consume → QUOTA_EXHAUSTED ===')
  r = await call('/api/quota/consume', 'POST', {}, { templateId: 'tpl-limited' })
  check('返回 QUOTA_EXHAUSTED', !r.success && r.error === 'QUOTA_EXHAUSTED', r)

  console.log('=== 5. VIP 用户 → limitless ===')
  data.users[0].vip_status = 1
  data.users[0].vip_expire_at = String(Date.now() + 86400000)
  r = await call('/api/quota', 'GET', { templateId: 'tpl-limited' })
  check('VIP 用户 limitless', r.success && r.data.limitless === true, r)

  console.log('=== 6. 已单次解锁（已付订单含 unlock）→ limitless ===')
  data.users[0].vip_status = 0
  data.users[0].vip_expire_at = null
  data.orders.push({ id: 'o1', phone: PHONE, status: 'paid', items: [{ type: 'unlock', templateId: 'tpl-limited' }] })
  r = await call('/api/quota', 'GET', { templateId: 'tpl-limited' })
  check('解锁后 limitless', r.success && r.data.limitless === true, r)
  data.orders = []
  data.users[0].quotaMap = {}

  console.log('=== 7. 分享奖励 → +1 ===')
  r = await call('/api/share/reward', 'POST', {}, { templateId: 'tpl-limited', phone: PHONE })
  check('奖励后 remaining=2', r.success && r.data.remaining === 2 && r.data.rewarded === true, r)
  check('shareMap 已记 1 次', (data.users[0].shareMap || {})[`tpl-limited_${TODAY}`] === 1, data.users[0])
  check('quotaMap=2', data.users[0].quotaMap['tpl-limited'] === 2, data.users[0])

  console.log('=== 8. 同人同模板当日再次分享 → DAILY_LIMIT ===')
  r = await call('/api/share/reward', 'POST', {}, { templateId: 'tpl-limited', phone: PHONE })
  check('返回 DAILY_LIMIT', !r.success && r.error === 'DAILY_LIMIT', r)

  console.log('=== 9. 达到上限 5 → capped ===')
  data.users[0].shareMap = {}
  data.users[0].quotaMap['tpl-limited'] = 5
  r = await call('/api/share/reward', 'POST', {}, { templateId: 'tpl-limited', phone: PHONE })
  check('reason=capped 且不 +1', r.success && r.data.rewarded === false && r.data.reason === 'capped' && r.data.remaining === 5, r)

  console.log('=== 10. 模板不存在 → 404 ===')
  r = await call('/api/quota', 'GET', { templateId: 'tpl-ghost' })
  check('返回 模板不存在', !r.success && r.error === '模板不存在', r)

  console.log('=== 11. 缺 templateId → 缺少 templateId ===')
  r = await call('/api/quota', 'GET', {})
  check('返回 缺少 templateId', !r.success && r.error === '缺少 templateId', r)

  console.log(`\n结果: ${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}

run().catch(e => { console.error('自测异常:', e); process.exit(1) })
