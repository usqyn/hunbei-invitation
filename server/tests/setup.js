// ============ 测试环境初始化 ============
// 该模块在被首次 require 时完成：
// 1) 注入测试所需的环境变量（必须在 require('../index') 之前，因为 index.js
//    顶部会在 JWT_SECRET 缺失时 process.exit(1)）
// 2) 为每个测试进程分配独立的临时数据库文件，绝不污染真实的 data.db / poster.db
// 3) 导出 app、数据库初始化函数 ensureDb 以及 JWT 生成辅助函数
//
// 注意：本文件使用 CommonJS（require / module.exports），目的是让 server 及其
// 依赖（sql.js、multer、poster 路由等）全部经由 Node 原生 require 加载，
// 而非被 vitest/vite 二次转译，避免 wasm / 原生模块兼容性问题。

const path = require('path')
const fs = require('fs')
const os = require('os')
const jwt = require('jsonwebtoken')

// ===== 关键：环境变量必须在 require('../index') 之前设置 =====
// 与服务端共享同一个 JWT_SECRET，以便测试签发的 token 能通过服务端校验
process.env.JWT_SECRET = 'TOYtamaxia-test-secret'
process.env.NODE_ENV = 'test'
// 管理员手机号（与 middleware/auth.js 默认值保持一致）
process.env.ADMIN_PHONE = process.env.ADMIN_PHONE || '13800138000'
// 开发环境万能验证码（/api/user/login 在非 production 下使用 DEV_CODE || '000000'）
process.env.DEV_CODE = process.env.DEV_CODE || '000000'

// 每个测试进程使用独立的临时数据库文件，绝不触碰真实的 data.db / poster.db
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'TOYtamaxia-test-'))
process.env.DB_PATH = path.join(tmpDir, 'test-data.db')
process.env.POSTER_DB_PATH = path.join(tmpDir, 'test-poster.db')

// require.main !== module => start() 不会被调用，app 不会监听端口
const { app, initDatabase } = require('../index')
// poster 路由在 require 时会自动执行 init()，导出 posterReady 以便等待就绪
const poster = require('../routes/poster')

// 数据库懒初始化（每个测试进程只初始化一次，保证测试用例运行前数据库已就绪）
let _dbReady
function ensureDb() {
  if (!_dbReady) {
    _dbReady = (async () => {
      await initDatabase()
      await poster.posterReady
    })()
  }
  return _dbReady
}

// 生成测试用 JWT（与服务端共用同一个 JWT_SECRET，expiresIn 与服务端一致 30d）
function makeToken(opts = {}) {
  const { phone = '13800000001', role = 'user' } = opts
  return jwt.sign({ phone, role }, process.env.JWT_SECRET, { expiresIn: '30d' })
}

// 管理员 token（role=admin，requireAdmin 中间件据此放行）
function makeAdminToken(opts = {}) {
  return makeToken({ phone: process.env.ADMIN_PHONE, role: 'admin', ...opts })
}

module.exports = {
  app,
  ensureDb,
  makeToken,
  makeAdminToken,
  JWT_SECRET: process.env.JWT_SECRET,
}
