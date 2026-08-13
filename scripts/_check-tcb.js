// 临时验证：用 @cloudbase/node-sdk 的 callApis 调用 UpdateFunction 部署 common
const fs = require('fs')
const path = require('path')

const ENV_ID = 'cloud1-d4gyvmo1d9a1e148a'
const envContent = fs.readFileSync(path.join(__dirname, '../server/.env'), 'utf-8')
const API_KEY = (envContent.match(/^CLOUDBASE_APIKEY=(.+)$/m) || [])[1].trim()

const FN_DIR = path.join(__dirname, '../cloudfunctions/common')

function readFiles(dir, prefix = '', out = {}) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue
      readFiles(fullPath, relPath, out)
    } else {
      out[relPath] = fs.readFileSync(fullPath).toString('base64')
    }
  }
  return out
}

async function main() {
  const tcb = require('@cloudbase/node-sdk')
  const app = tcb.init({
    env: ENV_ID,
    accessKey: API_KEY,
    endpoint: `https://${ENV_ID}.api.tcloudbasegateway.com`,
  })

  const files = readFiles(FN_DIR)
  const fileEntries = Object.entries(files).map(([name, value]) => ({ path: name, value }))

  const res = await app.callApis({
    name: 'UpdateFunction',
    body: {
      envId: ENV_ID,
      functionName: 'common',
      code: JSON.stringify(fileEntries),
      handler: 'index.main',
      runtime: 'Nodejs16.13',
      timeout: 30,
      memorySize: 256,
      installDependency: true,
    },
  })
  console.log('RESULT:', JSON.stringify(res).slice(0, 500))
}

main().then(() => process.exit(0)).catch((e) => { console.log('ERR:', e.message); process.exit(1) })
