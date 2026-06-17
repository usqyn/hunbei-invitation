const express = require('express')
const cors = require('cors')
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const { v4: uuidv4 } = require('uuid')

const app = express()
const PORT = 3001

// ============ 中间件 ============
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// ============ 文件上传配置 ============
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${uuidv4()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('仅支持图片格式：jpg/png/gif/webp/svg'))
    }
  },
})

// ============ 数据存储（JSON 文件持久化） ============
const DATA_FILE = path.join(__dirname, 'data.json')

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { templates: [], version: 1 }
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
  } catch (e) {
    return { templates: [], version: 1 }
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

// ============ 模板 ID 生成 ============
function generateTemplateId(category) {
  const data = readData()
  const sameCategory = data.templates.filter(t => t.category === category)
  return `${category}-${sameCategory.length + 1}`
}

// ============ API 路由 ============

// 获取全部模板（支持按分类筛选）
// GET /api/templates?category=wedding
app.get('/api/templates', (req, res) => {
  try {
    const data = readData()
    let templates = data.templates

    if (req.query.category) {
      templates = templates.filter(t => t.category === req.query.category)
    }

    res.json({
      success: true,
      data: templates,
      total: templates.length,
    })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// 获取单个模板
// GET /api/templates/:id
app.get('/api/templates/:id', (req, res) => {
  try {
    const data = readData()
    const template = data.templates.find(t => t.id === req.params.id)
    if (!template) {
      return res.status(404).json({ success: false, error: '模板不存在' })
    }
    res.json({ success: true, data: template })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// 上传图片（支持单图和多图）
// POST /api/upload
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

// 创建模板
// POST /api/templates
app.post('/api/templates', (req, res) => {
  try {
    const data = readData()
    const body = req.body

    // 校验必填字段
    if (!body.name || !body.category) {
      return res.status(400).json({ success: false, error: '缺少必填字段：name、category' })
    }

    // 自动生成 ID
    const id = body.id || generateTemplateId(body.category)

    // 防止 ID 重复
    if (data.templates.find(t => t.id === id)) {
      return res.status(400).json({ success: false, error: `模板 ID ${id} 已存在` })
    }

    const template = {
      id,
      name: body.name,
      subtitle: body.subtitle || '',
      category: body.category,
      cover: body.cover || '',
      primaryColor: body.primaryColor || '#e84a6e',
      likes: body.likes || 0,
      pageCount: body.pageCount || 10,
      data: body.data || {},
      elements: body.elements || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    data.templates.push(template)
    writeData(data)

    res.json({ success: true, data: template })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// 更新模板
// PUT /api/templates/:id
app.put('/api/templates/:id', (req, res) => {
  try {
    const data = readData()
    const idx = data.templates.findIndex(t => t.id === req.params.id)
    if (idx === -1) {
      return res.status(404).json({ success: false, error: '模板不存在' })
    }

    const updated = {
      ...data.templates[idx],
      ...req.body,
      id: req.params.id, // 禁止修改 ID
      updatedAt: new Date().toISOString(),
    }

    data.templates[idx] = updated
    writeData(data)

    res.json({ success: true, data: updated })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// 删除模板
// DELETE /api/templates/:id
app.delete('/api/templates/:id', (req, res) => {
  try {
    const data = readData()
    const idx = data.templates.findIndex(t => t.id === req.params.id)
    if (idx === -1) {
      return res.status(404).json({ success: false, error: '模板不存在' })
    }

    data.templates.splice(idx, 1)
    writeData(data)

    res.json({ success: true, message: '删除成功' })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// 获取分类列表（含每个分类下的模板数量）
// GET /api/categories
app.get('/api/categories', (req, res) => {
  const CATEGORIES = [
    { id: 'wedding', name: '婚礼请柬', icon: '💒' },
    { id: 'birthday', name: '生日派对', icon: '🎂' },
    { id: 'baby', name: '宝宝满月', icon: '👶' },
    { id: 'graduation', name: '毕业典礼', icon: '🎓' },
    { id: 'festival', name: '节日祝福', icon: '🎊' },
    { id: 'business', name: '商务会议', icon: '🏢' },
  ]

  const data = readData()
  const result = CATEGORIES.map(cat => ({
    ...cat,
    count: data.templates.filter(t => t.category === cat.id).length,
  }))

  res.json({ success: true, data: result })
})

// 获取全局版本号（小程序轮询比对用）
// GET /api/version
app.get('/api/version', (req, res) => {
  const data = readData()
  res.json({ success: true, version: data.version || 1, count: data.templates.length })
})

// 强制刷新版本号（每次增删改后自动+1）
// POST /api/version/refresh
app.post('/api/version/refresh', (req, res) => {
  const data = readData()
  data.version = (data.version || 0) + 1
  writeData(data)
  res.json({ success: true, version: data.version })
})

// 健康检查
// GET /api/health
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', time: new Date().toISOString() })
})

// ============ 启动 ============
app.listen(PORT, () => {
  console.log(`\n🟢 模板 API 服务已启动`)
  console.log(`   本地地址: http://localhost:${PORT}`)
  console.log(`   上传目录: ${path.join(__dirname, 'uploads')}`)
  console.log(`   数据文件: ${DATA_FILE}\n`)
})

app.on('error', (e) => {
  console.error('Server error:', e)
})
