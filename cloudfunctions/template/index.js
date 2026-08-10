// ============ template 云函数 ============
// 模板列表/详情/CRUD/相似推荐/分类，共 9 个路由：
//   GET    /api/categories
//   GET    /api/templates (+ GET /api/templates/similar 必须在 :id 之前)
//   GET    /api/templates/:id
//   POST   /api/templates (admin)
//   PUT    /api/templates/:id (admin)
//   DELETE /api/templates/:id (admin, 软删 status='deleted')
//   GET    /api/products + GET /api/products/recommend + GET /api/products/:id（templates 别名）
//
// 与原 Express 差异：
// - SQL 的 LIKE 搜索改为云数据库 db.RegExp 正则匹配
// - JSON 字段（data/elements/tags/canvasSize/background/pages）在 NoSQL 中作为对象直接存储，无需 parse

const {
  db, collection, _, now, uuid,
  getUser, requireAdmin, isRequestFromAdmin,
  ok, okMsg, fail, httpOK, httpFail, httpOptions,
  parsePagination, paginateResponse, parseBody, matchRoute,
  getVersion, bumpVersion,
  resolveCloudFields, resolveCloudUrlsDeep, normalizeUploadPaths, normalizeUploadPathsDeep, createRouter,
} = require('./_shared')

// ============ 分类 ============

// GET /api/categories — 含每个分类的模板数（仅统计已发布）
// ?noCounts=1 跳过 aggregate 聚合统计（由客户端自行计算）
const listCategories = async (ctx) => {
  const catsRes = await collection('categories').limit(100).get()
  const cats = (catsRes.data || []).map(c => ({
    id: c.id, name: c.name, icon: c.icon || '', count: 0,
  }))
  // 跳过聚合：客户端会从已加载的模板数据中计算分类数量
  if (ctx.query.noCounts === '1') {
    return ok(cats)
  }
  // 按分类聚合统计已发布模板数（用 aggregate pipeline 的 $group）
  const $ = db.command.aggregate
  let counts = {}
  try {
    const aggRes = await collection('templates')
      .aggregate()
      .match({ status: 'published' })
      .group({ _id: '$category', count: $.sum(1) })
      .end()
    ;(aggRes.list || []).forEach(row => { counts[row._id] = row.count })
  } catch (e) {
    console.warn('aggregate count failed, fallback:', e.message)
  }
  cats.forEach(c => { c.count = counts[c.id] || 0 })
  return ok(cats)
}

// ============ 模板列表 ============

// 列表记录裁剪 + 封面清洗：
// 1. 移除非列表所需的大字段（data/elements/pages/background/canvasSize/tags）
// 2. data:image base64 封面会撑爆云函数 1MB 响应上限（实测单图可达 478KB，
//    limit=20 时极易超限导致 iOS callFunction 失败），必须置空，前端显示兜底图
const listHeavyFields = ['data', 'elements', 'pages', 'background', 'canvasSize', 'tags']

const sanitizeListRecord = (t) => {
  const light = { ...t }
  listHeavyFields.forEach(f => { delete light[f] })
  ;['cover', 'image', 'thumbnail', 'renderedImage'].forEach(f => {
    const v = light[f]
    if (typeof v === 'string' && v.startsWith('data:image')) light[f] = ''
  })
  return light
}

// 批量处理列表记录的封面字段：
// - data:image base64 → 置空
// - cloud:// → 换取 https 临时 URL（一次批量 getTempFileURL）
// - /uploads/ 相对路径 → 生产 HTTPS 域名
const sanitizeListCovers = async (list) => {
  list.forEach(sanitizeListRecord)
  if (list.length) {
    await resolveCloudFields(list, ['cover', 'image', 'thumbnail'])
    normalizeUploadPaths(list, ['cover', 'image', 'thumbnail'])
  }
  return list
}

// 构建模板查询条件（管理员传 all=true 可看全部；普通用户仅看 published）
const buildTemplateQuery = (ctx) => {
  const conditions = {}
  if (!(ctx.query.all === 'true' || ctx.query.all === '1') || !isRequestFromAdmin(ctx.event)) {
    conditions.status = 'published'
  }
  if (ctx.query.is_paid === '1') conditions.is_paid = 1
  else if (ctx.query.is_paid === '0') conditions.is_paid = 0
  if (ctx.query.category) conditions.category = ctx.query.category
  if (ctx.query.search) {
    // 转义正则特殊字符后用 db.RegExp 模糊匹配（云数据库不支持 LIKE）
    const escaped = ctx.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    conditions.name = db.RegExp({ regexp: escaped, options: 'i' })
  }
  return conditions
}

