/**
 * 统一的存储工具，封装 uni.getStorageSync/setStorageSync
 */
export function getStorage<T = any>(key: string, fallback: T): T {
  try {
    const value = uni.getStorageSync(key)
    return value !== '' && value !== undefined ? value : fallback
  } catch {
    return fallback
  }
}

export function setStorage(key: string, value: any): void {
  try {
    uni.setStorageSync(key, value)
  } catch (e) {
    console.error(`[Storage] Failed to set ${key}:`, e)
  }
}

export function removeStorage(key: string): void {
  try {
    uni.removeStorageSync(key)
  } catch (e) {
    console.error(`[Storage] Failed to remove ${key}:`, e)
  }
}
