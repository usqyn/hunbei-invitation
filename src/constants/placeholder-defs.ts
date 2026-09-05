/**
 * 占位符注册表（小程序端）：
 * 渲染替换（resolveTextPlaceholders）、token 收集（extractTokenKeys）、
 * 表单字段展示均由此驱动。
 * 新增占位符 = 在此追加一行（含 resolve 渲染函数），其余逻辑零改动。
 */

import type { TemplateData } from '../types'
import { toKazakhDate } from '../utils/kz-date'

export interface PlaceholderDef {
  /** 字段 key，token 形如 {key} */
  key: string
  label: string
  icon: string
  group: 'cn' | 'kz'
  /** 表单输入提示 */
  placeholder: string
  /** 预览示例值 */
  preview: string
  /** 渲染替换函数：返回空串时保留 token 字面量 */
  resolve: (data: Partial<TemplateData>) => string
  /** 衍生占位符依赖的其他字段 key：命中本占位符时，这些 key 也会被视为模板需要的字段
   *  （驱动信息面板暴露输入框，未填值时让用户填写） */
  requires?: string[]
}

/** 中文日期格式化：2026-10-01 → 2026年10月1日（输入为空/格式不符时原样返回） */
export function formatCnDate(value?: string): string {
  if (!value) return ''
  const m = value.trim().match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$/)
  if (!m) return value
  return `${m[1]}年${Number(m[2])}月${Number(m[3])}日`
}

