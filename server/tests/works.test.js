// ============ 作品 API 集成测试 ============
// 覆盖：POST 创建 / GET 列表 / PUT 更新 / DELETE 删除
// 重点验证 template_id、cover 字段存取，以及 IDOR 防护（用户 A 不能访问用户 B 的作品）。

import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const request = require('supertest')
const { app, ensureDb, makeToken } = require('./setup')

beforeAll(async () => {
  await ensureDb()
})

// 两个不同用户的 token
const userA = () => 'Bearer ' + makeToken({ phone: '13800000001' })
const userB = () => 'Bearer ' + makeToken({ phone: '13800000002' })

// 辅助：以指定用户创建作品
async function createWork(auth, body = {}) {
  return request(app)
    .post('/api/works')
    .set('Authorization', auth)
    .send({
      title: '作品-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      ...body,
    })
}

describe('POST /api/works (create, requires auth)', () => {
  it('rejects creation without token (401)', async () => {
    const res = await request(app).post('/api/works').send({ title: 'x' })
    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('creates a work and stores templateId / cover correctly', async () => {
    const res = await createWork(userA(), {
      templateId: 'tpl-abc',
      templateType: 'paged',
      title: '我的作品',
      data: { elements: [{ type: 'text', content: 'hello' }] },
      musicId: 'm1',
      cover: 'http://example.com/cover.png',
    })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.id).toBeDefined()
    // snake_case 列名被映射为 camelCase 返回
    expect(res.body.data.templateId).toBe('tpl-abc')
    expect(res.body.data.templateType).toBe('paged')
    expect(res.body.data.cover).toBe('http://example.com/cover.png')
    expect(res.body.data.musicId).toBe('m1')
    expect(res.body.data.data).toEqual({ elements: [{ type: 'text', content: 'hello' }] })
  })

  it('falls back to body.image for cover when cover is absent', async () => {
    const res = await createWork(userA(), {
      image: 'http://example.com/img.png',
    })
    expect(res.status).toBe(200)
    expect(res.body.data.cover).toBe('http://example.com/img.png')
  })
})

describe('GET /api/works (list)', () => {
  it('rejects without token (401)', async () => {
    const res = await request(app).get('/api/works')
    expect(res.status).toBe(401)
  })

  it('returns only the current user works', async () => {
    const create = await createWork(userA(), { cover: 'http://example.com/a.png' })
    const workId = create.body.data.id

    const res = await request(app).get('/api/works').set('Authorization', userA())
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.find(w => w.id === workId)).toBeTruthy()

    // 用户 B 看不到用户 A 的作品
    const resB = await request(app).get('/api/works').set('Authorization', userB())
    expect(resB.status).toBe(200)
    expect(resB.body.data.find(w => w.id === workId)).toBeUndefined()
  })
})

describe('GET /api/works/:id (single, scoped to user)', () => {
  it('returns the work for its owner', async () => {
    const create = await createWork(userA(), { title: 'single' })
    const res = await request(app).get('/api/works/' + create.body.data.id).set('Authorization', userA())
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.id).toBe(create.body.data.id)
  })

  it('returns 404 for non-existent work', async () => {
    const res = await request(app).get('/api/works/no-such-id').set('Authorization', userA())
    expect(res.status).toBe(404)
  })
})

describe('PUT /api/works/:id (update)', () => {
  it('updates a work belonging to the user', async () => {
    const create = await createWork(userA(), { cover: 'http://example.com/before.png' })
    const id = create.body.data.id
    const res = await request(app)
      .put('/api/works/' + id)
      .set('Authorization', userA())
      .send({
        title: '已更新',
        cover: 'http://example.com/after.png',
        templateId: 'tpl-new',
        templateType: 'canvas',
      })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.title).toBe('已更新')
    expect(res.body.data.cover).toBe('http://example.com/after.png')
    expect(res.body.data.templateId).toBe('tpl-new')
    expect(res.body.data.templateType).toBe('canvas')
  })
})

describe('DELETE /api/works/:id (soft delete)', () => {
  it('moves the work to recycle bin and hides it from works', async () => {
    const create = await createWork(userA(), { title: '待删除' })
    const id = create.body.data.id

    const del = await request(app).delete('/api/works/' + id).set('Authorization', userA())
    expect(del.status).toBe(200)
    expect(del.body.success).toBe(true)

    // 删除后从 works 表查询应返回 404
    const get = await request(app).get('/api/works/' + id).set('Authorization', userA())
    expect(get.status).toBe(404)
  })
})

describe('IDOR protection (user A vs user B)', () => {
  it('user B cannot read/update/delete user A work', async () => {
    const create = await createWork(userA(), { cover: 'http://example.com/private.png' })
    const id = create.body.data.id

    // B 无法读取
    const get = await request(app).get('/api/works/' + id).set('Authorization', userB())
    expect(get.status).toBe(404)

    // B 无法更新
    const put = await request(app)
      .put('/api/works/' + id)
      .set('Authorization', userB())
      .send({ title: 'hacked' })
    expect(put.status).toBe(404)

    // B 无法删除
    const del = await request(app).delete('/api/works/' + id).set('Authorization', userB())
    expect(del.status).toBe(404)

    // A 仍可正常访问（数据未被篡改）
    const getA = await request(app).get('/api/works/' + id).set('Authorization', userA())
    expect(getA.status).toBe(200)
    expect(getA.body.data.cover).toBe('http://example.com/private.png')
  })
})

describe('GET /api/works/share/:id (public access for shared recipients)', () => {
  it('allows public access without token (for shared recipients)', async () => {
    const create = await createWork(userA(), {
      cover: 'http://example.com/share.png',
      data: { elements: [{ type: 'text', text: '婚礼邀请' }] },
    })
    const id = create.body.data.id

    // 无 token 也能访问（被分享者场景）
    const res = await request(app).get('/api/works/share/' + id)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.id).toBe(id)
    expect(res.body.data.cover).toBe('http://example.com/share.png')
    // data 字段被正确反序列化为对象
    expect(res.body.data.data).toBeDefined()
    expect(Array.isArray(res.body.data.data.elements)).toBe(true)
    // 不暴露作者 phone
    expect(res.body.data.phone).toBeUndefined()
  })

  it('returns 404 for non-existent work', async () => {
    const res = await request(app).get('/api/works/share/non-existent-id')
    expect(res.status).toBe(404)
  })
})
