import { describe, it, expect } from 'vitest'
import { containsRtl, shapeText, visualToLogicalRtl } from '../bidi'

describe('containsRtl', () => {
  it('检测哈萨克/阿拉伯 RTL 字符', () => {
    expect(containsRtl('قىز توي')).toBe(true)
    expect(containsRtl('Hello World')).toBe(false)
    expect(containsRtl('')).toBe(false)
    expect(containsRtl(null)).toBe(false)
  })
})

describe('shapeText', () => {
  it('非 RTL 文本原样返回', () => {
    expect(shapeText('Hello')).toBe('Hello')
  })

  it('RTL 文本返回视觉顺序的 shaped 字符串', () => {
    const out = shapeText('توي')
    expect(typeof out).toBe('string')
    expect(containsRtl(out)).toBe(true)
  })
})

describe('visualToLogicalRtl（视觉序 PSD 文本 → 逻辑序）', () => {
  // 输入均为真实 PSD（升学宴请柬哈语版01.psd）提取的原始文本（视觉顺序 + 预成形字形）

  it('纯哈萨克文字：反转还原', () => {
    // ﻰﻳﻮﺗ ﯟﻧﺎﺘﺗﺍ ﺎﻋﯟﻗﻭ → وقۋعا اتتانۋ تويى
    const visual = '\ufef0\ufef3\ufeee\ufe97\u0020\ufbdf\ufee7\ufe8e\ufe98\ufe97\ufe8d\u0020\ufe8e\ufecb\ufbdf\ufed7\ufeed'
    expect(visualToLogicalRtl(visual)).toBe('\u0648\u0642\u06cb\u0639\u0627\u0020\u0627\u062a\u062a\u0627\u0646\u06cb\u0020\u062a\u0648\u064a\u0649')
  })

  it('成形后的 ە(06D5) 还原（哈萨克语境 0647→06D5）', () => {
    // :ﻰﺘﺗﻪﻣﺭﯘﻗ → قۇرمەتتى:
    const visual = '\u003a\ufef0\ufe98\ufe97\ufeea\ufee3\ufead\ufbd8\ufed7'
    expect(visualToLogicalRtl(visual)).toBe('\u0642\u06c7\u0631\u0645\u06d5\u062a\u062a\u0649\u003a')
  })

  it('لا 连字保护：反转后不拆开错位', () => {
    // ﺰﯩﻣﻻﺎﺑ → بالامىز（ﻻ=U+FEFB 连字作为整体反转）
    const visual = '\ufeb0\ufbe9\ufee3\ufefb\ufe8e\ufe91'
    expect(visualToLogicalRtl(visual)).toBe('\u0628\u0627\u0644\u0627\u0645\u0649\u0632')
  })

  it('括号镜像还原', () => {
    // (ﻰﺒﻧﻪﺴﻳﯗﺩ) → (دۇيسەنبى)
    const visual = '\u0028\ufef0\ufe92\ufee7\ufeea\ufeb4\ufef3\ufbd7\ufea9\u0029'
    expect(visualToLogicalRtl(visual)).toBe('\u0028\u062f\u06c7\u064a\u0633\u06d5\u0646\u0628\u0649\u0029')
  })

  it('多行文本：逐行反转、保持行序、数字段保持 LTR', () => {
    // 完整三段：日期 / 邀请正文 / 落款（真实 PSD 提取）
    const visual = '\u0020\ufef0\ufee7\ufbd8\ufedb\u002d\u0030\u0031\u0020\ufbd4\ufbe8\ufeaa\ufef3\ufe8d\u002d\u0031\u0030\u0020\ufef0\ufee0\ufbe9\ufe9f\u002d\u0032\u0030\u0032\u0036\u0020\ufeef\ufea9\ufead\ufee9\ufea9\ufeb0\ufbe9\ufeb3\u000a\u000a\u0020\ufe8e\ufecb\ufbdf\ufed7\ufeed\u0020\ufbd4\ufbe9\ufe98\ufe97\ufe8e\ufee3\ufe8d\ufeaf\ufe8d\u0020\ufeb0\ufbe9\ufee3\ufefb\ufe8e\ufe91\u0020\ufee6\ufbe9\ufe97\ufeea\ufee0\ufbe8\ufeb0\ufbe9\ufedc\ufe97\ufeed\u0028\ufef0\ufe92\ufee7\ufeea\ufeb4\ufef3\ufbd7\ufea9\u0029\u000a\u000a\u002e\ufeb0\ufbe9\ufee3\ufe8d\ufeae\ufbe9\ufed7\ufe8e\ufeb7\u0020\ufe8e\ufecb\ufbdf\ufedf\ufeee\ufe91\u0020\ufef0\ufecb\ufe8e\ufee7\ufeee\ufed7\u0020\ufef0\ufee0\ufef4\ufeb3\u0020\ufbd4\ufbe8\ufea9\ufeb0\ufbe9\ufee4\ufef3\ufeee\ufe97\u0020\ufbdf\ufee7\ufe8e\ufe98\ufe97\ufe8d'
    const expected =
      '\u0633\u0649\u0632\u062f\u06d5\u0631\u062f\u0649\u0020\u0032\u0030\u0032\u0036\u002d\u062c\u0649\u0644\u0649\u0020\u0031\u0030\u002d\u0627\u064a\u062f\u0649\u06ad\u0020\u0030\u0031\u002d\u0643\u06c7\u0646\u0649\u0020' +
      '\u000a\u000a' +
      '\u0028\u062f\u06c7\u064a\u0633\u06d5\u0646\u0628\u0649\u0029\u0648\u062a\u0643\u0649\u0632\u0649\u0644\u06d5\u062a\u0649\u0646\u0020\u0628\u0627\u0644\u0627\u0645\u0649\u0632\u0020\u0627\u0632\u0627\u0645\u0627\u062a\u062a\u0649\u06ad\u0020\u0648\u0642\u06cb\u0639\u0627\u0020' +
      '\u000a\u000a' +
      '\u0627\u062a\u062a\u0627\u0646\u06cb\u0020\u062a\u0648\u064a\u0645\u0649\u0632\u062f\u0649\u06ad\u0020\u0633\u064a\u0644\u0649\u0020\u0642\u0648\u0646\u0627\u0639\u0649\u0020\u0628\u0648\u0644\u06cb\u0639\u0627\u0020\u0634\u0627\u0642\u0649\u0631\u0627\u0645\u0649\u0632\u002e'
    expect(visualToLogicalRtl(visual)).toBe(expected)
    // 语义可读性抽查
    expect(expected).toContain('\u0633\u0649\u0632\u062f\u06d5\u0631\u062f\u0649 2026-\u062c\u0649\u0644\u0649')
    expect(expected).toContain('\u0648\u0642\u06cb\u0639\u0627')
  })

  // 纯函数始终按视觉序处理；「逻辑序文本不被误转」的保证在 flattenPsdLayers（SHAPED_RTL_RE 门控），见 psd-roundtrip.test.ts

  it('非 RTL 文本原样返回', () => {
    expect(visualToLogicalRtl('Happy Wedding!')).toBe('Happy Wedding!')
    expect(visualToLogicalRtl('')).toBe('')
  })
})