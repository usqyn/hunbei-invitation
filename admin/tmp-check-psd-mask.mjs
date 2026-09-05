// 临时诊断脚本 v2：用新版 analyzeVectorMaskShape 逻辑检查蒙版识别（问题4）
import pkg from 'ag-psd'
const { readPsd } = pkg
import { readFileSync } from 'fs'

const files = process.argv.slice(2)
const FILE = files[0] || 'C:/Users/Administrator/Desktop/workspace_bastao/请柬设计2026/婚礼请柬/rev02版/婚礼双页面请帖rev02.psd'

// ==== 复刻 admin/src/utils/psd-import.ts analyzeVectorMaskShape ====
function analyzeVectorMaskShape(vectorMask, layerWidth, layerHeight) {
  if (!vectorMask?.paths?.length) return { mask: null, why: 'no-paths' }
  if (vectorMask.disable || vectorMask.disabled) return { mask: null, why: 'disabled' }
  const path = vectorMask.paths[0]
  if (path.open || vectorMask.paths.length > 1 || path.knots.length > 12) return { mask: null, why: 'complex' }
  if (layerWidth < 1 || layerHeight < 1) return { mask: null, why: 'bad-size' }
  const layerAspect = layerWidth / layerHeight
  if (layerAspect < 0.3 || layerAspect > 3.0) return { mask: null, why: 'aspect:' + layerAspect.toFixed(2) }
  let zeroHandleAnchors = 0
  let twoZeroKnots = 0
  let maxHandle = 0
  let handleSum = 0
  let handleCount = 0
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const knot of path.knots) {
    const [bx, by, ax, ay, fx, fy] = knot.points
    const hBefore = Math.hypot(ax - bx, ay - by)
    const hAfter = Math.hypot(ax - fx, ay - fy)
    const zeros = (hBefore === 0 ? 1 : 0) + (hAfter === 0 ? 1 : 0)
    zeroHandleAnchors += zeros
    if (zeros === 2) twoZeroKnots++
    if (hBefore > 0) { maxHandle = Math.max(maxHandle, hBefore); handleSum += hBefore; handleCount++ }
    if (hAfter > 0) { maxHandle = Math.max(maxHandle, hAfter); handleSum += hAfter; handleCount++ }
    minX = Math.min(minX, ax); minY = Math.min(minY, ay)
    maxX = Math.max(maxX, ax); maxY = Math.max(maxY, ay)
  }
  const pathW = maxX - minX
  const pathH = maxY - minY
  if (pathW < 1 || pathH < 1) return { mask: null, why: 'empty-bbox' }
  const wRatio = pathW / layerWidth
  const hRatio = pathH / layerHeight
  if (wRatio < 0.65 || wRatio > 1.35 || hRatio < 0.65 || hRatio > 1.35) {
    return { mask: null, why: `bbox w:${wRatio.toFixed(2)} h:${hRatio.toFixed(2)}` }
  }
  if (zeroHandleAnchors === 0) {
    return { mask: vectorMask.invert ? 'circle-invert' : 'circle', knots: path.knots.length }
  }
  if (maxHandle === 0) return { mask: null, why: 'sharp-rect' }
  if (zeroHandleAnchors === path.knots.length && twoZeroKnots === 0) {
    const avgHandle = handleSum / Math.max(1, handleCount)
    if (maxHandle / avgHandle > 1.25) return { mask: null, why: 'mixed-radius' }
    const radius = avgHandle / 0.5523
    const rRatio = radius / Math.max(pathW, 1)
    if (rRatio > 0.01 && rRatio <= 0.5) {
      return { mask: 'rounded', radiusRatio: +rRatio.toFixed(3), knots: path.knots.length, radiusPx: Math.round(radius) }
    }
    return { mask: null, why: `rRatio:${rRatio.toFixed(3)}` }
  }
  return { mask: null, why: `zeroHandles:${zeroHandleAnchors}/knots:${path.knots.length}` }
}

const buf = readFileSync(FILE)
const psd = readPsd(buf, {
  skipLayerImageData: true,
  skipCompositeImageData: true,
  skipThumbnail: true,
  throwForMissingFeatures: false,
  useImageData: true,
})
console.log(`PSD: ${psd.width}x${psd.height}`)

const rows = []
function walk(layers, depth, groupMask) {
  for (const l of layers || []) {
    const vm = l.vectorMask
    const pm = l.mask
    const w = (l.right ?? 0) - (l.left ?? 0)
    const h = (l.bottom ?? 0) - (l.top ?? 0)
    const shape = vm ? analyzeVectorMaskShape(vm, w, h) : null
    rows.push({
      depth, name: `${'  '.repeat(depth)}${l.name}`, w, h,
      hidden: !!l.hidden, clip: l.clipping === 1 || l.clipping === true,
      shape,
      pm: pm ? {
        rect: [pm.left, pm.top, pm.right, pm.bottom],
        disable: !!pm.disable, defaultColor: pm.defaultColor,
        relativeToLayer: !!pm.relativeToLayer,
        hasCanvas: !!(pm.canvas || pm.imageData),
      } : null,
      inheritedGroupMask: groupMask || null,
    })
    if (l.children?.length) walk(l.children, depth + 1, pm || groupMask)
  }
}
walk((psd.layers?.length ? psd.layers : psd.children) || [], 0, null)

for (const r of rows) {
  const parts = [`${r.name} [${r.w}x${r.h}]${r.hidden ? ' HIDDEN' : ''}${r.clip ? ' CLIP' : ''}`]
  if (r.shape) parts.push(`shape=${JSON.stringify(r.shape)}`)
  if (r.pm) parts.push(`pixelMask=${JSON.stringify(r.pm)}`)
  if (r.inheritedGroupMask) parts.push(`inheritedGroup=${JSON.stringify(r.inheritedGroupMask.rect)}`)
  console.log(parts.join('  '))
}

const detected = rows.filter(r => r.shape?.mask)
console.log(`\n汇总: 识别蒙版 ${detected.length} 个 →`)
for (const r of detected) console.log(`  ${r.name.trim()} → ${r.shape.mask}${r.shape.radiusRatio ? ' radius=' + r.shape.radiusRatio : ''}`)
const withPm = rows.filter(r => r.pm && !r.pm.disable)
console.log(`像素蒙版 ${withPm.length} 个（含组继承传递）`)
