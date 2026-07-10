const express = require('express')
const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const initSqlJs = require('sql.js')
const jwt = require('jsonwebtoken')

const router = express.Router()

// ============ Poster Database (separate SQLite file) ============
let SQL, posterDb
const POSTER_DB_PATH = path.join(__dirname, '..', 'poster.db')
const JWT_SECRET = process.env.JWT_SECRET

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

  savePosterDatabase()
}

function savePosterDatabase() {
  const data = posterDb.export()
  fs.writeFileSync(POSTER_DB_PATH, Buffer.from(data))
}

// 延迟批量保存：避免频繁写磁盘（如 use_count 更新）
let saveTimer = null
function scheduleSave() {
  if (saveTimer) return
  saveTimer = setTimeout(() => {
    saveTimer = null
    try { savePosterDatabase() } catch (e) { console.error('poster db save failed:', e) }
  }, 5000)
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

// ============ Auth middleware (reused from main server pattern) ============
function requireAdmin(req, res, next) {
  const adminPhone = process.env.ADMIN_PHONE || '13800138000'
  const auth = req.headers.authorization
  if (auth && auth.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(auth.slice(7), JWT_SECRET)
      if (decoded.phone === adminPhone) return next()
    } catch (_) {}
  }
  return res.status(403).json({ success: false, error: '无管理员权限' })
}

// 获取用户 ID：优先使用 JWT 解析的 phone，不接受可伪造的 x-user-id header
function getUserId(req) {
  const auth = req.headers.authorization
  if (auth && auth.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(auth.slice(7), JWT_SECRET)
      return decoded.phone || ''
    } catch (_) {}
  }
  // 兼容旧前端：仅在开发环境接受 x-user-id
  if (process.env.NODE_ENV !== 'production') {
    return req.headers['x-user-id'] || ''
  }
  return ''
}

// 作品所有权校验中间件
function requireWorkOwner(req, res, next) {
  const userId = getUserId(req)
  if (!userId) {
    return res.status(401).json({ success: false, error: '请先登录' })
  }
  const result = posterDb.exec("SELECT user_id FROM poster_works WHERE id = ?", [req.params.id])
  if (!result.length || !result[0].values.length) {
    return res.status(404).json({ success: false, error: '作品不存在' })
  }
  const workUserId = result[0].values[0][0]
  if (workUserId !== userId) {
    return res.status(403).json({ success: false, error: '无权操作他人作品' })
  }
  next()
}

