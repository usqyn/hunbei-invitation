// ============ 模板 API 集成测试 ============
// 覆盖：GET 列表 / GET 单个 / POST 创建(鉴权) / PUT 更新(鉴权)
// 重点验证 templateType、pages 字段的存取，以及 /api/templates/similar
// 路由不与 /:id 路由冲突。

import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const request = require('supertest')
const { app, ensureDb, makeAdminToken } = require('./setup')

beforeAll(async () => {
  await ensureDb()
})

// 辅助：以管理员身份创建一个模板
async function createTemplate(overrides = {}) {
  const res = await request(app)
    .post('/api/templates')
    .set('Authorization', 'Bearer ' + makeAdminToken())
    .send({
      name: '测试模板-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      category: 'wedding',
      status: 'published',
      ...overrides,
    })
  return res
}

describe('GET /api/templates (list)', () => {
  it('returns a list of published templates', async () => {
    const res = await request(app).get('/api/templates')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.total).toBe(res.body.data.length)
  })

  it('supports pagination params', async () => {
    const res = await request(app).get('/api/templates?page=1&limit=5')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.pagination).toBeDefined()
    expect(res.body.pagination.page).toBe(1)
    expect(res.body.pagination.limit).toBe(5)
  })

  it('filters by category', async () => {
    const res = await request(app).get('/api/templates?category=wedding')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    // 返回的模板全部属于 wedding 分类
    res.body.data.forEach(t => expect(t.category).toBe('wedding'))
  })
})

describe('POST /api/templates (create, requires auth)', () => {
  it('rejects creation without admin token (403)', async () => {
    const res = await request(app)
      .post('/api/templates')
      .send({ name: '无权创建', category: 'wedding' })
    expect(res.status).toBe(403)
    expect(res.body.success).toBe(false)
  })

  it('rejects creation with missing required fields', async () => {
    const res = await request(app)
      .post('/api/templates')
      .set('Authorization', 'Bearer ' + makeAdminToken())
      .send({ name: '缺分类' }) // 缺少 category
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('creates a template with admin token', async () => {
    const res = await createTemplate({
      cover: 'http://example.com/cover.png',
      templateType: 'paged',
      pages: [{ id: 'p1' }, { id: 'p2' }],
    })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toBeDefined()
    expect(res.body.data.id).toBeDefined()
    expect(res.body.data.templateType).toBe('paged')
    expect(res.body.data.pages).toEqual([{ id: 'p1' }, { id: 'p2' }])
    expect(res.body.data.cover).toBe('http://example.com/cover.png')
  })
})

describe('templateType & pages fields (stored and returned)', () => {
  let templateId

  beforeAll(async () => {
    const res = await createTemplate({
      templateType: 'paged',
      pages: [{ id: 'p1', name: '封面' }, { id: 'p2', name: '内页' }],
    })
    templateId = res.body.data.id
  })

  it('GET /api/templates/:id returns stored templateType and pages', async () => {
    const res = await request(app).get('/api/templates/' + templateId)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.templateType).toBe('paged')
    expect(res.body.data.pages).toEqual([{ id: 'p1', name: '封面' }, { id: 'p2', name: '内页' }])
  })

  it('PUT /api/templates/:id updates templateType and pages', async () => {
    const res = await request(app)
      .put('/api/templates/' + templateId)
      .set('Authorization', 'Bearer ' + makeAdminToken())
      .send({ templateType: 'canvas', pages: [{ id: 'only' }] })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.templateType).toBe('canvas')
    expect(res.body.data.pages).toEqual([{ id: 'only' }])

    // 验证已持久化
    const get = await request(app).get('/api/templates/' + templateId)
    expect(get.body.data.templateType).toBe('canvas')
    expect(get.body.data.pages).toEqual([{ id: 'only' }])
  })
})

describe('GET /api/templates/:id (single)', () => {
  it('returns 404 for non-existent template', async () => {
    const res = await request(app).get('/api/templates/non-existent-id-xyz')
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
  })

  it('returns a single template by id', async () => {
    const create = await createTemplate({ status: 'published' })
    const res = await request(app).get('/api/templates/' + create.body.data.id)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.id).toBe(create.body.data.id)
  })
})

describe('GET /api/templates/similar (route order — no conflict with /:id)', () => {
  it('does NOT treat "similar" as an :id (returns 200, not 404)', async () => {
    // 若 'similar' 被当作 :id 命中 GET /:id，则会返回 404 模板不存在
    const res = await request(app).get('/api/templates/similar')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('returns similar templates (same category, excludes source)', async () => {
    // 源模板
    const source = await createTemplate({ category: 'baby', status: 'published' })
    // 同分类目标模板
    await createTemplate({ category: 'baby', status: 'published' })

    const res = await request(app).get('/api/templates/similar?templateId=' + source.body.data.id)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    // 相似列表不应包含源模板自身
    expect(res.body.data.find(t => t.id === source.body.data.id)).toBeUndefined()
    // 返回的均为同分类
    res.body.data.forEach(t => expect(t.category).toBe('baby'))
  })
})

describe('PUT /api/templates/:id (update, requires auth)', () => {
  it('rejects update without admin token (403)', async () => {
    const create = await createTemplate({ status: 'published' })
    const res = await request(app)
      .put('/api/templates/' + create.body.data.id)
      .send({ name: 'hacked' })
    expect(res.status).toBe(403)
  })

  it('updates a template with admin token', async () => {
    const create = await createTemplate({ status: 'published' })
    const newName = '更新后-' + Date.now()
    const res = await request(app)
      .put('/api/templates/' + create.body.data.id)
      .set('Authorization', 'Bearer ' + makeAdminToken())
      .send({ name: newName, subtitle: '副标题', cover: 'http://example.com/new.png' })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.name).toBe(newName)
    expect(res.body.data.subtitle).toBe('副标题')
    expect(res.body.data.cover).toBe('http://example.com/new.png')
  })

  it('returns 404 when updating a non-existent template', async () => {
    const res = await request(app)
      .put('/api/templates/no-such-id')
      .set('Authorization', 'Bearer ' + makeAdminToken())
      .send({ name: 'x' })
    expect(res.status).toBe(404)
  })
})
