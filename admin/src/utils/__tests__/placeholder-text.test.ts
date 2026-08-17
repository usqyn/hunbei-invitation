import { describe, it, expect } from 'vitest'
import { resolveTextPlaceholders, extractTokenKeys, hasTextPlaceholders } from '../../../../src/utils/resolveTextPlaceholders'
import { formatCnDate } from '../../../../src/constants/placeholder-defs'
import { PLACEHOLDER_DEFS as ADMIN_DEFS } from '../../constants/placeholder-defs'
import { PLACEHOLDER_DEFS as MINI_DEFS } from '../../../../src/constants/placeholder-defs'

describe('resolveTextPlaceholders（注册表驱动渲染）', () => {
  it('替换中文邀请者/时间/地点/电话', () => {
    const text = '敬请 {inviter} 于 {time} 莅临 {location}'
    const out = resolveTextPlaceholders(text, {
      inviter: '王大明', time: '18:00', location: '如意大酒店',
    } as any)
    expect(out).toBe('敬请 王大明 于 18:00 莅临 如意大酒店')
  })

  it('中文日期 YYYY-MM-DD 渲染为 YYYY年M月D日', () => {
    expect(resolveTextPlaceholders('日期：{date}', { date: '2026-10-01' } as any))
      .toBe('日期：2026年10月1日')
    expect(formatCnDate('2026-10-01')).toBe('2026年10月1日')
    expect(formatCnDate('2026-1-1')).toBe('2026年1月1日')
    expect(formatCnDate('')).toBe('')
    expect(formatCnDate('abc')).toBe('abc')
  })

  it('未填值的 token 保留字面量（便于识别与后续回填）', () => {
    const out = resolveTextPlaceholders('时间：{time}', {} as any)
    expect(out).toBe('时间：{time}')
  })

  it('kzDate 优先使用回填的原文格式（PSD 原文一致性）', () => {
    const out = resolveTextPlaceholders('سىزدەردى {kzDate}', {
      kzDate: '2026-جىلى 10-ايدىڭ 01-كۇنى',
    } as any)
    expect(out).toBe('سىزدەردى 2026-جىلى 10-ايدىڭ 01-كۇنى')
  })

  it('kzDate 无回填值且无中文日期时保留字面', () => {
    expect(resolveTextPlaceholders('{kzDate}', {} as any)).toBe('{kzDate}')
  })

  it('kzDate 无回填值时按中文 date 生成标准哈语表达式', () => {
    const out = resolveTextPlaceholders('{kzDate}', { date: '2026-01-22' } as any)
    expect(out).toMatch(/^2026 جىلعى 1 ايدىڭ 22 كۇنى$/)
  })

  it('正文混排多 token（哈语日期 + 括号星期）', () => {
    const out = resolveTextPlaceholders(
      'سىزدەردى {kzDate} \n\n{kzWeekdayParen}وتكىزىلەتىن',
      {
        kzDate: '2026-جىلى 10-ايدىڭ 01-كۇنى',
        kzWeekdayParen: '(دۇيسەنبى)',
      } as any,
    )
    expect(out).toBe('سىزدەردى 2026-جىلى 10-ايدىڭ 01-كۇنى \n\n(دۇيسەنبى)وتكىزىلەتىن')
  })

  it('year/month/day 独立占位符', () => {
    expect(resolveTextPlaceholders('{year}-{month}-{day}', { year: '2026', month: '10', day: '1' } as any))
      .toBe('2026-10-1')
  })

  it('哈语人名/地址', () => {
    expect(resolveTextPlaceholders('{kzGroomName} & {kzBrideName}', { kzGroomName: 'نۇرلان', kzBrideName: 'اينۇر' } as any))
      .toBe('نۇرلان & اينۇر')
  })

  it('空文本安全返回', () => {
    expect(resolveTextPlaceholders('', {} as any)).toBe('')
  })
})

describe('extractTokenKeys（token 收集）', () => {
  it('混排文本返回全部 token 字段', () => {
    const keys = extractTokenKeys('سىزدەردى {kzDate} \n\n({kzWeekdayParen}) {inviter}')
    expect(keys).toEqual(expect.arrayContaining(['kzDate', 'kzWeekdayParen', 'inviter']))
  })

  it('无 token 返回空数组', () => {
    expect(extractTokenKeys('普通文本')).toEqual([])
    expect(extractTokenKeys('')).toEqual([])
  })

  it('hasTextPlaceholders 检测', () => {
    expect(hasTextPlaceholders('时间 {time}')).toBe(true)
    expect(hasTextPlaceholders('纯文本')).toBe(false)
  })
})

describe('注册表一致性（admin 与小程序端）', () => {
  it('admin 端注册表 key 唯一且 token 格式合法', () => {
    const keys = ADMIN_DEFS.map(d => d.key)
    expect(new Set(keys).size).toBe(keys.length)
    keys.forEach(k => expect(k).toMatch(/^[a-zA-Z]+$/))
  })

  it('小程序端注册表 key 唯一', () => {
    const keys = MINI_DEFS.map(d => d.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('两端注册表字段集合一致', () => {
    expect(MINI_DEFS.map(d => d.key).sort()).toEqual(ADMIN_DEFS.map(d => d.key).sort())
  })

  it('覆盖既有全部字段（含哈语 7 个 + 中文 10 个）', () => {
    const keys = ADMIN_DEFS.map(d => d.key)
    ;['inviter', 'invitee', 'date', 'time', 'location', 'address', 'phone', 'year', 'month', 'day'].forEach(k => expect(keys).toContain(k))
    ;['kzDate', 'kzWeekday', 'kzWeekdayParen', 'kzTime', 'kzGroomName', 'kzBrideName', 'kzAddress'].forEach(k => expect(keys).toContain(k))
  })

  it('contentDetect 正则可执行（哈语日期两形态 + 括号星期）', () => {
    const kzDate = ADMIN_DEFS.find(d => d.key === 'kzDate')!
    expect(kzDate.contentDetect!.test('2026-جىلى 10-ايدىڭ 01-كۇنى')).toBe(true)
    expect(kzDate.contentDetect!.test('2026 جىلعى 1 ايدىڭ 22 كۇنى')).toBe(true)
    const paren = ADMIN_DEFS.find(d => d.key === 'kzWeekdayParen')!
    expect(paren.contentDetect!.test('(دۇيسەنبى)')).toBe(true)
    const time = ADMIN_DEFS.find(d => d.key === 'time')!
    expect(time.contentDetect!.test('18:00')).toBe(true)
    const date = ADMIN_DEFS.find(d => d.key === 'date')!
    expect(date.contentDetect!.test('2026年10月1日')).toBe(true)
    expect(date.contentDetect!.test('2026-10-01')).toBe(true)
  })
})
