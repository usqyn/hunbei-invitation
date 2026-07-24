// 预设模板与布局骨架
// 供 Admin 编辑器「一键起步」使用，每个预设都是完整的 CanvasDraft

import type { CanvasDraft, TextElement, ImageElement, CanvasElementType } from '../types/canvas'
import { createId } from '../types/canvas'

export interface PresetCategory {
  id: string
  name: string
  icon: string
}

export interface TemplatePreset {
  id: string
  name: string
  category: string // 分类ID
  description: string
  thumbnail: string // CSS gradient 或纯色，用于缩略图展示
  draft: CanvasDraft
}

export const PRESET_CATEGORIES: PresetCategory[] = [
  { id: 'scene', name: '场景模板', icon: '🎨' },
  { id: 'kz', name: '哈萨克模板', icon: '🌙' },
  { id: 'layout', name: '布局骨架', icon: '📐' },
]

// 占位图片 Data URL（提示用户替换）
const PLACEHOLDER_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect width='300' height='300' fill='%23f0f0f0' stroke='%23ddd' stroke-width='2'/%3E%3Cline x1='0' y1='0' x2='300' y2='300' stroke='%23ddd'/%3E%3Cline x1='300' y1='0' x2='0' y2='300' stroke='%23ddd'/%3E%3Ctext x='150' y='150' text-anchor='middle' dominant-baseline='middle' fill='%23999' font-size='16' font-family='sans-serif'%3E🖼 点击替换图片%3C/text%3E%3C/svg%3E"

function makeText(partial: Partial<TextElement> & { content: string }): TextElement {
  return {
    id: createId('text'),
    type: 'text',
    name: partial.name || '文字',
    x: partial.x ?? 187,
    y: partial.y ?? 200,
    width: partial.width ?? 240,
    height: partial.height ?? 40,
    rotation: partial.rotation ?? 0,
    opacity: partial.opacity ?? 1,
    locked: partial.locked ?? false,
    visible: partial.visible ?? true,
    zIndex: partial.zIndex ?? 0,
    editable: partial.editable ?? true,
    dataKey: partial.dataKey,
    content: partial.content,
    fontFamily: partial.fontFamily || '思源黑体, sans-serif',
    fontSize: partial.fontSize ?? 24,
    fontWeight: partial.fontWeight || 'normal',
    fontStyle: partial.fontStyle || 'normal',
    color: partial.color || '#333333',
    textAlign: partial.textAlign || 'center',
    direction: partial.direction || 'auto',
    lineHeight: partial.lineHeight ?? 1.5,
    letterSpacing: partial.letterSpacing ?? 2,
    strokeColor: partial.strokeColor || 'transparent',
    strokeWidth: partial.strokeWidth ?? 0,
    shadowColor: partial.shadowColor || 'transparent',
    shadowOffsetX: partial.shadowOffsetX ?? 0,
    shadowOffsetY: partial.shadowOffsetY ?? 0,
    shadowBlur: partial.shadowBlur ?? 0,
    textDecoration: partial.textDecoration || 'none',
  }
}

function makeImage(partial: Partial<ImageElement> & { src: string }): ImageElement {
  return {
    id: createId('image'),
    type: 'image',
    name: partial.name || '图片',
    x: partial.x ?? 187,
    y: partial.y ?? 300,
    width: partial.width ?? 200,
    height: partial.height ?? 200,
    rotation: partial.rotation ?? 0,
    opacity: partial.opacity ?? 1,
    locked: partial.locked ?? false,
    visible: partial.visible ?? true,
    zIndex: partial.zIndex ?? 0,
    editable: partial.editable ?? true,
    dataKey: partial.dataKey,
    src: partial.src,
    scale: partial.scale || 'cover',
    mask: partial.mask || 'rect',
    borderRadius: partial.borderRadius ?? 0,
    borderColor: partial.borderColor || 'transparent',
    borderWidth: partial.borderWidth ?? 0,
    brightness: partial.brightness ?? 100,
    contrast: partial.contrast ?? 0,
    blur: partial.blur ?? 0,
    grayscale: partial.grayscale ?? 0,
    saturate: partial.saturate ?? 100,
  }
}

// ============ 场景模板 ============

