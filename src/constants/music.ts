// TODO: fetchMusicFromApi 是网络请求函数，应迁移到 api/index.ts 或 utils/request.ts 中
import type { Music } from '@/types'
import { API_BASE } from '@/config'

export const MUSIC_TABS = [
  { key: 'music', label: '音乐库' },
  { key: 'local', label: '本地上传' },
]

export const MUSIC_TAGS = ['全部', '欢快', '安静', '抖音', '纯音乐']

// 默认音乐列表 — 作为离线/加载时的后备
export const MUSIC_LIST: Music[] = [
  { id: 2, name: '告白气球', hot: true, tag: '欢快', src: `${API_BASE}/uploads/music/happy-1.mp3` },
  { id: 3, name: '我们结婚啦', hot: true, tag: '欢快', src: `${API_BASE}/uploads/music/happy-2.mp3` },
  { id: 4, name: '执子之手', hot: true, tag: '欢快', src: `${API_BASE}/uploads/music/happy-3.mp3` },
  { id: 5, name: "It's You", hot: true, tag: '安静', src: `${API_BASE}/uploads/music/calm-1.mp3` },
  { id: 6, name: '我是如此相信', hot: true, tag: '安静', src: `${API_BASE}/uploads/music/calm-2.mp3` },
  { id: 7, name: '就是爱你', hot: false, tag: '安静', src: `${API_BASE}/uploads/music/calm-3.mp3` },
  { id: 8, name: '因你而在', hot: false, tag: '抖音', src: `${API_BASE}/uploads/music/douyin-1.mp3` },
  { id: 9, name: 'Lucky Me', hot: false, tag: '纯音乐', src: `${API_BASE}/uploads/music/instrumental-1.mp3` },
  { id: 10, name: '繁花（剪辑版）', hot: false, tag: '纯音乐', src: `${API_BASE}/uploads/music/instrumental-2.mp3` },
  { id: 11, name: '爱你', hot: true, tag: '抖音', src: `${API_BASE}/uploads/music/douyin-2.mp3` },
  { id: 12, name: '往后余生', hot: false, tag: '安静', src: `${API_BASE}/uploads/music/calm-4.mp3` },
  { id: 13, name: '小幸运', hot: true, tag: '欢快', src: `${API_BASE}/uploads/music/happy-4.mp3` },
  { id: 14, name: '最美的期待', hot: false, tag: '抖音', src: `${API_BASE}/uploads/music/douyin-3.mp3` },
  { id: 15, name: '刚好遇见你', hot: false, tag: '欢快', src: `${API_BASE}/uploads/music/happy-5.mp3` },
]

export const DEFAULT_MUSIC: Music = {
  id: 1,
  name: 'Lucky Me',
  src: `${API_BASE}/uploads/music/instrumental-1.mp3`,
}

/**
 * 从服务端获取音乐列表，失败时回退到本地列表
 */
export async function fetchMusicFromApi(tag?: string): Promise<Music[]> {
  try {
    const query = tag && tag !== '全部' ? `?tag=${encodeURIComponent(tag)}` : ''
    const url = `${API_BASE}/api/music${query}`
    return await new Promise<Music[]>((resolve, reject) => {
      uni.request({
        url,
        method: 'GET',
        timeout: 8000,
        success: (res: any) => {
          if (res.data?.success && Array.isArray(res.data.data)) {
            resolve(res.data.data)
          } else {
            reject(new Error('Invalid response'))
          }
        },
        fail: reject,
      })
    })
  } catch (e) {
    console.warn('fetchMusicFromApi failed, using fallback list:', e)
  }
  return tag && tag !== '全部' ? MUSIC_LIST.filter(m => m.tag === tag) : MUSIC_LIST
}
