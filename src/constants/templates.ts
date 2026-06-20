import type { TemplateCategory, TemplateItem } from '@/types'
import {
  DEFAULT_ELEMENT_STYLE,
  DEFAULT_TEMPLATE_ID,
  TEMPLATE_LIST,
} from './templates-data'

export {
  DEFAULT_ELEMENT_STYLE,
  DEFAULT_TEMPLATE_ID,
  TEMPLATE_LIST,
} from './templates-data'

export const CATEGORY_LIST: TemplateCategory[] = [
  {
    id: 'wedding',
    name: '婚礼请柬',
    icon: '/static/images/categories/wedding.svg',
    templates: TEMPLATE_LIST.filter(t => t.category === 'wedding'),
  },
  {
    id: 'birthday',
    name: '生日派对',
    icon: '/static/images/categories/birthday.svg',
    templates: TEMPLATE_LIST.filter(t => t.category === 'birthday'),
  },
  {
    id: 'baby',
    name: '周岁宴',
    icon: '/static/images/categories/baby.svg',
    templates: TEMPLATE_LIST.filter(t => t.category === 'baby'),
  },
  {
    id: 'graduation',
    name: '升学宴',
    icon: '/static/images/icons/party.svg',
    templates: TEMPLATE_LIST.filter(t => t.category === 'graduation'),
  },
  {
    id: 'festival',
    name: '割礼',
    icon: '/static/images/categories/ceremony.svg',
    templates: TEMPLATE_LIST.filter(t => t.category === 'festival'),
  },
  {
    id: 'business',
    name: '耳环礼',
    icon: '/static/images/categories/earring.svg',
    templates: TEMPLATE_LIST.filter(t => t.category === 'business'),
  },
]

export function getTemplateById(id: string): TemplateItem | undefined {
  return TEMPLATE_LIST.find(t => t.id === id)
}

export function getTemplatesByCategory(category: string): TemplateItem[] {
  return TEMPLATE_LIST.filter(t => t.category === category)
}

export function getTotalTemplateCount(): number {
  return TEMPLATE_LIST.length
}
