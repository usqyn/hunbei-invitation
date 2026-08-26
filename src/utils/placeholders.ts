import type { TemplateData } from '@/types'
import { toKazakhDate } from '@/utils/kz-date'

/**
 * 替换文本中的日期占位符 {year} {month} {day}
 * 以及哈语占位符 {kzDate} {kzWeekday} {kzWeekdayParen} {kzTime}
 * 例如: "في سنة {year} شهر {month} يوم {day}" → "في سنة 2025 شهر 6 يوم 15"
 * 例如: "{kzDate}" → "2026 جىلعى 1 ايدىڭ 22 كۇنى"
 * 例如: "{kzWeekdayParen}" → "(سەيسەنبى)"
 */
export function resolveDatePlaceholders(text: string, data: Partial<TemplateData>): string {
  if (!text) return text
  let result = text
    .replace(/\{year\}/g, data.year ?? '')
    .replace(/\{month\}/g, data.month ?? '')
    .replace(/\{day\}/g, data.day ?? '')

  // 哈语日期占位符 {kzDate}：需要中文 date 字段才能转换
  if (result.includes('{kzDate}') && data.date) {
    const { fullDate } = toKazakhDate(data.date)
    result = result.replace(/\{kzDate\}/g, fullDate)
  }
  // 哈语星期占位符 {kzWeekday}：优先用显式设置的值，未设置时从 date 自动推导
  if (result.includes('{kzWeekday}')) {
    if (data.kzWeekday) {
      result = result.replace(/\{kzWeekday\}/g, data.kzWeekday)
    } else if (data.date) {
      const { weekday } = toKazakhDate(data.date)
      if (weekday) result = result.replace(/\{kzWeekday\}/g, weekday)
    }
  }
  // 哈语星期占位符 {kzWeekdayParen}：带括号输出，如 (سەيسەنبى)
  if (result.includes('{kzWeekdayParen}')) {
    if (data.kzWeekdayParen) {
      result = result.replace(/\{kzWeekdayParen\}/g, data.kzWeekdayParen)
    } else if (data.date) {
      const { weekday } = toKazakhDate(data.date)
      if (weekday) result = result.replace(/\{kzWeekdayParen\}/g, `(${weekday})`)
    }
  }
  // 哈语时间段占位符 {kzTime}
  if (result.includes('{kzTime}') && data.kzTime) {
    result = result.replace(/\{kzTime\}/g, data.kzTime)
  }
  // 哈语新人姓名/地址占位符：纯文本替换，自动 RTL 渲染
  if (result.includes('{kzGroomName}') && data.kzGroomName) {
    result = result.replace(/\{kzGroomName\}/g, data.kzGroomName)
  }
  if (result.includes('{kzBrideName}') && data.kzBrideName) {
    result = result.replace(/\{kzBrideName\}/g, data.kzBrideName)
  }
  if (result.includes('{kzGroomFullName}') && data.kzGroomFullName) {
    result = result.replace(/\{kzGroomFullName\}/g, data.kzGroomFullName)
  }
  if (result.includes('{kzBrideFullName}') && data.kzBrideFullName) {
    result = result.replace(/\{kzBrideFullName\}/g, data.kzBrideFullName)
  }
  if (result.includes('{kzFatherName}') && data.kzFatherName) {
    result = result.replace(/\{kzFatherName\}/g, data.kzFatherName)
  }
  if (result.includes('{kzMotherName}') && data.kzMotherName) {
    result = result.replace(/\{kzMotherName\}/g, data.kzMotherName)
  }
  if (result.includes('{kzWitnessName}') && data.kzWitnessName) {
    result = result.replace(/\{kzWitnessName\}/g, data.kzWitnessName)
  }
  if (result.includes('{kzGroomsmanName}') && data.kzGroomsmanName) {
    result = result.replace(/\{kzGroomsmanName\}/g, data.kzGroomsmanName)
  }
  if (result.includes('{kzBridesmaidName}') && data.kzBridesmaidName) {
    result = result.replace(/\{kzBridesmaidName\}/g, data.kzBridesmaidName)
  }
  if (result.includes('{childName}') && data.childName) {
    result = result.replace(/\{childName\}/g, data.childName)
  }
  if (result.includes('{kzChildName}') && data.kzChildName) {
    result = result.replace(/\{kzChildName\}/g, data.kzChildName)
  }
  if (result.includes('{kzInviter}') && data.kzInviter) {
    result = result.replace(/\{kzInviter\}/g, data.kzInviter)
  }
  if (result.includes('{kzInvitee}') && data.kzInvitee) {
    result = result.replace(/\{kzInvitee\}/g, data.kzInvitee)
  }
  if (result.includes('{kzClockTime}') && data.kzClockTime) {
    result = result.replace(/\{kzClockTime\}/g, data.kzClockTime)
  }
  if (result.includes('{kzLocation}') && data.kzLocation) {
    result = result.replace(/\{kzLocation\}/g, data.kzLocation)
  }
  if (result.includes('{kzPhone}') && data.kzPhone) {
    result = result.replace(/\{kzPhone\}/g, data.kzPhone)
  }
  if (result.includes('{kzAddress}') && data.kzAddress) {
    result = result.replace(/\{kzAddress\}/g, data.kzAddress)
  }
  return result
}

/**
 * 检测文本是否包含日期占位符
 */
export function hasDatePlaceholders(text: string): boolean {
  return /\{year\}|\{month\}|\{day\}|\{kzDate\}|\{kzWeekday\}|\{kzWeekdayParen\}|\{kzTime\}|\{kzGroomName\}|\{kzBrideName\}|\{kzGroomFullName\}|\{kzBrideFullName\}|\{kzFatherName\}|\{kzMotherName\}|\{kzWitnessName\}|\{kzGroomsmanName\}|\{kzBridesmaidName\}|\{childName\}|\{kzChildName\}|\{kzInviter\}|\{kzInvitee\}|\{kzClockTime\}|\{kzLocation\}|\{kzPhone\}|\{kzAddress\}/.test(text)
}
