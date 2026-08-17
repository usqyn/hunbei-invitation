// ============ 模板删除链路集成测试 ============
// 覆盖：safe-delete（软删除）/ hard-delete（彻底删除）/ resync 防复活 / 列表过滤
//
// 关键说明：测试环境未配置 CLOUDBASE_APIKEY，真实 cloudSync 的云端删除会返回 false，
// 导致 safe-delete 走 500 分支而无法测试成功路径。因此本文件在 require('../index')
// 之前用 require.cache 劫持 cloudSync 模块为可控 mock，从而能覆盖删除的成功路径。

import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

// ===== 环境变量（必须在 require('../index') 之前设置，否则 index.js 会 process.exit(1)）=====
process.env.JWT_SECRET = 'TOYtamaxia-test-secret'
process.env.NODE_ENV = 'test'
process.env.ADMIN_PHONE = process.env.ADMIN_PHONE || '13800138000'
process.env.DEV_CODE = process.env.DEV_CODE || '000000'

const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'TOYtamaxia-del-test-'))
process.env.DB_PATH = path.join(tmpDir, 'test-data.db')
process.env.POSTER_DB_PATH = path.join(tmpDir, 'test-poster.db')

// ===== 劫持 cloudSync：云端操作在测试中可控（必须发生在任何 require('../index') 之前）=====
const cloudSyncPath = require.resolve('../cloudSync')
const cloudSyncMock = {
  deleteTemplateFromCloud: vi.fn(async () => true),
  syncTemplateToCloud: vi.fn(async () => true),
  isEnabled: vi.fn(() => true),
  fetchCloudTemplates: vi.fn(async () => ({ success: true, data: [], error: null })),
  checkCloudTemplateExists: vi.fn(async () => ({ exists: true })),
}
require.cache[cloudSyncPath] = {
  id: cloudSyncPath,
  filename: cloudSyncPath,
  loaded: true,
  exports: cloudSyncMock,
}

const request = require('supertest')
// setup.js 内部 require('../index') 会命中上面的 cloudSync mock
const { app, ensureDb, makeAdminToken } = require('./setup')

beforeAll(async () => {
  await ensureDb()
})

// 每个用例前恢复 mock 默认行为
beforeEach(() => {
  cloudSyncMock.deleteTemplateFromCloud.mockResolvedValue(true)
  cloudSyncMock.syncTemplateToCloud.mockResolvedValue(true)
})

const auth = () => ({ Authorization: 'Bearer ' + makeAdminToken() })

// 辅助：以管理员身份创建一个模板，返回模板 id
async function createTemplate(overrides = {}) {
  const res = await request(app)
    .post('/api/templates')
    .set(auth())
    .send({
      name: '删除测试-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      category: 'wedding',
      status: 'published',
      ...overrides,
    })
  expect(res.status).toBe(200)
  expect(res.body.success).toBe(true)
  return res.body.data.id
}

// 辅助：安全删除（软删除）
async function safeDelete(id) {
  const res = await request(app)
    .delete(`/api/templates/${id}/safe-delete`)
    .set(auth())
  expect(res.status).toBe(200)
  expect(res.body.success).toBe(true)
  return res
}

describe('safe-delete 软删除', () => {
  it('未携带管理员 token 时返回 403', async () => {
    const id = await createTemplate()
    const res = await request(app).delete(`/api/templates/${id}/safe-delete`)
    expect(res.status).toBe(403)
  })

  it('模板不存在时返回 404', async () => {
    const res = await request(app)
      .delete('/api/templates/no-such-id/safe-delete')
      .set(auth())
    expect(res.status).toBe(404)
  })

  it('安全删除成功：200 + cloudDeleted/localDeleted=true，本地记录保留（软删除）', async () => {
    const id = await createTemplate()
    const res = await safeDelete(id)
    expect(res.body.cloudDeleted).toBe(true)
    expect(res.body.localDeleted).toBe(true)

    // 记录仍存在（软删除），管理员可访问以用于恢复
    const get = await request(app).get(`/api/templates/${id}`).set(auth())
    expect(get.status).toBe(200)
    expect(get.body.data.status).toBe('deleted')
    expect(get.body.data.name).toBeDefined()

    // 普通用户不可见
    const pubGet = await request(app).get(`/api/templates/${id}`)
    expect(pubGet.status).toBe(404)
  })
})

