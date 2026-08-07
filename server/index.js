require('dotenv').config()
const express = require('express')
const cors = require('cors')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const { v4: uuidv4 } = require('uuid')
const initSqlJs = require('sql.js')
const jwt = require('jsonwebtoken')
// 公共鉴权中间件（requireAuth / requireAdmin / isRequestFromAdmin）
const { requireAuth, requireAdmin, isRequestFromAdmin } = require('./middleware/auth')
// 数据库事务辅助函数（多步操作保证原子性）
const { runTransaction } = require('./middleware/db')
// 云同步模块（发布模板时自动同步到云数据库 + 云存储）
const cloudSync = require('./cloudSync')

const app = express()
// 信任反向代理（Nginx 等）的第一层代理，确保 req.ip / req.protocol 能正确获取真实客户端信息
app.set('trust proxy', 1)
const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('\n❌ 错误: 请设置环境变量 JWT_SECRET')
  console.error('   示例: JWT_SECRET=your-secret-key npm start\n')
  process.exit(1)
}

// ============ 微信小程序配置 ============
const WECHAT_APPID = process.env.WECHAT_APPID || ''
const WECHAT_SECRET = process.env.WECHAT_SECRET || ''

async function jscode2session(code) {
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${encodeURIComponent(WECHAT_APPID)}&secret=${encodeURIComponent(WECHAT_SECRET)}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`
  try {
    const resp = await fetch(url)
    const data = await resp.json()
    if (data.errcode) {
      throw new Error(`微信登录验证失败: ${data.errmsg || data.errcode}`)
    }
    return data
  } catch (e) {
    if (e.message.startsWith('微信登录验证失败')) throw e
    throw new Error('调用微信登录验证接口失败')
  }
}

function decryptWeChatData(sessionKey, encryptedData, iv) {
  try {
    const sessionKeyBuf = Buffer.from(sessionKey, 'base64')
    const encryptedDataBuf = Buffer.from(encryptedData, 'base64')
    const ivBuf = Buffer.from(iv, 'base64')
    const decipher = crypto.createDecipheriv('aes-128-cbc', sessionKeyBuf, ivBuf)
    decipher.setAutoPadding(false)
    let decrypted = decipher.update(encryptedDataBuf)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    const pad = decrypted[decrypted.length - 1]
    decrypted = decrypted.slice(0, decrypted.length - pad)
    return JSON.parse(decrypted.toString('utf8'))
  } catch (e) {
    throw new Error('解密微信手机号失败')
  }
}

let SQL, db
// 允许通过环境变量覆盖数据库路径（测试时指向临时文件，避免污染真实 data.db）
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.db')

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
    status TEXT DEFAULT 'draft',
    renderedImage TEXT DEFAULT '',
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

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL,
    nickname TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    vip_status INTEGER DEFAULT 0,
    vip_expire_at INTEGER,
    vip_plan TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event TEXT NOT NULL,
    user_id TEXT,
    session_id TEXT,
    timestamp INTEGER,
    params TEXT,
    platform TEXT,
    version TEXT
  )`)

  // 收藏表
  db.run(`CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    work_id TEXT NOT NULL,
    template_id TEXT DEFAULT '',
    title TEXT DEFAULT '',
    image TEXT DEFAULT '',
    createdAt TEXT NOT NULL
  )`)

  // 足迹表
  db.run(`CREATE TABLE IF NOT EXISTS footprints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    template_id TEXT NOT NULL,
    template_name TEXT DEFAULT '',
    template_cover TEXT DEFAULT '',
    timestamp INTEGER NOT NULL
  )`)

  // 通知表
  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    type TEXT DEFAULT 'system',
    read INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL
  )`)

  // 反馈表
  db.run(`CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    content TEXT NOT NULL,
    contact TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    createdAt TEXT NOT NULL
  )`)

  // 回收站表
  db.run(`CREATE TABLE IF NOT EXISTS recycle_bin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    work_id TEXT NOT NULL,
    work_data TEXT NOT NULL,
    deletedAt TEXT NOT NULL
  )`)

  // 作品表
  db.run(`CREATE TABLE IF NOT EXISTS works (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL,
    template_id TEXT DEFAULT '',
    template_type TEXT DEFAULT 'canvas',
    title TEXT DEFAULT '',
    data TEXT DEFAULT '{}',
    music_id TEXT DEFAULT '',
    cover TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`)

  // 迁移：为旧数据库添加 status 和 renderedImage 列
  try { db.run("ALTER TABLE templates ADD COLUMN status TEXT DEFAULT 'draft'") } catch (_) {}
  try { db.run("ALTER TABLE templates ADD COLUMN renderedImage TEXT DEFAULT ''") } catch (_) {}
  // 迁移：为旧数据库添加 monetization 字段
  try { db.run("ALTER TABLE templates ADD COLUMN is_paid INTEGER DEFAULT 0") } catch (_) {}
  try { db.run("ALTER TABLE templates ADD COLUMN price INTEGER DEFAULT 0") } catch (_) {}
  try { db.run("ALTER TABLE templates ADD COLUMN is_premium INTEGER DEFAULT 0") } catch (_) {}
  // 迁移：添加 templateType 和 pages 字段，支持翻页模式模板
  try { db.run("ALTER TABLE templates ADD COLUMN templateType TEXT DEFAULT 'canvas'") } catch (_) {}
  try { db.run("ALTER TABLE templates ADD COLUMN pages TEXT DEFAULT '[]'") } catch (_) {}
  // 迁移：添加 vipLevel 字段，支持 VIP 等级（free/personal/pro）
  try { db.run("ALTER TABLE templates ADD COLUMN vipLevel TEXT DEFAULT 'free'") } catch (_) {}
  // 迁移：为 orders 表添加 paid_at 字段
  try { db.run("ALTER TABLE orders ADD COLUMN paid_at TEXT") } catch (_) {}
  // 已有模板全部标记为 published
  db.run("UPDATE templates SET status = 'published' WHERE status IS NULL OR status = ''")

  // 创建索引
  db.run("CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category)")
  db.run("CREATE INDEX IF NOT EXISTS idx_templates_name ON templates(name)")
  db.run("CREATE INDEX IF NOT EXISTS idx_templates_templateType ON templates(category, name)")
  db.run("CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone)")
  db.run("CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)")
  db.run("CREATE INDEX IF NOT EXISTS idx_favorites_phone ON favorites(phone)")
  db.run("CREATE INDEX IF NOT EXISTS idx_footprints_phone ON footprints(phone)")
  db.run("CREATE INDEX IF NOT EXISTS idx_notifications_phone ON notifications(phone)")
  db.run("CREATE INDEX IF NOT EXISTS idx_feedback_phone ON feedback(phone)")
  db.run("CREATE INDEX IF NOT EXISTS idx_recycle_bin_phone ON recycle_bin(phone)")
  db.run("CREATE INDEX IF NOT EXISTS idx_works_phone ON works(phone)")
  db.run("CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)")
  db.run("CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id)")
  db.run("CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id)")
  db.run("CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)")
  db.run("CREATE INDEX IF NOT EXISTS idx_templates_status ON templates(status)")
  db.run("CREATE INDEX IF NOT EXISTS idx_templates_is_paid ON templates(is_paid)")
  db.run("CREATE INDEX IF NOT EXISTS idx_templates_updatedAt ON templates(updatedAt)")
  db.run("CREATE INDEX IF NOT EXISTS idx_orders_createdAt ON orders(createdAt)")
  db.run("CREATE INDEX IF NOT EXISTS idx_favorites_phone_createdAt ON favorites(phone, createdAt)")
  db.run("CREATE INDEX IF NOT EXISTS idx_footprints_phone_timestamp ON footprints(phone, timestamp)")
  db.run("CREATE INDEX IF NOT EXISTS idx_footprints_phone_template_timestamp ON footprints(phone, template_id, timestamp)")
  db.run("CREATE INDEX IF NOT EXISTS idx_notifications_phone_createdAt ON notifications(phone, createdAt)")
  db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_phone_work_id ON favorites(phone, work_id)")

  saveDatabase()
}

function saveDatabase() {
  try {
    const data = db.export()
    const buffer = Buffer.from(data)
    // 先写入临时文件，再原子重命名
    const tmpPath = DB_PATH + '.tmp'
    fs.writeFileSync(tmpPath, buffer)
    fs.renameSync(tmpPath, DB_PATH)
  } catch (e) {
    console.error('saveDatabase 失败:', e)
  }
}

// 防抖保存：延迟 500ms，避免短时间内多次写操作重复保存文件
let _saveTimer = null
function saveDatabaseDebounced() {
  if (_saveTimer) clearTimeout(_saveTimer)
  _saveTimer = setTimeout(() => {
    try {
      saveDatabase()
    } catch (e) {
      console.error('saveDatabase 失败:', e)
    }
    _saveTimer = null
  }, 500)
}

function getVersion() {
  const row = db.exec("SELECT value FROM settings WHERE key = 'version'")
  return row.length ? parseInt(row[0].values[0][0], 10) : 1
}

function setVersion(v) {
  db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('version', ?)", [String(v)])
}
// ============ 中间件 ============
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:5172', 'http://localhost:5173', 'http://127.0.0.1:5172', 'http://127.0.0.1:5173']
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsOrigins.includes(origin) || process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
}))
// 默认 JSON 解析器（5mb），需要更大 body 的上传路由在各自路由内使用 largeJsonParser
const defaultJsonParser = express.json({ limit: '5mb' })
// 大 body 解析器（15mb），用于 base64 图片上传等场景
const largeJsonParser = express.json({ limit: '15mb' })
app.use((req, res, next) => {
  // poster 上传路由使用 15mb 限制（base64 编码的图片），其余路由使用默认 5mb
  if (req.method === 'POST' && /^\/api\/poster\/works\/[^/]+\/upload$/.test(req.path)) {
    return largeJsonParser(req, res, next)
  }
  defaultJsonParser(req, res, next)
})
app.use((req, res, next) => {
  const auth = req.headers.authorization
  if (auth && auth.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(auth.slice(7), JWT_SECRET)
    } catch (_) {}
  }
  next()
})
// 静态文件安全头
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  next()
})
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
  setHeaders: (res, path) => {
    if (path.match(/\.(jpg|jpeg|png|gif|webp|mp3|wav|ogg|ttf|otf|woff|woff2)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable')
    }
  }
}))
app.use('/uploads/music', express.static(path.join(__dirname, 'music'), {
  maxAge: '7d',
  setHeaders: (res, path) => {
    if (path.match(/\.(mp3|wav|ogg|aac)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable')
    }
  }
}))

// ============ Poster uploads static serving ============
const POSTER_UPLOADS_DIR = path.join(__dirname, 'uploads', 'poster')
if (!fs.existsSync(POSTER_UPLOADS_DIR)) fs.mkdirSync(POSTER_UPLOADS_DIR, { recursive: true })

// 从项目根目录 uploads/poster/ 同步缺失的静态资源到 server/uploads/poster/
const ROOT_POSTER_DIR = path.join(__dirname, '..', 'uploads', 'poster')
if (fs.existsSync(ROOT_POSTER_DIR)) {
  function syncDir(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
    fs.readdirSync(src).forEach(file => {
      const srcPath = path.join(src, file)
      const destPath = path.join(dest, file)
      if (fs.statSync(srcPath).isDirectory()) {
        syncDir(srcPath, destPath)
      } else if (!fs.existsSync(destPath)) {
        fs.copyFileSync(srcPath, destPath)
      }
    })
  }
  try { syncDir(ROOT_POSTER_DIR, POSTER_UPLOADS_DIR) } catch (e) { console.warn('同步poster资源:', e.message) }
}

app.use('/uploads/poster', express.static(POSTER_UPLOADS_DIR, {
  maxAge: '7d',
  setHeaders: (res, path) => {
    if (path.match(/\.(jpg|jpeg|png|gif|webp|mp3|wav|ogg|ttf|otf|woff|woff2)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable')
    }
  }
}))

// ============ 慢请求日志中间件（仅记录 >1s 的请求） ============
// 必须在所有路由挂载之前注册，否则挂载在它之前的路由（如 poster）不会被记录
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    if (duration > 1000) {
      console.warn(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} ${duration}ms (SLOW)`)
    }
  })
  next()
})

// ============ Poster routes ============
const posterRouter = require('./routes/poster')
app.use('/api/poster', posterRouter)
// 获取 poster 数据库实例（用于跨库的回收站恢复/永久删除操作）
function getPosterDb() {
  return posterRouter.getPosterDb ? posterRouter.getPosterDb() : null
}

