// 临时诊断脚本 v3：dump 矢量蒙版路径的锚点/控制柄原始数据（问题4）
import pkg from 'ag-psd'
const { readPsd } = pkg
import { readFileSync } from 'fs'

const FILE = process.argv[2] || 'C:/Users/Administrator/Desktop/workspace_bastao/请柬设计2026/婚礼请柬/rev02版/婚礼双页面请帖rev02.psd'
const buf = readFileSync(FILE)
const psd = readPsd(buf, {
  skipLayerImageData: true,
  skipCompositeImageData: true,
  skipThumbnail: true,
  throwForMissingFeatures: false,
  useImageData: true,
})
console.log(`PSD: ${psd.width}x${psd.height}`)

function walk(layers, depth) {
  for (const l of layers || []) {
    const vm = l.vectorMask
    if (vm?.paths?.length) {
      console.log(`\n=== ${'  '.repeat(depth)}${l.name} rect=[${l.left},${l.top},${l.right},${l.bottom}] (${(l.right ?? 0) - (l.left ?? 0)}x${(l.bottom ?? 0) - (l.top ?? 0)}) invert=${!!vm.invert} disable=${!!vm.disable}`)
      vm.paths.forEach((p, pi) => {
        console.log(`  path[${pi}] open=${p.open} knots=${p.knots.length}`)
        for (const [ki, k] of p.knots.entries()) {
          const [ax, ay, px, py, nx, ny] = k.points
          const hPrev = Math.hypot(ax - px, ay - py)
          const hNext = Math.hypot(ax - nx, ay - ny)
          // points are normalized to PSD document size? ag-psd: vector mask points are 0..1 relative to document
          const X = ax * psd.width, Y = ay * psd.height
          console.log(`    knot[${ki}] linked=${k.linked} anchor=(${ax.toFixed(4)},${ay.toFixed(4)})→doc(${X.toFixed(1)},${Y.toFixed(1)}) hPrev=${hPrev.toFixed(5)} hNext=${hNext.toFixed(5)} points=[${k.points.map(v => +v.toFixed(4)).join(',')}]`)
        }
      })
    }
    if (l.children?.length) walk(l.children, depth + 1)
  }
}
walk((psd.layers?.length ? psd.layers : psd.children) || [], 0)