const SCENE_PRESETS: TemplatePreset[] = [
  {
    id: 'scene-chinese-wedding',
    name: '中式红金婚礼',
    category: 'scene',
    description: '喜庆红金配色，典雅大气',
    thumbnail: 'radial-gradient(circle, #8B0000, #2a0000)',
    draft: {
      canvasSize: { width: 375, height: 667 },
      background: { type: 'radial-gradient', color1: '#8B0000', color2: '#1a0505' },
      elements: [
        makeText({
          name: '主标题', x: 187, y: 180, width: 340, height: 70, zIndex: 0,
          content: '我们结婚啦',
          fontFamily: '华文行楷, cursive', fontSize: 44, fontWeight: 'bold', color: '#FFD700',
          textAlign: 'center', lineHeight: 1.2, letterSpacing: 8,
          strokeColor: '#B8860B', strokeWidth: 1,
          shadowColor: 'rgba(0,0,0,0.5)', shadowOffsetX: 2, shadowOffsetY: 3, shadowBlur: 6,
        }),
        makeText({
          name: '英文副标题', x: 187, y: 250, width: 300, height: 30, zIndex: 1,
          content: 'Wedding Invitation',
          fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 'normal', color: '#FFE4B5',
          textAlign: 'center', lineHeight: 1.5, letterSpacing: 3,
        }),
        makeText({
          name: '装饰分隔线', x: 187, y: 300, width: 200, height: 20, zIndex: 2,
          content: '────────────',
          fontFamily: 'Arial, sans-serif', fontSize: 14, color: '#D4AF37',
          textAlign: 'center', letterSpacing: 2,
        }),
        makeText({
          name: '邀请语', x: 187, y: 350, width: 300, height: 40, zIndex: 3,
          content: '诚邀您见证我们的幸福时刻',
          fontFamily: '思源宋体, serif', fontSize: 18, color: '#FFE4B5',
          textAlign: 'center', lineHeight: 1.5, letterSpacing: 2,
        }),
        makeText({
          name: '日期', x: 187, y: 410, width: 280, height: 36, zIndex: 4,
          content: '2026年10月1日 星期六',
          fontFamily: '思源黑体, sans-serif', fontSize: 18, color: '#FFD700',
          textAlign: 'center', lineHeight: 1.5, letterSpacing: 2,
        }),
        makeText({
          name: '地点', x: 187, y: 460, width: 300, height: 30, zIndex: 5,
          content: '北京 · 香格里拉大酒店',
          fontFamily: '思源黑体, sans-serif', fontSize: 15, color: '#DEB887',
          textAlign: 'center', lineHeight: 1.5, letterSpacing: 1,
        }),
        makeText({
          name: '底部诗句', x: 187, y: 560, width: 320, height: 80, zIndex: 6,
          content: '我们曾各自奔赴人海\n直到目光交汇的那一刻\n才懂归属感的意义',
          fontFamily: '思源宋体, serif', fontSize: 13, color: '#DEB887',
          textAlign: 'center', lineHeight: 2, letterSpacing: 1,
        }),
      ],
    },
  },
  {
    id: 'scene-minimal-wedding',
    name: '简约白粉婚礼',
    category: 'scene',
    description: '干净素雅，现代简约',
    thumbnail: 'linear-gradient(135deg, #ffffff, #fce4ec)',
    draft: {
      canvasSize: { width: 375, height: 667 },
      background: { type: 'linear-gradient', color1: '#ffffff', color2: '#fce4ec', angle: 135 },
      elements: [
        makeText({
          name: '主标题', x: 187, y: 200, width: 340, height: 60, zIndex: 0,
          content: 'Our Wedding',
          fontFamily: 'Georgia, serif', fontSize: 36, fontWeight: 'normal', color: '#4a4a4a',
          textAlign: 'center', lineHeight: 1.2, letterSpacing: 4,
        }),
        makeText({
          name: '中文标题', x: 187, y: 270, width: 300, height: 40, zIndex: 1,
          content: '我们的婚礼',
          fontFamily: '思源宋体, serif', fontSize: 22, color: '#666666',
          textAlign: 'center', lineHeight: 1.5, letterSpacing: 6,
        }),
        makeText({
          name: '装饰线', x: 187, y: 330, width: 60, height: 20, zIndex: 2,
          content: '──',
          fontFamily: 'Arial, sans-serif', fontSize: 16, color: '#e84a6e',
          textAlign: 'center', letterSpacing: 0,
        }),
        makeText({
          name: '正文', x: 187, y: 380, width: 280, height: 80, zIndex: 3,
          content: '谨定于 2026年10月1日\n举行结婚典礼\n诚邀您携家人出席',
          fontFamily: '思源黑体, sans-serif', fontSize: 15, color: '#888888',
          textAlign: 'center', lineHeight: 2, letterSpacing: 1,
        }),
        makeText({
          name: '新人名字', x: 187, y: 490, width: 280, height: 30, zIndex: 4,
          content: '张三 & 李四',
          fontFamily: '思源宋体, serif', fontSize: 18, color: '#e84a6e',
          textAlign: 'center', lineHeight: 1.5, letterSpacing: 3,
        }),
        makeText({
          name: '地点', x: 187, y: 540, width: 300, height: 30, zIndex: 5,
          content: '北京 · 丽思卡尔顿酒店',
          fontFamily: '思源黑体, sans-serif', fontSize: 13, color: '#aaaaaa',
          textAlign: 'center', lineHeight: 1.5, letterSpacing: 1,
        }),
      ],
    },
  },
  {
    id: 'scene-dream-wedding',
    name: '梦幻粉紫婚礼',
    category: 'scene',
    description: '浪漫渐变，少女心满满',
    thumbnail: 'linear-gradient(135deg, #f8bbd0, #e1bee7)',
    draft: {
      canvasSize: { width: 375, height: 667 },
      background: { type: 'linear-gradient', color1: '#f8bbd0', color2: '#ce93d8', angle: 135 },
      elements: [
        makeText({
          name: '主标题', x: 187, y: 190, width: 340, height: 70, zIndex: 0,
          content: 'Love Story',
          fontFamily: 'Georgia, serif', fontSize: 40, fontWeight: 'normal', color: '#ffffff',
          textAlign: 'center', lineHeight: 1.2, letterSpacing: 3,
          shadowColor: 'rgba(0,0,0,0.15)', shadowOffsetX: 1, shadowOffsetY: 2, shadowBlur: 4,
        }),
        makeText({
          name: '中文标题', x: 187, y: 270, width: 300, height: 40, zIndex: 1,
          content: '双向奔赴的爱',
          fontFamily: '华文楷体, cursive', fontSize: 24, color: '#ffffff',
          textAlign: 'center', lineHeight: 1.5, letterSpacing: 4,
          shadowColor: 'rgba(0,0,0,0.1)', shadowOffsetX: 1, shadowOffsetY: 1, shadowBlur: 3,
        }),
        makeText({
          name: '邀请语', x: 187, y: 350, width: 300, height: 40, zIndex: 2,
          content: '诚邀您参加我们的婚礼',
          fontFamily: '思源黑体, sans-serif', fontSize: 16, color: '#fff8e1',
          textAlign: 'center', lineHeight: 1.5, letterSpacing: 1,
        }),
        makeText({
          name: '日期时间', x: 187, y: 420, width: 280, height: 36, zIndex: 3,
          content: '2026.10.01 | 11:58 AM',
          fontFamily: 'Georgia, serif', fontSize: 18, color: '#ffffff',
          textAlign: 'center', lineHeight: 1.5, letterSpacing: 2,
        }),
        makeText({
          name: '地点', x: 187, y: 470, width: 300, height: 30, zIndex: 4,
          content: '杭州 · 西湖国宾馆',
          fontFamily: '思源黑体, sans-serif', fontSize: 14, color: '#fff8e1',
          textAlign: 'center', lineHeight: 1.5, letterSpacing: 1,
        }),
        makeText({
          name: '底部小字', x: 187, y: 560, width: 300, height: 60, zIndex: 5,
          content: '愿有岁月可回首\n且以深情共白头',
          fontFamily: '思源宋体, serif', fontSize: 13, color: 'rgba(255,255,255,0.85)',
          textAlign: 'center', lineHeight: 2, letterSpacing: 1,
        }),
      ],
    },
  },
  {
    id: 'scene-baby-party',
    name: '清新绿色宝宝宴',
    category: 'scene',
    description: '清新自然，可爱活泼',
    thumbnail: 'linear-gradient(135deg, #e8f5e9, #a5d6a7)',
    draft: {
      canvasSize: { width: 375, height: 667 },
      background: { type: 'linear-gradient', color1: '#e8f5e9', color2: '#c8e6c9', angle: 135 },
      elements: [
        makeText({
          name: '主标题', x: 187, y: 180, width: 340, height: 60, zIndex: 0,
          content: '宝贝周岁啦',
          fontFamily: '华文楷体, cursive', fontSize: 40, fontWeight: 'bold', color: '#2e7d32',
          textAlign: 'center', lineHeight: 1.2, letterSpacing: 6,
        }),
        makeText({
          name: '英文副标题', x: 187, y: 250, width: 300, height: 30, zIndex: 1,
          content: "Happy 1st Birthday",
          fontFamily: 'Georgia, serif', fontSize: 18, color: '#558b2f',
          textAlign: 'center', lineHeight: 1.5, letterSpacing: 2,
        }),
        makeText({
          name: '装饰线', x: 187, y: 300, width: 80, height: 20, zIndex: 2,
          content: '✿ ✿ ✿',
          fontFamily: 'Arial, sans-serif', fontSize: 14, color: '#81c784',
          textAlign: 'center', letterSpacing: 2,
        }),
        makeText({
          name: '邀请语', x: 187, y: 350, width: 300, height: 40, zIndex: 3,
          content: '诚邀您参加宝宝的周岁宴',
          fontFamily: '思源黑体, sans-serif', fontSize: 16, color: '#33691e',
          textAlign: 'center', lineHeight: 1.5, letterSpacing: 1,
        }),
        makeText({
          name: '日期', x: 187, y: 410, width: 280, height: 36, zIndex: 4,
          content: '2026年5月20日 中午12:00',
          fontFamily: '思源黑体, sans-serif', fontSize: 16, color: '#2e7d32',
          textAlign: 'center', lineHeight: 1.5, letterSpacing: 1,
        }),
        makeText({
          name: '地点', x: 187, y: 460, width: 300, height: 30, zIndex: 5,
          content: '上海 · 半岛酒店',
          fontFamily: '思源黑体, sans-serif', fontSize: 14, color: '#558b2f',
          textAlign: 'center', lineHeight: 1.5, letterSpacing: 1,
        }),
        makeText({
          name: '底部文字', x: 187, y: 540, width: 320, height: 60, zIndex: 6,
          content: '感谢你来到我们的世界\n让每一天都充满欢笑',
          fontFamily: '思源宋体, serif', fontSize: 13, color: '#689f38',
          textAlign: 'center', lineHeight: 2, letterSpacing: 1,
        }),
      ],
    },
  },
  {
    id: 'scene-business-blue',
    name: '商务蓝色会议',
    category: 'scene',
    description: '专业稳重，商务首选',
    thumbnail: 'linear-gradient(135deg, #1565c0, #0d47a1)',
    draft: {
      canvasSize: { width: 375, height: 667 },
      background: { type: 'linear-gradient', color1: '#1565c0', color2: '#0d47a1', angle: 135 },
      elements: [
        makeText({
          name: '主标题', x: 187, y: 200, width: 340, height: 60, zIndex: 0,
          content: '商务会议邀请',
          fontFamily: '思源黑体, sans-serif', fontSize: 32, fontWeight: 'bold', color: '#ffffff',
          textAlign: 'center', lineHeight: 1.2, letterSpacing: 4,
        }),
        makeText({
          name: '英文标题', x: 187, y: 270, width: 300, height: 30, zIndex: 1,
          content: 'Business Meeting Invitation',
          fontFamily: 'Arial, sans-serif', fontSize: 14, color: '#bbdefb',
          textAlign: 'center', lineHeight: 1.5, letterSpacing: 2,
        }),
        makeText({
          name: '分隔线', x: 187, y: 320, width: 60, height: 20, zIndex: 2,
          content: '────',
          fontFamily: 'Arial, sans-serif', fontSize: 14, color: '#64b5f6',
          textAlign: 'center', letterSpacing: 0,
        }),
        makeText({
          name: '会议主题', x: 187, y: 370, width: 300, height: 40, zIndex: 3,
          content: '2026年度战略规划会议',
          fontFamily: '思源黑体, sans-serif', fontSize: 18, color: '#e3f2fd',
          textAlign: 'center', lineHeight: 1.5, letterSpacing: 1,
        }),
        makeText({
          name: '日期时间', x: 187, y: 430, width: 280, height: 36, zIndex: 4,
          content: '2026年3月15日 14:00-17:00',
          fontFamily: '思源黑体, sans-serif', fontSize: 16, color: '#ffffff',
          textAlign: 'center', lineHeight: 1.5, letterSpacing: 1,
        }),
        makeText({
          name: '地点', x: 187, y: 480, width: 300, height: 30, zIndex: 5,
          content: '深圳 · 腾讯大厦会议室 A',
          fontFamily: '思源黑体, sans-serif', fontSize: 14, color: '#bbdefb',
          textAlign: 'center', lineHeight: 1.5, letterSpacing: 1,
        }),
        makeText({
          name: '底部提示', x: 187, y: 560, width: 320, height: 40, zIndex: 6,
          content: '请携带名片准时出席',
          fontFamily: '思源黑体, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.7)',
          textAlign: 'center', lineHeight: 1.5, letterSpacing: 1,
        }),
      ],
    },
  },
  {
    id: 'scene-gold-brown-house',
    name: '复古金棕乔迁',
    category: 'scene',
    description: '温暖复古，乔迁之喜',
    thumbnail: 'linear-gradient(135deg, #5d4037, #3e2723)',
    draft: {
      canvasSize: { width: 375, height: 667 },
      background: { type: 'linear-gradient', color1: '#5d4037', color2: '#3e2723', angle: 135 },
      elements: [
        makeText({
          name: '主标题', x: 187, y: 180, width: 340, height: 60, zIndex: 0,
          content: '乔迁之喜',
          fontFamily: '华文行楷, cursive', fontSize: 44, fontWeight: 'bold', color: '#FFD700',
          textAlign: 'center', lineHeight: 1.2, letterSpacing: 8,
          shadowColor: 'rgba(0,0,0,0.4)', shadowOffsetX: 2, shadowOffsetY: 2, shadowBlur: 4,
        }),
        makeText({
          name: '英文副标题', x: 187, y: 250, width: 300, height: 30, zIndex: 1,
          content: 'Housewarming Party',
          fontFamily: 'Georgia, serif', fontSize: 16, color: '#D7CCC8',
          textAlign: 'center', lineHeight: 1.5, letterSpacing: 3,
        }),
        makeText({
          name: '装饰线', x: 187, y: 300, width: 100, height: 20, zIndex: 2,
          content: '◆ ◆ ◆',
          fontFamily: 'Arial, sans-serif', fontSize: 12, color: '#D4AF37',
          textAlign: 'center', letterSpacing: 4,
        }),
        makeText({
          name: '邀请语', x: 187, y: 350, width: 300, height: 40, zIndex: 3,
          content: '新居落成，诚邀您来暖房',
          fontFamily: '思源宋体, serif', fontSize: 18, color: '#FFE0B2',
          textAlign: 'center', lineHeight: 1.5, letterSpacing: 2,
        }),
        makeText({
          name: '日期', x: 187, y: 410, width: 280, height: 36, zIndex: 4,
          content: '2026年6月6日 晚6:00',
          fontFamily: '思源黑体, sans-serif', fontSize: 18, color: '#FFD700',
          textAlign: 'center', lineHeight: 1.5, letterSpacing: 2,
        }),
        makeText({
          name: '地点', x: 187, y: 460, width: 300, height: 30, zIndex: 5,
          content: '广州市天河区 · 新家园',
          fontFamily: '思源黑体, sans-serif', fontSize: 15, color: '#D7CCC8',
          textAlign: 'center', lineHeight: 1.5, letterSpacing: 1,
        }),
        makeText({
          name: '底部文字', x: 187, y: 550, width: 320, height: 60, zIndex: 6,
          content: '一屋两人三餐四季\n愿往后余生，温暖相伴',
          fontFamily: '思源宋体, serif', fontSize: 13, color: '#BCAAA4',
          textAlign: 'center', lineHeight: 2, letterSpacing: 1,
        }),
      ],
    },
  },
]

