// 单个模板的基础信息
export interface Template {
  id: number
  title: string
  date: string
  image: string
}

// 模板中的图片数据（可被用户替换）
export interface TemplateData {
  coverImage: string
  coverTitle: string
  coverSubtitle: string
  photo1: string
  photo2: string
  photo3: string
  photo4: string
  photoTitle: string
  photoSubtitle: string
  footerText: string
  footerSubText: string
  // 智能字段（快捷编辑用）
  inviter?: string
  invitee?: string
  date?: string
  time?: string
  location?: string
  address?: string
  phone?: string
  // 日期占位符字段
  year?: string
  month?: string
  day?: string
}

// 用户填写的基本信息（新人信息/节日信息等）
export interface BasicInfo {
  groomName: string
  brideName: string
  weddingDate: string
  location: string
  detailAddress: string
}

// 模板开关设置
export interface TemplateSettings {
  danmaku: boolean
  giftAlbum: boolean
  giftBuy: boolean
  moneyGift: boolean
  like: boolean
  album: boolean
  [key: string]: boolean
}

// 单个可编辑元素的样式
export interface ElementStyle {
  font: string
  color: string
  fontSize: number
  spacing: number
  lineHeight: number
  fontWeight?: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
  textAlign?: 'left' | 'center' | 'right'
  direction?: 'ltr' | 'rtl' | 'auto'
  strokeColor?: string
  strokeWidth?: number
  shadowColor?: string
  shadowOffsetX?: number
  shadowOffsetY?: number
  shadowBlur?: number
  textDecoration?: 'none' | 'underline' | 'line-through'
}

// 单个可编辑元素（图片/文字/基本信息）
export interface EditableElement {
  type: 'image' | 'text' | 'basic'
  text: string
  dataKey?: keyof TemplateData
  label?: string
  style?: ElementStyle
  // 画布定位（admin 模板）
  x?: number
  y?: number
  width?: number
  height?: number
  zIndex?: number
  rotation?: number
  opacity?: number
  // admin 端控制是否允许用户编辑
  editable?: boolean
  // 是否为付费/VIP 专属素材
  isPremium?: boolean
}

// 素材
export interface Material {
  url: string
  name: string
}

// ========== 新增：多模板系统类型 ==========

// 模板背景配置
export interface TemplateBackground {
  type: 'solid' | 'linear-gradient' | 'radial-gradient' | 'image'
  color1: string
  color2?: string
  angle?: number
  image?: string
  imageUrl?: string
}

// 模板分类
export interface TemplateCategory {
  id: string              // 分类ID: wedding/festival/baby/graduation/festival-invitation/business
  name: string            // 分类名称: 婚礼/割礼/宝宝/升学宴/节日请柬/耳环礼
  icon: string            // emoji或图标
  templates: TemplateItem[]
}

export type TemplateType = 'canvas' | 'page' | 'flip'

export type PageSectionType = 'title' | 'date' | 'image' | 'text' | 'location' | 'rsvp' | 'map' | 'divider' | 'music' | 'countdown'

export interface PageSection {
  id: string
  type: PageSectionType
  label?: string
  placeholder?: string
  text?: string
  image?: string
  dataKey?: keyof TemplateData
  style?: ElementStyle
  editable?: boolean
}

// 翻页模式 - 页面类型
export type FlipPageType = 'cover' | 'photo' | 'invitation' | 'info' | 'countdown' | 'map' | 'rsvp' | 'blessing' | 'ending' | 'custom'

// 翻页模式 - 单页定义
export interface FlipPage {
  id: string
  name: string
  pageType: FlipPageType
  background: TemplateBackground
  elements: EditableElement[]
}

// 单个模板的完整配置
export interface TemplateItem {
  id: string              // 模板唯一ID: wedding-1, birthday-1
  name: string            // 模板名称: "好久不见"
  subtitle: string        // 副标题/描述
  category: string        // 分类ID
  cover: string           // 封面图片路径
  likes: number           // 喜欢数
  pageCount: number       // 页数
  // 模板类型：canvas（画布模式，绝对定位）/ page（页面模式，垂直滚动）
  templateType?: TemplateType
  // 模板的数据内容配置
  data: TemplateData
  // 可编辑元素配置（canvas 模式，绝对定位）
  elements?: EditableElement[]
  // 页面区块配置（page 模式，垂直排列）
  sections?: PageSection[]
  // 翻页模式 - 页面列表
  pages?: FlipPage[]
  // 画布尺寸（canvas 模式）
  canvasSize?: { width: number; height: number }
  // 横屏/竖屏
  orientation?: 'portrait' | 'landscape'
  // 背景配置
  background?: TemplateBackground
  // 主题色
  primaryColor: string
  // 首页标签（网红爆款/婚礼请帖等）
  tags?: string[]
  // 渲染图（admin 发布时生成的高清截图）
  renderedImage?: string
  // 付费相关字段
  is_paid?: boolean
  price?: number
  vip_free?: boolean
}
