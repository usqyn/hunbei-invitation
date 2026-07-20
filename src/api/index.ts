import { request } from '@/utils/request'
import { API_BASE, getRequestUrl, USE_CLOUD_FUNCTIONS } from '@/config'
import type { PosterTemplate, PosterWork, PosterEditableAreaRuntime, StickerItem } from '@/types/poster'

// ========== 用户相关 ==========
// ========== VIP 相关 ==========
export function createVipOrder(plan: string, price: number) {
  return request<{
    orderId: string
    prepayId: string
    paySign?: string
    nonceStr?: string
    timeStamp?: string
    package?: string
    signType?: string
    expireAt?: number | null
    testMode?: boolean
  }>({ url: '/api/vip/order', method: 'POST', data: { plan, price } })
}

// ========== 图片上传 ==========

function normalizeImageUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  if (url.startsWith('cloud://')) {
    // cloud:// 协议 URL 需要后续换取 https 临时链接，这里原样返回
    return url
  }
  if (url.startsWith('/')) {
    return `${API_BASE}${url}`
  }
  return `${API_BASE}/${url}`
}

// MIME 与扩展名映射
const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
}

// 从文件路径中提取扩展名（小写）
function getExtFromPath(filePath: string): string {
  const m = String(filePath).match(/\.([a-zA-Z0-9]+)$/)
  return m ? m[1].toLowerCase() : 'png'
}

// 读取文件为 base64 字符串
// 微信小程序/H5 双端兼容：MP 用 FileSystemManager，H5 用 XMLHttpRequest + FileReader
function readFileAsBase64(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN || MP-ALIPAY || MP-BAIDU || MP-TOUTIAO || MP-QQ
    // 小程序端：用 getFileSystemManager().readFile
    try {
      const fs = uni.getFileSystemManager()
      fs.readFile({
        filePath,
        encoding: 'base64',
        success: (res: any) => resolve(res.data as string),
        fail: (err: any) => reject(new Error(err.errMsg || '读取文件失败')),
      })
    } catch (e: any) {
      reject(new Error(e.message || 'getFileSystemManager 不可用'))
    }
    // #endif
    // #ifdef H5
    // H5 端：filePath 通常是 blob: URL，用 XHR 读取
    try {
      const xhr = new XMLHttpRequest()
      xhr.open('GET', filePath, true)
      xhr.responseType = 'blob'
      xhr.onload = () => {
        if (xhr.status !== 200) {
          reject(new Error(`读取文件失败: ${xhr.status}`))
          return
        }
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          // data:application/octet-stream;base64,xxx 或 data:image/png;base64,xxx
          const idx = result.indexOf(',')
          if (idx === -1) {
            reject(new Error('FileReader 解析失败'))
            return
          }
          resolve(result.substring(idx + 1))
        }
        reader.onerror = () => reject(new Error('FileReader 读取失败'))
        reader.readAsDataURL(xhr.response)
      }
      xhr.onerror = () => reject(new Error('XHR 请求失败'))
      xhr.send()
    } catch (e: any) {
      reject(new Error(e.message || 'H5 文件读取异常'))
    }
    // #endif
    // #ifdef APP-PLUS
    // App 端：用 plus.io 读文件
    try {
      // @ts-ignore
      plus.io.resolveLocalFileSystemURL(filePath, (entry: any) => {
        entry.file((file: any) => {
          const reader = new plus.io.FileReader()
          reader.onloadend = (e: any) => {
            const result = e.target.result as string
            const idx = result.indexOf(',')
            if (idx === -1) {
              reject(new Error('App FileReader 解析失败'))
              return
            }
            resolve(result.substring(idx + 1))
          }
          reader.onerror = () => reject(new Error('App FileReader 读取失败'))
          reader.readAsDataURL(file)
        })
      }, () => reject(new Error('plus.io 解析文件路径失败')))
    } catch (e: any) {
      reject(new Error(e.message || 'App 文件读取异常'))
    }
    // #endif
  })
}

/**
 * 上传图片到服务器，返回永久 URL
 *
 * 云函数模式（USE_CLOUD_FUNCTIONS=1）：
 *   把文件读为 base64 → POST JSON { image: 'data:image/png;base64,...' }
 *   云函数不支持 multipart/form-data，必须用 base64 JSON
 *
 * 非云函数模式（dev 走 vite proxy）：
 *   用 uni.uploadFile multipart/form-data
 */
export function uploadImage(filePath: string, onProgress?: (progress: number) => void): Promise<string> {
  // 云函数模式：base64 JSON 上传
  if (USE_CLOUD_FUNCTIONS) {
    return uploadImageViaBase64(filePath, onProgress)
  }
  // 非云函数模式：multipart 上传（兼容旧 Express）
  return uploadImageViaMultipart(filePath, onProgress)
}

// 云函数模式：base64 JSON
async function uploadImageViaBase64(filePath: string, onProgress?: (progress: number) => void): Promise<string> {
  // 通知进度：读取阶段 30% → 上传阶段 100%
  if (onProgress) onProgress(10)
  const base64 = await readFileAsBase64(filePath)
  if (onProgress) onProgress(40)
  const ext = getExtFromPath(filePath)
  const mime = EXT_MIME[ext] || 'image/jpeg'
  const dataUrl = `data:${mime};base64,${base64}`
  if (onProgress) onProgress(60)
  try {
    const res = await request<{ url: string; cloudFileID?: string }>({
      url: '/api/upload/image',
      method: 'POST',
      data: { image: dataUrl },
      hideLoading: true,
    })
    if (onProgress) onProgress(100)
    if (!res || !res.url) throw new Error('上传响应缺少 url')
    return normalizeImageUrl(res.url)
  } catch (e) {
    if (onProgress) onProgress(0)
    throw e
  }
}

