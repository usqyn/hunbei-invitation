// 首页分类 - 与模板系统中的分类ID保持一致
// categoryId 对应 templates.ts 中的 category 字段
export interface HomeCategory {
  id: number           // 首页分类ID
  name: string         // 显示名称
  image: string        // 分类图标图片路径
  bgColor: string      // 背景色
  categoryId: string   // 对应模板系统的分类ID(wedding/birthday/baby/graduation/festival/business)
}

export const HOME_CATEGORIES: HomeCategory[] = [
  { id: 1, name: '婚礼请柬', image: '/static/images/categories/wedding.svg', bgColor: '#ffe4e8', categoryId: 'wedding' },
  { id: 2, name: '生日派对', image: '/static/images/categories/birthday.svg', bgColor: '#fff3e6', categoryId: 'birthday' },
  { id: 3, name: '周岁宴', image: '/static/images/categories/baby.svg', bgColor: '#ffeaa7', categoryId: 'baby' },
  { id: 4, name: '升学宴', image: '/static/images/categories/graduation.svg', bgColor: '#fff3e0', categoryId: 'graduation' },
  { id: 5, name: '割礼', image: '/static/images/categories/ceremony.svg', bgColor: '#e8f5e9', categoryId: 'festival' },
  { id: 6, name: '耳环礼', image: '/static/images/categories/earring.svg', bgColor: '#fce4ec', categoryId: 'business' },
]

export const HOME_TABS = ['网红爆款', '婚礼请帖', '生日邀请', '限时免费']

// 精选卡片 - 对应模板系统中的实际模板
export const HOME_FEATURED_CARDS = [
  { id: 1, title: '好久不见', type: 'wedding-1', date: '2050.05.20', image: '/static/images/templates/wedding-1.svg' },
  { id: 2, title: '适我愿兮', type: 'wedding-2', date: '2050.05.18', image: '/static/images/templates/wedding-2.svg' },
  { id: 3, title: '佳偶天成', type: 'wedding-3', date: '2050.05.15', image: '/static/images/templates/wedding-3.svg' },
  { id: 4, title: '生日快乐', type: 'birthday-1', date: '2050.06.15', image: '/static/images/templates/invitation-1.svg' },
  { id: 5, title: '甜蜜派对', type: 'birthday-2', date: '2050.06.10', image: '/static/images/templates/invitation-2.svg' },
  { id: 6, title: '百日宴', type: 'baby-2', date: '2050.08.20', image: '/static/images/templates/template-5.svg' },
]
