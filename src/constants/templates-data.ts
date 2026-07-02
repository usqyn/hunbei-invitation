import type { TemplateData, EditableElement, ElementStyle, TemplateItem } from '@/types'

// ============ 共享基础配置 ============
export const DEFAULT_ELEMENT_STYLE: ElementStyle = {
  font: '思源宋体',
  color: '#666666',
  fontSize: 12,
  spacing: 2,
  lineHeight: 2,
}

// ============ 【模板 1】婚礼 - 好久不见 ============
const WEDDING_1_DATA: TemplateData = {
  coverImage: '/static/images/templates/wedding-1.svg',
  coverTitle: '我们的婚礼',
  coverSubtitle: 'Our Wedding',
  photo1: '/static/images/templates/wedding-2.svg',
  photo2: '/static/images/templates/wedding-3.svg',
  photo3: '/static/images/templates/wedding-4.svg',
  photo4: '/static/images/templates/wedding-5.svg',
  photoTitle: '婚礼邀请函',
  photoSubtitle: 'Welcome to our wedding',
  footerText: '我们曾各自奔赴人海，直到目光交汇的那一刻\n才懂归属感的意义\n诚邀生命中重要的你\n共同见证这场"双向奔赴"的圆满',
  footerSubText: 'GROOM',
}

const WEDDING_1_ELEMENTS: EditableElement[] = [
  { type: 'image', text: '/static/images/templates/wedding-1.svg', dataKey: 'coverImage', label: '封面图片' },
  { type: 'text', text: '2050.05.20', label: '婚礼日期', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 36, color: '#ffffff' } },
  { type: 'text', text: '我们的婚礼', dataKey: 'coverTitle', label: '主标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 56, color: '#ffffff' } },
  { type: 'text', text: 'Our Wedding', dataKey: 'coverSubtitle', label: '英文副标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 28, color: 'rgba(255,255,255,0.9)' } },
  { type: 'text', text: '囍', label: '囍字', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 48, color: '#ff3366' } },
  { type: 'text', text: 'وشق', label: '装饰文字1', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 24, color: '#ffffff' } },
  { type: 'text', text: 'ارووجان', label: '装饰文字2', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 24, color: '#ffffff' } },
  { type: 'image', text: '/static/images/templates/wedding-2.svg', dataKey: 'photo1', label: '黑胶唱片图片' },
  { type: 'text', text: '婚礼邀请函', dataKey: 'photoTitle', label: '邀请函标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 40, color: '#333333' } },
  { type: 'text', text: 'Welcome to our wedding', dataKey: 'photoSubtitle', label: '英文标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 24, color: '#999999' } },
  { type: 'text', text: WEDDING_1_DATA.footerText, dataKey: 'footerText', label: '正文内容', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 26, color: '#666666' } },
]

// ============ 【模板 2】婚礼 - 适我愿兮 ============
const WEDDING_2_DATA: TemplateData = {
  coverImage: '/static/images/templates/wedding-2.svg',
  coverTitle: '适我愿兮',
  coverSubtitle: 'Love Forever',
  photo1: '/static/images/templates/wedding-3.svg',
  photo2: '/static/images/templates/wedding-4.svg',
  photo3: '/static/images/templates/wedding-5.svg',
  photo4: '/static/images/templates/wedding-6.svg',
  photoTitle: '我们的故事',
  photoSubtitle: 'OUR LOVE STORY',
  footerText: '执子之手，与子偕老\n愿我们的爱情\n如星辰般永恒闪耀',
  footerSubText: 'BRIDE',
}

