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
  textAlign?: 'left' | 'center' | 'right'
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
}

// 素材
export interface Material {
  url: string
  name: string
}

// ========== 新增：多模板系统类型 ==========

// 模板分类
export interface TemplateCategory {
  id: string              // 分类ID: wedding/festival/baby/graduation/festival-invitation/business
  name: string            // 分类名称: 婚礼/割礼/宝宝/升学宴/节日请柬/耳环礼
  icon: string            // emoji或图标
  templates: TemplateItem[]
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
  // 模板的数据内容配置
  data: TemplateData
  // 可编辑元素配置（按顺序对应预览中的元素）
  elements: EditableElement[]
  // 画布尺寸（admin 模板）
  canvasSize?: { width: number; height: number }
  // 横屏/竖屏
  orientation?: 'portrait' | 'landscape'
  // 主题色
  primaryColor: string
  // 首页标签（网红爆款/婚礼请帖等）
  tags?: string[]
}

// 当前选中的模板状态
export interface CurrentTemplate {
  templateId: string
  categoryId: string
}
