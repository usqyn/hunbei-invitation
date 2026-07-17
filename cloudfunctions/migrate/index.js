const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-d1g9id3fjffcefe0d' })
const db = cloud.database()

// 所有需要创建的集合
const ALL_COLLECTIONS = [
  'templates', 'categories', 'music', 'users', 'works', 'orders',
  'favorites', 'footprints', 'notifications', 'feedback', 'events',
  'recycle_bin', 'settings', 'poster_templates', 'poster_works',
  'recycle_bin_poster', 'sms_codes'
]

exports.main = async (event, context) => {
  const results = []
  
  for (const coll of ALL_COLLECTIONS) {
    try {
      await db.collection(coll).add({ data: { _init: true, _at: Date.now() } })
      await db.collection(coll).where({ _init: true }).remove()
      results.push(`${coll}: created`)
    } catch (e) {
      results.push(`${coll}: ${e.errMsg || e.message}`)
    }
  }
  
  return { success: true, results }
}
