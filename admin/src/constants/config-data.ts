import type { TextElement } from '../types/canvas'

/** 模板数据字段（用于 dataKey 绑定下拉） */
export const TEMPLATE_DATA_KEYS = [
  'coverImage', 'coverTitle', 'coverSubtitle',
  'photo1', 'photo2', 'photo3', 'photo4',
  'photoTitle', 'photoSubtitle',
  'footerText', 'footerSubText',
  'inviter', 'invitee', 'date', 'time',
  'location', 'address', 'phone',
  'year', 'month', 'day',
  // 哈萨克语阿拉伯文专用字段
  // kzDate：选日期后自动填入哈语表达式 "2026 جىل 1 اي 22 كۇن"
  // kzWeekday：星期滚轮，选后填入哈语星期名
  // kzTime：时间段滚轮，选后填入哈语时间段
  'kzDate', 'kzWeekday', 'kzTime',
]

/** 快捷字段配置 */
export interface SmartFieldConfig {
  key: string
  label: string
  icon: string
  placeholder: string
  fontSize: number
  fontWeight: 'normal' | 'bold'
  color: string
}

export const SMART_FIELDS: SmartFieldConfig[] = [
  { key: 'inviter', label: '邀请者', icon: '👤', placeholder: '请输入邀请者姓名', fontSize: 14, fontWeight: 'bold', color: '#d4a574' },
  { key: 'invitee', label: '受邀者', icon: '👥', placeholder: '请输入受邀者姓名', fontSize: 14, fontWeight: 'bold', color: '#d4a574' },
  { key: 'date', label: '日期', icon: '📅', placeholder: '2024年10月1日', fontSize: 18, fontWeight: 'normal', color: '#666666' },
  { key: 'time', label: '时间', icon: '⏰', placeholder: '18:00', fontSize: 18, fontWeight: 'normal', color: '#666666' },
  { key: 'location', label: '地点', icon: '📍', placeholder: '点击填写地点', fontSize: 18, fontWeight: 'normal', color: '#666666' },
  { key: 'address', label: '详细地址', icon: '🏠', placeholder: 'xx酒店xx厅', fontSize: 16, fontWeight: 'normal', color: '#999999' },
  { key: 'phone', label: '联系电话', icon: '📞', placeholder: '138xxxxxxxx', fontSize: 16, fontWeight: 'normal', color: '#999999' },
  { key: 'year', label: '年份', icon: '📅', placeholder: '2025', fontSize: 14, fontWeight: 'normal', color: '#666666' },
  { key: 'month', label: '月份', icon: '📅', placeholder: '6', fontSize: 14, fontWeight: 'normal', color: '#666666' },
  { key: 'day', label: '日期(日)', icon: '📅', placeholder: '15', fontSize: 14, fontWeight: 'normal', color: '#666666' },
  // 哈萨克语阿拉伯文日期字段：
  // kzDate：小程序端选日期后自动填入哈语表达式 "2026 جىل 1 اي 22 كۇن"（数字保留西方数字，翻译年月日单位）
  // kzWeekday：小程序端提供周一-周日滚轮选择器，选后填入哈语星期名
  // kzTime：小程序端提供时间段滚轮，选后填入哈语时间段
  // 发布后小程序端会自动注入 RTL 字体（KazakhSoftAsilya）
  { key: 'kzDate', label: '哈语日期', icon: '📆', placeholder: '2026 جىل 1 اي 22 كۇن', fontSize: 16, fontWeight: 'normal', color: '#666666' },
  { key: 'kzWeekday', label: '哈语星期', icon: '📆', placeholder: 'سەيسەنبى', fontSize: 16, fontWeight: 'normal', color: '#666666' },
  { key: 'kzTime', label: '哈语时间段', icon: '⏰', placeholder: 'تۇستەن كەيىن', fontSize: 16, fontWeight: 'normal', color: '#666666' },
]

/** 文字样式预设 */
export interface TextPreset {
  name: string
  description: string
  sample: string
  previewStyle: Record<string, string>
  config: Partial<TextElement>
}

