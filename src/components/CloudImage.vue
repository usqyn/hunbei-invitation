<template>
  <image
    :src="displayUrl"
    :mode="mode"
    :lazy-load="lazyLoad"
    :fade-show="fadeShow"
    :style="finalStyle"
    :class="finalClass"
    @error="handleError"
    @load="handleLoad"
  />
</template>

<script setup lang="ts">
import { ref, watch, onMounted, useAttrs, computed } from 'vue'
import { resolveUrl, isCloudUrl, resolveCloudUrl, resolveCloudUrlSync, invalidateCloudUrl, tempHttpsToCloudFileId } from '@/utils/url'

const props = withDefaults(defineProps<{
  src: string
  mode?: string
  lazyLoad?: boolean
  fadeShow?: boolean
  customStyle?: string | Record<string, any>
  customClass?: string
}>(), {
  src: '',
  mode: 'aspectFill',
  lazyLoad: true,
  fadeShow: true,
  customStyle: '',
  customClass: '',
})

const attrs = useAttrs()

// 将父级通过 class/style 透传的属性与 props.customClass/customStyle 合并，
// 确保外部 <CloudImage class="xxx" /> 的样式能作用到内部 <image>。
const finalClass = computed(() => [attrs.class, props.customClass].filter(Boolean).join(' '))
// 统一归一化为单条 CSS 字符串（对象/数组形式在 mp-weixin 的 WXML style 绑定上不可靠，
// 会导致内部 <image> 拿不到宽高等内联样式、按默认尺寸渲染造成错位/偏移）
const toCssText = (s: string | Record<string, any> | undefined): string => {
  if (!s) return ''
  if (typeof s === 'string') return s
  return Object.entries(s).map(([k, v]) => `${k}:${v}`).join(';')
}
const finalStyle = computed(() => [attrs.style, props.customStyle].map(toCssText).filter(Boolean).join(';'))

const emit = defineEmits<{
  (e: 'load'): void
  (e: 'error'): void
}>()

const displayUrl = ref('')
const retryCount = ref(0)
const MAX_RETRY = 2
// 标记是否已尝试过 cloud.downloadFile 降级（避免重复下载）
let usedCloudDownload = false

// 解析 URL：如果是 cloud:// 异步换取临时 URL，否则同步处理
async function refreshDisplayUrl() {
  if (!props.src) {
    displayUrl.value = ''
    return
  }
  usedCloudDownload = false
  if (isCloudUrl(props.src)) {
    // 先用缓存（同步）快速渲染，再异步刷新
    const cached = resolveCloudUrlSync(props.src)
    if (cached && cached !== props.src) {
      displayUrl.value = cached
    } else {
      // 无缓存：首次把原始 cloud:// 直接赋 src 发起加载，
      // 避免 displayUrl='' 导致 <image src=''> 根本不请求、一直白屏。
      // <image> 内部无法解析 cloud:// 会立刻触发 error → handleError 走
      // "invalidate 缓存 + resolveCloudUrl 换取 https + 必要时 cloud.downloadFile 降级" 链路，
      // 比等待异步 resolveCloudUrl 的数百毫秒白屏体验更稳。
      displayUrl.value = props.src
    }
    try {
      const fresh = await resolveCloudUrl(props.src)
      if (fresh && fresh !== displayUrl.value) {
        displayUrl.value = fresh
      }
    } catch (e) {
      console.warn('[cloud-image] 解析 cloud URL 失败:', props.src, e)
    }
  } else {
    const resolved = resolveUrl(props.src)
    displayUrl.value = resolved
    // resolveUrl 可能把 /uploads/ 相对路径映射为 cloud://（云函数模式兜底），
    // 此时同样异步换取 https 临时 URL，与其他 cloud:// 链路一致
    if (isCloudUrl(resolved)) {
      try {
        const fresh = await resolveCloudUrl(resolved)
        if (fresh && fresh !== displayUrl.value) {
          displayUrl.value = fresh
        }
      } catch (e) {
        console.warn('[cloud-image] 解析兜底 cloud URL 失败:', resolved, e)
      }
    }
  }
}

// cloud.downloadFile 降级：https URL 被 <image> 拒绝（域名未加入 downloadFile 合法域名）或
// 临时链接过期 403 时，用 wx.cloud.downloadFile 下载到本地 tempFilePath（绕过域名白名单）
function tryCloudDownload(fileIdOverride?: string) {
  // #ifdef MP-WEIXIN
  const cloudFileID = fileIdOverride || (
    isCloudUrl(props.src)
      ? props.src
      : (() => {
          const r = resolveUrl(props.src)
          // cloud:// 直接用；https 临时链接可反推出 cloud:// fileID
          return isCloudUrl(r) ? r : tempHttpsToCloudFileId(r)
        })()
  )
  if (!cloudFileID || typeof wx === 'undefined' || !wx.cloud || typeof wx.cloud.downloadFile !== 'function') return false
  usedCloudDownload = true
  wx.cloud.downloadFile({
    fileID: cloudFileID,
    success: (res: any) => {
      if (res.tempFilePath) {
        console.log('[cloud-image] cloud.downloadFile 降级成功:', props.src.slice(0, 50))
        displayUrl.value = res.tempFilePath
      }
    },
    fail: (err: any) => {
      console.warn('[cloud-image] cloud.downloadFile 失败:', props.src.slice(0, 50), err)
    },
  })
  return true
  // #endif
  return false
}

onMounted(refreshDisplayUrl)
watch(() => props.src, () => {
  retryCount.value = 0
  refreshDisplayUrl()
})

/** 解析当前 src 对应的 cloud:// fileID（cloud:// 直接用；/uploads/ 经 resolveUrl；https 临时链接反推） */
function resolveCloudFileId(): string {
  if (isCloudUrl(props.src)) return props.src
  const r = resolveUrl(props.src)
  if (isCloudUrl(r)) return r
  // 服务端直接下发的 https 临时链接过期(403)：由链接反推 fileID 走 downloadFile 降级
  return tempHttpsToCloudFileId(props.src) || tempHttpsToCloudFileId(r)
}

// 图片加载失败处理：cloud:// 清缓存 + 指数退避重试
function handleError() {
  if (retryCount.value >= MAX_RETRY) {
    console.warn('[cloud-image] 达到最大重试次数, 放弃:', props.src)
    emit('error')
    return
  }
  const cloudId = resolveCloudFileId()
  if (!cloudId) {
    // 普通网络图/本地资源失败，重试无意义
    emit('error')
    return
  }
  retryCount.value++
  // 403 多为临时链接已过期：先淘汰缓存（/uploads/ 形态要用解析后的 cloudId，
  // 以前 invalidateCloudUrl(props.src) 清的是原始路径，缓存条目根本删不掉），
  // 否则后续渲染/onShow 仍取到死链接，表现为同一批图反复 403
  invalidateCloudUrl(cloudId)
  // 第一次失败时先尝试 cloud.downloadFile 降级（绕过域名白名单/过期签名），再失败才走指数退避
  if (!usedCloudDownload && tryCloudDownload(cloudId)) return
  // 指数退避：1s → 2s → 4s，缓存已淘汰，refreshDisplayUrl 会重新换取新链接
  const delay = Math.pow(2, retryCount.value - 1) * 1000
  console.warn(`[cloud-image] 加载失败(retry=${retryCount.value}/${MAX_RETRY})，${delay}ms 后重取链接重试:`, props.src)
  setTimeout(refreshDisplayUrl, delay)
}

function handleLoad() {
  // 加载成功重置重试计数
  retryCount.value = 0
  emit('load')
}
</script>
