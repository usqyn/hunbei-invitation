/**
 * 模板 JSON 去重获取缓存：
 * - 点击模板卡片瞬间预取（useTemplateEntry.enterEditor），与编辑器加载共享同一 Promise，
 *   编辑器进入时若预取已完成/进行中则零等待（或仅等剩余时间）
 * - 去重窗口：同 id 并发请求只发一次；失败后清除记录允许重试
 */
import { request } from '@/utils/request'

const _templateFetchCache = new Map<string, Promise<any>>()

export function fetchTemplateData(templateId: string): Promise<any> {
  let p = _templateFetchCache.get(templateId)
  if (!p) {
    p = request<any>({ url: `/api/templates/${templateId}`, hideLoading: true }).catch((e) => {
      // 失败后移除缓存记录，后续加载可重试
      _templateFetchCache.delete(templateId)
      throw e
    })
    _templateFetchCache.set(templateId, p)
  }
  return p
}

/** 点击模板时立即预取（fire-and-forget，不阻塞跳转，失败静默） */
export function prefetchTemplateData(templateId: string): void {
  if (!templateId || typeof templateId !== 'string' || templateId.startsWith('local-')) return
  void fetchTemplateData(templateId).catch(() => {})
}