export const TEXT_PRESETS: TextPreset[] = [
  {
    name: '中式大标题',
    description: '金色行楷，适合喜庆场景',
    sample: '标题',
    previewStyle: { fontFamily: '华文行楷, cursive', fontSize: '16px', fontWeight: 'bold', color: '#B8860B', letterSpacing: '2px' },
    config: { fontFamily: '华文行楷, cursive', fontSize: 40, fontWeight: 'bold', color: '#FFD700', letterSpacing: 6, textAlign: 'center', lineHeight: 1.2, shadowColor: 'rgba(0,0,0,0.4)', shadowBlur: 4, shadowOffsetX: 2, shadowOffsetY: 2 },
  },
  {
    name: '优雅衬线',
    description: 'Georgia 英文标题，简约高级',
    sample: 'Elegant',
    previewStyle: { fontFamily: 'Georgia, serif', fontSize: '14px', color: '#4a4a4a', letterSpacing: '1px' },
    config: { fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 'normal', color: '#4a4a4a', letterSpacing: 3, textAlign: 'center', lineHeight: 1.2 },
  },
  {
    name: '浪漫粉字',
    description: '粉色斜体，少女心满满',
    sample: 'Love',
    previewStyle: { fontFamily: '华文楷体, cursive', fontSize: '16px', color: '#e84a6e', fontStyle: 'italic', letterSpacing: '1px' },
    config: { fontFamily: '华文楷体, cursive', fontSize: 32, fontWeight: 'normal', color: '#e84a6e', fontStyle: 'italic', letterSpacing: 4, textAlign: 'center', lineHeight: 1.2 },
  },
  {
    name: '商务白字',
    description: '黑体加粗白字，适合深色背景',
    sample: '商务',
    previewStyle: { fontFamily: '思源黑体, sans-serif', fontSize: '14px', fontWeight: 'bold', color: '#555', letterSpacing: '1px' },
    config: { fontFamily: '思源黑体, sans-serif', fontSize: 28, fontWeight: 'bold', color: '#ffffff', letterSpacing: 2, textAlign: 'center', lineHeight: 1.2 },
  },
  {
    name: '金色描边',
    description: '金色文字+描边，华丽醒目',
    sample: '描边',
    previewStyle: { fontFamily: '华文行楷, cursive', fontSize: '16px', fontWeight: 'bold', color: '#B8860B', WebkitTextStroke: '1px #D4AF37', letterSpacing: '1px' },
    config: { fontFamily: '华文行楷, cursive', fontSize: 36, fontWeight: 'bold', color: '#FFD700', strokeColor: '#B8860B', strokeWidth: 1, letterSpacing: 4, textAlign: 'center', lineHeight: 1.2 },
  },
  {
    name: '诗意正文',
    description: '宋体棕色，行距宽松',
    sample: '诗',
    previewStyle: { fontFamily: '思源宋体, serif', fontSize: '12px', color: '#8B4513', lineHeight: '1.6' },
    config: { fontFamily: '思源宋体, serif', fontSize: 14, fontWeight: 'normal', color: '#8B4513', lineHeight: 2, letterSpacing: 1, textAlign: 'center' },
  },
  {
    name: '活泼可爱',
    description: '楷体粉色，活泼俏皮',
    sample: '可爱',
    previewStyle: { fontFamily: '华文楷体, cursive', fontSize: '14px', color: '#FF6B6B', fontStyle: 'italic' },
    config: { fontFamily: '华文楷体, cursive', fontSize: 24, fontWeight: 'normal', color: '#FF6B6B', fontStyle: 'italic', letterSpacing: 2, textAlign: 'center', lineHeight: 1.5 },
  },
  {
    name: '简约现代',
    description: 'Arial 大写英文，极简风格',
    sample: 'MODERN',
    previewStyle: { fontFamily: 'Arial, sans-serif', fontSize: '13px', fontWeight: 'bold', color: '#333', letterSpacing: '2px' },
    config: { fontFamily: 'Arial, sans-serif', fontSize: 24, fontWeight: 'bold', color: '#333333', letterSpacing: 6, textAlign: 'center', lineHeight: 1.2 },
  },
]

/** 滤镜预设 */
export const FILTER_PRESETS: Record<string, { brightness: number; contrast: number; saturate: number; blur: number; grayscale: number }> = {
  none: { brightness: 100, contrast: 0, saturate: 100, blur: 0, grayscale: 0 },
  vintage: { brightness: 110, contrast: -10, saturate: 70, blur: 0, grayscale: 10 },
  cool: { brightness: 105, contrast: 10, saturate: 90, blur: 0, grayscale: 0 },
  warm: { brightness: 105, contrast: 5, saturate: 120, blur: 0, grayscale: 0 },
  bw: { brightness: 100, contrast: 10, saturate: 0, blur: 0, grayscale: 100 },
  soft: { brightness: 110, contrast: -15, saturate: 90, blur: 1, grayscale: 0 },
}

/** 背景颜色预设 */
export const bgColors = [
  '#ffffff', '#f5f5f5', '#fff3e0', '#ffe0b2', '#f8bbd0',
  '#f8d7da', '#e1bee7', '#d1c4e9', '#c5cae9', '#b3e5fc',
  '#b2ebf2', '#b2dfdb', '#c8e6c9', '#dcedc8', '#fff9c4',
  '#f0f4c3', '#ffebee', '#e3f2fd', '#e8eaf6', '#fce4ec',
]

/** 基础字体列表（用户上传的字体会前置拼接） */
export const fontListBase = [
  'KazakhSoftAsilya',
  'KazakhSoftAsilyaQaniq',
  '思源宋体, serif',
  '思源黑体, sans-serif',
  '华文楷体, KaiTi, serif',
  '华文行楷, serif',
  '华文隶书, serif',
  'Arial, sans-serif',
  'Georgia, serif',
]
