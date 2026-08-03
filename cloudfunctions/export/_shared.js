// ============ 公共工具模块（_shared/index.js） ============
// 供所有云函数 require('./_shared') 引用，部署前由 build.js 复制到各函数目录。
// 包含：数据库访问、JWT 鉴权、统一响应、分页、云存储上传、短信验证码、版本号。
//
// 与原 Express 实现的主要差异：
// 1. 数据库从 sql.js (SQLite) 改为云数据库 NoSQL（每个表 → 一个 collection）
// 2. 文件存储从本地磁盘改为云存储（cloud.uploadFile / downloadFile / getTempFileURL）
// 3. 短信验证码从内存对象改为云数据库 sms_codes 集合（5分钟过期）
// 4. 版本号从 settings 表改为 settings 集合（key='version'）
// 5. 限流由云函数并发限制 + 网关层负责，本模块不再实现 IP 限流

const cloud = require('wx-server-sdk')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')

// ============ 初始化云开发 SDK ============
// envId 必须与云开发环境 ID 一致；云函数运行时 cloud 已注入 DYNAMIC_CURRENT_ENV，
// 但显式指定 envId 可保证 HTTP 触发器场景下也能访问同一环境。
const envId = 'cloud1-d4gyvmo1d9a1e148a'
cloud.init({ env: envId })

// ============ 数据库 ============
const db = cloud.database()
const _ = db.command

// 返回指定集合的引用（封装一层便于统一加前缀/统计）
const collection = (name) => db.collection(name)

// ============ 时间与 ID 工具 ============
const now = () => new Date().toISOString()
const nowMs = () => Date.now()
const uuid = () => uuidv4()

// ============ 配置 ============
const ADMIN_PHONE = process.env.ADMIN_PHONE || '13800138000'
const DEV_CODE = process.env.DEV_CODE || '000000'
const JWT_SECRET = process.env.JWT_SECRET || 'TOYtamaxia-test-secret'
const IS_DEV = process.env.NODE_ENV !== 'production'

// ============ 鉴权 ============
// 签发 JWT，保留与原 Express 相同的 payload 结构 { phone, role }
const signToken = (payload, expiresIn = '30d') => jwt.sign(payload, JWT_SECRET, { expiresIn })

// 校验 token，失败返回 null（不抛异常，便于调用方统一处理）
const verifyToken = (token) => {
  if (!token || !JWT_SECRET) return null
  try { return jwt.verify(token, JWT_SECRET) } catch (_) { return null }
}

// 从 event.headers.Authorization 中解析用户信息，返回 { phone, role } 或 null
// event.headers 字段名在 HTTP 触发器中可能为小写，这里做大小写兼容
const getUser = (event) => {
  const headers = (event && event.headers) || {}
  const auth = headers.Authorization || headers.authorization || ''
  if (!auth || !auth.startsWith('Bearer ')) return null
  return verifyToken(auth.slice(7))
}

// 判断是否管理员：role='admin' 或 phone===ADMIN_PHONE
const isAdmin = (user) => !!(user && (user.role === 'admin' || user.phone === ADMIN_PHONE))

// 鉴权校验：返回 { ok: true, user } 或 { ok: false, statusCode, body }
const requireAuth = (event) => {
  const user = getUser(event)
  if (!user || !user.phone) {
    return { ok: false, statusCode: 401, body: httpFail('请先登录', 401) }
  }
  return { ok: true, user }
}

// 管理员鉴权校验：同上但需要管理员权限
const requireAdmin = (event) => {
  const user = getUser(event)
  if (!user || !user.phone) {
    return { ok: false, statusCode: 401, body: httpFail('请先登录', 401) }
  }
  if (!isAdmin(user)) {
    return { ok: false, statusCode: 403, body: httpFail('无管理员权限', 403) }
  }
  return { ok: true, user }
}

// 公开接口中判断是否管理员（不强制鉴权，仅用于差异化可见性控制）
const isRequestFromAdmin = (event) => isAdmin(getUser(event))