// GET /api/templates — 模板列表（支持分页）
const listTemplates = async (ctx) => {
  const conditions = buildTemplateQuery(ctx)
  const { page, limit, skip, hasPaging } = parsePagination(ctx.query)
  const countRes = await collection('templates').where(conditions).count()
  const total = countRes.total || 0
  let q = collection('templates').where(conditions).orderBy('updatedAt', 'desc')
  if (hasPaging) {
    const res = await q.skip(skip).limit(limit).get()
    const list = await sanitizeListCovers(res.data || [])
    return paginateResponse(list, page, limit, total)
  }
  const res = await q.limit(100).get()
  const list = await sanitizeListCovers(res.data || [])
  return Object.assign(ok(list), { total: list.length })
}

// GET /api/templates/similar — 相似模板（同分类，按 likes 倒序，最多 6 个）
// 注意：必须注册在 /api/templates/:id 之前，否则 'similar' 会被 :id 匹配
const listSimilarTemplates = async (ctx) => {
  const { templateId } = ctx.query
  if (!templateId) return ok([])
  const tmplRes = await collection('templates').where({ id: templateId }).limit(1).get()
  const category = (tmplRes.data && tmplRes.data[0]) ? tmplRes.data[0].category : ''
  const res = await collection('templates')
    .where({ status: 'published', id: _.neq(templateId), category })
    .orderBy('likes', 'desc')
    .limit(6)
    .get()
  const list = await sanitizeListCovers(res.data || [])
  return ok(list)
}

// GET /api/templates/:id — 模板详情（普通用户仅看 published；管理员可看任意状态）
const getTemplate = async (ctx) => {
  const id = ctx.params.id
  const conditions = { id }
  if (!isRequestFromAdmin(ctx.event)) conditions.status = 'published'
  const res = await collection('templates').where(conditions).limit(1).get()
  if (!res.data || !res.data.length) return httpFail('模板不存在', 404)
  const template = res.data[0]
  // 解析顶层 cloud:// URL + 嵌套 JSON 中的 cloud:// URL（data/elements/pages/background）
  await resolveCloudFields(template, ['cover', 'backgroundImage', 'renderedImage', 'thumbnail'])
  normalizeUploadPaths(template, ['cover', 'backgroundImage', 'renderedImage', 'thumbnail'])
  await resolveCloudUrlsDeep(template.data)
  await resolveCloudUrlsDeep(template.elements)
  await resolveCloudUrlsDeep(template.pages)
  // 顶层 background 也需递归解析 cloud://（小程序 CSS url() 不能加载 cloud:// 协议）
  await resolveCloudUrlsDeep(template.background)
  // 兜底：嵌套对象中的 /uploads/ 相对路径转为完整 HTTPS URL
  normalizeUploadPathsDeep(template.background)
  normalizeUploadPathsDeep(template.data)
  normalizeUploadPathsDeep(template.elements)
  normalizeUploadPathsDeep(template.pages)
  // 自动记录足迹
  const user = getUser(ctx.event)
  if (user && user.phone) {
    await collection('footprints').add({ data: {
      phone: user.phone, template_id: id,
      template_name: template.name || '', template_cover: template.cover || '',
      timestamp: Date.now(),
    } }).catch(() => {})
  }
  return ok(template)
}

// ============ 模板 CRUD（管理员） ============

// POST /api/templates — 创建模板
const createTemplate = async (ctx) => {
  const auth = requireAdmin(ctx.event)
  if (!auth.ok) return auth.body
  const body = ctx.body
  if (!body.name || !body.category) return httpFail('缺少必填字段：name、category')
  if (typeof body.name !== 'string' || body.name.length > 100) return httpFail('模板名称不能超过 100 个字符')
  if (body.price !== undefined && body.price !== null && (typeof body.price !== 'number' || body.price < 0)) return httpFail('价格必须为非负数')
  const id = body.id || uuid()
  const existing = await collection('templates').where({ id }).limit(1).get()
  if (existing.data && existing.data.length) return httpFail(`模板 ID ${id} 已存在`)
  const ts = now()
  // NoSQL 直接存储对象，无需 JSON.stringify
  await collection('templates').add({ data: {
    id, name: body.name, subtitle: body.subtitle || '',
    category: body.category, cover: body.cover || '',
    primaryColor: body.primaryColor || '#e84a6e', likes: body.likes || 0,
    pageCount: body.pageCount || 10, data: body.data || {}, elements: body.elements || [],
    canvasSize: body.canvasSize || null, orientation: body.orientation || 'portrait',
    background: body.background || null, tags: body.tags || null,
    status: body.status || 'draft', renderedImage: body.renderedImage || '',
    is_paid: body.is_paid || body.isPaid || 0, price: body.price || 0,
    is_premium: body.is_premium || body.isPremium || 0,
    vipLevel: body.vipLevel || 'free',
    templateType: body.templateType || 'canvas', pages: body.pages || [],
    createdAt: ts, updatedAt: ts,
  } })
  await bumpVersion()
  const res = await collection('templates').where({ id }).limit(1).get()
  return ok(res.data[0])
}

