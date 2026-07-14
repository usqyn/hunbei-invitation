// ============ cleanup 云函数 ============
// 定时清理过期数据，避免数据库膨胀。
// 触发方式：定时触发器（cron），建议每天凌晨 3 点执行。
//
// config.json 中已配置定时触发器：
//   "0 0 3 * * * *"  → 每天 03:00:00 执行（北京时间）
//
// 清理项：
//   1. sms_codes：删除已过期（expireAt < now）的验证码记录
//   2. events：删除 30 天前的事件追踪记录
//   3. footprints：删除 30 天前的浏览足迹
//   4. recycle_bin：删除 30 天前的回收站记录（主库）
//   5. recycle_bin_poster：删除 30 天前的回收站记录（poster 库）
//   6. notifications：删除 90 天前已读通知
//
// 支持两种调用方式：
// - 定时触发器：event.Trigger === 'Timer' 或 event.Message === 'Timer'
// - HTTP 触发器：POST /cleanup（管理员鉴权，便于手动触发）

const {
  db, collection, _, nowMs,
  requireAdmin,
  ok, httpOK, httpFail, httpOptions,
  parseBody,
} = require('./_shared')

// 30 天前的时间戳（毫秒）
const THIRTY_DAYS_AGO = () => nowMs() - 30 * 24 * 60 * 60 * 1000
// 90 天前的时间戳（毫秒）
const NINETY_DAYS_AGO = () => nowMs() - 90 * 24 * 60 * 60 * 1000

// 单次删除上限（云数据库单次 remove 上限 1000 条）
const BATCH_LIMIT = 1000

// 分批删除：循环删除直到无更多数据
const removeInBatches = async (collName, condition) => {
  let removed = 0
  let iterations = 0
  // 防止无限循环（最多 50 轮，最多 5 万条）
  while (iterations < 50) {
    iterations++
    const res = await collection(collName).where(condition).limit(BATCH_LIMIT).remove()
    const removedNow = (res && res.stats && res.stats.removed) || 0
    removed += removedNow
    if (removedNow < BATCH_LIMIT) break
  }
  return removed
}

// 执行清理任务，返回每项的清理统计
const runCleanup = async () => {
  const stats = {}
  const ts = nowMs()

  // 1. sms_codes：清理已过期验证码
  try {
    const removed = await removeInBatches('sms_codes', { expireAt: _.lt(ts) })
    stats.sms_codes = removed
    console.log(`[cleanup] sms_codes 删除 ${removed} 条`)
  } catch (e) {
    stats.sms_codes = `error: ${e.message}`
    console.error('[cleanup] sms_codes failed:', e)
  }

  // 2. events：删除 30 天前的事件追踪
  try {
    const removed = await removeInBatches('events', { timestamp: _.lt(THIRTY_DAYS_AGO()) })
    stats.events = removed
    console.log(`[cleanup] events 删除 ${removed} 条`)
  } catch (e) {
    stats.events = `error: ${e.message}`
    console.error('[cleanup] events failed:', e)
  }

  // 3. footprints：删除 30 天前的足迹
  try {
    const removed = await removeInBatches('footprints', { timestamp: _.lt(THIRTY_DAYS_AGO()) })
    stats.footprints = removed
    console.log(`[cleanup] footprints 删除 ${removed} 条`)
  } catch (e) {
    stats.footprints = `error: ${e.message}`
    console.error('[cleanup] footprints failed:', e)
  }

  // 4. recycle_bin：删除 30 天前的回收站记录（按 deletedAt 字段过滤）
  try {
    const removed = await removeInBatches('recycle_bin', { deletedAt: _.lt(THIRTY_DAYS_AGO().toString()) })
    stats.recycle_bin = removed
    console.log(`[cleanup] recycle_bin 删除 ${removed} 条`)
  } catch (e) {
    stats.recycle_bin = `error: ${e.message}`
    console.error('[cleanup] recycle_bin failed:', e)
  }

  // 5. recycle_bin_poster：删除 30 天前的回收站记录（按 deleted_at 字段过滤）
  try {
    const removed = await removeInBatches('recycle_bin_poster', { deleted_at: _.lt(THIRTY_DAYS_AGO().toString()) })
    stats.recycle_bin_poster = removed
    console.log(`[cleanup] recycle_bin_poster 删除 ${removed} 条`)
  } catch (e) {
    stats.recycle_bin_poster = `error: ${e.message}`
    console.error('[cleanup] recycle_bin_poster failed:', e)
  }

  // 6. notifications：删除 90 天前的已读通知
  try {
    const removed = await removeInBatches('notifications', {
      read: 1,
      createdAt: _.lt(NINETY_DAYS_AGO().toString()),
    })
    stats.notifications = removed
    console.log(`[cleanup] notifications 删除 ${removed} 条`)
  } catch (e) {
    stats.notifications = `error: ${e.message}`
    console.error('[cleanup] notifications failed:', e)
  }

  return stats
}

// ============ 云函数入口 ============
exports.main = async (event, context) => {
  console.log('[cleanup] 触发参数:', JSON.stringify(event))

  // 1. 定时触发器：event.Trigger 或 event.Message === 'Timer'
  if (event.Trigger === 'Timer' || event.Message === 'Timer' || event.Type === 'Timer') {
    console.log('[cleanup] 定时触发器调用，开始清理...')
    try {
      const stats = await runCleanup()
      console.log('[cleanup] 完成:', JSON.stringify(stats))
      return stats
    } catch (e) {
      console.error('[cleanup] 失败:', e)
      return { error: e.message }
    }
  }

  // 2. HTTP 触发器：OPTIONS 预检
  if (event.httpMethod === 'OPTIONS') return httpOptions()

  // 3. HTTP 触发器：管理员手动触发
  if (event.httpMethod === 'POST') {
    const auth = requireAdmin(event)
    if (!auth.ok) return auth.body
    try {
      const stats = await runCleanup()
      return httpOK(ok({ stats, timestamp: nowMs() }))
    } catch (e) {
      console.error('[cleanup] HTTP 触发失败:', e)
      return httpFail('清理失败: ' + e.message, 500)
    }
  }

  // 4. 其他情况：不响应
  return httpFail('不支持的调用方式', 400)
}
