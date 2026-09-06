<template>
  <view v-if="visible" class="image-adjuster">
    <!-- 顶部栏：左上角明显返回按钮 -->
    <view class="adjuster-header">
      <view class="adjuster-back" @click="onCancel">
        <text class="back-arrow">‹</text>
        <text class="back-text">返回</text>
      </view>
      <text class="adjuster-title">调整图片</text>
    </view>

    <!-- 裁剪舞台（窗口外四边遮罩变暗） -->
    <view class="adjuster-stage">
      <view class="stage-mask" :style="topMaskStyle"></view>
      <view class="stage-mask" :style="bottomMaskStyle"></view>
      <view class="stage-mask" :style="leftMaskStyle"></view>
      <view class="stage-mask" :style="rightMaskStyle"></view>

      <!-- 裁剪窗口：锁定为元素宽高比，单指拖动 / 双指缩放 -->
      <view
        class="crop-window"
        :style="cropStyle"
        @touchstart="onTouchStart"
        @touchmove.stop.prevent="onTouchMove"
        @touchend.stop="onTouchEnd"
        @touchcancel.stop="onTouchEnd"
      >
        <image
          v-if="currentUrl"
          class="crop-image"
          :src="currentUrl"
          :style="imageStyle"
          mode="scaleToFill"
        />
        <!-- 三分网格辅助线 -->
        <view class="crop-grid crop-grid-h" style="top: 33.3333%"></view>
        <view class="crop-grid crop-grid-h" style="top: 66.6666%"></view>
        <view class="crop-grid crop-grid-v" style="left: 33.3333%"></view>
        <view class="crop-grid crop-grid-v" style="left: 66.6666%"></view>
      </view>
    </view>

    <!-- 操作提示 -->
    <view class="adjuster-tip">单指拖动移动 · 双指缩放</view>

    <!-- 底部操作区 -->
    <view class="adjuster-footer">
      <view class="adjuster-btn adjuster-btn--ghost" @click="onRechoose">重选照片</view>
      <view class="adjuster-btn adjuster-btn--primary" @click="onConfirm">完成</view>
    </view>

    <!-- 导出用的离屏 canvas -->
    <canvas type="2d" id="image-adjuster-canvas" class="adjuster-canvas"></canvas>
  </view>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, ref, watch } from 'vue'
import { resolveCloudUrl, resolveCloudUrlSync, isCloudUrl, tempHttpsToCloudFileId } from '@/utils/url'

const props = defineProps<{
  visible: boolean
  imageUrl: string
  /** 蒙板形状图 URL（alpha 蒙板时用于预览裁切，形状烘焙在 alpha 通道） */
  maskSrc?: string
  /** 裁剪窗口宽高比（宽/高），锁定为元素宽高比 */
  targetRatio: number
  /** 元素圆角（rpx），仅影响裁剪窗口预览圆角，导出仍为矩形 */
  targetBorderRadius?: number
  /** 元素遮罩类型：'circle' = 圆形裁剪预览 */
  targetMask?: string
}>()
const emit = defineEmits<{
  (e: 'confirm', tempPath: string): void
  (e: 'cancel'): void
}>()

