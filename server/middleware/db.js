// ============ 数据库事务辅助函数 ============
// sql.js（SQLite WASM）不提供自动事务，需手动 BEGIN/COMMIT/ROLLBACK。
// 此辅助函数封装事务逻辑：任一操作失败则回滚，保证数据一致性。

// runTransaction(dbInstance, operations)
// - dbInstance: sql.js Database 实例（index.js 的 db 或 poster.js 的 posterDb）
// - operations: 回调函数，内部执行一组 db.run(...) 语句
// 成功返回 true，失败抛出异常（已自动回滚）
function runTransaction(dbInstance, operations) {
  try {
    dbInstance.run('BEGIN TRANSACTION')
    operations()
    dbInstance.run('COMMIT')
    return true
  } catch (e) {
    // 回滚失败不应掩盖原始异常，仅记录日志
    try {
      dbInstance.run('ROLLBACK')
    } catch (_) {
      console.error('事务回滚失败:', _)
    }
    throw e
  }
}

module.exports = { runTransaction }
