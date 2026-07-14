// ============ build.js：部署前同步 _shared 到各云函数 ============
// 把 _shared/index.js 复制为各云函数目录下的 _shared.js，使每个云函数能独立部署。
//
// 用法：
//   node build.js
//
// 注意：仅复制 _shared/index.js 一个文件，不复制 README.md。
// 复制后各云函数 require('./_shared.js') 引用（部署时随函数包一起上传）。

const fs = require('fs')
const path = require('path')

const SHARED_SRC = path.join(__dirname, '_shared', 'index.js')
const FUNCTIONS = ['common', 'user', 'template', 'work', 'order', 'upload', 'poster', 'export']

if (!fs.existsSync(SHARED_SRC)) {
  console.error('❌ 找不到 _shared/index.js，请先创建公共代码')
  process.exit(1)
}

const sharedContent = fs.readFileSync(SHARED_SRC, 'utf-8')
let copied = 0
let skipped = 0

FUNCTIONS.forEach(name => {
  const fnDir = path.join(__dirname, name)
  if (!fs.existsSync(fnDir)) {
    console.warn(`  ⚠️  跳过 ${name}/（目录不存在）`)
    skipped++
    return
  }
  const target = path.join(fnDir, '_shared.js')
  fs.writeFileSync(target, sharedContent)
  console.log(`  ✅ ${name}/_shared.js 已同步`)
  copied++
})

console.log(`\n同步完成：${copied} 个函数已更新，${skipped} 个跳过`)