// 蒙板形状图 → data URL。
// 关键：CSS mask-image 在真机上加载网络 https 同样受 downloadFile 白名单限制，
// 且 mask 图加载失败时按 CSS 规范元素被「全遮」（alpha=0）→ 预览全黑。
// 唯一可靠通道与 CloudImage 一致：cloud://（或 tcb https 反推 fileID）走
// wx.cloud.downloadFile 下载 → readFile 转 base64 data URL 内联（免白名单）。
// 解析失败/未就绪时 resolvedMaskSrc 保持空串，cropStyle 不应用遮罩（矩形显示，
// 图片始终可见），成品合成不受影响（合成走页面 canvas，不依赖这里的预览 mask）。
const resolvedMaskSrc = ref('')
async function resolveMaskSrc(src: string) {
  resolvedMaskSrc.value = ''
  if (!src) return
  try {
    if (src.startsWith('data:')) {
      resolvedMaskSrc.value = src
      return
    }
    // 1) 拿到本地临时路径
    let localPath = ''
    if (/^(wxfile|file):\/\//i.test(src) || /^http:\/\/tmp\//i.test(src)) {
      localPath = src
    } else {
      const fileId = isCloudUrl(src) ? src : tempHttpsToCloudFileId(src)
      if (fileId) localPath = await downloadCloudToTemp(fileId)
    }
    if (!localPath) return
    // #ifdef MP-WEIXIN
    // 超大蒙版图 base64 会超限，预判放弃遮罩（矩形显示），不做无效转换
    let fileSize = 0
    try { fileSize = wx.getFileSystemManager().statSync(localPath).size || 0 } catch { fileSize = 0 }
    if (fileSize > 3 * 1024 * 1024) {
      console.warn('[adjuster] 蒙版图过大(' + Math.round(fileSize / 1024) + 'KB)，预览不遮罩')
      return
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath: localPath,
        encoding: 'base64',
        success: (r: any) => resolve(`data:image/png;base64,${r.data}`),
        fail: reject,
      })
    })
    resolvedMaskSrc.value = dataUrl
    // #endif
    // #ifndef MP-WEIXIN
    resolvedMaskSrc.value = localPath
    // #endif
  } catch (e) {
    console.warn('[adjuster] 蒙版形状图加载失败，预览降级为矩形（成品不受影响）:', String(src).slice(0, 60), e)
    resolvedMaskSrc.value = ''
  }
}
watch(
  () => props.maskSrc,
  (src: string) => { void resolveMaskSrc(src) },
  { immediate: true }
)

const instance = getCurrentInstance()

// ===== 布局（px）=====
const sysInfo: any = uni.getWindowInfo()
const WIN_W: number = sysInfo.windowWidth || 375
const WIN_H: number = sysInfo.windowHeight || 667
const HEADER_H = 48
const TIP_H = 36
const FOOTER_H = 132
const STAGE_H = WIN_H - HEADER_H - TIP_H - FOOTER_H

const ratio = computed(() => (props.targetRatio && props.targetRatio > 0 ? props.targetRatio : 1))
// 裁剪窗口尺寸：宽度取满，若高度超限则按高度反推
const viewW = computed(() => {
  const maxW = WIN_W - 32
  const maxH = STAGE_H - 32
  let w = maxW
  let h = w / ratio.value
  if (h > maxH) {
    h = maxH
    w = h * ratio.value
  }
  return w
})
const viewH = computed(() => viewW.value / ratio.value)
const cropLeft = computed(() => (WIN_W - viewW.value) / 2)
const cropTop = computed(() => HEADER_H + (STAGE_H - viewH.value) / 2)
// 元素圆角 rpx -> px（按屏幕宽换算）；圆形遮罩时强制 50%；alpha 遮罩时 0
const borderPx = computed(() => {
  if (props.targetMask === 'circle') return Infinity
  if (props.targetMask === 'alpha') return 0
  return ((props.targetBorderRadius || 0) * WIN_W) / 750
})

const cropStyle = computed(() => {
  const base: Record<string, string> = {
    left: cropLeft.value + 'px',
    top: cropTop.value + 'px',
    width: viewW.value + 'px',
    height: viewH.value + 'px',
  }
  // alpha 蒙板：用蒙板形状图（maskSrc，已解析为 http(s)）裁切预览，让用户实时看到
  // 最终形状；非 alpha 时回落到圆角 / 圆形。
  if (props.targetMask === 'alpha' && resolvedMaskSrc.value) {
    base.WebkitMaskImage = `url(${resolvedMaskSrc.value})`
    base.maskImage = `url(${resolvedMaskSrc.value})`
    base.WebkitMaskSize = 'contain'
    base.maskSize = 'contain'
    base.WebkitMaskRepeat = 'no-repeat'
    base.WebkitMaskPosition = 'center'
    base.borderRadius = '0'
  } else {
    base.borderRadius = props.targetMask === 'circle' ? '50%' : borderPx.value + 'px'
  }
  return base
})