// ============ 响应格式 ============
// 业务层响应（与原 Express 完全一致）
const ok = (data, extra) => Object.assign({ success: true, data }, extra || {})
const okMsg = (message) => ({ success: true, message })
const fail = (error, statusCode = 400) => ({ success: false, error })

// 包装为云函数 HTTP 触发器返回格式 { statusCode, headers, body }
const httpOK = (bodyObj, statusCode = 200) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Session-Id,Session-Id',
  },
  body: JSON.stringify(bodyObj),
})

const httpFail = (error, statusCode = 400) => httpOK({ success: false, error }, statusCode)

// OPTIONS 预检统一响应
const httpOptions = () => ({
  statusCode: 200,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Session-Id,Session-Id',
  },
  body: '',
})

// ============ 分页 ============
// 解析分页参数，limit 上限 100 默认 20，与原 Express 一致
const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query && query.page, 10) || 0)
  const limit = Math.min(100, parseInt(query && query.limit, 10) || 20)
  const skip = page > 0 ? (page - 1) * limit : 0
  return { page, limit, skip, hasPaging: page > 0 && limit > 0 }
}

// 构造分页响应 { success, data, pagination }
const paginateResponse = (data, page, limit, total) => ({
  success: true,
  data,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  },
})

// ============ 云存储上传 ============
// 上传文件到云存储，返回 fileID（cloud://envId.xxx/xxx）
const uploadToCloud = async (fileBuffer, cloudPath, contentType) => {
  const res = await cloud.uploadFile({
    cloudPath,
    fileContent: fileBuffer,
    contentType: contentType || undefined,
  })
  return res.fileID
}

// 将 fileID 转为可访问的 https URL（云存储临时链接，有效期约 2 小时）
const getCloudUrl = async (fileID) => {
  if (!fileID) return ''
  // 非 cloud:// 协议（已是 https URL）直接返回
  if (typeof fileID === 'string' && !fileID.startsWith('cloud://')) return fileID
  try {
    const res = await cloud.getTempFileURL({ fileList: [fileID] })
    if (res && res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
      return res.fileList[0].tempFileURL
    }
    return ''
  } catch (e) {
    console.error('getCloudUrl 失败:', e)
    return ''
  }
}

// 批量获取云存储 URL（减少 N+1 调用）
const getCloudUrls = async (fileIDs) => {
  if (!fileIDs || !fileIDs.length) return []
  const cloudOnes = fileIDs.filter(f => typeof f === 'string' && f.startsWith('cloud://'))
  if (!cloudOnes.length) return fileIDs
  try {
    const res = await cloud.getTempFileURL({ fileList: cloudOnes })
    const map = {}
    res.fileList.forEach(item => { if (item.tempFileURL) map[item.fileID] = item.tempFileURL })
    return fileIDs.map(f => (typeof f === 'string' && map[f]) ? map[f] : f)
  } catch (e) {
    console.error('getCloudUrls 失败:', e)
    return fileIDs
  }
}

// 删除云存储文件
const deleteCloudFile = async (fileID) => {
  if (!fileID || !fileID.startsWith('cloud://')) return
  try { await cloud.deleteFile({ fileList: [fileID] }) } catch (e) { console.error('deleteCloudFile 失败:', e) }
}

