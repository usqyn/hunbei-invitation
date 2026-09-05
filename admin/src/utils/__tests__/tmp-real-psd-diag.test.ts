// 临时诊断：真实 PSD → flattenPsdLayers，输出每层最终类型与警告（定位"文字变图片"回归）
import { describe, it, beforeAll } from 'vitest'
import { readPsd } from 'ag-psd'
import { readFileSync } from 'fs'
import { flattenPsdLayers, getResolutionInfo } from '../psd-import'

const noop = () => {}
;(HTMLCanvasElement.prototype as any).getContext = function () {
  return {
    createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: noop,
    getImageData: (x: number, y: number, w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    drawImage: noop,
    fillRect: noop,
    beginPath: noop,
    ellipse: noop,
    arcTo: noop,
    moveTo: noop,
    closePath: noop,
    fill: noop,
    save: noop,
    restore: noop,
    globalCompositeOperation: 'source-over',
    fillStyle: '#000000',
  }
}
;(HTMLCanvasElement.prototype as any).toDataURL = function () {
  return 'data:image/png;base64,'
}

const FILE = process.env.PSD_FILE
  || 'C:/Users/Administrator/Desktop/workspace_bastao/请柬设计2026/婚礼请柬/rev02版/婚礼双页面请帖rev02.psd'

describe('诊断：真实 PSD 文字层分类', () => {
  let result: Awaited<ReturnType<typeof flattenPsdLayers>>

  beforeAll(async () => {
    const buf = readFileSync(FILE)
    const psd = readPsd(buf, { skipThumbnail: true, skipLinkedFilesData: true })
    const { resolution, unit } = getResolutionInfo(psd.imageResources)
    result = await flattenPsdLayers(psd, {
      resolution,
      resolutionUnit: unit,
      availableFonts: ['KazakhSoftAsilya', '思源宋体, serif', '思源黑体, sans-serif', 'Arial, sans-serif'],
    })
  })

  it('输出所有导入层类型与警告', () => {
    console.log('\n===== 导入层（按 z 序）=====')
    for (const l of result.layers) {
      const text = (l as any).text ? String((l as any).text).slice(0, 36).replace(/\n/g, '\\n') : ''
      const ph = (l as any).dataKey ? ` | dataKey=${(l as any).dataKey}` : ''
      console.log(
        `[${l.type}] ${l.name} ${text ? `| text="${text}"` : ''}${ph} | warn=${l.warnings.join(' / ') || '-'}`,
      )
    }
    console.log('\n===== 跳过层 =====')
    for (const s of result.skipped) console.log(`[SKIP] ${s.name} | ${s.reason}`)
    const textCount = result.layers.filter(l => l.type === 'text').length
    const imgCount = result.layers.filter(l => l.type === 'image').length
    console.log(`\n汇总: text=${textCount}, image=${imgCount}, skipped=${result.skipped.length}`)
  })
})
