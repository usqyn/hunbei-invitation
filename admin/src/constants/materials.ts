// 内置素材库
// shape：SVG 图形；sticker：emoji 装饰

export interface MaterialItem {
  id: string
  type: 'shape' | 'sticker'
  name: string
  category: string
  svg?: string       // shape 的 SVG
  emoji?: string     // sticker 的 emoji
  color?: string     // 默认填充色
}

// ============ 基础图形 ============
const SHAPES: MaterialItem[] = [
  {
    id: 'shape-rect',
    type: 'shape',
    name: '矩形',
    category: '基础图形',
    svg: `<svg viewBox="0 0 100 100"><rect x="5" y="5" width="90" height="90" rx="4"/></svg>`,
    color: '#e84a6e',
  },
  {
    id: 'shape-circle',
    type: 'shape',
    name: '圆形',
    category: '基础图形',
    svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45"/></svg>`,
    color: '#3498db',
  },
  {
    id: 'shape-rounded-rect',
    type: 'shape',
    name: '圆角矩形',
    category: '基础图形',
    svg: `<svg viewBox="0 0 100 100"><rect x="5" y="5" width="90" height="90" rx="20"/></svg>`,
    color: '#2ecc71',
  },
  {
    id: 'shape-heart',
    type: 'shape',
    name: '爱心',
    category: '浪漫元素',
    svg: `<svg viewBox="0 0 100 100"><path d="M50 88 C10 60 5 30 25 15 C40 5 50 20 50 20 C50 20 60 5 75 15 C95 30 90 60 50 88Z"/></svg>`,
    color: '#e84a6e',
  },
  {
    id: 'shape-star',
    type: 'shape',
    name: '五角星',
    category: '浪漫元素',
    svg: `<svg viewBox="0 0 100 100"><polygon points="50,5 61,40 98,40 68,62 79,97 50,75 21,97 32,62 2,40 39,40"/></svg>`,
    color: '#f1c40f',
  },
  {
    id: 'shape-diamond',
    type: 'shape',
    name: '菱形',
    category: '基础图形',
    svg: `<svg viewBox="0 0 100 100"><polygon points="50,5 95,50 50,95 5,50"/></svg>`,
    color: '#9b59b6',
  },
  {
    id: 'shape-ring',
    type: 'shape',
    name: '戒指圆环',
    category: '浪漫元素',
    svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke-width="10"/><circle cx="50" cy="50" r="25" fill="none" stroke-width="8"/></svg>`,
    color: '#f39c12',
  },
  {
    id: 'shape-cloud',
    type: 'shape',
    name: '云朵',
    category: '装饰元素',
    svg: `<svg viewBox="0 0 100 80"><ellipse cx="30" cy="50" rx="25" ry="18"/><ellipse cx="55" cy="40" rx="22" ry="18"/><ellipse cx="75" cy="50" rx="18" ry="14"/><ellipse cx="50" cy="60" rx="30" ry="14"/></svg>`,
    color: '#ecf0f1',
  },
  {
    id: 'shape-triangle',
    type: 'shape',
    name: '三角形',
    category: '基础图形',
    svg: `<svg viewBox="0 0 100 100"><polygon points="50,5 95,95 5,95"/></svg>`,
    color: '#e74c3c',
  },
  {
    id: 'shape-arrow',
    type: 'shape',
    name: '向下箭头',
    category: '装饰元素',
    svg: `<svg viewBox="0 0 100 120"><polygon points="50,5 90,50 65,50 65,115 35,115 35,50 10,50"/></svg>`,
    color: '#34495e',
  },
  {
    id: 'shape-bubble',
    type: 'shape',
    name: '对话气泡',
    category: '装饰元素',
    svg: `<svg viewBox="0 0 120 80"><rect x="2" y="2" width="116" height="60" rx="12"/><polygon points="20,62 40,62 20,80"/></svg>`,
    color: '#3498db',
  },
  {
    id: 'shape-hexagon',
    type: 'shape',
    name: '六边形',
    category: '基础图形',
    svg: `<svg viewBox="0 0 100 100"><polygon points="25,5 75,5 100,50 75,95 25,95 0,50"/></svg>`,
    color: '#1abc9c',
  },
]

// ============ 婚礼/浪漫贴纸（emoji） ============
const WEDDING_STICKERS: MaterialItem[] = [
  { id: 'sticker-ring', type: 'sticker', name: '戒指', category: '婚礼', emoji: '💍' },
  { id: 'sticker-church', type: 'sticker', name: '教堂', category: '婚礼', emoji: '⛪' },
  { id: 'sticker-heart', type: 'sticker', name: '爱心', category: '婚礼', emoji: '❤️' },
  { id: 'sticker-heart-sparkle', type: 'sticker', name: '闪耀爱心', category: '婚礼', emoji: '💖' },
  { id: 'sticker-two-hearts', type: 'sticker', name: '双爱心', category: '婚礼', emoji: '💕' },
  { id: 'sticker-gift', type: 'sticker', name: '礼物', category: '婚礼', emoji: '🎁' },
  { id: 'sticker-wedding-cake', type: 'sticker', name: '婚礼蛋糕', category: '婚礼', emoji: '🎂' },
  { id: 'sticker-dove', type: 'sticker', name: '鸽子', category: '婚礼', emoji: '🕊' },
  { id: 'sticker-flower', type: 'sticker', name: '花朵', category: '婚礼', emoji: '🌸' },
  { id: 'sticker-rose', type: 'sticker', name: '玫瑰', category: '婚礼', emoji: '🌹' },
  { id: 'sticker-sakura', type: 'sticker', name: '樱花', category: '婚礼', emoji: '🌸' },
  { id: 'sticker-confetti', type: 'sticker', name: '彩纸', category: '婚礼', emoji: '🎊' },
  { id: 'sticker-balloon', type: 'sticker', name: '气球', category: '婚礼', emoji: '🎈' },
  { id: 'sticker-wine', type: 'sticker', name: '酒杯', category: '婚礼', emoji: '🍷' },
  { id: 'sticker-champagne', type: 'sticker', name: '香槟', category: '婚礼', emoji: '🍾' },
]

// ============ 生日/派对贴纸 ============
const BIRTHDAY_STICKERS: MaterialItem[] = [
  { id: 'sticker-cake', type: 'sticker', name: '蛋糕', category: '生日', emoji: '🎂' },
  { id: 'sticker-party', type: 'sticker', name: '派对', category: '生日', emoji: '🎉' },
  { id: 'sticker-balloon-bday', type: 'sticker', name: '气球', category: '生日', emoji: '🎈' },
  { id: 'sticker-candle', type: 'sticker', name: '蜡烛', category: '生日', emoji: '🕯' },
  { id: 'sticker-gift-bday', type: 'sticker', name: '礼物', category: '生日', emoji: '🎁' },
  { id: 'sticker-star', type: 'sticker', name: '星星', category: '生日', emoji: '⭐' },
  { id: 'sticker-sparkles', type: 'sticker', name: '闪光', category: '生日', emoji: '✨' },
  { id: 'sticker-burst', type: 'sticker', name: '爆裂', category: '生日', emoji: '💥' },
]

// ============ 宝宝/亲子贴纸 ============
const BABY_STICKERS: MaterialItem[] = [
  { id: 'sticker-baby', type: 'sticker', name: '宝宝', category: '宝宝', emoji: '👶' },
  { id: 'sticker-baby-face', type: 'sticker', name: '笑脸', category: '宝宝', emoji: '😊' },
  { id: 'sticker-baby-angel', type: 'sticker', name: '天使', category: '宝宝', emoji: '👼' },
  { id: 'sticker-baby-foot', type: 'sticker', name: '小脚丫', category: '宝宝', emoji: '🦶' },
  { id: 'sticker-baby-moon', type: 'sticker', name: '月亮', category: '宝宝', emoji: '🌙' },
  { id: 'sticker-baby-star', type: 'sticker', name: '星星', category: '宝宝', emoji: '🌟' },
  { id: 'sticker-baby-cloud', type: 'sticker', name: '云朵', category: '宝宝', emoji: '☁️' },
  { id: 'sticker-baby-rainbow', type: 'sticker', name: '彩虹', category: '宝宝', emoji: '🌈' },
]

// ============ 节日贴纸 ============
const FESTIVAL_STICKERS: MaterialItem[] = [
  { id: 'sticker-firework', type: 'sticker', name: '烟花', category: '节日', emoji: '🎆' },
  { id: 'sticker-star-red', type: 'sticker', name: '红星', category: '节日', emoji: '🌟' },
  { id: 'sticker-lantern', type: 'sticker', name: '灯笼', category: '节日', emoji: '🏮' },
  { id: 'sticker-firecracker', type: 'sticker', name: '鞭炮', category: '节日', emoji: '🧨' },
  { id: 'sticker-snowflake', type: 'sticker', name: '雪花', category: '节日', emoji: '❄️' },
  { id: 'sticker-snowman', type: 'sticker', name: '雪人', category: '节日', emoji: '⛄' },
  { id: 'sticker-christmas-tree', type: 'sticker', name: '圣诞树', category: '节日', emoji: '🎄' },
  { id: 'sticker-gift-red', type: 'sticker', name: '礼物', category: '节日', emoji: '🎁' },
]

// ============ 毕业/商务贴纸 ============
const BUSINESS_STICKERS: MaterialItem[] = [
  { id: 'sticker-trophy', type: 'sticker', name: '奖杯', category: '毕业', emoji: '🏆' },
  { id: 'sticker-graduation', type: 'sticker', name: '毕业帽', category: '毕业', emoji: '🎓' },
  { id: 'sticker-music', type: 'sticker', name: '音乐', category: '毕业', emoji: '🎵' },
  { id: 'sticker-mic', type: 'sticker', name: '话筒', category: '毕业', emoji: '🎤' },
  { id: 'sticker-handshake', type: 'sticker', name: '握手', category: '商务', emoji: '🤝' },
  { id: 'sticker-chart', type: 'sticker', name: '图表', category: '商务', emoji: '📈' },
  { id: 'sticker-medal', type: 'sticker', name: '奖牌', category: '毕业', emoji: '🏅' },
  { id: 'sticker-briefcase', type: 'sticker', name: '公文包', category: '商务', emoji: '💼' },
]

// 全部素材
export const ALL_MATERIALS: MaterialItem[] = [
  ...SHAPES,
  ...WEDDING_STICKERS,
  ...BIRTHDAY_STICKERS,
  ...BABY_STICKERS,
  ...FESTIVAL_STICKERS,
  ...BUSINESS_STICKERS,
]

// 按分类分组（返回唯一分类列表）
export function getMaterialCategories(): string[] {
  const cats = new Set(ALL_MATERIALS.map(m => m.category))
  return ['全部', '基础图形', '浪漫元素', '婚礼', '生日', '宝宝', '节日', '毕业', '商务', '装饰元素']
    .filter(c => cats.has(c) || c === '全部')
}

// 按分类筛选
export function getMaterialsByCategory(category: string): MaterialItem[] {
  if (category === '全部') return ALL_MATERIALS
  return ALL_MATERIALS.filter(m => m.category === category)
}
