/**
 * 占位符文本渲染（注册表驱动）：
 * 遍历 PLACEHOLDER_DEFS 将 {token} 替换为对应字段值；
 * 未填值的 token 保留字面量（便于识别与后续回填）。
 * 新增占位符只需在 constants/placeholder-defs.ts 注册表追加一行，本文件零改动。
 */

import type { TemplateData } from '../types'
import { PLACEHOLDER_DEFS } from '../constants/placeholder-defs'

/** 替换文本中的所有占位符 token（注册表驱动，未填值的 token 原样保留） */
export function resolveTextPlaceholders(text: string, data: Partial<TemplateData>): string {
  if (!text) return text
  let result = text
  for (const def of PLACEHOLDER_DEFS) {
    const token = `{${def.key}}`
    if (!result.includes(token)) continue
    const value = def.resolve(data)
    if (!value) continue
    result = result.split(token).join(value)
  }
  return result
}

/** 检测文本是否包含任何占位符 token */
export function hasTextPlaceholders(text: string): boolean {
  return PLACEHOLDER_DEFS.some(def => text.includes(`{${def.key}}`))
}

/** 扫描文本，返回其中出现的所有占位符字段 key（供「编辑信息」表单字段收集） */
export function extractTokenKeys(text: string): string[] {
  return PLACEHOLDER_DEFS.filter(def => text.includes(`{${def.key}}`)).map(def => def.key)
}
