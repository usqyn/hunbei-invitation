const express = require('express')
const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const initSqlJs = require('sql.js')
// 公共鉴权中间件（requireAdmin 已包含 role 校验，isRequestFromAdmin 用于非强制鉴权场景的管理员判断）
const { requireAdmin, isRequestFromAdmin } = require('../middleware/auth')
// 数据库事务辅助函数（多步操作保证原子性）
const { runTransaction } = require('../middleware/db')

// 海报模板配置数据（从数据文件加载，避免在代码中内联大量静态配置）
const POSTER_TEMPLATE_CONFIGS = require('../data/poster-templates.json')

const router = express.Router()

// ============ Poster Database (separate SQLite file) ============
let SQL, posterDb
const POSTER_DB_PATH = path.join(__dirname, '..', 'poster.db')

async function initPosterDatabase() {
  SQL = await initSqlJs()
  if (fs.existsSync(POSTER_DB_PATH)) {
    const buf = fs.readFileSync(POSTER_DB_PATH)
    posterDb = new SQL.Database(buf)
  } else {
    posterDb = new SQL.Database()
  }

  posterDb.run(`CREATE TABLE IF NOT EXISTS poster_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category_id TEXT NOT NULL,
    cover_url TEXT DEFAULT '',
    background_url TEXT DEFAULT '',
    config TEXT DEFAULT '{}',
    is_free INTEGER DEFAULT 1,
    is_vip INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    use_count INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
  )`)

  posterDb.run(`CREATE TABLE IF NOT EXISTS poster_works (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    template_id TEXT DEFAULT '',
    template_name TEXT DEFAULT '',
    cover_url TEXT DEFAULT '',
    content TEXT DEFAULT '{}',
    poster_url TEXT DEFAULT '',
    created_at TEXT NOT NULL
  )`)

  posterDb.run(`CREATE TABLE IF NOT EXISTS recycle_bin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    work_id TEXT NOT NULL,
    work_data TEXT NOT NULL,
    deleted_at TEXT NOT NULL
  )`)

  // 创建索引（提升按 user_id 查询作品、按分类查询模板的性能）
  posterDb.run("CREATE INDEX IF NOT EXISTS idx_poster_works_user_id ON poster_works(user_id)")
  posterDb.run("CREATE INDEX IF NOT EXISTS idx_poster_templates_category ON poster_templates(category_id, is_active)")
  posterDb.run("CREATE INDEX IF NOT EXISTS idx_recycle_bin_user_id ON recycle_bin(user_id)")

  savePosterDatabase()
}

function savePosterDatabase() {
  const data = posterDb.export()
  const tmpPath = POSTER_DB_PATH + '.tmp'
  fs.writeFileSync(tmpPath, Buffer.from(data))
  fs.renameSync(tmpPath, POSTER_DB_PATH)
}

// 防抖保存：延迟 500ms，避免短时间内多次写操作重复保存文件
let _posterSaveTimer = null
function savePosterDatabaseDebounced() {
  if (_posterSaveTimer) clearTimeout(_posterSaveTimer)
  _posterSaveTimer = setTimeout(() => {
    try { savePosterDatabase() } catch (e) { console.error('savePosterDatabase 失败:', e) }
    _posterSaveTimer = null
  }, 500)
}

// ============ Helper: convert sql.js result to array of objects ============
function resultToArray(result) {
  if (!result.length || !result[0].values.length) return []
  const cols = result[0].columns
  return result[0].values.map(row => {
    const obj = {}
    row.forEach((val, i) => {
      if (cols[i] === 'config' || cols[i] === 'content') {
        try { obj[cols[i]] = JSON.parse(val) } catch { obj[cols[i]] = val }
      } else {
        obj[cols[i]] = val
      }
    })
    return obj
  })
}

function resultToObject(result) {
  const arr = resultToArray(result)
  return arr.length ? arr[0] : null
}

// poster 路由专用 JSON 解析器：提高 body 限制以支持 base64 图片上传
const posterJsonParser = express.json({ limit: '15mb' })

// requireAdmin 已从 ../middleware/auth 导入（见文件顶部，含 role 校验）
// runTransaction 已从 ../middleware/db 导入（见文件顶部，用于多步操作事务）

function getUserId(req) {
  return req.user ? req.user.phone : null
}

