<template>
  <view v-if="showWatermark" class="watermark-layer" :style="{ zIndex: String(zIndex) }">
    <view class="watermark-grid">
      <view
        class="watermark-row"
        v-for="(_, rowIndex) in rowCount"
        :key="rowIndex"
      >
        <view
          class="watermark-cell"
          v-for="(_, colIndex) in colCount"
          :key="colIndex"
          :style="getCellStyle(rowIndex, colIndex)"
        >
          <!-- 徽章：圆环 + 首字母（对应当前品牌标识） -->
          <view class="wm-badge" :style="badgeStyle">
            <text class="wm-badge-letter" :style="badgeLetterStyle">{{ badgeLetter }}</text>
          </view>
          <!-- 品牌字 -->
          <text class="wm-word" :style="wordStyle">{{ lines[0] }}</text>
          <text v-if="lines[1]" class="wm-sub" :style="subStyle">{{ lines[1] }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  show?: boolean
  text?: string | string[]
  logo?: string
  opacity?: number
  rotate?: number
  fontSize?: number
  gapX?: number
  gapY?: number
  color?: string
  density?: 'low' | 'medium' | 'high'
  zIndex?: number
  protect?: boolean
}>(), {
  show: false,
  text: 'TOYtamaxia',
  logo: '',
  opacity: 0.16,
  rotate: -25,
  fontSize: 15,
  gapX: 0,
  gapY: 0,
  color: '#6b7280',
  density: 'medium',
  zIndex: 999,
  protect: true,
})

const showWatermark = computed(() => props.show)

const lines = computed(() => Array.isArray(props.text) ? props.text : [props.text])
// 徽章首字母取品牌名首字符
const badgeLetter = computed(() => (lines.value[0] || 'T').charAt(0).toUpperCase())

// 密度 → 行列数（大号斜铺，比旧版疏朗）
const densityMap = { low: { rows: 4, cols: 2 }, medium: { rows: 5, cols: 3 }, high: { rows: 6, cols: 3 } }
const layout = computed(() => densityMap[props.density] || densityMap.medium)
const rowCount = computed(() => layout.value.rows)
const colCount = computed(() => layout.value.cols)

const wordStyle = computed(() => ({
  fontSize: (props.fontSize + 6) + 'px',
  color: props.color,
  fontWeight: '600',
  letterSpacing: '1px',
  whiteSpace: 'nowrap' as const,
  lineHeight: 1.2,
}))

const badgeStyle = computed(() => ({
  width: (props.fontSize + 14) + 'px',
  height: (props.fontSize + 14) + 'px',
  borderColor: props.color,
  borderWidth: Math.max(1.5, props.fontSize / 10) + 'px',
}))

const badgeLetterStyle = computed(() => ({
  fontSize: (props.fontSize + 4) + 'px',
  color: props.color,
  fontWeight: '700',
  lineHeight: 1,
}))

const subStyle = computed(() => ({
  fontSize: Math.max(9, props.fontSize - 4) + 'px',
  color: props.color,
  fontWeight: '400',
  letterSpacing: '2px',
  whiteSpace: 'nowrap' as const,
  marginTop: '2px',
}))

function getCellStyle(rowIndex: number, colIndex: number) {
  return {
    opacity: props.opacity,
    transform: `rotate(${props.rotate}deg)`,
    // 奇偶行错位，形成斜铺感
    marginLeft: rowIndex % 2 === 1 ? '90rpx' : '0',
  }
}
</script>

<style lang="scss" scoped>
.watermark-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  pointer-events: none;
}

.watermark-grid {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  height: 100%;
  padding: 40rpx 0;
  box-sizing: border-box;
}

.watermark-row {
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.watermark-cell {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.wm-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  border-style: solid;
  border-radius: 50%;
  flex-shrink: 0;
  box-sizing: border-box;
}

.wm-word {
  font-family: Georgia, 'Times New Roman', -apple-system, serif;
  user-select: none;
  -webkit-user-select: none;
}

.wm-sub {
  position: absolute;
  bottom: -26rpx;
  left: 50%;
  transform: translateX(-50%);
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
  user-select: none;
  -webkit-user-select: none;
  opacity: 0.85;
}
</style>