// PUT /api/templates/:id — 更新模板
const updateTemplate = async (ctx) => {
  const auth = requireAdmin(ctx.event)
  if (!auth.ok) return auth.body
  const id = ctx.params.id
  const existing = await collection('templates').where({ id }).limit(1).get()
  if (!existing.data || !existing.data.length) return httpFail('模板不存在', 404)
  const body = ctx.body
  if (body.name !== undefined && (typeof body.name !== 'string' || body.name.length > 100)) return httpFail('模板名称不能超过 100 个字符')
  if (body.price !== undefined && body.price !== null && (typeof body.price !== 'number' || body.price < 0)) return httpFail('价格必须为非负数')
  // 仅允许更新非统计字段（likes/pageCount 不可改）
  const allowed = ['name', 'subtitle', 'category', 'cover', 'primaryColor', 'orientation', 'status', 'renderedImage', 'is_paid', 'price', 'is_premium', 'vipLevel', 'templateType', 'data', 'elements', 'canvasSize', 'background', 'tags', 'pages']
  // 兼容 camelCase 付费字段
  if (body.isPaid !== undefined) body.is_paid = body.isPaid
  if (body.isPremium !== undefined) body.is_premium = body.isPremium
  const fields = {}
  allowed.forEach(f => { if (body[f] !== undefined) fields[f] = body[f] })
  fields.updatedAt = now()
  await collection('templates').where({ id }).update({ data: fields })
  await bumpVersion()
  const res = await collection('templates').where({ id }).limit(1).get()
  return ok(res.data[0])
}

// DELETE /api/templates/:id — 软删除（status='deleted'）
const deleteTemplate = async (ctx) => {
  const auth = requireAdmin(ctx.event)
  if (!auth.ok) return auth.body
  const id = ctx.params.id
  const existing = await collection('templates').where({ id }).limit(1).get()
  if (!existing.data || !existing.data.length) return httpFail('模板不存在', 404)
  await collection('templates').where({ id }).update({ data: { status: 'deleted', updatedAt: now() } })
  await bumpVersion()
  return okMsg('删除成功')
}

// ============ 商品别名路由（与 templates 共享数据源） ============

// GET /api/products — 商品列表（默认按 likes 倒序）
const listProducts = async (ctx) => {
  const conditions = { status: 'published' }
  if (ctx.query.category) conditions.category = ctx.query.category
  const { page, limit, skip, hasPaging } = parsePagination(ctx.query)
  let q = collection('templates').where(conditions).orderBy('likes', 'desc')
  if (hasPaging) {
    const [countRes, res] = await Promise.all([
      collection('templates').where(conditions).count(),
      q.skip(skip).limit(limit).get(),
    ])
    const list = await sanitizeListCovers(res.data || [])
    return paginateResponse(list, page, limit, countRes.total || 0)
  }
  const res = await q.limit(20).get()
  const list = await sanitizeListCovers(res.data || [])
  return Object.assign(ok(list), { total: list.length })
}

// GET /api/products/recommend — 推荐商品（按 likes 倒序，最多 10 个）
const listRecommendProducts = async (ctx) => {
  const conditions = { status: 'published' }
  if (ctx.query.category) conditions.category = ctx.query.category
  const res = await collection('templates').where(conditions).orderBy('likes', 'desc').limit(10).get()
  const list = await sanitizeListCovers(res.data || [])
  return ok(list)
}

// GET /api/products/:id — 商品详情
const getProduct = async (ctx) => {
  const res = await collection('templates').where({ id: ctx.params.id, status: _.neq('deleted') }).limit(1).get()
  if (!res.data || !res.data.length) return httpFail('商品不存在', 404)
  const template = res.data[0]
  await resolveCloudFields(template, ['cover', 'backgroundImage', 'renderedImage', 'thumbnail'])
  normalizeUploadPaths(template, ['cover', 'backgroundImage', 'renderedImage', 'thumbnail'])
  return ok(template)
}

// ============ 路由表（顺序敏感：similar/recommend 必须在 :id 前） ============
const routes = [
  ['GET', '/api/categories', listCategories],
  ['GET', '/api/templates/similar', listSimilarTemplates],
  ['GET', '/api/templates', listTemplates],
  ['GET', '/api/templates/:id', getTemplate],
  ['POST', '/api/templates', createTemplate],
  ['PUT', '/api/templates/:id', updateTemplate],
  ['DELETE', '/api/templates/:id', deleteTemplate],
  ['GET', '/api/products/recommend', listRecommendProducts],
  ['GET', '/api/products', listProducts],
  ['GET', '/api/products/:id', getProduct],
]

// ============ 云函数入口 ============
exports.main = createRouter(routes, 'template')
