// ============ 鉴权与限流集成测试 ============
// 覆盖：受保护端点在无 token 时返回 401、JWT 正常生效、登录接口限流。

import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const request = require('supertest')
const { app, ensureDb, makeToken } = require('./setup')

beforeAll(async () => {
  await ensureDb()
})

describe('Protected endpoints return 401 without token', () => {
  it('GET /api/works -> 401', async () => {
    const res = await request(app).get('/api/works')
    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('GET /api/orders -> 401', async () => {
    const res = await request(app).get('/api/orders')
    expect(res.status).toBe(401)
  })

  it('GET /api/vip/status -> 401', async () => {
    const res = await request(app).get('/api/vip/status')
    expect(res.status).toBe(401)
  })

  it('POST /api/favorites -> 401', async () => {
    const res = await request(app).post('/api/favorites').send({ workId: 'x' })
    expect(res.status).toBe(401)
  })

  it('POST /api/orders -> 401', async () => {
    const res = await request(app).post('/api/orders').send({ items: [{ templateId: 'x' }] })
    expect(res.status).toBe(401)
  })
})

describe('JWT token works correctly', () => {
  it('GET /api/works with valid token returns 200', async () => {
    const res = await request(app)
      .get('/api/works')
      .set('Authorization', 'Bearer ' + makeToken({ phone: '13900000001' }))
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('GET /api/vip/status with valid token returns 200', async () => {
    const res = await request(app)
      .get('/api/vip/status')
      .set('Authorization', 'Bearer ' + makeToken({ phone: '13900000002' }))
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toBeDefined()
  })

  it('rejects an invalid token (treated as unauthenticated -> 401)', async () => {
    // jwt.verify 抛错被中间件吞掉 -> req.user 未设置 -> requireAuth 返回 401
    const res = await request(app)
      .get('/api/works')
      .set('Authorization', 'Bearer this-is-not-a-valid-jwt')
    expect(res.status).toBe(401)
  })

  it('admin token grants access to admin-only endpoint (POST /api/templates)', async () => {
    // role=admin 的 token 通过 requireAdmin
    const res = await request(app)
      .post('/api/templates')
      .set('Authorization', 'Bearer ' + makeToken({ phone: '13800138000', role: 'admin' }))
      .send({ name: '鉴权测试-' + Date.now(), category: 'wedding', status: 'published' })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})

describe('Rate limiting on /api/user/login', () => {
  it('returns 429 after exceeding the per-IP limit', async () => {
    const phone = '13700000000'
    const statuses = []
    // 默认限流：10 次/分钟（rateLimit() 默认 max=10）
    for (let i = 0; i < 11; i++) {
      const res = await request(app)
        .post('/api/user/login')
        .send({ phone, code: '000000' })
      statuses.push(res.status)
    }
    // 前 10 次应成功登录（200），第 11 次应被限流（429）
    const okCount = statuses.slice(0, 10).filter(s => s === 200).length
    expect(okCount).toBe(10)
    expect(statuses[10]).toBe(429)
  })
})