// 作品所有权校验中间件
function requireWorkOwner(req, res, next) {
  const userId = getUserId(req)
  if (!userId) {
    return res.status(401).json({ success: false, error: '请先登录' })
  }
  const result = posterDb.exec("SELECT * FROM poster_works WHERE id = ?", [req.params.id])
  if (!result.length || !result[0].values.length) {
    return res.status(404).json({ success: false, error: '作品不存在' })
  }
  const work = resultToObject(result)
  if (work.user_id !== userId) {
    return res.status(403).json({ success: false, error: '无权操作他人作品' })
  }
  req.work = work
  next()
}

// ============ Seed 25 poster templates ============
function generateTemplateConfig(t) {
  return POSTER_TEMPLATE_CONFIGS[t.id] || {
    width: 750, height: 1334,
    editableAreas: [
      { id: 'title', type: 'text', label: '标题', defaultText: t.name, x: 60, y: 100, width: 630, height: 70, fontSize: 48, color: '#333', align: 'center', bold: true },
      { id: 'subtitle', type: 'text', label: '副标题', defaultText: '请编辑内容', x: 60, y: 220, width: 630, height: 50, fontSize: 28, color: '#666', align: 'center' },
      { id: 'photo', type: 'image', label: '图片', x: 100, y: 350, width: 550, height: 500, borderRadius: 12 },
      { id: 'footer', type: 'text', label: '底部文字', defaultText: '期待您的光临', x: 60, y: 950, width: 630, height: 45, fontSize: 26, color: '#999', align: 'center' },
    ],
  }
}
function seedPosterTemplates() {
  const check = posterDb.exec("SELECT COUNT(*) as c FROM poster_templates")
  if (check.length && check[0].values[0][0] > 0) return

  const baseURL = '/uploads/poster/templates'
  const now = new Date().toISOString()

  const templates = [
    // Wedding (5)
    { id: 'tpl_wedding_1', name: '浪漫婚礼', category_id: 'wedding', cover: 'cover_wedding_1.jpg', bg: 'wedding_1.jpg', is_free: 1, is_vip: 0, likes: 1280, uses: 5600 },
    { id: 'tpl_wedding_2', name: '中式婚礼', category_id: 'wedding', cover: 'cover_wedding_2.jpg', bg: 'wedding_2.jpg', is_free: 1, is_vip: 0, likes: 980, uses: 4200 },
    { id: 'tpl_wedding_3', name: '森系婚礼', category_id: 'wedding', cover: 'cover_wedding_3.jpg', bg: 'wedding_3.jpg', is_free: 0, is_vip: 1, likes: 756, uses: 3100 },
    { id: 'tpl_wedding_4', name: '简约婚礼', category_id: 'wedding', cover: 'cover_wedding_4.jpg', bg: 'wedding_4.jpg', is_free: 1, is_vip: 0, likes: 654, uses: 2800 },
    { id: 'tpl_wedding_5', name: '奢华婚礼', category_id: 'wedding', cover: 'cover_wedding_5.jpg', bg: 'wedding_5.jpg', is_free: 0, is_vip: 1, likes: 1120, uses: 4900 },

    // Engagement (2)
    { id: 'tpl_engagement_1', name: '甜蜜订婚', category_id: 'engagement', cover: 'cover_engagement_1.jpg', bg: 'engagement_1.jpg', is_free: 1, is_vip: 0, likes: 540, uses: 2300 },
    { id: 'tpl_engagement_2', name: '唯美订婚', category_id: 'engagement', cover: 'cover_engagement_2.jpg', bg: 'engagement_2.jpg', is_free: 0, is_vip: 1, likes: 420, uses: 1800 },

    // Baby (3)
    { id: 'tpl_baby_1', name: '宝宝满月', category_id: 'baby', cover: 'cover_baby_1.jpg', bg: 'baby_1.jpg', is_free: 1, is_vip: 0, likes: 380, uses: 1500 },
    { id: 'tpl_baby_2', name: '百日宴', category_id: 'baby', cover: 'cover_baby_2.jpg', bg: 'baby_2.jpg', is_free: 1, is_vip: 0, likes: 290, uses: 1200 },
    { id: 'tpl_baby_3', name: '周岁宴', category_id: 'baby', cover: 'cover_baby_3.jpg', bg: 'baby_3.jpg', is_free: 0, is_vip: 1, likes: 310, uses: 1100 },

    // Birthday (3)
    { id: 'tpl_birthday_1', name: '生日派对', category_id: 'birthday', cover: 'cover_birthday_1.jpg', bg: 'birthday_1.jpg', is_free: 1, is_vip: 0, likes: 450, uses: 1900 },
    { id: 'tpl_birthday_2', name: '创意生日', category_id: 'birthday', cover: 'cover_birthday_2.jpg', bg: 'birthday_2.jpg', is_free: 1, is_vip: 0, likes: 380, uses: 1600 },
    { id: 'tpl_birthday_3', name: '成人生日', category_id: 'birthday', cover: 'cover_birthday_3.jpg', bg: 'birthday_3.jpg', is_free: 0, is_vip: 1, likes: 260, uses: 900 },

    // House (2)
    { id: 'tpl_house_1', name: '乔迁之喜', category_id: 'house', cover: 'cover_house_1.jpg', bg: 'house_1.jpg', is_free: 1, is_vip: 0, likes: 320, uses: 1400 },
    { id: 'tpl_house_2', name: '新居入伙', category_id: 'house', cover: 'cover_house_2.jpg', bg: 'house_2.jpg', is_free: 0, is_vip: 1, likes: 210, uses: 800 },

    // Parents (2)
    { id: 'tpl_parents_1', name: '感恩父母', category_id: 'parents', cover: 'cover_parents_1.jpg', bg: 'parents_1.jpg', is_free: 1, is_vip: 0, likes: 280, uses: 1000 },
    { id: 'tpl_parents_2', name: '寿宴请柬', category_id: 'parents', cover: 'cover_parents_2.jpg', bg: 'parents_2.jpg', is_free: 0, is_vip: 1, likes: 190, uses: 700 },

    // Study (2)
    { id: 'tpl_study_1', name: '升学宴', category_id: 'study', cover: 'cover_study_1.jpg', bg: 'study_1.jpg', is_free: 1, is_vip: 0, likes: 240, uses: 950 },
    { id: 'tpl_study_2', name: '谢师宴', category_id: 'study', cover: 'cover_study_2.jpg', bg: 'study_2.jpg', is_free: 0, is_vip: 1, likes: 160, uses: 600 },

    // Poster (3)
    { id: 'tpl_poster_1', name: '活动海报', category_id: 'poster', cover: 'cover_poster_1.jpg', bg: 'poster_1.jpg', is_free: 1, is_vip: 0, likes: 520, uses: 2200 },
    { id: 'tpl_poster_2', name: '宣传海报', category_id: 'poster', cover: 'cover_poster_2.jpg', bg: 'poster_2.jpg', is_free: 1, is_vip: 0, likes: 410, uses: 1700 },
    { id: 'tpl_poster_3', name: '商务海报', category_id: 'poster', cover: 'cover_poster_3.jpg', bg: 'poster_3.jpg', is_free: 0, is_vip: 1, likes: 350, uses: 1300 },

    // Creative (3)
    { id: 'tpl_creative_1', name: '创意设计', category_id: 'creative', cover: 'cover_creative_1.jpg', bg: 'creative_1.jpg', is_free: 1, is_vip: 0, likes: 680, uses: 2900 },
    { id: 'tpl_creative_2', name: '艺术海报', category_id: 'creative', cover: 'cover_creative_2.jpg', bg: 'creative_2.jpg', is_free: 0, is_vip: 1, likes: 530, uses: 2100 },
    { id: 'tpl_creative_3', name: '个性定制', category_id: 'creative', cover: 'cover_creative_3.jpg', bg: 'creative_3.jpg', is_free: 0, is_vip: 1, likes: 470, uses: 1900 },
  ]

  templates.forEach(t => {
    const config = generateTemplateConfig(t)
    posterDb.run(`INSERT INTO poster_templates
      (id, name, category_id, cover_url, background_url, config, is_free, is_vip, like_count, use_count, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      t.id, t.name, t.category_id,
      `${baseURL}/${t.cover}`, `${baseURL}/${t.bg}`,
      JSON.stringify(config),
      t.is_free, t.is_vip, t.likes, t.uses, 1, now,
    ])
  })

  savePosterDatabase()
  console.log(`  海报模板: 已播种 ${templates.length} 个模板`)
}

// ============ Routes ============

// GET /templates — list poster templates (query: category_id, keyword, page, limit, all)
router.get('/templates', (req, res) => {
  try {
    const { category_id, keyword, page: pageStr, limit: limitStr, all } = req.query
    const page = Math.max(1, parseInt(pageStr, 10) || 1)
    const limit = Math.max(1, Math.min(100, parseInt(limitStr, 10) || 20))
    const offset = (page - 1) * limit

    // all=true 时返回所有模板（含下架），供管理后台使用；默认仅返回上架模板
    // 非管理员即使传 all=true 也无法查看下架模板
    const showAll = (all === 'true' || all === '1') && isRequestFromAdmin(req)
    const whereClause = showAll ? "1=1" : "is_active = 1"
    let sql = `SELECT * FROM poster_templates WHERE ${whereClause}`
    let countSql = `SELECT COUNT(*) as total FROM poster_templates WHERE ${whereClause}`
    const params = []

    if (category_id) {
      sql += " AND category_id = ?"
      countSql += " AND category_id = ?"
      params.push(category_id)
    }
    if (keyword) {
      sql += " AND name LIKE ? ESCAPE '\\'"
      countSql += " AND name LIKE ? ESCAPE '\\'"
      // 转义 LIKE 通配符
      const escaped = keyword.replace(/([%_\\])/g, '\\$1')
      params.push(`%${escaped}%`)
    }
    sql += " ORDER BY use_count DESC, like_count DESC"

    // Get total count
    const countResult = posterDb.exec(countSql, params)
    const total = countResult.length ? countResult[0].values[0][0] : 0

    sql += " LIMIT ? OFFSET ?"
    params.push(limit, offset)

    const result = posterDb.exec(sql, params)
    const templates = resultToArray(result)

    res.json({
      success: true,
      data: templates,
      total,
      page,
      limit,
      hasMore: offset + templates.length < total,
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ success: false, error: '服务器错误' })
  }
})

// GET /templates/hot — hot templates
router.get('/templates/hot', (req, res) => {
  try {
    const limit = Math.min(20, parseInt(req.query.limit, 10) || 10)
    const result = posterDb.exec(
      "SELECT * FROM poster_templates WHERE is_active = 1 ORDER BY use_count DESC, like_count DESC LIMIT ?",
      [limit]
    )
    const templates = resultToArray(result)
    res.json({ success: true, data: templates })
  } catch (e) {
    console.error(e)
    res.status(500).json({ success: false, error: '服务器错误' })
  }
})

// GET /templates/:id — template detail
router.get('/templates/:id', (req, res) => {
  try {
    const result = posterDb.exec("SELECT * FROM poster_templates WHERE id = ?", [req.params.id])
    const template = resultToObject(result)
    if (!template) {
      return res.status(404).json({ success: false, error: '模板不存在' })
    }
    // 非管理员不能查看已下架模板
    if (!template.is_active && !isRequestFromAdmin(req)) {
      return res.status(404).json({ success: false, error: '模板不存在' })
    }
    res.json({ success: true, data: template })
  } catch (e) {
    console.error(e)
    res.status(500).json({ success: false, error: '服务器错误' })
  }
})

// POST /works — save work
router.post('/works', (req, res) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return res.status(401).json({ success: false, error: '请先登录' })
    }
    const { template_id, template_name, cover_url, content, poster_url } = req.body
    const id = uuidv4()
    const now = new Date().toISOString()

    // 使用事务：保存作品 + 更新模板使用次数，保证原子性
    runTransaction(posterDb, () => {
      posterDb.run(`INSERT INTO poster_works (id, user_id, template_id, template_name, cover_url, content, poster_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
        id, userId, template_id || '',
        template_name || '', cover_url || '',
        JSON.stringify(content || {}), poster_url || '', now,
      ])
      if (template_id) {
        posterDb.run("UPDATE poster_templates SET use_count = use_count + 1 WHERE id = ?", [template_id])
      }
    })
    savePosterDatabaseDebounced()

    const result = posterDb.exec("SELECT * FROM poster_works WHERE id = ?", [id])
    const work = resultToObject(result)
    res.json({ success: true, data: work })
  } catch (e) {
    console.error(e)
    res.status(500).json({ success: false, error: '服务器错误' })
  }
})

