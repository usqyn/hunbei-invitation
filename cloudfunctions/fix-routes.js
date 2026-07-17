const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const FUNCTIONS = ['common', 'user', 'template', 'work', 'order', 'upload', 'poster', 'export', 'cleanup']
const ENV = 'cloud1-d1g9id3fjffcefe0d'

// Delete existing routes
const deleteData = JSON.stringify({ domain: '*', routes: FUNCTIONS.map(f => ({ path: '/' + f })) })
fs.writeFileSync(path.join(__dirname, 'delete_routes.json'), deleteData)

try {
  execSync(`"Y" | tcb -e ${ENV} routes delete "*" -p "/${FUNCTIONS.join(',/')}"`, { stdio: 'pipe', cwd: __dirname, shell: true })
  console.log('✅ Routes deleted')
} catch (e) {
  console.log('Delete may have failed:', e.message)
}

// Recreate with path transmission enabled
FUNCTIONS.forEach(fn => {
  const data = JSON.stringify({
    domain: '*',
    routes: [{
      path: '/' + fn,
      upstreamResourceType: 'SCF',
      upstreamResourceName: fn,
      enablePathTransmission: true,
      enable: true
    }]
  })
  const tmpFile = path.join(__dirname, `route_${fn}.json`)
  fs.writeFileSync(tmpFile, data, 'utf-8')
  
  // Read back and pass via stdin
  const content = fs.readFileSync(tmpFile, 'utf-8')
  try {
    const result = execSync(`tcb -e ${ENV} routes add --data '${content}'`, { stdio: 'pipe', cwd: __dirname, shell: true, encoding: 'utf-8' })
    console.log(`  ✅ ${fn} route added`)
  } catch (err) {
    console.log(`  ❌ ${fn}: ${err.message}`)
  }
  
  try { fs.unlinkSync(tmpFile) } catch(e) {}
})

try { fs.unlinkSync(path.join(__dirname, 'delete_routes.json')) } catch(e) {}
console.log('\nDone!')