// 非云函数模式：multipart/form-data（兼容旧 Express）
function uploadImageViaMultipart(filePath: string, onProgress?: (progress: number) => void): Promise<string> {
  let uploadTask: UniApp.UploadTask | undefined
  return Promise.race([
    new Promise<string>((resolve, reject) => {
      const token = uni.getStorageSync('token') || ''
      uploadTask = uni.uploadFile({
        // 非云函数模式：API_BASE + path（走 vite proxy）
        url: getRequestUrl('/api/upload/image'),
        filePath,
        name: 'image',
        header: token ? { Authorization: `Bearer ${token}` } : {},
        success: (res) => {
          try {
            const data = JSON.parse(res.data)
            if (data.success && data.url) resolve(normalizeImageUrl(data.url))
            else if (data.data && data.data.url) resolve(normalizeImageUrl(data.data.url))
            else reject(new Error(data.error || '上传失败'))
          } catch {
            reject(new Error('上传响应解析失败'))
          }
        },
        fail: (err) => reject(err),
      })
      if (onProgress && uploadTask) {
        uploadTask.onProgressUpdate((res) => {
          onProgress(res.progress)
        })
      }
    }),
    new Promise<string>((_, reject) => setTimeout(() => {
      uploadTask?.abort()
      reject(new Error('上传超时'))
    }, 30000)),
  ])
}

// ========== 模板相关 ==========
export function fetchSimilarTemplates(templateId: string) {
  return request<any[]>({ url: '/api/templates/similar', data: { templateId } })
}

// ========== 作品相关 ==========
export function saveWorkApi(work: any) {
  return request({ url: '/api/works', method: 'POST', data: work })
}

export function updateWorkApi(id: string, work: any) {
  return request({ url: `/api/works/${id}`, method: 'PUT', data: work })
}

export function fetchWorksApi() {
  return request({ url: '/api/works', method: 'GET' })
}

export function deleteWorkApi(id: string) {
  return request({ url: `/api/works/${id}`, method: 'DELETE' })
}

// ========== 收藏相关 ==========
export function addFavorite(workId: string) {
  return request({ url: '/api/favorites', method: 'POST', data: { workId } })
}

export function removeFavorite(workId: string) {
  return request({ url: `/api/favorites/${workId}`, method: 'DELETE' })
}

export function fetchFavorites() {
  return request<any[]>({ url: '/api/favorites' })
}

// ========== 导出相关 ==========
export function exportInvitation(workId: string, options: { watermark?: boolean; quality?: string }) {
  return request<{ url: string; expiresAt: number }>({ url: '/api/export', method: 'POST', data: { workId, ...options } })
}

export function generatePoster(workId: string) {
  return request<{ url: string }>({ url: '/api/export/poster', method: 'POST', data: { workId } })
}

// ========== 商城相关 ==========
export function fetchProducts(params?: { category?: string; page?: number; size?: number }) {
  return request<{ list: any[]; total: number }>({ url: '/api/products', data: params })
}

export function fetchRecommendProducts(category: string) {
  return request<any[]>({ url: '/api/products/recommend', data: { category } })
}

// ========== 订单相关 ==========
export function createOrder(orderData: {
  items: any[]
  totalAmount: string
  status: string
  contactName: string
  contactPhone: string
  address: string
  note: string
  goodsAmount?: string
  freight?: string
  discount?: string
}) {
  return request({ url: '/api/orders', method: 'POST', data: orderData })
}

export function fetchOrders() {
  return request<any[]>({ url: '/api/orders' })
}

export function payOrder(orderId: string) {
  return request<{ prepayId: string }>({ url: `/api/orders/${orderId}/pay`, method: 'POST' })
}

// ========== 足迹/通知/反馈 ==========
export function fetchFootprints() {
  return request<any[]>({ url: '/api/footprints' })
}

export function fetchNotifications() {
  return request<any[]>({ url: '/api/notifications' })
}

export function markNotificationRead(id: string) {
  return request({ url: `/api/notifications/${id}/read`, method: 'PUT' })
}

export function submitFeedback(content: string, contact?: string) {
  return request({ url: '/api/feedback', method: 'POST', data: { content, contact } })
}

// ========== 回收站 ==========
export function fetchRecycleBin() {
  return request<any[]>({ url: '/api/works/recycle' })
}

export function restoreWork(workId: string) {
  return request({ url: `/api/works/${workId}/restore`, method: 'PUT' })
}

export function permanentDelete(workId: string) {
  return request({ url: `/api/works/${workId}`, method: 'DELETE' })
}

// ========== 海报模板相关 ==========
export function getPosterTemplates(params?: { category_id?: string; is_free?: number; page?: number; size?: number; limit?: number }) {
  return request<PosterTemplate[]>({ url: '/api/poster/templates', data: params })
}

// ========== 海报作品相关 ==========
export function getPosterWorks(params?: { page?: number; size?: number }) {
  return request<PosterWork[]>({ url: '/api/poster/works', data: params })
}

export function deletePosterWork(id: string) {
  return request<{ success: boolean }>({ url: `/api/poster/works/${id}`, method: 'DELETE' })
}

// ========== 海报素材 ==========
export function getPosterStickers() {
  return request<StickerItem[]>({ url: '/api/poster/stickers' })
}

