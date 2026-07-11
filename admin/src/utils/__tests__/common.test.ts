import { describe, it, expect } from 'vitest'
import { sanitizeSvg, getCategoryName, formatTime, getLuminance } from '../common'

describe('sanitizeSvg', () => {
  // ---------------------------------------------------------------------------
  // 1. 移除 <script> 标签
  // ---------------------------------------------------------------------------
  it('应移除 <script> 标签及其内容', () => {
    const svg = '<svg><script>alert("xss")</script><text>Hi</text></svg>'
    expect(sanitizeSvg(svg)).toBe('<svg><text>Hi</text></svg>')
  })

  it('应移除多个 <script> 标签', () => {
    const svg = '<svg><script>a()</script><rect/><script>b()</script></svg>'
    expect(sanitizeSvg(svg)).toBe('<svg><rect/></svg>')
  })

  it('应移除带属性与多行内容的 <script> 标签', () => {
    const svg = `<svg>
      <script type="text/javascript">
        var x = 1;
        doSomething();
      </script>
      <circle/>
    </svg>`
    const result = sanitizeSvg(svg)
    expect(result).not.toContain('<script')
    expect(result).not.toContain('doSomething')
    expect(result).toContain('<circle/>')
  })

  it('应大小写不敏感地移除 <SCRIPT> 标签', () => {
    const svg = '<svg><SCRIPT>alert(1)</SCRIPT></svg>'
    expect(sanitizeSvg(svg)).toBe('<svg></svg>')
  })

  // ---------------------------------------------------------------------------
  // 2. 移除 <iframe> 标签
  // ---------------------------------------------------------------------------
  it('应移除 <iframe> 标签及其内容', () => {
    const svg = '<svg><iframe src="evil.html"></iframe><text>ok</text></svg>'
    expect(sanitizeSvg(svg)).toBe('<svg><text>ok</text></svg>')
  })

  // ---------------------------------------------------------------------------
  // 3. 移除 <object> 与 <embed> 标签
  // ---------------------------------------------------------------------------
  it('应移除 <object> 标签及其内容', () => {
    const svg = '<svg><object data="evil.swf"><param/></object><rect/></svg>'
    const result = sanitizeSvg(svg)
    expect(result).not.toContain('<object')
    expect(result).not.toContain('</object>')
    expect(result).not.toContain('evil.swf')
    expect(result).toContain('<rect/>')
  })

  it('应移除 <embed> 开始标签', () => {
    // <embed> 是 void 元素，仅移除开标签
    const svg = '<svg><embed src="evil.swf" type="application/x-shockwave-flash"/><text>ok</text></svg>'
    const result = sanitizeSvg(svg)
    expect(result).not.toContain('<embed')
    expect(result).not.toContain('evil.swf')
    expect(result).toContain('<text>ok</text>')
  })

  // ---------------------------------------------------------------------------
  // 4. 移除 <foreignObject> 标签
  // ---------------------------------------------------------------------------
  it('应移除 <foreignObject> 标签及其内容', () => {
    const svg = '<svg><foreignObject><div>html</div></foreignObject><rect/></svg>'
    const result = sanitizeSvg(svg)
    expect(result).not.toContain('<foreignObject')
    expect(result).not.toContain('</foreignObject>')
    expect(result).not.toContain('<div>html</div>')
    expect(result).toContain('<rect/>')
  })

  it('应大小写不敏感地移除 <foreignobject>', () => {
    const svg = '<svg><foreignobject>bad</foreignobject></svg>'
    expect(sanitizeSvg(svg)).toBe('<svg></svg>')
  })

  // ---------------------------------------------------------------------------
  // 5. 移除 on* 事件处理器
  // ---------------------------------------------------------------------------
  it('应移除双引号包裹的 on* 事件处理器', () => {
    const svg = '<svg onclick="alert(1)"><rect onload="doX()"/></svg>'
    const result = sanitizeSvg(svg)
    expect(result).not.toContain('onclick')
    expect(result).not.toContain('onload')
    expect(result).not.toContain('alert(1)')
    expect(result).toContain('<svg')
    expect(result).toContain('<rect')
  })

  it('应移除单引号包裹的 on* 事件处理器', () => {
    const svg = "<svg onclick='alert(1)'><rect onmouseover='hover()'/></svg>"
    const result = sanitizeSvg(svg)
    expect(result).not.toContain('onclick')
    expect(result).not.toContain('onmouseover')
    expect(result).not.toContain("alert(1)")
  })

  it('应移除未加引号的 on* 事件处理器', () => {
    const svg = '<svg onclick=alert(1)></svg>'
    const result = sanitizeSvg(svg)
    expect(result).not.toContain('onclick')
    expect(result).not.toContain('alert(1)')
  })

  it('应移除 onerror / onload / onfocus 等多种事件', () => {
    const svg = '<svg><image onerror="hack()" onload="x()" onfocus="f()"/></svg>'
    const result = sanitizeSvg(svg)
    expect(result).not.toMatch(/on\w+\s*=/i)
    expect(result).not.toContain('hack()')
  })

  // ---------------------------------------------------------------------------
  // 6. 移除 javascript: 协议
  // ---------------------------------------------------------------------------
  it('应移除 javascript: 协议', () => {
    const svg = '<a xlink:href="javascript:alert(1)">link</a>'
    const result = sanitizeSvg(svg)
    expect(result).not.toContain('javascript:')
    expect(result).toContain('alert(1)') // 仅移除协议前缀本身
  })

  it('应大小写不敏感地移除 JAVASCRIPT:', () => {
    const svg = '<a href="JaVaScRiPt:alert(1)"/>'
    const result = sanitizeSvg(svg)
    expect(result).not.toMatch(/javascript:/i)
  })

  // ---------------------------------------------------------------------------
  // 7. 保留合法 SVG 内容（文字、图形、渐变）
  // ---------------------------------------------------------------------------
  it('应保留合法的 text / rect / 渐变等内容', () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<text x="10" y="20" fill="red">Hello</text>' +
      '<rect x="0" y="0" width="10" height="10"/>' +
      '<linearGradient id="g"><stop offset="0" stop-color="#fff"/></linearGradient>' +
      '<circle cx="50" cy="50" r="10"/>' +
      '</svg>'
    const result = sanitizeSvg(svg)
    expect(result).toBe(svg) // 应原样保留
    expect(result).toContain('Hello')
    expect(result).toContain('<rect')
    expect(result).toContain('linearGradient')
    expect(result).toContain('<circle')
  })

  it('应同时清理多种攻击向量并保留合法内容', () => {
    const svg =
      '<svg>' +
      '<script>alert(1)</script>' +
      '<rect onclick="evil()" fill="#f00"/>' +
      '<a href="javascript:bad()">x</a>' +
      '<text>保留我</text>' +
      '</svg>'
    const result = sanitizeSvg(svg)
    expect(result).not.toContain('<script')
    expect(result).not.toContain('onclick')
    expect(result).not.toContain('javascript:')
    expect(result).toContain('<rect')
    expect(result).toContain('fill="#f00"')
    expect(result).toContain('保留我')
  })

  // ---------------------------------------------------------------------------
  // 8. 空 / null / undefined 输入
  // ---------------------------------------------------------------------------
  it('空字符串应返回空字符串', () => {
    expect(sanitizeSvg('')).toBe('')
  })

  it('null / undefined 应返回空字符串', () => {
    expect(sanitizeSvg(null as unknown as string)).toBe('')
    expect(sanitizeSvg(undefined as unknown as string)).toBe('')
  })
})

