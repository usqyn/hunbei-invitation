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
import { ref, watch, onMounted, useAttrs, computed, getCurrentInstance } from 'vue'
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
// 组件实例：createSelectorQuery().in() 需要。必须在 setup 同步阶段取，
// 事件回调里再调 getCurrentInstance() 会返回 null（$scope undefined 崩溃）
const compInstance = getCurrentInstance()

// 将父级通过 class/style 透传的属性与 props.customClass/customStyle 合并，
// 确保外部 <CloudImage class="xxx" /> 的样式能作用到内部 <image>。
const finalClass = computed(() => ['cloud-image__root', attrs.class, props.customClass].filter(Boolean).join(' '))
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
// cloud.downloadFile 失败重试次数（偶发网络抖动，重试 1 次再放弃）
let downloadRetries = 0
// 本地路径锁定：cloud.downloadFile 拿到的 wxfile:// 本地路径一旦加载成功即为终态，
// 不允许异步 https 刷新覆盖（真机 https 临时链接受域名白名单限制，覆盖必失败 → 空白）
let localLocked = false
// 已下载到本地的临时文件路径（供 wxfile 渲染失败时升级为 base64 data URL）
let localPath = ''
// data URL 兜底是否已尝试（防止 <image> 报错死循环）
let dataUrlTried = false

// 真机判定：真机 <image> 加载云存储 https 临时链接要求 tcb 主机在「downloadFile 合法域名」
// 白名单内（未配置则必失败）；开发者工具不校验白名单。wx.cloud.downloadFile 按 fileID
// 下载免白名单，本地 tempFilePath 在 <image> 上必定可用，因此真机云存储图直接走下载通道。
const isRealDevice = (() => {
  // #ifdef MP-WEIXIN
  try {
    if (typeof uni.getDeviceInfo === 'function') {
      const p = (uni as any).getDeviceInfo()?.platform
      if (p) return p !== 'devtools'
    }
    const info = (uni as any).getSystemInfoSync?.()
    return info?.platform ? info.platform !== 'devtools' : true
  } catch { return true }
  // #endif
  // #ifndef MP-WEIXIN
  return false
  // #endif
})()

// 解析 URL：如果是 cloud:// 异步换取临时 URL，否则同步处理
async function refreshDisplayUrl() {
  if (!props.src) {
    displayUrl.value = ''
    return
  }
  usedCloudDownload = false
  downloadRetries = 0
  localLocked = false
  localPath = ''
  dataUrlTried = false
  const cloudId = resolveCloudFileId()

  // 真机不再强制走 downloadFile：downloadFile 返回的 wxfile 临时路径在部分真机上
  // <image> 解码成功（@load、natural 尺寸正确、盒模型正常）但像素不渲染（空白）。
  // 已配置 downloadFile 白名单后，真机与 devtools 一样优先走 https 临时链接直连；
  // https 失败（白名单未生效/链接过期）由 handleError 降级 downloadFile → data URL。
  void cloudId

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
      // 本地路径已锁定（downloadFile 抢先成功）时不得用 https 覆盖
      if (fresh && fresh !== displayUrl.value && !localLocked) {
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
        if (fresh && fresh !== displayUrl.value && !localLocked) {
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
  const targetSrc = props.src
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
      // src 已切换（列表复用等）时丢弃过期回调，避免覆盖新图
      if (targetSrc !== props.src) return
      if (res.tempFilePath) {
        console.log('[cloud-image] cloud.downloadFile 成功，转 data URL 渲染:', props.src.slice(0, 50))
        localPath = res.tempFilePath
        // 真机 wxfile 临时路径 <image> 解码成功但像素不渲染（空白），
        // 下载后直接读成 base64 data URL 内联渲染（不受本地路径/域名限制），最可靠。
        renderDownloadedAsDataUrl(cloudFileID)
      }
    },
    fail: (err: any) => {
      if (targetSrc !== props.src) return
      // 偶发网络抖动：延迟 500ms 重试一次，仍失败则放弃（真机云存储图无其他可用通道）
      if (downloadRetries < 1) {
        downloadRetries++
        console.warn('[cloud-image] cloud.downloadFile 失败，500ms 后重试:', props.src.slice(0, 50), err)
        setTimeout(() => { if (targetSrc === props.src) tryCloudDownload(cloudFileID) }, 500)
      } else {
        console.warn('[cloud-image] cloud.downloadFile 重试后仍失败，放弃:', props.src.slice(0, 50), err)
        emit('error')
      }
    },
  })
  return true
  // #endif
  return false
}

