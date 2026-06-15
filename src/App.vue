<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'

onLaunch(() => {
  try {
    const saved = uni.getStorageSync('hunbei_user')
    if (saved?.token) {
      uni.setStorageSync('token', saved.token)
    }
  } catch {}
})
</script>

<style lang="scss">
@use './styles/global.scss' as *;
</style>
