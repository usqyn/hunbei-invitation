// API 基地址
export const API_BASE = 'http://localhost:3001'

// ============ 首页配置 ============
export const HOME_CONFIG = {
  searchPlaceholder: '搜索模板名称/分类',
  defaultTab: '网红爆款',
  sections: {
    featured: { title: '精选模板' },
    allCategories: { title: '全部分类' },
  },
  moreText: '查看全部 ›',
  featureCards: [
    {
      badge: '电子请帖',
      title: '婚礼请柬 免费制作',
      desc: '精美模板一键生成',
      categoryId: 'wedding',
      image: '/static/images/categories/wedding.svg',
    },
    {
      badge: '生日邀请',
      title: '派对邀请函制作',
      desc: '分享美好时光',
      categoryId: 'birthday',
      image: '/static/images/categories/birthday.svg',
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
