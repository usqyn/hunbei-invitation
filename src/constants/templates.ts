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
    name: '新婚',
    icon: '/static/images/categories/wedding.jpg',
    templates: TEMPLATE_LIST.filter(t => t.category === 'wedding'),
  },
  {
    id: 'proposal',
    name: '求婚',
    icon: '/static/images/categories/proposal.jpg',
    templates: TEMPLATE_LIST.filter(t => t.category === 'proposal'),
  },
  {
    id: 'consultation-tea',
    name: '商量茶',
    icon: '/static/images/categories/consultation-tea.jpg',
    templates: TEMPLATE_LIST.filter(t => t.category === 'consultation-tea'),
  },
  {
    id: 'festival',
    name: '割礼',
    icon: '/static/images/categories/ceremony.jpg',
    templates: TEMPLATE_LIST.filter(t => t.category === 'festival'),
  },
  {
    id: 'business',
    name: '耳环礼',
    icon: '/static/images/categories/earring.jpg',
    templates: TEMPLATE_LIST.filter(t => t.category === 'business'),
  },
  {
    id: 'baby',
    name: '周岁宴',
    icon: '/static/images/categories/baby.jpg',
    templates: TEMPLATE_LIST.filter(t => t.category === 'baby'),
  },
  {
    id: 'graduation',
    name: '升学宴',
    icon: '/static/images/categories/graduation.jpg',
    templates: TEMPLATE_LIST.filter(t => t.category === 'graduation'),
  },
  {
    id: 'festival-invitation',
    name: '节日请柬',
    icon: '/static/images/categories/festival-invitation.jpg',
    templates: TEMPLATE_LIST.filter(t => t.category === 'festival-invitation'),
  },
  {
    id: 'housewarming',
    name: '乔迁',
    icon: '/static/images/categories/housewarming.jpg',
    templates: TEMPLATE_LIST.filter(t => t.category === 'housewarming'),
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