// ============ 哈萨克模板 ============
// 哈萨克请帖专用预设，使用 KazakhSoftAsilya 字体 + RTL 方向
// 使用 admin 的 dataKey 绑定系统：每个可编辑元素设置 dataKey
// 小程序端通过 dataKey 自动出现对应输入框（日期选择器/星期滚轮/时间段滚轮/文本输入）
// 注意：dataKey 绑定整个元素内容，所以每个字段 = 一个独立元素

const KZ_PRESETS: TemplatePreset[] = [
  {
    id: 'kz-formal-classic',
    name: '正式典雅 · قۇتتى بولسىن',
    category: 'kz',
    description: '深绿金配色，传统正式婚礼',
    thumbnail: 'radial-gradient(circle, #0d5c3f, #012a1a)',
    draft: {
      canvasSize: { width: 375, height: 667 },
      background: { type: 'radial-gradient', color1: '#0d5c3f', color2: '#012a1a' },
      elements: [
        // 主标题：توي شاقىرۋ (婚礼邀请) - 静态
        makeText({
          name: '主标题', x: 187, y: 130, width: 340, height: 70, zIndex: 0,
          content: 'توي شاقىرۋ',
          fontFamily: 'KazakhSoftAsilya, serif', fontSize: 46, fontWeight: 'bold', color: '#FFD700',
          textAlign: 'center', direction: 'rtl', lineHeight: 1.2, letterSpacing: 4,
          strokeColor: '#8B6914', strokeWidth: 1,
          shadowColor: 'rgba(0,0,0,0.5)', shadowOffsetX: 2, shadowOffsetY: 3, shadowBlur: 6,
        }),
        // 装饰分隔线 - 静态
        makeText({
          name: '装饰线', x: 187, y: 215, width: 200, height: 24, zIndex: 1,
          content: '◆ ◆ ◆',
          fontFamily: 'Arial, sans-serif', fontSize: 14, color: '#D4AF37',
          textAlign: 'center', letterSpacing: 6,
        }),
        // 新郎名 - dataKey=kzGroomName，小程序端文本输入
        makeText({
          name: '哈语新郎名', x: 187, y: 260, width: 340, height: 44, zIndex: 2,
          content: 'نۇرلان',
          dataKey: 'kzGroomName',
          fontFamily: 'KazakhSoftAsilya, serif', fontSize: 28, fontWeight: 'bold', color: '#FFD700',
          textAlign: 'center', direction: 'rtl', lineHeight: 1.3, letterSpacing: 2,
        }),
        // 连接词 مەن (和) - 静态
        makeText({
          name: '连接词', x: 187, y: 310, width: 340, height: 28, zIndex: 3,
          content: 'مەن',
          fontFamily: 'KazakhSoftAsilya, serif', fontSize: 18, color: '#FFE4B5',
          textAlign: 'center', direction: 'rtl', lineHeight: 1.5, letterSpacing: 2,
        }),
        // 新娘名 - dataKey=kzBrideName，小程序端文本输入
        makeText({
          name: '哈语新娘名', x: 187, y: 345, width: 340, height: 44, zIndex: 4,
          content: 'اينۇر',
          dataKey: 'kzBrideName',
          fontFamily: 'KazakhSoftAsilya, serif', fontSize: 28, fontWeight: 'bold', color: '#FFD700',
          textAlign: 'center', direction: 'rtl', lineHeight: 1.3, letterSpacing: 2,
        }),
        // 邀请正文 - 静态
        makeText({
          name: '邀请正文', x: 187, y: 405, width: 320, height: 50, zIndex: 5,
          content: 'قۇرمەتتى قوناقتار! بالالارىمىزدىڭ تويىنا قاتىسۋعا شاقىرامىز',
          fontFamily: 'KazakhSoftAsilya, serif', fontSize: 16, color: '#FFE4B5',
          textAlign: 'center', direction: 'rtl', lineHeight: 1.6, letterSpacing: 1,
        }),
        // 哈语日期 - dataKey=kzDate，小程序端选日期自动转换
        makeText({
          name: '哈语日期', x: 187, y: 470, width: 340, height: 36, zIndex: 6,
          content: '2026 جىلعى 1 ايدىڭ 22 كۇنى',
          dataKey: 'kzDate',
          fontFamily: 'KazakhSoftAsilya, serif', fontSize: 18, color: '#FFD700',
          textAlign: 'center', direction: 'rtl', lineHeight: 1.5, letterSpacing: 1,
        }),
        // 哈语星期 - dataKey=kzWeekday，小程序端滚轮选择
        makeText({
          name: '哈语星期', x: 187, y: 510, width: 340, height: 32, zIndex: 7,
          content: 'سەنبى',
          dataKey: 'kzWeekday',
          fontFamily: 'KazakhSoftAsilya, serif', fontSize: 18, color: '#FFD700',
          textAlign: 'center', direction: 'rtl', lineHeight: 1.5, letterSpacing: 1,
        }),
        // 哈语时间段 - dataKey=kzTime，小程序端滚轮选择
        makeText({
          name: '哈语时间段', x: 187, y: 545, width: 340, height: 32, zIndex: 8,
          content: 'تۇستەن كەيىن',
          dataKey: 'kzTime',
          fontFamily: 'KazakhSoftAsilya, serif', fontSize: 16, color: '#FFE4B5',
          textAlign: 'center', direction: 'rtl', lineHeight: 1.5, letterSpacing: 1,
        }),
        // 哈语地址 - dataKey=kzAddress，小程序端文本输入
        makeText({
          name: '哈语地址', x: 187, y: 585, width: 340, height: 32, zIndex: 9,
          content: 'استانا قالاسى، "نۇرلي" توي سارايى',
          dataKey: 'kzAddress',
          fontFamily: 'KazakhSoftAsilya, serif', fontSize: 15, color: '#DEB887',
          textAlign: 'center', direction: 'rtl', lineHeight: 1.5, letterSpacing: 1,
        }),
        // 底部祝福 - 静态
        makeText({
          name: '底部祝福', x: 187, y: 630, width: 340, height: 36, zIndex: 10,
          content: 'بەرەكەتتى بولسىن!',
          fontFamily: 'KazakhSoftAsilya, serif', fontSize: 20, fontWeight: 'bold', color: '#FFD700',
          textAlign: 'center', direction: 'rtl', lineHeight: 1.5, letterSpacing: 3,
        }),
      ],
    },
  },
  {
    id: 'kz-poetic-elegant',
    name: '文艺诗意 · باقىت قۇسى',
    category: 'kz',
    description: '蓝白渐变，浪漫诗意',
    thumbnail: 'linear-gradient(135deg, #1e3c72, #2a5298)',
    draft: {
      canvasSize: { width: 375, height: 667 },
      background: { type: 'linear-gradient', color1: '#1e3c72', color2: '#2a5298', angle: 135 },
      elements: [
        // 主标题：باقىت قۇسى قونعان توي (幸福降临的婚礼) - 静态
        makeText({
          name: '主标题', x: 187, y: 130, width: 340, height: 70, zIndex: 0,
          content: 'باقىت قۇسى قونعان توي',
          fontFamily: 'KazakhSoftAsilya, serif', fontSize: 34, fontWeight: 'bold', color: '#ffffff',
          textAlign: 'center', direction: 'rtl', lineHeight: 1.3, letterSpacing: 2,
          shadowColor: 'rgba(0,0,0,0.3)', shadowOffsetX: 1, shadowOffsetY: 2, shadowBlur: 4,
        }),
        // 副标题：ەكى جۇرەك بىرىگەدى (两颗心合而为一) - 静态
        makeText({
          name: '副标题', x: 187, y: 215, width: 340, height: 32, zIndex: 1,
          content: 'ەكى جۇرەك بىرىگەدى',
          fontFamily: 'KazakhSoftAsilya, serif', fontSize: 18, color: '#B0E0E6',
          textAlign: 'center', direction: 'rtl', lineHeight: 1.5, letterSpacing: 2,
        }),
        // 装饰线 - 静态
        makeText({
          name: '装饰线', x: 187, y: 260, width: 80, height: 20, zIndex: 2,
          content: '✿ ─ ✿',
          fontFamily: 'Arial, sans-serif', fontSize: 16, color: '#87CEEB',
          textAlign: 'center', letterSpacing: 4,
        }),
        // 新郎名 - dataKey=kzGroomName
        makeText({
          name: '哈语新郎名', x: 187, y: 300, width: 340, height: 44, zIndex: 3,
          content: 'نۇرلان',
          dataKey: 'kzGroomName',
          fontFamily: 'KazakhSoftAsilya, serif', fontSize: 26, fontWeight: 'bold', color: '#ffffff',
          textAlign: 'center', direction: 'rtl', lineHeight: 1.3, letterSpacing: 3,
        }),
        // 新娘名 - dataKey=kzBrideName
        makeText({
          name: '哈语新娘名', x: 187, y: 355, width: 340, height: 44, zIndex: 4,
          content: 'اينۇر',
          dataKey: 'kzBrideName',
          fontFamily: 'KazakhSoftAsilya, serif', fontSize: 26, fontWeight: 'bold', color: '#ffffff',
          textAlign: 'center', direction: 'rtl', lineHeight: 1.3, letterSpacing: 3,
        }),
        // 哈语日期 - dataKey=kzDate
        makeText({
          name: '哈语日期', x: 187, y: 420, width: 340, height: 36, zIndex: 5,
          content: '2026 جىلعى 1 ايدىڭ 22 كۇنى',
          dataKey: 'kzDate',
          fontFamily: 'KazakhSoftAsilya, serif', fontSize: 18, color: '#E0FFFF',
          textAlign: 'center', direction: 'rtl', lineHeight: 1.5, letterSpacing: 1,
        }),
        // 哈语星期 - dataKey=kzWeekday
        makeText({
          name: '哈语星期', x: 187, y: 460, width: 340, height: 32, zIndex: 6,
          content: 'سەنبى',
          dataKey: 'kzWeekday',
          fontFamily: 'KazakhSoftAsilya, serif', fontSize: 18, color: '#E0FFFF',
          textAlign: 'center', direction: 'rtl', lineHeight: 1.5, letterSpacing: 1,
        }),
        // 哈语时间段 - dataKey=kzTime
        makeText({
          name: '哈语时间段', x: 187, y: 495, width: 340, height: 32, zIndex: 7,
          content: 'تۇستەن كەيىن',
          dataKey: 'kzTime',
          fontFamily: 'KazakhSoftAsilya, serif', fontSize: 16, color: '#B0C4DE',
          textAlign: 'center', direction: 'rtl', lineHeight: 1.5, letterSpacing: 1,
        }),
        // 哈语地址 - dataKey=kzAddress
        makeText({
          name: '哈语地址', x: 187, y: 535, width: 340, height: 32, zIndex: 8,
          content: 'استانا قالاسى، "نۇرلي" توي سارايى',
          dataKey: 'kzAddress',
          fontFamily: 'KazakhSoftAsilya, serif', fontSize: 15, color: '#B0C4DE',
          textAlign: 'center', direction: 'rtl', lineHeight: 1.5, letterSpacing: 1,
        }),
        // 底部诗句 - 静态
        makeText({
          name: '底部诗句', x: 187, y: 590, width: 340, height: 60, zIndex: 9,
          content: 'ارمانىمىز ورىندالعان كۇنى\nسىزدەرگە ارنالدى',
          fontFamily: 'KazakhSoftAsilya, serif', fontSize: 15, color: 'rgba(255,255,255,0.85)',
          textAlign: 'center', direction: 'rtl', lineHeight: 1.8, letterSpacing: 1,
        }),
      ],
    },
  },
  {
    id: 'kz-minimal-modern',
    name: '简洁现代 · قۇتتى بولسىن',
    category: 'kz',
    description: '米白简约，现代清爽',
    thumbnail: 'linear-gradient(135deg, #faf3e0, #f5e6d3)',
    draft: {
      canvasSize: { width: 375, height: 667 },
      background: { type: 'linear-gradient', color1: '#faf3e0', color2: '#f5e6d3', angle: 135 },
      elements: [
        // 主标题：قۇتتى بولسىن! (恭喜！) - 静态
        makeText({
          name: '主标题', x: 187, y: 150, width: 340, height: 70, zIndex: 0,
          content: 'قۇتتى بولسىن!',
          fontFamily: 'KazakhSoftAsilya, serif', fontSize: 44, fontWeight: 'bold', color: '#5d4037',
          textAlign: 'center', direction: 'rtl', lineHeight: 1.2, letterSpacing: 4,
        }),
        // 装饰线 - 静态
        makeText({
          name: '装饰线', x: 187, y: 240, width: 60, height: 20, zIndex: 1,
          content: '───',
          fontFamily: 'Arial, sans-serif', fontSize: 16, color: '#c9a96e',
          textAlign: 'center', letterSpacing: 0,
        }),
        // 新郎名 - dataKey=kzGroomName
        makeText({
          name: '哈语新郎名', x: 187, y: 285, width: 340, height: 40, zIndex: 2,
          content: 'نۇرلان',
          dataKey: 'kzGroomName',
          fontFamily: 'KazakhSoftAsilya, serif', fontSize: 24, color: '#5d4037',
          textAlign: 'center', direction: 'rtl', lineHeight: 1.5, letterSpacing: 2,
        }),
        // 新娘名 - dataKey=kzBrideName
        makeText({
          name: '哈语新娘名', x: 187, y: 335, width: 340, height: 40, zIndex: 3,
          content: 'اينۇر',
          dataKey: 'kzBrideName',
          fontFamily: 'KazakhSoftAsilya, serif', fontSize: 24, color: '#5d4037',
          textAlign: 'center', direction: 'rtl', lineHeight: 1.5, letterSpacing: 2,
        }),
        // 哈语日期 - dataKey=kzDate
        makeText({
          name: '哈语日期', x: 187, y: 400, width: 340, height: 36, zIndex: 4,
          content: '2026 جىلعى 1 ايدىڭ 22 كۇنى',
          dataKey: 'kzDate',
          fontFamily: 'KazakhSoftAsilya, serif', fontSize: 18, color: '#8d6e63',
          textAlign: 'center', direction: 'rtl', lineHeight: 1.5, letterSpacing: 1,
        }),
        // 哈语星期 - dataKey=kzWeekday
        makeText({
          name: '哈语星期', x: 187, y: 445, width: 340, height: 32, zIndex: 5,
          content: 'سەنبى',
          dataKey: 'kzWeekday',
          fontFamily: 'KazakhSoftAsilya, serif', fontSize: 18, color: '#8d6e63',
          textAlign: 'center', direction: 'rtl', lineHeight: 1.5, letterSpacing: 1,
        }),
        // 哈语时间段 - dataKey=kzTime
        makeText({
          name: '哈语时间段', x: 187, y: 480, width: 340, height: 32, zIndex: 6,
          content: 'تۇستەن كەيىن',
          dataKey: 'kzTime',
          fontFamily: 'KazakhSoftAsilya, serif', fontSize: 16, color: '#a1887f',
          textAlign: 'center', direction: 'rtl', lineHeight: 1.5, letterSpacing: 1,
        }),
        // 哈语地址 - dataKey=kzAddress
        makeText({
          name: '哈语地址', x: 187, y: 525, width: 340, height: 32, zIndex: 7,
          content: 'استانا قالاسى، "نۇرلي" توي سارايى',
          dataKey: 'kzAddress',
          fontFamily: 'KazakhSoftAsilya, serif', fontSize: 16, color: '#a1887f',
          textAlign: 'center', direction: 'rtl', lineHeight: 1.5, letterSpacing: 1,
        }),
        // 底部祝福 - 静态
        makeText({
          name: '底部祝福', x: 187, y: 600, width: 340, height: 40, zIndex: 8,
          content: 'تىلەك بىلدىرەمىز',
          fontFamily: 'KazakhSoftAsilya, serif', fontSize: 18, color: '#c9a96e',
          textAlign: 'center', direction: 'rtl', lineHeight: 1.5, letterSpacing: 3,
        }),
      ],
    },
  },
]

