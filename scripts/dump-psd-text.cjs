// 解析 PSD：输出文字图层字体、字号、效果清单（仅文本信息，不读像素）
const fs = require('fs')
const { readPsd } = require('d:/code_center/hunbei-invitation/admin/node_modules/ag-psd/dist/index.js')

const path = process.argv[2]
const buf = fs.readFileSync(path)
const psd = readPsd(buf, {
  skipLayerImageData: true,
  skipThumbnail: true,
  skipCompositeImageData: true,
  skipImageData: true,
})

const textLayers = []
const effectLayers = []
function walk(layers, prefix) {
  for (const l of layers || []) {
    if (l.children && l.children.length) { walk(l.children, prefix + l.name + '/'); continue }
    const eff = l.effects ? Object.keys(l.effects).filter(k => l.effects[k] && (l.effects[k].enabled !== false)) : []
    if (l.text) {
      const t = l.text
      const fonts = new Set()
      const sizes = new Set()
      const collect = (st) => {
        if (!st) return
        if (st.font && st.font.name) fonts.add(st.font.name)
        if (st.fonts) st.fonts.forEach(f => fonts.add(typeof f === 'string' ? f : (f && f.name)))
        if (st.fontSize) sizes.add(st.fontSize)
        if (st.styleRuns) st.styleRuns.forEach(r => collect(r.style))
      }
      collect(t.style)
      // 排版细节：字间距/行高/缩放/文本框
      const st = t.style || {}
      const ps = t.paragraphStyle || {}
      const runs = (t.styleRuns || []).map(r => ({
        len: r.length,
        track: r.style && r.style.tracking,
        size: r.style && r.style.fontSize,
        font: r.style && r.style.font && r.style.font.name,
      }))
      textLayers.push({
        name: prefix + l.name,
        content: (t.textLayers ? t.textLayers.join('') : '').slice(0, 24),
        fontSize: st.fontSize, fontSizeUnit: st.fontSizeUnit, autoLeading: st.autoLeading,
        leading: st.leading, tracking: st.tracking,
        scale: t.transform ? t.transform.map(n => typeof n === 'number' ? Math.round(n * 1000) / 1000 : n).slice(0, 4) : undefined,
        box: t.textBox ? `box ${Math.round(t.boxWidth||0)}x${Math.round(t.boxHeight||0)}` : 'point',
        justification: ps.justification,
        runs: runs.length > 1 ? runs : undefined,
        effects: eff,
      })
    } else if (eff.length) {
      textLayers.push({
        name: prefix + l.name,
        content: (t.textLayers ? t.textLayers.join('') : '').slice(0, 24),
        fonts: [...fonts],
        sizes: [...sizes],
        effects: eff,
      })
    } else if (eff.length) {
      effectLayers.push({ name: prefix + l.name, effects: eff })
    }
  }
}
walk(psd.children || [], [])

console.log('=== PSD 尺寸/分辨率 ===')
console.log(psd.width + 'x' + psd.height, psd.resolution + 'dpi')
console.log('\n=== 文字图层 (' + textLayers.length + ') ===')
for (const t of textLayers) {
  console.log(`[${t.name}] "${t.content}"`)
  console.log(`  fonts: ${JSON.stringify(t.fonts)} sizes: ${JSON.stringify(t.sizes)} effects: ${t.effects.join(',') || '无'}`)
}
console.log('\n=== 非文字但带效果的图层 (' + effectLayers.length + ') ===')
for (const e of effectLayers.slice(0, 30)) {
  console.log(`[${e.name}] ${e.effects.join(',')}`)
}
