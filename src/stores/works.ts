import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Work } from '@/types'
import { useUserStore } from './user'
import { addFavorite, removeFavorite, fetchFavorites, saveWorkApi, updateWorkApi, fetchWorksApi, deleteWorkApi } from '@/api'
import { resolveUrl } from '@/utils/url'

const STORAGE_KEY = 'hunbei_works'

export const useWorksStore = defineStore('works', () => {
  const works = ref<Work[]>([])
  const drafts = ref<Work[]>([])
  const favorites = ref<Work[]>([])
  const loading = ref(false)

  // 防止并发收藏切换的锁
  let _togglingFavorites = new Set<string>()

  function persist() {
    try {
      uni.setStorageSync(STORAGE_KEY, {
        works: works.value,
        drafts: drafts.value,
        favorites: favorites.value,
      })
    } catch (e) { console.error('works persist failed', e) }
  }

  // 防抖持久化：合并 500ms 内的多次写入，减少同步 IO 开销
  let _persistTimer: ReturnType<typeof setTimeout> | null = null
  function debouncedPersist() {
    if (_persistTimer) clearTimeout(_persistTimer)
    _persistTimer = setTimeout(() => {
      persist()
      _persistTimer = null
    }, 500)
  }

  function restore() {
    try {
      const saved = uni.getStorageSync(STORAGE_KEY)
      if (saved) {
        if (saved.works) works.value = saved.works
        if (saved.drafts) drafts.value = saved.drafts
        if (saved.favorites) favorites.value = saved.favorites
      }
    } catch (e) { console.error('works restore failed', e) }
  }

  async function loadAll() {
    if (loading.value) return  // 防止并发加载
    loading.value = true
    restore()
    const userStore = useUserStore()
    if (userStore.isLoggedIn) {
      // 先从服务器拉取作品列表，再合并本地数据
      try {
        await syncWorksFromServer()
      } catch (e) {
        console.warn('sync works from server failed', e)
      }
      try {
        await syncFavoritesFromServer()
      } catch (e) {
        console.warn('sync favorites failed', e)
      }
    }
    loading.value = false
  }

  /** 从服务器拉取作品列表并合并到本地 */
  async function syncWorksFromServer() {
    try {
      const data = await fetchWorksApi()
      if (data && Array.isArray(data)) {
        // 服务器有数据时合并；服务器返回空数组时不清理本地（可能存在未同步的本地作品）
        const serverIds = new Set(data.map((w: any) => w.id))
        const localIds = new Set(works.value.map(w => w.id))
        // 仅清理本地有、服务端也有过记录但现在已删除的作品
        // 不清理本地-only的作品（从未同步到服务器的作品）
        if (data.length === 0) {
          // 服务端返回空列表，不清理本地（避免丢失未同步的作品）
          return
        }
        data.forEach((serverWork: any) => {
          const id = serverWork.id
          if (!id) return
          const existing = works.value.find(w => w.id === id)
          if (existing) {
            // 合并：本地未保存到服务器的修改优先（updatedAt 较新者胜出）
            const serverUpdatedAt = serverWork.updatedAt || serverWork.updated_at ? new Date(serverWork.updatedAt || serverWork.updated_at).getTime() : 0
            const localUpdatedAt = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0
            if (serverUpdatedAt > localUpdatedAt) {
              // 统一做 snake_case → camelCase 转换，保证字段一致
              existing.templateId = serverWork.templateId || serverWork.template_id || existing.templateId
              const serverImage = serverWork.cover || serverWork.image
              existing.image = serverImage ? resolveUrl(serverImage) : existing.image
              existing.cover = serverWork.cover ? resolveUrl(serverWork.cover) : existing.cover
              existing.title = serverWork.title ?? existing.title
              existing.templateType = serverWork.templateType || serverWork.template_type || existing.templateType
              existing.data = serverWork.data || existing.data
              existing.musicId = serverWork.musicId ?? serverWork.music_id ?? existing.musicId
              existing.date = serverWork.date || existing.date
              existing.status = serverWork.status || existing.status
              existing.updatedAt = serverWork.updatedAt || serverWork.updated_at || existing.updatedAt
            }
          } else if (!localIds.has(id)) {
            // 服务器有但本地没有的作品，做字段转换后加入本地
            const mappedWork: Work = {
              id: serverWork.id,
              title: serverWork.title || '未命名作品',
              date: serverWork.date || new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }),
              image: resolveUrl(serverWork.cover || serverWork.image || ''),
              cover: resolveUrl(serverWork.cover || ''),
              templateType: serverWork.templateType || serverWork.template_type || 'canvas',
              templateId: serverWork.templateId || serverWork.template_id || '',
              musicId: serverWork.musicId ?? serverWork.music_id ?? null,
              data: serverWork.data || {},
              status: serverWork.status || 'draft',
              updatedAt: serverWork.updatedAt || serverWork.updated_at || new Date().toISOString(),
            }
            works.value.push(mappedWork)
          }
        })
        persist()
      }
    } catch (e) {
      console.warn('sync works from server failed', e)
    }
  }

  /** 遍历本地作品，异步同步到服务器 */
  async function syncWorksToServer() {
    const userStore = useUserStore()
    if (!userStore.isLoggedIn) return
    const allWorks = [...works.value]
    for (const work of allWorks) {
      try {
        await saveWorkApi(work)
      } catch (e) {
        console.warn('sync work to server failed:', work.id, e)
      }
    }
  }

  async function syncFavoritesFromServer() {
    try {
      const data = await fetchFavorites()
      if (data && Array.isArray(data)) {
        const serverFavoriteIds = new Set(data.map((item: any) => item.workId || item.id))
        const allWorks = [...works.value, ...drafts.value]
        // 保留本地未同步的收藏（不在服务端但本地有的）
        const localOnlyFavorites = favorites.value.filter(w => !serverFavoriteIds.has(w.id))
        // 添加服务端有且本地也能匹配到的收藏
        const serverFavorites: Work[] = []
        serverFavoriteIds.forEach(id => {
          const work = allWorks.find(w => w.id === id)
          if (work) {
            serverFavorites.push(work)
          }
        })
        favorites.value = [...serverFavorites, ...localOnlyFavorites]
        debouncedPersist()
      }
    } catch (e) {
      console.warn('sync favorites from server failed', e)
    }
  }

  function addWork(work: Work) {
    works.value.unshift(work)
    debouncedPersist()
  }

  function updateWork(id: string, data: Partial<Work>) {
    const idx = works.value.findIndex(w => w.id === id)
    if (idx !== -1) {
      works.value[idx] = { ...works.value[idx], ...data }
      debouncedPersist()
    }
  }

  /** 重命名作品（同步更新 works / drafts / favorites 本地数据） */
  function renameWork(id: string, newName: string) {
    const name = (newName || '').trim()
    if (!name) return
    const update = (arr: Work[]) => {
      const idx = arr.findIndex(w => w.id === id)
      if (idx !== -1) {
        arr[idx] = { ...arr[idx], title: name }
      }
    }
    update(works.value)
    update(drafts.value)
    update(favorites.value)
    persist()

    // 同步到服务器
    const userStore = useUserStore()
    if (userStore.isLoggedIn) {
      updateWorkApi(id, { title: name }).catch(e => {
        console.warn('renameWork sync to server failed:', id, e)
      })
    }
  }

  async function deleteWork(id: string) {
    const userStore = useUserStore()
    if (userStore.isLoggedIn) {
      // 先尝试调服务器删除接口，无论成功失败都清理本地数据
      // （因为作品可能只存在于本地，API 删除失败不应阻塞本地清理）
      try {
        await deleteWorkApi(id)
      } catch (e) {
        console.warn('delete work from server failed:', e)
      }
    }
    works.value = works.value.filter(w => w.id !== id)
    drafts.value = drafts.value.filter(w => w.id !== id)
    favorites.value = favorites.value.filter(w => w.id !== id)
    // 删除是不可逆操作，同步持久化
    persist()
    uni.showToast({ title: '删除成功', icon: 'success' })
  }

  function addDraft(draft: Work) {
    drafts.value.unshift(draft)
    debouncedPersist()
  }

  async function toggleFavorite(id: string) {
    if (_togglingFavorites.has(id)) return  // 防止并发切换
    _togglingFavorites.add(id)
    try {
      const userStore = useUserStore()
      const isCurrentlyFavorite = isFavorite(id)

      if (isCurrentlyFavorite) {
        favorites.value = favorites.value.filter(f => f.id !== id)
      } else {
        const work = works.value.find(w => w.id === id) || drafts.value.find(w => w.id === id)
        if (work) favorites.value.unshift(work)
      }
      // 收藏状态变更同步持久化
      persist()

      if (userStore.isLoggedIn) {
        try {
          if (isCurrentlyFavorite) {
            await removeFavorite(id)
          } else {
            await addFavorite(id)
          }
        } catch (e) {
          console.warn('favorite api failed', e)
          if (isCurrentlyFavorite) {
            const work = works.value.find(w => w.id === id) || drafts.value.find(w => w.id === id)
            if (work) favorites.value.unshift(work)
          } else {
            favorites.value = favorites.value.filter(f => f.id !== id)
          }
          debouncedPersist()
          uni.showToast({ title: '操作失败，请重试', icon: 'none' })
        }
      }
    } finally {
      _togglingFavorites.delete(id)
    }
  }

  function isFavorite(id: string): boolean {
    return favorites.value.some(f => f.id === id)
  }

  function saveAsWork(work: Work) {
    const existing = works.value.find(w => w.id === work.id)
    if (existing) {
      Object.assign(existing, work)
    } else {
      works.value.unshift(work)
    }
    const draftIdx = drafts.value.findIndex(d => d.id === work.id)
    if (draftIdx !== -1) {
      drafts.value.splice(draftIdx, 1)
    }
    // 关键操作使用同步持久化，避免防抖延迟导致数据丢失
    persist()

    // 本地保存成功后，登录用户异步同步到服务器
    const userStore = useUserStore()
    if (userStore.isLoggedIn) {
      const isNew = !existing
      // 异步同步，不阻塞本地流程
      ;(async () => {
        try {
          // 构建发送给 API 的 work 对象，确保包含服务端需要的字段
          const apiWork = {
            ...work,
            cover: work.cover || work.image,
            templateId: work.templateId || '',
            templateType: work.templateType || 'canvas',
          }
          if (isNew) {
            await saveWorkApi(apiWork)
          } else {
            await updateWorkApi(work.id, apiWork)
          }
        } catch (e) {
          console.warn('sync work to server failed:', work.id, e)
        }
      })()
    }
  }

  /** 清空所有本地数据（登出时调用） */
  function reset() {
    works.value = []
    drafts.value = []
    favorites.value = []
    try { uni.removeStorageSync(STORAGE_KEY) } catch {}
  }

  return {
    works, drafts, favorites, loading,
    addWork, updateWork, renameWork, deleteWork, addDraft,
    toggleFavorite, isFavorite, saveAsWork, loadAll,
    syncFavoritesFromServer, syncWorksFromServer, syncWorksToServer,
    reset,
  }
})
