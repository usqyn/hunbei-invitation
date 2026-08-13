/**
 * 通过 CloudBase HTTP API 部署云函数
 * 用法: node scripts/deploy-functions.js [函数名...]
 * 示例: node scripts/deploy-functions.js template upload common
 * 不带参数则部署全部: common user template work order upload poster export
 */
const fs = require('fs')
const path = require('path')
const https = require('https')

const ENV_ID = 'cloud1-d4gyvmo1d9a1e148a'

// 从 .env 读取 API Key
let API_KEY = ''
try {
  const envContent = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf-8')
  const match = envContent.match(/^CLOUDBASE_APIKEY=(.+)$/m)
  if (match) API_KEY = match[1].trim()
} catch (_) {}

if (!API_KEY) {
  console.error('❌ CLOUDBASE_APIKEY 未配置')
  process.exit(1)
}

const FUNCTIONS = process.argv.length > 2
  ? process.argv.slice(2)
  : ['common', 'user', 'template', 'work', 'order', 'upload', 'poster', 'export']

const FN_DIR = path.join(__dirname, '../cloudfunctions')

function apiRequest(action, body = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ action, ...body })
    // 认证格式与 @cloudbase/node-sdk 一致：Bearer + X-Timestamp + X-Signature-Expires
    const timestamp = Math.floor(Date.now() / 1000)
    const options = {
      hostname: `${ENV_ID}.api.tcloudbasegateway.com`,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-Timestamp': String(timestamp),
        'X-Signature-Expires': '600',
        'User-Agent': 'tcb-node-sdk/deploy-script',
        'X-SDK-Version': 'tcb-deploy-script',
        'Content-Length': Buffer.byteLength(payload),
      },
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch { resolve(data) }
      })
    })
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

async function zipDirectory(dirPath) {
  // 简单的 tar-like 打包：将所有文件合并为一个 zip
  // CloudBase 要求上传 zip 或 tar.gz 格式的代码包
  // 这里使用 adm-zip 如果可用，否则用子进程调用系统 zip
  const archiver = require('archiver')
  return new Promise((resolve, reject) => {
    const chunks = []
    const archive = archiver('zip', { zlib: { level: 9 } })
    archive.on('data', (chunk) => chunks.push(chunk))
    archive.on('end', () => resolve(Buffer.concat(chunks)))
    archive.on('error', reject)
    archive.glob('**/*', {
      cwd: dirPath,
      ignore: ['node_modules/**'],
    })
    archive.finalize()
  })
}

async function deployFunction(fnName) {
  const fnDir = path.join(FN_DIR, fnName)
  if (!fs.existsSync(fnDir)) {
    console.log(`⚠️  跳过 ${fnName}: 目录不存在`)
    return false
  }

  console.log(`\n📤 部署 ${fnName}...`)

  try {
    // 读取所有文件内容（不含 node_modules）
    const files = {}
    function readDir(dir, prefix = '') {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const relPath = prefix ? `${prefix}/${entry.name}` : entry.name
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules') continue
          readDir(fullPath, relPath)
        } else {
          files[relPath] = fs.readFileSync(fullPath)
        }
      }
    }
    readDir(fnDir)

    // 转为 base64
    const fileEntries = Object.entries(files).map(([name, content]) => ({
      path: name,
      value: content.toString('base64'),
    }))

    // 通过 API 更新函数代码
    const result = await apiRequest('UpdateFunction', {
      envId: ENV_ID,
      functionName: fnName,
      code: JSON.stringify(fileEntries),
      handler: 'index.main',
      runtime: 'Nodejs16.13',
      timeout: 30,
      memorySize: 256,
      installDependency: true,
    })

    if (result && (result.code === 0 || result.Code === 'Success')) {
      console.log(`✅ ${fnName} 部署成功`)
      return true
    } else {
      console.log(`❌ ${fnName} 部署失败:`, JSON.stringify(result).slice(0, 300))
      return false
    }
  } catch (e) {
    console.error(`❌ ${fnName} 部署异常:`, e.message)
    return false
  }
}

async function main() {
  console.log(`🚀 开始部署 ${FUNCTIONS.length} 个云函数到 ${ENV_ID}`)
  console.log(`   函数列表: ${FUNCTIONS.join(', ')}\n`)

  let success = 0, fail = 0
  for (const fn of FUNCTIONS) {
    const ok = await deployFunction(fn)
    if (ok) success++
    else fail++
  }

  console.log(`\n${'='.repeat(40)}`)
  console.log(`部署完成: ✅ ${success} 成功, ❌ ${fail} 失败`)
}

main().catch(e => {
  console.error('❌ 执行失败:', e.message)
  process.exit(1)
})
