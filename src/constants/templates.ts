import type { TemplateCategory, TemplateItem } from '@/types'
import { HOME_CATEGORIES } from './categories'
import {
  DEFAULT_TEMPLATE_ID,
  TEMPLATE_LIST,
} from './templates-data'

export {
  DEFAULT_TEMPLATE_ID,
  TEMPLATE_LIST,
} from './templates-data'

// 分类列表从 categories.ts 的 HOME_CATEGORIES 生成，保持分类数据的唯一数据源
export const CATEGORY_LIST: TemplateCategory[] = HOME_CATEGORIES.map(cat => ({
  id: cat.categoryId,
  name: cat.name,
  icon: cat.image,
  templates: TEMPLATE_LIST.filter(t => t.category === cat.categoryId),
}))

export function getTemplateById(id: string): TemplateItem | undefined {
  return TEMPLATE_LIST.find(t => t.id === id)
}

export function getTemplatesByCategory(category: string): TemplateItem[] {
  return TEMPLATE_LIST.filter(t => t.category === category)
}

export function getTotalTemplateCount(): number {
  return TEMPLATE_LIST.length
}
