<template>
  <view v-if="visible" class="rh-container">
    <!-- 顶部旋转柄（位于元素上方） -->
    <view
      class="rh-handle rh-handle--rotate"
      @touchstart.stop="onRotateStart"
      @touchmove.stop.prevent="onRotateMove"
      @touchend.stop="onEnd"
    >
      <view class="rh-rotate-line"></view>
      <view class="rh-rotate-dot"></view>
    </view>
    <!-- 四角缩放柄 -->
    <view
      v-for="corner in corners"
      :key="corner.id"
      class="rh-handle"
      :class="`rh-handle--${corner.id}`"
      @touchstart.stop="onScaleStart(corner.id, $event)"
      @touchmove.stop.prevent="onScaleMove"
      @touchend.stop="onEnd"
    ></view>
  </view>
</template>

<script setup lang="ts">
// 参考we-cropper（github.com/dlhandsome/we-cropper）的多控制点裁剪框设计：
// 4 个角点 + 1 个顶部旋转柄。本组件仅发事件，具体缩放/旋转逻辑由父组件实现，
// 以适配 canvas / flip / page 三种模式（canvas/flip 改 width/height，page 改 imageScale）。

export type CornerId = 'tl' | 'tr' | 'bl' | 'br'

interface RotateStartPayload {
  startTouchX: number
  startTouchY: number
  centerClientX: number
  centerClientY: number
  startAngle: number  // 起始角度（弧度，atan2(center - touch)）
}

interface ScaleStartPayload {
  corner: CornerId
  startTouchX: number
  startTouchY: number
  centerClientX: number
  centerClientY: number
  startWidth: number
  startHeight: number
  startX: number
  startY: number
}

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'rotate-start', payload: RotateStartPayload): void
  (e: 'rotate-move', angleDelta: number): void
  (e: 'scale-start', payload: ScaleStartPayload): void
  (e: 'scale-move', payload: { corner: CornerId; dx: number; dy: number }): void
  (e: 'end'): void
}>()

const corners: { id: CornerId }[] = [
  { id: 'tl' },
  { id: 'tr' },
  { id: 'bl' },
  { id: 'br' },
]

let rotateState: RotateStartPayload | null = null
let scaleState: ScaleStartPayload | null = null

// 计算元素几何中心点（旋转中心）相对屏幕的坐标
// 父组件给不了，所以这里只能近似：旋转手柄位于元素顶部正中，从手柄位置往元素中心方向取偏移
// 简化做法：父组件在 onRotateStart 里通过 ref 测量元素位置，但小程序里测量成本高
// 这里采用：旋转手柄 touch 点 + 父组件传过来的中心点（通过 emit 由父组件提供）
// 为简化，本组件内部不再计算中心，而是把 startTouch 给父组件，父组件计算角度
function onRotateStart(e: any) {
  const touch = e.touches ? e.touches[0] : e
  rotateState = {
    startTouchX: touch.clientX,
    startTouchY: touch.clientY,
    centerClientX: 0,  // 由父组件在 emit 后覆写，或父组件直接计算
    centerClientY: 0,
    startAngle: 0,
  }
  emit('rotate-start', rotateState)
}

function onRotateMove(e: any) {
  if (!rotateState) return
  const touch = e.touches ? e.touches[0] : e
  const dx = touch.clientX - rotateState.startTouchX
  const dy = touch.clientY - rotateState.startTouchY
  // 用位移的方向变化近似估算旋转角度增量（弧度）
  // 这是个简化算法：父组件应保留起始 rotation，根据 dx/dy 算 delta
  // 这里直接传 dx/dy 给父组件，父组件可以更精确地算（基于元素中心点）
  emit('rotate-move', Math.atan2(dy, dx) * 180 / Math.PI)
}

function onScaleStart(corner: CornerId, e: any) {
  const touch = e.touches ? e.touches[0] : e
  scaleState = {
    corner,
    startTouchX: touch.clientX,
    startTouchY: touch.clientY,
    centerClientX: 0,
    centerClientY: 0,
    startWidth: 0,
    startHeight: 0,
    startX: 0,
    startY: 0,
  }
  emit('scale-start', scaleState)
}

function onScaleMove(e: any) {
  if (!scaleState) return
  const touch = e.touches ? e.touches[0] : e
  const dx = touch.clientX - scaleState.startTouchX
  const dy = touch.clientY - scaleState.startTouchY
  emit('scale-move', { corner: scaleState.corner, dx, dy })
}

function onEnd() {
  rotateState = null
  scaleState = null
  emit('end')
}
</script>

<style scoped>
.rh-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 30;
}

.rh-handle {
  position: absolute;
  pointer-events: auto;
  width: 32rpx;
  height: 32rpx;
  background: #fff;
  border: 4rpx solid #e84a6e;
  border-radius: 50%;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.2);
  /* 让手柄热区更大，便于触摸 */
  box-sizing: border-box;
}

/* 四角缩放柄：贴在元素四个角的外侧 */
.rh-handle--tl {
  left: -16rpx;
  top: -16rpx;
}

.rh-handle--tr {
  right: -16rpx;
  top: -16rpx;
}

.rh-handle--bl {
  left: -16rpx;
  bottom: -16rpx;
}

.rh-handle--br {
  right: -16rpx;
  bottom: -16rpx;
}

/* 顶部旋转柄：在元素上方一段距离 */
.rh-handle--rotate {
  left: 50%;
  top: -56rpx;
  margin-left: -16rpx;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%);
  border-color: #fff;
  box-shadow: 0 0 0 2rpx #e84a6e, 0 4rpx 12rpx rgba(232, 74, 110, 0.4);
}

.rh-rotate-line {
  position: absolute;
  left: 50%;
  bottom: -28rpx;
  width: 4rpx;
  height: 28rpx;
  margin-left: -2rpx;
  background: #e84a6e;
}

.rh-rotate-dot {
  width: 12rpx;
  height: 12rpx;
  margin: 6rpx auto 0;
  background: #fff;
  border-radius: 50%;
}
</style>
