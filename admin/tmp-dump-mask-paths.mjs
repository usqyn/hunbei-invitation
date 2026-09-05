// 临时诊断：dump 圆角矩形图层的矢量蒙版路径锚点数据
import pkg from 'ag-psd'
const { readPsd } = pkg
import { readFileSync } from 'fs'

const FILE = 'C:/Users/Administrator/Desktop/workspace_bastao/请柬设计2026/婚礼请柬/rev02版/婚礼双页面请帖rev02.psd'
const buf = readFileSync(FILE)
const psd = readPsd(buf.buffer, {
  skipLayerImageData: true,
  skipCompositeImageData: true,
  skipThumbnail: true,
  throwForMissingFeatures: false,
  useImageData: true,
})

function walk(children, depth = 0) {
  for (const l of children || []) {
    if (l.children?.length) walk(l.children, depth + 1)
    else if (l.vectorMask?.paths?.length) {
      console.log(`\n=== ${l.name} [${l.width || '?'}x${l.height || '?'}] invert=${l.vectorMask.invert} disabled=${l.vectorMask.disable ?? l.vectorMask.disabled}`)
      for (const p of l.vectorMask.paths) {
        console.log(`  path open=${p.open} knots=${p.knots.length}`)
        for (const k of p.knots) {
          const [ax, ay, px, py, nx, ny] = k.points
          const hPrev = Math.hypot(ax - px, ay - py)
          const hNext = Math.hypot(ax - nx, ay - ny)
          console.log(`    anchor=(${ax.toFixed(2)},${ay.toFixed(2)}) prev=(${px.toFixed(2)},${py.toFixed(2)}) hPrev=${hPrev.toFixed(4)} next=(${nx.toFixed(2)},${ny.toFixed(2)}) hNext=${hNext.toFixed(4)} linked=${k.linked}`)
        }
      }
    }
  }
}
walk(psd.children)
