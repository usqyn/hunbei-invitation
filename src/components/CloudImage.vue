<template>
  <image
    :src="displayUrl"
    :mode="mode"
    :lazy-load="lazyLoad"
    :fade-show="fadeShow"
    :style="customStyle"
    :class="customClass"
    @error="handleError"
    @load="handleLoad"
  />
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { resolveUrl, isCloudUrl, resolveCloudUrl, resolveCloudUrlSync, invalidateCloudUrl } from '@/utils/url'

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

const emit = defineEmits<{
  (e: 'load'): void
  (e: 'error'): void
}>()

const displayUrl = ref('')
const retryCount = ref(0)
const MAX_RETRY = 1

// 解析 URL：如果是 cloud:// 异步换取临时 URL，否则同步处理
async function refreshDisplayUrl() {
  if (!props.src) {
    displayUrl.value = ''
    return
  }
  if (isCloudUrl(props.src)) {
    // 先用缓存（同步）快速渲染，再异步刷新
    displayUrl.value = resolveCloudUrlSync(props.src)
    try {
      const fresh = await resolveCloudUrl(props.src)
      if (fresh !== displayUrl.value) {
        displayUrl.value = fresh
      }
    } catch (e) {
      console.warn('[cloud-image] 解析 cloud URL 失败:', props.src, e)
    }
  } else {
    displayUrl.value = resolveUrl(props.src)
  }
}

onMounted(refreshDisplayUrl)
watch(() => props.src, () => {
  retryCount.value = 0
  refreshDisplayUrl()
})

// 图片加载失败处理：cloud:// URL 清缓存重试一次
function handleError() {
  if (retryCount.value >= MAX_RETRY) {
    emit('error')
    return
  }
  if (!isCloudUrl(props.src)) {
    emit('error')
    return
  }
  retryCount.value++
  // 清除缓存后重新换取
  invalidateCloudUrl(props.src)
  refreshDisplayUrl()
}

function handleLoad() {
  // 加载成功重置重试计数
  retryCount.value = 0
  emit('load')
}
</script>
