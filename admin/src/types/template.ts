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
}

// 分类
export interface Category {
  id: string
  name: string
  icon: string
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

// 默认空模板
export const DEFAULT_TEMPLATE_DATA: TemplateData = {
  coverImage: '',
  coverTitle: '我们的婚礼',
  coverSubtitle: 'Our Wedding',
  photo1: '',
  photo2: '',
  photo3: '',
  photo4: '',
  photoTitle: '婚礼邀请函',
  photoSubtitle: 'Welcome to our wedding',
  footerText: '我们曾各自奔赴人海，直到目光交汇的那一刻\n才懂归属感的意义\n诚邀生命中重要的你\n共同见证这场"双向奔赴"的圆满',
  footerSubText: 'GROOM',
  inviter: '',
  invitee: '',
  date: '',
  time: '',
  location: '',
  address: '',
  phone: '',
}

export const DEFAULT_ELEMENT_STYLE: ElementStyle = {
  font: '思源宋体',
  color: '#333333',
  fontSize: 28,
  spacing: 2,
  lineHeight: 2,
}

export const FONT_LIST = ['思源宋体', '思源黑体', '华文楷体', '华文行楷', '华文隶书', 'Arial', 'Georgia']

export const COLOR_LIST = [
  '#333333', '#666666', '#999999', '#e84a6e', '#ff6b8a',
  '#c0392b', '#e67e22', '#f1c40f', '#2ecc71', '#3498db',
  '#9b59b6', '#1abc9c', '#ffffff',
]

export const CATEGORIES = [
  { id: 'wedding', name: '新婚', icon: '💒' },
  { id: 'proposal', name: '求婚', icon: '💍' },
  { id: 'consultation-tea', name: '商量茶', icon: '🍵' },
  { id: 'festival', name: '割礼', icon: '🎁' },
  { id: 'business', name: '耳环礼', icon: '💎' },
  { id: 'baby', name: '周岁宴', icon: '🎉' },
  { id: 'graduation', name: '升学宴', icon: '🎓' },
  { id: 'festival-invitation', name: '节日请柬', icon: '🎊' },
  { id: 'housewarming', name: '乔迁', icon: '🏠' },
]
