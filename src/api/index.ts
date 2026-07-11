import { request } from '@/utils/request'
import { API_BASE } from '@/config'
import type { PosterTemplate, PosterWork, PosterEditableAreaRuntime, StickerItem } from '@/types/poster'

// ========== 用户相关 ==========
/** @deprecated 死代码，暂未使用 */
export function fetchUserInfo() {
  return request<{ nickname: string; phone: string; avatar: string; vip_status?: number; vip_expire_at?: number; vip_plan?: string }>({ url: '/api/user/info' })
}

// ========== VIP 相关 ==========
export function createVipOrder(plan: string, price: number) {
  return request<{ orderId: string; prepayId: string; nonceStr?: string; paySign?: string }>({ url: '/api/vip/order', method: 'POST', data: { plan, price } })
}

/** @deprecated 死代码，暂未使用 */
export function checkVipStatus() {
  return request<{ isVip: boolean; expireAt: number; plan: string }>({ url: '/api/vip/status' })
}

// ========== 图片上传 ==========
function normalizeImageUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  if (url.startsWith('/')) {
    return `${API_BASE}${url}`
  }
  return `${API_BASE}/${url}`
}

/** 上传图片到服务器，返回永久 URL */
export function uploadImage(filePath: string): Promise<string> {
  return Promise.race([
    new Promise<string>((resolve, reject) => {
      const token = uni.getStorageSync('token') || ''
      uni.uploadFile({
        url: `${API_BASE}/api/upload/image`,
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
    }),
    new Promise<string>((_, reject) => setTimeout(() => reject(new Error('上传超时')), 30000)),
  ])
}

// ========== 模板相关 ==========
/** @deprecated 死代码，暂未使用 */
export function fetchTemplates(params?: { category?: string; search?: string; is_paid?: number; page?: number; size?: number }) {
  return request<{ list: any[]; total: number }>({ url: '/api/templates', data: params })
}

export function fetchSimilarTemplates(templateId: string) {
  return request<any[]>({ url: '/api/templates/similar', data: { templateId } })
}

/** @deprecated 死代码，暂未使用 */
export function fetchTemplateDetail(id: string) {
  return request<any>({ url: `/api/templates/${id}` })
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

/** @deprecated 死代码，暂未使用 */
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

/** @deprecated 死代码，暂未使用 */
export function fetchProductDetail(id: string) {
  return request<any>({ url: `/api/products/${id}` })
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
/** @deprecated 死代码，暂未使用 */
export function getPosterTemplates(params?: { category_id?: string; is_free?: number; page?: number; size?: number; limit?: number }) {
  return request<PosterTemplate[]>({ url: '/api/poster/templates', data: params })
}

/** @deprecated 死代码，暂未使用 */
export function getPosterTemplateDetail(id: string) {
  return request<PosterTemplate>({ url: `/api/poster/templates/${id}` })
}

/** @deprecated 死代码，暂未使用 */
export function getPosterHotTemplates(limit?: number) {
  return request<PosterTemplate[]>({ url: '/api/poster/templates/hot', data: { limit } })
}

// ========== 海报作品相关 ==========
export function getPosterWorks(params?: { page?: number; size?: number }) {
  return request<PosterWork[]>({ url: '/api/poster/works', data: params })
}

/** @deprecated 死代码，暂未使用 */
export function savePosterWork(data: { template_id: string; template_name?: string; cover_url?: string; content: { editableAreas: PosterEditableAreaRuntime[] } }) {
  return request<{ id: string }>({ url: '/api/poster/works', method: 'POST', data })
}

/** @deprecated 死代码，暂未使用 */
export function getPosterWorkDetail(id: string) {
  return request<PosterWork>({ url: `/api/poster/works/${id}` })
}

export function deletePosterWork(id: string) {
  return request<{ success: boolean }>({ url: `/api/poster/works/${id}`, method: 'DELETE' })
}

/** @deprecated 死代码，暂未使用 */
export function updatePosterWork(id: string, data: { template_name?: string; cover_url?: string; content?: { editableAreas: PosterEditableAreaRuntime[] } }) {
  return request<PosterWork>({ url: `/api/poster/works/${id}`, method: 'PUT', data })
}

// ========== 海报素材 ==========
/** @deprecated 死代码，暂未使用 */
export function getPosterStickers() {
  return request<StickerItem[]>({ url: '/api/poster/stickers' })
}

/** @deprecated 死代码，暂未使用 */
export function uploadPosterWorkImage(workId: string, imageBase64: string) {
  return request<{ url: string }>({ url: `/api/poster/works/${workId}/upload`, method: 'POST', data: { image: imageBase64 } })
}