// ============ 鉴权中间件 ============
// requireAuth / requireAdmin / isRequestFromAdmin 已从 ./middleware/auth 导入（见文件顶部）

// ============ 字体目录 ============
const FONTS_DIR = path.join(__dirname, 'uploads', 'fonts')
if (!fs.existsSync(FONTS_DIR)) fs.mkdirSync(FONTS_DIR, { recursive: true })
app.use('/uploads/fonts', express.static(FONTS_DIR))

// IP 限流中间件工厂：默认 10 次/分钟，可按路由配置上限(max)与窗口(windowMs)
// 同一工厂产出的中间件各自维护独立计数，避免不同接口共享同一限流计数互相干扰
function rateLimit({ max = 10, windowMs = 60000 } = {}) {
  const attempts = {}
  let lastCleanup = Date.now()

  return function rateLimitMiddleware(req, res, next) {
    const ip = req.ip || (req.socket && req.socket.remoteAddress) || (req.connection && req.connection.remoteAddress) || 'unknown'
    const now = Date.now()

    // 惰性清理：每5分钟清理一次过期 IP 条目，避免每次请求都遍历所有 IP
    if (now - lastCleanup > 5 * 60 * 1000) {
      Object.keys(attempts).forEach(key => {
        const list = attempts[key]
        if (!list || !list.length || now - list[list.length - 1] > windowMs) {
          delete attempts[key]
        }
      })
      lastCleanup = now
    }

    // 仅保留窗口期内的请求时间戳（先过滤，避免 delete 后再访问导致的 undefined.push 错误）
    attempts[ip] = (attempts[ip] || []).filter(t => now - t < windowMs)
    if (attempts[ip].length >= max) {
      return res.status(429).json({ success: false, error: '请求过于频繁，请稍后再试' })
    }
    attempts[ip].push(now)
    next()
  }
}

// 敏感接口的限流器：上传/支付/创建类操作分别使用独立限流计数，避免互相干扰
const uploadLimiter = rateLimit({ max: 20, windowMs: 60000 })  // 20 uploads/min
const payLimiter = rateLimit({ max: 10, windowMs: 60000 })    // 10 payments/min
const createLimiter = rateLimit({ max: 30, windowMs: 60000 }) // 30 creates/min

// withTransaction 已被导入的 runTransaction 替代（见文件顶部，从 ./middleware/db 导入）

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
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp3', '.wav', '.ogg', '.aac', '.ttf', '.otf', '.woff', '.woff2']
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'font/ttf', 'font/otf', 'font/woff', 'font/woff2', 'application/octet-stream']
    const ext = path.extname(file.originalname).toLowerCase()
    const mime = file.mimetype || ''
    if (allowedExts.includes(ext) && (allowedMimes.includes(mime) || !mime)) {
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
      ['engagement', '求婚', '💍'],
      ['creative', '商量茶', '🍵'],
      ['birthday', '割礼', '🎁'],
      ['poster', '耳环礼', '💎'],
      ['baby', '周岁宴', '🎉'],
      ['study', '升学宴', '🎓'],
      ['festival-invitation', '节日请柬', '🎊'],
      ['house', '乔迁', '🏠'],
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

// 健康检查（放在所有路由之前，不受鉴权中间件影响，便于容器/Docker 健康探测）
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() })
})

// 短信验证码存储（生产环境应使用 Redis）
const smsCodes = {}
setInterval(() => {
  const now = Date.now()
  Object.keys(smsCodes).forEach(k => { if (now - smsCodes[k].time > 300000) delete smsCodes[k] })
}, 60000)

// 微信登录 IP 限流计数器：记录同一 IP 每小时创建微信用户的次数（防止滥用）
const wxLoginIpCounter = {} // { ip: [timestamp, ...] }
setInterval(() => {
  const now = Date.now()
  // 清理超过 1 小时的记录，避免内存泄漏
  Object.keys(wxLoginIpCounter).forEach(ip => {
    wxLoginIpCounter[ip] = (wxLoginIpCounter[ip] || []).filter(t => now - t < 3600000)
    if (!wxLoginIpCounter[ip].length) delete wxLoginIpCounter[ip]
  })
}, 60000)

