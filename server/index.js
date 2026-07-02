const express = require('express')
const cors = require('cors')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const initSqlJs = require('sql.js')
const jwt = require('jsonwebtoken')

const app = express()
const PORT = 3001
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('\n❌ 错误: 请设置环境变量 JWT_SECRET')
  console.error('   示例: JWT_SECRET=your-secret-key npm start\n')
  process.exit(1)
}

let SQL, db
const DB_PATH = path.join(__dirname, 'data.db')

async function initDatabase() {
  SQL = await initSqlJs()
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH)
    db = new SQL.Database(buf)
  } else {
    db = new SQL.Database()
  }
  db.run(`CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subtitle TEXT DEFAULT '',
    category TEXT NOT NULL,
    cover TEXT DEFAULT '',
    primaryColor TEXT DEFAULT '#e84a6e',
    likes INTEGER DEFAULT 0,
    pageCount INTEGER DEFAULT 10,
    data TEXT DEFAULT '{}',
    elements TEXT DEFAULT '[]',
    canvasSize TEXT,
    orientation TEXT DEFAULT 'portrait',
    background TEXT,
    tags TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`)
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT DEFAULT ''
  )`)
  db.run(`CREATE TABLE IF NOT EXISTS music (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    tag TEXT DEFAULT '',
    src TEXT NOT NULL,
    hot INTEGER DEFAULT 0
  )`)
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL,
    items TEXT NOT NULL,
    totalAmount TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    contactName TEXT DEFAULT '',
    contactPhone TEXT DEFAULT '',
    address TEXT DEFAULT '',
    note TEXT DEFAULT '',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`)
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`)
  saveDatabase()
}

function saveDatabase() {
  const data = db.export()
  fs.writeFileSync(DB_PATH, Buffer.from(data))
}

function getVersion() {
  const row = db.exec("SELECT value FROM settings WHERE key = 'version'")
  return row.length ? parseInt(row[0].values[0][0], 10) : 1
}

function setVersion(v) {
  db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('version', ?)", [String(v)])
}
// ============ 中间件 ============
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// 简单的 IP 限流（登录接口防暴力破解）
const loginAttempts = {}
function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown'
  const now = Date.now()
  if (!loginAttempts[ip]) loginAttempts[ip] = []
  loginAttempts[ip] = loginAttempts[ip].filter(t => now - t < 60000)
  if (loginAttempts[ip].length >= 10) {
    return res.status(429).json({ success: false, error: '请求过于频繁，请稍后再试' })
  }
  loginAttempts[ip].push(now)
  next()
}

// ============ 文件上传配置 ============
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads')
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${uuidv4()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.mp3', '.wav', '.ogg', '.aac']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('不支持的文件格式'))
    }
  },
})

// ============ 音乐目录 ============
const MUSIC_DIR = path.join(__dirname, 'music')
if (!fs.existsSync(MUSIC_DIR)) {
  fs.mkdirSync(MUSIC_DIR, { recursive: true })
  const readmePath = path.join(MUSIC_DIR, 'README.md')
  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(readmePath, '# 音乐文件目录\n\n将 mp3/wav/ogg/aac 音乐文件放入此目录，服务将自动读取。\n')
  }
}

// ============ 初始化种子数据 ============
async function seedData() {
  const count = db.exec("SELECT COUNT(*) as c FROM categories")
  if (!count.length || count[0].values[0][0] === 0) {
    const cats = [
      ['wedding', '新婚', '💒'],
      ['proposal', '求婚', '💍'],
      ['consultation-tea', '商量茶', '🍵'],
      ['festival', '割礼', '🎁'],
      ['business', '耳环礼', '💎'],
      ['baby', '周岁宴', '🎉'],
      ['graduation', '升学宴', '🎓'],
      ['festival-invitation', '节日请柬', '🎊'],
      ['housewarming', '乔迁', '🏠'],
      ['ceremony', '仪式', '✨'],
    ]
    cats.forEach(c => {
      db.run("INSERT OR IGNORE INTO categories (id, name, icon) VALUES (?, ?, ?)", c)
    })
    setVersion(1)
    saveDatabase()
  }

  const musicCount = db.exec("SELECT COUNT(*) as c FROM music")
  if (!musicCount.length || musicCount[0].values[0][0] === 0) {
    const defaultMusic = [
      ['告白气球', '欢快', '/uploads/music/happy-1.mp3', 1],
      ['我们结婚啦', '欢快', '/uploads/music/happy-2.mp3', 1],
      ['执子之手', '欢快', '/uploads/music/happy-3.mp3', 1],
      ["It's You", '安静', '/uploads/music/calm-1.mp3', 1],
      ['我是如此相信', '安静', '/uploads/music/calm-2.mp3', 1],
      ['就是爱你', '安静', '/uploads/music/calm-3.mp3', 0],
      ['因你而在', '抖音', '/uploads/music/douyin-1.mp3', 0],
      ['Lucky Me', '纯音乐', '/uploads/music/instrumental-1.mp3', 0],
      ['繁花（剪辑版）', '纯音乐', '/uploads/music/instrumental-2.mp3', 0],
      ['爱你', '抖音', '/uploads/music/douyin-2.mp3', 1],
      ['往后余生', '安静', '/uploads/music/calm-4.mp3', 0],
      ['小幸运', '欢快', '/uploads/music/happy-4.mp3', 1],
      ['最美的期待', '抖音', '/uploads/music/douyin-3.mp3', 0],
      ['刚好遇见你', '欢快', '/uploads/music/happy-5.mp3', 0],
    ]
    defaultMusic.forEach(m => {
      db.run("INSERT INTO music (name, tag, src, hot) VALUES (?, ?, ?, ?)", m)
    })
    saveDatabase()
  }

  // 合并旧的 data.json 数据
  const oldDataPath = path.join(__dirname, 'data.json')
  if (fs.existsSync(oldDataPath)) {
    try {
      const oldData = JSON.parse(fs.readFileSync(oldDataPath, 'utf-8'))
      if (oldData.templates && Array.isArray(oldData.templates)) {
        const existing = db.exec("SELECT COUNT(*) as c FROM templates")
        if (existing.length && existing[0].values[0][0] === 0) {
          oldData.templates.forEach(t => {
            db.run(`INSERT INTO templates
              (id, name, subtitle, category, cover, primaryColor, likes, pageCount, data, elements, canvasSize, orientation, background, tags, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
              t.id || uuidv4(),
              t.name || '',
              t.subtitle || '',
              t.category || 'wedding',
              t.cover || '',
              t.primaryColor || '#e84a6e',
              t.likes || 0,
              t.pageCount || 10,
              JSON.stringify(t.data || {}),
              JSON.stringify(t.elements || []),
              t.canvasSize ? JSON.stringify(t.canvasSize) : null,
              t.orientation || 'portrait',
              t.background ? JSON.stringify(t.background) : null,
              t.tags ? JSON.stringify(t.tags) : null,
              t.createdAt || new Date().toISOString(),
              t.updatedAt || new Date().toISOString(),
            ])
          })
          saveDatabase()
          console.log('  已从 data.json 迁移 ' + oldData.templates.length + ' 个模板')
        }
      }
    } catch (e) {
      console.warn('  data.json 迁移失败（可忽略）:', e.message)
    }
  }
}

