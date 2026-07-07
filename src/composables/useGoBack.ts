/**
 * 返回导航 composable
 * 如果页面栈有历史则返回上一页，否则回到首页
 */
export function useGoBack(options?: { beforeBack?: () => void }) {
  return () => {
    options?.beforeBack?.()
    const pages = getCurrentPages()
    if (pages.length > 1) {
      uni.navigateBack({ delta: 1 })
    } else {
      uni.switchTab({ url: '/pages/index/index' })
    }
  }
}