const maskBg = 'rgba(0, 0, 0, 0.82)'
const topMaskStyle = computed(() => ({
  position: 'absolute',
  left: '0',
  right: '0',
  top: '0',
  height: cropTop.value + 'px',
  background: maskBg,
}))
const bottomMaskStyle = computed(() => ({
  position: 'absolute',
  left: '0',
  right: '0',
  top: cropTop.value + viewH.value + 'px',
  bottom: '0',
  background: maskBg,
}))
const leftMaskStyle = computed(() => ({
  position: 'absolute',
  left: '0',
  top: cropTop.value + 'px',
  width: cropLeft.value + 'px',
  height: viewH.value + 'px',
  background: maskBg,
}))
const rightMaskStyle = computed(() => ({
  position: 'absolute',
  right: '0',
  top: cropTop.value + 'px',
  width: (WIN_W - cropLeft.value - viewW.value) + 'px',
  height: viewH.value + 'px',
  background: maskBg,
}))

// ===== 图片变换状态 =====
const currentUrl = ref('')
const imgInfo = ref<{ w: number; h: number; path: string }>({ w: 0, h: 0, path: '' })
const scale = ref(1) // 相对 cover 的倍数
const offsetX = ref(0) // 图片中心相对窗口中心 X 偏移（px）
const offsetY = ref(0)

const MIN_SCALE = 1
const MAX_SCALE = 5

const coverScale = computed(() => {
  if (!imgInfo.value.w || !imgInfo.value.h) return 1
  return Math.max(viewW.value / imgInfo.value.w, viewH.value / imgInfo.value.h)
})
const drawW = computed(() => imgInfo.value.w * coverScale.value * scale.value)
const drawH = computed(() => imgInfo.value.h * coverScale.value * scale.value)

const imageStyle = computed(() => ({
  left: viewW.value / 2 + offsetX.value - drawW.value / 2 + 'px',
  top: viewH.value / 2 + offsetY.value - drawH.value / 2 + 'px',
  width: drawW.value + 'px',
  height: drawH.value + 'px',
}))

function clampScale(s: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s))
}
function clampOffset(x: number, y: number) {
  const maxX = Math.max(0, (drawW.value - viewW.value) / 2)
  const maxY = Math.max(0, (drawH.value - viewH.value) / 2)
  return {
    x: Math.min(maxX, Math.max(-maxX, x)),
    y: Math.min(maxY, Math.max(-maxY, y)),
  }
}

// cloud:// 图片下载到本地临时路径（与 CloudImage 兜底通道一致）
function downloadCloudToTemp(cloudUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof wx === 'undefined' || !wx.cloud || typeof wx.cloud.downloadFile !== 'function') {
      reject(new Error('wx.cloud.downloadFile 不可用'))
      return
    }
    wx.cloud.downloadFile({
      fileID: cloudUrl,
      success: (res: any) => {
        if (res.tempFilePath) resolve(res.tempFilePath)
        else reject(new Error('downloadFile 无 tempFilePath'))
      },
      fail: reject,
    })
  })
}

