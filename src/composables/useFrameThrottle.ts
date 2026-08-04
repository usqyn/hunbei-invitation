// ============ 帧节流工具 ============
// 参考 we-cropper 等 github 项目对 touchMove 60fps 节流的做法：
// 移动端 touchMove 触发频率可达 60Hz 以上，若每次回调都做完整计算 + 触发 Vue 响应式更新，
// 极易造成主线程阻塞、画面卡顿。本工具把回调限制到约 16ms 一次（对应 60fps），
// 跳过中间帧的精细计算，仅保留最新一帧的数据，松手前的最后一帧会被强制刷新。
//
// 使用：
//   const throttledMove = useFrameThrottle((e) => { ... 原始 touchMove 逻辑 ... })
//   <view @touchmove="throttledMove" />
// 在 touchend 中调用 throttledMove.flush() 保证最后一帧不丢失。

export function useFrameThrottle<T extends (...args: any[]) => void>(callback: T): T & { flush: () => void } {
  let lastRunTime = 0
  let pendingArgs: any[] | null = null
  let rafScheduled = false
  const FRAME_INTERVAL = 16 // 16ms ≈ 60fps

  const run = (args: any[]) => {
    lastRunTime = Date.now()
    rafScheduled = false
    callback(...args)
  }

  const throttled = ((...args: any[]) => {
    pendingArgs = args
    const now = Date.now()
    const elapsed = now - lastRunTime
    if (elapsed >= FRAME_INTERVAL) {
      // 距上次执行已超一帧，立即执行
      run(args)
    } else if (!rafScheduled) {
      // 否则排到下一帧执行
      rafScheduled = true
      const wait = FRAME_INTERVAL - elapsed
      setTimeout(() => {
        if (pendingArgs) run(pendingArgs)
      }, wait)
    }
  }) as T & { flush: () => void }

  // 强制执行最后一次排队的回调，touchend 时调用避免漏帧
  throttled.flush = () => {
    if (pendingArgs) {
      run(pendingArgs)
      pendingArgs = null
    }
  }

  return throttled
}
