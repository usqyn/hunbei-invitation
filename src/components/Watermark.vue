<template>
  <view v-if="showWatermark" class="watermark-layer" :style="{ zIndex: String(zIndex) }">
    <view class="watermark-grid">
      <view
        class="watermark-row"
        v-for="(_, rowIndex) in rowCount"
        :key="rowIndex"
        :style="{ paddingTop: rowGap + 'rpx' }"
      >
        <view
          class="watermark-cell"
          v-for="(_, colIndex) in colCount"
          :key="colIndex"
          :style="getCellStyle(rowIndex, colIndex)"
        >
          <text class="watermark-text" :style="textStyle">{{ lines[0] }}</text>
          <text v-if="lines[1]" class="watermark-text watermark-text--sub" :style="subTextStyle">{{ lines[1] }}</text>
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
  opacity: 0.18,
  rotate: -22,
  fontSize: 14,
  gapX: 0,
  gapY: 0,
  color: '#000000',
  density: 'medium',
  zIndex: 999,
  protect: true,
})

const showWatermark = computed(() => props.show)

const lines = computed(() => Array.isArray(props.text) ? props.text : [props.text])

const densityMap = { low: 180, medium: 110, high: 65 }
const rowGap = computed(() => props.gapY || densityMap[props.density])
const colGap = computed(() => props.gapX || densityMap[props.density])

const rowCount = 12
const colCount = 6

const textStyle = computed(() => ({
  fontSize: props.fontSize + 'px',
  color: props.color,
  transform: `rotate(${props.rotate}deg)`,
  fontWeight: '700',
  letterSpacing: '2px',
  whiteSpace: 'nowrap' as const,
}))

const subTextStyle = computed(() => ({
  fontSize: Math.max(10, props.fontSize - 2) + 'px',
  color: props.color,
  transform: `rotate(${props.rotate}deg)`,
  fontWeight: '500',
  letterSpacing: '1px',
  whiteSpace: 'nowrap' as const,
  marginTop: '2px',
}))

function getCellStyle(rowIndex: number, colIndex: number) {
  const isOdd = rowIndex % 2 === 1
  return {
    paddingLeft: isOdd ? colGap.value / 2 + 'rpx' : '0',
    opacity: props.opacity,
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
}

.watermark-row {
  display: flex;
  justify-content: space-around;
}

.watermark-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.watermark-text {
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
  user-select: none;
  -webkit-user-select: none;
}

.watermark-text--sub {
  opacity: 0.7;
}
</style>
