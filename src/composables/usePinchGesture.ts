// ============ 双指缩放 + 旋转手势工具 ============
// 参考 we-cropper (github.com/dlhandsome/we-cropper) 的双指手势算法。
// 在编辑器中用于图片元素的双指缩放与旋转：单指拖动调整位置，
// 双指捏合调整 imageScale，双指旋转调整 rotation。
//
// 使用方式：
//   const pinch = usePinchGesture({
//     onStart: (state) => { ... },     // 双指落下，记录初始状态
//     onScale: (ratio, angleDelta) => { ... },  // 双指移动，返回缩放比与旋转角度增量
//   })
//   pinch.onTouchStart(e)
//   pinch.onTouchMove(e)
//   pinch.onTouchEnd(e)

export interface TouchPoint {
  clientX: number
  clientY: number
}

export interface PinchStartState {
  /** 双指起始距离 */
  startDist: number
  /** 双指起始角度（弧度） */
  startAngle: number
  /** 第一个触点 */
  startTouch: TouchPoint
}

export interface PinchMoveState {
  /** 当前双指距离 / 起始距离 */
  ratio: number
  /** 当前双指角度 - 起始角度（度，-180~180） */
  angleDelta: number
}

export interface PinchGestureOptions {
  /** 双指落下时回调，返回初始状态供业务层保存（如记录 imageScale / rotation 起始值） */
  onStart?: (state: PinchStartState) => void
  /** 双指移动时回调，传入缩放比与角度增量，业务层据此更新 imageScale / rotation */
  onScale?: (state: PinchMoveState) => void
  /** 双指抬起（剩余触点 < 2）时回调，业务层可据此 pushHistory */
  onEnd?: () => void
  /** 缩放阈值：双指距离比小于此值时不触发（避免抖动），默认 1.05 */
  scaleThreshold?: number
}

/** 计算两触点距离 */
export function getTouchDistance(t1: TouchPoint, t2: TouchPoint): number {
  const dx = t1.clientX - t2.clientX
  const dy = t1.clientY - t2.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

/** 计算两触点连线角度（弧度，-π~π） */
export function getTouchAngle(t1: TouchPoint, t2: TouchPoint): number {
  return Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX)
}

export function usePinchGesture(options: PinchGestureOptions = {}) {
  const { onStart, onScale, onEnd, scaleThreshold = 1.0 } = options
  // 最小变化阈值：避免双指静止时微小抖动误触发（至少 1%）
  const minRatioDelta = Math.max(0.01, scaleThreshold > 1 ? scaleThreshold - 1 : 0.01)

  let startDist = 0
  let startAngle = 0
  let startTouch: TouchPoint | null = null
  let active = false

  function onTouchStart(e: any) {
    if (!e.touches || e.touches.length !== 2) return
    const t1 = e.touches[0]
    const t2 = e.touches[1]
    startDist = getTouchDistance(t1, t2)
    startAngle = getTouchAngle(t1, t2)
    startTouch = { clientX: t1.clientX, clientY: t1.clientY }
    active = true
    if (onStart) {
      onStart({ startDist, startAngle, startTouch })
    }
  }

  function onTouchMove(e: any) {
    if (!active || !e.touches || e.touches.length !== 2) return
    const t1 = e.touches[0]
    const t2 = e.touches[1]
    const dist = getTouchDistance(t1, t2)
    if (!dist || !startDist) return
    const ratio = dist / startDist
    // 阈值过滤：双指距离变化小于阈值时跳过，避免静止时微小抖动误触发
    if (Math.abs(ratio - 1) < minRatioDelta) return
    const angle = getTouchAngle(t1, t2)
    // 转为度，归一化到 -180~180
    let angleDelta = ((angle - startAngle) * 180) / Math.PI
    while (angleDelta > 180) angleDelta -= 360
    while (angleDelta < -180) angleDelta += 360
    if (onScale) {
      onScale({ ratio, angleDelta })
    }
  }

  function onTouchEnd(e: any) {
    const remaining = e.touches ? e.touches.length : 0
    if (remaining < 2) {
      if (active && onEnd) onEnd()
      active = false
      startDist = 0
      startTouch = null
    }
  }

  /** 当前是否处于双指手势中 */
  function isActive() {
    return active
  }

  return { onTouchStart, onTouchMove, onTouchEnd, isActive }
}
