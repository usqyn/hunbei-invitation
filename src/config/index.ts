// API 基地址（生产环境通过 .env.production 覆盖）
// 注意：生产环境必须使用 HTTPS 保证传输安全
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

// ============ 应用版本 ============
export const APP_VERSION = '1.2.3'

// ============ 首页配置 ============
export const HOME_CONFIG = {
  searchPlaceholder: '搜索模板名称/分类',
  defaultTab: '网红爆款',
  sections: {
    featured: { title: '精选模板' },
    allCategories: { title: '全部分类' },
  },
  moreText: '查看全部 ›',
  banners: [
    {
      image: '/static/images/banners/banner-1.png',
      linkType: 'category',
      linkValue: 'wedding',
    },
    {
      image: '/static/images/banners/banner-2.png',
      linkType: 'category',
      linkValue: 'festival-invitation',
    },
    {
      image: '/static/images/banners/banner-3.png',
      linkType: 'category',
      linkValue: 'festival',
    },
  ],
  featureCards: [
    {
      badge: '电子请帖',
      title: '婚礼请柬 免费制作',
      desc: '精美模板一键生成',
      categoryId: 'wedding',
      image: '/static/images/categories/wedding.jpg',
    },
    {
      badge: '节日邀请',
      title: '节日请柬制作',
      desc: '分享美好时光',
      categoryId: 'festival-invitation',
      image: '/static/images/categories/festival-invitation.jpg',
    },
  ],
}

// ============ 作品管理页配置 ============
export const WORKS_CONFIG = {
  notLoggedIn: {
    icon: '/static/images/icons/clipboard.svg',
    text: '登录后才可以看到作品记录哦',
    btnText: '立即登录',
  },
  emptyStates: {
    all: { icon: '/static/images/icons/mailbox.svg', text: '暂无作品', btnText: '去制作' },
    draft: { icon: '/static/images/icons/note.svg', text: '暂无草稿' },
    favorite: { icon: '/static/images/icons/heart.svg', text: '暂无收藏' },
  },
}

// ============ 模板页配置 ============
export const TEMPLATE_PAGE_CONFIG = {
  headerTitle: '选择模板',
  loadingText: '加载中...',
  errorText: '加载失败，点击重试',
  errorIcon: '/static/images/icons/warning.svg',
  emptyIcon: '/static/images/icons/document.svg',
  emptyText: '该分类暂无模板',
  selectBtnText: '立即制作',
  bottomHint: '— 更多模板持续更新中 —',
}
