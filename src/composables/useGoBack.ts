import { ref } from 'vue'

/**
 * 返回导航 composable
 * 如果页面栈有历史则返回上一页，否则回到首页
 * 支持未保存更改检测：当 isDirty 为 true 时，弹出确认弹窗
 * @param options.beforeBack 返回 false 时取消导航（可用于二次确认）
 */
export function useGoBack(options?: { beforeBack?: () => boolean | Promise<boolean> }) {
  // 未保存更改标记，可由外部组件设置
  const isDirty = ref(false)

  const goBack = async () => {
    // 如果有未保存的更改，先弹出确认弹窗
    if (isDirty.value) {
      const confirmed = await new Promise<boolean>((resolve) => {
        uni.showModal({
          title: '提示',
          content: '您有未保存的更改，确定要离开吗？',
          confirmText: '离开',
          cancelText: '继续编辑',
          confirmColor: '#e84a6e',
          success: (res) => resolve(res.confirm || false),
          fail: () => resolve(false),
        })
      })
      if (!confirmed) return
    }
    // 如果有 beforeBack 且返回 false，则取消导航
    if (options?.beforeBack) {
      const result = await options.beforeBack()
      if (result === false) return
    }
    const pages = getCurrentPages()
    if (pages.length > 1) {
      uni.navigateBack({ delta: 1 })
    } else {
      uni.switchTab({ url: '/pages/index/index' })
    }
  }

  return { goBack, isDirty }
}
