// 内置素材库
// shape：SVG 图形；sticker：emoji 装饰

export interface MaterialItem {
  id: string
  type: 'shape' | 'sticker'
  name: string
  category: string
  svg?: string       // shape 的 SVG
  emoji?: string     // sticker 的 emoji（已弃用，改用 svg）
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

// ============ 婚礼/浪漫贴纸（SVG） ============
const WEDDING_STICKERS: MaterialItem[] = [
  { id: 'sticker-ring', type: 'sticker', name: '戒指', category: '婚礼', svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" stroke-width="6"/><path d="M50 20 L50 5" stroke="currentColor" stroke-width="4"/><path d="M40 10 L60 10" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`, color: '#f39c12' },
  { id: 'sticker-church', type: 'sticker', name: '教堂', category: '婚礼', svg: `<svg viewBox="0 0 100 100"><path d="M30 80 L30 40 L50 15 L70 40 L70 80 Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><rect x="40" y="55" width="20" height="25" fill="none" stroke="currentColor" stroke-width="3"/><path d="M50 15 L50 5" stroke="currentColor" stroke-width="3"/><path d="M45 5 L55 5" stroke="currentColor" stroke-width="3"/></svg>`, color: '#8e44ad' },
  { id: 'sticker-heart', type: 'sticker', name: '爱心', category: '婚礼', svg: `<svg viewBox="0 0 100 100"><path d="M50 85 C10 55 5 30 25 15 C40 5 50 20 50 20 C50 20 60 5 75 15 C95 30 90 55 50 85Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/></svg>`, color: '#e84a6e' },
  { id: 'sticker-heart-sparkle', type: 'sticker', name: '闪耀爱心', category: '婚礼', svg: `<svg viewBox="0 0 100 100"><path d="M50 80 C15 55 10 30 28 18 C40 8 50 22 50 22 C50 22 60 8 72 18 C90 30 85 55 50 80Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M75 10 L78 20 L88 23 L78 26 L75 36 L72 26 L62 23 L72 20 Z" fill="currentColor"/></svg>`, color: '#e74c3c' },
  { id: 'sticker-two-hearts', type: 'sticker', name: '双爱心', category: '婚礼', svg: `<svg viewBox="0 0 100 100"><path d="M30 70 C8 48 5 25 20 15 C30 8 35 18 35 18 C35 18 40 8 50 15 C65 25 62 48 40 70Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" transform="translate(-5,5)"/><path d="M50 70 C28 48 25 25 40 15 C50 8 55 18 55 18 C55 18 60 8 70 15 C85 25 82 48 60 70Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" transform="translate(5,5)"/></svg>`, color: '#e84a6e' },
  { id: 'sticker-gift', type: 'sticker', name: '礼物', category: '婚礼', svg: `<svg viewBox="0 0 100 100"><rect x="20" y="45" width="60" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="4"/><path d="M20 45 L80 45" stroke="currentColor" stroke-width="4"/><path d="M30 30 C30 10 50 15 50 30" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M70 30 C70 10 50 15 50 30" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`, color: '#e74c3c' },
  { id: 'sticker-wedding-cake', type: 'sticker', name: '婚礼蛋糕', category: '婚礼', svg: `<svg viewBox="0 0 100 100"><rect x="25" y="65" width="50" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="4"/><rect x="30" y="40" width="40" height="25" rx="3" fill="none" stroke="currentColor" stroke-width="4"/><rect x="35" y="20" width="30" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="4"/><path d="M40 20 L40 10 M60 20 L60 10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="45" cy="15" r="2" fill="currentColor"/><circle cx="55" cy="15" r="2" fill="currentColor"/></svg>`, color: '#f5a0b3' },
  { id: 'sticker-dove', type: 'sticker', name: '鸽子', category: '婚礼', svg: `<svg viewBox="0 0 100 100"><path d="M60 60 Q40 40 20 50 Q40 55 50 50 Q30 65 20 80 Q40 65 55 60 Q65 55 80 50 Q70 45 60 60Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M80 50 L95 40" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M80 50 L95 55" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`, color: '#3498db' },
  { id: 'sticker-flower', type: 'sticker', name: '花朵', category: '婚礼', svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="8" fill="none" stroke="currentColor" stroke-width="4"/><ellipse cx="50" cy="25" rx="10" ry="18" fill="none" stroke="currentColor" stroke-width="3"/><ellipse cx="72" cy="38" rx="10" ry="18" fill="none" stroke="currentColor" stroke-width="3" transform="rotate(72, 50, 50)"/><ellipse cx="72" cy="62" rx="10" ry="18" fill="none" stroke="currentColor" stroke-width="3" transform="rotate(144, 50, 50)"/><ellipse cx="28" cy="62" rx="10" ry="18" fill="none" stroke="currentColor" stroke-width="3" transform="rotate(216, 50, 50)"/><ellipse cx="28" cy="38" rx="10" ry="18" fill="none" stroke="currentColor" stroke-width="3" transform="rotate(288, 50, 50)"/></svg>`, color: '#e91e63' },
  { id: 'sticker-rose', type: 'sticker', name: '玫瑰', category: '婚礼', svg: `<svg viewBox="0 0 100 100"><path d="M50 90 Q30 60 25 40 Q20 20 40 15 Q55 10 60 25 Q65 15 75 20 Q85 25 80 40 Q75 60 50 90Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M50 90 L50 75" stroke="currentColor" stroke-width="3"/><path d="M40 78 L50 75 L60 78" stroke="currentColor" stroke-width="2" fill="none"/></svg>`, color: '#c0392b' },
  { id: 'sticker-sakura', type: 'sticker', name: '樱花', category: '婚礼', svg: `<svg viewBox="0 0 100 100"><path d="M50 85 Q20 60 30 35 Q35 15 50 25 Q55 10 65 20 Q75 15 72 35 Q80 55 50 85Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M50 85 L50 65" stroke="currentColor" stroke-width="3"/><path d="M42 70 L50 65 L58 70" stroke="currentColor" stroke-width="2" fill="none"/><path d="M50 25 Q50 10 50 5" stroke="currentColor" stroke-width="3" stroke-dasharray="2,3"/></svg>`, color: '#f48fb1' },
  { id: 'sticker-confetti', type: 'sticker', name: '彩纸', category: '婚礼', svg: `<svg viewBox="0 0 100 100"><rect x="30" y="30" width="10" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2" transform="rotate(15, 35, 35)"/><rect x="60" y="25" width="8" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2" transform="rotate(-20, 64, 31)"/><rect x="45" y="50" width="12" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="2" transform="rotate(45, 51, 54)"/><rect x="65" y="55" width="8" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2" transform="rotate(-10, 69, 60)"/><rect x="25" y="60" width="10" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="2" transform="rotate(30, 30, 64)"/><circle cx="55" cy="40" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="35" cy="48" r="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>`, color: '#f1c40f' },
  { id: 'sticker-balloon', type: 'sticker', name: '气球', category: '婚礼', svg: `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="40" rx="25" ry="32" fill="none" stroke="currentColor" stroke-width="4"/><path d="M50 72 L50 95" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M35 30 L40 25" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M65 30 L60 25" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`, color: '#e74c3c' },
  { id: 'sticker-wine', type: 'sticker', name: '酒杯', category: '婚礼', svg: `<svg viewBox="0 0 100 100"><path d="M35 5 L65 5 L55 45 Q55 60 60 70 Q65 80 65 95 L35 95 Q35 80 40 70 Q45 60 45 45 Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M50 55 L50 80" stroke="currentColor" stroke-width="3"/></svg>`, color: '#9b59b6' },
  { id: 'sticker-champagne', type: 'sticker', name: '香槟', category: '婚礼', svg: `<svg viewBox="0 0 100 100"><path d="M40 5 L60 5 L60 30 Q65 35 65 50 Q65 70 55 80 L55 95 L45 95 L45 80 Q35 70 35 50 Q35 35 40 30 Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M35 30 Q50 25 65 30" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="50" cy="40" r="3" fill="currentColor"/></svg>`, color: '#27ae60' },
]

// ============ 生日/派对贴纸（SVG） ============
const BIRTHDAY_STICKERS: MaterialItem[] = [
  { id: 'sticker-cake', type: 'sticker', name: '蛋糕', category: '生日', svg: `<svg viewBox="0 0 100 100"><rect x="20" y="55" width="60" height="35" rx="4" fill="none" stroke="currentColor" stroke-width="4"/><rect x="25" y="35" width="50" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="4"/><path d="M30 35 L30 25 M50 35 L50 20 M70 35 L70 25" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="35" cy="45" r="2" fill="currentColor"/><circle cx="45" cy="42" r="2" fill="currentColor"/><circle cx="55" cy="45" r="2" fill="currentColor"/><circle cx="65" cy="42" r="2" fill="currentColor"/><path d="M50 20 Q55 10 45 5" fill="none" stroke="#f1c40f" stroke-width="3" stroke-linecap="round"/></svg>`, color: '#f5a0b3' },
  { id: 'sticker-party', type: 'sticker', name: '派对', category: '生日', svg: `<svg viewBox="0 0 100 100"><rect x="15" y="60" width="20" height="30" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><rect x="40" y="40" width="20" height="50" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><rect x="65" y="20" width="20" height="70" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><path d="M25 60 L25 45 M30 60 L30 48 M50 40 L50 25 M55 40 L55 28 M75 20 L75 8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M20 10 L25 20 L35 15 L28 25 L35 30 L22 28 L18 38 L15 28 L5 30 L10 22 L3 15 L12 18 Z" fill="currentColor" transform="translate(55, -5) scale(0.6)"/></svg>`, color: '#e74c3c' },
  { id: 'sticker-balloon-bday', type: 'sticker', name: '气球', category: '生日', svg: `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="38" rx="28" ry="34" fill="none" stroke="currentColor" stroke-width="4"/><path d="M50 72 L50 95" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M35 28 L40 23 M65 28 L60 23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M50 5 L50 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M42 9 L50 5 L58 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`, color: '#f1c40f' },
  { id: 'sticker-candle', type: 'sticker', name: '蜡烛', category: '生日', svg: `<svg viewBox="0 0 100 100"><rect x="40" y="35" width="20" height="55" rx="3" fill="none" stroke="currentColor" stroke-width="4"/><rect x="35" y="85" width="30" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="3"/><path d="M50 35 L50 10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M50 5 Q55 15 50 18 Q45 15 50 5" fill="currentColor"/><ellipse cx="50" cy="18" rx="1" ry="2" fill="currentColor"/></svg>`, color: '#f39c12' },
  { id: 'sticker-gift-bday', type: 'sticker', name: '礼物', category: '生日', svg: `<svg viewBox="0 0 100 100"><rect x="18" y="40" width="64" height="52" rx="4" fill="none" stroke="currentColor" stroke-width="4"/><path d="M18 40 L82 40" stroke="currentColor" stroke-width="4"/><path d="M28 25 C28 5 50 8 50 25" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M72 25 C72 5 50 8 50 25" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M50 40 L50 92" stroke="currentColor" stroke-width="3"/></svg>`, color: '#e74c3c' },
  { id: 'sticker-star', type: 'sticker', name: '星星', category: '生日', svg: `<svg viewBox="0 0 100 100"><polygon points="50,5 63,35 97,40 72,62 78,97 50,78 22,97 28,62 3,40 37,35" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/></svg>`, color: '#f1c40f' },
  { id: 'sticker-sparkles', type: 'sticker', name: '闪光', category: '生日', svg: `<svg viewBox="0 0 100 100"><path d="M50 10 L55 30 L75 35 L55 40 L50 60 L45 40 L25 35 L45 30 Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><circle cx="75" cy="20" r="3" fill="currentColor"/><circle cx="80" cy="60" r="3" fill="currentColor"/><circle cx="25" cy="65" r="3" fill="currentColor"/><circle cx="30" cy="18" r="2" fill="currentColor"/><circle cx="68" cy="75" r="2" fill="currentColor"/></svg>`, color: '#f1c40f' },
  { id: 'sticker-burst', type: 'sticker', name: '爆裂', category: '生日', svg: `<svg viewBox="0 0 100 100"><polygon points="50,5 60,25 85,15 72,35 95,40 75,52 90,75 65,65 50,90 35,65 10,75 25,52 5,40 28,35 15,15 40,25" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M45 45 L55 55 M55 45 L45 55" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`, color: '#e74c3c' },
]

// ============ 宝宝/亲子贴纸（SVG） ============
const BABY_STICKERS: MaterialItem[] = [
  { id: 'sticker-baby', type: 'sticker', name: '宝宝', category: '宝宝', svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="40" r="28" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="38" cy="35" r="4" fill="currentColor"/><circle cx="62" cy="35" r="4" fill="currentColor"/><path d="M42 48 Q50 56 58 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="68" r="18" fill="none" stroke="currentColor" stroke-width="4"/></svg>`, color: '#f1c40f' },
  { id: 'sticker-baby-face', type: 'sticker', name: '笑脸', category: '宝宝', svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="48" r="35" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="35" cy="42" r="4" fill="currentColor"/><circle cx="65" cy="42" r="4" fill="currentColor"/><path d="M32 55 Q50 70 68 55" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`, color: '#f39c12' },
  { id: 'sticker-baby-angel', type: 'sticker', name: '天使', category: '宝宝', svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="42" r="22" fill="none" stroke="currentColor" stroke-width="4"/><path d="M40 22 Q30 5 45 12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M60 22 Q70 5 55 12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="40" cy="38" r="3" fill="currentColor"/><circle cx="60" cy="38" r="3" fill="currentColor"/><path d="M42 48 Q50 55 58 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M35 72 L50 60 L65 72" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/></svg>`, color: '#3498db' },
  { id: 'sticker-baby-foot', type: 'sticker', name: '小脚丫', category: '宝宝', svg: `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="75" rx="28" ry="18" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="30" cy="35" r="12" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="50" cy="25" r="12" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="70" cy="35" r="12" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="25" cy="55" r="10" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="75" cy="55" r="10" fill="none" stroke="currentColor" stroke-width="3"/></svg>`, color: '#e91e63' },
  { id: 'sticker-baby-moon', type: 'sticker', name: '月亮', category: '宝宝', svg: `<svg viewBox="0 0 100 100"><path d="M60 10 Q85 35 80 60 Q75 85 50 90 Q30 92 20 75 Q40 80 55 65 Q70 50 60 10Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/></svg>`, color: '#f39c12' },
  { id: 'sticker-baby-star', type: 'sticker', name: '星星', category: '宝宝', svg: `<svg viewBox="0 0 100 100"><polygon points="50,5 63,35 97,40 72,62 78,97 50,78 22,97 28,62 3,40 37,35" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><circle cx="35" cy="35" r="3" fill="currentColor"/><circle cx="65" cy="28" r="3" fill="currentColor"/><circle cx="72" cy="58" r="3" fill="currentColor"/></svg>`, color: '#f1c40f' },
  { id: 'sticker-baby-cloud', type: 'sticker', name: '云朵', category: '宝宝', svg: `<svg viewBox="0 0 100 80"><ellipse cx="35" cy="50" rx="25" ry="18" fill="none" stroke="currentColor" stroke-width="4"/><ellipse cx="60" cy="40" rx="22" ry="18" fill="none" stroke="currentColor" stroke-width="4"/><ellipse cx="75" cy="55" rx="18" ry="14" fill="none" stroke="currentColor" stroke-width="4"/><ellipse cx="50" cy="62" rx="30" ry="14" fill="none" stroke="currentColor" stroke-width="4"/></svg>`, color: '#90caf9' },
  { id: 'sticker-baby-rainbow', type: 'sticker', name: '彩虹', category: '宝宝', svg: `<svg viewBox="0 0 100 80"><path d="M10 70 Q10 20 50 15 Q90 20 90 70" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><path d="M20 70 Q20 30 50 26 Q80 30 80 70" fill="none" stroke="#f1c40f" stroke-width="5" stroke-linecap="round"/><path d="M30 70 Q30 40 50 37 Q70 40 70 70" fill="none" stroke="#4caf50" stroke-width="4" stroke-linecap="round"/></svg>`, color: '#e74c3c' },
]

// ============ 节日贴纸（SVG） ============
const FESTIVAL_STICKERS: MaterialItem[] = [
  { id: 'sticker-firework', type: 'sticker', name: '烟花', category: '节日', svg: `<svg viewBox="0 0 100 100"><path d="M50 80 L50 50" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M30 30 Q50 10 70 30" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M20 45 Q50 25 80 45" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="25" cy="28" r="4" fill="#f1c40f"/><circle cx="50" cy="15" r="5" fill="#e74c3c"/><circle cx="75" cy="28" r="4" fill="#3498db"/><circle cx="18" cy="42" r="3" fill="#e91e63"/><circle cx="82" cy="42" r="3" fill="#2ecc71"/><circle cx="50" cy="35" r="3" fill="#f39c12"/></svg>`, color: '#e74c3c' },
  { id: 'sticker-star-red', type: 'sticker', name: '红星', category: '节日', svg: `<svg viewBox="0 0 100 100"><polygon points="50,5 63,35 97,40 72,62 78,97 50,78 22,97 28,62 3,40 37,35" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/></svg>`, color: '#e74c3c' },
  { id: 'sticker-lantern', type: 'sticker', name: '灯笼', category: '节日', svg: `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="55" rx="22" ry="35" fill="none" stroke="currentColor" stroke-width="4"/><rect x="40" y="15" width="20" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="3"/><rect x="42" y="90" width="16" height="5" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><path d="M50 23 L50 30" stroke="currentColor" stroke-width="2"/><path d="M40 40 Q50 50 60 40" fill="none" stroke="currentColor" stroke-width="2"/><path d="M40 55 Q50 65 60 55" fill="none" stroke="currentColor" stroke-width="2"/><path d="M30 18 L40 18 M60 18 L70 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`, color: '#e74c3c' },
  { id: 'sticker-firecracker', type: 'sticker', name: '鞭炮', category: '节日', svg: `<svg viewBox="0 0 100 100"><rect x="30" y="70" width="40" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="4"/><rect x="35" y="25" width="30" height="50" rx="2" fill="none" stroke="currentColor" stroke-width="4"/><path d="M30 30 L20 20 L25 35 L15 28 L20 40 L10 35 L18 45 L8 42 L15 50" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/><rect x="34" y="28" width="6" height="8" rx="2" fill="#e74c3c"/><rect x="44" y="28" width="6" height="8" rx="2" fill="#f1c40f"/><rect x="54" y="28" width="6" height="8" rx="2" fill="#e74c3c"/></svg>`, color: '#e74c3c' },
  { id: 'sticker-snowflake', type: 'sticker', name: '雪花', category: '节日', svg: `<svg viewBox="0 0 100 100"><path d="M50 5 L50 95 M50 50 L5 50 M50 50 L95 50" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M22 22 L50 50 L78 22 M22 78 L50 50 L78 78" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M18 35 L35 35 L35 18 M65 18 L65 35 L82 35 M82 65 L65 65 L65 82 M35 82 L35 65 L18 65" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`, color: '#3498db' },
  { id: 'sticker-snowman', type: 'sticker', name: '雪人', category: '节日', svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="30" r="18" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="50" cy="60" r="22" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="42" cy="26" r="3" fill="currentColor"/><circle cx="58" cy="26" r="3" fill="currentColor"/><path d="M44 34 Q50 40 56 34" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M50 48 L50 55" stroke="currentColor" stroke-width="3"/><path d="M28 60 L38 57 M62 57 L72 60" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M45 12 L50 5 L55 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><rect x="40" y="8" width="20" height="4" rx="2" fill="currentColor"/></svg>`, color: '#3498db' },
  { id: 'sticker-christmas-tree', type: 'sticker', name: '圣诞树', category: '节日', svg: `<svg viewBox="0 0 100 100"><polygon points="50,5 75,40 62,40 85,70 68,70 85,95 15,95 32,70 15,70 38,40 25,40" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><rect x="40" y="88" width="20" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="42" cy="50" r="3" fill="#f1c40f"/><circle cx="58" cy="65" r="3" fill="#e74c3c"/><circle cx="50" cy="28" r="3" fill="#f1c40f"/></svg>`, color: '#27ae60' },
  { id: 'sticker-gift-red', type: 'sticker', name: '礼物', category: '节日', svg: `<svg viewBox="0 0 100 100"><rect x="18" y="40" width="64" height="52" rx="4" fill="none" stroke="currentColor" stroke-width="4"/><path d="M18 40 L82 40" stroke="currentColor" stroke-width="4"/><path d="M28 25 C28 5 50 8 50 25" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M72 25 C72 5 50 8 50 25" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M50 40 L50 92" stroke="currentColor" stroke-width="3"/><circle cx="35" cy="60" r="4" fill="#f1c40f"/><circle cx="65" cy="60" r="4" fill="#f1c40f"/><circle cx="50" cy="75" r="4" fill="#f1c40f"/></svg>`, color: '#e74c3c' },
]

// ============ 毕业/商务贴纸（SVG） ============
const BUSINESS_STICKERS: MaterialItem[] = [
  { id: 'sticker-trophy', type: 'sticker', name: '奖杯', category: '毕业', svg: `<svg viewBox="0 0 100 100"><path d="M35 25 L35 5 L65 5 L65 25" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M35 25 Q35 55 50 60 Q65 55 65 25" fill="none" stroke="currentColor" stroke-width="4"/><rect x="42" y="60" width="16" height="25" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><rect x="25" y="25" width="12" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><rect x="63" y="25" width="12" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><path d="M42 85 L58 85" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`, color: '#f1c40f' },
  { id: 'sticker-graduation', type: 'sticker', name: '毕业帽', category: '毕业', svg: `<svg viewBox="0 0 100 100"><polygon points="50,10 85,35 50,60 15,35" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M15 35 L15 55 Q15 65 50 70 Q85 65 85 55 L85 35" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M50 60 L50 90" stroke="currentColor" stroke-width="3"/><circle cx="50" cy="90" r="5" fill="none" stroke="currentColor" stroke-width="3"/></svg>`, color: '#34495e' },
  { id: 'sticker-music', type: 'sticker', name: '音乐', category: '毕业', svg: `<svg viewBox="0 0 100 100"><path d="M60 20 L60 65" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M60 20 L80 15 L80 60" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="45" cy="70" rx="18" ry="12" fill="none" stroke="currentColor" stroke-width="4"/><ellipse cx="72" cy="65" rx="14" ry="10" fill="none" stroke="currentColor" stroke-width="4"/></svg>`, color: '#8e44ad' },
  { id: 'sticker-mic', type: 'sticker', name: '话筒', category: '毕业', svg: `<svg viewBox="0 0 100 100"><rect x="40" y="10" width="20" height="45" rx="10" fill="none" stroke="currentColor" stroke-width="4"/><path d="M28 50 Q28 72 50 72 Q72 72 72 50" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M50 72 L50 95" stroke="currentColor" stroke-width="3"/><rect x="35" y="85" width="30" height="8" rx="4" fill="none" stroke="currentColor" stroke-width="3"/></svg>`, color: '#e74c3c' },
  { id: 'sticker-handshake', type: 'sticker', name: '握手', category: '商务', svg: `<svg viewBox="0 0 100 100"><path d="M30 55 Q20 50 15 45 Q10 40 8 30 Q6 20 15 15 Q24 10 30 20 L35 30" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M70 55 Q80 50 85 45 Q90 40 92 30 Q94 20 85 15 Q76 10 70 20 L65 30" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M35 45 L45 55 L55 50 L65 55" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M45 55 L45 90 M55 50 L55 90" stroke="currentColor" stroke-width="3"/></svg>`, color: '#3498db' },
  { id: 'sticker-chart', type: 'sticker', name: '图表', category: '商务', svg: `<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="4" fill="none" stroke="currentColor" stroke-width="4"/><path d="M10 75 L90 75" stroke="currentColor" stroke-width="3"/><path d="M25 60 L25 75 M40 45 L40 75 M55 50 L55 75 M70 35 L70 75 M85 30 L85 75" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M25 60 L40 45 L55 50 L70 35 L85 30" fill="none" stroke="#27ae60" stroke-width="3" stroke-linejoin="round"/></svg>`, color: '#27ae60' },
  { id: 'sticker-medal', type: 'sticker', name: '奖牌', category: '毕业', svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="45" r="25" fill="none" stroke="currentColor" stroke-width="4"/><path d="M30 20 L15 5 L45 5 L50 15" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M70 20 L85 5 L55 5 L50 15" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><circle cx="50" cy="45" r="8" fill="none" stroke="currentColor" stroke-width="3"/></svg>`, color: '#f1c40f' },
  { id: 'sticker-briefcase', type: 'sticker', name: '公文包', category: '商务', svg: `<svg viewBox="0 0 100 100"><rect x="15" y="35" width="70" height="55" rx="5" fill="none" stroke="currentColor" stroke-width="4"/><rect x="35" y="15" width="30" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="4"/><path d="M48 60 L52 60" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M15 55 L48 55 M52 55 L85 55" stroke="currentColor" stroke-width="3"/></svg>`, color: '#8e44ad' },
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
