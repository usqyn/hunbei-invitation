import { describe, it, expect } from 'vitest'
import {
  colorToHex,
  normalizeText,
  resolveFontSizePx,
  getResolutionInfo,
  extractRotationFromTransform,
  mapJustification,
  mapFontName,
  MAX_PSD_DIMENSION,
} from '../psd-import'

describe('normalizeText', () => {
  it('应通过 NFKC 将阿拉伯文展示形式还原为基础字母（防二次 shaping）', () => {
    // U+FEDF (ARABIC LETTER LAM FINAL FORM) → U+0644 (ل)
    const presentationForm = '\uFEDF'
    expect(normalizeText(presentationForm)).toBe('\u0644')
  })

  it('应还原 lam-alef 强制连字展示形式', () => {
    // U+FEFB (ARABIC LIGATURE LAM WITH ALEF ISOLATED FORM) → لا
    const ligature = '\uFEFB'
    expect(normalizeText(ligature)).toBe('\u0644\u0627')
  })

  it('应去除 NUL 字符并 trim', () => {
    expect(normalizeText('  abc\u0000def  ')).toBe('abcdef')
  })

  it('哈萨克阿拉伯文基础字母应保持不变', () => {
    const kazakh = 'قىز'
    expect(normalizeText(kazakh)).toBe(kazakh)
  })
})

describe('resolveFontSizePx', () => {
  it('PPI 文档：1pt = dpi/72 px', () => {
    expect(resolveFontSizePx(72, 72, 'PPI')).toBe(72)
    expect(resolveFontSizePx(24, 144, 'PPI')).toBe(48)
  })

  it('PPCM 文档：1pt = dpcm*2.54/72 px', () => {
    // 28.35 dpcm ≈ 72 dpi，24pt 应约为 24px
    expect(resolveFontSizePx(24, 28.35, 'PPCM')).toBeCloseTo(24, 0)
  })

  it('无效字号返回 0', () => {
    expect(resolveFontSizePx(undefined, 72, 'PPI')).toBe(0)
    expect(resolveFontSizePx(0, 72, 'PPI')).toBe(0)
  })
})

describe('getResolutionInfo', () => {
  it('无分辨率资源时默认 72 PPI', () => {
    const { resolution, unit } = getResolutionInfo(undefined)
    expect(resolution).toBe(72)
    expect(unit).toBe('PPI')
  })

  it('读取 PPI 分辨率', () => {
    const { resolution, unit } = getResolutionInfo({
      resolutionInfo: { horizontalResolution: 300, horizontalResolutionUnit: 'PPI' },
    } as any)
    expect(resolution).toBe(300)
    expect(unit).toBe('PPI')
  })

  it('读取 PPCM 分辨率', () => {
    const { resolution, unit } = getResolutionInfo({
      resolutionInfo: { horizontalResolution: 28.35, horizontalResolutionUnit: 'PPCM' },
    } as any)
    expect(resolution).toBe(28.35)
    expect(unit).toBe('PPCM')
  })
})

describe('extractRotationFromTransform', () => {
  it('单位矩阵 → 0°', () => {
    expect(extractRotationFromTransform([1, 0, 0, 1, 10, 20])).toBe(0)
  })

  it('90° 旋转矩阵 → 90°', () => {
    expect(extractRotationFromTransform([0, 1, -1, 0, 0, 0])).toBe(90)
  })

  it('undefined → 0°', () => {
    expect(extractRotationFromTransform(undefined)).toBe(0)
  })
})

describe('mapJustification', () => {
  it('基础对齐映射', () => {
    expect(mapJustification('left')).toBe('left')
    expect(mapJustification('center')).toBe('center')
    expect(mapJustification('right')).toBe('right')
  })

  it('两端对齐变体全部映射为 justify', () => {
    expect(mapJustification('justify-all')).toBe('justify')
    expect(mapJustification('justify-left')).toBe('justify')
    expect(mapJustification('justify-right')).toBe('justify')
    expect(mapJustification('justify-center')).toBe('justify')
  })

  it('undefined → undefined', () => {
    expect(mapJustification(undefined)).toBeUndefined()
  })
})

describe('mapFontName', () => {
  const available = [
    'KazakhSoftAsilya',
    'KazakhSoftAsilyaQaniq',
    '思源宋体, serif',
    '思源黑体, sans-serif',
    '华文楷体, KaiTi, serif',
    'Arial, sans-serif',
  ]

  it('完全一致匹配', () => {
    expect(mapFontName('KazakhSoftAsilya', available).mapped).toBe('KazakhSoftAsilya')
  })

  it('忽略大小写/空格/连字符匹配（PostScript 名）', () => {
    expect(mapFontName('Kazakh-Soft_Asilya', available).mapped).toBe('KazakhSoftAsilya')
    expect(mapFontName('kazakhsoftasilya', available).mapped).toBe('KazakhSoftAsilya')
  })

  it('中文字体后缀匹配', () => {
    expect(mapFontName('思源宋体', available).mapped).toBe('思源宋体, serif')
  })

  it('未命中 → 无映射（RTL 文本由现有链路兜底 KazakhSoftAsilya）', () => {
    expect(mapFontName('NotoNaskhArabic-Regular', available).mapped).toBeUndefined()
    expect(mapFontName('UKIJTuz', available).mapped).toBeUndefined()
  })

  it('空值安全', () => {
    expect(mapFontName(undefined, available).mapped).toBeUndefined()
    expect(mapFontName('', available).mapped).toBeUndefined()
  })
})

describe('colorToHex', () => {
  it('RGBA 0-255 → hex', () => {
    expect(colorToHex({ r: 255, g: 0, b: 128 })).toBe('#ff0080')
    expect(colorToHex({ r: 0, g: 0, b: 0, a: 255 })).toBe('#000000')
  })

  it('带透明度的 RGBA → 8 位 hex', () => {
    expect(colorToHex({ r: 0, g: 0, b: 0, a: 128 })).toBe('#00000080')
  })

  it('FRGB 0-1 浮点 → hex', () => {
    expect(colorToHex({ fr: 1, fg: 0.5, fb: 0 })).toBe('#ff8000')
  })

  it('无效颜色 → undefined', () => {
    expect(colorToHex(undefined)).toBeUndefined()
  })
})

describe('安全上限', () => {
  it('MAX_PSD_DIMENSION 应为 10000（与 ag-psd 安全指南一致）', () => {
    expect(MAX_PSD_DIMENSION).toBe(10000)
  })
})