// 解析记录中指定字段的 cloud:// URL 为 https 临时 URL
// 用法：await resolveCloudFields(record, ['cover_url', 'poster_url'])
// 或：await resolveCloudFields(recordsArray, ['cover_url', 'poster_url'])
// 就地修改 record，同时返回 record
const resolveCloudFields = async (records, fields) => {
  if (!records) return records
  const arr = Array.isArray(records) ? records : [records]
  // 收集所有 cloud:// fileID
  const fileIDs = new Set()
  for (const rec of arr) {
    if (!rec || typeof rec !== 'object') continue
    for (const f of fields) {
      const v = rec[f]
      if (typeof v === 'string' && v.startsWith('cloud://')) fileIDs.add(v)
    }
  }
  if (!fileIDs.size) return records
  // 批量换取临时 URL
  const ids = Array.from(fileIDs)
  const urls = await getCloudUrls(ids)
  const urlMap = {}
  ids.forEach((id, i) => { if (urls[i]) urlMap[id] = urls[i] })
  // 就地替换
  for (const rec of arr) {
    if (!rec || typeof rec !== 'object') continue
    for (const f of fields) {
      const v = rec[f]
      if (typeof v === 'string' && urlMap[v]) rec[f] = urlMap[v]
    }
  }
  return records
}

// 将相对路径（/uploads/xxx.jpg）和旧域名路径转换为完整 HTTPS URL
// 用于云函数模式下弥补 migrate-assets 不完全的情况
// 注意：cloud:// URL 应在此之前由 resolveCloudFields 处理
const PRODUCTION_ASSETS_BASE = 'https://api.TOYtamaxia.com'

const normalizeToHttpsUrl = (url) => {
  if (!url || typeof url !== 'string') return url || ''
  if (url.startsWith('cloud://')) return url
  // 已经是 HTTPS（非 localhost）→ 直接返回
  if (url.startsWith('https://')) return url
  // HTTP 旧地址（localhost/127.0.0.1）→ 替换为生产 HTTPS 域名
  if (url.startsWith('http://')) {
    return url.replace(/^https?:\/\/(localhost|127\.0\.0\.1):\d+\//, PRODUCTION_ASSETS_BASE.endsWith('/') ? PRODUCTION_ASSETS_BASE : PRODUCTION_ASSETS_BASE + '/')
  }
  // 相对路径：拼接生产域名
  if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
    return PRODUCTION_ASSETS_BASE + (url.startsWith('/') ? url : '/' + url)
  }
  return url
}

// 批量转换记录中指定字段的相对路径为完整 HTTPS URL
const normalizeUploadPaths = (records, fields) => {
  if (!records) return records
  const arr = Array.isArray(records) ? records : [records]
  for (const rec of arr) {
    if (!rec || typeof rec !== 'object') continue
    for (const f of fields) {
      rec[f] = normalizeToHttpsUrl(rec[f])
    }
  }
  return records
}

// 递归遍历对象/数组，把所有 /uploads/ 相对路径替换为完整 HTTPS URL
// 用于嵌套 JSON 字段（如 templates.background/data/elements/pages）
const normalizeUploadPathsDeep = (obj) => {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'string') {
    return normalizeToHttpsUrl(obj)
  }
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = normalizeUploadPathsDeep(obj[i])
    }
    return obj
  }
  if (typeof obj === 'object') {
    for (const k of Object.keys(obj)) {
      obj[k] = normalizeUploadPathsDeep(obj[k])
    }
    return obj
  }
  return obj
}

// 递归遍历对象/数组，把所有 cloud:// URL 替换为 https 临时 URL
// 用于嵌套 JSON 字段（如 works.data、templates.elements/pages）
// 就地修改对象，同时返回对象
const resolveCloudUrlsDeep = async (obj) => {
  if (!obj) return obj
  // 1. 收集所有 cloud:// fileID
  const fileIDs = new Set()
  const collect = (v) => {
    if (v === null || v === undefined) return
    if (typeof v === 'string') {
      if (v.startsWith('cloud://')) fileIDs.add(v)
    } else if (Array.isArray(v)) {
      v.forEach(collect)
    } else if (typeof v === 'object') {
      Object.values(v).forEach(collect)
    }
  }
  collect(obj)
  if (!fileIDs.size) return obj
  // 2. 批量换取临时 URL
  const ids = Array.from(fileIDs)
  const urls = await getCloudUrls(ids)
  const urlMap = {}
  ids.forEach((id, i) => { if (urls[i]) urlMap[id] = urls[i] })
  if (!Object.keys(urlMap).length) return obj
  // 3. 递归替换
  const replace = (v) => {
    if (v === null || v === undefined) return v
    if (typeof v === 'string') {
      return urlMap[v] || v
    }
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) v[i] = replace(v[i])
      return v
    }
    if (typeof v === 'object') {
      for (const k of Object.keys(v)) v[k] = replace(v[k])
      return v
    }
    return v
  }
  replace(obj)
  return obj
}

