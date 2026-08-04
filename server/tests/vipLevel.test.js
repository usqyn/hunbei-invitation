// ============ vipLevel 字段存取集成测试 ============
// 验证断点1修复:templates 表能正确存储和返回 vipLevel 字段,
// 不再被 SQLite 缺列或 PUT allowedFields 漏字段导致丢失。

import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const request = require('supertest')
const { app, ensureDb, makeAdminToken } = require('./setup')

beforeAll(async () => {
  await ensureDb()
})

describe('vipLevel field persistence', () => {
  it('POST /api/templates 应保存 vipLevel 字段', async () => {
    const res = await request(app)
      .post('/api/templates')
      .set('Authorization', 'Bearer ' + makeAdminToken())
      .send({
        name: 'vipLevel-test-create-' + Date.now(),
        category: 'wedding',
        status: 'published',
        vipLevel: 'pro',
      })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.vipLevel).toBe('pro')
  })

  it('GET /api/templates/:id 应返回已保存的 vipLevel', async () => {
    const created = await request(app)
      .post('/api/templates')
      .set('Authorization', 'Bearer ' + makeAdminToken())
      .send({
        name: 'vipLevel-test-get-' + Date.now(),
        category: 'wedding',
        status: 'published',
        vipLevel: 'personal',
      })
    const id = created.body.data.id

    const res = await request(app).get(`/api/templates/${id}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.vipLevel).toBe('personal')
  })

  it('PUT /api/templates/:id 应能更新 vipLevel 字段', async () => {
    const created = await request(app)
      .post('/api/templates')
      .set('Authorization', 'Bearer ' + makeAdminToken())
      .send({
        name: 'vipLevel-test-put-' + Date.now(),
        category: 'wedding',
        status: 'published',
        vipLevel: 'free',
      })
    const id = created.body.data.id

    const updated = await request(app)
      .put(`/api/templates/${id}`)
      .set('Authorization', 'Bearer ' + makeAdminToken())
      .send({ vipLevel: 'pro' })
    expect(updated.status).toBe(200)
    expect(updated.body.success).toBe(true)
    expect(updated.body.data.vipLevel).toBe('pro')
  })

  it('未指定 vipLevel 时应默认为 free', async () => {
    const res = await request(app)
      .post('/api/templates')
      .set('Authorization', 'Bearer ' + makeAdminToken())
      .send({
        name: 'vipLevel-test-default-' + Date.now(),
        category: 'wedding',
        status: 'published',
      })
    expect(res.status).toBe(200)
    expect(res.body.data.vipLevel).toBe('free')
  })
})
