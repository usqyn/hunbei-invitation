// 首页分类 - 与模板系统中的分类ID保持一致
// categoryId 对应 templates.ts 中的 category 字段
export interface HomeCategory {
  id: number           // 首页分类ID
  name: string         // 显示名称
  image: string        // 分类图标图片路径
  bgColor: string      // 背景色
  categoryId: string   // 对应模板系统的分类ID(wedding/birthday/baby/graduation/festival/business)
}

export interface PosterCategory {
  id: string
  name: string
  icon: string
}

export const HOME_CATEGORIES: HomeCategory[] = [
  { id: 1, name: '新婚', image: '/static/images/categories/wedding.jpg', bgColor: '#ffe4e8', categoryId: 'wedding' },
  { id: 2, name: '求婚', image: '/static/images/categories/proposal.jpg', bgColor: '#f0e6ff', categoryId: 'proposal' },
  { id: 3, name: '商量茶', image: '/static/images/categories/consultation-tea.jpg', bgColor: '#e6f7ff', categoryId: 'consultation-tea' },
  { id: 4, name: '割礼', image: '/static/images/categories/ceremony.jpg', bgColor: '#e8f5e9', categoryId: 'festival' },
  { id: 5, name: '耳环礼', image: '/static/images/categories/earring.jpg', bgColor: '#fce4ec', categoryId: 'business' },
  { id: 6, name: '周岁宴', image: '/static/images/categories/baby.jpg', bgColor: '#ffeaa7', categoryId: 'baby' },
  { id: 7, name: '升学宴', image: '/static/images/categories/graduation.jpg', bgColor: '#fff3e0', categoryId: 'graduation' },
  { id: 8, name: '节日请柬', image: '/static/images/categories/festival-invitation.jpg', bgColor: '#fef3e2', categoryId: 'festival-invitation' },
  { id: 9, name: '乔迁', image: '/static/images/categories/housewarming.jpg', bgColor: '#fff7e6', categoryId: 'housewarming' },
]

// 海报分类 - 与后端 poster_templates.category_id 一致
export const POSTER_CATEGORIES: PosterCategory[] = [
  { id: 'all', name: '全部', icon: '/static/images/icons/document.svg' },
  { id: 'wedding', name: '婚礼', icon: '/static/images/categories/wedding.jpg' },
  { id: 'engagement', name: '订婚', icon: '/static/images/categories/proposal.jpg' },
  { id: 'baby', name: '宝宝', icon: '/static/images/categories/baby.jpg' },
  { id: 'birthday', name: '生日', icon: '/static/images/categories/ceremony.jpg' },
  { id: 'house', name: '乔迁', icon: '/static/images/categories/housewarming.jpg' },
  { id: 'parents', name: '父母', icon: '/static/images/categories/graduation.jpg' },
  { id: 'study', name: '升学', icon: '/static/images/categories/graduation.jpg' },
  { id: 'poster', name: '活动海报', icon: '/static/images/categories/business.jpg' },
  { id: 'creative', name: '创意', icon: '/static/images/categories/festival-invitation.jpg' },
]

export const HOME_TABS = ['网红爆款', '新婚', '节日邀请', '限时免费']

// 精选卡片 - 对应模板系统中的实际模板
export const HOME_FEATURED_CARDS = [
  { id: 1, title: '好久不见', type: 'wedding-1', date: '2050.05.20', image: '/static/images/templates/wedding-1.svg' },
  { id: 2, title: '适我愿兮', type: 'wedding-2', date: '2050.05.18', image: '/static/images/templates/wedding-2.svg' },
  { id: 3, title: '佳偶天成', type: 'wedding-3', date: '2050.05.15', image: '/static/images/templates/wedding-3.svg' },
  { id: 4, title: '最美的遇见', type: 'proposal-1', date: '2050.06.15', image: '/static/images/templates/template-1.svg' },
  { id: 5, title: '节日快乐', type: 'festival-invitation-1', date: '2050.06.15', image: '/static/images/templates/invitation-1.svg' },
  { id: 6, title: '甜蜜派对', type: 'festival-invitation-2', date: '2050.06.10', image: '/static/images/templates/invitation-2.svg' },
  { id: 7, title: '百日宴', type: 'baby-2', date: '2050.08.20', image: '/static/images/templates/template-5.svg' },
  { id: 8, title: '乔迁之喜', type: 'housewarming-1', date: '2050.09.10', image: '/static/images/templates/template-3.svg' },
]