// ============ 短信验证码（云数据库存储，替代原内存对象） ============
// 写入 sms_codes 集合，5分钟过期；同一手机号覆盖旧记录
const setSmsCode = async (phone, code) => {
  const expireAt = nowMs() + 5 * 60 * 1000
  // 先删旧的同号记录，再插入新的（云数据库无 upsert，用 remove + add 模拟）
  try {
    await collection('sms_codes').where({ phone }).remove()
  } catch (_) {}
  await collection('sms_codes').add({ data: { phone, code, time: nowMs(), expireAt } })
}

// 读取并删除（一次性使用）
const getSmsCode = async (phone) => {
  const res = await collection('sms_codes').where({ phone }).limit(1).get()
  if (!res.data || !res.data.length) return null
  const record = res.data[0]
  // 校验是否过期
  if (nowMs() > record.expireAt) {
    try { await collection('sms_codes').doc(record._id).remove() } catch (_) {}
    return null
  }
  // 一次性使用：读取后删除
  try { await collection('sms_codes').doc(record._id).remove() } catch (_) {}
  return record.code
}

// 清理过期验证码记录（建议由定时触发器调用）
const clearExpiredSmsCodes = async () => {
  try {
    await collection('sms_codes').where({ expireAt: _.lt(nowMs()) }).remove()
  } catch (e) { console.error('clearExpiredSmsCodes 失败:', e) }
}

// ============ 版本号（settings 集合存储） ============
// 从 settings 集合读 key='version' 的值
const getVersion = async () => {
  const res = await collection('settings').doc('version').get().catch(() => ({ data: null }))
  if (res && res.data && res.data.value !== undefined) {
    return parseInt(res.data.value, 10) || 1
  }
  return 1
}

// 自增版本号
const bumpVersion = async () => {
  const current = await getVersion()
  // 云数据库无 upsert，需先尝试更新，失败再插入
  try {
    await collection('settings').doc('version').update({ data: { value: String(current + 1) } })
  } catch (_) {
    await collection('settings').add({ data: { _id: 'version', value: String(current + 1) } })
  }
  return current + 1
}

// ============ 通用工具：解析 event.body ============
// HTTP 触发器中 body 为字符串，可能是 base64 编码（isBase64Encoded=true）
const parseBody = (event) => {
  if (!event.body) return {}
  let raw = event.body
  if (event.isBase64Encoded) {
    raw = Buffer.from(raw, 'base64').toString('utf-8')
  }
  try { return JSON.parse(raw) } catch (_) { return {} }
}

// 提取路径参数（如 /api/works/:id 中的 id）
// pathPattern 形如 '/api/works/:id'，eventPath 形如 '/api/works/abc'
const extractPathParams = (pathPattern, eventPath) => {
  const patternParts = pathPattern.split('/').filter(Boolean)
  const pathParts = (eventPath || '').split('/').filter(Boolean)
  const params = {}
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i] || '')
    }
  }
  return params
}

// 路由匹配：判断 eventPath 是否匹配 pattern（pattern 中 :xxx 为参数占位）
const matchRoute = (pattern, eventPath) => {
  const patternParts = pattern.split('/').filter(Boolean)
  const pathParts = (eventPath || '').split('/').filter(Boolean)
  if (patternParts.length !== pathParts.length) return null
  const params = {}
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i] || '')
    } else if (patternParts[i] !== pathParts[i]) {
      return null
    }
  }
  return params
}

