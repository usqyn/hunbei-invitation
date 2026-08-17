/**
 * 发布前将 payload 中的 base64 图片上传为文件，替换为可访问的 URL。
 *
 * base64 图片会出现在：
 * - payload.elements[].text（image/sticker 元素的 src，序列化时 src 写入 text）
 * - payload.pages[].elements[].text（翻页模式）
 * - payload.background.image / payload.background.imageUrl
 * - payload.pages[].background.image / payload.pages[].background.imageUrl
 *
 * 所有 base64 图片一次性批量上传，返回 payload 副本（不修改原对象）。
 * 上传失败时保留 base64 原样，避免发布中断。
 */

export interface PayloadImageUploader {
  (files: File[]): Promise<string[]>
}

function isDataUrl(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('data:')
}

function toFile(blob: Blob, name: string, type: string): File {
  const FileCtor: any = (globalThis as any).File ?? (globalThis as any).window?.File
  if (FileCtor) return new FileCtor([blob], name, { type })
  return blob as unknown as File
}

function collectDataUrls(payload: any): string[] {
  const urls = new Set<string>()
  const add = (value: unknown) => {
    if (isDataUrl(value)) urls.add(value)
  }
  for (const el of payload?.elements || []) {
    if (el && (el.type === 'image' || el.type === 'sticker')) add(el.text)
  }
  for (const page of payload?.pages || []) {
    for (const el of page?.elements || []) {
      if (el && (el.type === 'image' || el.type === 'sticker')) add(el.text)
    }
    if (page?.background) {
      add(page.background.image)
      add(page.background.imageUrl)
    }
  }
  if (payload?.background) {
    add(payload.background.image)
    add(payload.background.imageUrl)
  }
  return [...urls]
}

function extForMime(mime: string): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/svg+xml') return 'svg'
  if (mime === 'image/gif') return 'gif'
  return 'png'
}

/**
 * 将 payload 中所有 base64 图片批量上传，返回替换为 URL 后的 payload 副本。
 *
 * @param payload  发布 payload（不会被修改）
 * @param upload   批量上传函数（接收 File[]，返回 URL[]，如 useApi 的 uploadImages）
 * @param fetchImpl 用于将 data URL 转 Blob（默认全局 fetch，测试可注入）
 */
export async function uploadPayloadImages(
  payload: any,
  upload: PayloadImageUploader,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<any> {
  if (!payload) return payload
  const dataUrls = collectDataUrls(payload)
  if (!dataUrls.length) return payload

  const files: File[] = []
  for (const dataUrl of dataUrls) {
    try {
      const res = await fetchImpl(dataUrl)
      const blob = await res.blob()
      const mime = blob.type || 'image/png'
      files.push(toFile(blob, `asset-${Date.now()}-${files.length}.${extForMime(mime)}`, mime))
    } catch (e) {
      console.warn('base64 图片转 Blob 失败，保持原样:', e)
    }
  }
  if (!files.length) return payload

  let uploaded: string[] = []
  try {
    uploaded = await upload(files)
  } catch (e) {
    console.warn('图片素材上传失败，保持 base64 原样:', e)
    return payload
  }

  const urlMap = new Map<string, string>()
  dataUrls.forEach((dataUrl, i) => {
    if (uploaded[i]) urlMap.set(dataUrl, uploaded[i])
  })
  if (!urlMap.size) return payload

  const result = JSON.parse(JSON.stringify(payload))
  const replace = (value: unknown): unknown =>
    isDataUrl(value) ? urlMap.get(value) || value : value

  for (const el of result.elements || []) {
    if (el && (el.type === 'image' || el.type === 'sticker')) el.text = replace(el.text)
  }
  for (const page of result.pages || []) {
    for (const el of page?.elements || []) {
      if (el && (el.type === 'image' || el.type === 'sticker')) el.text = replace(el.text)
    }
    if (page?.background) {
      page.background.image = replace(page.background.image)
      page.background.imageUrl = replace(page.background.imageUrl)
    }
  }
  if (result.background) {
    result.background.image = replace(result.background.image)
    result.background.imageUrl = replace(result.background.imageUrl)
  }
  return result
}