import { describe, it, expect, beforeAll } from 'vitest'
import { writePsd, readPsd, type Psd } from 'ag-psd'
import { flattenPsdLayers, getResolutionInfo, dominantRunFontSize, transformScale } from '../psd-import'

// jsdom 无 node-canvas：ag-psd 的 useImageData 内部用 ctx.createImageData 分配像素缓冲，
// 这里提供最小占位（ag-psd 会自行写入 data，不需要真实绘制）；
// 另提供剪贴蒙版烘焙（bakeClipMask）所需的最小绘制方法（no-op，测试只断言流程与属性）
const noop = () => {}
;(HTMLCanvasElement.prototype as any).getContext = function () {
  return {
    createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
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
// 图片层走 flattenPsdLayers 时会调用 canvas.toDataURL 生成预览 dataUrl，jsdom 默认抛 not implemented
;(HTMLCanvasElement.prototype as any).toDataURL = function () {
  return 'data:image/png;base64,'
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
  let layers: Awaited<ReturnType<typeof flattenPsdLayers>>

  beforeAll(async () => {
    const buffer = writePsd(source)
    psd = readPsd(buffer, { useImageData: true, skipThumbnail: true, skipLinkedFilesData: true })
    const { resolution, unit } = getResolutionInfo(psd.imageResources)
    layers = await flattenPsdLayers(psd, {
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
    // leading 480 (1/1000 em) / 36 → 13.33，超出可渲染范围 → 钳制到 6
    expect(t!.lineHeight).toBe(6)
    // 单行文本行高不影响渲染：钳制但不产生告警
    expect(t!.warnings.some(w => w.includes('行高'))).toBe(false)
  })

  it('多行文字超范围行高：钳制并产生行高告警', async () => {
    const multiLine: Psd = {
      ...source,
      children: [{
        name: '多行文字',
        opacity: 255,
        left: 50, top: 300, right: 550, bottom: 400,
        text: {
          text: '第一行\n第二行',
          transform: [1, 0, 0, 1, 50, 300],
          style: {
            font: { name: 'ArialMT' },
            fontSize: 24,
            leading: 240,
            fillColor: { r: 0, g: 0, b: 0, a: 255 },
          },
        },
      }],
    }
    const buffer = writePsd(multiLine)
    const psdMulti = readPsd(buffer, { useImageData: true, skipThumbnail: true, skipLinkedFilesData: true })
    const { resolution, unit } = getResolutionInfo(psdMulti.imageResources)
    const multi = await flattenPsdLayers(psdMulti, {
      resolution,
      resolutionUnit: unit,
      availableFonts: ['KazakhSoftAsilya', 'KazakhSoftAsilyaQaniq', '思源宋体, serif', '思源黑体, sans-serif', 'Arial, sans-serif'],
    })
    const t = multi.layers.find(l => l.name === '多行文字')
    expect(t!.lineHeight).toBe(6)
    expect(t!.warnings.some(w => w.includes('行高'))).toBe(true)
  })

  it('旋转文字：90° 旋转正确', () => {
    const t = layers.layers.find(l => l.name === '旋转文字')
    expect(t!.rotation).toBe(90)
    // writer 会补全 paragraphStyle 默认值（left）
    expect(t!.textAlign).toBe('left')
  })

  it('图层顺序为 bottom-to-top（z-index 顺序）', () => {
    const names = layers.layers.filter(l => l.type !== 'group').map(l => l.name)
    // ag-psd children[0] = 最底层（已用真实 PSD 合成像素对比验证），展平输出保持 children 原序
    expect(names).toEqual(['哈萨克文标题', '旋转文字', '组内文字'])
  })
})

describe('直接构造图层（模拟真实 Photoshop 读取结果，规避 writePsd 写入限制）', () => {
  // ag-psd 写入器已知限制：opacity 与 justification 不能正确往返（读取真实 PSD 无此问题）
  const makeLayers = async (children: any[]) => flattenPsdLayers(
    { width: 100, height: 100, children } as any,
    { resolution: 72, resolutionUnit: 'PPI', availableFonts: [] },
  )

  it('opacity 保持 ag-psd 的 0-1 归一化值（防双重除以 255 回归）', async () => {
    // ag-psd 读取真实 PSD 时 opacity 已是 0-1（psdReader: readUint8 / 0xff）
    const full = (await makeLayers([{
      name: 'x', opacity: 1,
      left: 0, top: 0, right: 50, bottom: 50,
      text: { text: 'a', transform: [1, 0, 0, 1, 0, 0], style: { font: { name: 'ArialMT' }, fontSize: 12, fillColor: { r: 0, g: 0, b: 0, a: 255 } } },
    }])).layers[0]
    expect(full.opacity).toBe(1)

    const half = (await makeLayers([{
      name: 'x', opacity: 0.5,
      left: 0, top: 0, right: 50, bottom: 50,
      text: { text: 'a', transform: [1, 0, 0, 1, 0, 0], style: { font: { name: 'ArialMT' }, fontSize: 12, fillColor: { r: 0, g: 0, b: 0, a: 255 } } },
    }])).layers[0]
    expect(half.opacity).toBe(0.5)

    const empty = (await makeLayers([{
      name: 'x', opacity: 0,
      left: 0, top: 0, right: 50, bottom: 50,
      text: { text: 'a', transform: [1, 0, 0, 1, 0, 0], style: { font: { name: 'ArialMT' }, fontSize: 12, fillColor: { r: 0, g: 0, b: 0, a: 255 } } },
    }])).layers[0]
    expect(empty.opacity).toBe(0)

    // 缺失时默认完全可见
    const missing = (await makeLayers([{
      name: 'x',
      left: 0, top: 0, right: 50, bottom: 50,
      text: { text: 'a', transform: [1, 0, 0, 1, 0, 0], style: { font: { name: 'ArialMT' }, fontSize: 12, fillColor: { r: 0, g: 0, b: 0, a: 255 } } },
    }])).layers[0]
    expect(missing.opacity).toBe(1)
  })

  it('justification 变体映射为 justify', async () => {
    const { layers } = await makeLayers([{
      name: 'x', opacity: 255,
      left: 0, top: 0, right: 50, bottom: 50,
      text: { text: 'a', transform: [1, 0, 0, 1, 0, 0], style: { font: { name: 'ArialMT' }, fontSize: 12, fillColor: { r: 0, g: 0, b: 0, a: 255 } }, paragraphStyle: { justification: 'justify-all' } },
    }])
    expect(layers[0].textAlign).toBe('justify')
  })

  it('颜色带 alpha → 截断为 6 位 hex（编辑器 color input 兼容）', async () => {
    const { layers } = await makeLayers([{
      name: 'x', opacity: 255,
      left: 0, top: 0, right: 50, bottom: 50,
      text: { text: 'a', transform: [1, 0, 0, 1, 0, 0], style: { font: { name: 'ArialMT' }, fontSize: 12, fillColor: { r: 0, g: 0, b: 0, a: 128 } } },
    }])
    expect(layers[0].color).toBe('#000000')
  })

  it('direction：RTL 文本（含逻辑序基础字母）→ rtl，拉丁文本 → ltr', async () => {
    const { layers } = await makeLayers([
      {
        name: 'rtl', opacity: 255,
        left: 0, top: 0, right: 50, bottom: 50,
        text: { text: '\u0642\u0649\u0632 \u062a\u0648\u064a', transform: [1, 0, 0, 1, 0, 0], style: { font: { name: 'ArialMT' }, fontSize: 12, fillColor: { r: 0, g: 0, b: 0, a: 255 } } },
      },
      {
        name: 'ltr', opacity: 255,
        left: 0, top: 0, right: 50, bottom: 50,
        text: { text: 'Hello', transform: [1, 0, 0, 1, 0, 0], style: { font: { name: 'ArialMT' }, fontSize: 12, fillColor: { r: 0, g: 0, b: 0, a: 255 } } },
      },
    ])
    expect(layers.find(l => l.name === 'rtl')!.direction).toBe('rtl')
    expect(layers.find(l => l.name === 'ltr')!.direction).toBe('ltr')
  })

  it('视觉序+预成形字形文本：自动转换为逻辑序（真实 PSD 样本），逻辑序文本保持不变', async () => {
    const { layers } = await makeLayers([
      {
        name: '视觉序', opacity: 255,
        left: 0, top: 0, right: 50, bottom: 50,
        // :ﻰﺘﺗﻪﻣﺭﯘﻗ （Photoshop 视觉顺序 + 预成形字形）→ 逻辑序「قۇرمەتتى:」
        text: { text: '\u003a\ufef0\ufe98\ufe97\ufeea\ufee3\ufead\ufbd8\ufed7', transform: [1, 0, 0, 1, 0, 0], style: { font: { name: 'ArialMT' }, fontSize: 12, fillColor: { r: 0, g: 0, b: 0, a: 255 } } },
      },
      {
        name: '逻辑序', opacity: 255,
        left: 0, top: 0, right: 50, bottom: 50,
        text: { text: '\u0642\u0649\u0632 \u062a\u0648\u064a', transform: [1, 0, 0, 1, 0, 0], style: { font: { name: 'ArialMT' }, fontSize: 12, fillColor: { r: 0, g: 0, b: 0, a: 255 } } },
      },
    ])
    expect(layers.find(l => l.name === '视觉序')!.text).toBe('\u0642\u06c7\u0631\u0645\u06d5\u062a\u062a\u0649\u003a')
    expect(layers.find(l => l.name === '视觉序')!.direction).toBe('rtl')
    expect(layers.find(l => l.name === '逻辑序')!.text).toBe('\u0642\u0649\u0632 \u062a\u0648\u064a')
  })

  it('视觉序图层名自动转换为逻辑序', async () => {
    // ﻰﺘﺗﻪﻣﺭﯘﻗ → قۇرمەتتى
    const { layers } = await makeLayers([{
      name: '\ufef0\ufe98\ufe97\ufeea\ufee3\ufead\ufbd8\ufed7', opacity: 255,
      left: 0, top: 0, right: 50, bottom: 50,
      text: { text: 'a', transform: [1, 0, 0, 1, 0, 0], style: { font: { name: 'ArialMT' }, fontSize: 12, fillColor: { r: 0, g: 0, b: 0, a: 255 } } },
    }])
    expect(layers[0].name).toBe('\u0642\u06c7\u0631\u0645\u06d5\u062a\u062a\u0649')
  })
})

describe('字号/颜色解析修复（真实升学宴 PSD 场景）', () => {
  const makeLayers = async (children: any[]) => flattenPsdLayers(
    { width: 100, height: 100, children } as any,
    { resolution: 72, resolutionUnit: 'PPI', availableFonts: [] },
  )

  it('dominantRunFontSize：style.fontSize 缺失时取最长 run 的字号', () => {
    expect(dominantRunFontSize([
      { length: 1, style: { fontSize: 70 } },
      { length: 130, style: { fontSize: 60 } },
    ])).toBe(60)
    expect(dominantRunFontSize([{ length: 5, style: { fontSize: 14 } }])).toBe(14)
    expect(dominantRunFontSize(undefined)).toBeUndefined()
    expect(dominantRunFontSize([])).toBeUndefined()
    expect(dominantRunFontSize([{ length: 3, style: {} }])).toBeUndefined()
  })

  it('transformScale：自由变换缩放 1.28 / 恒等 / 旋转矩阵', () => {
    expect(transformScale([1.28007, 0, 0, 1.28007, 502, 231])).toBeCloseTo(1.28007, 3)
    expect(transformScale([1, 0, 0, 1, 50, 60])).toBe(1)
    expect(transformScale([0, 1, -1, 0, 100, 300])).toBe(1)
    expect(transformScale(undefined)).toBe(1)
    expect(transformScale([0.999, 0, 0, 0.999, 0, 0])).toBe(1)
  })

  it('多样式段落（styleRuns）：正文取最长 run 字号 60pt，不再兜底 24px', async () => {
    const { layers } = await makeLayers([{
      name: '正文', opacity: 255,
      left: 0, top: 0, right: 500, bottom: 300,
      text: {
        text: 'a'.repeat(130),
        transform: [1, 0, 0, 1, 0, 0],
        style: { font: { name: 'ALKATIPBasma' }, leading: 55, autoLeading: false, fillColor: { r: 160, g: 98, b: 5 } },
        styleRuns: [
          { length: 1, style: { fontSize: 70 } },
          { length: 130, style: { fontSize: 60 } },
        ],
      },
    }])
    expect(layers[0].fontSize).toBe(60)
    expect(layers[0].fontSizePt).toBe(60)
    // leading 55 / 60 → 0.92
    expect(layers[0].lineHeight).toBe(0.92)
  })

  it('自由变换缩放的文字层：字号 × 1.28（93.74pt → 120px）', async () => {
    const { layers } = await makeLayers([{
      name: '标题', opacity: 255,
      left: 0, top: 0, right: 500, bottom: 300,
      text: {
        text: 'title',
        transform: [1.28007, 0, 0, 1.28007, 502, 231],
        style: { font: { name: 'KazakhSoftAsilyaQaniq' }, fontSize: 93.74478, fillColor: { r: 0, g: 0, b: 0 } },
      },
    }])
    expect(layers[0].fontSize).toBe(120)
    expect(layers[0].fontSizePt).toBe(120)
  })

  it('颜色叠加效果（solidFill）优先于 fillColor：金色标题不再变黑', async () => {
    const { layers, warnings } = await makeLayers([{
      name: '标题', opacity: 255,
      left: 0, top: 0, right: 500, bottom: 300,
      text: {
        text: 'title',
        transform: [1, 0, 0, 1, 0, 0],
        style: { font: { name: 'KazakhSoftAsilyaQaniq' }, fontSize: 93.74478, fillColor: { r: 0, g: 0, b: 0 } },
      },
      effects: {
        solidFill: [{ enabled: true, color: { r: 216, g: 156, b: 68 } }],
      },
    }])
    expect(layers[0].color).toBe('#d89c44')
    // 颜色叠加已还原为文字颜色，不再报告「无法还原」
    expect(warnings.some(w => w.includes('颜色叠加'))).toBe(false)
  })

  it('solidFill 未启用时回退 fillColor', async () => {
    const { layers } = await makeLayers([{
      name: '标题', opacity: 255,
      left: 0, top: 0, right: 500, bottom: 300,
      text: {
        text: 'title',
        transform: [1, 0, 0, 1, 0, 0],
        style: { font: { name: 'ArialMT' }, fontSize: 12, fillColor: { r: 10, g: 20, b: 30 } },
      },
      effects: {
        solidFill: [{ enabled: false, color: { r: 216, g: 156, b: 68 } }],
      },
    }])
    expect(layers[0].color).toBe('#0a141e')
  })
})

describe('PSD 剪贴蒙版：clipping 照片层关联下方圆形 base 形状层', () => {
  const makeLayers = async (children: any[]) => flattenPsdLayers(
    { width: 600, height: 800, children } as any,
    { resolution: 300, resolutionUnit: 'PPI', availableFonts: [] },
  )

  const testCanvas = () => {
    const c = document.createElement('canvas')
    c.width = 200
    c.height = 200
    return c
  }

  // 200×200 内切圆路径（4 个贝塞尔节点，PSD 路径坐标为图层本地 0..200）
  const circleVectorMask = {
    paths: [{
      open: false,
      fillRule: 'non-zero' as const,
      knots: [
        { linked: true, points: [0, 0, 100, 0, 200, 0] },
        { linked: true, points: [200, 0, 200, 100, 200, 200] },
        { linked: true, points: [200, 200, 100, 200, 0, 200] },
        { linked: true, points: [0, 200, 0, 100, 0, 0] },
      ],
    }],
  }

  it('裁剪组：圆形 base 形状层在下（无栅格）、照片层在上（clipping）→ 照片层按 base 圆形烘焙裁剪', async () => {
    const { layers, skipped } = await makeLayers([
      // children[0] = 最底层：base 形状层在下
      {
        name: '圆形底托',
        left: 100, top: 100, right: 300, bottom: 300, opacity: 255,
        vectorMask: circleVectorMask,
      },
      {
        name: '照片裁剪层', clipping: true,
        left: 100, top: 100, right: 300, bottom: 300, opacity: 255,
        canvas: testCanvas(),
      },
    ])
    // base 形状层无栅格被跳过，但其圆形路径已作为几何 base 生效
    expect(skipped.map(s => s.name)).toContain('圆形底托')
    const photo = layers.find(l => l.name === '照片裁剪层')
    expect(photo).toBeDefined()
    // jsdom 无真实像素：通过告警验证烘焙流程（真实浏览器中圆形已烘焙进 alpha）
    expect(photo!.warnings).toContain('已按剪贴蒙版 base 形状裁剪')
  })

  it('裁剪组：多个 clipping 照片层共享同一圆形 base → 全部按 base 烘焙裁剪', async () => {
    const { layers } = await makeLayers([
      // children[0] = 最底层：base 在下，两个 clipping 层依次共享同一 base
      { name: '圆形底托', left: 100, top: 100, right: 300, bottom: 300, opacity: 255, vectorMask: circleVectorMask },
      { name: '照片层1', clipping: true, left: 100, top: 100, right: 300, bottom: 300, opacity: 255, canvas: testCanvas() },
      { name: '照片层2', clipping: true, left: 100, top: 100, right: 300, bottom: 300, opacity: 255, canvas: testCanvas() },
    ])
    expect(layers.find(l => l.name === '照片层1')!.warnings).toContain('已按剪贴蒙版 base 形状裁剪')
    expect(layers.find(l => l.name === '照片层2')!.warnings).toContain('已按剪贴蒙版 base 形状裁剪')
  })

  it('普通照片层（非 clipping、下方无圆形形状层）→ 不误判为 circle', async () => {
    const { layers } = await makeLayers([
      {
        name: '普通照片',
        left: 100, top: 100, right: 300, bottom: 300, opacity: 255,
        canvas: testCanvas(),
      },
    ])
    expect(layers.find(l => l.name === '普通照片')!.mask).toBeUndefined()
  })

  it('裁剪组整体顺序：背景（底）→ 圆形 base → 照片裁剪层 → 顶层装饰（顶），蒙版烘焙仍生效', async () => {
    const { layers } = await makeLayers([
      // children[0] = 最底层：背景 → base → clipping 照片 → 顶层装饰
      { name: '背景', opacity: 255, left: 0, top: 0, right: 600, bottom: 800, canvas: testCanvas() },
      { name: '圆形底托', left: 100, top: 100, right: 300, bottom: 300, opacity: 255, vectorMask: circleVectorMask },
      { name: '照片裁剪层', clipping: true, left: 100, top: 100, right: 300, bottom: 300, opacity: 255, canvas: testCanvas() },
      { name: '顶层装饰', opacity: 255, left: 0, top: 0, right: 600, bottom: 800, canvas: testCanvas() },
    ])
    const names = layers.filter(l => l.type !== 'group').map(l => l.name)
    // bottom-to-top：背景（最底）→ 照片裁剪层 → 顶层装饰（最顶）；圆形底托无栅格跳过
    expect(names).toEqual(['背景', '照片裁剪层', '顶层装饰'])
    expect(layers.find(l => l.name === '照片裁剪层')!.warnings).toContain('已按剪贴蒙版 base 形状裁剪')
  })
})