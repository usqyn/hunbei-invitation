<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { flushTrackQueue } from '@/utils/track'
import { preloadRtlFonts } from '@/utils/font-loader'

onLaunch(async () => {
  try {
    const saved = uni.getStorageSync('TOYtamaxia_user')
    if (saved?.token) {
      uni.setStorageSync('token', saved.token)
    }
  } catch {}
  // 预加载哈萨克/阿拉伯字体（不 await，避免阻塞启动；但启动后立即触发）
  // 字体下载会与首屏并行进行，进入模板/编辑器页时大概率已就绪
  preloadRtlFonts().catch(e => console.warn('[FontLoader] preload failed:', e))
})

onShow(() => {
  flushTrackQueue()
})
</script>

<style lang="scss">
@use './styles/global.scss' as *;
</style>
