import { describe, it, expect, beforeAll } from 'vitest'
import { writePsd, readPsd, type Psd } from 'ag-psd'
import { flattenPsdLayers, getResolutionInfo } from '../psd-import'

// jsdom 无 node-canvas：ag-psd 的 useImageData 内部用 ctx.createImageData 分配像素缓冲，
// 这里提供最小占位（ag-psd 会自行写入 data，不需要真实绘制）
;(HTMLCanvasElement.prototype as any).getContext = function () {
  return {
    createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
  }
}

// 端到端往返验证：writePsd 生成 → readPsd（useImageData，与浏览器端一致）→ flattenPsdLayers
const kazakhText = '\u0642\u0649\u0632 \u062a\u0648\u064a' // قىز توي（哈萨克阿拉伯文）

const source: Psd = {
  width: 600,
  height: 800,
  children: [
    {
      name: '无栅格图层',
      left: 0, top: 0, right: 600, bottom: 800, opacity: 255,
    },
    {
      name: '哈萨克文标题',
      opacity: 255,
      left: 50, top: 60, right: 550, bottom: 160,
      text: {
        text: kazakhText,
        transform: [1, 0, 0, 1, 50, 60],
        style: {
          font: { name: 'KazakhSoftAsilya' },
          fontSize: 36,
          leading: 480,
          tracking: 0,
          fillColor: { r: 200, g: 30, b: 60, a: 255 },
          paragraphStyle: { justification: 'center' as any },
        },
      },
    },
    {
      name: '旋转文字',
      opacity: 255,
      left: 100, top: 300, right: 500, bottom: 400,
      text: {
        text: 'Happy Wedding!',
        transform: [0, 1, -1, 0, 100, 300],
        style: {
          font: { name: 'ArialMT' },
          fontSize: 24,
          fillColor: { r: 0, g: 0, b: 0, a: 255 },
        },
      },
    },
    {
      name: '隐藏图层',
      hidden: true,
      left: 0, top: 0, right: 100, bottom: 100, opacity: 255,
      text: {
        text: 'should-not-appear',
        transform: [1, 0, 0, 1, 0, 0],
        style: { font: { name: 'ArialMT' }, fontSize: 12, fillColor: { r: 0, g: 0, b: 0, a: 255 } },
      },
    },
    {
      name: '组',
      children: [
        {
          name: '组内文字',
          opacity: 255,
          left: 10, top: 10, right: 200, bottom: 60,
          text: {
            text: 'Grouped Text',
            transform: [1, 0, 0, 1, 10, 10],
            style: { font: { name: 'ArialMT' }, fontSize: 14, fillColor: { r: 0, g: 0, b: 0, a: 255 } },
          },
        },
      ],
    },
  ],
  imageResources: {
    resolutionInfo: {
      horizontalResolution: 300,
      horizontalResolutionUnit: 'PPI',
      verticalResolution: 300,
      verticalResolutionUnit: 'PPI',
    },
  },
}

describe('PSD 读写往返 + 图层展平（ag-psd 真实序列化）', () => {
  let psd: Psd
  let layers: ReturnType<typeof flattenPsdLayers>

  beforeAll(() => {
    const buffer = writePsd(source)
    psd = readPsd(buffer, { useImageData: true, skipThumbnail: true, skipLinkedFilesData: true })
    const { resolution, unit } = getResolutionInfo(psd.imageResources)
    layers = flattenPsdLayers(psd, {
      resolution,
      resolutionUnit: unit,
      availableFonts: ['KazakhSoftAsilya', 'KazakhSoftAsilyaQaniq', '思源宋体, serif', '思源黑体, sans-serif', 'Arial, sans-serif'],
    })
  })

  it('文档尺寸与分辨率正确', () => {
    expect(psd.width).toBe(600)
    expect(psd.height).toBe(800)
    expect(layers.warnings).toBeDefined()
  })

  it('跳过无栅格图层与隐藏图层', () => {
    expect(layers.skipped.map(s => s.name)).toContain('无栅格图层')
    expect(layers.skipped.map(s => s.name)).toContain('隐藏图层')
  })

  it('组内图层被展平导入', () => {
    expect(layers.layers.map(l => l.name)).toContain('组内文字')
  })

  it('哈萨克阿拉伯文文字层：文本/字号/对齐/颜色正确', () => {
    const t = layers.layers.find(l => l.name === '哈萨克文标题')
    expect(t).toBeDefined()
    expect(t!.type).toBe('text')
    expect(t!.text).toBe(kazakhText)
    // 36pt @ 300PPI → 150px
    expect(t!.fontSize).toBe(150)
    expect(t!.fontSizePt).toBe(36)
    expect(t!.fontName).toBe('KazakhSoftAsilya')
    expect(t!.mappedFont).toBe('KazakhSoftAsilya')
    expect(t!.color).toBe('#c81e3c')
    // leading 480 (1/1000 em) / 36 → 13.33
    expect(t!.lineHeight).toBe(13.33)
  })

  it('旋转文字：90° 旋转正确', () => {
    const t = layers.layers.find(l => l.name === '旋转文字')
    expect(t!.rotation).toBe(90)
    // writer 会补全 paragraphStyle 默认值（left）
    expect(t!.textAlign).toBe('left')
  })

  it('图层顺序保持文档顺序（自底向上）', () => {
    const names = layers.layers.map(l => l.name)
    expect(names).toEqual(['哈萨克文标题', '旋转文字', '组内文字'])
  })
})

describe('直接构造图层（模拟真实 Photoshop 读取结果，规避 writePsd 写入限制）', () => {
  // ag-psd 写入器已知限制：opacity 与 justification 不能正确往返（读取真实 PSD 无此问题）
  const makeLayers = (children: any[]) => flattenPsdLayers(
    { width: 100, height: 100, children } as any,
    { resolution: 72, resolutionUnit: 'PPI', availableFonts: [] },
  )

  it('opacity 0-255 → 0-1', () => {
    const { layers } = makeLayers([{
      name: 'x', opacity: 200,
      left: 0, top: 0, right: 50, bottom: 50,
      text: { text: 'a', transform: [1, 0, 0, 1, 0, 0], style: { font: { name: 'ArialMT' }, fontSize: 12, fillColor: { r: 0, g: 0, b: 0, a: 255 } } },
    }])
    expect(layers[0].opacity).toBeCloseTo(200 / 255, 3)
  })

  it('justification 变体映射为 justify', () => {
    const { layers } = makeLayers([{
      name: 'x', opacity: 255,
      left: 0, top: 0, right: 50, bottom: 50,
      text: { text: 'a', transform: [1, 0, 0, 1, 0, 0], style: { font: { name: 'ArialMT' }, fontSize: 12, fillColor: { r: 0, g: 0, b: 0, a: 255 } }, paragraphStyle: { justification: 'justify-all' } },
    }])
    expect(layers[0].textAlign).toBe('justify')
  })

  it('颜色 alpha 保留为 8 位 hex', () => {
    const { layers } = makeLayers([{
      name: 'x', opacity: 255,
      left: 0, top: 0, right: 50, bottom: 50,
      text: { text: 'a', transform: [1, 0, 0, 1, 0, 0], style: { font: { name: 'ArialMT' }, fontSize: 12, fillColor: { r: 0, g: 0, b: 0, a: 128 } } },
    }])
    expect(layers[0].color).toBe('#00000080')
  })
})