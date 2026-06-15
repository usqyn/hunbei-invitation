import type { TemplateData, BasicInfo, TemplateSettings, EditableElement, Material } from '@/types'

export const DEFAULT_TEMPLATE_DATA: TemplateData = {
  coverImage: '/static/images/templates/wedding-1.svg',
  coverTitle: '好久不见',
  coverSubtitle: 'Welcome to our wedding',
  photo1: '/static/images/templates/wedding-2.svg',
  photo2: '/static/images/templates/wedding-3.svg',
  photo3: '/static/images/templates/wedding-4.svg',
  photo4: '/static/images/templates/wedding-1.svg',
  photoTitle: '合卺',
  photoSubtitle: 'He jin & Ju hua',
  footerText: '满小满',
  footerSubText: 'GROOM',
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
  { type: 'text', text: '好久不见', dataKey: 'coverTitle' },
  { type: 'text', text: 'Welcome to our wedding', dataKey: 'coverSubtitle' },
  { type: 'text', text: '合卺', dataKey: 'photoTitle' },
  { type: 'text', text: 'He jin & Ju hua', dataKey: 'photoSubtitle' },
  { type: 'text', text: '满小满', dataKey: 'footerText' },
  { type: 'text', text: 'GROOM', dataKey: 'footerSubText' },
]

export const FONT_LIST = [
  '思源宋体极细', '思源宋体', '思源黑体', '华文楷体', '华文行楷', '华文隶书',
]

export const COLOR_LIST = [
  '#333333', '#666666', '#999999', '#e84a6e', '#ff6b8a',
  '#c0392b', '#e67e22', '#f1c40f', '#2ecc71', '#3498db',
  '#9b59b6', '#1abc9c', '#ffffff', '#f5f5f5',
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