export const PLACEHOLDER_DEFS: PlaceholderDef[] = [
  // ===== 中文 =====
  { key: 'inviter', label: '邀请者', icon: '👤', group: 'cn', placeholder: '请输入邀请者姓名', preview: '王大明', resolve: d => d.inviter ?? '' },
  { key: 'invitee', label: '受邀者', icon: '👥', group: 'cn', placeholder: '请输入受邀者姓名', preview: '李小红', resolve: d => d.invitee ?? '' },
  { key: 'date', label: '日期', icon: '📅', group: 'cn', placeholder: '2026年10月1日', preview: '2026年10月1日', resolve: d => formatCnDate(d.date) },
  { key: 'time', label: '时间', icon: '⏰', group: 'cn', placeholder: '18:00', preview: '18:00', resolve: d => d.time ?? '' },
  { key: 'location', label: '地点', icon: '📍', group: 'cn', placeholder: '点击填写地点', preview: '如意大酒店', resolve: d => d.location ?? '' },
  { key: 'address', label: '详细地址', icon: '🏠', group: 'cn', placeholder: 'xx酒店xx厅', preview: '迎宾路88号三层', resolve: d => d.address ?? '' },
  { key: 'phone', label: '联系电话', icon: '📞', group: 'cn', placeholder: '138xxxxxxxx', preview: '13800000000', resolve: d => d.phone ?? '' },
  { key: 'year', label: '年份', icon: '📅', group: 'cn', placeholder: '2025', preview: '2026', resolve: d => d.year ?? '' },
  { key: 'month', label: '月份', icon: '📅', group: 'cn', placeholder: '6', preview: '10', resolve: d => d.month ?? '' },
  { key: 'day', label: '日', icon: '📅', group: 'cn', placeholder: '15', preview: '1', resolve: d => d.day ?? '' },
  { key: 'personName', label: '人名', icon: '👤', group: 'cn', placeholder: '请输入人名', preview: '张伟', resolve: d => d.personName ?? '' },
  { key: 'childName', label: '小孩名', icon: '👶', group: 'cn', placeholder: '请输入小孩名', preview: '张小宝', resolve: d => d.childName ?? '' },
  // 组合占位符：日期 + 时间 + 北京时间(BJ)；复用已有 date/time 字段，无值时由信息面板暴露填写
  { key: 'dateTimeBJ', label: '日期时间(北京时间)', icon: '🗓️', group: 'cn', placeholder: '2026-07-09  20:00  BJ', preview: '2026-07-09  20:00  BJ', requires: ['date', 'time'], resolve: d => {
    const date = (d.date ?? '').trim()
    const time = (d.time ?? '').trim()
    if (!date && !time) return ''   // 都没填→保留 token 字面量，提示用户填写
    return `${date}${date && time ? '  ' : ''}${time}  BJ`
  } },
  // ===== 哈萨克语（阿拉伯文）=====
  // kzDate：优先使用标记/识别回填的原文格式（如 "2026-جىلى 10-ايدىڭ 01-كۇنى"），
  // 无回填值时按中文 date 字段生成标准哈语表达式
  { key: 'kzDate', label: '哈语日期', icon: '📆', group: 'kz', placeholder: '2026 جىلعى 1 ايدىڭ 22 كۇنى', preview: '2026 جىلعى 1 ايدىڭ 22 كۇنى', resolve: d => d.kzDate || (d.date ? toKazakhDate(d.date).fullDate : '') },
  { key: 'kzWeekday', label: '哈语星期', icon: '📆', group: 'kz', placeholder: 'سەيسەنبى', preview: 'سەيسەنبى', resolve: d => d.kzWeekday ?? '' },
  { key: 'kzWeekdayParen', label: '哈语星期(括号)', icon: '📆', group: 'kz', placeholder: '(سەيسەنبى)', preview: '(سەيسەنبى)', resolve: d => d.kzWeekdayParen ?? '' },
  { key: 'kzTime', label: '哈语时间段', icon: '⏰', group: 'kz', placeholder: 'تۇستەن كەيىن', preview: 'تۇستەن كەيىن', resolve: d => d.kzTime ?? '' },
  { key: 'kzGroomName', label: '哈语新郎名', icon: '👨', group: 'kz', placeholder: 'نۇرلان', preview: 'نۇرلان', resolve: d => d.kzGroomName ?? '' },
  { key: 'kzBrideName', label: '哈语新娘名', icon: '👩', group: 'kz', placeholder: 'اينۇر', preview: 'اينۇر', resolve: d => d.kzBrideName ?? '' },
  { key: 'kzGroomFullName', label: '哈语新郎全名', icon: '👨', group: 'kz', placeholder: 'نۇرلان احمەتۇلى', preview: 'نۇرلان احمەتۇلى', resolve: d => d.kzGroomFullName ?? '' },
  { key: 'kzBrideFullName', label: '哈语新娘全名', icon: '👩', group: 'kz', placeholder: 'اينۇر نۇرلانقىزى', preview: 'اينۇر نۇرلانقىزى', resolve: d => d.kzBrideFullName ?? '' },
  { key: 'kzFatherName', label: '哈语父亲名', icon: '👴', group: 'kz', placeholder: 'احمەت', preview: 'احمەت', resolve: d => d.kzFatherName ?? '' },
  { key: 'kzMotherName', label: '哈语母亲名', icon: '👵', group: 'kz', placeholder: 'گۇلزار', preview: 'گۇلزار', resolve: d => d.kzMotherName ?? '' },
  { key: 'kzWitnessName', label: '哈语证婚人', icon: '🎎', group: 'kz', placeholder: 'قاسىم', preview: 'قاسىم', resolve: d => d.kzWitnessName ?? '' },
  { key: 'kzGroomsmanName', label: '哈语伴郎', icon: '🤵', group: 'kz', placeholder: 'داۋلەت', preview: 'داۋلەت', resolve: d => d.kzGroomsmanName ?? '' },
  { key: 'kzBridesmaidName', label: '哈语伴娘', icon: '👰', group: 'kz', placeholder: 'مەدينا', preview: 'مەدينا', resolve: d => d.kzBridesmaidName ?? '' },
  { key: 'kzChildName', label: '哈语小孩名', icon: '👶', group: 'kz', placeholder: 'ازاماتتىڭ', preview: 'ازاماتتىڭ', resolve: d => d.kzChildName ?? '' },
  { key: 'kzInviter', label: '哈语邀请者', icon: '👤', group: 'kz', placeholder: 'شاكىرت', preview: 'شاكىرت', resolve: d => d.kzInviter ?? '' },
  { key: 'kzInvitee', label: '哈语受邀者', icon: '👥', group: 'kz', placeholder: 'قوناق', preview: 'قوناق', resolve: d => d.kzInvitee ?? '' },
  { key: 'kzInviterMale', label: '男邀请者', icon: '🤵', group: 'kz', placeholder: 'باقىتپەك قۋانبەك ۇلى', preview: 'باقىتپەك قۋانبەك ۇلى', resolve: d => d.kzInviterMale ?? '' },
  { key: 'kzInviterFemale', label: '女邀请者', icon: '👰', group: 'kz', placeholder: 'جادىرا شاتتق قىزى', preview: 'جادىرا شاتتق قىزى', resolve: d => d.kzInviterFemale ?? '' },
  { key: 'kzInviterFather', label: '邀请者父亲', icon: '👴', group: 'kz', placeholder: 'مۇرات', preview: 'مۇرات', resolve: d => d.kzInviterFather ?? '' },
  { key: 'kzInviterMother', label: '邀请者母亲', icon: '👵', group: 'kz', placeholder: 'گۇلنارا', preview: 'گۇلنارا', resolve: d => d.kzInviterMother ?? '' },
  { key: 'kzClockTime', label: '哈语时间', icon: '⏰', group: 'kz', placeholder: '18:00', preview: '18:00', resolve: d => d.kzClockTime ?? '' },
  { key: 'kzLocation', label: '哈语地点', icon: '📍', group: 'kz', placeholder: 'توي سارايى', preview: 'توي سارايى', resolve: d => d.kzLocation ?? '' },
  { key: 'kzPhone', label: '哈语电话', icon: '📞', group: 'kz', placeholder: '87001234567', preview: '87001234567', resolve: d => d.kzPhone ?? '' },
  { key: 'kzAddress', label: '哈语地址', icon: '🏠', group: 'kz', placeholder: 'قىزىلوردا قالاسى, توي سارايى', preview: 'قىزىلوردا قالاسى, توي سارايى', resolve: d => d.kzAddress ?? '' },
]