async function loadImageInfo(url: string) {
  if (!url) {
    imgInfo.value = { w: 0, h: 0, path: '' }
    return
  }
  const getInfo = (s: string) =>
    new Promise<{ w: number; h: number; path: string }>((resolve, reject) => {
      uni.getImageInfo({
        src: s,
        success: (res: any) => resolve({ w: res.width || 0, h: res.height || 0, path: res.path || s }),
        fail: reject,
      })
    })

  // 通道按可靠性/速度排序，逐个尝试，任一成功即返回：
  //   ① 本地临时路径 / data URL（chooseMedia 选的新照片，必可用）
  //   ② https 签名链接（有缓存时的快路径；真机无 downloadFile 白名单会失败）
  //   ③ wx.cloud.downloadFile 云通道（免白名单，与 CloudImage 同源，真机兜底）
  // cloud:// 绝不直接塞给 <image>（image 组件不支持该协议，只会渲染失败黑块）
  const isLocal = (u: string) =>
    /^(wxfile|file):\/\//i.test(u) || /^http:\/\/tmp\//i.test(u) || u.startsWith('data:')
  const channels: Array<{ kind: 'direct' | 'cloud'; src: string }> = []

  if (isLocal(url)) {
    channels.push({ kind: 'direct', src: url })
  } else {
    const fileId = isCloudUrl(url) ? url : tempHttpsToCloudFileId(url)
    if (isCloudUrl(url)) {
      // cloud://：先试缓存/换取的 https 快路径，再试云通道
      let https = ''
      const cached = resolveCloudUrlSync(url)
      if (cached && !isCloudUrl(cached)) https = cached
      if (!https) {
        try {
          const u = await resolveCloudUrl(url)
          if (u && !isCloudUrl(u)) https = u
        } catch { /* 换取失败，走云通道 */ }
      }
      if (https) channels.push({ kind: 'direct', src: https })
      if (fileId) channels.push({ kind: 'cloud', src: fileId })
    } else if (/^https?:\/\//.test(url)) {
      channels.push({ kind: 'direct', src: url })
      if (fileId) channels.push({ kind: 'cloud', src: fileId })
    } else {
      channels.push({ kind: 'direct', src: url })
    }
  }

  for (const ch of channels) {
    try {
      const renderSrc = ch.kind === 'cloud' ? await downloadCloudToTemp(ch.src) : ch.src
      const info = await getInfo(renderSrc)
      currentUrl.value = renderSrc
      imgInfo.value = info
      return
    } catch (e) {
      console.warn('[adjuster] 图片通道失败:', ch.kind, String(ch.src).slice(0, 60), e)
    }
  }
  // 全部失败：清空 imgInfo，避免用过期的旧 path 裁剪出黑图
  imgInfo.value = { w: 0, h: 0, path: '' }
  console.warn('[adjuster] loadImageInfo 全部失败: url=', String(url).slice(0, 80))
  uni.showToast({ title: '图片加载失败，请重试', icon: 'none' })
}

function reset() {
  const url = props.imageUrl || ''
  // cloud:// 不能直接给 <image>（协议不支持，渲染失败黑块）；先清空，
  // loadImageInfo 拿到 https/本地路径后再赋值
  currentUrl.value = isCloudUrl(url) ? '' : url
  scale.value = 1
  offsetX.value = 0
  offsetY.value = 0
  loadImageInfo(url)
}

watch(
  () => props.visible,
  (v) => {
    if (v) reset()
  },
)
watch(
  () => props.imageUrl,
  () => {
    if (props.visible) reset()
  },
)

// ===== 手势：单指拖动 + 双指缩放（无旋转）=====
let gesture: any = null

function onTouchStart(e: any) {
  if (!e.touches || !e.touches.length) return
  if (e.touches.length === 1) {
    const t = e.touches[0]
    gesture = {
      type: 'pan',
      x: t.clientX,
      y: t.clientY,
      ox: offsetX.value,
      oy: offsetY.value,
    }
  } else if (e.touches.length === 2) {
    const t1 = e.touches[0]
    const t2 = e.touches[1]
    const dx = t2.clientX - t1.clientX
    const dy = t2.clientY - t1.clientY
    const dist = Math.sqrt(dx * dx + dy * dy)
    // 双指中心相对裁剪窗口的坐标
    const midX = (t1.clientX + t2.clientX) / 2 - cropLeft.value
    const midY = (t1.clientY + t2.clientY) / 2 - cropTop.value
    // 双指中心在图片上的相对位置（保持锚点不动）
    gesture = {
      type: 'pinch',
      dist,
      scale: scale.value,
      midX,
      midY,
      relX: (midX - (viewW.value / 2 + offsetX.value)) / drawW.value,
      relY: (midY - (viewH.value / 2 + offsetY.value)) / drawH.value,
    }
  }
}

function onTouchMove(e: any) {
  if (!gesture || !e.touches) return
  if (gesture.type === 'pan' && e.touches.length === 1) {
    const t = e.touches[0]
    const clamped = clampOffset(
      gesture.ox + t.clientX - gesture.x,
      gesture.oy + t.clientY - gesture.y,
    )
    offsetX.value = clamped.x
    offsetY.value = clamped.y
  } else if (gesture.type === 'pinch' && e.touches.length === 2) {
    const t1 = e.touches[0]
    const t2 = e.touches[1]
    const dx = t2.clientX - t1.clientX
    const dy = t2.clientY - t1.clientY
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (!dist || !gesture.dist) return
    const newScale = clampScale(gesture.scale * (dist / gesture.dist))
    const sFactor = newScale / gesture.scale
    // 保持双指中心对应的图片点不动
    const newCx = gesture.midX === undefined
      ? viewW.value / 2 + offsetX.value
      : gesture.midX - gesture.relX * drawW.value * sFactor
    const newCy = gesture.midY === undefined
      ? viewH.value / 2 + offsetY.value
      : gesture.midY - gesture.relY * drawH.value * sFactor
    scale.value = newScale
    const clamped = clampOffset(newCx - viewW.value / 2, newCy - viewH.value / 2)
    offsetX.value = clamped.x
    offsetY.value = clamped.y
  }
}