describe('列表过滤已删除模板（本次修复的核心）', () => {
  it('admin ?all=1 列表不返回已软删除模板', async () => {
    const id = await createTemplate()
    await safeDelete(id)

    const list = await request(app)
      .get('/api/templates?all=1')
      .set(auth())
    expect(list.status).toBe(200)
    expect(list.body.success).toBe(true)
    expect(list.body.data.find(t => t.id === id)).toBeUndefined()
  })

  it('普通用户列表不返回已软删除模板', async () => {
    const id = await createTemplate()
    await safeDelete(id)

    const list = await request(app).get('/api/templates')
    expect(list.status).toBe(200)
    expect(list.body.data.find(t => t.id === id)).toBeUndefined()
  })

  it('draft 模板在 admin all=1 列表中仍可见（仅过滤 deleted）', async () => {
    const id = await createTemplate({ status: 'draft' })
    const list = await request(app)
      .get('/api/templates?all=1')
      .set(auth())
    expect(list.body.data.find(t => t.id === id)).toBeDefined()
  })
})

describe('hard-delete 彻底删除', () => {
  it('未携带管理员 token 时返回 403', async () => {
    const id = await createTemplate()
    const res = await request(app).delete(`/api/templates/${id}/hard-delete`)
    expect(res.status).toBe(403)
  })

  it('模板不存在时返回 404', async () => {
    const res = await request(app)
      .delete('/api/templates/no-such-id/hard-delete')
      .set(auth())
    expect(res.status).toBe(404)
  })

  it('彻底删除成功：本地行物理删除，管理员也无法再访问', async () => {
    const id = await createTemplate()
    const res = await request(app)
      .delete(`/api/templates/${id}/hard-delete`)
      .set(auth())
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.cloudDeleted).toBe(true)
    expect(res.body.localDeleted).toBe(true)

    // 管理员 GET 也 404（行已物理删除）
    const get = await request(app).get(`/api/templates/${id}`).set(auth())
    expect(get.status).toBe(404)
    // safe-delete 也 404
    const del = await request(app)
      .delete(`/api/templates/${id}/safe-delete`)
      .set(auth())
    expect(del.status).toBe(404)
  })

  it('云端删除失败时仍删除本地（cloudDeleted=false, localDeleted=true）', async () => {
    const id = await createTemplate()
    cloudSyncMock.deleteTemplateFromCloud.mockResolvedValueOnce(false)
    const res = await request(app)
      .delete(`/api/templates/${id}/hard-delete`)
      .set(auth())
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.cloudDeleted).toBe(false)
    expect(res.body.localDeleted).toBe(true)

    const get = await request(app).get(`/api/templates/${id}`).set(auth())
    expect(get.status).toBe(404)
  })

  it('彻底删除后不在任何列表出现', async () => {
    const id = await createTemplate()
    await request(app)
      .delete(`/api/templates/${id}/hard-delete`)
      .set(auth())
    const list = await request(app)
      .get('/api/templates?all=1')
      .set(auth())
    expect(list.body.data.find(t => t.id === id)).toBeUndefined()
  })
})

describe('resync 防复活（本次修复的核心）', () => {
  it('正常模板 resync 成功', async () => {
    const id = await createTemplate()
    const res = await request(app)
      .post(`/api/cloud-sync/resync/${id}`)
      .set(auth())
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('已软删除模板 resync 返回 404，且不会调用云端同步', async () => {
    const id = await createTemplate()
    await safeDelete(id)
    cloudSyncMock.syncTemplateToCloud.mockClear()
    const res = await request(app)
      .post(`/api/cloud-sync/resync/${id}`)
      .set(auth())
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
    expect(res.body.error).toBe('模板不存在或已被删除')
    expect(cloudSyncMock.syncTemplateToCloud).not.toHaveBeenCalled()
  })

  it('resync-all 的 total 不包含已软删除模板', async () => {
    // 创建两个 cloud_synced=0 的模板
    cloudSyncMock.syncTemplateToCloud.mockResolvedValue(false)
    const deletedId = await createTemplate()
    const keptId = await createTemplate()
    cloudSyncMock.syncTemplateToCloud.mockResolvedValue(true)
    // 软删除其中一个
    await safeDelete(deletedId)

    const res = await request(app)
      .post('/api/cloud-sync/resync-all')
      .set(auth())
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    // total 只统计未删除的未同步模板（deleted 被跳过）
    expect(res.body.total).toBe(1)
  })
})