// 发送验证码
app.post('/api/sms/send', rateLimit(), (req, res) => {
  const { phone } = req.body
  if (!phone || phone.length < 11) {
    return res.status(400).json({ success: false, error: '请输入正确的手机号' })
  }
  const code = String(Math.floor(100000 + Math.random() * 900000))
  smsCodes[phone] = { code, time: Date.now() }
  // 仅在非生产环境打印验证码，且只显示手机号后4位，避免明文泄露
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n📱 [验证码] ${phone.slice(-4)} → ${code}\n`)
  }
  res.json({ success: true, message: '验证码已发送' })
})

// 用户登录
app.post('/api/user/login', rateLimit(), async (req, res) => {
  const { phone, code } = req.body

  // 微信小程序登录（encryptedData 模式）
  if (req.body.encryptedData && req.body.code) {
    const encryptedData = req.body.encryptedData
    const iv = req.body.iv || ''

    // 基本防护：对 encryptedData 做格式校验
    if (typeof encryptedData !== 'string' || encryptedData.length === 0 || encryptedData.length > 10 * 1024) {
      return res.status(400).json({ success: false, error: 'encryptedData 格式不正确' })
    }

    // 基本防护：限制同一 IP 每小时最多创建 5 个微信用户
    const clientIp = req.ip || (req.socket && req.socket.remoteAddress) || (req.connection && req.connection.remoteAddress) || 'unknown'
    const nowMs = Date.now()
    const recentWxLogins = (wxLoginIpCounter[clientIp] || []).filter(t => nowMs - t < 3600000)
    if (recentWxLogins.length >= 5) {
      return res.status(429).json({ success: false, error: '微信登录过于频繁，请稍后再试' })
    }
    recentWxLogins.push(nowMs)
    wxLoginIpCounter[clientIp] = recentWxLogins

    // 配置了微信 AppID/Secret 时进行真实服务端验签
    if (WECHAT_APPID && WECHAT_SECRET) {
      try {
        const wxResult = await jscode2session(req.body.code)
        const sessionKey = wxResult.session_key
        const openid = wxResult.openid

        let userPhone = ''
        if (encryptedData && iv) {
          try {
            const decrypted = decryptWeChatData(sessionKey, encryptedData, iv)
            userPhone = decrypted.phoneNumber || ''
          } catch (e) {
            console.warn('[微信] 解密手机号失败，使用 openid 作为标识')
          }
        }

        const userId = userPhone || ('wx_' + openid)
        const existingUser = db.exec("SELECT id, nickname, vip_status, vip_expire_at FROM users WHERE phone = ?", [userId])
        const token = jwt.sign({ phone: userId, role: 'user' }, JWT_SECRET, { expiresIn: '30d' })
        const now = new Date().toISOString()

        if (existingUser.length && existingUser[0].values.length) {
          return res.json({
            success: true,
            data: {
              token,
              nickname: existingUser[0].values[0][1] || '微信用户',
              phone: userId,
              vip_status: existingUser[0].values[0][2],
              vip_expire_at: existingUser[0].values[0][3],
            },
          })
        }

        db.run(`INSERT INTO users (id, phone, nickname, avatar, vip_status, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)`, [
          uuidv4(), userId, '微信用户', '', 0, now, now,
        ])
        db.run("INSERT INTO notifications (phone, title, content, type, createdAt) VALUES (?, ?, ?, ?, ?)",
          [userId, '欢迎使用TOYtamaxia', '感谢您的注册，快来制作您的第一张请柬吧！', 'system', now])
        saveDatabaseDebounced()
        return res.json({ success: true, data: { token, nickname: '微信用户', phone: userId, vip_status: 0, vip_expire_at: null } })
      } catch (e) {
        console.error('[微信] 登录验证失败:', e.message)
        return res.status(500).json({ success: false, error: e.message || '微信登录验证失败' })
      }
    }

    // 未配置微信 AppID/Secret 时使用演示模式
    console.warn('[微信] 未配置 WECHAT_APPID/WECHAT_SECRET，使用演示模式')
    const wechatId = 'wx_' + crypto.createHash('md5').update(encryptedData).digest('hex').slice(0, 16)
    const existingUser = db.exec("SELECT id, nickname, vip_status, vip_expire_at FROM users WHERE phone = ?", [wechatId])
    if (existingUser.length && existingUser[0].values.length) {
      const token = jwt.sign({ phone: wechatId, role: 'user' }, JWT_SECRET, { expiresIn: '30d' })
      return res.json({ success: true, data: { token, nickname: existingUser[0].values[0][1], phone: wechatId, vip_status: existingUser[0].values[0][2], vip_expire_at: existingUser[0].values[0][3] } })
    }
    const token = jwt.sign({ phone: wechatId, role: 'user' }, JWT_SECRET, { expiresIn: '30d' })
    const now = new Date().toISOString()
    db.run(`INSERT INTO users (id, phone, nickname, avatar, vip_status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)`, [
      uuidv4(), wechatId, '微信用户', '', 0, now, now,
    ])
    db.run("INSERT INTO notifications (phone, title, content, type, createdAt) VALUES (?, ?, ?, ?, ?)",
      [wechatId, '欢迎使用TOYtamaxia', '感谢您的注册，快来制作您的第一张请柬吧！', 'system', now])
    saveDatabaseDebounced()
    return res.json({ success: true, data: { token, nickname: '微信用户', phone: wechatId, vip_status: 0, vip_expire_at: null } })
  }

  // 手机号+验证码登录
  if (phone) {
    if (!code) return res.status(400).json({ success: false, error: '请输入验证码' })
    // 开发环境使用万能验证码（仅非 production 环境生效，通过 DEV_CODE 环境变量控制）
    const isDev = process.env.NODE_ENV !== 'production'
    const devCode = isDev ? (process.env.DEV_CODE || '000000') : null
    if (!isDev || code !== devCode) {
      const stored = smsCodes[phone]
      if (!stored) return res.status(400).json({ success: false, error: '请先获取验证码' })
      if (Date.now() - stored.time > 300000) {
        delete smsCodes[phone]
        return res.status(400).json({ success: false, error: '验证码已过期，请重新获取' })
      }
      if (stored.code !== code) return res.status(400).json({ success: false, error: '验证码错误' })
      delete smsCodes[phone]
    }

    // 如果手机号为管理员账号（ADMIN_PHONE），签发的 JWT 中 role 设为 'admin'
    const adminPhone = process.env.ADMIN_PHONE || '13800138000'
    const role = phone === adminPhone ? 'admin' : 'user'
    const token = jwt.sign({ phone, role }, JWT_SECRET, { expiresIn: '30d' })
    const now = new Date().toISOString()
    const userCheck = db.exec("SELECT id FROM users WHERE phone = ?", [phone])
    if (!userCheck.length || !userCheck[0].values.length) {
      db.run(`INSERT INTO users (id, phone, nickname, avatar, vip_status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)`, [
        uuidv4(), phone, phone.substring(0, 3) + '****' + phone.substring(7), '', 0, now, now,
      ])
      db.run("INSERT INTO notifications (phone, title, content, type, createdAt) VALUES (?, ?, ?, ?, ?)",
        [phone, '欢迎使用TOYtamaxia', '感谢您的注册，快来制作您的第一张请柬吧！', 'system', now])
      saveDatabaseDebounced()
    }
    // 查询用户 VIP 状态并返回
    let vipStatus = 0, vipExpireAt = null
    const vipResult = db.exec("SELECT vip_status, vip_expire_at FROM users WHERE phone = ?", [phone])
    if (vipResult.length && vipResult[0].values.length) {
      vipStatus = vipResult[0].values[0][0]
      vipExpireAt = vipResult[0].values[0][1]
    }
    return res.json({
      success: true,
      data: {
        token,
        nickname: phone.substring(0, 3) + '****' + phone.substring(7),
        phone,
        vip_status: vipStatus,
        vip_expire_at: vipExpireAt,
      },
    })
  }

  res.status(400).json({ success: false, error: '缺少登录参数' })
})

// 管理员专用登录接口：验证手机号为 ADMIN_PHONE 后签发带 role:'admin' 的 JWT
app.post('/api/admin/login', rateLimit(), (req, res) => {
  const { phone, code } = req.body
  if (!phone) {
    return res.status(400).json({ success: false, error: '请输入手机号' })
  }
  const adminPhone = process.env.ADMIN_PHONE || '13800138000'
  // 校验手机号是否为管理员账号
  if (phone !== adminPhone) {
    return res.status(403).json({ success: false, error: '该账号无管理员权限' })
  }
  if (!code) {
    return res.status(400).json({ success: false, error: '请输入验证码' })
  }
  // 验证码校验：开发环境支持 DEV_CODE 万能码，生产环境仅校验短信验证码
  const isDev = process.env.NODE_ENV !== 'production'
  const devCode = isDev ? (process.env.DEV_CODE || '000000') : null
  if (!isDev || code !== devCode) {
    const stored = smsCodes[phone]
    if (!stored) {
      return res.status(400).json({ success: false, error: '请先获取验证码' })
    }
    if (Date.now() - stored.time > 300000) {
      delete smsCodes[phone]
      return res.status(400).json({ success: false, error: '验证码已过期，请重新获取' })
    }
    if (stored.code !== code) {
      return res.status(400).json({ success: false, error: '验证码错误' })
    }
    delete smsCodes[phone]
  }
  // 签发管理员令牌（role: 'admin'，有效期 7 天）
  const token = jwt.sign({ phone, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ success: true, data: { token, phone } })
})

// 事件追踪
app.post('/api/track', rateLimit({ max: 60, windowMs: 60000 }), (req, res) => {
  try {
    const { event, params, platform, version } = req.body
    if (!event) {
      return res.status(400).json({ success: false, error: '缺少 event 字段' })
    }
    const sessionId = req.headers['x-session-id'] || req.headers['session-id'] || uuidv4()
    const userId = req.user?.phone || null
    const timestamp = Date.now()
    db.run(`INSERT INTO events (event, user_id, session_id, timestamp, params, platform, version)
      VALUES (?, ?, ?, ?, ?, ?, ?)`, [
      event, userId, sessionId, timestamp,
      params ? JSON.stringify(params) : null,
      platform || '',
      version || '',
    ])
    saveDatabaseDebounced()
    res.json({ success: true })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// 用户信息
app.get('/api/user/info', (req, res) => {
  try {
    const phone = req.user?.phone || ''
    if (!phone) {
      return res.json({
        success: true,
        data: { nickname: '用户', phone: '', avatar: '', vip_status: 0, vip_expire_at: null, vip_plan: null },
      })
    }
    const result = db.exec("SELECT * FROM users WHERE phone = ?", [phone])
    if (result.length && result[0].values.length) {
      const user = rowToObject(result)
      if (user.vip_status === 1 && user.vip_expire_at && Date.now() > parseInt(user.vip_expire_at, 10)) {
        db.run("UPDATE users SET vip_status = 0, updatedAt = ? WHERE phone = ?",
          [new Date().toISOString(), phone])
        saveDatabaseDebounced()
        user.vip_status = 0
      }
      res.json({ success: true, data: user })
    } else {
      res.json({
        success: true,
        data: { nickname: '用户', phone, avatar: '', vip_status: 0, vip_expire_at: null, vip_plan: null },
      })
    }
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// 获取分类列表
app.get('/api/categories', (req, res) => {
  try {
    const result = db.exec("SELECT id, name, icon FROM categories")
    const cats = result.length ? result[0].values.map(row => ({
      id: row[0], name: row[1], icon: row[2],
      count: 0,
    })) : []

    const countResult = db.exec("SELECT category, COUNT(*) as c FROM templates WHERE status = 'published' GROUP BY category")
    const counts = {}
    if (countResult.length) {
      countResult[0].values.forEach(row => { counts[row[0]] = row[1] })
    }

    cats.forEach(c => { c.count = counts[c.id] || 0 })

    res.json({ success: true, data: cats })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// 获取全部模板（支持分页 ?page=1&limit=20&category=xxx&search=xxx）
app.get('/api/templates', (req, res) => {
  try {
    const params = []
    const conditions = []

    // 默认只返回已发布的模板；admin 传 ?all=true 且通过管理员鉴权时返回全部
    if (!(req.query.all && isRequestFromAdmin(req))) {
      conditions.push("status = 'published'")
    }
    // 支持 is_paid=1 只返回付费模板；?includePaid=1 返回全部；默认返回所有模板（含付费）供前端控制显示
    if (req.query.is_paid === '1') {
      conditions.push("is_paid = 1")
    } else if (req.query.is_paid === '0') {
      conditions.push("is_paid = 0")
    }

    if (req.query.category) {
      conditions.push("category = ?")
      params.push(req.query.category)
    }

    if (req.query.search) {
      // 转义 LIKE 通配符（% 和 _），避免搜索关键词中的特殊字符被当作通配符
      const escapedSearch = req.query.search.replace(/([%_\\])/g, '\\$1')
      conditions.push("name LIKE ? ESCAPE '\\'")
      params.push(`%${escapedSearch}%`)
    }

    // 统一构建 WHERE 子句，数据查询与计数查询共用，避免字符串替换的脆弱性
    const whereClause = conditions.length ? " WHERE " + conditions.join(" AND ") : ""
    const dataSql = "SELECT * FROM templates" + whereClause + " ORDER BY updatedAt DESC"

    // 分页参数：limit 统一上限 100，防止恶意请求超大分页
    const page = parseInt(req.query.page, 10)
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20)

    // 有分页参数时返回分页格式
    if (page > 0 && limit > 0) {
      // 查询总数：直接构建 COUNT 查询，不依赖字符串替换
      const countSql = "SELECT COUNT(*) as total FROM templates" + whereClause
      const countResult = db.exec(countSql, params)
      const total = countResult.length && countResult[0].values.length ? countResult[0].values[0][0] : 0
      const totalPages = Math.ceil(total / limit)
      const offset = (page - 1) * limit

      const paginatedSql = dataSql + " LIMIT ? OFFSET ?"
      const paginatedParams = [...params, limit, offset]
      const result = db.exec(paginatedSql, paginatedParams)
      const templates = result.length ? result[0].values.map(row => {
        const cols = result[0].columns
        const obj = {}
        row.forEach((val, i) => {
          if (cols[i] === 'data' || cols[i] === 'elements' || cols[i] === 'tags' || cols[i] === 'canvasSize' || cols[i] === 'background' || cols[i] === 'pages') {
            try { obj[cols[i]] = JSON.parse(val) } catch { obj[cols[i]] = val }
          } else {
            obj[cols[i]] = val
          }
        })
        return obj
      }) : []

      return res.json({
        success: true,
        data: templates,
        pagination: { page, limit, total, totalPages },
      })
    }

    // 无分页参数时保持原有行为（返回全部）
    const result = db.exec(dataSql, params)
    const templates = result.length ? result[0].values.map(row => {
      const cols = result[0].columns
      const obj = {}
      row.forEach((val, i) => {
        if (cols[i] === 'data' || cols[i] === 'elements' || cols[i] === 'tags' || cols[i] === 'canvasSize' || cols[i] === 'background' || cols[i] === 'pages') {
          try { obj[cols[i]] = JSON.parse(val) } catch { obj[cols[i]] = val }
        } else {
          obj[cols[i]] = val
        }
      })
      return obj
    }) : []

    res.json({ success: true, data: templates, total: templates.length })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// 记录足迹（同一用户同一模板 24 小时内不重复记录，避免浏览产生大量重复数据）
function recordFootprint(phone, templateId, templateName, templateCover) {
  const since = Date.now() - 86400000
  const existing = db.exec(
    "SELECT id FROM footprints WHERE phone = ? AND template_id = ? AND timestamp > ?",
    [phone, templateId, since]
  )
  if (existing.length && existing[0].values.length) return false
  db.run(
    "INSERT INTO footprints (phone, template_id, template_name, template_cover, timestamp) VALUES (?, ?, ?, ?, ?)",
    [phone, templateId, templateName || '', templateCover || '', Date.now()]
  )
  saveDatabaseDebounced()
  return true
}

// ========== 相似模板 ==========
// 注意：此路由必须注册在 /api/templates/:id 之前，否则 'similar' 会被当作 :id 参数匹配
app.get('/api/templates/similar', (req, res) => {
  try {
    const { templateId } = req.query
    if (!templateId) {
      return res.json({ success: true, data: [] })
    }
    const tmplResult = db.exec("SELECT category FROM templates WHERE id = ?", [templateId])
    const category = tmplResult.length && tmplResult[0].values.length ? tmplResult[0].values[0][0] : ''
    const result = db.exec(
      "SELECT * FROM templates WHERE status = 'published' AND id != ? AND category = ? ORDER BY likes DESC LIMIT 6",
      [templateId, category]
    )
    const templates = result.length ? result[0].values.map(row => {
      const cols = result[0].columns
      const obj = {}
      row.forEach((val, i) => {
        if (['data', 'elements', 'tags', 'canvasSize', 'background', 'pages'].includes(cols[i])) {
          try { obj[cols[i]] = JSON.parse(val) } catch { obj[cols[i]] = val }
        } else {
          obj[cols[i]] = val
        }
      })
      return obj
    }) : []
    res.json({ success: true, data: templates })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// 获取单个模板
app.get('/api/templates/:id', (req, res) => {
  try {
    // 普通用户只能访问已发布模板；管理员可访问任意状态（含 draft/deleted）以便编辑
    const sql = isRequestFromAdmin(req)
      ? "SELECT * FROM templates WHERE id = ?"
      : "SELECT * FROM templates WHERE id = ? AND status = 'published'"
    const result = db.exec(sql, [req.params.id])
    if (!result.length || !result[0].values.length) {
      return res.status(404).json({ success: false, error: '模板不存在' })
    }
    const row = result[0].values[0]
    const cols = result[0].columns
    const obj = {}
    row.forEach((val, i) => {
      if (cols[i] === 'data' || cols[i] === 'elements' || cols[i] === 'tags' || cols[i] === 'canvasSize' || cols[i] === 'background' || cols[i] === 'pages') {
        try { obj[cols[i]] = JSON.parse(val) } catch { obj[cols[i]] = val }
      } else {
        obj[cols[i]] = val
      }
    })
    const phone = req.user?.phone
    if (phone) {
      // 自动记录足迹（24 小时内同一模板不重复）
      recordFootprint(phone, obj.id, obj.name || '', obj.cover || '')
    }
    res.json({ success: true, data: obj })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// 上传文件
app.post('/api/upload', uploadLimiter, requireAuth, upload.array('images', 10), (req, res) => {
  try {
    const protocol = req.protocol
    const host = req.get('host')
    const files = req.files.map(f => ({
      filename: f.filename,
      originalName: f.originalname,
      url: `${protocol}://${host}/uploads/${f.filename}`,
      size: f.size,
    }))
    res.json({ success: true, data: files })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// 上传单张图片（小程序编辑器专用）
app.post('/api/upload/image', uploadLimiter, requireAuth, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '未收到图片文件' })
    }
    const protocol = req.protocol
    const host = req.get('host')
    const fullUrl = `${protocol}://${host}/uploads/${req.file.filename}`
    res.json({ success: true, url: fullUrl })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '图片上传失败' })
  }
})

// 上传字体
const fontStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(FONTS_DIR)) fs.mkdirSync(FONTS_DIR, { recursive: true })
    cb(null, FONTS_DIR)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${uuidv4()}${ext}`)
  },
})
const fontUpload = multer({
  storage: fontStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.ttf', '.otf', '.woff', '.woff2']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error('不支持的字体格式，请上传 ttf/otf/woff/woff2'))
  },
})

app.post('/api/fonts/upload', uploadLimiter, requireAuth, fontUpload.array('fonts', 10), (req, res) => {
  try {
    const protocol = req.protocol
    const host = req.get('host')
    const files = req.files.map(f => ({
      filename: f.filename,
      originalName: f.originalname,
      url: `${protocol}://${host}/uploads/fonts/${f.filename}`,
      size: f.size,
    }))
    // 更新字体映射表
    const mapPath = path.join(FONTS_DIR, 'font-map.json')
    let fontMap = {}
    if (fs.existsSync(mapPath)) fontMap = JSON.parse(fs.readFileSync(mapPath, 'utf-8'))
    files.forEach((f, i) => {
      const name = req.body.name || req.body.names?.[i] || f.originalName.replace(/\.[^.]+$/, '')
      fontMap[name] = f.url
    })
    fs.writeFileSync(mapPath, JSON.stringify(fontMap, null, 2))
    res.json({ success: true, data: files })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// 获取已上传字体列表（含映射）
