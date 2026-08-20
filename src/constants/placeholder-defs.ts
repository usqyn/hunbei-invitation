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
  // ===== 哈萨克语（阿拉伯文）=====
  // kzDate：优先使用标记/识别回填的原文格式（如 "2026-جىلى 10-ايدىڭ 01-كۇنى"），
  // 无回填值时按中文 date 字段生成标准哈语表达式
  { key: 'kzDate', label: '哈语日期', icon: '📆', group: 'kz', placeholder: '2026 جىلعى 1 ايدىڭ 22 كۇنى', preview: '2026 جىلعى 1 ايدىڭ 22 كۇنى', resolve: d => d.kzDate || (d.date ? toKazakhDate(d.date).fullDate : '') },
  { key: 'kzWeekday', label: '哈语星期', icon: '📆', group: 'kz', placeholder: 'سەيسەنبى', preview: 'سەيسەنبى', resolve: d => d.kzWeekday ?? '' },
  { key: 'kzWeekdayParen', label: '哈语星期(括号)', icon: '📆', group: 'kz', placeholder: '(سەيسەنبى)', preview: '(سەيسەنبى)', resolve: d => d.kzWeekdayParen ?? '' },
  { key: 'kzTime', label: '哈语时间段', icon: '⏰', group: 'kz', placeholder: 'تۇستەن كەيىن', preview: 'تۇستەن كەيىن', resolve: d => d.kzTime ?? '' },
  { key: 'kzGroomName', label: '哈语新郎名', icon: '👨', group: 'kz', placeholder: 'نۇرلان', preview: 'نۇرلان', resolve: d => d.kzGroomName ?? '' },
  { key: 'kzBrideName', label: '哈语新娘名', icon: '👩', group: 'kz', placeholder: 'اينۇر', preview: 'اينۇر', resolve: d => d.kzBrideName ?? '' },
  { key: 'kzAddress', label: '哈语地址', icon: '🏠', group: 'kz', placeholder: 'قىزىلوردا قالاسى, توي سارايى', preview: 'قىزىلوردا قالاسى, توي سارايى', resolve: d => d.kzAddress ?? '' },
]
