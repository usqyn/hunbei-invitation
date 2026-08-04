<template>
  <view v-if="visible" class="img-prop-mask" @click="onClose">
    <view class="img-prop-panel" @click.stop>
      <!-- 拖拽指示条 -->
      <view class="drag-handle-bar"></view>
      <!-- 头部 -->
      <view class="panel-header">
        <text class="panel-title">图片调整</text>
        <view class="panel-reset" @click="onReset">
          <text class="reset-icon">↺</text>
          <text class="reset-text">重置</text>
        </view>
      </view>

      <!-- 缩放滑杆 -->
      <view class="prop-row">
        <view class="prop-label-row">
          <text class="prop-label">缩放</text>
          <view class="prop-value-group">
            <view class="prop-btn" @click="adjustScale(-0.1)"><text>-</text></view>
            <text class="prop-value">{{ Math.round((element?.imageScale ?? 1) * 100) }}%</text>
            <view class="prop-btn" @click="adjustScale(0.1)"><text>+</text></view>
          </view>
        </view>
        <slider
          class="prop-slider"
          :value="(element?.imageScale ?? 1) * 100"
          :min="50"
          :max="300"
          :step="5"
          activeColor="#e84a6e"
          backgroundColor="#e8e8e8"
          block-size="28"
          @change="onScaleChange"
          @changing="onScaleChanging"
        />
      </view>

      <!-- 旋转滑杆 -->
      <view class="prop-row">
        <view class="prop-label-row">
          <text class="prop-label">旋转</text>
          <view class="prop-value-group">
            <view class="prop-btn" @click="adjustRotation(-15)"><text>-</text></view>
            <text class="prop-value">{{ Math.round(element?.rotation ?? 0) }}°</text>
            <view class="prop-btn" @click="adjustRotation(15)"><text>+</text></view>
          </view>
        </view>
        <slider
          class="prop-slider"
          :value="element?.rotation ?? 0"
          :min="-180"
          :max="180"
          :step="1"
          activeColor="#e84a6e"
          backgroundColor="#e8e8e8"
          block-size="28"
          @change="onRotationChange"
          @changing="onRotationChanging"
        />
      </view>

      <!-- 透明度滑杆 -->
      <view class="prop-row">
        <view class="prop-label-row">
          <text class="prop-label">透明度</text>
          <view class="prop-value-group">
            <view class="prop-btn" @click="adjustOpacity(-0.1)"><text>-</text></view>
            <text class="prop-value">{{ Math.round((element?.opacity ?? 1) * 100) }}%</text>
            <view class="prop-btn" @click="adjustOpacity(0.1)"><text>+</text></view>
          </view>
        </view>
        <slider
          class="prop-slider"
          :value="(element?.opacity ?? 1) * 100"
          :min="10"
          :max="100"
          :step="5"
          activeColor="#e84a6e"
          backgroundColor="#e8e8e8"
          block-size="28"
          @change="onOpacityChange"
          @changing="onOpacityChanging"
        />
      </view>

      <!-- 圆角滑杆 -->
      <view class="prop-row">
        <view class="prop-label-row">
          <text class="prop-label">圆角</text>
          <view class="prop-value-group">
            <view class="prop-btn" @click="adjustRadius(-4)"><text>-</text></view>
            <text class="prop-value">{{ element?.borderRadius ?? 0 }}rpx</text>
            <view class="prop-btn" @click="adjustRadius(4)"><text>+</text></view>
          </view>
        </view>
        <slider
          class="prop-slider"
          :value="element?.borderRadius ?? 0"
          :min="0"
          :max="80"
          :step="2"
          activeColor="#e84a6e"
          backgroundColor="#e8e8e8"
          block-size="28"
          @change="onRadiusChange"
          @changing="onRadiusChanging"
        />
      </view>

      <!-- 快捷旋转 -->
      <view class="quick-rotate-row">
        <view class="quick-btn" @click="setRotation(0)"><text>0°</text></view>
        <view class="quick-btn" @click="setRotation(90)"><text>90°</text></view>
        <view class="quick-btn" @click="setRotation(180)"><text>180°</text></view>
        <view class="quick-btn" @click="setRotation(270)"><text>270°</text></view>
        <view class="quick-btn" @click="setRotation(-90)"><text>-90°</text></view>
      </view>

      <!-- 滤镜（仅图片类型） -->
      <view v-if="element?.type === 'image'" class="filter-block">
        <view class="filter-title-row">
          <text class="panel-subtitle">滤镜</text>
          <view class="filter-reset-btn" @click="resetFilter">
            <text class="reset-icon">↺</text>
            <text class="reset-text">还原</text>
          </view>
        </view>
        <!-- 滤镜预设：与 admin 端 FILTER_PRESETS 对齐（none/vintage/cool/warm/bw/soft） -->
        <scroll-view class="filter-presets-scroll" scroll-x>
          <view class="filter-presets">
            <view
              v-for="p in FILTER_PRESETS"
              :key="p.id"
              class="filter-preset-btn"
              :class="{ 'filter-preset-btn--active': activeFilterPreset === p.id }"
              @click="applyFilterPreset(p.id)"
            >
              <text>{{ p.name }}</text>
            </view>
          </view>
        </scroll-view>
        <!-- 亮度 0~200，默认 100 -->
        <view class="prop-row">
          <view class="prop-label-row">
            <text class="prop-label">亮度</text>
            <text class="prop-value">{{ element?.brightness ?? 100 }}</text>
          </view>
          <slider
            class="prop-slider"
            :value="element?.brightness ?? 100"
            :min="0" :max="200" :step="1"
            activeColor="#e84a6e" backgroundColor="#e8e8e8" block-size="28"
            @change="onFilterChange('brightness', $event)"
            @changing="onFilterChanging('brightness', $event)"
          />
        </view>
        <!-- 对比度 -100~100，默认 0（偏移量，0=不变） -->
        <view class="prop-row">
          <view class="prop-label-row">
            <text class="prop-label">对比度</text>
            <text class="prop-value">{{ element?.contrast ?? 0 }}</text>
          </view>
          <slider
            class="prop-slider"
            :value="element?.contrast ?? 0"
            :min="-100" :max="100" :step="1"
            activeColor="#e84a6e" backgroundColor="#e8e8e8" block-size="28"
            @change="onFilterChange('contrast', $event)"
            @changing="onFilterChanging('contrast', $event)"
          />
        </view>
        <!-- 饱和度 0~200，默认 100 -->
        <view class="prop-row">
          <view class="prop-label-row">
            <text class="prop-label">饱和度</text>
            <text class="prop-value">{{ element?.saturate ?? 100 }}</text>
          </view>
          <slider
            class="prop-slider"
            :value="element?.saturate ?? 100"
            :min="0" :max="200" :step="1"
            activeColor="#e84a6e" backgroundColor="#e8e8e8" block-size="28"
            @change="onFilterChange('saturate', $event)"
            @changing="onFilterChanging('saturate', $event)"
          />
        </view>
        <!-- 模糊 0~20，默认 0（单位 px） -->
        <view class="prop-row">
          <view class="prop-label-row">
            <text class="prop-label">模糊</text>
            <text class="prop-value">{{ element?.blur ?? 0 }}px</text>
          </view>
          <slider
            class="prop-slider"
            :value="element?.blur ?? 0"
            :min="0" :max="20" :step="1"
            activeColor="#e84a6e" backgroundColor="#e8e8e8" block-size="28"
            @change="onFilterChange('blur', $event)"
            @changing="onFilterChanging('blur', $event)"
          />
        </view>
        <!-- 灰度 0~100，默认 0 -->
        <view class="prop-row">
          <view class="prop-label-row">
            <text class="prop-label">灰度</text>
            <text class="prop-value">{{ element?.grayscale ?? 0 }}</text>
          </view>
          <slider
            class="prop-slider"
            :value="element?.grayscale ?? 0"
            :min="0" :max="100" :step="1"
            activeColor="#e84a6e" backgroundColor="#e8e8e8" block-size="28"
            @change="onFilterChange('grayscale', $event)"
            @changing="onFilterChanging('grayscale', $event)"
          />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EditableElement } from '@/types'

