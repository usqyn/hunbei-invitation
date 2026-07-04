// 配色方案系统
// 每套方案包含背景色和文字色组合，一键切换整体风格

export interface ColorScheme {
  id: string
  name: string
  thumbnail: string
  background: { type: 'solid' | 'linear-gradient'; color1: string; color2?: string; angle?: number }
  textColor: string // 主文字色
  subTextColor: string // 副文字色
  accentColor: string // 强调色
}

export const COLOR_SCHEMES: ColorScheme[] = [
  {
    id: 'rose-gold',
    name: '玫瑰金',
    thumbnail: 'linear-gradient(135deg, #fce4ec, #f8bbd0)',
    background: { type: 'linear-gradient', color1: '#fce4ec', color2: '#f8bbd0', angle: 135 },
    textColor: '#880e4f',
    subTextColor: '#ad1457',
    accentColor: '#e84a6e',
  },
  {
    id: 'emerald',
    name: '翡翠绿',
    thumbnail: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)',
    background: { type: 'linear-gradient', color1: '#e8f5e9', color2: '#c8e6c9', angle: 135 },
    textColor: '#1b5e20',
    subTextColor: '#2e7d32',
    accentColor: '#4caf50',
  },
  {
    id: 'champagne',
    name: '香槟金',
    thumbnail: 'linear-gradient(135deg, #fff8e1, #ffecb3)',
    background: { type: 'linear-gradient', color1: '#fff8e1', color2: '#ffecb3', angle: 135 },
    textColor: '#5d4037',
    subTextColor: '#795548',
    accentColor: '#D4AF37',
  },
  {
    id: 'dark-green-gold',
    name: '墨绿金',
    thumbnail: 'linear-gradient(135deg, #1b5e20, #33691e)',
    background: { type: 'linear-gradient', color1: '#1b5e20', color2: '#33691e', angle: 135 },
    textColor: '#FFD700',
    subTextColor: '#FFE082',
    accentColor: '#FFC107',
  },
  {
    id: 'morandi',
    name: '莫兰迪',
    thumbnail: 'linear-gradient(135deg, #efebe9, #d7ccc8)',
    background: { type: 'linear-gradient', color1: '#efebe9', color2: '#d7ccc8', angle: 135 },
    textColor: '#5d4037',
    subTextColor: '#795548',
    accentColor: '#8d6e63',
  },
  {
    id: 'china-red',
    name: '中国红',
    thumbnail: 'linear-gradient(135deg, #ffcdd2, #e57373)',
    background: { type: 'linear-gradient', color1: '#ffcdd2', color2: '#e57373', angle: 135 },
    textColor: '#b71c1c',
    subTextColor: '#c62828',
    accentColor: '#FFD700',
  },
  {
    id: 'dream-purple',
    name: '梦幻紫',
    thumbnail: 'linear-gradient(135deg, #f3e5f5, #ce93d8)',
    background: { type: 'linear-gradient', color1: '#f3e5f5', color2: '#ce93d8', angle: 135 },
    textColor: '#4a148c',
    subTextColor: '#6a1b9a',
    accentColor: '#ab47bc',
  },
  {
    id: 'deep-blue',
    name: '深海蓝',
    thumbnail: 'linear-gradient(135deg, #1565c0, #0d47a1)',
    background: { type: 'linear-gradient', color1: '#1565c0', color2: '#0d47a1', angle: 135 },
    textColor: '#ffffff',
    subTextColor: '#bbdefb',
    accentColor: '#64b5f6',
  },
]
