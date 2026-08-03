<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { flushTrackQueue } from '@/utils/track'
import { preloadRtlFonts } from '@/utils/font-loader'
import { CLOUD_ENV_ID } from '@/config'

onLaunch(async () => {
  try {
    const saved = uni.getStorageSync('TOYtamaxia_user')
    if (saved?.token) {
      uni.setStorageSync('token', saved.token)
    }
  } catch {}

  // #ifdef MP-WEIXIN
  // 初始化微信云开发（必须在 onLaunch 中，确保小程序完全就绪后再 init）
  try {
    // @ts-ignore
    wx.cloud.init({ env: CLOUD_ENV_ID, traceUser: true })
    console.log('[cloud] init success, env:', CLOUD_ENV_ID)
  } catch (e) {
    console.warn('[cloud] init failed:', e)
  }

  // 开发版 & 体验版延迟开启 vConsole（避免初始化冲突）
  try {
    // @ts-ignore
    const env = wx.getAccountInfoSync?.()?.miniProgram?.envVersion
    if (env === 'develop' || env === 'trial') {
      setTimeout(() => {
        try {
          // @ts-ignore
          wx.setEnableDebug({ enableDebug: true, fail: () => {} })
        } catch {}
      }, 500)
    }
  } catch {}
  // #endif

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