const props = defineProps<{
  visible: boolean
  element: EditableElement | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update', field: string, value: number): void
  (e: 'preview', field: string, value: number): void
  (e: 'reset'): void
}>()

// 滤镜预设：与 admin/src/constants/config-data.ts FILTER_PRESETS 完全对齐
// 字段格式：brightness 0~200(默认100) / contrast -100~100(默认0,偏移量) / saturate 0~200(默认100) / blur 0~20 / grayscale 0~100
const FILTER_PRESETS = [
  { id: 'none',    name: '原图', brightness: 100, contrast: 0,   saturate: 100, blur: 0, grayscale: 0   },
  { id: 'vintage', name: '复古', brightness: 110, contrast: -10, saturate: 70,  blur: 0, grayscale: 10  },
  { id: 'cool',    name: '冷色', brightness: 105, contrast: 10,  saturate: 90,  blur: 0, grayscale: 0   },
  { id: 'warm',    name: '暖色', brightness: 105, contrast: 5,   saturate: 120, blur: 0, grayscale: 0   },
  { id: 'bw',      name: '黑白', brightness: 100, contrast: 10,  saturate: 0,   blur: 0, grayscale: 100 },
  { id: 'soft',    name: '柔光', brightness: 110, contrast: -15, saturate: 90,  blur: 1, grayscale: 0   },
] as const

