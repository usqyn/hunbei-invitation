/**
 * 异步操作 composable
 * 解决：按钮 loading 态 + 防重复点击
 * 研究表明：按钮加载态可防止重复提交，减少表单放弃率 32%
 */
import { ref, type Ref } from 'vue'

interface AsyncActionOptions {
  /** 最小 loading 时长（ms），避免闪烁感 */
  minLoadingDuration?: number
  /** 成功提示文案 */
  successMessage?: string
  /** 错误提示文案 */
  errorMessage?: string
}

interface AsyncActionResult {
  loading: Ref<boolean>
  run: <T>(fn: () => Promise<T>, options?: AsyncActionOptions) => Promise<T | undefined>
}

/**
 * useAsyncAction - 包装异步操作，自动管理 loading 态和防重复点击
 *
 * @example
 * const { loading, run } = useAsyncAction()
 * async function handleSave() {
 *   await run(async () => {
 *     await saveWork()
 *   }, { successMessage: '保存成功' })
 * }
 */
export function useAsyncAction(): AsyncActionResult {
  const loading = ref(false)

  const run = async <T>(
    fn: () => Promise<T>,
    options?: AsyncActionOptions,
  ): Promise<T | undefined> => {
    // 防重复点击
    if (loading.value) return undefined

    loading.value = true
    const startTime = Date.now()

    try {
      const result = await fn()

      // 最小 loading 时长，避免闪烁
      const elapsed = Date.now() - startTime
      const minDuration = options?.minLoadingDuration ?? 300
      if (elapsed < minDuration) {
        await new Promise(resolve => setTimeout(resolve, minDuration - elapsed))
      }

      if (options?.successMessage) {
        uni.showToast({ title: options.successMessage, icon: 'success' })
      }

      return result
    } catch (e: any) {
      const msg = options?.errorMessage || e?.message || '操作失败'
      uni.showToast({ title: msg, icon: 'none' })
      console.error('[useAsyncAction]', e)
      return undefined
    } finally {
      loading.value = false
    }
  }

  return { loading, run }
}

/**
 * useLoadingButton - 更简单的按钮 loading 封装
 * 仅管理 loading 状态，不处理成功/错误提示
 */
export function useLoadingButton() {
  const loading = ref(false)

  async function withLoading<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (loading.value) return undefined
    loading.value = true
    try {
      return await fn()
    } catch (e) {
      console.error('[useLoadingButton]', e)
      return undefined
    } finally {
      loading.value = false
    }
  }

  return { loading, withLoading }
}
