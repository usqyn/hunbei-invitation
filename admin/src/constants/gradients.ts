// 背景渐变预设库
// 每个预设包含 CSS 样式和 CanvasBackground 所需的参数

export interface GradientPreset {
  name: string
  css: string
  c1: string
  c2: string
  angle: number
  category: string
}

export const GRADIENT_CATEGORIES = ['全部', '婚礼', '清新', '商务', '节日', '暗色']

export const GRADIENT_PRESETS: GradientPreset[] = [
  // ====== 婚礼浪漫 ======
  { name: '玫瑰粉', css: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)', c1: '#fce4ec', c2: '#f8bbd0', angle: 135, category: '婚礼' },
  { name: '梦幻紫', css: 'linear-gradient(135deg, #f3e5f5 0%, #ce93d8 100%)', c1: '#f3e5f5', c2: '#ce93d8', angle: 135, category: '婚礼' },
  { name: '香槟金', css: 'linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)', c1: '#fff8e1', c2: '#ffecb3', angle: 135, category: '婚礼' },
  { name: '珊瑚橘', css: 'linear-gradient(135deg, #ffccbc 0%, #ffab91 100%)', c1: '#ffccbc', c2: '#ffab91', angle: 135, category: '婚礼' },
  { name: '樱花粉', css: 'linear-gradient(180deg, #fce4ec 0%, #f48fb1 100%)', c1: '#fce4ec', c2: '#f48fb1', angle: 180, category: '婚礼' },
  { name: '暮光紫', css: 'linear-gradient(135deg, #d1c4e9 0%, #9575cd 100%)', c1: '#d1c4e9', c2: '#9575cd', angle: 135, category: '婚礼' },

  // ====== 清新自然 ======
  { name: '薄荷绿', css: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)', c1: '#e8f5e9', c2: '#c8e6c9', angle: 135, category: '清新' },
  { name: '天空蓝', css: 'linear-gradient(180deg, #e3f2fd 0%, #90caf9 100%)', c1: '#e3f2fd', c2: '#90caf9', angle: 180, category: '清新' },
  { name: '柠檬黄', css: 'linear-gradient(135deg, #fff9c4 0%, #fff59d 100%)', c1: '#fff9c4', c2: '#fff59d', angle: 135, category: '清新' },
  { name: '薄荷冰', css: 'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)', c1: '#e0f7fa', c2: '#b2ebf2', angle: 135, category: '清新' },
  { name: '青草绿', css: 'linear-gradient(135deg, #dcedc8 0%, #aed581 100%)', c1: '#dcedc8', c2: '#aed581', angle: 135, category: '清新' },
  { name: '晨雾蓝', css: 'linear-gradient(180deg, #f3f8ff 0%, #c5cae9 100%)', c1: '#f3f8ff', c2: '#c5cae9', angle: 180, category: '清新' },

  // ====== 商务稳重 ======
  { name: '深海蓝', css: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)', c1: '#1565c0', c2: '#0d47a1', angle: 135, category: '商务' },
  { name: '石墨灰', css: 'linear-gradient(135deg, #e0e0e0 0%, #9e9e9e 100%)', c1: '#e0e0e0', c2: '#9e9e9e', angle: 135, category: '商务' },
  { name: '午夜蓝', css: 'linear-gradient(135deg, #263238 0%, #37474f 100%)', c1: '#263238', c2: '#37474f', angle: 135, category: '商务' },
  { name: '靛青蓝', css: 'linear-gradient(180deg, #3949ab 0%, #1a237e 100%)', c1: '#3949ab', c2: '#1a237e', angle: 180, category: '商务' },

  // ====== 节日喜庆 ======
  { name: '中国红', css: 'linear-gradient(135deg, #ffcdd2 0%, #e57373 100%)', c1: '#ffcdd2', c2: '#e57373', angle: 135, category: '节日' },
  { name: '金秋黄', css: 'linear-gradient(135deg, #ffecb3 0%, #ffd54f 100%)', c1: '#ffecb3', c2: '#ffd54f', angle: 135, category: '节日' },
  { name: '开门红', css: 'linear-gradient(135deg, #ff8a80 0%, #d32f2f 100%)', c1: '#ff8a80', c2: '#d32f2f', angle: 135, category: '节日' },
  { name: '暖橙光', css: 'linear-gradient(135deg, #ffe0b2 0%, #ffb74d 100%)', c1: '#ffe0b2', c2: '#ffb74d', angle: 135, category: '节日' },

  // ====== 暗色高级 ======
  { name: '墨绿金', css: 'linear-gradient(135deg, #1b5e20 0%, #33691e 100%)', c1: '#1b5e20', c2: '#33691e', angle: 135, category: '暗色' },
  { name: '酒红棕', css: 'linear-gradient(135deg, #5d4037 0%, #3e2723 100%)', c1: '#5d4037', c2: '#3e2723', angle: 135, category: '暗色' },
  { name: '炭黑紫', css: 'linear-gradient(135deg, #212121 0%, #4a148c 100%)', c1: '#212121', c2: '#4a148c', angle: 135, category: '暗色' },
  { name: '深靛蓝', css: 'linear-gradient(180deg, #1a237e 0%, #311b92 100%)', c1: '#1a237e', c2: '#311b92', angle: 180, category: '暗色' },
]

export function getGradientsByCategory(category: string): GradientPreset[] {
  if (category === '全部') return GRADIENT_PRESETS
  return GRADIENT_PRESETS.filter(g => g.category === category)
}