function onTouchEnd() {
  gesture = null
}

// ===== 重选照片：组件内部直接选择并重置变换 =====
function setNewUrl(url: string) {
  currentUrl.value = url
  scale.value = 1
  offsetX.value = 0
  offsetY.value = 0
  loadImageInfo(url)
}

function onRechoose() {
  // #ifdef MP-WEIXIN
  uni.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sourceType: ['album', 'camera'],
    success: (res: any) => {
      if (res.tempFiles && res.tempFiles.length > 0) {
        setNewUrl(res.tempFiles[0].tempFilePath)
      }
    },
    fail: (err: any) => {
      if (err.errMsg && !err.errMsg.includes('cancel')) {
        uni.showToast({ title: '图片选择失败', icon: 'none' })
      }
    },
  })
  // #endif
  // #ifndef MP-WEIXIN
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res: any) => {
      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        setNewUrl(res.tempFilePaths[0])
      }
    },
    fail: (err: any) => {
      if (err.errMsg && !err.errMsg.includes('cancel')) {
        uni.showToast({ title: '图片选择失败', icon: 'none' })
      }
    },
  })
  // #endif
}

function onCancel() {
  gesture = null
  emit('cancel')
}

// ===== 完成：canvas 2d 按 dpr≈3 裁剪窗口区域并导出 =====
function renderCrop(): Promise<string> {
  return new Promise((resolve) => {
    nextTick(() => {
      const query = uni.createSelectorQuery().in(instance?.proxy)
      query
        .select('#image-adjuster-canvas')
        .fields({ node: true, size: true })
        .exec((res: any) => {
          const canvas = res && res[0] ? res[0].node : null
          if (!canvas) {
            resolve('')
            return
          }
          const ctx = canvas.getContext('2d')
          const dpr = 3
          canvas.width = Math.round(viewW.value * dpr)
          canvas.height = Math.round(viewH.value * dpr)
          ctx.clearRect(0, 0, canvas.width, canvas.height)

        // 图片在窗口坐标系中的左上角（可超出窗口）
        const imgLeft = viewW.value / 2 + offsetX.value - drawW.value / 2
        const imgTop = viewH.value / 2 + offsetY.value - drawH.value / 2
        // 换算为原图像素：窗口内的可见区域
        const k = imgInfo.value.w / drawW.value
        let sx = Math.max(0, -imgLeft) * k
        let sy = Math.max(0, -imgTop) * k
        let sw = viewW.value * k
        let sh = viewH.value * k
        // 防御性夹紧：源矩形不得超出原图边界（正常 cover+clamp 下不会越界，这里保底）
        const iw = imgInfo.value.w
        const ih = imgInfo.value.h
        if (sx < 0) { sw += sx; sx = 0 }
        if (sy < 0) { sh += sy; sy = 0 }
        if (sx + sw > iw) sw = iw - sx
        if (sy + sh > ih) sh = ih - sy
        if (sw <= 0 || sh <= 0) {
          console.warn('[ImageAdjuster] 裁剪区域无效，sx,sy,sw,sh=', sx, sy, sw, sh, 'img=', iw, ih)
          resolve('')
          return
        }
        console.log('[ImageAdjuster] 裁剪诊断',
          '原图', imgInfo.value.w + 'x' + imgInfo.value.h,
          '窗口', Math.round(viewW.value) + 'x' + Math.round(viewH.value),
          'scale', scale.value.toFixed(2),
          'offset', Math.round(offsetX.value) + ',' + Math.round(offsetY.value),
          'cover', coverScale.value.toFixed(3),
          'draw', Math.round(drawW.value) + 'x' + Math.round(drawH.value),
          'imgLeft/Top', Math.round(imgLeft) + ',' + Math.round(imgTop),
          '→ sx,sy,sw,sh=', Math.round(sx), Math.round(sy), Math.round(sw), Math.round(sh),
          'canvas', Math.round(viewW.value * 3) + 'x' + Math.round(viewH.value * 3))

        const loadImg = (src: string) =>
          new Promise<any>((ok, fail) => {
            const img = canvas.createImage ? canvas.createImage() : new Image()
            img.onload = () => ok(img)
            img.onerror = fail
            img.src = src
          })

        loadImg(imgInfo.value.path || currentUrl.value)
          .then((img) => {
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
            // #ifdef MP-WEIXIN
            uni.canvasToTempFilePath({
              canvas,
              fileType: 'jpg',
              quality: 0.9,
              success: (res2: any) => resolve(res2.tempFilePath),
              fail: () => resolve(''),
            } as any)
            // #endif
            // #ifndef MP-WEIXIN
            try {
              const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
              resolve(dataUrl)
            } catch {
              resolve('')
            }
            // #endif
          })
          .catch(() => {
            resolve('')
          })
        })
    })
  })
}

