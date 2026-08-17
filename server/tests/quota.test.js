// ============ 限数版配额 / 分享奖励 / 单次解锁 API 集成测试 ============
// 覆盖：GET /api/quota 查询 / POST /api/quota/consume 扣减 / POST /api/share/reward 奖励 /
//      unlock 订单支付后发放永久解锁。

import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const request = require('supertest')
const { app, ensureDb, makeToken, makeAdminToken } = require('./setup')

beforeAll(async () => {
  await ensureDb()
})

const phone = '1360000QOTA1'
const userToken = () => 'Bearer ' + makeToken({ phone })

async function createTemplate(overrides = {}) {
  const res = await request(app)
    .post('/api/templates')
    .set('Authorization', 'Bearer ' + makeAdminToken())
    .send({
      name: '配额测试模板-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      category: 'wedding',
      status: 'published',
      ...overrides,
    })
  return res.body.data
}

describe('GET /api/quota (限数配额查询)', () => {
  it('rejects without token (401)', async () => {
    const res = await request(app).get('/api/quota').query({ templateId: 'x' })
    expect(res.status).toBe(401)
  })

  it('rejects missing templateId (400)', async () => {
    const res = await request(app).get('/api/quota').set('Authorization', userToken())
    expect(res.status).toBe(400)
  })

  it('免费模板返回 limitless', async () => {
    const tpl = await createTemplate({})
    const res = await request(app).get('/api/quota').set('Authorization', userToken()).query({ templateId: tpl.id })
    expect(res.status).toBe(200)
    expect(res.body.data.limitless).toBe(true)
  })

  it('限数版模板返回剩余 1 次', async () => {
    const tpl = await createTemplate({ vipLevel: 'limited', is_paid: 1 })
    const res = await request(app).get('/api/quota').set('Authorization', userToken()).query({ templateId: tpl.id })
    expect(res.status).toBe(200)
    expect(res.body.data.limitless).toBe(false)
    expect(res.body.data.remaining).toBe(1)
  })

  it('不存在的模板返回 404', async () => {
    const res = await request(app).get('/api/quota').set('Authorization', userToken()).query({ templateId: 'no-such-template' })
    expect(res.status).toBe(404)
  })
})

describe('POST /api/quota/consume (扣减)', () => {
  it('免费模板扣减不生效（返回 limitless）', async () => {
    const tpl = await createTemplate({})
    const res = await request(app)
      .post('/api/quota/consume')
      .set('Authorization', userToken())
      .send({ templateId: tpl.id })
    expect(res.status).toBe(200)
    expect(res.body.data.limitless).toBe(true)
  })

  it('限数版扣减 1 次后剩余 0，再扣返回 403 QUOTA_EXHAUSTED', async () => {
    const tpl = await createTemplate({ vipLevel: 'limited', is_paid: 1 })
    const first = await request(app)
      .post('/api/quota/consume')
      .set('Authorization', userToken())
      .send({ templateId: tpl.id })
    expect(first.status).toBe(200)
    expect(first.body.data.remaining).toBe(0)

    const second = await request(app)
      .post('/api/quota/consume')
      .set('Authorization', userToken())
      .send({ templateId: tpl.id })
    expect(second.status).toBe(403)
    expect(second.body.error).toBe('QUOTA_EXHAUSTED')
  })
})

describe('POST /api/share/reward (分享奖励)', () => {
  it('限数版剩余 0 时分享得 1 次（给分享者 phone 发放）', async () => {
    const tpl = await createTemplate({ vipLevel: 'limited', is_paid: 1 })
    // 先扣完
    await request(app).post('/api/quota/consume').set('Authorization', userToken()).send({ templateId: tpl.id })
    // 模拟好友打开分享落地页触发奖励（公开接口，无需登录）
    const res = await request(app).post('/api/share/reward').send({ templateId: tpl.id, phone })
    expect(res.status).toBe(200)
    expect(res.body.data.rewarded).toBe(true)
    expect(res.body.data.remaining).toBe(1)
  })

  it('同人同模板每日仅奖励 1 次（第二次 429）', async () => {
    const tpl = await createTemplate({ vipLevel: 'limited', is_paid: 1 })
    await request(app).post('/api/share/reward').send({ templateId: tpl.id, phone })
    const res = await request(app).post('/api/share/reward').send({ templateId: tpl.id, phone })
    expect(res.status).toBe(429)
  })

  it('免费模板不发放奖励（unlimited）', async () => {
    const tpl = await createTemplate({})
    const res = await request(app).post('/api/share/reward').send({ templateId: tpl.id, phone: '1360000QOTA2' })
    expect(res.status).toBe(200)
    expect(res.body.data.rewarded).toBe(false)
    expect(res.body.data.reason).toBe('unlimited')
  })
})

describe('单次解锁（unlock 订单）', () => {
  it('支付 unlock 订单后模板永久解锁（quota 变为 limitless）', async () => {
    const tpl = await createTemplate({ vipLevel: 'limited', is_paid: 1, price: 9.9 })
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', userToken())
      .send({ items: [{ type: 'unlock', templateId: tpl.id }] })
    expect(orderRes.status).toBe(200)
    const orderId = orderRes.body.data.id

    const payRes = await request(app)
      .post(`/api/orders/${orderId}/pay`)
      .set('Authorization', userToken())
    expect(payRes.status).toBe(200)

    const quota = await request(app).get('/api/quota').set('Authorization', userToken()).query({ templateId: tpl.id })
    expect(quota.status).toBe(200)
    expect(quota.body.data.limitless).toBe(true)
  })
})