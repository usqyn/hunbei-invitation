// ============ 订单 API 集成测试 ============
// 覆盖：POST 创建订单 / GET 订单列表 / VIP 订单创建与服务端定价校验。
// 重点：服务端依据模板真实价格计算订单金额，忽略客户端传入的价格。

import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const request = require('supertest')
const { app, ensureDb, makeToken, makeAdminToken } = require('./setup')

beforeAll(async () => {
  await ensureDb()
})

// 测试专用用户
const userToken = () => 'Bearer ' + makeToken({ phone: '13600000001' })

// 辅助：以管理员身份创建一个已发布模板（带价格/付费标记）
async function createTemplate(overrides = {}) {
  const res = await request(app)
    .post('/api/templates')
    .set('Authorization', 'Bearer ' + makeAdminToken())
    .send({
      name: '订单测试模板-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      category: 'wedding',
      status: 'published',
      ...overrides,
    })
  return res.body.data
}

describe('POST /api/orders (create order)', () => {
  it('rejects without token (401)', async () => {
    const res = await request(app).post('/api/orders').send({ items: [{ templateId: 'x' }] })
    expect(res.status).toBe(401)
  })

  it('rejects empty items (400)', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', userToken())
      .send({ items: [] })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('creates an order and returns it', async () => {
    const tpl = await createTemplate({ is_paid: 1, price: 20 })
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', userToken())
      .send({
        items: [{ templateId: tpl.id }],
        contactName: '张三',
        contactPhone: '13600000001',
        address: '测试地址',
      })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.id).toBeDefined()
    expect(res.body.data.totalAmount).toBe('20')
    expect(res.body.data.status).toBe('pending')
    expect(res.body.data.contactName).toBe('张三')
    // 注意：POST 创建订单返回时 items 未被 rowToObject 解析，仍为 JSON 字符串；
    // 而 GET /api/orders 列表接口会显式 JSON.parse。此处验证两种形态的一致性。
    const items = typeof res.body.data.items === 'string'
      ? JSON.parse(res.body.data.items)
      : res.body.data.items
    expect(Array.isArray(items)).toBe(true)
    expect(items[0].templateId).toBe(tpl.id)
  })
})

describe('GET /api/orders (list orders)', () => {
  it('rejects without token (401)', async () => {
    const res = await request(app).get('/api/orders')
    expect(res.status).toBe(401)
  })

  it('returns the current user orders only', async () => {
    const tpl = await createTemplate({ is_paid: 0, price: 0 })
    const create = await request(app)
      .post('/api/orders')
      .set('Authorization', userToken())
      .send({ items: [{ templateId: tpl.id }] })
    const orderId = create.body.data.id

    const res = await request(app).get('/api/orders').set('Authorization', userToken())
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.find(o => o.id === orderId)).toBeTruthy()
  })
})

describe('Order pricing validation (server-side)', () => {
  it('computes total from paid template price and ignores client price', async () => {
    const tpl = await createTemplate({ is_paid: 1, price: 20 })
    // 故意传入错误的客户端价格，服务端应忽略并按模板真实价格计算
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', userToken())
      .send({ items: [{ templateId: tpl.id, price: 999 }] })
    expect(res.status).toBe(200)
    expect(res.body.data.totalAmount).toBe('20')
  })

  it('free template (is_paid=0) results in zero total', async () => {
    const tpl = await createTemplate({ is_paid: 0, price: 0 })
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', userToken())
      .send({ items: [{ templateId: tpl.id }] })
    expect(res.status).toBe(200)
    expect(res.body.data.totalAmount).toBe('0')
  })

  it('rejects order referencing a non-existent template', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', userToken())
      .send({ items: [{ templateId: 'no-such-template' }] })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })
})

describe('VIP order creation and pricing', () => {
  it('rejects an invalid plan (400)', async () => {
    const res = await request(app)
      .post('/api/vip/order')
      .set('Authorization', userToken())
      .send({ plan: 'invalid-plan' })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('creates a VIP order with server-side pricing and activates VIP', async () => {
    const phone = '1360000VIP1'
    const token = 'Bearer ' + makeToken({ phone })
    // 先登录创建用户（vip/order 的 UPDATE 需要用户已存在才能使 vip/status 生效）
    await request(app).post('/api/user/login').send({ phone, code: '000000' })

    const res = await request(app)
      .post('/api/vip/order')
      .set('Authorization', token)
      .send({ plan: 'monthly' })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.orderId).toBeDefined()
    expect(res.body.data.prepayId).toBeDefined()
    expect(res.body.data.expireAt).toBeDefined()
    // monthly -> 30 天，expireAt 应为未来时间
    expect(Number(res.body.data.expireAt)).toBeGreaterThan(Date.now())

    // VIP 状态应已生效
    const status = await request(app).get('/api/vip/status').set('Authorization', token)
    expect(status.status).toBe(200)
    expect(status.body.data.isVip).toBe(true)
    expect(status.body.data.plan).toBe('monthly')
  })

  it('applies server-side pricing for all valid plans', async () => {
    // 服务端定价表：monthly=9.9, quarterly=19.9, yearly=58.0
    // 每种套餐都应创建成功并返回 orderId
    const plans = ['monthly', 'quarterly', 'yearly']
    for (const plan of plans) {
      const phone = '1360000VIP2-' + plan
      const token = 'Bearer ' + makeToken({ phone })
      await request(app).post('/api/user/login').send({ phone, code: '000000' })

      const res = await request(app)
        .post('/api/vip/order')
        .set('Authorization', token)
        .send({ plan })
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.orderId).toBeDefined()

      // 该订单应出现在用户订单列表中（items.type === 'vip'）
      const list = await request(app).get('/api/orders').set('Authorization', token)
      const vipOrder = list.body.data.find(o =>
        Array.isArray(o.items) && o.items.some(i => i.type === 'vip' && i.plan === plan)
      )
      expect(vipOrder).toBeTruthy()
      // 校验服务端定价
      const expected = { monthly: 9.9, quarterly: 19.9, yearly: 58 }[plan]
      expect(Number(vipOrder.totalAmount)).toBe(expected)
      expect(vipOrder.status).toBe('paid')
    }
  })
})
