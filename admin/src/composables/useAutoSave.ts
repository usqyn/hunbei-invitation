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

  function restoreDraftFromLocal(): boolean {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return false
      const draft = JSON.parse(raw)
      if (draft && Array.isArray(draft.elements)) {
        options.loadDraft(draft)
        return true
      }
    } catch (_) {}
    return false
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
  }
}
