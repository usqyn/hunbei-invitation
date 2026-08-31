import type { TemplateData, BasicInfo, TemplateSettings, EditableElement, Material, ElementStyle } from '@/types'

export const DEFAULT_CANVAS_WIDTH = 375
export const DEFAULT_CANVAS_HEIGHT = 667

export const DEFAULT_FONT_SIZE = 28
export const DEFAULT_FONT_SIZE_FALLBACK = 30
export const DEFAULT_LINE_HEIGHT = 1.6
export const DEFAULT_LETTER_SPACING = 2

export const RTL_CHAR_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

// 哈萨克/阿拉伯可渲染字体白名单：元素显式选择这些字体时，渲染链路不再强制替换为 KazakhSoftAsilya
export const RTL_CAPABLE_FONTS = [
  'KazakhSoftAsilya', 'KazakhSoftAsilyaQaniq', 'ALKATIPBasma',
  'KazakhSoftBaspa', 'KazakhSoftBaspaQaniq', 'KazakhSoftJurnal',
  'KazakhSoftJurnalQaniq', 'KazakhSoftKorkem', 'KazakhSoftKufy',
  'KazakhSoftNaqis', 'KazakhSoftNet', 'KazakhSoftOziek',
  'KazakhSoftQaniq', 'KazakhSoftRwqy', 'KazakhSoftRwqyJolaq',
  'KazakhSoftSulus', 'KazNet', 'UKKUniKuf',
]

/** 判断字体是否为白名单内的 RTL 可渲染字体（取字体栈第一个名字，忽略大小写/引号） */
export function isRtlCapableFont(font: string | undefined): boolean {
  if (!font) return false
  const primary = font.split(',')[0].trim().replace(/['"]/g, '').toLowerCase()
  return RTL_CAPABLE_FONTS.some((f) => f.toLowerCase() === primary)
}

export const FONT_FAMILY_BASE = "'KazakhSoftAsilya', 'Scheherazade New', 'Amiri', 'Noto Sans Arabic', 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', 'Arial', sans-serif"

export const DEFAULT_TEMPLATE_DATA: TemplateData = {
  coverImage: '/static/images/templates/wedding-1.png',
  coverTitle: '好久不见',
  coverSubtitle: 'Welcome to our wedding',
  photo1: '/static/images/templates/wedding-2.png',
  photo2: '/static/images/templates/wedding-3.png',
  photo3: '/static/images/templates/wedding-4.png',
  photo4: '/static/images/templates/wedding-1.png',
  photoTitle: '合卺',
  photoSubtitle: 'He jin & Ju hua',
  footerText: '满小满',
  footerSubText: 'GROOM',
  inviter: '',
  invitee: '',
  date: '',
  time: '',
  location: '',
  address: '',
  phone: '',
  year: '',
  month: '',
  day: '',
  personName: '',
  childName: '',
  kzDate: '',
  kzWeekday: '',
  kzWeekdayParen: '',
  kzTime: '',
  kzGroomName: '',
  kzBrideName: '',
  kzGroomFullName: '',
  kzBrideFullName: '',
  kzFatherName: '',
  kzMotherName: '',
  kzWitnessName: '',
  kzGroomsmanName: '',
  kzBridesmaidName: '',
  kzChildName: '',
  kzInviter: '',
  kzInvitee: '',
  kzClockTime: '',
  kzLocation: '',
  kzPhone: '',
  kzAddress: '',
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

export const DEFAULT_ELEMENT_STYLE: ElementStyle = {
  font: '思源宋体',
  color: '#666666',
  fontSize: 12,
  spacing: 2,
  lineHeight: 2,
}

export const DEFAULT_EDITABLE_ELEMENTS: EditableElement[] = [
  { type: 'image', text: '/static/images/templates/wedding-1.png', dataKey: 'coverImage', label: '封面图片' },
  { type: 'text', text: '2050.05.20', label: '婚礼日期', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 36, color: '#ffffff' } },
  { type: 'text', text: '我们的婚礼', dataKey: 'coverTitle', label: '主标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 56, color: '#ffffff' } },
  { type: 'text', text: 'Our Wedding', dataKey: 'coverSubtitle', label: '英文副标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 28, color: 'rgba(255,255,255,0.9)' } },
  { type: 'text', text: '囍', label: '囍字', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 48, color: '#ff3366' } },
  { type: 'text', text: 'وشق', label: '阿拉伯文字1', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 24, color: '#ffffff' } },
  { type: 'text', text: 'ارووجان', label: '阿拉伯文字2', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 24, color: '#ffffff' } },
  { type: 'image', text: '/static/images/templates/wedding-2.png', dataKey: 'photo1', label: '黑胶唱片图片' },
  { type: 'text', text: '婚礼邀请函', dataKey: 'photoTitle', label: '邀请函标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 40, color: '#333333' } },
  { type: 'text', text: 'Welcome to our wedding', dataKey: 'photoSubtitle', label: '英文标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 24, color: '#999999' } },
  { type: 'text', text: '我们曾各自奔赴人海，直到目光交汇的那一刻\n才懂归属感的意义\n诚邀生命中重要的你\n共同见证这场“双向奔赴”的圆满', dataKey: 'footerText', label: '正文内容', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 26, color: '#666666' } },
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
  { url: '/static/images/templates/wedding-1.png', name: '婚礼主题1' },
  { url: '/static/images/templates/wedding-2.png', name: '婚礼主题2' },
  { url: '/static/images/templates/wedding-3.png', name: '婚礼主题3' },
  { url: '/static/images/templates/wedding-4.png', name: '婚礼主题4' },
  { url: '/static/images/templates/wedding-1.png', name: '浪漫主题' },
  { url: '/static/images/templates/wedding-2.png', name: '喜庆主题' },
  { url: '/static/images/templates/wedding-3.png', name: '粉色主题' },
  { url: '/static/images/templates/wedding-4.png', name: '紫色主题' },
]
