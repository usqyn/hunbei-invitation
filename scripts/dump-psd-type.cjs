// 全量 dump 文字排版参数：tracking / horizontalScale / fauxBold / warp / leading / transform scale
const fs = require('fs')
const { readPsd } = require('d:/code_center/hunbei-invitation/admin/node_modules/ag-psd/dist/index.js')
const buf = fs.readFileSync(process.argv[2])
const psd = readPsd(buf, { skipLayerImageData: true, skipThumbnail: true, skipCompositeImageData: true, skipImageData: true })

let i = 0
function walk(layers) {
  for (const l of layers || []) {
    if (l.children && l.children.length) { walk(l.children); continue }
    if (!l.text) continue
    const t = l.text
    const st = t.style || {}
    const ps = t.paragraphStyle || {}
    const tr = t.transform || []
    const scaleX = Math.round(Math.sqrt(tr[0] * tr[0] + tr[1] * tr[1]) * 1000) / 1000
    const scaleY = Math.round(Math.sqrt(tr[2] * tr[2] + tr[3] * tr[3]) * 1000) / 1000
    i++
    console.log(`#${i} "${(t.text || '').replace(/\n/g, '⏎').slice(0, 26)}"`)
    console.log(`   font=${st.font && st.font.name} fontSize=${st.fontSize} tracking=${st.tracking} paraLetterSp=${ps.letterSpacing} wordSpacing=${JSON.stringify(ps.wordSpacing)}`)
    console.log(`   horizontalScale=${st.horizontalScale} fauxBold=${st.fauxBold} leading=${st.leading} autoLeading=${st.autoLeading} justify=${ps.justification}`)
    console.log(`   transformScale=(${scaleX},${scaleY}) warp=${t.warp && t.warp.style !== 'none' ? t.warp.style : 'none'} box=${t.shapeType}`)
  }
}
walk(psd.children)
console.log(`PSD: ${psd.width}x${psd.height}`)
