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

          <!-- 缺少字体专区：完整列出缺失字体（不折叠），引导上传真实字体 -->
          <div v-if="missingFonts.length > 0" class="psd-report psd-report--fonts">
            <div class="psd-report-title">🔤 缺少字体（{{ missingFonts.length }}）</div>
            <div class="psd-report-body">
              <div v-for="(m, i) in missingFonts" :key="i" class="psd-report-item">
                字体「{{ m.name }}」缺少 · {{ m.count }} 个图层使用 —— 请登录管理后台 → 字体上传 上传该字体文件后重新导入；
                未上传前导入的文字将以 KazakhSoftAsilya / 默认字体渲染（与设计稿有差异）
              </div>
            </div>
          </div>

          <div v-if="reportGroups.length > 0" class="psd-report">
            <div class="psd-report-title">⚠️ 导入提示</div>
            <div class="psd-report-body">
              <div
                v-for="(g, i) in reportGroups"
                :key="i"
                class="psd-report-group"
                :class="`psd-report-group--${g.kind}`"
              >
                <div class="psd-report-group-title" @click="toggleGroup(i)">
                  <span class="psd-report-arrow">{{ expandedGroups.has(i) ? '▾' : '▸' }}</span>
                  {{ g.title }}
                  <span v-if="g.items.length > 1" class="psd-report-count">{{ g.items.length }} 条</span>
                </div>
                <div v-if="expandedGroups.has(i)" class="psd-report-group-items">
                  <div v-for="(item, j) in g.items" :key="j" class="psd-report-item">{{ item }}</div>
                </div>
              </div>
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
                      :style="textareaRtlStyle(getEdit(layer).text)"
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
                        <option v-for="f in fontOptionsFor(layer)" :key="f" :value="f">{{ f }}</option>
                      </select>
                      <span v-if="isRtlLayer(layer)" class="psd-rtl-font-hint">（哈语文本建议使用哈萨克字体）</span>
                    </label>
                  </div>
                  <div class="psd-layer-extra">
                    <span v-if="layer.fontSizePt != null">PSD 字号 {{ layer.fontSizePt }}pt</span>
                    <span v-if="layer.textAlign">对齐 {{ layer.textAlign }}</span>
                    <span v-if="layer.lineHeight">行高 {{ layer.lineHeight }}</span>
                    <span v-if="layer.strokeWidth">描边 {{ layer.strokeWidth }}px</span>
                    <span v-if="layer.shadowBlur">投影 {{ layer.shadowOffsetX }},{{ layer.shadowOffsetY }} 模糊{{ layer.shadowBlur }}</span>
                  </div>
                </template>
                <div v-else class="psd-layer-extra">
                  <span>{{ layer.width }}×{{ layer.height }}px</span>
                  <span>不透明度 {{ Math.round(layer.opacity * 100) }}%</span>
                </div>

                <!-- 用户可编辑开关：占位符/照片默认可编辑，其余默认锁定 -->
                <label class="psd-layer-editable">
                  <input type="checkbox" :checked="isLayerEditable(layer)" @change="setLayerEditable(layer, ($event.target as HTMLInputElement).checked)" />
                  用户可编辑
                  <span v-if="!isLayerEditable(layer)" class="psd-layer-lock-hint">（导入后锁定，用户不可拖动/修改）</span>
                </label>

                <div v-if="layer.warnings.length > 0" class="psd-layer-warnings">
                  <div v-for="(w, i) in dedupe(layer.warnings)" :key="i">⚠ {{ w }}</div>
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

// 默认可编辑规则：占位符文本（如 {year}、{kzGroomName}）与照片类图片（头像/新郎/新娘/合影等）默认可编辑，其余锁定
const PLACEHOLDER_RE = /\{[^}]{1,40}\}/
const PHOTO_NAME_RE = /照片|photo|头像|新郎|新娘|合影|婚纱|pic|avatar/i

function defaultEditable(layer: PsdLayerPreview): boolean {
  if (layer.type === 'text') {
    return PLACEHOLDER_RE.test(layer.text || '')
  }
  return PHOTO_NAME_RE.test(layer.name || '')
}

// 用户可编辑标记：layerId → boolean（未标记时回退到 defaultEditable）
const editableFlags = ref<Record<string, boolean>>({})

watch(
  () => props.result,
  (result) => {
    editableFlags.value = {}
    expandedGroups.value = new Set()
    if (!result) return
    for (const layer of result.layers) {
      editableFlags.value[layer.id] = defaultEditable(layer)
    }
  },
)

function isLayerEditable(layer: PsdLayerPreview): boolean {
  return editableFlags.value[layer.id] ?? defaultEditable(layer)
}

function setLayerEditable(layer: PsdLayerPreview, value: boolean) {
  editableFlags.value[layer.id] = value
}

// 与 useCanvas.resolveRtlTextOptions 一致：RTL 文本默认哈萨克字体，其余默认思源宋体
const RTL_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
// 哈语占位符（ASCII 文本，替换后为哈语）：与 resolveRtlTextOptions 的 KZ_PLACEHOLDER_RE 保持一致
const KZ_PLACEHOLDER_RE = /\{(kzDate|kzWeekday|kzWeekdayParen|kzTime|kzGroomName|kzBrideName|kzAddress)\}/

// 该层最终按 RTL 渲染（direction 由 PSD 提取时按内容判定；占位符文本替换后为哈语）
function isRtlLayer(layer: PsdLayerPreview): boolean {
  return layer.direction === 'rtl' || RTL_RE.test(layer.text || '') || KZ_PLACEHOLDER_RE.test(layer.text || '')
}