// 滤镜默认值（用于"还原"按钮，与 admin useCanvas.ts applyImagePatch 一致）
const FILTER_DEFAULTS = { brightness: 100, contrast: 0, saturate: 100, blur: 0, grayscale: 0 }

// 推断当前滤镜匹配的预设 id（高亮对应按钮），无匹配返回 null
const activeFilterPreset = computed<string | null>(() => {
  const el = props.element as any
  if (!el) return null
  const b = el.brightness ?? FILTER_DEFAULTS.brightness
  const c = el.contrast ?? FILTER_DEFAULTS.contrast
  const s = el.saturate ?? FILTER_DEFAULTS.saturate
  const bl = el.blur ?? FILTER_DEFAULTS.blur
  const g = el.grayscale ?? FILTER_DEFAULTS.grayscale
  const match = FILTER_PRESETS.find(p =>
    p.brightness === b && p.contrast === c && p.saturate === s && p.blur === bl && p.grayscale === g
  )
  return match ? match.id : null
})

function onScaleChange(e: any) {
  const val = (e.detail?.value ?? 100) / 100
  emit('update', 'imageScale', val)
}

function onRotationChange(e: any) {
  const val = e.detail?.value ?? 0
  emit('update', 'rotation', val)
}

function onOpacityChange(e: any) {
  const val = (e.detail?.value ?? 100) / 100
  emit('update', 'opacity', val)
}

function onRadiusChange(e: any) {
  const val = e.detail?.value ?? 0
  emit('update', 'borderRadius', val)
}

// 滤镜滑杆 change（@change，松手时触发，记录历史）
function onFilterChange(field: string, e: any) {
  const val = e.detail?.value ?? 0
  emit('update', field, val)
}

// 滤镜滑杆 changing（@changing，拖动中实时预览，不记录历史）
function onFilterChanging(field: string, e: any) {
  const val = e.detail?.value ?? 0
  emit('preview', field, val)
}

// 应用滤镜预设：一次发 5 个 update 事件
// 父组件的 onImagePropUpdate 会先 setData，500ms 防抖后才 pushHistory，
// 所以连续 5 次 update 只会产生 1 条历史记录
function applyFilterPreset(presetId: string) {
  const preset = FILTER_PRESETS.find(p => p.id === presetId)
  if (!preset) return
  emit('update', 'brightness', preset.brightness)
  emit('update', 'contrast', preset.contrast)
  emit('update', 'saturate', preset.saturate)
  emit('update', 'blur', preset.blur)
  emit('update', 'grayscale', preset.grayscale)
}

// 还原滤镜：5 个字段重置为默认值
function resetFilter() {
  emit('update', 'brightness', FILTER_DEFAULTS.brightness)
  emit('update', 'contrast', FILTER_DEFAULTS.contrast)
  emit('update', 'saturate', FILTER_DEFAULTS.saturate)
  emit('update', 'blur', FILTER_DEFAULTS.blur)
  emit('update', 'grayscale', FILTER_DEFAULTS.grayscale)
}