// ============ 布局骨架 ============

const LAYOUT_PRESETS: TemplatePreset[] = [
  {
    id: 'layout-center-title',
    name: '居中大标题',
    category: 'layout',
    description: '经典居中排版，适合各类正式邀请',
    thumbnail: 'linear-gradient(135deg, #f5f5f5, #e0e0e0)',
    draft: {
      canvasSize: { width: 375, height: 667 },
      background: { type: 'solid', color1: '#ffffff' },
      elements: [
        makeText({
          name: '主标题', x: 187, y: 220, width: 340, height: 60, zIndex: 0,
          content: '主标题文字',
          fontFamily: '思源宋体, serif', fontSize: 36, fontWeight: 'bold', color: '#333333',
          textAlign: 'center', lineHeight: 1.2, letterSpacing: 4,
        }),
        makeText({
          name: '副标题', x: 187, y: 300, width: 300, height: 35, zIndex: 1,
          content: '副标题文字',
          fontFamily: '思源黑体, sans-serif', fontSize: 18, color: '#666666',
          textAlign: 'center', lineHeight: 1.5, letterSpacing: 2,
        }),
        makeText({
          name: '正文', x: 187, y: 380, width: 280, height: 100, zIndex: 2,
          content: '这里是正文内容\n可以输入多行文字\n介绍活动详情',
          fontFamily: '思源黑体, sans-serif', fontSize: 15, color: '#888888',
          textAlign: 'center', lineHeight: 2, letterSpacing: 1,
        }),
        makeText({
          name: '时间地点', x: 187, y: 510, width: 300, height: 60, zIndex: 3,
          content: '时间：2026年XX月XX日\n地点：请输入地点',
          fontFamily: '思源黑体, sans-serif', fontSize: 14, color: '#999999',
          textAlign: 'center', lineHeight: 2, letterSpacing: 1,
        }),
      ],
    },
  },
  {
    id: 'layout-top-image',
    name: '顶部大图+文字',
    category: 'layout',
    description: '图片在上，文字在下，视觉重心明确',
    thumbnail: 'linear-gradient(180deg, #e0e0e0 50%, #ffffff 50%)',
    draft: {
      canvasSize: { width: 375, height: 667 },
      background: { type: 'solid', color1: '#ffffff' },
      elements: [
        makeImage({
          name: '顶部大图', x: 187, y: 200, width: 375, height: 400, zIndex: 0,
          src: PLACEHOLDER_IMG, scale: 'cover', mask: 'rect',
        }),
        makeText({
          name: '标题', x: 187, y: 460, width: 340, height: 50, zIndex: 1,
          content: '标题文字',
          fontFamily: '思源宋体, serif', fontSize: 28, fontWeight: 'bold', color: '#333333',
          textAlign: 'center', lineHeight: 1.2, letterSpacing: 3,
        }),
        makeText({
          name: '正文', x: 187, y: 530, width: 300, height: 80, zIndex: 2,
          content: '正文内容\n时间地点信息',
          fontFamily: '思源黑体, sans-serif', fontSize: 14, color: '#666666',
          textAlign: 'center', lineHeight: 2, letterSpacing: 1,
        }),
      ],
    },
  },
  {
    id: 'layout-split-h',
    name: '上下分栏',
    category: 'layout',
    description: '上半区标题，下半区详情',
    thumbnail: 'linear-gradient(180deg, #f5f5f5 40%, #ffffff 40%)',
    draft: {
      canvasSize: { width: 375, height: 667 },
      background: { type: 'solid', color1: '#ffffff' },
      elements: [
        makeText({
          name: '上区标题', x: 187, y: 160, width: 340, height: 60, zIndex: 0,
          content: '上区大标题',
          fontFamily: '思源宋体, serif', fontSize: 36, fontWeight: 'bold', color: '#333333',
          textAlign: 'center', lineHeight: 1.2, letterSpacing: 4,
        }),
        makeText({
          name: '上区副标题', x: 187, y: 240, width: 300, height: 30, zIndex: 1,
          content: '副标题文字',
          fontFamily: '思源黑体, sans-serif', fontSize: 16, color: '#666666',
          textAlign: 'center', lineHeight: 1.5, letterSpacing: 2,
        }),
        makeText({
          name: '分隔线', x: 187, y: 300, width: 100, height: 20, zIndex: 2,
          content: '────────',
          fontFamily: 'Arial, sans-serif', fontSize: 12, color: '#cccccc',
          textAlign: 'center', letterSpacing: 0,
        }),
        makeText({
          name: '下区正文', x: 187, y: 400, width: 300, height: 120, zIndex: 3,
          content: '下区详细内容\n可以放置活动介绍\n时间地点等重要信息',
          fontFamily: '思源黑体, sans-serif', fontSize: 15, color: '#555555',
          textAlign: 'center', lineHeight: 2, letterSpacing: 1,
        }),
        makeText({
          name: '底部提示', x: 187, y: 540, width: 300, height: 30, zIndex: 4,
          content: '底部提示文字',
          fontFamily: '思源黑体, sans-serif', fontSize: 13, color: '#999999',
          textAlign: 'center', lineHeight: 1.5, letterSpacing: 1,
        }),
      ],
    },
  },
  {
    id: 'layout-left-img-right-text',
    name: '左图右文',
    category: 'layout',
    description: '左侧图片，右侧文字，杂志风',
    thumbnail: 'linear-gradient(90deg, #e0e0e0 40%, #ffffff 40%)',
    draft: {
      canvasSize: { width: 375, height: 667 },
      background: { type: 'solid', color1: '#ffffff' },
      elements: [
        makeImage({
          name: '左侧图片', x: 100, y: 333, width: 200, height: 667, zIndex: 0,
          src: PLACEHOLDER_IMG, scale: 'cover', mask: 'rect',
        }),
        makeText({
          name: '右侧标题', x: 260, y: 250, width: 200, height: 50, zIndex: 1,
          content: '右侧标题',
          fontFamily: '思源宋体, serif', fontSize: 24, fontWeight: 'bold', color: '#333333',
          textAlign: 'left', lineHeight: 1.2, letterSpacing: 2,
        }),
        makeText({
          name: '右侧正文', x: 260, y: 350, width: 200, height: 120, zIndex: 2,
          content: '右侧正文内容\n可以输入多行\n详细介绍',
          fontFamily: '思源黑体, sans-serif', fontSize: 14, color: '#666666',
          textAlign: 'left', lineHeight: 2, letterSpacing: 1,
        }),
        makeText({
          name: '日期', x: 260, y: 480, width: 200, height: 30, zIndex: 3,
          content: '2026年XX月XX日',
          fontFamily: '思源黑体, sans-serif', fontSize: 13, color: '#999999',
          textAlign: 'left', lineHeight: 1.5, letterSpacing: 1,
        }),
      ],
    },
  },
  {
    id: 'layout-card-stack',
    name: '卡片堆叠',
    category: 'layout',
    description: '多层卡片效果，信息层次分明',
    thumbnail: 'linear-gradient(135deg, #fafafa, #f0f0f0)',
    draft: {
      canvasSize: { width: 375, height: 667 },
      background: { type: 'solid', color1: '#f5f5f5' },
      elements: [
        // 模拟卡片1 - 顶部装饰条
        makeText({
          name: '卡片1标题', x: 187, y: 160, width: 320, height: 50, zIndex: 0,
          content: '第一层标题',
          fontFamily: '思源宋体, serif', fontSize: 28, fontWeight: 'bold', color: '#333333',
          textAlign: 'center', lineHeight: 1.2, letterSpacing: 3,
        }),
        makeText({
          name: '卡片1内容', x: 187, y: 230, width: 300, height: 60, zIndex: 1,
          content: '第一层内容介绍',
          fontFamily: '思源黑体, sans-serif', fontSize: 15, color: '#666666',
          textAlign: 'center', lineHeight: 1.8, letterSpacing: 1,
        }),
        // 模拟卡片2 - 中间区域
        makeText({
          name: '卡片2标题', x: 187, y: 340, width: 320, height: 40, zIndex: 2,
          content: '第二层标题',
          fontFamily: '思源黑体, sans-serif', fontSize: 22, fontWeight: 'bold', color: '#444444',
          textAlign: 'center', lineHeight: 1.2, letterSpacing: 2,
        }),
        makeText({
          name: '卡片2内容', x: 187, y: 400, width: 300, height: 60, zIndex: 3,
          content: '第二层详细信息',
          fontFamily: '思源黑体, sans-serif', fontSize: 14, color: '#777777',
          textAlign: 'center', lineHeight: 1.8, letterSpacing: 1,
        }),
        // 模拟卡片3 - 底部区域
        makeText({
          name: '卡片3标题', x: 187, y: 510, width: 320, height: 35, zIndex: 4,
          content: '第三层标题',
          fontFamily: '思源黑体, sans-serif', fontSize: 18, fontWeight: 'bold', color: '#555555',
          textAlign: 'center', lineHeight: 1.2, letterSpacing: 2,
        }),
        makeText({
          name: '卡片3内容', x: 187, y: 560, width: 300, height: 50, zIndex: 5,
          content: '时间地点联系方式',
          fontFamily: '思源黑体, sans-serif', fontSize: 13, color: '#888888',
          textAlign: 'center', lineHeight: 1.8, letterSpacing: 1,
        }),
      ],
    },
  },
]

export const ALL_PRESETS: TemplatePreset[] = [...SCENE_PRESETS, ...KZ_PRESETS, ...LAYOUT_PRESETS]

export function getPresetsByCategory(categoryId: string): TemplatePreset[] {
  return ALL_PRESETS.filter(p => p.category === categoryId)
}