const WEDDING_2_ELEMENTS: EditableElement[] = [
  { type: 'image', text: '/static/images/templates/wedding-2.svg', dataKey: 'coverImage', label: '封面图片' },
  { type: 'text', text: '2050.05.20', label: '婚礼日期', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 36, color: '#ffffff' } },
  { type: 'text', text: '适我愿兮', dataKey: 'coverTitle', label: '主标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 56, color: '#ffffff' } },
  { type: 'text', text: 'Love Forever', dataKey: 'coverSubtitle', label: '英文副标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 28, color: 'rgba(255,255,255,0.9)' } },
  { type: 'text', text: '囍', label: '囍字', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 48, color: '#e84a6e' } },
  { type: 'image', text: '/static/images/templates/wedding-3.svg', dataKey: 'photo1', label: '相册图片1' },
  { type: 'text', text: '我们的故事', dataKey: 'photoTitle', label: '故事标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 40, color: '#333333' } },
  { type: 'text', text: 'OUR LOVE STORY', dataKey: 'photoSubtitle', label: '英文标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 22, color: '#999999' } },
  { type: 'text', text: WEDDING_2_DATA.footerText, dataKey: 'footerText', label: '正文内容', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 26, color: '#666666' } },
]

// ============ 【模板 3】婚礼 - 简约中式 ============
const WEDDING_3_DATA: TemplateData = {
  coverImage: '/static/images/templates/wedding-3.svg',
  coverTitle: '佳偶天成',
  coverSubtitle: 'A PERFECT MATCH',
  photo1: '/static/images/templates/wedding-4.svg',
  photo2: '/static/images/templates/wedding-5.svg',
  photo3: '/static/images/templates/wedding-6.svg',
  photo4: '/static/images/templates/wedding-1.svg',
  photoTitle: '诚挚邀请',
  photoSubtitle: 'SINCERE INVITATION',
  footerText: '谨于公历二〇五〇年五月二十日\n假座婚贝大酒店\n举行结婚典礼\n敬备喜筵 恭候 台光',
  footerSubText: '囍',
}

const WEDDING_3_ELEMENTS: EditableElement[] = [
  { type: 'image', text: '/static/images/templates/wedding-3.svg', dataKey: 'coverImage', label: '封面图片' },
  { type: 'text', text: '二〇五〇 · 五 · 二十', label: '婚礼日期', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 32, color: '#ffffff' } },
  { type: 'text', text: '佳偶天成', dataKey: 'coverTitle', label: '主标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 60, color: '#ffffff' } },
  { type: 'text', text: 'A PERFECT MATCH', dataKey: 'coverSubtitle', label: '英文副标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 24, color: 'rgba(255,255,255,0.9)' } },
  { type: 'text', text: '囍', label: '囍字', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 56, color: '#c0392b' } },
  { type: 'image', text: '/static/images/templates/wedding-4.svg', dataKey: 'photo1', label: '相册图片' },
  { type: 'text', text: '诚挚邀请', dataKey: 'photoTitle', label: '邀请标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 38, color: '#333333' } },
  { type: 'text', text: 'SINCERE INVITATION', dataKey: 'photoSubtitle', label: '英文标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 20, color: '#999999' } },
  { type: 'text', text: WEDDING_3_DATA.footerText, dataKey: 'footerText', label: '正文内容', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 26, color: '#666666' } },
]

// ============ 【模板 4】节日 - 节日快乐 ============
const BIRTHDAY_1_DATA: TemplateData = {
  coverImage: '/static/images/templates/invitation-1.svg',
  coverTitle: '节日快乐',
  coverSubtitle: 'HAPPY HOLIDAY',
  photo1: '/static/images/templates/invitation-2.svg',
  photo2: '/static/images/templates/invitation-3.svg',
  photo3: '/static/images/templates/invitation-4.svg',
  photo4: '/static/images/templates/invitation-1.svg',
  photoTitle: '节日派对',
  photoSubtitle: 'Festival Party',
  footerText: '诚挚邀请您参加\n节日庆典\n一起度过难忘的时光\n愿所有美好如约而至',
  footerSubText: 'PARTY',
}

const BIRTHDAY_1_ELEMENTS: EditableElement[] = [
  { type: 'image', text: '/static/images/templates/invitation-1.svg', dataKey: 'coverImage', label: '封面图片' },
  { type: 'text', text: '2050.06.15', label: '节日日期', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 36, color: '#ffffff' } },
  { type: 'text', text: '节日快乐', dataKey: 'coverTitle', label: '主标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 56, color: '#ffffff' } },
  { type: 'text', text: 'HAPPY HOLIDAY', dataKey: 'coverSubtitle', label: '英文副标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 24, color: 'rgba(255,255,255,0.9)' } },
  { type: 'image', text: '/static/images/categories/festival-invitation.svg', label: '节日图标' },
  { type: 'image', text: '/static/images/templates/invitation-2.svg', dataKey: 'photo1', label: '派对图片' },
  { type: 'text', text: '节日派对', dataKey: 'photoTitle', label: '节日标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 40, color: '#333333' } },
  { type: 'text', text: 'Festival Party', dataKey: 'photoSubtitle', label: '英文标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 22, color: '#999999' } },
  { type: 'text', text: BIRTHDAY_1_DATA.footerText, dataKey: 'footerText', label: '正文内容', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 26, color: '#666666' } },
]

// ============ 【模板 5】节日 - 甜蜜派对 ============
const BIRTHDAY_2_DATA: TemplateData = {
  coverImage: '/static/images/templates/invitation-2.svg',
  coverTitle: '甜蜜派对',
  coverSubtitle: 'SWEET PARTY',
  photo1: '/static/images/templates/invitation-3.svg',
  photo2: '/static/images/templates/invitation-4.svg',
  photo3: '/static/images/templates/invitation-1.svg',
  photo4: '/static/images/templates/invitation-2.svg',
  photoTitle: '美好时光',
  photoSubtitle: 'GOOD TIMES',
  footerText: '在这个特别的日子里\n邀请亲爱的朋友\n一起分享喜悦与祝福\n让这份快乐永远铭记',
  footerSubText: 'JOY',
}

const BIRTHDAY_2_ELEMENTS: EditableElement[] = [
  { type: 'image', text: '/static/images/templates/invitation-2.svg', dataKey: 'coverImage', label: '封面图片' },
  { type: 'text', text: '2050.06.15', label: '节日日期', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 36, color: '#ffffff' } },
  { type: 'text', text: '甜蜜派对', dataKey: 'coverTitle', label: '主标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 56, color: '#ffffff' } },
  { type: 'text', text: 'SWEET PARTY', dataKey: 'coverSubtitle', label: '英文副标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 24, color: 'rgba(255,255,255,0.9)' } },
  { type: 'image', text: '/static/images/icons/party.svg', label: '派对图标' },
  { type: 'image', text: '/static/images/templates/invitation-3.svg', dataKey: 'photo1', label: '派对图片' },
  { type: 'text', text: '美好时光', dataKey: 'photoTitle', label: '标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 40, color: '#333333' } },
  { type: 'text', text: 'GOOD TIMES', dataKey: 'photoSubtitle', label: '英文标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 22, color: '#999999' } },
  { type: 'text', text: BIRTHDAY_2_DATA.footerText, dataKey: 'footerText', label: '正文内容', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 26, color: '#666666' } },
]

// ============ 【模板 6】宝宝 - 满月宴 ============
const BABY_1_DATA: TemplateData = {
  coverImage: '/static/images/templates/template-1.svg',
  coverTitle: '满月宴',
  coverSubtitle: 'BABY SHOWER',
  photo1: '/static/images/templates/template-2.svg',
  photo2: '/static/images/templates/template-3.svg',
  photo3: '/static/images/templates/template-4.svg',
  photo4: '/static/images/templates/template-5.svg',
  photoTitle: '宝宝的到来',
  photoSubtitle: 'Welcome Baby',
  footerText: '欢迎我们的小天使降临\n您的到来让家庭更加美满\n诚挚邀请您一起见证\n这份喜悦与幸福',
  footerSubText: 'BABY',
}

const BABY_1_ELEMENTS: EditableElement[] = [
  { type: 'image', text: '/static/images/templates/template-1.svg', dataKey: 'coverImage', label: '封面图片' },
  { type: 'text', text: '2050.08.20', label: '满月日期', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 36, color: '#ffffff' } },
  { type: 'text', text: '满月宴', dataKey: 'coverTitle', label: '主标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 56, color: '#ffffff' } },
  { type: 'text', text: 'BABY SHOWER', dataKey: 'coverSubtitle', label: '英文副标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 24, color: 'rgba(255,255,255,0.9)' } },
  { type: 'image', text: '/static/images/categories/baby.jpg', label: '宝宝图标' },
  { type: 'image', text: '/static/images/templates/template-2.svg', dataKey: 'photo1', label: '宝宝图片' },
  { type: 'text', text: '宝宝的到来', dataKey: 'photoTitle', label: '标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 40, color: '#333333' } },
  { type: 'text', text: 'Welcome Baby', dataKey: 'photoSubtitle', label: '英文标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 22, color: '#999999' } },
  { type: 'text', text: BABY_1_DATA.footerText, dataKey: 'footerText', label: '正文内容', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 26, color: '#666666' } },
]

// ============ 【模板 7】宝宝 - 百日宴 ============
const BABY_2_DATA: TemplateData = {
  coverImage: '/static/images/templates/template-5.svg',
  coverTitle: '百日宴',
  coverSubtitle: '100 DAYS CELEBRATION',
  photo1: '/static/images/templates/template-1.svg',
  photo2: '/static/images/templates/template-2.svg',
  photo3: '/static/images/templates/template-3.svg',
  photo4: '/static/images/templates/template-4.svg',
  photoTitle: '幸福时刻',
  photoSubtitle: 'HAPPY MOMENTS',
  footerText: '小宝宝诞生已满百日\n这份喜悦希望与您分享\n特备薄宴 敬请光临\n共同祝福宝宝健康成长',
  footerSubText: 'LOVE',
}

const BABY_2_ELEMENTS: EditableElement[] = [
  { type: 'image', text: '/static/images/templates/template-5.svg', dataKey: 'coverImage', label: '封面图片' },
  { type: 'text', text: '2050.08.20', label: '百日日期', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 36, color: '#ffffff' } },
  { type: 'text', text: '百日宴', dataKey: 'coverTitle', label: '主标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 56, color: '#ffffff' } },
  { type: 'text', text: '100 DAYS CELEBRATION', dataKey: 'coverSubtitle', label: '英文副标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 22, color: 'rgba(255,255,255,0.9)' } },
  { type: 'image', text: '/static/images/icons/teddy.svg', label: '装饰图标' },
  { type: 'image', text: '/static/images/templates/template-1.svg', dataKey: 'photo1', label: '宝宝图片' },
  { type: 'text', text: '幸福时刻', dataKey: 'photoTitle', label: '标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 40, color: '#333333' } },
  { type: 'text', text: 'HAPPY MOMENTS', dataKey: 'photoSubtitle', label: '英文标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 22, color: '#999999' } },
  { type: 'text', text: BABY_2_DATA.footerText, dataKey: 'footerText', label: '正文内容', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 26, color: '#666666' } },
]

// ============ 【模板 8】毕业 - 升学宴 ============
const GRADUATION_1_DATA: TemplateData = {
  coverImage: '/static/images/templates/moments-1.svg',
  coverTitle: '升学宴',
  coverSubtitle: 'GRADUATION',
  photo1: '/static/images/templates/moments-2.svg',
  photo2: '/static/images/templates/template-1.svg',
  photo3: '/static/images/templates/template-2.svg',
  photo4: '/static/images/templates/moments-1.svg',
  photoTitle: '青春不散场',
  photoSubtitle: 'Forever Young',
  footerText: '时光荏苒，岁月如梭\n我们即将告别校园\n踏上新的征程\n愿友谊长存，前程似锦',
  footerSubText: 'GRADUATION',
}

const GRADUATION_1_ELEMENTS: EditableElement[] = [
  { type: 'image', text: '/static/images/templates/moments-1.svg', dataKey: 'coverImage', label: '封面图片' },
  { type: 'text', text: '2050.07.01', label: '毕业日期', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 36, color: '#ffffff' } },
  { type: 'text', text: '升学宴', dataKey: 'coverTitle', label: '主标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 56, color: '#ffffff' } },
  { type: 'text', text: 'GRADUATION', dataKey: 'coverSubtitle', label: '英文副标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 24, color: 'rgba(255,255,255,0.9)' } },
  { type: 'image', text: '/static/images/categories/graduation.svg', label: '学士帽图标' },
  { type: 'image', text: '/static/images/templates/moments-2.svg', dataKey: 'photo1', label: '毕业图片' },
  { type: 'text', text: '青春不散场', dataKey: 'photoTitle', label: '标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 40, color: '#333333' } },
  { type: 'text', text: 'Forever Young', dataKey: 'photoSubtitle', label: '英文标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 22, color: '#999999' } },
  { type: 'text', text: GRADUATION_1_DATA.footerText, dataKey: 'footerText', label: '正文内容', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 26, color: '#666666' } },
]

// ============ 【模板 9】毕业 - 青春纪念 ============
const GRADUATION_2_DATA: TemplateData = {
  coverImage: '/static/images/templates/moments-2.svg',
  coverTitle: '青春纪念册',
  coverSubtitle: 'MEMORIES OF YOUTH',
  photo1: '/static/images/templates/moments-1.svg',
  photo2: '/static/images/templates/template-3.svg',
  photo3: '/static/images/templates/template-4.svg',
  photo4: '/static/images/templates/moments-2.svg',
  photoTitle: '同学情',
  photoSubtitle: 'CLASSMATES',
  footerText: '四年同窗 情深似海\n一朝分离 前程似锦\n愿你我记住这段时光\n在未来的道路上勇敢前行',
  footerSubText: '✦',
}

const GRADUATION_2_ELEMENTS: EditableElement[] = [
  { type: 'image', text: '/static/images/templates/moments-2.svg', dataKey: 'coverImage', label: '封面图片' },
  { type: 'text', text: '2050.07.01', label: '毕业日期', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 36, color: '#ffffff' } },
  { type: 'text', text: '青春纪念册', dataKey: 'coverTitle', label: '主标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 52, color: '#ffffff' } },
  { type: 'text', text: 'MEMORIES OF YOUTH', dataKey: 'coverSubtitle', label: '英文副标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 22, color: 'rgba(255,255,255,0.9)' } },
  { type: 'image', text: '/static/images/categories/graduation.svg', label: '装饰图标' },
  { type: 'image', text: '/static/images/templates/moments-1.svg', dataKey: 'photo1', label: '毕业图片' },
  { type: 'text', text: '同学情', dataKey: 'photoTitle', label: '标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 40, color: '#333333' } },
  { type: 'text', text: 'CLASSMATES', dataKey: 'photoSubtitle', label: '英文标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 22, color: '#999999' } },
  { type: 'text', text: GRADUATION_2_DATA.footerText, dataKey: 'footerText', label: '正文内容', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 26, color: '#666666' } },
]

// ============ 【模板 10】节日 - 新年快乐 ============
const FESTIVAL_1_DATA: TemplateData = {
  coverImage: '/static/images/templates/invitation-3.svg',
  coverTitle: '新年快乐',
  coverSubtitle: 'HAPPY NEW YEAR',
  photo1: '/static/images/templates/invitation-4.svg',
  photo2: '/static/images/templates/wedding-3.svg',
  photo3: '/static/images/templates/invitation-1.svg',
  photo4: '/static/images/templates/invitation-2.svg',
  photoTitle: '恭贺新禧',
  photoSubtitle: 'Best Wishes',
  footerText: '新年的钟声即将敲响\n愿您在新的一年里\n万事如意，心想事成\n阖家幸福，身体健康',
  footerSubText: 'NEW YEAR',
}

const FESTIVAL_1_ELEMENTS: EditableElement[] = [
  { type: 'image', text: '/static/images/templates/invitation-3.svg', dataKey: 'coverImage', label: '封面图片' },
  { type: 'text', text: '2051.01.01', label: '节日日期', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 36, color: '#ffffff' } },
  { type: 'text', text: '新年快乐', dataKey: 'coverTitle', label: '主标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 56, color: '#ffffff' } },
  { type: 'text', text: 'HAPPY NEW YEAR', dataKey: 'coverSubtitle', label: '英文副标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 24, color: 'rgba(255,255,255,0.9)' } },
  { type: 'image', text: '/static/images/icons/confetti.svg', label: '庆祝图标' },
  { type: 'image', text: '/static/images/templates/invitation-4.svg', dataKey: 'photo1', label: '节日图片' },
  { type: 'text', text: '恭贺新禧', dataKey: 'photoTitle', label: '标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 40, color: '#333333' } },
  { type: 'text', text: 'Best Wishes', dataKey: 'photoSubtitle', label: '英文标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 22, color: '#999999' } },
  { type: 'text', text: FESTIVAL_1_DATA.footerText, dataKey: 'footerText', label: '正文内容', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 26, color: '#666666' } },
]

// ============ 【模板 11】节日 - 中秋团圆 ============
const FESTIVAL_2_DATA: TemplateData = {
  coverImage: '/static/images/templates/invitation-4.svg',
  coverTitle: '中秋团圆',
  coverSubtitle: 'MID-AUTUMN FESTIVAL',
  photo1: '/static/images/templates/invitation-1.svg',
  photo2: '/static/images/templates/invitation-2.svg',
  photo3: '/static/images/templates/invitation-3.svg',
  photo4: '/static/images/templates/invitation-4.svg',
  photoTitle: '花好月圆',
  photoSubtitle: 'FULL MOON',
  footerText: '明月几时有 把酒问青天\n不知天上宫阙 今夕是何年\n中秋佳节 邀您共赏明月\n品月饼 话团圆',
  footerSubText: 'FULL MOON',
}

const FESTIVAL_2_ELEMENTS: EditableElement[] = [
  { type: 'image', text: '/static/images/templates/invitation-4.svg', dataKey: 'coverImage', label: '封面图片' },
  { type: 'text', text: '2050.09.21', label: '中秋日期', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 36, color: '#ffffff' } },
  { type: 'text', text: '中秋团圆', dataKey: 'coverTitle', label: '主标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 56, color: '#ffffff' } },
  { type: 'text', text: 'MID-AUTUMN FESTIVAL', dataKey: 'coverSubtitle', label: '英文副标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 22, color: 'rgba(255,255,255,0.9)' } },
  { type: 'image', text: '/static/images/icons/moon.svg', label: '节日图标' },
  { type: 'image', text: '/static/images/templates/invitation-1.svg', dataKey: 'photo1', label: '中秋图片' },
  { type: 'text', text: '花好月圆', dataKey: 'photoTitle', label: '标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 40, color: '#333333' } },
  { type: 'text', text: 'FULL MOON', dataKey: 'photoSubtitle', label: '英文标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 22, color: '#999999' } },
  { type: 'text', text: FESTIVAL_2_DATA.footerText, dataKey: 'footerText', label: '正文内容', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 26, color: '#666666' } },
]

// ============ 【模板 12】商务 - 公司年会 ============
const BUSINESS_1_DATA: TemplateData = {
  coverImage: '/static/images/templates/template-3.svg',
  coverTitle: '公司年会',
  coverSubtitle: 'ANNUAL MEETING',
  photo1: '/static/images/templates/template-4.svg',
  photo2: '/static/images/templates/wedding-4.svg',
  photo3: '/static/images/templates/template-3.svg',
  photo4: '/static/images/templates/template-3.svg',
  photoTitle: '携手同行',
  photoSubtitle: 'Together',
  footerText: '感谢您一年来的辛勤付出\n诚挚邀请您出席\n公司年度盛典\n让我们共同见证辉煌时刻',
  footerSubText: 'COMPANY',
}

const BUSINESS_1_ELEMENTS: EditableElement[] = [
  { type: 'image', text: '/static/images/templates/template-3.svg', dataKey: 'coverImage', label: '封面图片' },
  { type: 'text', text: '2050.12.31', label: '年会日期', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 36, color: '#ffffff' } },
  { type: 'text', text: '公司年会', dataKey: 'coverTitle', label: '主标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 56, color: '#ffffff' } },
  { type: 'text', text: 'ANNUAL MEETING', dataKey: 'coverSubtitle', label: '英文副标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 24, color: 'rgba(255,255,255,0.9)' } },
  { type: 'image', text: '/static/images/icons/building.svg', label: '公司图标' },
  { type: 'image', text: '/static/images/templates/template-4.svg', dataKey: 'photo1', label: '公司图片' },
  { type: 'text', text: '携手同行', dataKey: 'photoTitle', label: '标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 40, color: '#333333' } },
  { type: 'text', text: 'Together', dataKey: 'photoSubtitle', label: '英文标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 22, color: '#999999' } },
  { type: 'text', text: BUSINESS_1_DATA.footerText, dataKey: 'footerText', label: '正文内容', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 26, color: '#666666' } },
]

// ============ 【模板 13】商务 - 新品发布会 ============
const BUSINESS_2_DATA: TemplateData = {
  coverImage: '/static/images/templates/template-4.svg',
  coverTitle: '新品发布',
  coverSubtitle: 'NEW PRODUCT LAUNCH',
  photo1: '/static/images/templates/template-3.svg',
  photo2: '/static/images/templates/template-5.svg',
  photo3: '/static/images/templates/template-4.svg',
  photo4: '/static/images/templates/template-4.svg',
  photoTitle: '创新未来',
  photoSubtitle: 'INNOVATE THE FUTURE',
  footerText: '诚邀阁下莅临\n公司新品发布会\n共同见证创新成果\n开启合作共赢新篇章',
  footerSubText: 'INVITATION',
}

const BUSINESS_2_ELEMENTS: EditableElement[] = [
  { type: 'image', text: '/static/images/templates/template-4.svg', dataKey: 'coverImage', label: '封面图片' },
  { type: 'text', text: '2050.11.15', label: '发布日期', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 36, color: '#ffffff' } },
  { type: 'text', text: '新品发布', dataKey: 'coverTitle', label: '主标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 56, color: '#ffffff' } },
  { type: 'text', text: 'NEW PRODUCT LAUNCH', dataKey: 'coverSubtitle', label: '英文副标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 22, color: 'rgba(255,255,255,0.9)' } },
  { type: 'image', text: '/static/images/icons/rocket.svg', label: '装饰图标' },
  { type: 'image', text: '/static/images/templates/template-3.svg', dataKey: 'photo1', label: '产品图片' },
  { type: 'text', text: '创新未来', dataKey: 'photoTitle', label: '标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 40, color: '#333333' } },
  { type: 'text', text: 'INNOVATE THE FUTURE', dataKey: 'photoSubtitle', label: '英文标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 20, color: '#999999' } },
  { type: 'text', text: BUSINESS_2_DATA.footerText, dataKey: 'footerText', label: '正文内容', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 26, color: '#666666' } },
]

// ============ 【模板 14】求婚 - 最美的遇见 ============
const PROPOSAL_1_DATA: TemplateData = {
  coverImage: '/static/images/templates/template-1.svg',
  coverTitle: '嫁给我吧',
  coverSubtitle: 'MARRY ME',
  photo1: '/static/images/templates/wedding-2.svg',
  photo2: '/static/images/templates/wedding-3.svg',
  photo3: '/static/images/templates/wedding-4.svg',
  photo4: '/static/images/templates/wedding-5.svg',
  photoTitle: '一生一世',
  photoSubtitle: 'FOREVER & ALWAYS',
  footerText: '从遇见你的那一天起\n我的世界便充满了色彩\n想和你一起走过每个春夏秋冬\n让余生因你而完整',
  footerSubText: 'LOVE',
}

const PROPOSAL_1_ELEMENTS: EditableElement[] = [
  { type: 'image', text: '/static/images/templates/template-1.svg', dataKey: 'coverImage', label: '封面图片' },
  { type: 'text', text: '2050.06.15', label: '求婚日期', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 36, color: '#ffffff' } },
  { type: 'text', text: '嫁给我吧', dataKey: 'coverTitle', label: '主标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 56, color: '#ffffff' } },
  { type: 'text', text: 'MARRY ME', dataKey: 'coverSubtitle', label: '英文副标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 24, color: 'rgba(255,255,255,0.9)' } },
  { type: 'image', text: '/static/images/categories/proposal.jpg', label: '求婚图标' },
  { type: 'image', text: '/static/images/templates/wedding-2.svg', dataKey: 'photo1', label: '相册图片' },
  { type: 'text', text: '一生一世', dataKey: 'photoTitle', label: '标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 40, color: '#333333' } },
  { type: 'text', text: 'FOREVER & ALWAYS', dataKey: 'photoSubtitle', label: '英文标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 22, color: '#999999' } },
  { type: 'text', text: PROPOSAL_1_DATA.footerText, dataKey: 'footerText', label: '正文内容', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 26, color: '#666666' } },
]

// ============ 【模板 15】商量茶 - 喜结良缘 ============
const CONSULTATION_TEA_1_DATA: TemplateData = {
  coverImage: '/static/images/templates/template-2.svg',
  coverTitle: '喜结良缘',
  coverSubtitle: 'A PERFECT MATCH',
  photo1: '/static/images/templates/wedding-4.svg',
  photo2: '/static/images/templates/wedding-5.svg',
  photo3: '/static/images/templates/wedding-6.svg',
  photo4: '/static/images/templates/wedding-1.svg',
  photoTitle: '以茶为媒',
  photoSubtitle: 'TEA CEREMONY',
  footerText: '诚邀您参加我们的商量茶仪式\n一杯清茶 两姓联姻\n共商良辰美景\n一同见证我们的幸福时刻',
  footerSubText: 'TEA',
}

const CONSULTATION_TEA_1_ELEMENTS: EditableElement[] = [
  { type: 'image', text: '/static/images/templates/template-2.svg', dataKey: 'coverImage', label: '封面图片' },
  { type: 'text', text: '2050.07.01', label: '商量茶日期', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 36, color: '#ffffff' } },
  { type: 'text', text: '喜结良缘', dataKey: 'coverTitle', label: '主标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 56, color: '#ffffff' } },
  { type: 'text', text: 'A PERFECT MATCH', dataKey: 'coverSubtitle', label: '英文副标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 24, color: 'rgba(255,255,255,0.9)' } },
  { type: 'image', text: '/static/images/categories/consultation-tea.jpg', label: '商量茶图标' },
  { type: 'image', text: '/static/images/templates/wedding-4.svg', dataKey: 'photo1', label: '相册图片' },
  { type: 'text', text: '以茶为媒', dataKey: 'photoTitle', label: '标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 40, color: '#333333' } },
  { type: 'text', text: 'TEA CEREMONY', dataKey: 'photoSubtitle', label: '英文标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 22, color: '#999999' } },
  { type: 'text', text: CONSULTATION_TEA_1_DATA.footerText, dataKey: 'footerText', label: '正文内容', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 26, color: '#666666' } },
]

// ============ 【模板 16】乔迁 - 乔迁之喜 ============
const HOUSEWARMING_1_DATA: TemplateData = {
  coverImage: '/static/images/templates/template-3.svg',
  coverTitle: '乔迁之喜',
  coverSubtitle: 'HOUSEWARMING',
  photo1: '/static/images/templates/template-4.svg',
  photo2: '/static/images/templates/template-5.svg',
  photo3: '/static/images/templates/wedding-1.svg',
  photo4: '/static/images/templates/wedding-2.svg',
  photoTitle: '新居落成',
  photoSubtitle: 'NEW HOME',
  footerText: '新居落成 吉日迁居\n诚挚邀请您光临寒舍\n共庆乔迁之喜\n薄酒一杯 恭候大驾',
  footerSubText: 'HOME',
}

const HOUSEWARMING_1_ELEMENTS: EditableElement[] = [
  { type: 'image', text: '/static/images/templates/template-3.svg', dataKey: 'coverImage', label: '封面图片' },
  { type: 'text', text: '2050.09.10', label: '乔迁日期', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 36, color: '#ffffff' } },
  { type: 'text', text: '乔迁之喜', dataKey: 'coverTitle', label: '主标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 56, color: '#ffffff' } },
  { type: 'text', text: 'HOUSEWARMING', dataKey: 'coverSubtitle', label: '英文副标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 24, color: 'rgba(255,255,255,0.9)' } },
  { type: 'image', text: '/static/images/categories/housewarming.jpg', label: '乔迁图标' },
  { type: 'image', text: '/static/images/templates/template-4.svg', dataKey: 'photo1', label: '新居图片' },
  { type: 'text', text: '新居落成', dataKey: 'photoTitle', label: '标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 40, color: '#333333' } },
  { type: 'text', text: 'NEW HOME', dataKey: 'photoSubtitle', label: '英文标题', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 22, color: '#999999' } },
  { type: 'text', text: HOUSEWARMING_1_DATA.footerText, dataKey: 'footerText', label: '正文内容', style: { ...DEFAULT_ELEMENT_STYLE, fontSize: 26, color: '#666666' } },
]

// ============ 模板总列表 ============
export const TEMPLATE_LIST: TemplateItem[] = [
  {
    id: 'wedding-1',
    name: '好久不见',
    subtitle: '双向奔赴的爱情',
    category: 'wedding',
    cover: '/static/images/templates/wedding-1.svg',
    likes: 639400,
    pageCount: 15,
    data: WEDDING_1_DATA,
    elements: WEDDING_1_ELEMENTS,
    primaryColor: '#e84a6e',
    tags: ['网红爆款', '新婚'],
  },
  {
    id: 'wedding-2',
    name: '适我愿兮',
    subtitle: '永恒的誓言',
    category: 'wedding',
    cover: '/static/images/templates/wedding-2.svg',
    likes: 452100,
    pageCount: 12,
    data: WEDDING_2_DATA,
    elements: WEDDING_2_ELEMENTS,
    primaryColor: '#ff6b8a',
    tags: ['网红爆款', '新婚'],
  },
  {
    id: 'wedding-3',
    name: '佳偶天成',
    subtitle: '简约中式婚礼',
    category: 'wedding',
    cover: '/static/images/templates/wedding-3.svg',
    likes: 387600,
    pageCount: 14,
    data: WEDDING_3_DATA,
    elements: WEDDING_3_ELEMENTS,
    primaryColor: '#c0392b',
    tags: ['网红爆款', '新婚'],
  },
  {
    id: 'festival-invitation-1',
    name: '节日快乐',
    subtitle: '难忘的节日时光',
    category: 'festival-invitation',
    cover: '/static/images/templates/invitation-1.svg',
    likes: 285600,
    pageCount: 10,
    data: BIRTHDAY_1_DATA,
    elements: BIRTHDAY_1_ELEMENTS,
    primaryColor: '#f39c12',
    tags: ['网红爆款', '节日邀请'],
  },
  {
    id: 'festival-invitation-2',
    name: '甜蜜派对',
    subtitle: '分享美好时光',
    category: 'festival-invitation',
    cover: '/static/images/templates/invitation-2.svg',
    likes: 198700,
    pageCount: 10,
    data: BIRTHDAY_2_DATA,
    elements: BIRTHDAY_2_ELEMENTS,
    primaryColor: '#ff9f43',
    tags: ['网红爆款', '节日邀请'],
  },
  {
    id: 'baby-1',
    name: '满月宴',
    subtitle: '小天使降临',
    category: 'baby',
    cover: '/static/images/templates/template-1.svg',
    likes: 198300,
    pageCount: 10,
    data: BABY_1_DATA,
    elements: BABY_1_ELEMENTS,
    primaryColor: '#3498db',
    tags: ['网红爆款'],
  },
  {
    id: 'baby-2',
    name: '百日宴',
    subtitle: '幸福时刻记录',
    category: 'baby',
    cover: '/static/images/templates/template-5.svg',
    likes: 156200,
    pageCount: 10,
    data: BABY_2_DATA,
    elements: BABY_2_ELEMENTS,
    primaryColor: '#6c5ce7',
    tags: ['网红爆款'],
  },
  {
    id: 'graduation-1',
    name: '升学宴',
    subtitle: '青春不散场',
    category: 'graduation',
    cover: '/static/images/templates/moments-1.svg',
    likes: 156700,
    pageCount: 12,
    data: GRADUATION_1_DATA,
    elements: GRADUATION_1_ELEMENTS,
    primaryColor: '#9b59b6',
    tags: ['限时免费'],
  },
  {
    id: 'graduation-2',
    name: '青春纪念册',
    subtitle: '同学情永不忘',
    category: 'graduation',
    cover: '/static/images/templates/moments-2.svg',
    likes: 124500,
    pageCount: 12,
    data: GRADUATION_2_DATA,
    elements: GRADUATION_2_ELEMENTS,
    primaryColor: '#74b9ff',
    tags: ['限时免费'],
  },
  {
    id: 'festival-1',
    name: '新年快乐',
    subtitle: '美好祝福送给您',
    category: 'festival',
    cover: '/static/images/templates/invitation-3.svg',
    likes: 378200,
    pageCount: 10,
    data: FESTIVAL_1_DATA,
    elements: FESTIVAL_1_ELEMENTS,
    primaryColor: '#e74c3c',
    tags: ['限时免费'],
  },
  {
    id: 'festival-2',
    name: '中秋团圆',
    subtitle: '花好月圆人团圆',
    category: 'festival',
    cover: '/static/images/templates/invitation-4.svg',
    likes: 256800,
    pageCount: 10,
    data: FESTIVAL_2_DATA,
    elements: FESTIVAL_2_ELEMENTS,
    primaryColor: '#ffa502',
    tags: ['限时免费'],
  },
  {
    id: 'business-1',
    name: '公司年会',
    subtitle: '携手共创辉煌',
    category: 'business',
    cover: '/static/images/templates/template-3.svg',
    likes: 89400,
    pageCount: 10,
    data: BUSINESS_1_DATA,
    elements: BUSINESS_1_ELEMENTS,
    primaryColor: '#2ecc71',
    tags: ['限时免费'],
  },
  {
    id: 'business-2',
    name: '新品发布',
    subtitle: '创新引领未来',
    category: 'business',
    cover: '/static/images/templates/template-4.svg',
    likes: 76500,
    pageCount: 10,
    data: BUSINESS_2_DATA,
    elements: BUSINESS_2_ELEMENTS,
    primaryColor: '#00cec9',
    tags: ['限时免费'],
  },
  {
    id: 'proposal-1',
    name: '最美的遇见',
    subtitle: '一见钟情 此生不渝',
    category: 'proposal',
    cover: '/static/images/templates/template-1.svg',
    likes: 215600,
    pageCount: 10,
    data: PROPOSAL_1_DATA,
    elements: PROPOSAL_1_ELEMENTS,
    primaryColor: '#9b59b6',
    tags: ['网红爆款'],
  },
  {
    id: 'consultation-tea-1',
    name: '喜结良缘',
    subtitle: '以茶为媒 共话未来',
    category: 'consultation-tea',
    cover: '/static/images/templates/template-2.svg',
    likes: 156300,
    pageCount: 10,
    data: CONSULTATION_TEA_1_DATA,
    elements: CONSULTATION_TEA_1_ELEMENTS,
    primaryColor: '#e67e22',
    tags: ['网红爆款'],
  },
  {
    id: 'housewarming-1',
    name: '乔迁之喜',
    subtitle: '新居落成 鸿运当头',
    category: 'housewarming',
    cover: '/static/images/templates/template-3.svg',
    likes: 187400,
    pageCount: 10,
    data: HOUSEWARMING_1_DATA,
    elements: HOUSEWARMING_1_ELEMENTS,
    primaryColor: '#e74c3c',
    tags: ['网红爆款'],
  },
]

export const DEFAULT_TEMPLATE_ID = 'wedding-1'