app.get('/api/fonts', (req, res) => {
  try {
    const mapPath = path.join(FONTS_DIR, 'font-map.json')
    let fontMap = {}
    if (fs.existsSync(mapPath)) fontMap = JSON.parse(fs.readFileSync(mapPath, 'utf-8'))
    // 将对象 { name: url } 转为数组 [{ filename, url, size }]，与 Admin 端期望格式一致
    const fontList = Object.entries(fontMap).map(([name, url]) => ({
      filename: name,
      url: url,
      size: 0,
    }))
    res.json({ success: true, data: fontList })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})
const musicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const musicUploadDir = path.join(__dirname, 'uploads', 'music')
    if (!fs.existsSync(musicUploadDir)) fs.mkdirSync(musicUploadDir, { recursive: true })
    cb(null, musicUploadDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${uuidv4()}${ext}`)
  },
})
const musicUpload = multer({
  storage: musicStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp3', '.wav', '.ogg', '.aac']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error('不支持的音乐格式，请上传 mp3/wav/ogg/aac'))
  },
})

app.post('/api/music/upload', uploadLimiter, requireAuth, musicUpload.array('music', 10), (req, res) => {
  try {
    const protocol = req.protocol
    const host = req.get('host')
    const files = req.files.map(f => ({
      filename: f.filename,
      originalName: f.originalname,
      url: `${protocol}://${host}/uploads/music/${f.filename}`,
      size: f.size,
    }))
    files.forEach(f => {
      db.run("INSERT INTO music (name, tag, src, hot) VALUES (?, ?, ?, 0)",
        [f.originalName.replace(/\.[^.]+$/, ''), '本地上传', f.url])
    })
    saveDatabaseDebounced()
    res.json({ success: true, data: files })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// 获取音乐列表