// 下载到本地的 tempFilePath 在真机 <image> 上「解码成功但像素不渲染（空白）」，
// 故下载后直接读成 base64 data URL 内联渲染（data URL 不受本地路径/域名限制，真机必出像素）。
// readFile 失败（极大图等）才退回 wxfile 本地路径作为最后手段。
function renderDownloadedAsDataUrl(fileIdForMime: string) {
  // #ifdef MP-WEIXIN
  if (dataUrlTried || !localPath) return
  dataUrlTried = true
  try {
    const extSrc = (fileIdForMime || resolveCloudFileId() || props.src).toLowerCase()
    const mime = extSrc.includes('.png') ? 'image/png'
      : extSrc.includes('.gif') ? 'image/gif'
      : extSrc.includes('.webp') ? 'image/webp'
      : 'image/jpeg'
    wx.getFileSystemManager().readFile({
      filePath: localPath,
      encoding: 'base64',
      success: (r: any) => {
        localLocked = true
        console.log('[cloud-image] data URL 渲染:', props.src.slice(0, 50), '(' + Math.round((r.data || '').length / 1024) + 'KB)')
        displayUrl.value = `data:${mime};base64,${r.data}`
      },
      fail: (err: any) => {
        // data URL 失败（多见于超大图 base64 超限）：退回 wxfile 本地路径最后一搏
        console.warn('[cloud-image] data URL 转换失败，退回本地路径:', props.src.slice(0, 50), err)
        localLocked = true
        displayUrl.value = localPath
      },
    })
  } catch {
    localLocked = true
    displayUrl.value = localPath
  }
  // #endif
}

onMounted(refreshDisplayUrl)
watch(() => props.src, () => {
  retryCount.value = 0
  localLocked = false
  localPath = ''
  dataUrlTried = false
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

// 图片加载失败处理
function handleError() {
  const cloudId = resolveCloudFileId()

  // #ifdef MP-WEIXIN
  // 真机云存储图加载链路：https 临时链接直连（白名单已配，与 devtools 同路径）
  //   → 失败(白名单未生效/链接过期)则 cloud.downloadFile 下载后转 data URL 内联渲染
  //   → data URL 也失败才放弃。wxfile 本地路径在部分真机解码成功但像素不渲染，不作为展示通道。
  if (isRealDevice && cloudId) {
    if (!usedCloudDownload) {
      tryCloudDownload(cloudId)
      return
    }
    // 已走过下载：data URL 渲染仍报错 → 终态
    console.warn('[cloud-image] 所有加载通道均失败，放弃:', props.src.slice(0, 50))
    emit('error')
    return
  }
  // #endif

  if (retryCount.value >= MAX_RETRY) {
    console.warn('[cloud-image] 达到最大重试次数, 放弃:', props.src)
    emit('error')
    return
  }
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
  // 第一次失败时先尝试 cloud.downloadFile 降级（绕过域名白名单/过期签名），再失败才走指数退避。
  // 下载成功后 renderDownloadedAsDataUrl 会自动转 data URL 渲染，无需在此再升级。
  if (!usedCloudDownload && tryCloudDownload(cloudId)) return
  // 指数退避：1s → 2s → 4s，缓存已淘汰，refreshDisplayUrl 会重新换取新链接
  // localLocked 时（data URL/本地路径已加载成功）不应再有 error，防御性跳过
  if (localLocked) return
  const delay = Math.pow(2, retryCount.value - 1) * 1000
  console.warn(`[cloud-image] 加载失败(retry=${retryCount.value}/${MAX_RETRY})，${delay}ms 后重取链接重试:`, props.src)
  setTimeout(refreshDisplayUrl, delay)
}

function handleLoad(e: any) {
  // 加载成功重置重试计数
  retryCount.value = 0
  // 诊断日志：确认走下载通道的图片最终渲染成功（若只有"降级成功"没有此条，说明本地路径未渲染）
  if (localLocked || dataUrlTried) {
    const nw = e?.detail?.width, nh = e?.detail?.height
    console.log('[cloud-image] 渲染成功(' + (dataUrlTried ? 'dataUrl' : '本地路径') + ') natural=' + nw + 'x' + nh + ':', props.src.slice(0, 50))
    // #ifdef MP-WEIXIN
    // 真机专属诊断：@load 只代表解码成功，不代表可见。实测 <image> 盒模型尺寸：
    // 盒模型 0/极小 → 父容器高度塌陷（布局问题）；尺寸正常但画面不可见 → 像素/层叠问题
    if (isRealDevice) {
      try {
        // mp-weixin Vue3：.in() 取 proxy（公开实例）；个别版本需内部实例，做兜底
        const scope = (compInstance as any)?.proxy || compInstance
        uni.createSelectorQuery()
          .in(scope as any)
          .select('.cloud-image__root')
          .boundingClientRect((rect: any) => {
            console.log('[cloud-image] 盒模型:', rect ? Math.round(rect.width) + 'x' + Math.round(rect.height) + ' @' + Math.round(rect.top) : 'null', '| src:', props.src.slice(0, 44))
          })
          .exec()
      } catch (err) { console.warn('[cloud-image] 盒模型测量失败', err) }
    }
    // #endif
  }
  emit('load')
}
</script>
