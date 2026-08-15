<template>
  <teleport to="body">
    <transition name="psd-fade">
      <div v-if="visible" class="psd-overlay" @click.self="onClose">
        <div class="psd-dialog">
          <!-- 头部 -->
          <div class="psd-header">
            <div class="psd-title">🎨 导入 PSD 预览</div>
            <button class="psd-close" @click="onClose">✕</button>
          </div>

          <!-- 画布尺寸与报告 -->
          <div v-if="result" class="psd-meta">
            <span>画布将设为 <b>{{ result.width }} × {{ result.height }}</b> px</span>
            <span v-if="result.resolutionUnit === 'PPI'">（{{ result.resolution }} DPI）</span>
          </div>

          <div v-if="reportWarnings.length > 0" class="psd-report">
            <div class="psd-report-title">⚠️ 导入提示（{{ reportWarnings.length }}）</div>
            <div class="psd-report-body">
              <div v-for="(w, i) in reportWarnings" :key="i" class="psd-report-item">{{ w }}</div>
            </div>
          </div>
          <div v-if="result && result.skipped.length > 0" class="psd-report">
            <div class="psd-report-title">⏭ 已跳过（{{ result.skipped.length }}）</div>
            <div class="psd-report-body">
              <div v-for="(s, i) in result.skipped" :key="i" class="psd-report-item">{{ s.name }}：{{ s.reason }}</div>
            </div>
          </div>

          <!-- 图层列表（倒序：最上层在前） -->
          <div class="psd-layers">
            <div v-for="layer in topDownLayers" :key="layer.id" class="psd-layer" :class="`psd-layer--${layer.type}`">
              <div class="psd-layer-thumb">
                <img v-if="layer.dataUrl" :src="layer.dataUrl" alt="" />
                <span v-else class="psd-layer-noimg">无预览</span>
              </div>
              <div class="psd-layer-info">
                <div class="psd-layer-name">
                  <b>{{ layer.name }}</b>
                  <span class="psd-layer-badge" :class="`badge--${layer.type}`">{{ layer.type === 'text' ? '文字' : '图片' }}</span>
                </div>

                <!-- 文字层校对区：栅格缩略图 ↔ 提取文本 -->
                <template v-if="layer.type === 'text'">
                  <div class="psd-layer-proof">
                    <textarea
                      class="psd-text-input"
                      :value="getEdit(layer).text"
                      rows="2"
                      placeholder="（PSD 未提取到文字）"
                      @input="setEdit(layer, 'text', ($event.target as HTMLTextAreaElement).value)"
                    ></textarea>
                  </div>
                  <div class="psd-layer-fields">
                    <label>
                      字号(px)
                      <input
                        type="number"
                        class="psd-num-input"
                        :value="getEdit(layer).fontSize"
                        min="1"
                        max="1000"
                        @input="setEdit(layer, 'fontSize', parseFloat(($event.target as HTMLInputElement).value) || 0)"
                      />
                    </label>
                    <label>
                      字体
                      <select class="psd-font-select" :value="getEdit(layer).fontName" @change="setEdit(layer, 'fontName', ($event.target as HTMLSelectElement).value)">
                        <option v-for="f in fontOptions" :key="f" :value="f">{{ f }}</option>
                      </select>
                    </label>
                  </div>
                  <div class="psd-layer-extra">
                    <span v-if="layer.fontSizePt != null">PSD 字号 {{ layer.fontSizePt }}pt</span>
                    <span v-if="layer.textAlign">对齐 {{ layer.textAlign }}</span>
                    <span v-if="layer.lineHeight">行高 {{ layer.lineHeight }}</span>
                    <span v-if="layer.strokeWidth">描边 {{ layer.strokeWidth }}px</span>
                  </div>
                </template>
                <div v-else class="psd-layer-extra">
                  <span>{{ layer.width }}×{{ layer.height }}px</span>
                  <span>不透明度 {{ Math.round(layer.opacity * 100) }}%</span>
                </div>

                <div v-if="layer.warnings.length > 0" class="psd-layer-warnings">
                  <div v-for="(w, i) in layer.warnings" :key="i">⚠ {{ w }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 底部操作 -->
          <div class="psd-footer">
            <button class="psd-btn" @click="onClose">取消</button>
            <button class="psd-btn primary" :disabled="!result || result.layers.length === 0" @click="onConfirm">
              确认导入（{{ result?.layers.length ?? 0 }} 层）
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { PsdImportResult, PsdLayerPreview } from '../utils/psd-import'

const props = defineProps<{
  visible: boolean
  result: PsdImportResult | null
  availableFonts: string[]
}>()

const emit = defineEmits<{
  close: []
  confirm: [payload: { width: number; height: number; layers: PsdLayerPreview[] }]
}>()

// 文字层可编辑字段（text / fontSize / fontName）
interface TextEdit {
  text: string
  fontSize: number
  fontName: string
}

const edits = ref<Record<string, TextEdit>>({})

watch(
  () => props.result,
  (result) => {
    edits.value = {}
    if (!result) return
    for (const layer of result.layers) {
      if (layer.type === 'text') {
        edits.value[layer.id] = {
          text: layer.text ?? '',
          fontSize: layer.fontSize || 24,
          fontName: layer.mappedFont || (layer.text ? 'KazakhSoftAsilya' : '思源宋体, serif'),
        }
      }
    }
  },
)

// 字体选项：系统字体表 + PSD 原始字体名（保留供选择）
const fontOptions = computed(() => {
  const names = new Set<string>([...(props.availableFonts || [])])
  if (props.result) {
    for (const layer of props.result.layers) {
      if (layer.fontName) names.add(layer.fontName)
      if (layer.mappedFont) names.add(layer.mappedFont)
    }
  }
  return [...names]
})

// 倒序展示（最上层在前），导入顺序仍为文档顺序（自底向上）
const topDownLayers = computed(() => (props.result ? [...props.result.layers].reverse() : []))

const reportWarnings = computed(() => props.result?.warnings ?? [])

function getEdit(layer: PsdLayerPreview): TextEdit {
  return (
    edits.value[layer.id] || {
      text: layer.text ?? '',
      fontSize: layer.fontSize || 24,
      fontName: layer.mappedFont || '思源宋体, serif',
    }
  )
}

function setEdit(layer: PsdLayerPreview, field: keyof TextEdit, value: string | number) {
  if (!edits.value[layer.id]) edits.value[layer.id] = { text: layer.text ?? '', fontSize: layer.fontSize || 24, fontName: layer.mappedFont || '思源宋体, serif' }
  ;(edits.value[layer.id] as any)[field] = value
}

function onClose() {
  emit('close')
}

function onConfirm() {
  if (!props.result) return
  const layers = props.result.layers.map((layer) => {
    if (layer.type !== 'text') return layer
    const edit = edits.value[layer.id]
    if (!edit) return layer
    return {
      ...layer,
      text: edit.text.trim(),
      fontSize: edit.fontSize > 0 ? edit.fontSize : layer.fontSize,
      fontName: edit.fontName,
      mappedFont: edit.fontName && edit.fontName !== layer.fontName ? edit.fontName : layer.mappedFont,
    }
  })
  emit('confirm', { width: props.result.width, height: props.result.height, layers })
}
</script>

<style scoped>
.psd-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.psd-dialog {
  background: #fff;
  border-radius: 12px;
  width: 760px;
  max-width: 96vw;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
}
.psd-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid #eee;
}
.psd-title {
  font-size: 16px;
  font-weight: 600;
}
.psd-close {
  border: none;
  background: none;
  font-size: 16px;
  cursor: pointer;
  color: #888;
}
.psd-meta {
  padding: 10px 18px;
  font-size: 13px;
  color: #555;
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
}
.psd-report {
  margin: 10px 18px 0;
  background: #fff8e1;
  border: 1px solid #ffe0b2;
  border-radius: 8px;
  font-size: 12px;
  max-height: 120px;
  overflow: auto;
}
.psd-report-title {
  padding: 6px 10px;
  font-weight: 600;
  color: #8d6e63;
}
.psd-report-body {
  padding: 0 10px 8px;
}
.psd-report-item {
  color: #6d4c41;
  line-height: 1.5;
}
.psd-layers {
  flex: 1;
  overflow: auto;
  padding: 12px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.psd-layer {
  display: flex;
  gap: 12px;
  border: 1px solid #e5e5e5;
  border-radius: 10px;
  padding: 10px;
  background: #fcfcfc;
}
.psd-layer-thumb {
  width: 96px;
  height: 96px;
  flex-shrink: 0;
  border: 1px solid #eee;
  border-radius: 6px;
  background: repeating-conic-gradient(#f0f0f0 0% 25%, #fff 0% 50%) 0 0 / 16px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.psd-layer-thumb img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.psd-layer-noimg {
  font-size: 12px;
  color: #aaa;
}
.psd-layer-info {
  flex: 1;
  min-width: 0;
}
.psd-layer-name {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 13px;
}
.psd-layer-badge {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 10px;
  color: #fff;
}
.badge--text {
  background: #4caf50;
}
.badge--image {
  background: #2196f3;
}
.psd-layer-proof {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.psd-text-input {
  flex: 1;
  width: 100%;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 13px;
  resize: vertical;
  min-height: 46px;
  direction: rtl;
  font-family: 'KazakhSoftAsilya', '思源宋体', serif;
}
.psd-layer-fields {
  display: flex;
  gap: 12px;
  margin-top: 6px;
  font-size: 12px;
  color: #666;
  align-items: center;
}
.psd-layer-fields label {
  display: flex;
  align-items: center;
  gap: 6px;
}
.psd-num-input {
  width: 72px;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 4px 6px;
}
.psd-font-select {
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 4px 6px;
  max-width: 240px;
}
.psd-layer-extra {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 6px;
  font-size: 11px;
  color: #999;
}
.psd-layer-warnings {
  margin-top: 6px;
  font-size: 12px;
  color: #b26a00;
  line-height: 1.5;
}
.psd-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 18px;
  border-top: 1px solid #eee;
}
.psd-btn {
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 8px;
  padding: 8px 18px;
  font-size: 13px;
  cursor: pointer;
}
.psd-btn.primary {
  background: #e84a6e;
  border-color: #e84a6e;
  color: #fff;
}
.psd-btn.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.psd-fade-enter-active,
.psd-fade-leave-active {
  transition: opacity 0.2s;
}
.psd-fade-enter-from,
.psd-fade-leave-to {
  opacity: 0;
}
</style>