// @changing 事件：实时预览但不记录历史
function onScaleChanging(e: any) {
  const val = (e.detail?.value ?? 100) / 100
  emit('preview', 'imageScale', val)
}

function onRotationChanging(e: any) {
  const val = e.detail?.value ?? 0
  emit('preview', 'rotation', val)
}

function onOpacityChanging(e: any) {
  const val = (e.detail?.value ?? 100) / 100
  emit('preview', 'opacity', val)
}

function onRadiusChanging(e: any) {
  const val = e.detail?.value ?? 0
  emit('preview', 'borderRadius', val)
}

function adjustScale(delta: number) {
  const cur = props.element?.imageScale ?? 1
  const val = Math.max(0.5, Math.min(3, cur + delta))
  emit('update', 'imageScale', val)
}

function adjustRotation(delta: number) {
  const cur = props.element?.rotation ?? 0
  let val = cur + delta
  if (val > 180) val -= 360
  if (val < -180) val += 360
  emit('update', 'rotation', val)
}

function adjustOpacity(delta: number) {
  const cur = props.element?.opacity ?? 1
  const val = Math.max(0.1, Math.min(1, cur + delta))
  emit('update', 'opacity', val)
}

function adjustRadius(delta: number) {
  const cur = props.element?.borderRadius ?? 0
  const val = Math.max(0, Math.min(80, cur + delta))
  emit('update', 'borderRadius', val)
}

function setRotation(val: number) {
  emit('update', 'rotation', val)
}

function onReset() {
  emit('reset')
}

function onClose() {
  emit('close')
}
</script>

<style scoped>
.img-prop-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 9999;
  display: flex;
  align-items: flex-end;
}

.img-prop-panel {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
  animation: slideUp 0.25s ease-out;
}

.drag-handle-bar {
  width: 60rpx;
  height: 8rpx;
  background: #ddd;
  border-radius: 4rpx;
  margin: 0 auto 16rpx;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.panel-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.panel-reset {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 20rpx;
  background: #f5f5f5;
  border-radius: 24rpx;
}

.reset-icon {
  font-size: 28rpx;
  color: #e84a6e;
}

.reset-text {
  font-size: 24rpx;
  color: #e84a6e;
}

.prop-row {
  margin-bottom: 28rpx;
}

.prop-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.prop-label {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.prop-value-group {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.prop-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #666;
}

.prop-btn:active {
  background: #e84a6e;
  color: #fff;
}

.prop-value {
  font-size: 26rpx;
  color: #666;
  min-width: 80rpx;
  text-align: center;
}

.prop-slider {
  width: 100%;
  margin: 0;
}

.quick-rotate-row {
  display: flex;
  justify-content: space-around;
  margin-top: 8rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f0f0f0;
}

.quick-btn {
  padding: 12rpx 28rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #333;
}

.quick-btn:active {
  background: #e84a6e;
  color: #fff;
}

/* 滤镜块 */
.filter-block {
  margin-top: 16rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f0f0f0;
}

.filter-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.panel-subtitle {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.filter-reset-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 6rpx 16rpx;
  background: #f5f5f5;
  border-radius: 20rpx;
}

.filter-reset-btn .reset-icon {
  font-size: 24rpx;
  color: #e84a6e;
}

.filter-reset-btn .reset-text {
  font-size: 22rpx;
  color: #e84a6e;
}

.filter-presets-scroll {
  width: 100%;
  white-space: nowrap;
  margin-bottom: 8rpx;
}

.filter-presets {
  display: inline-flex;
  gap: 12rpx;
  padding: 4rpx 0;
}

.filter-preset-btn {
  flex-shrink: 0;
  padding: 12rpx 24rpx;
  background: #f5f5f5;
  border-radius: 24rpx;
  font-size: 24rpx;
  color: #333;
  border: 2rpx solid transparent;
  transition: all 0.15s;
}

.filter-preset-btn--active {
  background: #e84a6e;
  color: #fff;
  border-color: #e84a6e;
}

.filter-preset-btn:active {
  background: #e84a6e;
  color: #fff;
}
</style>
