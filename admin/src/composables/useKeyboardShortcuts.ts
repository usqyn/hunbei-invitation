import type { Ref } from 'vue'

export interface UseKeyboardShortcutsOptions {
  selectedId: Ref<string | null>
  undo: () => void
  redo: () => void
  copySelected: () => void
  pasteFromClipboard: () => void
  saveToServer: () => void
  deleteSelected: () => void
  nudgeElement: (id: string, dx: number, dy: number) => void
  duplicateSelected: () => void
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions) {
  function onKeyDown(e: KeyboardEvent) {
    const target = e.target as HTMLElement
    if (
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' ||
        target.isContentEditable)
    ) {
      return
    }

    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault()
      options.undo()
      return
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault()
      options.redo()
      return
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault()
      options.redo()
      return
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault()
      options.copySelected()
      return
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
      e.preventDefault()
      options.pasteFromClipboard()
      return
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault()
      options.saveToServer()
      return
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (options.selectedId.value) {
        e.preventDefault()
        options.deleteSelected()
      }
      return
    }
    const step = e.shiftKey ? 10 : 1
    if (e.key === 'ArrowLeft' && options.selectedId.value) { e.preventDefault(); options.nudgeElement(options.selectedId.value, -step, 0) }
    if (e.key === 'ArrowRight' && options.selectedId.value) { e.preventDefault(); options.nudgeElement(options.selectedId.value, step, 0) }
    if (e.key === 'ArrowUp' && options.selectedId.value) { e.preventDefault(); options.nudgeElement(options.selectedId.value, 0, -step) }
    if (e.key === 'ArrowDown' && options.selectedId.value) { e.preventDefault(); options.nudgeElement(options.selectedId.value, 0, step) }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault()
      options.duplicateSelected()
      return
    }
  }

  return { onKeyDown }
}