// ============ API 路由 ============

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', time: new Date().toISOString() })
})

// 短信验证码存储（生产环境应使用 Redis）
const smsCodes = {}
setInterval(() => {
  const now = Date.now()
  Object.keys(smsCodes).forEach(k => { if (now - smsCodes[k].time > 300000) delete smsCodes[k] })
}, 60000)

// 发送验证码
app.post('/api/sms/send', rateLimit, (req, res) => {
  const { phone } = req.body
  if (!phone || phone.length < 11) {
    return res.status(400).json({ success: false, error: '请输入正确的手机号' })
  }
  const code = String(Math.floor(100000 + Math.random() * 900000))
  smsCodes[phone] = { code, time: Date.now() }
  console.log(`\n📱 [验证码] ${phone} → ${code}\n`)
  res.json({ success: true, message: '验证码已发送' })
})

// 用户登录
app.post('/api/user/login', rateLimit, (req, res) => {
  const { phone, code } = req.body

  // 微信小程序登录（encryptedData 模式）
  if (req.body.encryptedData && req.body.code) {
    // 生产环境应调用 wx.login 服务端接口验证
    // 演示环境直接放行
    const token = jwt.sign({ phone: 'wechat_user', role: 'user' }, JWT_SECRET, { expiresIn: '30d' })
    return res.json({ success: true, data: { token, nickname: '微信用户', phone: 'wechat_user' } })
  }

  // 手机号+验证码登录
  if (phone) {
    if (!code) return res.status(400).json({ success: false, error: '请输入验证码' })
    // 开发环境使用万能验证码 000000
    if (code !== '000000') {
      const stored = smsCodes[phone]
      if (!stored) return res.status(400).json({ success: false, error: '请先获取验证码' })
      if (Date.now() - stored.time > 300000) {
        delete smsCodes[phone]
        return res.status(400).json({ success: false, error: '验证码已过期，请重新获取' })
      }
      if (stored.code !== code) return res.status(400).json({ success: false, error: '验证码错误' })
      delete smsCodes[phone]
    }

    const token = jwt.sign({ phone, role: 'user' }, JWT_SECRET, { expiresIn: '30d' })
    return res.json({
      success: true,
      data: {
        token,
        nickname: phone.substring(0, 3) + '****' + phone.substring(7),
        phone,
      },
    })
  }

  res.status(400).json({ success: false, error: '缺少登录参数' })
})

