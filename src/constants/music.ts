import type { Music } from '@/types'

export const MUSIC_TABS = [
  { key: 'music', name: '音乐库' },
  { key: 'local', name: '本地上传' },
]

export const MUSIC_TAGS = ['全部', '欢快', '安静', '抖音', '纯音乐']

export const MUSIC_LIST: Music[] = [
  { id: 2, name: '告白气球', hot: true, tag: '欢快' },
  { id: 3, name: '我们结婚啦（恶作剧之吻原声）', hot: true, tag: '欢快' },
  { id: 4, name: '执子之手-宝石Gem、一哩哩一', hot: true, tag: '欢快' },
  { id: 5, name: "It's You-HENRY刘宪华", hot: true, tag: '安静' },
  { id: 6, name: '我是如此相信', hot: true, tag: '安静' },
  { id: 7, name: '就是爱你', hot: false, tag: '安静' },
  { id: 8, name: '因你而在-林俊杰', hot: false, tag: '抖音' },
  { id: 9, name: 'Lucky Me-Jake Miller', hot: false, tag: '纯音乐' },
  { id: 10, name: '繁花（剪辑版）', hot: false, tag: '纯音乐' },
  { id: 11, name: '爱你', hot: true, tag: '抖音' },
  { id: 12, name: '往后余生', hot: false, tag: '安静' },
  { id: 13, name: '小幸运', hot: true, tag: '欢快' },
  { id: 14, name: '最美的期待', hot: false, tag: '抖音' },
  { id: 15, name: '刚好遇见你', hot: false, tag: '欢快' },
]

export const DEFAULT_MUSIC: Music = { id: 1, name: 'Lucky Me-Jake Miller' }