// =============================================================================
// common.ts 中其它纯函数
// =============================================================================
describe('getCategoryName', () => {
  it('应根据分类 id 返回对应中文名称', () => {
    expect(getCategoryName('wedding')).toBe('婚礼请柬')
    expect(getCategoryName('proposal')).toBe('订婚请柬')
    expect(getCategoryName('baby')).toBe('宝宝请柬')
    expect(getCategoryName('business')).toBe('商务请柬')
  })

  it('未匹配的分类 id 应原样返回', () => {
    expect(getCategoryName('unknown')).toBe('unknown')
    expect(getCategoryName('not-exist')).toBe('not-exist')
  })
})

describe('formatTime', () => {
  it('应将时间戳格式化为 M/D H:mm 形式', () => {
    // 使用本地时间构造，确保跨时区一致
    const ts = new Date(2024, 0, 5, 9, 5).getTime() // 2024-01-05 09:05
    expect(formatTime(ts)).toBe('1/5 9:05')
  })

  it('分钟数应补零到两位', () => {
    const ts = new Date(2024, 11, 31, 23, 3).getTime() // 2024-12-31 23:03
    expect(formatTime(ts)).toBe('12/31 23:03')
  })

  it('两位数分钟不需补零', () => {
    const ts = new Date(2024, 5, 15, 8, 45).getTime() // 2024-06-15 08:45
    expect(formatTime(ts)).toBe('6/15 8:45')
  })
})

describe('getLuminance', () => {
  it('纯白亮度应为 1', () => {
    expect(getLuminance('#ffffff')).toBe(1)
  })

  it('纯黑亮度应为 0', () => {
    expect(getLuminance('#000000')).toBe(0)
  })

  it('红色亮度应为 0.299', () => {
    expect(getLuminance('#ff0000')).toBeCloseTo(0.299, 3)
  })

  it('绿色亮度应为 0.587', () => {
    expect(getLuminance('#00ff00')).toBeCloseTo(0.587, 3)
  })

  it('蓝色亮度应为 0.114', () => {
    expect(getLuminance('#0000ff')).toBeCloseTo(0.114, 3)
  })

  it('应支持不带 # 的颜色值', () => {
    expect(getLuminance('ffffff')).toBe(1)
    expect(getLuminance('000000')).toBe(0)
  })
})