// ============ VIP 状态检查与过期清理 ============
// 与原 /api/user/info 一致：VIP 已过期则更新状态
const refreshVipStatus = async (phone) => {
  const res = await collection('users').where({ phone }).limit(1).get()
  if (!res.data || !res.data.length) return null
  const user = res.data[0]
  if (user.vip_status === 1 && user.vip_expire_at && nowMs() > parseInt(user.vip_expire_at, 10)) {
    await collection('users').where({ phone }).update({ data: { vip_status: 0, updatedAt: now() } })
    user.vip_status = 0
  }
  return user
}

// 判断用户当前是否有效 VIP
const isUserVip = async (phone) => {
  if (!phone) return false
  const user = await refreshVipStatus(phone)
  return !!(user && user.vip_status === 1 && user.vip_expire_at && nowMs() < parseInt(user.vip_expire_at, 10))
}

// ============ 事件标准化：兼容 HTTP 触发与 wx.cloud.callFunction ============
// HTTP 触发器 event 格式：{ httpMethod, path, queryStringParameters, headers, body(string), isBase64Encoded }
// callFunction event 格式：{ path, httpMethod, query, headers, body(object) }
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

// ============ 统一路由入口：兼容 HTTP 触发与 callFunction ============
const createRouter = (routes, fnName = 'unknown') => {
  return async (event, context) => {
    const normalizedEvent = normalizeEvent(event)

    if (normalizedEvent.httpMethod === 'OPTIONS' && normalizedEvent._source === 'http') {
      return httpOptions()
    }

    const { httpMethod, path: eventPath, queryStringParameters } = normalizedEvent

    for (const [method, pattern, handler] of routes) {
      if (method !== httpMethod) continue
      const params = matchRoute(pattern, eventPath)
      if (params === null) continue
      try {
        const ctx = {
          method: httpMethod, path: eventPath,
          query: queryStringParameters || {}, body: parseBody(normalizedEvent),
          params, headers: normalizedEvent.headers || {},
          event: normalizedEvent, context,
        }
        const result = await handler(ctx)
        if (normalizedEvent._source === 'callFunction') {
          return result && result.statusCode ? JSON.parse(result.body) : result
        }
        return result && result.statusCode ? result : httpOK(result)
      } catch (e) {
        console.error(`[fn:${fnName}] ${httpMethod} ${eventPath} error:`, e)
        const msg = (e && e.message) ? e.message : '服务器内部错误'
        if (normalizedEvent._source === 'callFunction') {
          return { success: false, error: msg }
        }
        return httpFail(msg, 500)
      }
    }

    if (normalizedEvent._source === 'callFunction') {
      return { success: false, error: '接口不存在' }
    }
    return httpFail('接口不存在', 404)
  }
}

// ============ 导出 ============
module.exports = {
  cloud,
  db,
  _,
  collection,
  now,
  nowMs,
  uuid,
  envId,
  ADMIN_PHONE,
  DEV_CODE,
  JWT_SECRET,
  IS_DEV,
  // 鉴权
  signToken,
  verifyToken,
  getUser,
  requireAuth,
  requireAdmin,
  isAdmin,
  isRequestFromAdmin,
  // 响应
  ok,
  okMsg,
  fail,
  httpOK,
  httpFail,
  httpOptions,
  // 分页
  parsePagination,
  paginateResponse,
  // 上传
  uploadToCloud,
  getCloudUrl,
  getCloudUrls,
  deleteCloudFile,
  resolveCloudFields,
  resolveCloudUrlsDeep,
  normalizeToHttpsUrl,
  normalizeUploadPaths,
  normalizeUploadPathsDeep,
  PRODUCTION_ASSETS_BASE,
  // 短信验证码
  setSmsCode,
  getSmsCode,
  clearExpiredSmsCodes,
  // 版本号
  getVersion,
  bumpVersion,
  // VIP
  refreshVipStatus,
  isUserVip,
  // 工具
  parseBody,
  matchRoute,
  extractPathParams,
  // 路由入口
  normalizeEvent,
  createRouter,
}