function defaultFontFor(layer: PsdLayerPreview): string {
  if (layer.mappedFont) return layer.mappedFont
  return isRtlLayer(layer) ? 'KazakhSoftAsilya' : '思源宋体, serif'
}

// 校对输入框 RTL 感知：当前编辑文本含 RTL 字符时，输入框按 RTL 渲染（所见即所得，避免"倒着写"错觉）
function textareaRtlStyle(text: string | undefined): Record<string, string> {
  return text && RTL_RE.test(text) ? { direction: 'rtl', textAlign: 'right' } : {}
}

function makeEdit(layer: PsdLayerPreview): TextEdit {
  return {
    text: layer.text ?? '',
    fontSize: layer.fontSize || 24,
    fontName: defaultFontFor(layer),
  }
}

const edits = ref<Record<string, TextEdit>>({})

watch(
  () => props.result,
  (result) => {
    edits.value = {}
    if (!result) return
    for (const layer of result.layers) {
      if (layer.type === 'text') {
        edits.value[layer.id] = makeEdit(layer)
      }
    }
  },
)

// 字体选项：仅系统可用字体（PSD 原始字体名不在此列，缺失字体会在「缺少字体」专区引导上传，
// 避免选中无字体文件的字体导致导入后回退默认字体）
const fontOptions = computed(() => [...new Set([...(props.availableFonts || [])])])

// RTL 层字体不再限制：导入链路已尊重用户选择（resolveRtlTextOptions 不再强制哈萨克字体）。
// 仅保留「哈语文本建议使用哈萨克字体」的弱提示，避免误导用户以为限制选择。
function fontOptionsFor(_layer: PsdLayerPreview): string[] {
  return fontOptions.value
}

// 倒序展示（最上层在前），导入顺序仍为文档顺序（自底向上）
const topDownLayers = computed(() => (props.result ? [...props.result.layers].reverse() : []))

// 告警分组展示：按效果名/类别聚合计数，默认折叠明细，点击展开
const expandedGroups = ref<Set<number>>(new Set())

function toggleGroup(i: number) {
  const s = new Set(expandedGroups.value)
  if (s.has(i)) s.delete(i)
  else s.add(i)
  expandedGroups.value = s
}

const reportGroups = computed(() => props.result?.warningGroups ?? [])

// 缺少字体专区：未映射到任何可用字体的 PSD 字体（完整展开，不做折叠）
const missingFonts = computed(() => {
  const counts = new Map<string, number>()
  for (const l of props.result?.layers ?? []) {
    if (l.type === 'text' && l.fontName && !l.mappedFont) {
      counts.set(l.fontName, (counts.get(l.fontName) || 0) + 1)
    }
  }
  return [...counts.entries()].map(([name, count]) => ({ name, count }))
})

function dedupe(items: string[]): string[] {
  const counts = new Map<string, number>()
  for (const w of items) counts.set(w, (counts.get(w) || 0) + 1)
  return [...counts.entries()].map(([text, n]) => (n > 1 ? `${text}（×${n}）` : text))
}

function getEdit(layer: PsdLayerPreview): TextEdit {
  return edits.value[layer.id] || makeEdit(layer)
}

function setEdit(layer: PsdLayerPreview, field: keyof TextEdit, value: string | number) {
  if (!edits.value[layer.id]) edits.value[layer.id] = makeEdit(layer)
  ;(edits.value[layer.id] as any)[field] = value
}

function onClose() {
  emit('close')
}

function onConfirm() {
  if (!props.result) return
  const layers = props.result.layers.map((layer) => {
    const editable = editableFlags.value[layer.id] ?? defaultEditable(layer)
    if (layer.type !== 'text') return { ...layer, editable }
    const edit = edits.value[layer.id]
    if (!edit) return { ...layer, editable }
    return {
      ...layer,
      editable,
      text: edit.text.trim(),
      fontSize: edit.fontSize > 0 ? edit.fontSize : layer.fontSize,
      fontName: edit.fontName,
      // 所见即所得：用户最终选择的字体即为导入字体（修复原实现中「选择 PSD 原始字体名时被静默丢弃」的问题）
      mappedFont: edit.fontName,
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
.psd-report-group {
  border-left: 3px solid #d4a017;
  margin: 2px 0;
  padding: 2px 0 2px 8px;
}
.psd-report-group--line-height {
  border-left-color: #9aa5b1;
}
.psd-report-group--line-height .psd-report-group-title {
  color: #6b7280;
}
.psd-report-group--blend-mode,
.psd-report-group--font-mapped,
.psd-report-group--style-approx {
  border-left-color: #d4a017;
}
.psd-report-group--other {
  border-left-color: #d4a017;
}
.psd-report-group-title {
  cursor: pointer;
  user-select: none;
  font-weight: 600;
  color: #8d6e63;
  line-height: 1.6;
  display: flex;
  align-items: center;
  gap: 6px;
}
.psd-report-arrow {
  font-size: 10px;
  color: #a1887f;
}
.psd-report-count {
  font-size: 11px;
  color: #a1887f;
  font-weight: normal;
}
.psd-report-group-items {
  margin-top: 4px;
  padding-left: 14px;
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
.psd-rtl-font-hint {
  color: #b45309;
  font-size: 12px;
}
.psd-layer-extra {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 6px;
  font-size: 11px;
  color: #999;
}
.psd-layer-editable {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 12px;
  color: #444;
  cursor: pointer;
  user-select: none;
}
.psd-layer-editable input {
  accent-color: #e84a6e;
  width: 14px;
  height: 14px;
  cursor: pointer;
}
.psd-layer-lock-hint {
  font-size: 11px;
  color: #bbb;
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