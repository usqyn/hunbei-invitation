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
}

// 元素样式
export interface ElementStyle {
  font: string
  color: string
  fontSize: number
  spacing: number
  lineHeight: number
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
  { id: 'wedding', name: '婚礼请柬', icon: '💒' },
  { id: 'birthday', name: '生日派对', icon: '🎂' },
  { id: 'baby', name: '宝宝满月', icon: '👶' },
  { id: 'graduation', name: '毕业典礼', icon: '🎓' },
  { id: 'festival', name: '节日祝福', icon: '🎊' },
  { id: 'business', name: '商务会议', icon: '🏢' },
]
