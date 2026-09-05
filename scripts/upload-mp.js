/**
 * 上传小程序代码到微信后台（之后在「版本管理」里设为体验版/提交审核）
 *
 * 用法：
 *   node scripts/upload-mp.js                      # 版本取 package.json，备注取默认文案
 *   node scripts/upload-mp.js 1.0.0                # 指定版本
 *   node scripts/upload-mp.js 1.0.0 "修复换图黑图"  # 指定版本 + 备注
 *
 * 前置条件：
 *   1. 微信公众平台 → 开发 → 开发管理 → 开发设置 → 小程序代码上传密钥 → 下载私钥
 *   2. 私钥保存为项目根目录的 private.key（已被 .gitignore 忽略，切勿入库）
 *   3. 若该密钥开启了「IP 白名单」，需把当前出口 IP 加入白名单
 *
 * 注意：上传后需到微信公众平台「管理 → 版本管理」手动设为体验版，本脚本不会自动设置。
 */
const path = require('path')
const fs = require('fs')

const ROOT = path.resolve(__dirname, '..')
const PRIVATE_KEY = path.join(ROOT, 'private.key')
const PROJECT_PATH = path.join(ROOT, 'dist', 'build', 'mp-weixin')

function fail(msg) {
  console.error('\n❌ ' + msg + '\n')
  process.exit(1)
}

// ---------- 前置校验 ----------
if (!fs.existsSync(PROJECT_PATH)) {
  fail(`构建产物不存在：${PROJECT_PATH}\n请先执行 npm run build:mp-weixin`)
}
if (!fs.existsSync(PRIVATE_KEY)) {
  fail(
    `缺少上传私钥：${PRIVATE_KEY}\n` +
      '请到微信公众平台下载「小程序代码上传密钥」并保存为该路径。'
  )
}

const projectConfig = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'project.config.json'), 'utf8')
)
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))

const appid = projectConfig.appid
if (!appid) fail('project.config.json 缺少 appid')

const version = process.argv[2] || pkg.version || '1.0.0'
const desc = process.argv[3] || `上传体验版 v${version}`

// ---------- 上传 ----------
let ci
try {
  ci = require('miniprogram-ci')
} catch (e) {
  fail('未安装 miniprogram-ci，请先执行 npm install')
}

const project = new ci.Project({
  appid,
  type: 'miniProgram',
  projectPath: PROJECT_PATH,
  privateKeyPath: PRIVATE_KEY,
  ignores: ['node_modules/**/*'],
})

// 与 project.config.json 的 setting 对齐，避免本地工具配置与命令行上传结果不一致
const setting = Object.assign({}, projectConfig.setting || {}, {
  es6: true,
  minify: true,
  // 上传后便于在后台查看还原后的错误堆栈；设为 false 可减少上传体积
  uploadWithSourceMap: projectConfig.setting?.uploadWithSourceMap !== false,
})

console.log(`\n▶ 开始上传` +
  `\n  appid   : ${appid}` +
  `\n  版本    : ${version}` +
  `\n  备注    : ${desc}` +
  `\n  产物目录: ${PROJECT_PATH}\n`)

ci
  .upload({
    project,
    version,
    desc,
    setting,
    onProgressUpdate: (task) => {
      // task 为当前任务描述，进度由 ci 内部推进
      if (task && task.message) console.log('  · ' + task.message)
    },
  })
  .then(() => {
    console.log(`\n✅ 上传成功：v${version}`)
    console.log('   下一步：微信公众平台 → 管理 → 版本管理 → 设为体验版\n')
  })
  .catch((e) => {
    const msg = e && e.message ? e.message : String(e)
    if (/ip/i.test(msg) && /白名单|whitelist/i.test(msg)) {
      fail('IP 白名单未放行：请在微信公众平台把当前出口 IP 加入该密钥的白名单，或关闭白名单。\n原始错误：' + msg)
    }
    fail('上传失败：' + msg)
  })
