import type { TemplateData, BasicInfo, TemplateSettings, EditableElement, Material } from '@/types'

export const DEFAULT_TEMPLATE_DATA: TemplateData = {
  coverImage: '/static/images/templates/wedding-1.svg',
  coverTitle: '我们结婚啦',
  coverSubtitle: 'Welcome to our wedding',
  photo1: '/static/images/templates/wedding-2.svg',
  photo2: '/static/images/templates/wedding-3.svg',
  photo3: '/static/images/templates/wedding-4.svg',
  photo4: '/static/images/templates/wedding-1.svg',
  photoTitle: '欢迎参加',
  photoSubtitle: '我们的婚礼',
}

export const DEFAULT_BASIC_INFO: BasicInfo = {
  groomName: '',
  brideName: '',
  weddingDate: '',
  location: '',
  detailAddress: '',
}

export const DEFAULT_SETTINGS: TemplateSettings = {
  danmaku: true,
  giftAlbum: true,
  giftBuy: true,
  moneyGift: true,
  like: true,
  album: true,
}

export const PANEL_TABS = [
  { key: 'edit', name: '自由编辑', icon: '🧩' },
  { key: 'material', name: '素材库', icon: '🖼' },
  { key: 'text', name: '文字', icon: '📝' },
  { key: 'settings', name: '设置', icon: '⚙️' },
]

export const DEFAULT_EDITABLE_ELEMENTS: EditableElement[] = [
  { type: 'image', text: '/static/images/templates/wedding-1.svg', dataKey: 'coverImage' },
  { type: 'image', text: '/static/images/templates/wedding-2.svg', dataKey: 'photo1' },
  { type: 'image', text: '/static/images/templates/wedding-3.svg', dataKey: 'photo2' },
  { type: 'image', text: '/static/images/templates/wedding-4.svg', dataKey: 'photo3' },
  { type: 'image', text: '/static/images/templates/wedding-1.svg', dataKey: 'photo4' },
  { type: 'basic', text: '完善基本信息' },
  { type: 'text', text: '我们结婚啦', dataKey: 'coverTitle' },
  { type: 'text', text: 'Welcome to our wedding', dataKey: 'coverSubtitle' },
  { type: 'text', text: '欢迎参加', dataKey: 'photoTitle' },
  { type: 'text', text: '我们的婚礼', dataKey: 'photoSubtitle' },
]

export const MATERIAL_LIST: Material[] = [
  { url: '/static/images/templates/wedding-1.svg', name: '婚礼主题1' },
  { url: '/static/images/templates/wedding-2.svg', name: '婚礼主题2' },
  { url: '/static/images/templates/wedding-3.svg', name: '婚礼主题3' },
  { url: '/static/images/templates/wedding-4.svg', name: '婚礼主题4' },
  { url: '/static/images/templates/wedding-1.svg', name: '浪漫主题' },
  { url: '/static/images/templates/wedding-2.svg', name: '喜庆主题' },
  { url: '/static/images/templates/wedding-3.svg', name: '粉色主题' },
  { url: '/static/images/templates/wedding-4.svg', name: '紫色主题' },
]
