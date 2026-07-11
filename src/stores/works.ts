import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Work } from '@/types'
import { useUserStore } from './user'
import { addFavorite, removeFavorite, fetchFavorites, saveWorkApi, updateWorkApi, fetchWorksApi, deleteWorkApi } from '@/api'

const STORAGE_KEY = 'hunbei_works'

export const useWorksStore = defineStore('works', () => {
  const works = ref<Work[]>([])
  const drafts = ref<Work[]>([])
  const favorites = ref<Work[]>([])
  const loading = ref(false)

  function persist() {
    try {
      uni.setStorageSync(STORAGE_KEY, {
        works: works.value,
        drafts: drafts.value,
        favorites: favorites.value,
      })
    } catch (e) { console.error('works persist failed', e) }
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
      if (data && Array.isArray(data) && data.length > 0) {
        const localIds = new Set(works.value.map(w => w.id))
        data.forEach((serverWork: any) => {
          const id = serverWork.id
          if (!id) return
          const existing = works.value.find(w => w.id === id)
          if (existing) {
            // 合并：本地未保存到服务器的修改优先（updatedAt 较新者胜出）
            const serverUpdatedAt = serverWork.updatedAt ? new Date(serverWork.updatedAt).getTime() : 0
            const localUpdatedAt = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0
            if (serverUpdatedAt > localUpdatedAt) {
              Object.assign(existing, serverWork)
            }
          } else if (!localIds.has(id)) {
            // 服务器有但本地没有的作品，加入本地
            works.value.push(serverWork as Work)
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
        const newFavorites: Work[] = []
        serverFavoriteIds.forEach(id => {
          const work = allWorks.find(w => w.id === id)
          if (work) {
            newFavorites.push(work)
          }
        })
        favorites.value = newFavorites
        persist()
      }
    } catch (e) {
      console.warn('sync favorites from server failed', e)
    }
  }

  function addWork(work: Work) {
    works.value.unshift(work)
    persist()
  }

  function updateWork(id: string, data: Partial<Work>) {
    const idx = works.value.findIndex(w => w.id === id)
    if (idx !== -1) {
      works.value[idx] = { ...works.value[idx], ...data }
      persist()
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
    persist()
    uni.showToast({ title: '删除成功', icon: 'success' })
  }

  function addDraft(draft: Work) {
    drafts.value.unshift(draft)
    persist()
  }

  async function toggleFavorite(id: string) {
    const userStore = useUserStore()
    const isCurrentlyFavorite = isFavorite(id)

    if (isCurrentlyFavorite) {
      favorites.value = favorites.value.filter(f => f.id !== id)
    } else {
      const work = works.value.find(w => w.id === id) || drafts.value.find(w => w.id === id)
      if (work) favorites.value.unshift(work)
    }
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
        persist()
        uni.showToast({ title: '操作失败，请重试', icon: 'none' })
      }
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
    persist()

    // 本地保存成功后，登录用户异步同步到服务器
    const userStore = useUserStore()
    if (userStore.isLoggedIn) {
      const isNew = !existing
      // 异步同步，不阻塞本地流程
      ;(async () => {
        try {
          if (isNew) {
            await saveWorkApi(work)
          } else {
            await updateWorkApi(work.id, work)
          }
        } catch (e) {
          console.warn('sync work to server failed:', work.id, e)
        }
      })()
    }
  }

  return {
    works, drafts, favorites, loading,
    addWork, updateWork, renameWork, deleteWork, addDraft,
    toggleFavorite, isFavorite, saveAsWork, loadAll,
    syncFavoritesFromServer, syncWorksFromServer, syncWorksToServer,
  }
})
