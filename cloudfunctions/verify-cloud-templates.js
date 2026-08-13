/**
 * 验证云数据库模板数据是否正确
 */
const tcb = require('@cloudbase/node-sdk')

const ENV_ID = 'cloud1-d4gyvmo1d9a1e148a'
const API_KEY = process.env.CLOUDBASE_APIKEY || 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjlkMWRjMzFlLWI0ZDAtNDQ4Yi1hNzZmLWIwY2M2M2Q4MTQ5OCJ9.eyJhdWQiOiJjbG91ZDEtZDRneXZtbzFkOWExZTE0OGEiLCJleHAiOjI1MzQwMjMwMDc5OSwiaWF0IjoxNzg1ODQ0ODQ5LCJhdF9oYXNoIjoibTBKZ2dGV2xTUXkzclJwMmliTUV5QSIsInByb2plY3RfaWQiOiJjbG91ZDEtZDRneXZtbzFkOWExZTE0OGEiLCJtZXRhIjp7InBsYXRmb3JtIjoiQXBpS2V5In0sImFkbWluaXN0cmF0b3JfaWQiOiIyMDgxNzAwNjQ4Mjc4NTk3NjM0IiwidXNlcl90eXBlIjoiIiwiY2xpZW50X3R5cGUiOiJjbGllbnRfc2VydmVyIiwiaXNfc3lzdGVtX2FkbWluIjp0cnVlfQ.Y5TYJuE3uqS2GIYJLxNm6-BobPE9Nycj9P7du0kICs0HF9ApclF4qNwh2Shi-j-hC9we-RD5uH99twQfbKLqgnrOxDmgjPm6IuollzgOgI1T3wxw0xyZVczYOLZFbp-Yjpg00G8gfQZQoEUXzNA0Sedv4qCQagegc1XcRXIJ20JgtlEoeNY1_QUw4rnhfv2Vi-BuuEyO44e3BMq6UIeTaK1FsFZ8kcBFLmccyKeUj_8jKbIXbtui-0omZ3-k453mhcg_KfW4JaxwCm0Fe2Hi20J6LZXZlTtEJGKJJBJjKdLg1cvYYxC8YyrPmIHDDAI-7TLuk01eqIZnLQdFguZUiw'

const app = tcb.init({
  env: ENV_ID,
  accessKey: API_KEY,
  endpoint: `https://${ENV_ID}.api.tcloudbasegateway.com`,
})
const db = app.database()

const TARGET_IDS = [
  '0870bf37-44e9-44fa-9fe6-90f2aa6aa14a',
  '1b932703-bb50-4ff2-8bfa-003c4eab8bc1',
  '672e14d1-617d-4852-a8a0-09204747f67f',
  'f81841bf-d2f8-4daf-bebb-e8fe655fe86b',
  'b1303fe4-70ea-4b27-9ce5-5de78e71c348',
  '1ae9cb14-923c-44b0-994c-c7eecf1c3b32',
  '44319915-114d-442c-90e1-057a62c25612',
  '49c2689a-c29b-4a7d-bced-b2cbeb00df3c',
  'a98bd7b0-c367-4212-a939-0f0cf9e353f0',
  '9aba5b53-f25d-41e0-8008-b7e1e55b02dd',
]

async function main() {
  console.log('=== 验证云数据库模板修复结果 ===\n')

  for (const id of TARGET_IDS) {
    const res = await db.collection('templates').where({ id }).limit(1).get()
    const t = res.data[0]
    if (!t) { console.log(`[${id}] 不存在`); continue }

    const issues = []
    // 检查字段类型
    if (typeof t.elements === 'string') issues.push('elements 是字符串')
    if (typeof t.data === 'string') issues.push('data 是字符串')
    if (typeof t.pages === 'string') issues.push('pages 是字符串')
    if (typeof t.canvasSize === 'string') issues.push('canvasSize 是字符串')
    if (typeof t.background === 'string') issues.push('background 是字符串')

    // 检查 localhost URL
    const jsonStr = JSON.stringify(t)
    if (/localhost|127\.0\.0\.1/.test(jsonStr)) issues.push('包含 localhost URL')

    if (issues.length === 0) {
      console.log(`[${id}] ${t.name} - OK`)
    } else {
      console.log(`[${id}] ${t.name} - FAIL: ${issues.join(', ')}`)
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
