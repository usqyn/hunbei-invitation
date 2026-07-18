<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { flushTrackQueue } from '@/utils/track'
import { preloadRtlFonts } from '@/utils/font-loader'

onLaunch(() => {
  try {
    const saved = uni.getStorageSync('TOYtamaxia_user')
    if (saved?.token) {
      uni.setStorageSync('token', saved.token)
    }
  } catch {}
  // 预加载哈萨克/阿拉伯字体，确保所有页面都能正确渲染阿拉伯文
  preloadRtlFonts()
})

onShow(() => {
  flushTrackQueue()
})
</script>

<style lang="scss">
@use './styles/global.scss' as *;
</style>
