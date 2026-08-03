// 拆大 JSON 文件 + 转 JS 模块，打包进云函数
const fs = require('fs')
const path = require('path')

const BATCH_DIR = path.resolve(__dirname, '..', '.migration_batches')
const OUTPUT_DIR = path.resolve(__dirname, 'migrate', 'batches')

// 清空并重建输出目录
if (fs.existsSync(OUTPUT_DIR)) fs.rmSync(OUTPUT_DIR, { recursive: true })
fs.mkdirSync(OUTPUT_DIR, { recursive: true })

const manifest = JSON.parse(fs.readFileSync(path.join(BATCH_DIR, 'manifest.json'), 'utf8'))
const CHUNK_SIZE = 10 // 每个文件最多 10 条记录

let totalFileSize = 0
const newManifest = []

for (const entry of manifest) {
  const { collection, pk, batchCount, total } = entry
  if (total === 0) {
    newManifest.push({ ...entry, chunkFiles: [] })
    continue
  }

  // 收集所有批次数据
  let allData = []
  for (let b = 0; b < batchCount; b++) {
    const filePath = path.join(BATCH_DIR, `${collection}_batch${String(b).padStart(3, '0')}.json`)
    if (fs.existsSync(filePath)) {
      allData = allData.concat(JSON.parse(fs.readFileSync(filePath, 'utf8')))
    }
  }

  // 拆成 CHUNK_SIZE 条一组
  const chunkFiles = []
  for (let i = 0; i < allData.length; i += CHUNK_SIZE) {
    const chunk = allData.slice(i, i + CHUNK_SIZE)
    const chunkName = `${collection}_${String(chunkFiles.length).padStart(3, '0')}.js`
    const content = `module.exports = ${JSON.stringify(chunk)};`
    fs.writeFileSync(path.join(OUTPUT_DIR, chunkName), content, 'utf8')
    const size = fs.statSync(path.join(OUTPUT_DIR, chunkName)).size
    chunkFiles.push({ file: chunkName, size, count: chunk.length })
    totalFileSize += size
  }

  console.log(`  ${collection}: ${total} records → ${chunkFiles.length} chunks (${(chunkFiles.reduce((s,f)=>s+f.size,0)/1024).toFixed(0)} KB)`)
  newManifest.push({ 
    collection, pk, total,
    chunkCount: chunkFiles.length,
    totalSize: chunkFiles.reduce((s,f)=>s+f.size,0),
    chunkFiles 
  })
}

// 写 manifest
fs.writeFileSync(path.join(OUTPUT_DIR, '_manifest.json'), JSON.stringify(newManifest, null, 2))
console.log(`\nTotal data: ${(totalFileSize/1024/1024).toFixed(1)} MB`)
console.log(`Output: ${OUTPUT_DIR}`)

// 估算总部署包大小
const MIGRATE_DIR = path.resolve(__dirname, 'migrate')
let totalPackageSize = 0
function walkDir(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true })
  for (const f of files) {
    const fp = path.join(dir, f.name)
    if (f.isDirectory() && f.name !== 'node_modules') walkDir(fp)
    else if (f.isFile()) totalPackageSize += fs.statSync(fp).size
  }
}
walkDir(MIGRATE_DIR)
console.log(`Migrate dir total (excl node_modules): ${(totalPackageSize/1024/1024).toFixed(1)} MB`)
