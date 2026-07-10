import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Work } from '@/types'
import { useUserStore } from './user'
import { addFavorite, removeFavorite, fetchFavorites } from '@/api'
import { request } from '@/utils/request'

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
      try {
        await syncFavoritesFromServer()
      } catch (e) {
        console.warn('sync favorites failed', e)
      }
    }
    loading.value = false
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
      try {
        await request({
          url: `/api/works/${id}`,
          method: 'DELETE',
        })
      } catch (e) {
        console.warn('delete work from server failed:', e)
        uni.showToast({ title: '删除失败，请重试', icon: 'none' })
        return
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
  }

  return {
    works, drafts, favorites, loading,
    addWork, updateWork, renameWork, deleteWork, addDraft,
    toggleFavorite, isFavorite, saveAsWork, loadAll,
    syncFavoritesFromServer,
  }
})
