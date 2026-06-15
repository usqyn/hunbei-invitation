import type { Category } from '@/types'

export const HOME_CATEGORIES: Category[] = [
  { id: 1, name: '婚贴精选', icon: '💒', bgColor: '#ffe4e8' },
  { id: 2, name: '中式请帖', icon: '🏮', bgColor: '#ffebee' },
  { id: 3, name: '西式请帖', icon: '🤵', bgColor: '#e8f5e9' },
  { id: 4, name: '旅拍请帖', icon: '✈️', bgColor: '#e3f2fd' },
  { id: 5, name: '朋友圈邀请', icon: '📱', bgColor: '#fff3e6' },
  { id: 6, name: '全部分类', icon: '📋', bgColor: '#e0f2f1' },
]

export const HOME_TABS = ['网红爆款', '婚礼请帖', '朋友圈邀请', '限时免费']

export const HOME_FEATURED_CARDS = [
  { id: 1, title: '一生一世', type: 'invitation', date: '2050.05.20', image: '/static/images/templates/wedding-1.svg' },
  { id: 2, title: '中式囍宴', type: 'invitation', date: '2050.05.18', image: '/static/images/templates/wedding-2.svg' },
  { id: 3, title: '浪漫粉色', type: 'invitation', date: '2050.05.15', image: '/static/images/templates/wedding-3.svg' },
  { id: 4, title: '暗夜倾心', type: 'invitation', date: '2050.05.10', image: '/static/images/templates/wedding-4.svg' },
  { id: 5, title: '我们的故事', type: 'moments', date: '2050.06.01', image: '/static/images/templates/wedding-1.svg' },
  { id: 6, title: '请回答2050', type: 'moments', date: '2050.06.05', image: '/static/images/templates/wedding-2.svg' },
]
