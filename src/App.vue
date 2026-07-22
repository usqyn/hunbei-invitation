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
  // 延迟 3 秒预加载哈萨克/阿拉伯字体，避免与首屏请求竞争网络资源
  // 大部分用户首屏不需要 RTL 字体，进入编辑器时会按需加载
  setTimeout(() => {
    preloadRtlFonts().catch(e => console.warn('[FontLoader] preload failed:', e))
  }, 3000)
})

onShow(() => {
  flushTrackQueue()
})
</script>

<style lang="scss">
@use './styles/global.scss' as *;
</style>