app.get('/api/music', (req, res) => {
  try {
    let sql = "SELECT id, name, tag, src, hot FROM music"
    const params = []
    const conditions = []
    if (req.query.tag && req.query.tag !== '全部') {
      conditions.push("tag = ?")
      params.push(req.query.tag)
    }
    if (conditions.length) {
      sql += " WHERE " + conditions.join(" AND ")
    }
    sql += " ORDER BY hot DESC, id ASC"

    const page = parseInt(req.query.page, 10)
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20)

    if (page > 0 && limit > 0) {
      const countSql = "SELECT COUNT(*) as total FROM music" + (conditions.length ? " WHERE " + conditions.join(" AND ") : "")
      const countResult = db.exec(countSql, [...params])
      const total = countResult.length && countResult[0].values.length ? countResult[0].values[0][0] : 0
      const totalPages = Math.ceil(total / limit)
      const offset = (page - 1) * limit

      const paginatedSql = sql + " LIMIT ? OFFSET ?"
      const paginatedParams = [...params, limit, offset]
      const result = db.exec(paginatedSql, paginatedParams)
      const list = result.length ? result[0].values.map(row => ({
        id: row[0], name: row[1], tag: row[2], src: row[3], hot: !!row[4],
      })) : []

      return res.json({
        success: true,
        data: list,
        pagination: { page, limit, total, totalPages },
      })
    }

    const result = db.exec(sql, params)
    const list = result.length ? result[0].values.map(row => ({
      id: row[0], name: row[1], tag: row[2], src: row[3], hot: !!row[4],
    })) : []
    res.json({ success: true, data: list })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// 创建模板
app.post('/api/templates', requireAdmin, (req, res) => {
  try {
    const body = req.body
    if (!body.name || !body.category) {
      return res.status(400).json({ success: false, error: '缺少必填字段：name、category' })
    }
    // 数据校验：name 长度上限 100 字符
    if (typeof body.name !== 'string' || body.name.length > 100) {
      return res.status(400).json({ success: false, error: '模板名称不能超过 100 个字符' })
    }
    // 数据校验：price 必须 >= 0
    if (body.price !== undefined && body.price !== null && (typeof body.price !== 'number' || body.price < 0)) {
      return res.status(400).json({ success: false, error: '价格必须为非负数' })
    }
    // 数据校验：JSON 字段序列化后长度上限 5MB，防止恶意超大 payload
    const MAX_JSON_LENGTH = 5 * 1024 * 1024
    const jsonFields = { data: body.data, elements: body.elements, canvasSize: body.canvasSize, background: body.background, tags: body.tags }
    for (const [key, val] of Object.entries(jsonFields)) {
      if (val !== undefined && val !== null) {
        const str = JSON.stringify(val)
        if (str.length > MAX_JSON_LENGTH) {
          return res.status(400).json({ success: false, error: `字段 ${key} 数据过大，超过 5MB 限制` })
        }
      }
    }

    const id = body.id || uuidv4()
    const existing = db.exec("SELECT id FROM templates WHERE id = ?", [id])
    if (existing.length && existing[0].values.length) {
      return res.status(400).json({ success: false, error: `模板 ID ${id} 已存在` })
    }

    db.run(`INSERT INTO templates
      (id, name, subtitle, category, cover, primaryColor, likes, pageCount, data, elements, canvasSize, orientation, background, tags, status, renderedImage, is_paid, price, is_premium, templateType, pages, vipLevel, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
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
      body.status || 'draft',
      body.renderedImage || '',
      body.is_paid || body.isPaid || 0,
      body.price || 0,
      body.is_premium || body.isPremium || 0,
      body.templateType || 'canvas',
      JSON.stringify(body.pages || []),
      body.vipLevel || 'free',
      new Date().toISOString(),
      new Date().toISOString(),
    ])
    bumpVersion()
    saveDatabase()

    const result = db.exec("SELECT * FROM templates WHERE id = ?", [id])
    const template = rowToObject(result)
    res.json({ success: true, data: template })

    // 异步同步到云数据库（不阻塞响应）
    cloudSync.syncTemplateToCloud(id, template, 'create').catch(e =>
      console.warn('[cloudSync] 后台同步失败:', e.message))
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// 更新模板
app.put('/api/templates/:id', requireAdmin, (req, res) => {
  try {
    const existing = db.exec("SELECT id FROM templates WHERE id = ?", [req.params.id])
    if (!existing.length || !existing[0].values.length) {
      return res.status(404).json({ success: false, error: '模板不存在' })
    }

    const body = req.body
    const fields = []
    const params = []

    // 数据校验：name 长度上限 100 字符
    if (body.name !== undefined && (typeof body.name !== 'string' || body.name.length > 100)) {
      return res.status(400).json({ success: false, error: '模板名称不能超过 100 个字符' })
    }
    // 数据校验：price 必须 >= 0
    if (body.price !== undefined && body.price !== null && (typeof body.price !== 'number' || body.price < 0)) {
      return res.status(400).json({ success: false, error: '价格必须为非负数' })
    }
    // 数据校验：JSON 字段序列化后长度上限 5MB，防止恶意超大 payload
    const MAX_JSON_LENGTH = 5 * 1024 * 1024
    const jsonFields = { data: body.data, elements: body.elements, canvasSize: body.canvasSize, background: body.background, tags: body.tags }
    for (const [key, val] of Object.entries(jsonFields)) {
      if (val !== undefined && val !== null) {
        const str = JSON.stringify(val)
        if (str.length > MAX_JSON_LENGTH) {
          return res.status(400).json({ success: false, error: `字段 ${key} 数据过大，超过 5MB 限制` })
        }
      }
    }

    // 移除统计字段（likes、pageCount），管理员编辑不应直接篡改统计数据
    const allowedFields = ['name', 'subtitle', 'category', 'cover', 'primaryColor', 'orientation', 'status', 'renderedImage', 'is_paid', 'price', 'is_premium', 'templateType', 'vipLevel']
    allowedFields.forEach(f => {
      if (body[f] !== undefined) {
        fields.push(`${f} = ?`)
        params.push(body[f])
      }
    })
    // 兼容 camelCase 的付费字段
    if (body.isPaid !== undefined) {
      fields.push("is_paid = ?")
      params.push(body.isPaid)
    }
    if (body.isPremium !== undefined) {
      fields.push("is_premium = ?")
      params.push(body.isPremium)
    }
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
    if (body.pages !== undefined) {
      fields.push("pages = ?")
      params.push(JSON.stringify(body.pages))
    }
    fields.push("updatedAt = ?")
    params.push(new Date().toISOString())
    params.push(req.params.id)

    db.run(`UPDATE templates SET ${fields.join(', ')} WHERE id = ?`, params)
    bumpVersion()
    saveDatabaseDebounced()

    const result = db.exec("SELECT * FROM templates WHERE id = ?", [req.params.id])
    const template = rowToObject(result)
    res.json({ success: true, data: template })

    // 异步同步到云数据库（不阻塞响应）
    cloudSync.syncTemplateToCloud(req.params.id, template, 'update').catch(e =>
      console.warn('[cloudSync] 后台同步失败:', e.message))
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// 删除模板（软删除）
app.delete('/api/templates/:id', requireAdmin, (req, res) => {
  try {
    const existing = db.exec("SELECT id FROM templates WHERE id = ?", [req.params.id])
    if (!existing.length || !existing[0].values.length) {
      return res.status(404).json({ success: false, error: '模板不存在' })
    }
    db.run("UPDATE templates SET status = 'deleted', updatedAt = ? WHERE id = ?", [new Date().toISOString(), req.params.id])
    bumpVersion()
    saveDatabase()
    res.json({ success: true, message: '删除成功' })

    // 异步从云数据库删除
    cloudSync.deleteTemplateFromCloud(req.params.id).catch(e =>
      console.warn('[cloudSync] 后台删除失败:', e.message))
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// ============ 作品 CRUD API ============

// 将 works 表行数据转换为 camelCase 字段对象（与服务端列名对齐）
// snake_case 列名 → camelCase：template_id→templateId, template_type→templateType,
// music_id→musicId, created_at→createdAt, updated_at→updatedAt；cover/id/phone/title/data 保持原名
function mapWorkRow(row, cols) {
  const obj = {}
  row.forEach((val, i) => {
    const col = cols[i]
    let key = col
    if (col === 'template_id') key = 'templateId'
    else if (col === 'template_type') key = 'templateType'
    else if (col === 'music_id') key = 'musicId'
    else if (col === 'created_at') key = 'createdAt'
    else if (col === 'updated_at') key = 'updatedAt'
    if (col === 'data') {
      try { obj[key] = JSON.parse(val) } catch { obj[key] = val }
    } else {
      obj[key] = val
    }
  })
  return obj
}

// 获取当前用户作品列表
// 合并查询主库 works + 海报库 poster_works，让两类作品都可见
app.get('/api/works', requireAuth, (req, res) => {
  try {
    const phone = req.user?.phone
    if (!phone) return res.json({ success: true, data: [] })
    const result = db.exec("SELECT * FROM works WHERE phone = ? ORDER BY updated_at DESC", [phone])
    const works = result.length ? result[0].values.map(row => mapWorkRow(row, result[0].columns)) : []
    // 合并海报作品（poster_works 表，按 user_id 过滤）
    const _posterDb = getPosterDb()
    if (_posterDb) {
      try {
        const posterResult = _posterDb.exec("SELECT * FROM poster_works WHERE user_id = ? ORDER BY created_at DESC", [phone])
        if (posterResult.length && posterResult[0].values.length) {
          const posterCols = posterResult[0].columns
          const posterWorks = posterResult[0].values.map(row => {
            const obj = {}
            posterCols.forEach((col, i) => {
              const key = col === 'user_id' ? 'phone' : col
              let val = row[i]
              if (col === 'content' || col === 'data') {
                try { obj[col === 'content' ? 'data' : col] = JSON.parse(val) } catch { obj[col === 'content' ? 'data' : col] = val }
              } else {
                obj[key] = val
              }
            })
            // 统一字段名，便于前端复用
            obj.templateType = obj.template_type || obj.templateType || 'poster'
            obj.cover = obj.cover_url || obj.cover || obj.poster_url || ''
            obj._source = 'poster'
            return obj
          })
          works.push(...posterWorks)
          // 合并后按 updated_at / created_at 倒序
          works.sort((a, b) => {
            const ta = new Date(a.updated_at || a.updatedAt || a.created_at || 0).getTime()
            const tb = new Date(b.updated_at || b.updatedAt || b.created_at || 0).getTime()
            return tb - ta
          })
        }
      } catch (_) { /* poster_works 表可能不存在，忽略 */ }
    }
    res.json({ success: true, data: works })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// 获取作品详情
app.get('/api/works/:id', requireAuth, (req, res) => {
  try {
    const phone = req.user?.phone
    if (!phone) return res.status(401).json({ success: false, error: '请先登录' })
    const result = db.exec("SELECT * FROM works WHERE id = ? AND phone = ?", [req.params.id, phone])
    if (!result.length || !result[0].values.length) {
      return res.status(404).json({ success: false, error: '作品不存在' })
    }
    const obj = mapWorkRow(result[0].values[0], result[0].columns)
    res.json({ success: true, data: obj })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// 公开访问作品：被分享者通过 workId 查看作品内容，不校验 phone
// 仅返回渲染所需的只读字段（data/templateId/templateType/cover），不暴露作者 phone
app.get('/api/works/share/:id', (req, res) => {
  try {
    const result = db.exec("SELECT id, template_id, template_type, title, data, music_id, cover, created_at, updated_at FROM works WHERE id = ?", [req.params.id])
    if (!result.length || !result[0].values.length) {
      return res.status(404).json({ success: false, error: '作品不存在' })
    }
    const obj = mapWorkRow(result[0].values[0], result[0].columns)
    res.json({ success: true, data: obj })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// 创建作品
app.post('/api/works', createLimiter, requireAuth, (req, res) => {
  try {
    const phone = req.user?.phone
    if (!phone) return res.status(401).json({ success: false, error: '请先登录' })
    const { id, templateId, templateType, title, data, musicId, cover, image } = req.body
    // 兼容：如果 body 中有 image 但没有 cover，用 image 作为 cover 的值
    const coverValue = cover || image || ''
    const workId = id || uuidv4()
    const now = new Date().toISOString()
    // 如果指定了 id，先检查是否已存在且属于当前用户
    if (id) {
      const existing = db.exec("SELECT phone FROM works WHERE id = ?", [id])
      if (existing.length && existing[0].values.length && existing[0].values[0][0] !== phone) {
        return res.status(403).json({ success: false, error: '无权操作此作品' })
      }
    }
    db.run(`INSERT OR REPLACE INTO works (id, phone, template_id, template_type, title, data, music_id, cover, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      workId, phone, templateId || '', templateType || 'canvas', title || '',
      JSON.stringify(data || {}), musicId || '', coverValue, now, now,
    ])
    saveDatabaseDebounced()
    const result = db.exec("SELECT * FROM works WHERE id = ?", [workId])
    const obj = mapWorkRow(result[0].values[0], result[0].columns)
    res.json({ success: true, data: obj })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// 更新作品
app.put('/api/works/:id', requireAuth, (req, res) => {
  try {
    const phone = req.user?.phone
    if (!phone) return res.status(401).json({ success: false, error: '请先登录' })
    const existing = db.exec("SELECT id FROM works WHERE id = ? AND phone = ?", [req.params.id, phone])
    if (!existing.length || !existing[0].values.length) {
      return res.status(404).json({ success: false, error: '作品不存在' })
    }
    const { templateId, templateType, title, data, musicId, cover, image } = req.body
    // 兼容：如果 body 中有 image 但没有 cover，用 image 作为 cover 的值
    const coverValue = cover !== undefined ? cover : image
    const fields = []
    const params = []
    if (templateId !== undefined) { fields.push("template_id = ?"); params.push(templateId) }
    if (templateType !== undefined) { fields.push("template_type = ?"); params.push(templateType) }
    if (title !== undefined) { fields.push("title = ?"); params.push(title) }
    if (data !== undefined) { fields.push("data = ?"); params.push(JSON.stringify(data)) }
    if (musicId !== undefined) { fields.push("music_id = ?"); params.push(musicId) }
    if (coverValue !== undefined) { fields.push("cover = ?"); params.push(coverValue) }
    fields.push("updated_at = ?")
    params.push(new Date().toISOString())
    params.push(req.params.id)
    db.run(`UPDATE works SET ${fields.join(', ')} WHERE id = ?`, params)
    saveDatabaseDebounced()
    const result = db.exec("SELECT * FROM works WHERE id = ?", [req.params.id])
    const obj = mapWorkRow(result[0].values[0], result[0].columns)
    res.json({ success: true, data: obj })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// ============ 订单 API ============

// 创建订单
app.post('/api/orders', requireAuth, (req, res) => {
  try {
    const { items, contactName, contactPhone, address, note } = req.body
    if (!items || !items.length) {
      return res.status(400).json({ success: false, error: '订单商品不能为空' })
    }
    // 服务端计算订单金额：分别按 templateId（付费模板）和 productId（商城商品）计价
    let serverTotal = 0
    const templateIds = items.map(item => item.templateId).filter(Boolean)
    const productIds = items.map(item => item.productId).filter(Boolean)

    // 1. 付费模板：批量查询模板真实价格并累加
    const tplPriceMap = {}
    if (templateIds.length > 0) {
      const placeholders = templateIds.map(() => '?').join(',')
      const priceResults = db.exec(`SELECT id, price, is_paid FROM templates WHERE id IN (${placeholders}) AND status = 'published'`, templateIds)
      if (priceResults.length) {
        priceResults[0].values.forEach(row => {
          tplPriceMap[row[0]] = { price: row[1], isPaid: row[2] }
        })
      }
      for (const item of items) {
        if (item.templateId) {
          const tpl = tplPriceMap[item.templateId]
          if (!tpl) {
            return res.status(400).json({ success: false, error: `模板 ${item.templateId} 不存在` })
          }
          if (tpl.isPaid === 1) {
            serverTotal += (parseFloat(tpl.price) || 0) * (item.quantity || 1)
          }
        }
      }
    }

    // 2. 商城商品：批量查询 products 表真实价格并累加（修复商城订单金额恒为 0 的 bug）
    const prodPriceMap = {}
    if (productIds.length > 0) {
      const prodPlaceholders = productIds.map(() => '?').join(',')
      const prodResults = db.exec(`SELECT id, price FROM products WHERE id IN (${prodPlaceholders})`, productIds)
      if (prodResults.length) {
        prodResults[0].values.forEach(row => {
          prodPriceMap[row[0]] = parseFloat(row[1]) || 0
        })
      }
      for (const item of items) {
        if (item.productId) {
          const prodPrice = prodPriceMap[item.productId]
          // 商品不存在时回退到客户端传入价格（兼容离线 fallback 商品）
          const unitPrice = prodPrice !== undefined ? prodPrice : (parseFloat(item.price) || 0)
          serverTotal += unitPrice * (item.quantity || 1)
        }
      }
    }

    const totalAmount = String(serverTotal.toFixed(2))
    const id = uuidv4()
    const now = new Date().toISOString()
    const phone = req.user?.phone || ''
    db.run(`INSERT INTO orders (id, phone, items, totalAmount, status, contactName, contactPhone, address, note, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`, [
      id, phone, JSON.stringify(items), totalAmount,
      contactName || '', contactPhone || '', address || '', note || '', now, now,
    ])
    db.run("INSERT INTO notifications (phone, title, content, type, createdAt) VALUES (?, ?, ?, ?, ?)",
      [phone, '订单创建成功', `您的订单已创建，金额 ¥${totalAmount}，请尽快完成支付。`, 'order', now])
    saveDatabaseDebounced()
    const order = db.exec("SELECT * FROM orders WHERE id = ?", [id])
    res.json({ success: true, data: rowToObject(order) })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// 获取用户订单列表（支持分页 ?page=1&limit=20）
app.get('/api/orders', requireAuth, (req, res) => {
  try {
    const phone = req.user?.phone
    let sql = "SELECT * FROM orders"
    const conditions = []
    const params = []
    if (phone) {
      conditions.push("phone = ?")
      params.push(phone)
    }

    const whereClause = conditions.length ? " WHERE " + conditions.join(" AND ") : ""

    const page = parseInt(req.query.page, 10)
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20)

    // 有分页参数时返回分页格式
    if (page > 0 && limit > 0) {
      const countSql = "SELECT COUNT(*) as total FROM orders" + whereClause
      const countResult = db.exec(countSql, params)
      const total = countResult.length && countResult[0].values.length ? countResult[0].values[0][0] : 0
      const totalPages = Math.ceil(total / limit)
      const offset = (page - 1) * limit

      const paginatedSql = "SELECT * FROM orders" + whereClause + " ORDER BY createdAt DESC LIMIT ? OFFSET ?"
      const paginatedParams = [...params, limit, offset]
      const result = db.exec(paginatedSql, paginatedParams)
      const orders = result.length ? result[0].values.map(row => {
        const obj = rowToObject([{ columns: result[0].columns, values: [row] }])
        if (obj && typeof obj.items === 'string') {
          try { obj.items = JSON.parse(obj.items) } catch (_) { obj.items = [] }
        }
        return obj
      }) : []

      return res.json({
        success: true,
        data: orders,
        pagination: { page, limit, total, totalPages },
      })
    }

    // 无分页参数时保持原有行为（返回全部）
    sql += whereClause + " ORDER BY createdAt DESC"
    const result = db.exec(sql, params)
    const orders = result.length ? result[0].values.map(row => {
      const obj = rowToObject([{ columns: result[0].columns, values: [row] }])
      if (obj && typeof obj.items === 'string') {
        try { obj.items = JSON.parse(obj.items) } catch (_) { obj.items = [] }
      }
      return obj
    }) : []
    res.json({ success: true, data: orders })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// 更新订单状态
app.put('/api/orders/:id/status', requireAdmin, (req, res) => {
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
    saveDatabaseDebounced()
    res.json({ success: true, message: '状态已更新' })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// ========== 推荐商品 ==========
// 注意：/api/products 路由与 /api/templates 共享数据（均查询 templates 表），
// 保留此路由是为了兼容可能依赖 /api/products 路径的前端代码。
app.get('/api/products/recommend', (req, res) => {
  try {
    const category = req.query.category || ''
    let sql = "SELECT * FROM templates WHERE status = 'published'"
    const params = []
    if (category) {
      sql += " AND category = ?"
      params.push(category)
    }
    sql += " ORDER BY likes DESC LIMIT 10"
    const result = db.exec(sql, params)
    const products = result.length ? result[0].values.map(row => {
      const cols = result[0].columns
      const obj = {}
      row.forEach((val, i) => {
        if (cols[i] === 'data' || cols[i] === 'elements' || cols[i] === 'tags' || cols[i] === 'canvasSize' || cols[i] === 'background' || cols[i] === 'pages') {
          try { obj[cols[i]] = JSON.parse(val) } catch { obj[cols[i]] = val }
        } else {
          obj[cols[i]] = val
        }
      })
      return obj
    }) : []
    res.json({ success: true, data: products })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// ========== 商品目录 ==========
// 与 /api/templates 共享数据源（templates 表），此为面向前端商品展示的别名路由。
app.get('/api/products', (req, res) => {
  try {
    const params = []
    const conditions = ["status = 'published'"]
    if (req.query.category) {
      conditions.push("category = ?")
      params.push(req.query.category)
    }
    // 统一构建 WHERE 子句，数据查询与计数查询共用，避免字符串替换的脆弱性
    const whereClause = " WHERE " + conditions.join(" AND ")
    const dataSql = "SELECT * FROM templates" + whereClause + " ORDER BY likes DESC"

    const page = parseInt(req.query.page, 10)
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20)

    // 有分页参数时返回分页格式
    if (page > 0 && limit > 0) {
      // 查询总数：直接构建 COUNT 查询，不依赖字符串替换
      const countSql = "SELECT COUNT(*) as total FROM templates" + whereClause
      const countResult = db.exec(countSql, params)
      const total = countResult.length && countResult[0].values.length ? countResult[0].values[0][0] : 0
      const totalPages = Math.ceil(total / limit)
      const offset = (page - 1) * limit

      const paginatedSql = dataSql + " LIMIT ? OFFSET ?"
      const paginatedParams = [...params, limit, offset]
      const result = db.exec(paginatedSql, paginatedParams)
      const products = result.length ? result[0].values.map(row => {
        const cols = result[0].columns
        const obj = {}
        row.forEach((val, i) => {
          if (['data', 'elements', 'tags', 'canvasSize', 'background'].includes(cols[i])) {
            try { obj[cols[i]] = JSON.parse(val) } catch { obj[cols[i]] = val }
          } else {
            obj[cols[i]] = val
          }
        })
        return obj
      }) : []

      return res.json({
        success: true,
        data: products,
        pagination: { page, limit, total, totalPages },
      })
    }

    // 无分页参数时保持原有行为（返回全部）
    const result = db.exec(dataSql, params)
    const products = result.length ? result[0].values.map(row => {
      const cols = result[0].columns
      const obj = {}
      row.forEach((val, i) => {
        if (['data', 'elements', 'tags', 'canvasSize', 'background'].includes(cols[i])) {
          try { obj[cols[i]] = JSON.parse(val) } catch { obj[cols[i]] = val }
        } else {
          obj[cols[i]] = val
        }
      })
      return obj
    }) : []
    res.json({ success: true, data: products, total: products.length })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

app.get('/api/products/:id', (req, res) => {
  try {
    const result = db.exec("SELECT * FROM templates WHERE id = ? AND status != 'deleted'", [req.params.id])
    if (!result.length || !result[0].values.length) {
      return res.status(404).json({ success: false, error: '商品不存在' })
    }
    const row = result[0].values[0]
    const cols = result[0].columns
    const obj = {}
    row.forEach((val, i) => {
      if (['data', 'elements', 'tags', 'canvasSize', 'background'].includes(cols[i])) {
        try { obj[cols[i]] = JSON.parse(val) } catch { obj[cols[i]] = val }
      } else {
        obj[cols[i]] = val
      }
    })
    res.json({ success: true, data: obj })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// ========== VIP 系统 ==========
app.get('/api/vip/status', requireAuth, (req, res) => {
  try {
    const phone = req.user?.phone
    if (!phone) {
      return res.json({ success: true, data: { isVip: false, expireAt: null, plan: null } })
    }
    const result = db.exec("SELECT vip_status, vip_expire_at, vip_plan FROM users WHERE phone = ?", [phone])
    if (result.length && result[0].values.length) {
      let [status, expireAt, plan] = result[0].values[0]
      // 与 user/info 一致的过期清理逻辑：VIP 已过期则更新状态
      if (status === 1 && expireAt && Date.now() > parseInt(expireAt, 10)) {
        db.run("UPDATE users SET vip_status = 0, updatedAt = ? WHERE phone = ?",
          [new Date().toISOString(), phone])
        saveDatabaseDebounced()
        status = 0
      }
      const isVip = status === 1 && expireAt && Date.now() < parseInt(expireAt, 10)
      res.json({ success: true, data: { isVip: !!isVip, expireAt: expireAt || null, plan: plan || null } })
    } else {
      res.json({ success: true, data: { isVip: false, expireAt: null, plan: null } })
    }
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

app.post('/api/vip/order', payLimiter, requireAuth, (req, res) => {
  try {
    const phone = req.user?.phone
    if (!phone) {
      return res.status(401).json({ success: false, error: '请先登录' })
    }
    const { plan } = req.body
    const planDuration = { monthly: 30, quarterly: 90, yearly: 365 }
    // 套餐合法性校验
    if (!planDuration[plan]) {
      return res.status(400).json({ success: false, error: '无效的套餐' })
    }
    // 服务端定价：不信任客户端传入的价格
    // 注意：与前端 src/pages/vip/index.vue plans 数组保持一致
    const PRICES = { monthly: 29, quarterly: 69, yearly: 199 }
    const price = PRICES[plan]
    const days = planDuration[plan]
    const now = Date.now()
    const orderId = uuidv4()
    const nowStr = new Date().toISOString()

    const orderItems = [{ type: 'vip', plan, days, price }]

    // ⚠️ 安全修复：仅创建 pending 订单，不在此处激活 VIP
    // VIP 权益发放移至 POST /api/orders/:id/pay 完成支付后触发
    // 避免"下单即激活"漏洞（用户无需付款即可获得 VIP）
    runTransaction(db, () => {
      db.run(`INSERT INTO orders (id, phone, items, totalAmount, status, contactName, contactPhone, address, note, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, 'pending', '', '', '', ?, ?, ?)`, [
        orderId, phone, JSON.stringify(orderItems), String(price), '', nowStr, nowStr, nowStr,
      ])
    })
    saveDatabaseDebounced()

    // 测试模式：返回模拟支付参数（无真实微信支付密钥时使用）
    // 生产环境部署时，应替换为真实微信支付签名（paySign/nonceStr/timeStamp/package）
    // 并通过微信支付回调接口激活 VIP，而非由前端调用 /api/orders/:id/pay
    const mockPaySign = `mock_${orderId}_${Date.now()}`
    res.json({
      success: true,
      data: {
        orderId,
        prepayId: `prepay_${orderId}`,
        // 测试模式支付参数（生产环境替换为真实微信支付签名）
        paySign: mockPaySign,
        nonceStr: `nonce_${orderId}`,
        timeStamp: String(Math.floor(Date.now() / 1000)),
        package: `prepay_id=prepay_${orderId}`,
        signType: 'MD5',
        expireAt: null,
        testMode: true, // 标识当前为测试模式
      },
    })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// ========== 收藏系统 ==========
app.post('/api/favorites', requireAuth, (req, res) => {
  try {
    const phone = req.user?.phone
    if (!phone) return res.status(401).json({ success: false, error: '请先登录' })
    const { workId, templateId, title, image } = req.body
    if (!workId) return res.status(400).json({ success: false, error: '缺少 workId' })
    if (templateId) {
      const tplResult = db.exec("SELECT id FROM templates WHERE id = ? AND status != 'deleted'", [templateId])
      if (!tplResult.length || !tplResult[0].values.length) {
        return res.status(400).json({ success: false, error: '模板不存在' })
      }
    }
    const existing = db.exec("SELECT id FROM favorites WHERE phone = ? AND work_id = ?", [phone, workId])
    if (existing.length && existing[0].values.length) {
      return res.json({ success: true, message: '已收藏' })
    }
    db.run("INSERT OR IGNORE INTO favorites (phone, work_id, template_id, title, image, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
      [phone, workId, templateId || '', title || '', image || '', new Date().toISOString()])
    saveDatabaseDebounced()
    res.json({ success: true, message: '收藏成功' })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

app.delete('/api/favorites/:workId', requireAuth, (req, res) => {
  try {
    const phone = req.user?.phone
    if (!phone) return res.status(401).json({ success: false, error: '请先登录' })
    db.run("DELETE FROM favorites WHERE phone = ? AND work_id = ?", [phone, req.params.workId])
    saveDatabaseDebounced()
    res.json({ success: true, message: '已取消收藏' })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

app.get('/api/favorites', requireAuth, (req, res) => {
  try {
    const phone = req.user?.phone
    if (!phone) return res.json({ success: true, data: [] })
    const sql = "SELECT * FROM favorites WHERE phone = ? ORDER BY createdAt DESC"
    const params = [phone]

    const page = parseInt(req.query.page, 10)
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20)

    // 有分页参数时返回分页格式
    if (page > 0 && limit > 0) {
      const countSql = "SELECT COUNT(*) as total FROM favorites WHERE phone = ?"
      const countResult = db.exec(countSql, [phone])
      const total = countResult.length && countResult[0].values.length ? countResult[0].values[0][0] : 0
      const totalPages = Math.ceil(total / limit)
      const offset = (page - 1) * limit

      const paginatedSql = sql + " LIMIT ? OFFSET ?"
      const paginatedParams = [...params, limit, offset]
      const result = db.exec(paginatedSql, paginatedParams)
      const favorites = result.length ? result[0].values.map(row => {
        const cols = result[0].columns
        const obj = {}
        row.forEach((val, i) => { obj[cols[i]] = val })
        return obj
      }) : []

      return res.json({
        success: true,
        data: favorites,
        pagination: { page, limit, total, totalPages },
      })
    }

    // 无分页参数时保持原有行为（返回全部）
    const result = db.exec(sql, params)
    const favorites = result.length ? result[0].values.map(row => {
      const cols = result[0].columns
      const obj = {}
      row.forEach((val, i) => { obj[cols[i]] = val })
      return obj
    }) : []
    res.json({ success: true, data: favorites })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// ========== 导出系统 ==========
app.post('/api/export', createLimiter, requireAuth, (req, res) => {
  try {
    const { workId, watermark, quality } = req.body
    if (!workId) return res.status(400).json({ success: false, error: '缺少 workId' })

    // VIP 状态检查：非 VIP 用户只能带水印导出
    const phone = req.user?.phone
    let isVip = false
    if (phone) {
      const vipResult = db.exec("SELECT vip_status, vip_expire_at FROM users WHERE phone = ?", [phone])
      if (vipResult.length && vipResult[0].values.length) {
        const [status, expireAt] = vipResult[0].values[0]
        isVip = status === 1 && expireAt && Date.now() < parseInt(expireAt, 10)
      }
    }
    const forceWatermark = !isVip

    // 修复导出逻辑：优先用 works 表的 template_id 查模板 renderedImage
    let url = ''
    let templateId = ''
    let workData = null

    // 1. 先从 works 表查 template_id（修复后应有值），同时取出 data 用于兜底
    const workResult = db.exec("SELECT template_id, data FROM works WHERE id = ? AND phone = ?", [workId, phone])
    if (workResult.length && workResult[0].values.length) {
      templateId = workResult[0].values[0][0] || ''
      try { workData = JSON.parse(workResult[0].values[0][1]) } catch (_) { workData = null }
    }

    // 2. template_id 不为空，用其查 templates 表的 renderedImage
    if (!url && templateId) {
      const tplResult = db.exec("SELECT renderedImage FROM templates WHERE id = ? AND status != 'deleted'", [templateId])
      if (tplResult.length && tplResult[0].values.length && tplResult[0].values[0][0]) {
        url = tplResult[0].values[0][0]
      }
    }

    // 3. template_id 为空，直接用 workId 作为 templateId 查询（兼容旧数据）
    if (!url && !templateId) {
      const result = db.exec("SELECT renderedImage FROM templates WHERE id = ?", [workId])
      if (result.length && result[0].values.length && result[0].values[0][0]) {
        url = result[0].values[0][0]
      }
    }

    // 4. 都查不到，检查作品 data 中是否有 renderedImage
    if (!url && workData) {
      if (workData.renderedImage) {
        url = workData.renderedImage
      } else if (workData.templateData && workData.templateData.renderedImage) {
        url = workData.templateData.renderedImage
      }
    }

    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000
    res.json({
      success: true,
      data: {
        url: url || '/static/images/placeholder.png',
        expiresAt,
        watermark: forceWatermark || watermark,
      },
    })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

app.post('/api/export/poster', requireAuth, (req, res) => {
  try {
    const { workId } = req.body
    if (!workId) return res.status(400).json({ success: false, error: '缺少 workId' })
    res.json({ success: true, data: { url: '/static/images/poster-placeholder.png' } })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// ========== 支付订单 ==========
// ⚠️ 测试模式说明：
// 当前实现为"前端调用即标记为已付款"，适用于无真实微信支付密钥的测试环境。
// 生产环境部署时必须改造为：
//   1. 本接口仅接收微信支付回调（POST /api/orders/:id/pay 由微信服务器调用，需校验签名）
//   2. 签名校验通过后再 UPDATE status='paid' 并发放 VIP 权益
//   3. 前端通过轮询订单状态或接收 WebSocket 推送来感知支付完成
// 当前实现的已知风险：
//   - 任何登录用户调用此接口即可将自己的 pending 订单标记为 paid
//   - 已通过 payLimiter 限流（同 IP 每分钟 10 次）缓解，但非根本修复
app.post('/api/orders/:id/pay', payLimiter, requireAuth, (req, res) => {
  try {
    const phone = req.user?.phone || ''
    const existing = db.exec("SELECT id, status, items FROM orders WHERE id = ? AND phone = ?", [req.params.id, phone])
    if (!existing.length || !existing[0].values.length) {
      return res.status(404).json({ success: false, error: '订单不存在' })
    }
    const [orderId, status, itemsJson] = existing[0].values[0]
    // 状态校验：只有 pending 状态才能支付
    if (status !== 'pending') {
      return res.status(400).json({ success: false, error: `订单状态为 ${status}，无法支付` })
    }
    console.log(`[Pay][TestMode] order=${orderId} phone=${phone} status=pending->paid`)
    const now = new Date().toISOString()
    db.run("UPDATE orders SET status = 'paid', paid_at = ?, updatedAt = ? WHERE id = ?",
      [now, now, req.params.id])

    // 支付后如果 items 含 vip 类型，发放 VIP 权益
    let items = []
    try { items = JSON.parse(itemsJson) } catch (_) {}
    const vipItem = items.find(it => it.type === 'vip')
    if (vipItem) {
      const planDuration = { monthly: 30, quarterly: 90, yearly: 365 }
      const days = planDuration[vipItem.plan] || 30
      const nowMs = Date.now()
      const userResult = db.exec("SELECT vip_status, vip_expire_at FROM users WHERE phone = ?", [phone])
      let currentExpire = 0
      if (userResult.length && userResult[0].values.length) {
        const [vStatus, expireAt] = userResult[0].values[0]
        if (vStatus === 1 && expireAt) {
          currentExpire = parseInt(expireAt, 10) || 0
        }
      }
      const baseExpire = Math.max(currentExpire, nowMs)
      const newExpireAt = baseExpire + days * 24 * 60 * 60 * 1000
      db.run("UPDATE users SET vip_status = 1, vip_expire_at = ?, vip_plan = ?, updatedAt = ? WHERE phone = ?",
        [String(newExpireAt), vipItem.plan, now, phone])
    }

    saveDatabaseDebounced()
    const prepayId = `prepay_${req.params.id}`
    res.json({ success: true, data: { prepayId, status: 'paid' } })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// ========== 足迹系统 ==========
app.post('/api/footprints', requireAuth, (req, res) => {
  try {
    const phone = req.user?.phone
    if (!phone) return res.status(401).json({ success: false, error: '请先登录' })
    const { templateId } = req.body
    if (!templateId) return res.status(400).json({ success: false, error: '缺少 templateId' })
    const tplResult = db.exec("SELECT name, cover FROM templates WHERE id = ? AND status != 'deleted'", [templateId])
    if (!tplResult.length || !tplResult[0].values.length) {
      return res.status(400).json({ success: false, error: '模板不存在' })
    }
    const templateName = tplResult[0].values[0][0] || ''
    const templateCover = tplResult[0].values[0][1] || ''
    recordFootprint(phone, templateId, templateName, templateCover)
    res.json({ success: true, message: '足迹已记录' })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

app.get('/api/footprints', requireAuth, (req, res) => {
  try {
    const phone = req.user?.phone
    if (!phone) return res.json({ success: true, data: [] })
    const sql = "SELECT * FROM footprints WHERE phone = ? ORDER BY timestamp DESC"
    const params = [phone]

    const page = parseInt(req.query.page, 10)
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20)

    // 有分页参数时返回分页格式
    if (page > 0 && limit > 0) {
      const countSql = "SELECT COUNT(*) as total FROM footprints WHERE phone = ?"
      const countResult = db.exec(countSql, [phone])
      const total = countResult.length && countResult[0].values.length ? countResult[0].values[0][0] : 0
      const totalPages = Math.ceil(total / limit)
      const offset = (page - 1) * limit

      const paginatedSql = sql + " LIMIT ? OFFSET ?"
      const paginatedParams = [...params, limit, offset]
      const result = db.exec(paginatedSql, paginatedParams)
      const footprints = result.length ? result[0].values.map(row => {
        const cols = result[0].columns
        const obj = {}
        row.forEach((val, i) => { obj[cols[i]] = val })
        return obj
      }) : []

      return res.json({
        success: true,
        data: footprints,
        pagination: { page, limit, total, totalPages },
      })
    }

    // 无分页参数时保持原有行为（最多返回 50 条）
    const result = db.exec(sql + " LIMIT 50", params)
    const footprints = result.length ? result[0].values.map(row => {
      const cols = result[0].columns
      const obj = {}
      row.forEach((val, i) => { obj[cols[i]] = val })
      return obj
    }) : []
    res.json({ success: true, data: footprints })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// ========== 补充 API ==========

// 删除通知（加 phone 条件防越权）
app.delete('/api/notifications/:id', requireAuth, (req, res) => {
  try {
    const phone = req.user?.phone
    if (!phone) return res.status(401).json({ success: false, error: '请先登录' })
    db.run("DELETE FROM notifications WHERE id = ? AND phone = ?", [req.params.id, phone])
    saveDatabaseDebounced()
    res.json({ success: true, message: '已删除' })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// 批量标记通知已读
app.put('/api/notifications/read-all', requireAuth, (req, res) => {
  try {
    const phone = req.user?.phone
    if (!phone) return res.status(401).json({ success: false, error: '请先登录' })
    db.run("UPDATE notifications SET read = 1 WHERE phone = ? AND read = 0", [phone])
    saveDatabaseDebounced()
    res.json({ success: true, message: '已全部标记已读' })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// 更新用户昵称/头像
app.put('/api/user/profile', requireAuth, (req, res) => {
  try {
    const phone = req.user?.phone
    if (!phone) return res.status(401).json({ success: false, error: '请先登录' })
    const { nickname, avatar } = req.body
    const fields = []
    const params = []
    if (nickname !== undefined) { fields.push("nickname = ?"); params.push(nickname) }
    if (avatar !== undefined) { fields.push("avatar = ?"); params.push(avatar) }
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' })
    }
    fields.push("updatedAt = ?")
    params.push(new Date().toISOString())
    params.push(phone)
    db.run(`UPDATE users SET ${fields.join(', ')} WHERE phone = ?`, params)
    saveDatabaseDebounced()
    const result = db.exec("SELECT id, phone, nickname, avatar, vip_status, vip_expire_at, vip_plan FROM users WHERE phone = ?", [phone])
    const row = result[0].values[0]
    const cols = result[0].columns
    const obj = {}
    row.forEach((val, i) => { obj[cols[i]] = val })
    res.json({ success: true, data: obj })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// 获取订单详情
app.get('/api/orders/:id', requireAuth, (req, res) => {
  try {
    const phone = req.user?.phone
    if (!phone) return res.status(401).json({ success: false, error: '请先登录' })
    const result = db.exec("SELECT * FROM orders WHERE id = ? AND phone = ?", [req.params.id, phone])
    if (!result.length || !result[0].values.length) {
      return res.status(404).json({ success: false, error: '订单不存在' })
    }
    const obj = rowToObject(result)
    if (obj && typeof obj.items === 'string') {
      try { obj.items = JSON.parse(obj.items) } catch (_) { obj.items = [] }
    }
    res.json({ success: true, data: obj })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// 获取反馈列表（管理员）
app.get('/api/feedback', requireAdmin, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = Math.min(parseInt(req.query.limit) || 20, 100)
    const offset = (page - 1) * limit
    const countResult = db.exec("SELECT COUNT(*) as c FROM feedback")
    const total = countResult.length ? countResult[0].values[0][0] : 0
    const result = db.exec("SELECT * FROM feedback ORDER BY createdAt DESC LIMIT ? OFFSET ?", [limit, offset])
    const feedbacks = result.length ? result[0].values.map(row => {
      const obj = {}
      result[0].columns.forEach((col, i) => {
        obj[col] = row[i]
        if (col === 'params') { try { obj[col] = JSON.parse(row[i]) } catch {} }
      })
      return obj
    }) : []
    res.json({ success: true, data: feedbacks, pagination: { page, limit, total } })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// 更新反馈状态（管理员）
app.put('/api/feedback/:id', requireAdmin, (req, res) => {
  try {
    const { status } = req.body
    const validStatuses = ['pending', 'processing', 'resolved', 'closed']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: '无效的状态' })
    }
    const existing = db.exec("SELECT id FROM feedback WHERE id = ?", [req.params.id])
    if (!existing.length || !existing[0].values.length) {
      return res.status(404).json({ success: false, error: '反馈不存在' })
    }
    db.run("UPDATE feedback SET status = ? WHERE id = ?", [status, req.params.id])
    saveDatabaseDebounced()
    res.json({ success: true, message: '状态已更新' })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// ========== 通知系统 ==========
app.post('/api/notifications/send', requireAdmin, (req, res) => {
  try {
    const { phone, title, content, type } = req.body
    if (!title) return res.status(400).json({ success: false, error: '缺少 title' })
    if (phone) {
      db.run("INSERT INTO notifications (phone, title, content, type, createdAt) VALUES (?, ?, ?, ?, ?)",
        [phone, title, content || '', type || 'system', new Date().toISOString()])
    } else {
      const users = db.exec("SELECT phone FROM users")
      if (users.length && users[0].values.length) {
        const now = new Date().toISOString()
        users[0].values.forEach(row => {
          db.run("INSERT INTO notifications (phone, title, content, type, createdAt) VALUES (?, ?, ?, ?, ?)",
            [row[0], title, content || '', type || 'system', now])
        })
      }
    }
    saveDatabaseDebounced()
    res.json({ success: true, message: '通知已发送' })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

app.get('/api/notifications', requireAuth, (req, res) => {
  try {
    const phone = req.user?.phone
    if (!phone) return res.json({ success: true, data: [] })
    const sql = "SELECT * FROM notifications WHERE phone = ? ORDER BY createdAt DESC"
    const params = [phone]

    const page = parseInt(req.query.page, 10)
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20)

    // 有分页参数时返回分页格式
    if (page > 0 && limit > 0) {
      const countSql = "SELECT COUNT(*) as total FROM notifications WHERE phone = ?"
      const countResult = db.exec(countSql, [phone])
      const total = countResult.length && countResult[0].values.length ? countResult[0].values[0][0] : 0
      const totalPages = Math.ceil(total / limit)
      const offset = (page - 1) * limit

      const paginatedSql = sql + " LIMIT ? OFFSET ?"
      const paginatedParams = [...params, limit, offset]
      const result = db.exec(paginatedSql, paginatedParams)
      const notifications = result.length ? result[0].values.map(row => {
        const cols = result[0].columns
        const obj = {}
        row.forEach((val, i) => { obj[cols[i]] = val })
        return obj
      }) : []

      return res.json({
        success: true,
        data: notifications,
        pagination: { page, limit, total, totalPages },
      })
    }

    // 无分页参数时保持原有行为（最多返回 50 条）
    const result = db.exec(sql + " LIMIT 50", params)
    const notifications = result.length ? result[0].values.map(row => {
      const cols = result[0].columns
      const obj = {}
      row.forEach((val, i) => { obj[cols[i]] = val })
      return obj
    }) : []
    res.json({ success: true, data: notifications })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

app.put('/api/notifications/:id/read', requireAuth, (req, res) => {
  try {
    db.run("UPDATE notifications SET read = 1 WHERE id = ? AND phone = ?", [req.params.id, req.user.phone])
    saveDatabaseDebounced()
    res.json({ success: true, message: '已标记已读' })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// ========== 反馈系统 ==========
app.post('/api/feedback', createLimiter, requireAuth, (req, res) => {
  try {
    const phone = req.user?.phone || ''
    const { content, contact } = req.body
    if (!content) return res.status(400).json({ success: false, error: '请输入反馈内容' })
    db.run("INSERT INTO feedback (phone, content, contact, createdAt) VALUES (?, ?, ?, ?)",
      [phone, content, contact || '', new Date().toISOString()])
    saveDatabaseDebounced()
    res.json({ success: true, message: '反馈已提交' })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// ========== 回收站系统 ==========
// 同时查询主数据库和 poster 数据库的回收站，统一返回格式
function queryRecycleBin(userId, dbRef, isPosterDb = false) {
  const idField = isPosterDb ? 'user_id' : 'phone'
  const timeField = isPosterDb ? 'deleted_at' : 'deletedAt'
  const result = dbRef.exec(`SELECT * FROM recycle_bin WHERE ${idField} = ? ORDER BY ${timeField} DESC`, [userId])
  return result.length ? result[0].values.map(row => {
    const cols = result[0].columns
    const obj = {}
    row.forEach((val, i) => {
      if (cols[i] === 'work_data') {
        try { obj[cols[i]] = JSON.parse(val) } catch { obj[cols[i]] = val }
      } else {
        obj[cols[i]] = val
      }
    })
    obj.source = isPosterDb ? 'poster' : 'template'
    return obj
  }) : []
}

app.get('/api/works/recycle', requireAuth, (req, res) => {
  try {
    const phone = req.user?.phone
    if (!phone) return res.json({ success: true, data: [] })

    const page = parseInt(req.query.page, 10)
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20)

    const mainItems = queryRecycleBin(phone, db, false)
    const _posterDb = getPosterDb()
    const posterItems = _posterDb ? queryRecycleBin(phone, _posterDb, true) : []

    let allItems = [...mainItems, ...posterItems].sort((a, b) => {
      const timeA = a.deletedAt || a.deleted_at || ''
      const timeB = b.deletedAt || b.deleted_at || ''
      return timeB.localeCompare(timeA)
    })

    if (page > 0 && limit > 0) {
      const total = allItems.length
      const totalPages = Math.ceil(total / limit)
      const offset = (page - 1) * limit
      const paginatedItems = allItems.slice(offset, offset + limit)

      return res.json({
        success: true,
        data: paginatedItems,
        pagination: { page, limit, total, totalPages },
      })
    }

    res.json({ success: true, data: allItems })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

app.put('/api/works/:id/restore', requireAuth, (req, res) => {
  try {
    const phone = req.user?.phone
    if (!phone) return res.status(401).json({ success: false, error: '请先登录' })

    let found = false
    let workData = null

    const mainResult = db.exec("SELECT work_data FROM recycle_bin WHERE id = ? AND phone = ?", [req.params.id, phone])
    if (mainResult.length && mainResult[0].values.length) {
      workData = JSON.parse(mainResult[0].values[0][0])
      db.run("DELETE FROM recycle_bin WHERE id = ?", [req.params.id])
      // 将 work_data 恢复回 works 表
      const now = new Date().toISOString()
      db.run(`INSERT OR REPLACE INTO works (id, phone, template_id, template_type, title, data, music_id, cover, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [workData.id, phone, workData.templateId || '', workData.templateType || 'canvas', workData.title || '', JSON.stringify(workData.data || {}), workData.musicId || '', workData.cover || '', workData.createdAt || now, now])
      saveDatabaseDebounced()
      found = true
    } else {
      const _posterDb = getPosterDb()
      if (_posterDb) {
        const posterResult = _posterDb.exec("SELECT work_data FROM recycle_bin WHERE id = ? AND user_id = ?", [req.params.id, phone])
        if (posterResult.length && posterResult[0].values.length) {
          workData = JSON.parse(posterResult[0].values[0][0])
          _posterDb.run("DELETE FROM recycle_bin WHERE id = ?", [req.params.id])
          // poster库同理恢复到poster_works表
          _posterDb.run(`INSERT OR REPLACE INTO poster_works (id, user_id, template_id, template_name, cover_url, content, poster_url, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [workData.id, workData.user_id || phone, workData.template_id || '', workData.template_name || '', workData.cover_url || '', workData.content || '{}', workData.poster_url || '', workData.created_at || new Date().toISOString()])
          const { savePosterDatabase } = require('./routes/poster')
          savePosterDatabase()
          found = true
        }
      }
    }

    if (!found) {
      return res.status(404).json({ success: false, error: '记录不存在' })
    }

    res.json({ success: true, message: '已恢复' })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

app.delete('/api/works/:id', requireAuth, (req, res) => {
  try {
    const phone = req.user?.phone
    if (!phone) return res.status(401).json({ success: false, error: '请先登录' })

    // 软删除：先检查 works 表有没有，有则移到 recycle_bin
    const workResult = db.exec("SELECT * FROM works WHERE id = ? AND phone = ?", [req.params.id, phone])
    if (workResult.length && workResult[0].values.length) {
      const cols = workResult[0].columns
      const row = workResult[0].values[0]
      const colIdx = {}
      cols.forEach((c, i) => { colIdx[c] = i })
      // 转换为 camelCase 格式存储，与恢复逻辑的字段名一致
      const workObj = {
        id: row[colIdx.id],
        phone: row[colIdx.phone],
        templateId: row[colIdx.template_id] || '',
        templateType: row[colIdx.template_type] || 'canvas',
        title: row[colIdx.title] || '',
        data: (() => { try { return JSON.parse(row[colIdx.data] || '{}') } catch { return {} } })(),
        musicId: row[colIdx.music_id] || '',
        cover: row[colIdx.cover] || '',
        createdAt: row[colIdx.created_at] || '',
        updatedAt: row[colIdx.updated_at] || '',
      }
      const now = new Date().toISOString()
      // 使用事务：移入回收站 + 删除作品，保证原子性
      runTransaction(db, () => {
        db.run("INSERT INTO recycle_bin (phone, work_id, work_data, deletedAt) VALUES (?, ?, ?, ?)",
          [phone, req.params.id, JSON.stringify(workObj), now])
        db.run("DELETE FROM works WHERE id = ?", [req.params.id])
      })
      saveDatabaseDebounced()
      return res.json({ success: true, message: '已移入回收站' })
    }

    // 没有在 works 表：检查 recycle_bin 永久删除（兼容 work_id 和 recycle_bin 自增 id）
    const recycleResult = db.exec("SELECT id FROM recycle_bin WHERE (work_id = ? OR id = ?) AND phone = ?", [req.params.id, req.params.id, phone])
    if (recycleResult.length && recycleResult[0].values.length) {
      db.run("DELETE FROM recycle_bin WHERE (work_id = ? OR id = ?) AND phone = ?", [req.params.id, req.params.id, phone])
      saveDatabaseDebounced()
      return res.json({ success: true, message: '已永久删除' })
    }

    // 检查 poster 回收站
    const _posterDb = getPosterDb()
    if (_posterDb) {
      const posterResult = _posterDb.exec("SELECT id FROM recycle_bin WHERE (work_id = ? OR id = ?) AND user_id = ?", [req.params.id, req.params.id, phone])
      if (posterResult.length && posterResult[0].values.length) {
        _posterDb.run("DELETE FROM recycle_bin WHERE (work_id = ? OR id = ?) AND user_id = ?", [req.params.id, req.params.id, phone])
        const { savePosterDatabase } = require('./routes/poster')
        savePosterDatabase()
        return res.json({ success: true, message: '已永久删除' })
      }
    }

    res.status(404).json({ success: false, error: '记录不存在' })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// ========== 批量事件追踪 ==========
app.post('/api/track/batch', rateLimit({ max: 20, windowMs: 60000 }), (req, res) => {
  try {
    const { events } = req.body
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ success: false, error: '缺少 events 数组' })
    }
    if (events.length > 100) {
      return res.status(400).json({ success: false, error: '单次上报事件数不能超过 100 条' })
    }
    const sessionId = req.headers['x-session-id'] || req.headers['session-id'] || uuidv4()
    const userId = req.user?.phone || null
    // 批量插入事件（单条 SQL 替代循环逐条插入，减少 N+1 写入开销）
    if (events.length > 0) {
      const values = events.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(',')
      const params = events.flatMap(evt => [
        evt.event || '', userId, sessionId, evt.timestamp || Date.now(),
        evt.params ? JSON.stringify(evt.params) : null,
        evt.platform || '', evt.version || '',
      ])
      db.run(`INSERT INTO events (event, user_id, session_id, timestamp, params, platform, version) VALUES ${values}`, params)
    }
    saveDatabaseDebounced()
    res.json({ success: true })
  } catch (e) {
    console.error(e); res.status(500).json({ success: false, error: '服务器内部错误' })
  }
})

// 版本号相关
app.get('/api/version', (req, res) => {
  const result = db.exec("SELECT COUNT(*) as c FROM templates")
  const count = result.length ? result[0].values[0][0] : 0
  res.json({ success: true, version: getVersion(), count })
})

app.post('/api/version/refresh', requireAdmin, (req, res) => {
  bumpVersion()
  saveDatabaseDebounced()
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
    if (cols[i] === 'data' || cols[i] === 'elements' || cols[i] === 'tags' || cols[i] === 'canvasSize' || cols[i] === 'background' || cols[i] === 'pages') {
      try { obj[cols[i]] = JSON.parse(val) } catch { obj[cols[i]] = val }
    } else {
      obj[cols[i]] = val
    }
  })
  return obj
}

// ============ 云同步状态查询 ============
app.get('/api/cloud-sync/status', requireAdmin, (req, res) => {
  const enabled = cloudSync.isEnabled()
  res.json({
    success: true,
    data: {
      enabled,
      envId: 'cloud1-d4gyvmo1d9a1e148a',
      message: enabled ? '云同步已启用' : 'CLOUDBASE_APIKEY 未配置，云同步已禁用',
    },
  })
})

// ============ 404 处理 ============
app.use((req, res) => {
  res.status(404).json({ success: false, error: '接口不存在' })
})

// ============ 错误处理 ============
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)

  // multer 上传错误（文件过大、格式不支持等）：返回 400 + 具体信息
  if (err.code && (err.code.startsWith('LIMIT_') || err.code.startsWith('MULTER_'))) {
    let msg = '文件上传失败'
    if (err.code === 'LIMIT_FILE_SIZE') msg = '文件大小超过限制（最大 10MB）'
    else if (err.code === 'LIMIT_UNEXPECTED_FILE') msg = '不支持的文件字段'
    else if (err.message) msg = err.message
    return res.status(400).json({ success: false, error: msg })
  }

  // 自定义业务错误：返回对应状态码和错误信息
  if (err.statusCode || err.status) {
    return res.status(err.statusCode || err.status).json({ success: false, error: err.message || '请求错误' })
  }

  // 其他错误：返回 500 + 通用信息（不泄露内部细节）
  res.status(500).json({ success: false, error: '服务器内部错误' })
})

// ============ 启动 ============
let server

const shutdown = (signal) => {
  console.log(`\n${signal} received, shutting down gracefully...`)
  if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null }
  try { posterRouter.clearPosterSaveTimer() } catch (e) { console.error('clearPosterSaveTimer failed:', e) }
  try { saveDatabase() } catch (e) { console.error('saveDatabase failed:', e) }
  try { posterRouter.savePosterDatabase() } catch (e) { console.error('savePosterDatabase failed:', e) }
  if (server) {
    server.close(() => {
      console.log('Server closed')
      process.exit(0)
    })
  } else {
    process.exit(0)
  }
  setTimeout(() => {
    console.error('Forced shutdown after 5s')
    process.exit(1)
  }, 5000)
}

async function start() {
  // 信号处理与兜底异常处理：在 initDatabase 之前注册，确保启动过程中异常也能触发 graceful shutdown
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  // 兜底：未捕获异常时先保存数据库再退出
  process.on('uncaughtException', (err) => {
    console.error('uncaughtException:', err)
    try { saveDatabase() } catch (e) { console.error('saveDatabase failed:', e) }
    try { posterRouter.savePosterDatabase() } catch (e) { console.error('savePosterDatabase failed:', e) }
    process.exit(1)
  })
  process.on('unhandledRejection', (reason) => {
    console.error('unhandledRejection:', reason)
    try { saveDatabase() } catch (e) { console.error('saveDatabase failed:', e) }
    try { posterRouter.savePosterDatabase() } catch (e) { console.error('savePosterDatabase failed:', e) }
    process.exit(1)
  })

  await initDatabase()
  await seedData()
  // Wait for poster database to be ready before serving requests
  await posterRouter.posterReady
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🟢 TOYtamaxia API 服务已启动`)
    console.log(`   本地地址: http://localhost:${PORT}`)
    console.log(`   数据库: ${DB_PATH}`)
    console.log(`   上传目录: ${path.join(__dirname, 'uploads')}`)
    console.log(`   音乐目录: ${MUSIC_DIR}`)
    console.log(`   JWT 认证: 已启用 (公开路由除外)\n`)
  })

  // 定期清理过期数据
  setInterval(() => {
    try {
      const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000
      const thirtyDaysAgoIso = new Date(thirtyDaysAgoMs).toISOString()
      const ninetyDaysAgoIso = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      // 清理30天前的事件（timestamp 为毫秒数值）
      db.run("DELETE FROM events WHERE timestamp < ?", [thirtyDaysAgoMs])
      // 清理30天前的足迹（timestamp 为毫秒数值）
      db.run("DELETE FROM footprints WHERE timestamp < ?", [thirtyDaysAgoMs])
      // 清理90天前已读通知（createdAt 为 ISO 字符串）
      db.run("DELETE FROM notifications WHERE read = 1 AND createdAt < ?", [ninetyDaysAgoIso])
      // 清理回收站30天前的数据
      db.run("DELETE FROM recycle_bin WHERE deleted_at < ?", [thirtyDaysAgoIso])
      // 清理反馈90天前的数据
      db.run("DELETE FROM feedback WHERE created_at < ?", [ninetyDaysAgoIso])
      // 清理 poster 数据库中的过期数据
      try { posterRouter.cleanupPosterTables() } catch (e) { console.error('poster cleanup failed:', e) }
      // VACUUM 压缩数据库
      db.run("VACUUM")
      saveDatabase()
      console.log('[清理] 数据库清理完成')
    } catch (e) {
      console.error('[清理] 数据库清理失败:', e)
    }
  }, 24 * 60 * 60 * 1000) // 每24小时执行一次
}

// ============ 启动 ============
// 仅当作为主模块直接运行时才启动服务；被 require 引入（如测试）时不自动监听端口，
// 以便调用方复用 app 实例并自行初始化数据库。
if (require.main === module) {
  start().catch(e => {
    console.error('启动失败:', e)
    process.exit(1)
  })
}

// 导出 app 与数据库初始化函数，供集成测试（vitest + supertest）复用
module.exports = { app, start, initDatabase, seedData }

// MONETIZATION-PHASE1-COMPLETE