// ============ Seed 25 poster templates ============
function generateTemplateConfig(t) {
  const configs = {
    // Wedding
    'tpl_wedding_1': {
      width: 750, height: 1334,
      editableAreas: [
        { id: 'title', type: 'text', label: '标题', defaultText: 'WEDDING', x: 60, y: 120, width: 630, height: 80, fontSize: 52, color: '#ffffff', align: 'center', bold: true },
        { id: 'name1', type: 'text', label: '新郎', defaultText: '新郎姓名', x: 120, y: 340, width: 220, height: 60, fontSize: 36, color: '#333333', align: 'center' },
        { id: 'name2', type: 'text', label: '新娘', defaultText: '新娘姓名', x: 410, y: 340, width: 220, height: 60, fontSize: 36, color: '#333333', align: 'center' },
        { id: 'date', type: 'text', label: '日期', defaultText: '2026年10月1日', x: 60, y: 500, width: 630, height: 50, fontSize: 28, color: '#666666', align: 'center' },
        { id: 'photo', type: 'image', label: '新人照片', x: 200, y: 620, width: 350, height: 350, borderRadius: 16 },
        { id: 'blessing', type: 'text', label: '祝福语', defaultText: '执子之手，与子偕老', x: 60, y: 1040, width: 630, height: 50, fontSize: 26, color: '#999999', align: 'center' },
      ],
    },
    'tpl_wedding_2': {
      width: 750, height: 1334,
      editableAreas: [
        { id: 'title', type: 'text', label: '标题', defaultText: '囍', x: 60, y: 80, width: 630, height: 100, fontSize: 64, color: '#c0392b', align: 'center', bold: true },
        { id: 'name1', type: 'text', label: '新郎', defaultText: '新郎', x: 60, y: 280, width: 630, height: 50, fontSize: 34, color: '#8b0000', align: 'center' },
        { id: 'name2', type: 'text', label: '新娘', defaultText: '新娘', x: 60, y: 350, width: 630, height: 50, fontSize: 34, color: '#8b0000', align: 'center' },
        { id: 'date', type: 'text', label: '婚期', defaultText: '二〇二六年 十月一日', x: 60, y: 480, width: 630, height: 50, fontSize: 26, color: '#666', align: 'center' },
        { id: 'photo', type: 'image', label: '婚纱照', x: 150, y: 580, width: 450, height: 450, borderRadius: 12 },
        { id: 'address', type: 'text', label: '地址', defaultText: 'XX酒店 宴会厅', x: 60, y: 1100, width: 630, height: 50, fontSize: 28, color: '#333', align: 'center' },
      ],
    },
    'tpl_wedding_3': {
      width: 750, height: 1334,
      editableAreas: [
        { id: 'title', type: 'text', label: '标题', defaultText: 'Forest Wedding', x: 60, y: 100, width: 630, height: 70, fontSize: 48, color: '#2d5a27', align: 'center', bold: true },
        { id: 'names', type: 'text', label: '姓名', defaultText: 'Jack & Rose', x: 60, y: 260, width: 630, height: 60, fontSize: 38, color: '#3d7a37', align: 'center' },
        { id: 'date', type: 'text', label: '日期', defaultText: '2026.10.01', x: 60, y: 380, width: 630, height: 45, fontSize: 26, color: '#5a8a4a', align: 'center' },
        { id: 'photo', type: 'image', label: '照片', x: 180, y: 500, width: 390, height: 390, borderRadius: 20 },
        { id: 'quote', type: 'text', label: '引言', defaultText: '在这片森林里，许下永恒誓言', x: 60, y: 960, width: 630, height: 50, fontSize: 24, color: '#6a9a5a', align: 'center' },
      ],
    },
    'tpl_wedding_4': {
      width: 750, height: 1334,
      editableAreas: [
        { id: 'title', type: 'text', label: '标题', defaultText: 'SAVE THE DATE', x: 60, y: 140, width: 630, height: 60, fontSize: 40, color: '#333', align: 'center' },
        { id: 'names', type: 'text', label: '姓名', defaultText: '张先生 & 李女士', x: 60, y: 280, width: 630, height: 55, fontSize: 36, color: '#222', align: 'center' },
        { id: 'date', type: 'text', label: '日期', defaultText: '2026.10.01', x: 60, y: 400, width: 630, height: 45, fontSize: 30, color: '#666', align: 'center' },
        { id: 'photo', type: 'image', label: '照片', x: 100, y: 520, width: 550, height: 550, borderRadius: 8 },
        { id: 'address', type: 'text', label: '地址', defaultText: 'XX酒店 · 宴会厅', x: 60, y: 1140, width: 630, height: 45, fontSize: 26, color: '#888', align: 'center' },
      ],
    },
    'tpl_wedding_5': {
      width: 750, height: 1334,
      editableAreas: [
        { id: 'title', type: 'text', label: '标题', defaultText: 'ROYAL WEDDING', x: 60, y: 100, width: 630, height: 70, fontSize: 44, color: '#d4af37', align: 'center', bold: true },
        { id: 'names', type: 'text', label: '姓名', defaultText: 'William & Catherine', x: 60, y: 260, width: 630, height: 60, fontSize: 38, color: '#c5a028', align: 'center' },
        { id: 'date', type: 'text', label: '日期', defaultText: '2026.10.01', x: 60, y: 390, width: 630, height: 45, fontSize: 28, color: '#b8941e', align: 'center' },
        { id: 'photo', type: 'image', label: '照片', x: 140, y: 500, width: 470, height: 470, borderRadius: 16 },
        { id: 'venue', type: 'text', label: '地点', defaultText: 'THE GRAND BALLROOM', x: 60, y: 1040, width: 630, height: 45, fontSize: 26, color: '#a08020', align: 'center' },
        { id: 'footer', type: 'text', label: '底部文字', defaultText: '诚邀您的光临', x: 60, y: 1120, width: 630, height: 40, fontSize: 24, color: '#999', align: 'center' },
      ],
    },
    // Engagement
    'tpl_engagement_1': {
      width: 750, height: 1334,
      editableAreas: [
        { id: 'title', type: 'text', label: '标题', defaultText: '我们订婚啦', x: 60, y: 120, width: 630, height: 70, fontSize: 46, color: '#e84a6e', align: 'center', bold: true },
        { id: 'names', type: 'text', label: '姓名', defaultText: '小明 & 小红', x: 60, y: 280, width: 630, height: 55, fontSize: 36, color: '#d43d5e', align: 'center' },
        { id: 'date', type: 'text', label: '日期', defaultText: '2026年8月8日', x: 60, y: 390, width: 630, height: 45, fontSize: 28, color: '#888', align: 'center' },
        { id: 'photo', type: 'image', label: '照片', x: 170, y: 500, width: 410, height: 410, borderRadius: 50 },
        { id: 'message', type: 'text', label: '留言', defaultText: '从今天起，许你一生一世', x: 60, y: 980, width: 630, height: 50, fontSize: 24, color: '#aaa', align: 'center' },
      ],
    },
    'tpl_engagement_2': {
      width: 750, height: 1334,
      editableAreas: [
        { id: 'title', type: 'text', label: '标题', defaultText: 'ENGAGEMENT', x: 60, y: 100, width: 630, height: 65, fontSize: 42, color: '#f0a0b0', align: 'center', bold: true },
        { id: 'names', type: 'text', label: '姓名', defaultText: 'Tom & Jerry', x: 60, y: 250, width: 630, height: 55, fontSize: 36, color: '#e090a0', align: 'center' },
        { id: 'date', type: 'text', label: '日期', defaultText: '2026.08.08', x: 60, y: 370, width: 630, height: 45, fontSize: 26, color: '#999', align: 'center' },
        { id: 'photo', type: 'image', label: '照片', x: 150, y: 480, width: 450, height: 450, borderRadius: 16 },
        { id: 'quote', type: 'text', label: '引言', defaultText: 'A journey of a thousand miles begins with a single step', x: 40, y: 1000, width: 670, height: 60, fontSize: 22, color: '#bbb', align: 'center' },
      ],
    },
    // Baby
    'tpl_baby_1': {
      width: 750, height: 1334,
      editableAreas: [
        { id: 'title', type: 'text', label: '标题', defaultText: '宝宝满月啦', x: 60, y: 100, width: 630, height: 70, fontSize: 46, color: '#ff9800', align: 'center', bold: true },
        { id: 'name', type: 'text', label: '宝宝名字', defaultText: '小宝贝', x: 60, y: 260, width: 630, height: 55, fontSize: 38, color: '#f57c00', align: 'center' },
        { id: 'date', type: 'text', label: '日期', defaultText: '2026年9月9日', x: 60, y: 370, width: 630, height: 45, fontSize: 28, color: '#888', align: 'center' },
        { id: 'photo', type: 'image', label: '宝宝照片', x: 140, y: 480, width: 470, height: 470, borderRadius: 20 },
        { id: 'message', type: 'text', label: '祝福', defaultText: '健康快乐成长', x: 60, y: 1020, width: 630, height: 45, fontSize: 26, color: '#aaa', align: 'center' },
      ],
    },
    'tpl_baby_2': {
      width: 750, height: 1334,
      editableAreas: [
        { id: 'title', type: 'text', label: '标题', defaultText: '百日宴', x: 60, y: 100, width: 630, height: 70, fontSize: 48, color: '#e91e63', align: 'center', bold: true },
        { id: 'name', type: 'text', label: '宝宝名字', defaultText: '小可爱', x: 60, y: 260, width: 630, height: 55, fontSize: 38, color: '#d81b60', align: 'center' },
        { id: 'date', type: 'text', label: '日期', defaultText: '2026年10月10日', x: 60, y: 370, width: 630, height: 45, fontSize: 28, color: '#888', align: 'center' },
        { id: 'photo', type: 'image', label: '宝宝照片', x: 130, y: 480, width: 490, height: 490, borderRadius: 24 },
        { id: 'address', type: 'text', label: '地址', defaultText: 'XX酒店 3楼宴会厅', x: 60, y: 1040, width: 630, height: 45, fontSize: 26, color: '#888', align: 'center' },
      ],
    },
    'tpl_baby_3': {
      width: 750, height: 1334,
      editableAreas: [
        { id: 'title', type: 'text', label: '标题', defaultText: '周岁快乐', x: 60, y: 100, width: 630, height: 70, fontSize: 48, color: '#ff5722', align: 'center', bold: true },
        { id: 'name', type: 'text', label: '名字', defaultText: '小公主', x: 60, y: 260, width: 630, height: 55, fontSize: 38, color: '#e64a19', align: 'center' },
        { id: 'date', type: 'text', label: '日期', defaultText: '2026年11月11日', x: 60, y: 370, width: 630, height: 45, fontSize: 28, color: '#888', align: 'center' },
        { id: 'photo', type: 'image', label: '照片', x: 160, y: 480, width: 430, height: 430, borderRadius: 50 },
        { id: 'message', type: 'text', label: '祝福', defaultText: '抓周快乐，健康成长', x: 60, y: 980, width: 630, height: 45, fontSize: 26, color: '#999', align: 'center' },
      ],
    },
    // Birthday
    'tpl_birthday_1': {
      width: 750, height: 1334,
      editableAreas: [
        { id: 'title', type: 'text', label: '标题', defaultText: 'HAPPY BIRTHDAY', x: 60, y: 100, width: 630, height: 70, fontSize: 44, color: '#9c27b0', align: 'center', bold: true },
        { id: 'name', type: 'text', label: '寿星', defaultText: '亲爱的', x: 60, y: 260, width: 630, height: 55, fontSize: 36, color: '#7b1fa2', align: 'center' },
        { id: 'date', type: 'text', label: '日期', defaultText: '2026年7月15日', x: 60, y: 370, width: 630, height: 45, fontSize: 28, color: '#888', align: 'center' },
        { id: 'photo', type: 'image', label: '照片', x: 150, y: 480, width: 450, height: 450, borderRadius: 16 },
        { id: 'message', type: 'text', label: '祝福', defaultText: '愿你所有愿望都实现', x: 60, y: 1000, width: 630, height: 45, fontSize: 26, color: '#999', align: 'center' },
      ],
    },
    'tpl_birthday_2': {
      width: 750, height: 1334,
      editableAreas: [
        { id: 'title', type: 'text', label: '标题', defaultText: '生日快乐', x: 60, y: 100, width: 630, height: 70, fontSize: 48, color: '#ff4081', align: 'center', bold: true },
        { id: 'name', type: 'text', label: '寿星', defaultText: '我的好朋友', x: 60, y: 260, width: 630, height: 55, fontSize: 36, color: '#f50057', align: 'center' },
        { id: 'date', type: 'text', label: '日期', defaultText: '2026.07.15', x: 60, y: 370, width: 630, height: 45, fontSize: 28, color: '#888', align: 'center' },
        { id: 'photo', type: 'image', label: '照片', x: 130, y: 480, width: 490, height: 490, borderRadius: 12 },
        { id: 'quote', type: 'text', label: '引言', defaultText: '又长大一岁，愿你永远年轻', x: 60, y: 1040, width: 630, height: 45, fontSize: 24, color: '#aaa', align: 'center' },
      ],
    },
    'tpl_birthday_3': {
      width: 750, height: 1334,
      editableAreas: [
        { id: 'title', type: 'text', label: '标题', defaultText: '成人礼', x: 60, y: 100, width: 630, height: 70, fontSize: 48, color: '#1a237e', align: 'center', bold: true },
        { id: 'name', type: 'text', label: '名字', defaultText: '少年', x: 60, y: 260, width: 630, height: 55, fontSize: 38, color: '#283593', align: 'center' },
        { id: 'date', type: 'text', label: '日期', defaultText: '2026.07.15', x: 60, y: 370, width: 630, height: 45, fontSize: 28, color: '#888', align: 'center' },
        { id: 'photo', type: 'image', label: '照片', x: 150, y: 480, width: 450, height: 450, borderRadius: 8 },
        { id: 'message', type: 'text', label: '寄语', defaultText: '十八而志，青春万岁', x: 60, y: 1000, width: 630, height: 45, fontSize: 26, color: '#5c6bc0', align: 'center' },
      ],
    },
    // House
    'tpl_house_1': {
      width: 750, height: 1334,
      editableAreas: [
        { id: 'title', type: 'text', label: '标题', defaultText: '乔迁之喜', x: 60, y: 100, width: 630, height: 70, fontSize: 48, color: '#e65100', align: 'center', bold: true },
        { id: 'name', type: 'text', label: '主人', defaultText: '王先生 敬邀', x: 60, y: 260, width: 630, height: 55, fontSize: 34, color: '#bf360c', align: 'center' },
        { id: 'date', type: 'text', label: '日期', defaultText: '2026年9月9日', x: 60, y: 370, width: 630, height: 45, fontSize: 28, color: '#888', align: 'center' },
        { id: 'photo', type: 'image', label: '新家照片', x: 140, y: 480, width: 470, height: 400, borderRadius: 12 },
        { id: 'address', type: 'text', label: '地址', defaultText: 'XX小区 3栋 502室', x: 60, y: 940, width: 630, height: 45, fontSize: 28, color: '#555', align: 'center' },
        { id: 'message', type: 'text', label: '邀请语', defaultText: '备薄酒一杯，恭候大驾光临', x: 60, y: 1020, width: 630, height: 45, fontSize: 26, color: '#888', align: 'center' },
      ],
    },
    'tpl_house_2': {
      width: 750, height: 1334,
      editableAreas: [
        { id: 'title', type: 'text', label: '标题', defaultText: '新居入伙', x: 60, y: 100, width: 630, height: 70, fontSize: 46, color: '#d84315', align: 'center', bold: true },
        { id: 'name', type: 'text', label: '主人', defaultText: '李女士 敬邀', x: 60, y: 260, width: 630, height: 55, fontSize: 34, color: '#bf360c', align: 'center' },
        { id: 'date', type: 'text', label: '日期', defaultText: '2026年9月9日', x: 60, y: 370, width: 630, height: 45, fontSize: 28, color: '#888', align: 'center' },
        { id: 'photo', type: 'image', label: '新家照片', x: 140, y: 480, width: 470, height: 400, borderRadius: 12 },
        { id: 'address', type: 'text', label: '地址', defaultText: 'XX花园 8栋 1201室', x: 60, y: 940, width: 630, height: 45, fontSize: 28, color: '#555', align: 'center' },
        { id: 'note', type: 'text', label: '备注', defaultText: '备有茶点，欢迎光临', x: 60, y: 1020, width: 630, height: 40, fontSize: 24, color: '#999', align: 'center' },
      ],
    },
    // Parents
    'tpl_parents_1': {
      width: 750, height: 1334,
      editableAreas: [
        { id: 'title', type: 'text', label: '标题', defaultText: '感恩父母', x: 60, y: 100, width: 630, height: 70, fontSize: 46, color: '#6d4c41', align: 'center', bold: true },
        { id: 'name', type: 'text', label: '父母名字', defaultText: '父亲 · 母亲', x: 60, y: 260, width: 630, height: 55, fontSize: 36, color: '#5d4037', align: 'center' },
        { id: 'date', type: 'text', label: '日期', defaultText: '2026年10月1日', x: 60, y: 370, width: 630, height: 45, fontSize: 28, color: '#888', align: 'center' },
        { id: 'photo', type: 'image', label: '照片', x: 150, y: 480, width: 450, height: 450, borderRadius: 12 },
        { id: 'message', type: 'text', label: '感恩语', defaultText: '养育之恩，永生难忘', x: 60, y: 1000, width: 630, height: 45, fontSize: 26, color: '#8d6e63', align: 'center' },
      ],
    },
    'tpl_parents_2': {
      width: 750, height: 1334,
      editableAreas: [
        { id: 'title', type: 'text', label: '标题', defaultText: '寿宴请柬', x: 60, y: 100, width: 630, height: 70, fontSize: 48, color: '#b71c1c', align: 'center', bold: true },
        { id: 'name', type: 'text', label: '寿星', defaultText: '父亲大人 七十大寿', x: 60, y: 260, width: 630, height: 55, fontSize: 34, color: '#c62828', align: 'center' },
        { id: 'date', type: 'text', label: '日期', defaultText: '2026年10月1日', x: 60, y: 370, width: 630, height: 45, fontSize: 28, color: '#888', align: 'center' },
        { id: 'photo', type: 'image', label: '照片', x: 160, y: 480, width: 430, height: 430, borderRadius: 12 },
        { id: 'address', type: 'text', label: '地址', defaultText: 'XX酒楼 牡丹厅', x: 60, y: 980, width: 630, height: 45, fontSize: 28, color: '#555', align: 'center' },
        { id: 'footer', type: 'text', label: '底部文字', defaultText: '敬请光临', x: 60, y: 1060, width: 630, height: 40, fontSize: 24, color: '#999', align: 'center' },
      ],
    },
    // Study
    'tpl_study_1': {
      width: 750, height: 1334,
      editableAreas: [
        { id: 'title', type: 'text', label: '标题', defaultText: '升学宴', x: 60, y: 100, width: 630, height: 70, fontSize: 48, color: '#1565c0', align: 'center', bold: true },
        { id: 'name', type: 'text', label: '名字', defaultText: '同学', x: 60, y: 260, width: 630, height: 55, fontSize: 38, color: '#1976d2', align: 'center' },
        { id: 'school', type: 'text', label: '学校', defaultText: 'XX大学 录取', x: 60, y: 340, width: 630, height: 45, fontSize: 30, color: '#42a5f5', align: 'center' },
        { id: 'date', type: 'text', label: '日期', defaultText: '2026年8月18日', x: 60, y: 430, width: 630, height: 45, fontSize: 28, color: '#888', align: 'center' },
        { id: 'photo', type: 'image', label: '照片', x: 160, y: 540, width: 430, height: 400, borderRadius: 12 },
        { id: 'message', type: 'text', label: '寄语', defaultText: '金榜题名，前程似锦', x: 60, y: 1000, width: 630, height: 45, fontSize: 26, color: '#1e88e5', align: 'center' },
      ],
    },
    'tpl_study_2': {
      width: 750, height: 1334,
      editableAreas: [
        { id: 'title', type: 'text', label: '标题', defaultText: '谢师宴', x: 60, y: 100, width: 630, height: 70, fontSize: 48, color: '#00695c', align: 'center', bold: true },
        { id: 'name', type: 'text', label: '名字', defaultText: 'XX班全体同学', x: 60, y: 260, width: 630, height: 55, fontSize: 34, color: '#00796b', align: 'center' },
        { id: 'date', type: 'text', label: '日期', defaultText: '2026年8月18日', x: 60, y: 370, width: 630, height: 45, fontSize: 28, color: '#888', align: 'center' },
        { id: 'photo', type: 'image', label: '照片', x: 140, y: 480, width: 470, height: 400, borderRadius: 12 },
        { id: 'message', type: 'text', label: '感谢语', defaultText: '师恩难忘，桃李芬芳', x: 60, y: 940, width: 630, height: 45, fontSize: 26, color: '#00897b', align: 'center' },
        { id: 'address', type: 'text', label: '地址', defaultText: 'XX酒店 3楼宴会厅', x: 60, y: 1020, width: 630, height: 40, fontSize: 26, color: '#555', align: 'center' },
      ],
    },
    // Poster
    'tpl_poster_1': {
      width: 750, height: 1334,
      editableAreas: [
        { id: 'title', type: 'text', label: '标题', defaultText: '活动主题', x: 60, y: 100, width: 630, height: 80, fontSize: 52, color: '#ffffff', align: 'center', bold: true },
        { id: 'subtitle', type: 'text', label: '副标题', defaultText: '精彩不容错过', x: 60, y: 220, width: 630, height: 50, fontSize: 30, color: '#e0e0e0', align: 'center' },
        { id: 'date', type: 'text', label: '时间', defaultText: '2026年10月1日 14:00', x: 60, y: 340, width: 630, height: 45, fontSize: 28, color: '#ffffff', align: 'center' },
        { id: 'photo', type: 'image', label: '主图', x: 100, y: 440, width: 550, height: 400, borderRadius: 16 },
        { id: 'address', type: 'text', label: '地点', defaultText: 'XX会展中心', x: 60, y: 900, width: 630, height: 45, fontSize: 28, color: '#ffffff', align: 'center' },
        { id: 'contact', type: 'text', label: '联系方式', defaultText: '联系电话: 138-0000-0000', x: 60, y: 980, width: 630, height: 40, fontSize: 24, color: '#ccc', align: 'center' },
      ],
    },
    'tpl_poster_2': {
      width: 750, height: 1334,
      editableAreas: [
        { id: 'title', type: 'text', label: '标题', defaultText: '新品发布', x: 60, y: 80, width: 630, height: 75, fontSize: 50, color: '#fff', align: 'center', bold: true },
        { id: 'subtitle', type: 'text', label: '副标题', defaultText: '颠覆你的想象', x: 60, y: 200, width: 630, height: 45, fontSize: 28, color: '#ddd', align: 'center' },
        { id: 'date', type: 'text', label: '日期', defaultText: '2026.10.01', x: 60, y: 310, width: 630, height: 40, fontSize: 26, color: '#fff', align: 'center' },
        { id: 'photo', type: 'image', label: '产品图', x: 80, y: 400, width: 590, height: 500, borderRadius: 12 },
        { id: 'cta', type: 'text', label: '行动号召', defaultText: '立即预约', x: 150, y: 960, width: 450, height: 60, fontSize: 32, color: '#fff', align: 'center', bold: true },
      ],
    },
    'tpl_poster_3': {
      width: 750, height: 1334,
      editableAreas: [
        { id: 'title', type: 'text', label: '标题', defaultText: '商务会议', x: 60, y: 100, width: 630, height: 70, fontSize: 44, color: '#1a237e', align: 'center', bold: true },
        { id: 'subtitle', type: 'text', label: '副标题', defaultText: '2026年度战略峰会', x: 60, y: 210, width: 630, height: 45, fontSize: 28, color: '#283593', align: 'center' },
        { id: 'date', type: 'text', label: '日期', defaultText: '2026年10月1日', x: 60, y: 310, width: 630, height: 40, fontSize: 26, color: '#666', align: 'center' },
        { id: 'photo', type: 'image', label: '图片', x: 120, y: 400, width: 510, height: 400, borderRadius: 8 },
        { id: 'address', type: 'text', label: '地点', defaultText: 'XX国际会议中心', x: 60, y: 860, width: 630, height: 45, fontSize: 28, color: '#333', align: 'center' },
        { id: 'speaker', type: 'text', label: '嘉宾', defaultText: '主讲嘉宾：待定', x: 60, y: 940, width: 630, height: 40, fontSize: 24, color: '#888', align: 'center' },
        { id: 'contact', type: 'text', label: '联系方式', defaultText: '报名热线: 400-000-0000', x: 60, y: 1020, width: 630, height: 40, fontSize: 24, color: '#999', align: 'center' },
      ],
    },
    // Creative
    'tpl_creative_1': {
      width: 750, height: 1334,
      editableAreas: [
        { id: 'title', type: 'text', label: '标题', defaultText: '创意无限', x: 60, y: 100, width: 630, height: 70, fontSize: 48, color: '#fff', align: 'center', bold: true },
        { id: 'subtitle', type: 'text', label: '副标题', defaultText: 'DESIGN YOUR LIFE', x: 60, y: 210, width: 630, height: 45, fontSize: 26, color: '#ddd', align: 'center' },
        { id: 'photo', type: 'image', label: '主图', x: 80, y: 320, width: 590, height: 590, borderRadius: 16 },
        { id: 'message', type: 'text', label: '描述', defaultText: '用设计改变世界', x: 60, y: 970, width: 630, height: 45, fontSize: 28, color: '#fff', align: 'center' },
        { id: 'cta', type: 'text', label: '行动号召', defaultText: '了解更多', x: 200, y: 1060, width: 350, height: 50, fontSize: 28, color: '#ffd54f', align: 'center' },
      ],
    },
    'tpl_creative_2': {
      width: 750, height: 1334,
      editableAreas: [
        { id: 'title', type: 'text', label: '标题', defaultText: '艺术海报', x: 60, y: 100, width: 630, height: 70, fontSize: 44, color: '#333', align: 'center', bold: true },
        { id: 'artist', type: 'text', label: '艺术家', defaultText: 'Artist Name', x: 60, y: 210, width: 630, height: 45, fontSize: 28, color: '#888', align: 'center' },
        { id: 'photo', type: 'image', label: '作品图', x: 80, y: 320, width: 590, height: 550, borderRadius: 8 },
        { id: 'desc', type: 'text', label: '描述', defaultText: 'Art is not what you see, but what you make others see', x: 40, y: 930, width: 670, height: 60, fontSize: 22, color: '#666', align: 'center' },
        { id: 'date', type: 'text', label: '日期', defaultText: '2026.10.01 - 2026.12.31', x: 60, y: 1040, width: 630, height: 40, fontSize: 24, color: '#aaa', align: 'center' },
      ],
    },
    'tpl_creative_3': {
      width: 750, height: 1334,
      editableAreas: [
        { id: 'title', type: 'text', label: '标题', defaultText: '个性定制', x: 60, y: 100, width: 630, height: 70, fontSize: 48, color: '#fff', align: 'center', bold: true },
        { id: 'subtitle', type: 'text', label: '副标题', defaultText: 'YOUR STYLE', x: 60, y: 210, width: 630, height: 45, fontSize: 26, color: '#ddd', align: 'center' },
        { id: 'photo', type: 'image', label: '照片', x: 100, y: 320, width: 550, height: 550, borderRadius: 20 },
        { id: 'name', type: 'text', label: '名字', defaultText: '你的名字', x: 60, y: 940, width: 630, height: 50, fontSize: 36, color: '#fff', align: 'center' },
        { id: 'message', type: 'text', label: '个性签名', defaultText: '做最真实的自己', x: 60, y: 1030, width: 630, height: 45, fontSize: 24, color: '#ccc', align: 'center' },
      ],
    },
  }
  return configs[t.id] || {
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

// GET /templates — list poster templates (query: category_id, keyword, page, limit)
router.get('/templates', (req, res) => {
  try {
    const { category_id, keyword, page: pageStr, limit: limitStr } = req.query
    const page = Math.max(1, parseInt(pageStr, 10) || 1)
    const limit = Math.max(1, Math.min(100, parseInt(limitStr, 10) || 20))
    const offset = (page - 1) * limit

    let sql = "SELECT * FROM poster_templates WHERE is_active = 1"
    const params = []

    if (category_id) {
      sql += " AND category_id = ?"
      params.push(category_id)
    }
    if (keyword) {
      sql += " AND name LIKE ? ESCAPE '\\'"
      // 转义 LIKE 通配符
      const escaped = keyword.replace(/([%_\\])/g, '\\$1')
      params.push(`%${escaped}%`)
    }
    sql += " ORDER BY use_count DESC, like_count DESC"

    // Get total count
    const countSql = sql.replace("SELECT *", "SELECT COUNT(*)")
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
    // Increment use_count (不立即写磁盘，避免频繁 I/O)
    posterDb.run("UPDATE poster_templates SET use_count = use_count + 1 WHERE id = ?", [req.params.id])
    // 延迟保存：标记需要保存，由定时器批量写入
    scheduleSave()
    res.json({ success: true, data: template })
  } catch (e) {
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

    posterDb.run(`INSERT INTO poster_works (id, user_id, template_id, template_name, cover_url, content, poster_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
      id, userId, template_id || '',
      template_name || '', cover_url || '',
      JSON.stringify(content || {}), poster_url || '', now,
    ])
    savePosterDatabase()

    const result = posterDb.exec("SELECT * FROM poster_works WHERE id = ?", [id])
    const work = resultToObject(result)
    res.json({ success: true, data: work })
  } catch (e) {
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
    const result = posterDb.exec(
      "SELECT * FROM poster_works WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    )
    const works = resultToArray(result)
    res.json({ success: true, data: works, total: works.length })
  } catch (e) {
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
    res.status(500).json({ success: false, error: '服务器错误' })
  }
})

// PUT /works/:id — update work (requires ownership)
router.put('/works/:id', requireWorkOwner, (req, res) => {
  try {
    const result = posterDb.exec("SELECT * FROM poster_works WHERE id = ?", [req.params.id])
    const existing = resultToObject(result)
    if (!existing) {
      return res.status(404).json({ success: false, error: '作品不存在' })
    }

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
    savePosterDatabase()

    const updated = posterDb.exec("SELECT * FROM poster_works WHERE id = ?", [req.params.id])
    res.json({ success: true, data: resultToObject(updated) })
  } catch (e) {
    res.status(500).json({ success: false, error: '服务器错误' })
  }
})

// POST /works/:id/upload — upload work poster image (requires ownership)
router.post('/works/:id/upload', requireWorkOwner, (req, res) => {
  try {
    if (!req.files && !req.file && !req.body.image) {
      return res.status(400).json({ success: false, error: '请上传图片文件' })
    }

    const workId = req.params.id
    const existing = posterDb.exec("SELECT id FROM poster_works WHERE id = ?", [workId])
    if (!existing.length || !existing[0].values.length) {
      return res.status(404).json({ success: false, error: '作品不存在' })
    }

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
      savePosterDatabase()

      return res.json({ success: true, data: { url: posterUrl } })
    }

    return res.status(400).json({ success: false, error: '请提供 base64 编码的图片数据' })
  } catch (e) {
    res.status(500).json({ success: false, error: '服务器错误' })
  }
})

// DELETE /works/:id — delete work (requires ownership)
router.delete('/works/:id', requireWorkOwner, (req, res) => {
  try {
    const result = posterDb.exec("SELECT id FROM poster_works WHERE id = ?", [req.params.id])
    if (!result.length || !result[0].values.length) {
      return res.status(404).json({ success: false, error: '作品不存在' })
    }
    posterDb.run("DELETE FROM poster_works WHERE id = ?", [req.params.id])
    savePosterDatabase()
    res.json({ success: true, message: '删除成功' })
  } catch (e) {
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
    savePosterDatabase()

    const result = posterDb.exec("SELECT * FROM poster_templates WHERE id = ?", [id])
    res.json({ success: true, data: resultToObject(result) })
  } catch (e) {
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

    const { name, category_id, cover_url, background_url, config, is_free, is_vip, like_count, use_count, is_active } = req.body
    const fields = []
    const params = []

    const allowedFields = { name: 'name', category_id: 'category_id', cover_url: 'cover_url', background_url: 'background_url', is_free: 'is_free', is_vip: 'is_vip', like_count: 'like_count', use_count: 'use_count', is_active: 'is_active' }
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
    savePosterDatabase()

    const result = posterDb.exec("SELECT * FROM poster_templates WHERE id = ?", [req.params.id])
    res.json({ success: true, data: resultToObject(result) })
  } catch (e) {
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
