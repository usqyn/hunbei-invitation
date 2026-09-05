// 打印第一个文字图层的 text 对象完整结构
const fs = require('fs')
const { readPsd } = require('d:/code_center/hunbei-invitation/admin/node_modules/ag-psd/dist/index.js')
const buf = fs.readFileSync(process.argv[2])
const psd = readPsd(buf, { skipLayerImageData: true, skipThumbnail: true, skipCompositeImageData: true, skipImageData: true })
function firstText(layers) {
  for (const l of layers || []) {
    if (l.children && l.children.length) { const r = firstText(l.children); if (r) return r }
    if (l.text) return l.text
  }
}
const t = firstText(psd.children)
console.log('keys:', Object.keys(t))
console.log('content sample:', JSON.stringify((t.content || t.text || '').slice(0, 40)))
for (const k of Object.keys(t)) {
  const v = t[k]
  if (v && typeof v === 'object') console.log(k, '=> keys:', Object.keys(v).slice(0, 20).join(','))
}
console.log('\nstyle:', JSON.stringify(t.style, null, 1).slice(0, 600))
console.log('\nparagraphStyle:', JSON.stringify(t.paragraphStyle, null, 1).slice(0, 300))
console.log('\ntransform:', t.transform, 'left/top:', t.left, t.top, 'right/bottom:', t.right, t.bottom)