// GET /works — list works (requires auth)
router.get('/works', (req, res) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return res.status(401).json({ success: false, error: '请先登录' })
    }
    const sql = "SELECT * FROM poster_works WHERE user_id = ? ORDER BY created_at DESC"
    const params = [userId]

    const page = parseInt(req.query.page, 10)
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20)

    // 有分页参数时返回分页格式
    if (page > 0 && limit > 0) {
      const countSql = "SELECT COUNT(*) as total FROM poster_works WHERE user_id = ?"
      const countResult = posterDb.exec(countSql, [userId])
      const total = countResult.length ? countResult[0].values[0][0] : 0
      const totalPages = Math.ceil(total / limit)
      const offset = (page - 1) * limit

      const paginatedSql = sql + " LIMIT ? OFFSET ?"
      const paginatedParams = [...params, limit, offset]
      const result = posterDb.exec(paginatedSql, paginatedParams)
      const works = resultToArray(result)

      return res.json({
        success: true,
        data: works,
        pagination: { page, limit, total, totalPages },
      })
    }

    // 无分页参数时保持原有行为（返回全部）
    const result = posterDb.exec(sql, params)
    const works = resultToArray(result)
    res.json({ success: true, data: works, total: works.length })
  } catch (e) {
    console.error(e)
    res.status(500).json({ success: false, error: '服务器错误' })
  }
})

