/**
 * 编译后将 cloudfunctions 复制到 dist 目录，并更新 project.config.json
 * 解决微信开发者工具从 dist 目录打开时找不到云函数的问题
 */
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const cloudfunctionsSrc = path.join(root, 'cloudfunctions')
const targets = [
  path.join(root, 'dist', 'dev', 'mp-weixin'),
  path.join(root, 'dist', 'build', 'mp-weixin')
]

// 忽略的文件/目录模式
// 非云函数的内容（共享模块、构建脚本等）
// seed-data 包含 ~8MB 种子数据，不应打入小程序包（通过云函数独立上传即可）
const IGNORE = ['node_modules', '.git', '.DS_Store', 'batches', '_shared', 'build.js', 'cloudbaserc.json', 'fix-routes.js', 'migrate-assets.js', 'migrate-data.js', 'migrate-full.js', 'routes.json', 'README.md', 'body.json', 'cmd.json', 'create_coll.json', 'params.json', 'route.json', 'seed-data', 'seed.json', 'extract-and-upload.js', 'upload-batches.js', 'prep-migrate.js', '.migration_batches']

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    if (IGNORE.includes(entry.name)) continue
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

for (const target of targets) {
  if (!fs.existsSync(target)) {
    console.log(`[skip] dist 目录不存在: ${target}`)
    continue
  }

  // 1. 复制 cloudfunctions 到 dist 目录下
  const cloudDest = path.join(target, 'cloudfunctions')
  console.log(`[copy] cloudfunctions -> ${cloudDest}`)
  copyDir(cloudfunctionsSrc, cloudDest)

  // 2. 更新 project.config.json，添加 cloudfunctionRoot
  const configPath = path.join(target, 'project.config.json')
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    config.cloudfunctionRoot = 'cloudfunctions/'
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
    console.log(`[update] ${configPath} -> cloudfunctionRoot = "cloudfunctions/"`)
  }
}

console.log('[done] 云函数已同步到 dist 目录')
