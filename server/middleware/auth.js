// ============ 公共鉴权中间件 ============
// 提取 requireAuth 与 requireAdmin 供 index.js 与 routes/poster.js 复用，
// 避免两处各自维护重复逻辑导致行为不一致。

// 登录鉴权中间件：校验请求中是否携带有效 JWT 且包含 phone 字段
function requireAuth(req, res, next) {
  if (!req.user || !req.user.phone) {
    return res.status(401).json({ success: false, error: '请先登录' })
  }
  next()
}

// 管理员鉴权中间件：同时校验 JWT 中的 role 字段与手机号，二者满足其一即可放行
// - req.user.role === 'admin'：登录时签发的 JWT 中已标记为管理员
// - req.user.phone === ADMIN_PHONE：兼容旧 token（未携带 role 字段的情况）
function requireAdmin(req, res, next) {
  const adminPhone = process.env.ADMIN_PHONE || '13800138000'
  if (req.user && (req.user.role === 'admin' || req.user.phone === adminPhone)) {
    return next()
  }
  return res.status(403).json({ success: false, error: '无管理员权限' })
}

// 判断当前请求是否来自管理员（公开接口中据此对 deleted 资源做差异化可见性控制）
function isRequestFromAdmin(req) {
  const adminPhone = process.env.ADMIN_PHONE || '13800138000'
  return !!(req.user && (req.user.role === 'admin' || req.user.phone === adminPhone))
}

module.exports = { requireAuth, requireAdmin, isRequestFromAdmin }