// GET /works/recycle — list recycled works
// 注意：此静态路径必须注册在 GET /works/:id 之前，否则 /works/recycle 会被
// /works/:id 匹配（id='recycle'），导致回收站接口无法访问
router.get('/works/recycle', (req, res) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return res.status(401).json({ success: false, error: '请先登录' })
    }
    const sql = "SELECT * FROM recycle_bin WHERE user_id = ? ORDER BY deleted_at DESC"
    const params = [userId]

    const page = parseInt(req.query.page, 10)
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20)

    if (page > 0 && limit > 0) {
      const countSql = "SELECT COUNT(*) as total FROM recycle_bin WHERE user_id = ?"
      const countResult = posterDb.exec(countSql, [userId])
      const total = countResult.length ? countResult[0].values[0][0] : 0
      const totalPages = Math.ceil(total / limit)
      const offset = (page - 1) * limit

      const paginatedSql = sql + " LIMIT ? OFFSET ?"
      const paginatedParams = [...params, limit, offset]
      const result = posterDb.exec(paginatedSql, paginatedParams)
      const items = resultToArray(result).map(item => {
        try {
          item.work_data = JSON.parse(item.work_data)
        } catch (_) {}
        return item
      })

      return res.json({
        success: true,
        data: items,
        pagination: { page, limit, total, totalPages },
      })
    }

    const result = posterDb.exec(sql, params)
    const items = resultToArray(result).map(item => {
      try {
        item.work_data = JSON.parse(item.work_data)
      } catch (_) {}
      return item
    })
    res.json({ success: true, data: items })
  } catch (e) {
    console.error(e)
    res.status(500).json({ success: false, error: '服务器错误' })
  }
})

