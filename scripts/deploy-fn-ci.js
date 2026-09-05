/**
 * 通过 miniprogram-ci 部署微信云开发的云函数（官方方式，与小程序上传共用私钥）
 *
 * 用法：
 *   node scripts/deploy-fn-ci.js                      # 部署全部（8 个业务函数 + cleanup）
 *   node scripts/deploy-fn-ci.js common order         # 只部署指定函数
 *   node scripts/deploy-fn-ci.js --key=D:/x/private.key
 *
 * 说明：
 *   - 私钥也可用环境变量 MP_UPLOAD_KEY 指定，默认读项目根 private.key
 *   - 部署前请先执行 `node cloudfunctions/build.js` 同步 _shared.js
 *   - 不含 migrate（该云函数无鉴权，不应部署）
 */
const path = require('path')
const fs = require('fs')

const ROOT = path.resolve(__dirname, '..')
const ENV_ID = 'cloud1-d4gyvmo1d9a1e148a'

const ARGS = process.argv.slice(2)
const keyArg = ARGS.find((a) => a.startsWith('--key='))
const PRIVATE_KEY = keyArg
  ? keyArg.slice('--key='.length)
  : process.env.MP_UPLOAD_KEY || path.join(ROOT, 'private.key')
const POSITIONAL = ARGS.filter((a) => !a.startsWith('--'))

// 与 cloudfunctions/build.js 保持一致；cleanup 为定时任务（有 requireAdmin 鉴权）
const DEFAULT_FUNCTIONS = [
  'common',
  'user',
  'template',
  'work',
  'order',
  'upload',
  'poster',
  'export',
  'cleanup',
]
const FUNCTIONS = POSITIONAL.length ? POSITIONAL : DEFAULT_FUNCTIONS

function fail(msg) {
  console.error('\n❌ ' + msg + '\n')
  process.exit(1)
}

if (!fs.existsSync(PRIVATE_KEY)) {
  fail(
    `缺少私钥：${PRIVATE_KEY}\n` +
      '请到微信公众平台下载「小程序代码上传密钥」，或用 --key=<path> / MP_UPLOAD_KEY 指定。'
  )
}

const projectConfig = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'project.config.json'), 'utf8')
)
if (!projectConfig.appid) fail('project.config.json 缺少 appid')

let ci
try {
  ci = require('miniprogram-ci')
} catch (e) {
  fail('未安装 miniprogram-ci，请先执行 npm install')
}

const project = new ci.Project({
  appid: projectConfig.appid,
  type: 'miniProgram',
  projectPath: ROOT,
  privateKeyPath: PRIVATE_KEY,
  ignores: ['node_modules/**/*'],
})

async function deployOne(fnName) {
  const fnPath = path.join(ROOT, 'cloudfunctions', fnName)
  if (!fs.existsSync(fnPath)) {
    console.log(`⚠️  跳过 ${fnName}：目录不存在`)
    return false
  }
  console.log(`\n📤 部署 ${fnName} ...`)
  try {
    await ci.cloud.uploadFunction({
      project,
      env: ENV_ID,
      name: fnName,
      path: fnPath,
      remoteNpmInstall: true, // 云端安装依赖，避免上传 node_modules
    })
    console.log(`✅ ${fnName} 部署成功`)
    return true
  } catch (e) {
    const msg = e && e.message ? e.message : String(e)
    console.error(`❌ ${fnName} 部署失败：${msg}`)
    // -10008：当前 IP 不在该密钥的白名单内（小程序上传同样会被拦）
    if (/-10008|invalid ip/i.test(msg)) {
      const ip = (msg.match(/\d+\.\d+\.\d+\.\d+/) || [])[0]
      console.error(
        `\n👉 IP 白名单未放行${ip ? `（当前出口 IP：${ip}）` : ''}。\n` +
          '   处理：微信公众平台 → 开发 → 开发管理 → 开发设置 → 小程序代码上传密钥 → IP 白名单，\n' +
          '   把该 IP 加入，或直接关闭白名单。'
      )
      // IP 未授权时后续函数必然同样失败，提前中止避免刷屏
      throw new Error('IP_NOT_ALLOWED')
    }
    return false
  }
}

async function main() {
  console.log(`\n🚀 部署云函数到 ${ENV_ID}`)
  console.log(`   函数列表: ${FUNCTIONS.join(', ')}`)

  let ok = 0
  let bad = 0
  // 串行部署：并发容易触发限流
  for (const fn of FUNCTIONS) {
    const r = await deployOne(fn)
    if (r) ok++
    else bad++
  }

  console.log(`\n${'='.repeat(40)}`)
  console.log(`部署完成：✅ ${ok} 成功，❌ ${bad} 失败`)
  if (bad > 0) process.exit(1)
}

main().catch((e) => {
  if (e && e.message === 'IP_NOT_ALLOWED') {
    console.error('\n❌ 部署中止：请先放行 IP 白名单后重试。\n')
    process.exit(1)
  }
  fail('执行失败：' + (e && e.message ? e.message : String(e)))
})
