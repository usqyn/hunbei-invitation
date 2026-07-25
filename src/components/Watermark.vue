<template>
  <view v-if="showWatermark" class="watermark-layer" :style="watermarkStyle">
    <view class="watermark-row" v-for="(_, rowIndex) in rowCount" :key="rowIndex">
      <text
        class="watermark-text"
        v-for="(_, colIndex) in colCount"
        :key="colIndex"
        :style="getTextStyle(rowIndex)"
      >{{ text }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  show?: boolean
  text?: string
  opacity?: number
  rotate?: number
  fontSize?: number
  gapX?: number
  gapY?: number
  color?: string
}>(), {
  show: false,
  text: 'TOYtamaxia',
  opacity: 0.15,
  rotate: -25,
  fontSize: 28,
  gapX: 200,
  gapY: 160,
  color: '#ffffff',
})

const showWatermark = computed(() => props.show)

const rowCount = 10
const colCount = 5

const watermarkStyle = computed(() => ({
  opacity: props.opacity,
}))

function getTextStyle(rowIndex: number) {
  return {
    fontSize: `${props.fontSize}rpx`,
    color: props.color,
    transform: `rotate(${props.rotate}deg)`,
    paddingLeft: rowIndex % 2 === 0 ? '0' : `${props.gapX / 2}rpx`,
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
  pointer-events: none;
  overflow: hidden;
  z-index: 999;
}

.watermark-row {
  display: flex;
  justify-content: space-around;
  padding-top: 160rpx;
}

.watermark-text {
  font-weight: 600;
  letter-spacing: 4rpx;
  white-space: nowrap;
  user-select: none;
  -webkit-user-select: none;
}
</style>
