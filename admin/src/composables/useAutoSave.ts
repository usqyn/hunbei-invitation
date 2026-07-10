import { ref, onBeforeUnmount } from 'vue'

export interface UseAutoSaveOptions {
  getDraft: () => any
  loadDraft: (draft: any) => void
}

export function useAutoSave(options: UseAutoSaveOptions) {
  const DRAFT_KEY = 'hunbei-draft-v1'
  const AUTO_SAVE_INTERVAL = 30_000

  const autoSaveTimer = ref<ReturnType<typeof setInterval> | null>(null)

  function saveDraftToLocal() {
    try {
      const draft = options.getDraft()
      draft._savedAt = Date.now()
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch (_) {}
  }

  function getDraftInfo(): { draft: any; savedAt: number } | null {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return null
      const draft = JSON.parse(raw)
      if (draft && Array.isArray(draft.elements)) {
        return { draft, savedAt: draft._savedAt || 0 }
      }
    } catch (_) {}
    return null
  }

  function isDraftRecent(maxAgeMs: number = 24 * 60 * 60 * 1000): boolean {
    const info = getDraftInfo()
    if (!info) return false
    return Date.now() - info.savedAt < maxAgeMs
  }

  function restoreDraftFromLocal(): boolean {
    const info = getDraftInfo()
    if (!info) return false
    options.loadDraft(info.draft)
    return true
  }

  function discardDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch (_) {}
  }

  function startAutoSave() {
    if (autoSaveTimer.value) clearInterval(autoSaveTimer.value)
    autoSaveTimer.value = setInterval(saveDraftToLocal, AUTO_SAVE_INTERVAL)
  }

  function stopAutoSave() {
    if (autoSaveTimer.value) {
      clearInterval(autoSaveTimer.value)
      autoSaveTimer.value = null
    }
  }

  onBeforeUnmount(() => {
    stopAutoSave()
    saveDraftToLocal()
  })

  return {
    autoSaveTimer,
    saveDraftToLocal,
    restoreDraftFromLocal,
    startAutoSave,
    stopAutoSave,
    getDraftInfo,
    isDraftRecent,
    discardDraft,
  }
}
