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
  // iOS WKWebView 中 init 可能返回成功但后续云函数调用全部挂起，需记录状态供各页面降级判断
  try {
    // @ts-ignore
    wx.cloud.init({ env: CLOUD_ENV_ID, traceUser: true })
    console.log('[cloud] init success, env:', CLOUD_ENV_ID)
    uni.setStorageSync('cloud_init_ok', '1')
  } catch (e) {
    console.warn('[cloud] init failed:', e)
    uni.setStorageSync('cloud_init_ok', '0')
  }
  
  // 后台健康检查：延迟 2s 后用一次轻量云函数调用验证云开发真正可用
  // 解决 iOS 上 init 成功但实际不可用的问题
  setTimeout(() => {
    try {
      // @ts-ignore
      wx.cloud.callFunction({
        name: 'common',
        data: { path: '/api/version', httpMethod: 'GET', body: {}, headers: {}, query: {} },
        success: () => {
          uni.setStorageSync('cloud_available', '1')
          console.log('[cloud] health check: OK')
        },
        fail: () => {
          uni.setStorageSync('cloud_available', '0')
          console.warn('[cloud] health check: FAIL')
        },
        complete: () => {
          uni.setStorageSync('cloud_checked_at', String(Date.now()))
        }
      })
    } catch (e) {
      uni.setStorageSync('cloud_available', '0')
      console.warn('[cloud] health check: ERROR', e)
    }
  }, 2000)

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
