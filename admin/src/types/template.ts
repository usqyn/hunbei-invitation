// 模板数据类型
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

// 元素样式
export interface ElementStyle {
  font: string
  color: string
  fontSize: number
  spacing: number
  lineHeight: number
  fontWeight?: 'normal' | 'bold'
  textAlign?: 'left' | 'center' | 'right'
  direction?: 'ltr' | 'rtl' | 'auto'
  borderRadius?: number
  borderColor?: string
  borderWidth?: number
}

// 可编辑元素
export interface EditableElement {
  id: string
  type: 'image' | 'text'
  text: string
  dataKey?: keyof TemplateData
  label: string
  style?: ElementStyle
  placeholder?: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  rotation: number
  opacity: number
  editable: boolean
}

// 背景配置
export interface TemplateBackground {
  type: 'solid' | 'linear-gradient' | 'radial-gradient' | 'image'
  color1: string
  color2?: string
  angle?: number
  imageUrl?: string
  imageScale?: 'contain' | 'cover' | 'fill' | 'none'
  imageOpacity?: number
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

// 模板类型
export type TemplateType = 'canvas' | 'page' | 'flip'

// 完整模板
export interface TemplateItem {
  id: string
  name: string
  subtitle: string
  category: string
  cover: string
  primaryColor: string
  likes: number
  pageCount: number
  data: TemplateData
  elements: EditableElement[]
  canvasSize?: { width: number; height: number }
  orientation?: 'portrait' | 'landscape'
  background?: {
    type: string
    color1: string
    color2?: string
    angle?: number
    imageUrl?: string
  }
  tags?: string[]
  createdAt?: string
  updatedAt?: string
  templateType?: TemplateType
  pages?: FlipPage[]
  vipLevel?: 'free' | 'limited' | 'personal' | 'pro'
}

// 分类
export interface Category {
  id: string
  name: string
  icon?: string
  count?: number
}

// API 响应
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  total?: number
}

// 当前编辑状态
export interface EditorState {
  template: TemplateItem | null
  selectedElementId: string | null
  isDirty: boolean
  isSaving: boolean
}

// 分类（id 与服务端、小程序保持一致）
export const CATEGORIES: Category[] = [
  { id: 'wedding', name: '婚礼请柬' },
  { id: 'proposal', name: '订婚请柬' },
  { id: 'baby', name: '宝宝请柬' },
  { id: 'graduation', name: '毕业请柬' },
  { id: 'festival', name: '节日请柬' },
  { id: 'business', name: '商务请柬' },
  { id: 'housewarming', name: '乔迁请柬' },
  { id: 'consultation', name: '满月酒' },
]
