// 决定性测试：ag-psd children 顺序是 bottom→top 还是 top→bottom
// 方法：分别按两种顺序 alpha 混合所有叶子图层，与 PSD 内置合成图对比
import pkg from 'ag-psd'
const { readPsd, initializeCanvas } = pkg

// 纯 JS ImageData polyfill，绕开 node-canvas 依赖
initializeCanvas(
  () => { throw new Error('no canvas in this test') },
  (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }),
)

import { readFileSync } from 'fs'

const FILE = 'C:/Users/Administrator/Desktop/workspace_bastao/请柬设计2026/婚礼请柬/rev02版/婚礼双页面请帖rev02.psd'
const buf = readFileSync(FILE)
const psd = readPsd(buf.buffer, {
  skipThumbnail: true,
  throwForMissingFeatures: false,
  useImageData: true,
})

const W = psd.width, H = psd.height
const comp = psd.imageData.data

// 收集叶子图层（有 imageData 的）
const leaves = []
function walk(children) {
  for (const l of children || []) {
    if (l.children?.length) walk(l.children)
    else if (l.imageData && l.imageData.data) leaves.push(l)
  }
}
walk(psd.children)
console.log(`叶子图层数: ${leaves.length}`)

// 顺序 alpha-over 合成（正常 Photoshop 语义：先画底，后画顶）
function composite(order) {
  const out = new Float32Array(W * H * 4)
  for (const l of order) {
    const d = l.imageData.data
    const lw = l.imageData.width, lh = l.imageData.height
    const ox = l.left ?? 0, oy = l.top ?? 0
    for (let y = 0; y < lh; y++) {
      const dy = oy + y
      if (dy < 0 || dy >= H) continue
      for (let x = 0; x < lw; x++) {
        const dx = ox + x
        if (dx < 0 || dx >= W) continue
        const si = (y * lw + x) * 4
        const sa = d[si + 3] / 255
        if (sa === 0) continue
        const di = (dy * W + dx) * 4
        const da = out[di + 3]
        const oa = sa + da * (1 - sa)
        if (oa === 0) continue
        out[di] = (d[si] * sa + out[di] * da * (1 - sa)) / oa
        out[di + 1] = (d[si + 1] * sa + out[di + 1] * da * (1 - sa)) / oa
        out[di + 2] = (d[si + 2] * sa + out[di + 2] * da * (1 - sa)) / oa
        out[di + 3] = oa * 255
      }
    }
  }
  return out
}

function diffVsComposite(out) {
  let sum = 0, n = 0
  for (let i = 0; i < comp.length; i += 16) { // 采样 1/4
    sum += Math.abs(out[i] - comp[i]) + Math.abs(out[i + 1] - comp[i + 1]) + Math.abs(out[i + 2] - comp[i + 2])
    n += 3
  }
  return sum / n
}

const direct = composite(leaves)          // children[0] 先画（若 children=bottom→top 则正确）
const reversed = composite([...leaves].reverse()) // children[last] 先画（若 children=top→bottom 则正确）
console.log(`正序合成 (children[0]=底)  与合成图平均差: ${diffVsComposite(direct).toFixed(2)}`)
console.log(`逆序合成 (children[0]=顶)  与合成图平均差: ${diffVsComposite(reversed).toFixed(2)}`)

// 关键佐证：若"背景在最上层"成立且背景不透明，合成图应≈背景单层
const bg = leaves.find(l => l.name === '背景')
let opaque = 0, total = 0
{
  const d = bg.imageData.data
  for (let i = 3; i < d.length; i += 4) { total++; if (d[i] >= 250) opaque++ }
}
console.log(`背景 alpha≥250 占比: ${(opaque / total * 100).toFixed(1)}%`)
console.log(`背景单层 vs 合成图平均差: ${diffVsCompositeFloat(bg).toFixed(2)}`)

function diffVsCompositeFloat(layer) {
  const d = layer.imageData.data
  const lw = layer.imageData.width, lh = layer.imageData.height
  const ox = layer.left ?? 0, oy = layer.top ?? 0
  let sum = 0, n = 0
  for (let y = 0; y < lh; y += 2) {
    const dy = oy + y
    if (dy < 0 || dy >= H) continue
    for (let x = 0; x < lw; x += 2) {
      const dx = ox + x
      if (dx < 0 || dx >= W) continue
      const si = (y * lw + x) * 4
      const di = (dy * W + dx) * 4
      sum += Math.abs(d[si] - comp[di]) + Math.abs(d[si + 1] - comp[di + 1]) + Math.abs(d[si + 2] - comp[di + 2])
      n += 3
    }
  }
  return sum / n
}
