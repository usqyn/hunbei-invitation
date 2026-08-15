import { describe, it, expect } from 'vitest'
import {
  GRADIENT_PRESETS,
  getGradientsByCategory,
} from '../../constants/gradients'
import { ALL_PRESETS, getPresetsByCategory } from '../../constants/presets'
import {
  ALL_MATERIALS,
  getMaterialCategories,
  getMaterialsByCategory,
} from '../../constants/materials'

describe('getGradientsByCategory', () => {
  it("传 '全部' 应返回全部渐变预设", () => {
    const result = getGradientsByCategory('全部')
    expect(result).toEqual(GRADIENT_PRESETS)
    expect(result.length).toBe(GRADIENT_PRESETS.length)
  })

  it("传 '婚礼' 应只返回婚礼分类的预设", () => {
    const result = getGradientsByCategory('婚礼')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every(g => g.category === '婚礼')).toBe(true)
    expect(result.length).toBe(
      GRADIENT_PRESETS.filter(g => g.category === '婚礼').length,
    )
  })

  it("传 '暗色' 应只返回暗色分类的预设", () => {
    const result = getGradientsByCategory('暗色')
    expect(result.every(g => g.category === '暗色')).toBe(true)
  })

  it("传不存在的分类应返回空数组", () => {
    expect(getGradientsByCategory('不存在的分类')).toEqual([])
  })
})

describe('getPresetsByCategory', () => {
  it("传 'scene' 应只返回场景模板", () => {
    const result = getPresetsByCategory('scene')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every(p => p.category === 'scene')).toBe(true)
  })

  it("传 'layout' 应只返回布局骨架", () => {
    const result = getPresetsByCategory('layout')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every(p => p.category === 'layout')).toBe(true)
  })

  it('scene + kz + layout 的总数应等于全部预设', () => {
    const scenes = getPresetsByCategory('scene')
    const kz = getPresetsByCategory('kz')
    const layouts = getPresetsByCategory('layout')
    expect(scenes.length + kz.length + layouts.length).toBe(ALL_PRESETS.length)
  })

  it("传不存在的分类应返回空数组", () => {
    expect(getPresetsByCategory('not-exist')).toEqual([])
  })

  it('每个预设都应包含可用的 draft 结构', () => {
    for (const preset of ALL_PRESETS) {
      expect(preset.draft).toBeDefined()
      expect(preset.draft.canvasSize).toBeDefined()
      expect(Array.isArray(preset.draft.elements)).toBe(true)
    }
  })
})

describe('getMaterialsByCategory', () => {
  it("传 '全部' 应返回全部素材", () => {
    const result = getMaterialsByCategory('全部')
    expect(result).toEqual(ALL_MATERIALS)
    expect(result.length).toBe(ALL_MATERIALS.length)
  })

  it("传 '基础图形' 应只返回基础图形", () => {
    const result = getMaterialsByCategory('基础图形')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every(m => m.category === '基础图形')).toBe(true)
  })

  it("传 '边框' 应只返回边框素材", () => {
    const result = getMaterialsByCategory('边框')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every(m => m.category === '边框')).toBe(true)
  })

  it("传不存在的分类应返回空数组", () => {
    expect(getMaterialsByCategory('不存在的分类')).toEqual([])
  })
})

describe('getMaterialCategories', () => {
  it('应返回数组且以"全部"开头', () => {
    const cats = getMaterialCategories()
    expect(Array.isArray(cats)).toBe(true)
    expect(cats.length).toBeGreaterThan(0)
    expect(cats[0]).toBe('全部')
  })

  it('应只包含素材中实际存在的分类（加上"全部"）', () => {
    const cats = getMaterialCategories()
    const existingCats = new Set(ALL_MATERIALS.map(m => m.category))
    // 除了 '全部' 之外，每个返回项都应实际存在于素材中
    for (const c of cats) {
      if (c !== '全部') {
        expect(existingCats.has(c)).toBe(true)
      }
    }
  })

  it('应包含已知分类"基础图形"与"婚礼"', () => {
    const cats = getMaterialCategories()
    expect(cats).toContain('基础图形')
    expect(cats).toContain('婚礼')
  })
})