async function onConfirm() {
  if (!currentUrl.value || !imgInfo.value.w || !imgInfo.value.h) {
    uni.showToast({ title: '请先选择照片', icon: 'none' })
    return
  }
  uni.showLoading({ title: '生成中' })
  try {
    const tempPath = await renderCrop()
    if (tempPath) {
      emit('confirm', tempPath)
    } else {
      uni.showToast({ title: '生成失败，请重试', icon: 'none' })
    }
  } finally {
    uni.hideLoading({ fail: () => {} })
  }
}
</script>

<style scoped>
.image-adjuster {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: #000;
  display: flex;
  flex-direction: column;
}

.adjuster-header {
  position: relative;
  /* 避开状态栏/刘海（--status-bar-height 由 uni-app 注入，小程序可用） */
  height: calc(48px + var(--status-bar-height, 0px));
  padding-top: var(--status-bar-height, 0px);
  display: flex;
  align-items: center;
  padding-left: 16px;
  padding-right: 16px;
  box-sizing: border-box;
  flex-shrink: 0;
}

/* 左上角返回按钮：实心胶囊底 + 箭头 + 文字，位置醒目 */
.adjuster-back {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 16px 0 12px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.92);
  box-sizing: border-box;
}

.back-arrow {
  color: #111111;
  font-size: 26px;
  font-weight: 700;
  line-height: 1;
  margin-right: 2px;
}

.back-text {
  color: #111111;
  font-size: 15px;
  font-weight: 600;
  line-height: 1;
}

.adjuster-title {
  position: absolute;
  left: 0;
  right: 0;
  top: var(--status-bar-height, 0px);
  height: 48px;
  line-height: 48px;
  text-align: center;
  color: #fff;
  font-size: 17px;
  font-weight: 600;
  pointer-events: none;
}

.adjuster-stage {
  position: relative;
  flex: 1;
  overflow: hidden;
}

.crop-window {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.9);
  overflow: hidden;
  box-sizing: border-box;
}

.crop-image {
  position: absolute;
}

.crop-grid {
  position: absolute;
  background: rgba(255, 255, 255, 0.28);
}

.crop-grid-h {
  left: 0;
  right: 0;
  height: 1px;
}

.crop-grid-v {
  top: 0;
  bottom: 0;
  width: 1px;
}

.adjuster-tip {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.55);
  font-size: 12px;
  flex-shrink: 0;
}

.adjuster-footer {
  height: 132px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 24px;
  padding-top: 16px;
  box-sizing: border-box;
  flex-shrink: 0;
}

.adjuster-btn {
  min-width: 150px;
  height: 46px;
  border-radius: 23px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  box-sizing: border-box;
}

.adjuster-btn--ghost {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.4);
}

.adjuster-btn--primary {
  background: linear-gradient(135deg, #ff8a65, #ff5252);
  color: #fff;
  box-shadow: 0 4px 14px rgba(255, 82, 82, 0.35);
}

.adjuster-canvas {
  position: fixed;
  left: -9999px;
  top: 0;
  width: 10px;
  height: 10px;
}
</style>