// PUT /works/:id/restore — restore work from recycle bin
// 注意：放在 /works/:id 相关路由附近，确保路由注册顺序清晰
router.put('/works/:id/restore', (req, res) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return res.status(401).json({ success: false, error: '请先登录' })
    }
    const result = posterDb.exec("SELECT * FROM recycle_bin WHERE id = ? AND user_id = ?", [req.params.id, userId])
    if (!result.length || !result[0].values.length) {
      return res.status(404).json({ success: false, error: '记录不存在' })
    }
    const item = resultToObject(result)
    let workData
    try {
      workData = JSON.parse(item.work_data)
    } catch (_) {
      return res.status(500).json({ success: false, error: '数据损坏' })
    }

    // 使用事务：恢复作品 + 删除回收站记录，保证原子性
    runTransaction(posterDb, () => {
      posterDb.run(`INSERT INTO poster_works (id, user_id, template_id, template_name, cover_url, content, poster_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
        workData.id, workData.user_id, workData.template_id || '',
        workData.template_name || '', workData.cover_url || '',
        workData.content || '{}', workData.poster_url || '',
        workData.created_at || new Date().toISOString(),
      ])
      posterDb.run("DELETE FROM recycle_bin WHERE id = ?", [req.params.id])
    })
    savePosterDatabaseDebounced()
    res.json({ success: true, message: '已恢复' })
  } catch (e) {
    console.error(e)
    res.status(500).json({ success: false, error: '服务器错误' })
  }
})

// DELETE /works/:id/permanent — permanently delete from recycle bin
// 注意：放在 /works/:id 相关路由附近，确保路由注册顺序清晰
router.delete('/works/:id/permanent', (req, res) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return res.status(401).json({ success: false, error: '请先登录' })
    }
    posterDb.run("DELETE FROM recycle_bin WHERE id = ? AND user_id = ?", [req.params.id, userId])
    savePosterDatabase()
    res.json({ success: true, message: '已永久删除' })
  } catch (e) {
    console.error(e)
    res.status(500).json({ success: false, error: '服务器错误' })
  }
})

// GET /works/:id — work detail (requires ownership)
router.get('/works/:id', requireWorkOwner, (req, res) => {
  try {
    const result = posterDb.exec("SELECT * FROM poster_works WHERE id = ?", [req.params.id])
    const work = resultToObject(result)
    if (!work) {
      return res.status(404).json({ success: false, error: '作品不存在' })
    }
    res.json({ success: true, data: work })
  } catch (e) {
    console.error(e)
    res.status(500).json({ success: false, error: '服务器错误' })
  }
})

// PUT /works/:id — update work (requires ownership)
router.put('/works/:id', requireWorkOwner, (req, res) => {
  try {
    const existing = req.work

    const { template_id, template_name, cover_url, content, poster_url } = req.body
    const fields = []
    const params = []

    if (template_id !== undefined) { fields.push("template_id = ?"); params.push(template_id) }
    if (template_name !== undefined) { fields.push("template_name = ?"); params.push(template_name) }
    if (cover_url !== undefined) { fields.push("cover_url = ?"); params.push(cover_url) }
    if (content !== undefined) { fields.push("content = ?"); params.push(JSON.stringify(content)) }
    if (poster_url !== undefined) { fields.push("poster_url = ?"); params.push(poster_url) }

    if (fields.length === 0) {
      return res.json({ success: true, data: existing })
    }

    params.push(req.params.id)
    posterDb.run(`UPDATE poster_works SET ${fields.join(', ')} WHERE id = ?`, params)
    savePosterDatabaseDebounced()

    const updated = posterDb.exec("SELECT * FROM poster_works WHERE id = ?", [req.params.id])
    res.json({ success: true, data: resultToObject(updated) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ success: false, error: '服务器错误' })
  }
})

// POST /works/:id/upload — upload work poster image (requires ownership)
router.post('/works/:id/upload', posterJsonParser, requireWorkOwner, (req, res) => {
  try {
    if (!req.body.image) {
      return res.status(400).json({ success: false, error: '请上传图片文件' })
    }

    const workId = req.params.id

    // For base64 image upload — 限制 10MB
    if (req.body.image) {
      const matches = req.body.image.match(/^data:image\/(png|jpg|jpeg|webp);base64,(.+)$/)
      if (!matches) {
        return res.status(400).json({ success: false, error: '图片格式不支持，请使用 PNG/JPG/WebP' })
      }
      const data = Buffer.from(matches[2], 'base64')
      // SEC-6: 限制图片大小 10MB
      if (data.length > 10 * 1024 * 1024) {
        return res.status(413).json({ success: false, error: '图片大小不能超过 10MB' })
      }
      const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1]
      const filename = `${workId}.${ext}`
      const filepath = path.join(__dirname, '..', 'uploads', 'poster', 'works', filename)
      fs.writeFileSync(filepath, data)

      const posterUrl = `/uploads/poster/works/${filename}`
      posterDb.run("UPDATE poster_works SET poster_url = ? WHERE id = ?", [posterUrl, workId])
      savePosterDatabaseDebounced()

      return res.json({ success: true, data: { url: posterUrl } })
    }

    return res.status(400).json({ success: false, error: '请提供 base64 编码的图片数据' })
  } catch (e) {
    console.error(e)
    res.status(500).json({ success: false, error: '服务器错误' })
  }
})

// DELETE /works/:id — soft delete work (move to recycle bin)
router.delete('/works/:id', requireWorkOwner, (req, res) => {
  try {
    const work = req.work
    const now = new Date().toISOString()
    // 使用事务：插入回收站 + 删除作品，保证原子性
    runTransaction(posterDb, () => {
      posterDb.run(`INSERT INTO recycle_bin (user_id, work_id, work_data, deleted_at)
        VALUES (?, ?, ?, ?)`, [
        work.user_id, work.id, JSON.stringify(work), now,
      ])
      posterDb.run("DELETE FROM poster_works WHERE id = ?", [req.params.id])
    })
    savePosterDatabase()
    res.json({ success: true, message: '删除成功，已移入回收站' })
  } catch (e) {
    console.error(e)
    res.status(500).json({ success: false, error: '服务器错误' })
  }
})

// GET /stickers — list stickers
router.get('/stickers', (req, res) => {
  try {
    const stickersDir = path.join(__dirname, '..', 'uploads', 'poster', 'stickers')
    let stickers = []
    if (fs.existsSync(stickersDir)) {
      stickers = fs.readdirSync(stickersDir)
        .filter(f => /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(f))
        .map(f => ({
          id: f.replace(/\.[^.]+$/, ''),
          name: f.replace(/\.[^.]+$/, ''),
          url: `/uploads/poster/stickers/${f}`,
        }))
    }
    res.json({ success: true, data: stickers, total: stickers.length })
  } catch (e) {
    console.error(e)
    res.status(500).json({ success: false, error: '服务器错误' })
  }
})

// ============ Admin routes ============

// POST /templates — admin: create template
router.post('/templates', requireAdmin, (req, res) => {
  try {
    const { name, category_id, cover_url, background_url, config, is_free, is_vip, is_active } = req.body
    if (!name || !category_id) {
      return res.status(400).json({ success: false, error: '缺少必填字段: name, category_id' })
    }
    // 数据校验：name 长度上限 100 字符
    if (typeof name !== 'string' || name.length > 100) {
      return res.status(400).json({ success: false, error: '模板名称不能超过 100 个字符' })
    }
    // 数据校验：config 序列化后长度上限 500KB，防止恶意超大 payload
    const MAX_JSON_LENGTH = 500 * 1024
    if (config !== undefined && config !== null) {
      const configStr = JSON.stringify(config)
      if (configStr.length > MAX_JSON_LENGTH) {
        return res.status(400).json({ success: false, error: 'config 数据过大，超过 500KB 限制' })
      }
    }
    const id = req.body.id || `tpl_${uuidv4().substring(0, 8)}`
    const existing = posterDb.exec("SELECT id FROM poster_templates WHERE id = ?", [id])
    if (existing.length && existing[0].values.length) {
      return res.status(400).json({ success: false, error: `模板 ID ${id} 已存在` })
    }
    const now = new Date().toISOString()
    posterDb.run(`INSERT INTO poster_templates
      (id, name, category_id, cover_url, background_url, config, is_free, is_vip, like_count, use_count, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`, [
      id, name, category_id,
      cover_url || '', background_url || '',
      JSON.stringify(config || {}),
      is_free !== undefined ? is_free : 1,
      is_vip !== undefined ? is_vip : 0,
      is_active !== undefined ? is_active : 1,
      now,
    ])
    savePosterDatabaseDebounced()

    const result = posterDb.exec("SELECT * FROM poster_templates WHERE id = ?", [id])
    res.json({ success: true, data: resultToObject(result) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ success: false, error: '服务器错误' })
  }
})

// PUT /templates/:id — admin: update template
router.put('/templates/:id', requireAdmin, (req, res) => {
  try {
    const existing = posterDb.exec("SELECT id FROM poster_templates WHERE id = ?", [req.params.id])
    if (!existing.length || !existing[0].values.length) {
      return res.status(404).json({ success: false, error: '模板不存在' })
    }

    const { name, category_id, cover_url, background_url, config, is_free, is_vip, is_active } = req.body
    const fields = []
    const params = []

    // 数据校验：name 长度上限 100 字符
    if (name !== undefined && (typeof name !== 'string' || name.length > 100)) {
      return res.status(400).json({ success: false, error: '模板名称不能超过 100 个字符' })
    }
    // 数据校验：config 序列化后长度上限 500KB，防止恶意超大 payload
    const MAX_JSON_LENGTH = 500 * 1024
    if (config !== undefined && config !== null) {
      const configStr = JSON.stringify(config)
      if (configStr.length > MAX_JSON_LENGTH) {
        return res.status(400).json({ success: false, error: 'config 数据过大，超过 500KB 限制' })
      }
    }

    // 移除统计字段（like_count、use_count），管理员编辑不应直接篡改统计数据
    const allowedFields = { name: 'name', category_id: 'category_id', cover_url: 'cover_url', background_url: 'background_url', is_free: 'is_free', is_vip: 'is_vip', is_active: 'is_active' }
    Object.keys(allowedFields).forEach(f => {
      if (req.body[f] !== undefined) {
        fields.push(`${allowedFields[f]} = ?`)
        params.push(req.body[f])
      }
    })
    if (config !== undefined) {
      fields.push("config = ?")
      params.push(JSON.stringify(config))
    }

    if (fields.length === 0) {
      const result = posterDb.exec("SELECT * FROM poster_templates WHERE id = ?", [req.params.id])
      return res.json({ success: true, data: resultToObject(result) })
    }

    params.push(req.params.id)
    posterDb.run(`UPDATE poster_templates SET ${fields.join(', ')} WHERE id = ?`, params)
    savePosterDatabaseDebounced()

    const result = posterDb.exec("SELECT * FROM poster_templates WHERE id = ?", [req.params.id])
    res.json({ success: true, data: resultToObject(result) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ success: false, error: '服务器错误' })
  }
})

// DELETE /templates/:id — admin: delete template
router.delete('/templates/:id', requireAdmin, (req, res) => {
  try {
    const existing = posterDb.exec("SELECT id FROM poster_templates WHERE id = ?", [req.params.id])
    if (!existing.length || !existing[0].values.length) {
      return res.status(404).json({ success: false, error: '模板不存在' })
    }
    posterDb.run("DELETE FROM poster_templates WHERE id = ?", [req.params.id])
    savePosterDatabase()
    res.json({ success: true, message: '删除成功' })
  } catch (e) {
    console.error(e)
    res.status(500).json({ success: false, error: '服务器错误' })
  }
})

// GET /stats — admin: stats
router.get('/stats', requireAdmin, (req, res) => {
  try {
    const tplCount = posterDb.exec("SELECT COUNT(*) as c FROM poster_templates")
    const totalTemplates = tplCount.length ? tplCount[0].values[0][0] : 0

    const activeCount = posterDb.exec("SELECT COUNT(*) as c FROM poster_templates WHERE is_active = 1")
    const activeTemplates = activeCount.length ? activeCount[0].values[0][0] : 0

    const freeCount = posterDb.exec("SELECT COUNT(*) as c FROM poster_templates WHERE is_free = 1")
    const freeTemplates = freeCount.length ? freeCount[0].values[0][0] : 0

    const vipCount = posterDb.exec("SELECT COUNT(*) as c FROM poster_templates WHERE is_vip = 1")
    const vipTemplates = vipCount.length ? vipCount[0].values[0][0] : 0

    const worksCount = posterDb.exec("SELECT COUNT(*) as c FROM poster_works")
    const totalWorks = worksCount.length ? worksCount[0].values[0][0] : 0

    const useSum = posterDb.exec("SELECT SUM(use_count) as s FROM poster_templates")
    const totalUses = useSum.length && useSum[0].values[0][0] ? useSum[0].values[0][0] : 0

    const likeSum = posterDb.exec("SELECT SUM(like_count) as s FROM poster_templates")
    const totalLikes = likeSum.length && likeSum[0].values[0][0] ? likeSum[0].values[0][0] : 0

    // By category
    const catResult = posterDb.exec("SELECT category_id, COUNT(*) as c FROM poster_templates GROUP BY category_id")
    const byCategory = {}
    if (catResult.length) {
      catResult[0].values.forEach(row => { byCategory[row[0]] = row[1] })
    }

    res.json({
      success: true,
      data: {
        totalTemplates,
        activeTemplates,
        freeTemplates,
        vipTemplates,
        totalWorks,
        totalUses,
        totalLikes,
        byCategory,
      },
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ success: false, error: '服务器错误' })
  }
})

// ============ Init & export ============
async function init() {
  // Ensure upload dirs exist
  const dirs = [
    path.join(__dirname, '..', 'uploads', 'poster', 'templates'),
    path.join(__dirname, '..', 'uploads', 'poster', 'stickers'),
    path.join(__dirname, '..', 'uploads', 'poster', 'works'),
  ]
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  })

  await initPosterDatabase()

  // Migrate: add template_name, cover_url columns if they don't exist
  try {
    posterDb.run("ALTER TABLE poster_works ADD COLUMN template_name TEXT DEFAULT ''")
  } catch (_) { /* column already exists */ }
  try {
    posterDb.run("ALTER TABLE poster_works ADD COLUMN cover_url TEXT DEFAULT ''")
  } catch (_) { /* column already exists */ }
  savePosterDatabase()

  seedPosterTemplates()
}

// Initialize synchronously is not possible with sql.js, so we export a promise
// The main server will await this before listening
const posterReady = init()

module.exports = router
module.exports.posterReady = posterReady
// 导出 savePosterDatabase 供 graceful shutdown 时调用，确保进程退出前数据落盘
module.exports.savePosterDatabase = savePosterDatabase
// 导出 getPosterDb 供 index.js 访问 poster 数据库实例（恢复/删除等跨库操作）
module.exports.getPosterDb = () => posterDb