// 用户信息
app.get('/api/user/info', (req, res) => {
  res.json({
    success: true,
    data: { nickname: req.user?.nickname || '用户', phone: req.user?.phone || '', avatar: '' },
  })
})

// 获取分类列表
app.get('/api/categories', (req, res) => {
  try {
    const result = db.exec("SELECT id, name, icon FROM categories")
    const cats = result.length ? result[0].values.map(row => ({
      id: row[0], name: row[1], icon: row[2],
      count: 0,
    })) : []

    const countResult = db.exec("SELECT category, COUNT(*) as c FROM templates GROUP BY category")
    const counts = {}
    if (countResult.length) {
      countResult[0].values.forEach(row => { counts[row[0]] = row[1] })
    }

    cats.forEach(c => { c.count = counts[c.id] || 0 })

    res.json({ success: true, data: cats })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// 获取全部模板
app.get('/api/templates', (req, res) => {
  try {
    let sql = "SELECT * FROM templates"
    const params = []

    if (req.query.category) {
      sql += " WHERE category = ?"
      params.push(req.query.category)
    }
    sql += " ORDER BY updatedAt DESC"

    const result = db.exec(sql, params)
    const templates = result.length ? result[0].values.map(row => {
      const cols = result[0].columns
      const obj = {}
      row.forEach((val, i) => {
        if (cols[i] === 'data' || cols[i] === 'elements' || cols[i] === 'tags' || cols[i] === 'canvasSize' || cols[i] === 'background') {
          try { obj[cols[i]] = JSON.parse(val) } catch { obj[cols[i]] = val }
        } else {
          obj[cols[i]] = val
        }
      })
      return obj
    }) : []

    res.json({ success: true, data: templates, total: templates.length })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// 获取单个模板
app.get('/api/templates/:id', (req, res) => {
  try {
    const result = db.exec("SELECT * FROM templates WHERE id = ?", [req.params.id])
    if (!result.length || !result[0].values.length) {
      return res.status(404).json({ success: false, error: '模板不存在' })
    }
    const row = result[0].values[0]
    const cols = result[0].columns
    const obj = {}
    row.forEach((val, i) => {
      if (cols[i] === 'data' || cols[i] === 'elements' || cols[i] === 'tags' || cols[i] === 'canvasSize' || cols[i] === 'background') {
        try { obj[cols[i]] = JSON.parse(val) } catch { obj[cols[i]] = val }
      } else {
        obj[cols[i]] = val
      }
    })
    res.json({ success: true, data: obj })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// 上传文件
app.post('/api/upload', upload.array('images', 10), (req, res) => {
  try {
    const files = req.files.map(f => ({
      filename: f.filename,
      originalName: f.originalname,
      url: `/uploads/${f.filename}`,
      size: f.size,
    }))
    res.json({ success: true, data: files })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// 上传音乐
app.post('/api/music/upload', upload.array('music', 10), (req, res) => {
  try {
    const files = req.files.map(f => ({
      filename: f.filename,
      originalName: f.originalname,
      url: `/uploads/${f.filename}`,
      size: f.size,
    }))
    files.forEach(f => {
      db.run("INSERT INTO music (name, tag, src, hot) VALUES (?, ?, ?, 0)",
        [f.originalName.replace(/\.[^.]+$/, ''), '本地上传', f.url])
    })
    saveDatabase()
    res.json({ success: true, data: files })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// 获取音乐列表
app.get('/api/music', (req, res) => {
  try {
    let sql = "SELECT id, name, tag, src, hot FROM music"
    const params = []
    if (req.query.tag && req.query.tag !== '全部') {
      sql += " WHERE tag = ?"
      params.push(req.query.tag)
    }
    sql += " ORDER BY hot DESC, id ASC"
    const result = db.exec(sql, params)
    const list = result.length ? result[0].values.map(row => ({
      id: row[0], name: row[1], tag: row[2], src: row[3], hot: !!row[4],
    })) : []
    res.json({ success: true, data: list })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// 创建模板
app.post('/api/templates', (req, res) => {
  try {
    const body = req.body
    if (!body.name || !body.category) {
      return res.status(400).json({ success: false, error: '缺少必填字段：name、category' })
    }

    const id = body.id || uuidv4()
    const existing = db.exec("SELECT id FROM templates WHERE id = ?", [id])
    if (existing.length && existing[0].values.length) {
      return res.status(400).json({ success: false, error: `模板 ID ${id} 已存在` })
    }

    db.run(`INSERT INTO templates
      (id, name, subtitle, category, cover, primaryColor, likes, pageCount, data, elements, canvasSize, orientation, background, tags, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      id,
      body.name,
      body.subtitle || '',
      body.category,
      body.cover || '',
      body.primaryColor || '#e84a6e',
      body.likes || 0,
      body.pageCount || 10,
      JSON.stringify(body.data || {}),
      JSON.stringify(body.elements || []),
      body.canvasSize ? JSON.stringify(body.canvasSize) : null,
      body.orientation || 'portrait',
      body.background ? JSON.stringify(body.background) : null,
      body.tags ? JSON.stringify(body.tags) : null,
      new Date().toISOString(),
      new Date().toISOString(),
    ])
    bumpVersion()
    saveDatabase()

    const result = db.exec("SELECT * FROM templates WHERE id = ?", [id])
    const template = rowToObject(result)
    res.json({ success: true, data: template })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// 更新模板
app.put('/api/templates/:id', (req, res) => {
  try {
    const existing = db.exec("SELECT id FROM templates WHERE id = ?", [req.params.id])
    if (!existing.length || !existing[0].values.length) {
      return res.status(404).json({ success: false, error: '模板不存在' })
    }

    const body = req.body
    const fields = []
    const params = []

    const allowedFields = ['name', 'subtitle', 'category', 'cover', 'primaryColor', 'likes', 'pageCount', 'orientation']
    allowedFields.forEach(f => {
      if (body[f] !== undefined) {
        fields.push(`${f} = ?`)
        params.push(body[f])
      }
    })
    if (body.data !== undefined) {
      fields.push("data = ?")
      params.push(JSON.stringify(body.data))
    }
    if (body.elements !== undefined) {
      fields.push("elements = ?")
      params.push(JSON.stringify(body.elements))
    }
    if (body.canvasSize !== undefined) {
      fields.push("canvasSize = ?")
      params.push(JSON.stringify(body.canvasSize))
    }
    if (body.background !== undefined) {
      fields.push("background = ?")
      params.push(JSON.stringify(body.background))
    }
    if (body.tags !== undefined) {
      fields.push("tags = ?")
      params.push(JSON.stringify(body.tags))
    }
    fields.push("updatedAt = ?")
    params.push(new Date().toISOString())
    params.push(req.params.id)

    db.run(`UPDATE templates SET ${fields.join(', ')} WHERE id = ?`, params)
    bumpVersion()
    saveDatabase()

    const result = db.exec("SELECT * FROM templates WHERE id = ?", [req.params.id])
    const template = rowToObject(result)
    res.json({ success: true, data: template })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// 删除模板
app.delete('/api/templates/:id', (req, res) => {
  try {
    const existing = db.exec("SELECT id FROM templates WHERE id = ?", [req.params.id])
    if (!existing.length || !existing[0].values.length) {
      return res.status(404).json({ success: false, error: '模板不存在' })
    }
    db.run("DELETE FROM templates WHERE id = ?", [req.params.id])
    bumpVersion()
    saveDatabase()
    res.json({ success: true, message: '删除成功' })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// ============ 订单 API ============

// 创建订单
app.post('/api/orders', (req, res) => {
  try {
    const { items, totalAmount, contactName, contactPhone, address, note } = req.body
    if (!items || !items.length) {
      return res.status(400).json({ success: false, error: '订单商品不能为空' })
    }
    const id = uuidv4()
    const now = new Date().toISOString()
    db.run(`INSERT INTO orders (id, phone, items, totalAmount, status, contactName, contactPhone, address, note, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`, [
      id, req.user?.phone || '', JSON.stringify(items), totalAmount || '0',
      contactName || '', contactPhone || '', address || '', note || '', now, now,
    ])
    saveDatabase()
    const order = db.exec("SELECT * FROM orders WHERE id = ?", [id])
    res.json({ success: true, data: rowToObject(order) })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// 获取用户订单列表
app.get('/api/orders', (req, res) => {
  try {
    const phone = req.user?.phone
    let sql = "SELECT * FROM orders"
    const params = []
    if (phone && phone !== 'wechat_user') {
      sql += " WHERE phone = ?"
      params.push(phone)
    }
    sql += " ORDER BY createdAt DESC"
    const result = db.exec(sql, params)
    const orders = result.length ? result[0].values.map(row => {
      const obj = rowToObject({ ...result, values: [row] })
      if (typeof obj.items === 'string') obj.items = JSON.parse(obj.items)
      return obj
    }) : []
    res.json({ success: true, data: orders })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// 更新订单状态
app.put('/api/orders/:id/status', (req, res) => {
  try {
    const { status } = req.body
    const validStatuses = ['pending', 'paid', 'shipped', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: '无效的订单状态' })
    }
    const existing = db.exec("SELECT id FROM orders WHERE id = ?", [req.params.id])
    if (!existing.length || !existing[0].values.length) {
      return res.status(404).json({ success: false, error: '订单不存在' })
    }
    db.run("UPDATE orders SET status = ?, updatedAt = ? WHERE id = ?",
      [status, new Date().toISOString(), req.params.id])
    saveDatabase()
    res.json({ success: true, message: '状态已更新' })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// 版本号相关
app.get('/api/version', (req, res) => {
  const result = db.exec("SELECT COUNT(*) as c FROM templates")
  const count = result.length ? result[0].values[0][0] : 0
  res.json({ success: true, version: getVersion(), count })
})

app.post('/api/version/refresh', (req, res) => {
  bumpVersion()
  saveDatabase()
  res.json({ success: true, version: getVersion() })
})

function bumpVersion() {
  setVersion(getVersion() + 1)
}

function rowToObject(result) {
  if (!result.length || !result[0].values.length) return null
  const row = result[0].values[0]
  const cols = result[0].columns
  const obj = {}
  row.forEach((val, i) => {
    if (cols[i] === 'data' || cols[i] === 'elements' || cols[i] === 'tags' || cols[i] === 'canvasSize' || cols[i] === 'background') {
      try { obj[cols[i]] = JSON.parse(val) } catch { obj[cols[i]] = val }
    } else {
      obj[cols[i]] = val
    }
  })
  return obj
}

// ============ 错误处理 ============
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, error: err.message })
  }
  if (err) {
    return res.status(400).json({ success: false, error: err.message })
  }
  next()
})

// ============ 启动 ============
async function start() {
  await initDatabase()
  await seedData()
  app.listen(PORT, () => {
    console.log(`\n🟢 婚贝 API 服务已启动`)
    console.log(`   本地地址: http://localhost:${PORT}`)
    console.log(`   数据库: ${DB_PATH}`)
    console.log(`   上传目录: ${path.join(__dirname, 'uploads')}`)
    console.log(`   音乐目录: ${MUSIC_DIR}`)
    console.log(`   JWT 认证: 已启用 (公开路由除外)\n`)
  })
}

start().catch(e => {
  console.error('启动失败:', e)
  process.exit(1)
})
