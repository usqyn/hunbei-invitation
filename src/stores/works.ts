import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Work } from '@/types'
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

  async function fetchWorks() {
    try {
      const res: any = await request({ url: '/api/works', method: 'GET', hideLoading: true })
      if (res?.data) works.value = res.data
      persist()
    } catch (e) {
      console.warn('fetchWorks API failed, using local data', e)
    }
  }

  async function fetchDrafts() {
    try {
      const res: any = await request({ url: '/api/works/drafts', method: 'GET', hideLoading: true })
      if (res?.data) drafts.value = res.data
      persist()
    } catch (e) {
      console.warn('fetchDrafts API failed, using local data', e)
    }
  }

  async function fetchFavorites() {
    try {
      const res: any = await request({ url: '/api/works/favorites', method: 'GET', hideLoading: true })
      if (res?.data) favorites.value = res.data
      persist()
    } catch (e) {
      console.warn('fetchFavorites API failed, using local data', e)
    }
  }

  async function loadAll() {
    loading.value = true
    restore()
    await Promise.all([fetchWorks(), fetchDrafts(), fetchFavorites()])
    loading.value = false
  }

  function addWork(work: Work) {
    works.value.unshift(work)
    persist()
  }

  function updateWork(id: number, data: Partial<Work>) {
    const idx = works.value.findIndex(w => w.id === id)
    if (idx !== -1) {
      works.value[idx] = { ...works.value[idx], ...data }
      persist()
    }
  }

  function deleteWork(id: number) {
    works.value = works.value.filter(w => w.id !== id)
    drafts.value = drafts.value.filter(w => w.id !== id)
    favorites.value = favorites.value.filter(w => w.id !== id)
    persist()
  }

  function addDraft(draft: Work) {
    drafts.value.unshift(draft)
    persist()
  }

  function toggleFavorite(id: number) {
    const idx = favorites.value.findIndex(f => f.id === id)
    if (idx !== -1) {
      favorites.value.splice(idx, 1)
    } else {
      const work = works.value.find(w => w.id === id) || drafts.value.find(w => w.id === id)
      if (work) favorites.value.unshift(work)
    }
    persist()
  }

  function isFavorite(id: number): boolean {
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
    addWork, updateWork, deleteWork, addDraft,
    toggleFavorite, isFavorite, saveAsWork, loadAll,
  }
})
