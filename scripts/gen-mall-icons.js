const sharp = require('sharp')
const path = require('path')

const size = 48

const svgInactive = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <path d="M14 14h20l-2 24H16L14 14z" fill="none" stroke="#999" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M18 14c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="none" stroke="#999" stroke-width="2.5"/>
  <path d="M16 22h16" stroke="#999" stroke-width="2" stroke-linecap="round"/>
  <path d="M20 26h8" stroke="#999" stroke-width="2" stroke-linecap="round"/>
</svg>`

const svgActive = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <path d="M14 14h20l-2 24H16L14 14z" fill="none" stroke="#e84a6e" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M18 14c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="none" stroke="#e84a6e" stroke-width="2.5"/>
  <path d="M16 22h16" stroke="#e84a6e" stroke-width="2" stroke-linecap="round"/>
  <path d="M20 26h8" stroke="#e84a6e" stroke-width="2" stroke-linecap="round"/>
</svg>`

const targetDir = path.resolve(__dirname, '../src/static/tabs')

Promise.all([
  sharp(Buffer.from(svgInactive)).png().toFile(path.join(targetDir, 'mall.png')),
  sharp(Buffer.from(svgActive)).png().toFile(path.join(targetDir, 'mall-active.png'))
]).then(() => {
  console.log('mall icons generated!')
}).catch(e => {
  console.error('Error:', e.message)
})
