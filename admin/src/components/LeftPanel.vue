<template>
  <aside class="panel panel-left">
    <div class="panel-tabs">
      <button
        class="tab-btn"
        :class="{ active: leftTab === 'material' }"
        @click="$emit('update:leftTab', 'material')"
      >素材</button>
      <button
        class="tab-btn"
        :class="{ active: leftTab === 'layers' }"
        @click="$emit('update:leftTab', 'layers')"
      >图层</button>
      <button
        class="tab-btn"
        :class="{ active: leftTab === 'templates' }"
        @click="$emit('loadTemplateList'); $emit('update:leftTab', 'templates')"
      >模板</button>
      <button
        v-if="pageMode === 'flip'"
        class="tab-btn"
        :class="{ active: leftTab === 'pages' }"
        @click="$emit('update:leftTab', 'pages')"
      >页面</button>
    </div>

    <!-- 素材 Tab -->
    <div v-if="leftTab === 'material'" class="panel-body">
      <div class="section-title">文字</div>
      <div class="material-grid">
        <button class="material-item text-item" @click="$emit('addText', { content: '标题文字', fontSize: 32, fontWeight: 'bold' })">
          <span class="mi-label">大标题</span>
        </button>
        <button class="material-item text-item" @click="$emit('addText', { content: '副标题文字', fontSize: 20 })">
          <span class="mi-label small">副标题</span>
        </button>
        <button class="material-item text-item" @click="$emit('addText', { content: '一段正文文字，可换行编辑。', fontSize: 16, textAlign: 'left' })">
          <span class="mi-label small">正文</span>
        </button>
      </div>
      <div class="section-divider"></div>
      <div class="section-title">文字样式预设</div>
      <div class="text-preset-grid">
        <button
          v-for="tp in TEXT_PRESETS"
          :key="tp.name"
          class="text-preset-btn"
          :title="tp.description"
          @click="$emit('applyTextPreset', tp)"
        >
          <span class="tp-sample" :style="tp.previewStyle">{{ tp.sample }}</span>
          <span class="tp-name">{{ tp.name }}</span>
        </button>
      </div>
      <div class="section-divider"></div>
      <div class="section-title">快捷字段</div>
      <div class="material-grid">
        <button
          v-for="sf in SMART_FIELDS" :key="sf.key"
          class="material-item smart-field-item"
          :title="sf.label"
          @click="$emit('addSmartField', sf)"
        >
          <span class="sf-icon">{{ sf.icon }}</span>
          <span class="mi-label">{{ sf.label }}</span>
        </button>
      </div>
      <div class="section-divider"></div>
      <div class="section-title">日期占位符预览</div>
      <div class="date-preview-inputs">
        <div class="date-input-row">
          <label>年份</label>
          <input :value="dateValues.year" placeholder="2025" class="date-input" @input="$emit('updateDateValues', { key: 'year', value: ($event.target as HTMLInputElement).value })" />
        </div>
        <div class="date-input-row">
          <label>月份</label>
          <input :value="dateValues.month" placeholder="6" class="date-input" @input="$emit('updateDateValues', { key: 'month', value: ($event.target as HTMLInputElement).value })" />
        </div>
        <div class="date-input-row">
          <label>日</label>
          <input :value="dateValues.day" placeholder="15" class="date-input" @input="$emit('updateDateValues', { key: 'day', value: ($event.target as HTMLInputElement).value })" />
        </div>
      </div>
      <div class="section-divider"></div>
      <div class="section-title">背景颜色</div>
      <div class="color-grid">
        <button v-for="c in bgColors" :key="c" class="color-chip" :style="{ background: c }" @click="$emit('setBackground', { type: 'solid', color1: c })"></button>
      </div>
      <div class="section-title">背景渐变</div>
      <div class="mat-cats" style="margin-bottom:10px;">
        <button v-for="cat in GRADIENT_CATEGORIES" :key="cat" class="mat-cat-btn" :class="{ active: activeGradientCat === cat }" @click="$emit('update:activeGradientCat', cat)">{{ cat }}</button>
      </div>
      <div class="gradient-grid">
        <button v-for="g in filteredGradients" :key="g.name" class="gradient-chip" :style="{ background: g.css }" @click="$emit('setBackground', { type: 'linear-gradient', color1: g.c1, color2: g.c2, angle: g.angle })">
          <span class="gradient-name">{{ g.name }}</span>
        </button>
      </div>
      <div class="section-title">配色方案</div>
      <div class="color-scheme-grid">
        <button
          v-for="cs in COLOR_SCHEMES"
          :key="cs.id"
          class="color-scheme-btn"
          :style="{ background: cs.thumbnail }"
          @click="$emit('applyColorScheme', cs)"
          :title="`${cs.name}：${cs.textColor} 文字`"
        >
          <span class="cs-name">{{ cs.name }}</span>
        </button>
      </div>
      <div class="section-title">上传背景图</div>
      <label class="upload-btn">点击上传背景图<input type="file" accept="image/*" style="display:none" @change="onBgImageFile" /></label>
      <div class="section-divider"></div>
      <div class="section-title">素材库</div>
      <div class="mat-category-scroll">
        <div class="mat-cats">
          <button v-for="cat in materialCategories" :key="cat" class="mat-cat-btn" :class="{ active: activeMaterialCat === cat }" @click="$emit('update:activeMaterialCat', cat)">{{ cat }}</button>
        </div>
      </div>
      <div class="mat-grid">
        <div v-for="mat in filteredMaterials" :key="mat.id" class="mat-item" draggable="true" @dragstart="onMaterialDragStart($event, mat)" @click="onMaterialClick(mat)" :title="mat.name">
          <div v-if="mat.type === 'shape'" class="mat-shape" v-html="mat.svg" :style="{ color: mat.color || '#333' }"></div>
          <div v-else-if="mat.svg" class="mat-shape" v-html="sanitizeSvg(mat.svg)" :style="{ color: mat.color || '#333' }"></div>
          <div class="mat-name">{{ mat.name }}</div>
        </div>
      </div>
    </div>

    <!-- 图层 Tab -->
    <div v-if="leftTab === 'layers'" class="panel-body">
      <div class="tpl-name-row">
        <span class="tpl-name-label">模板名称</span>
        <input class="tpl-name-input" :value="currentTemplateName" placeholder="输入模板名称…" @blur="$emit('update:currentTemplateName', ($event.target as HTMLInputElement).value)" />
      </div>
      <div v-if="layers.length === 0" class="empty-hint">画布暂无元素<br/>点击「添加文字/图片」开始</div>
      <div v-for="el in layers" :key="el.id" class="layer-row" :class="{ active: selectedId === el.id }">
        <span class="layer-icon" @click="$emit('selectElement', el.id)">{{ el.type === 'text' ? 'T' : el.type === 'image' ? '🖼' : '✦' }}</span>
        <span class="layer-name" @click="$emit('selectElement', el.id)">{{ el.name }}</span>
        <button class="layer-btn" :class="{ off: !el.visible }" @click="$emit('toggleVisibility', el.id)" :title="el.visible ? '隐藏' : '显示'">👁</button>
        <button class="layer-btn" :class="{ off: !el.locked }" @click="$emit('toggleLock', el.id)" :title="el.locked ? '解锁' : '锁定'">🔒</button>
        <button class="layer-btn" @click="$emit('bringForward', el.id)" title="上移一层">⬆</button>
        <button class="layer-btn" @click="$emit('sendBackwards', el.id)" title="下移一层">⬇</button>
        <button class="layer-btn" @click="$emit('bringToFront', el.id)" title="置于顶层">🔝</button>
        <button class="layer-btn" @click="$emit('sendToBack', el.id)" title="置于底层">🔻</button>
        <button class="layer-btn danger" @click="$emit('deleteElement', el.id)" title="删除">🗑</button>
      </div>
    </div>

    <!-- 模板 Tab -->
    <div v-if="leftTab === 'templates'" class="panel-body templates-body">
      <button class="btn-new-template" @click="$emit('createNewFromCanvas')">+ 新建空白模板</button>

      <!-- 起始模板 -->
      <div class="section-title">🚀 起始模板</div>
      <div class="preset-cats">
        <button
          v-for="cat in PRESET_CATEGORIES"
          :key="cat.id"
          class="preset-cat-btn"
          :class="{ active: activePresetCat === cat.id }"
          @click="$emit('update:activePresetCat', cat.id)"
        >{{ cat.icon }} {{ cat.name }}</button>
      </div>
      <div class="preset-grid">
        <div
          v-for="preset in filteredPresets"
          :key="preset.id"
          class="preset-card"
          @click="$emit('loadPreset', preset)"
          :title="preset.description"
        >
          <div class="preset-thumb" :style="{ background: preset.thumbnail }"></div>
          <div class="preset-name">{{ preset.name }}</div>
          <div class="preset-desc">{{ preset.description }}</div>
        </div>
      </div>

      <div class="section-divider"></div>

      <!-- 我的模板 -->
      <div class="section-title">📁 我的模板</div>
      <div v-if="loadingTemplates" class="empty-hint">加载中...</div>
      <div v-else-if="!templateList.length" class="empty-hint">暂无模板<br/>先在画布制作，再发布</div>
      <div v-for="tpl in templateList" :key="tpl.id" class="template-item" :class="{ active: currentTemplateId === tpl.id }">
        <div class="tpl-thumb" @click="$emit('loadTemplate', tpl.id)">
          <img v-if="tpl.cover" :src="tpl.cover.startsWith('http') ? tpl.cover : API_BASE + tpl.cover" class="tpl-thumb-img" />
          <div v-else class="tpl-thumb-placeholder">📄</div>
        </div>
        <div class="tpl-info" @click="$emit('loadTemplate', tpl.id)">
          <div class="tpl-name">{{ tpl.name }}</div>
          <div class="tpl-cat">{{ getCategoryName(tpl.category) }}</div>
        </div>
        <div class="tpl-actions">
          <button class="tpl-btn" @click="$emit('cloneTemplate', tpl)" title="克隆">📋</button>
          <button class="tpl-btn danger" @click="$emit('deleteTemplate', tpl)" title="删除">🗑</button>
        </div>
      </div>
      <div class="section-divider"></div>
      <div class="section-title">历史版本</div>
      <div v-if="historyVersions.length === 0" class="empty-hint small">无历史记录</div>
      <div v-for="(ver, idx) in historyVersions" :key="ver.ts" class="history-item" @click="$emit('restoreVersion', idx)">
        <span class="history-label">v{{ historyVersions.length - idx }}</span>
        <span class="history-desc">{{ ver.description }}</span>
        <span class="history-time">{{ formatTime(ver.ts) }}</span>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PageMode, AnyCanvasElement, TextElement, CanvasBackground } from '../types/canvas'
import { CATEGORIES } from '../types/template'
import { API_BASE } from '../composables/useApi'
import { ALL_MATERIALS, getMaterialCategories, getMaterialsByCategory } from '../constants/materials'
import { ALL_PRESETS, PRESET_CATEGORIES, getPresetsByCategory } from '../constants/presets'
import type { TemplatePreset } from '../constants/presets'
import { GRADIENT_CATEGORIES, getGradientsByCategory } from '../constants/gradients'
import { COLOR_SCHEMES } from '../constants/colorSchemes'
import type { ColorScheme } from '../constants/colorSchemes'

// 文字样式预设接口
interface TextPreset {
  name: string
  description: string
  sample: string
  previewStyle: Record<string, string>
  config: Partial<TextElement>
}

// 快捷字段接口
interface SmartFieldConfig {
  key: string
  label: string
  icon: string
  placeholder: string
  fontSize: number
  fontWeight: 'normal' | 'bold'
  color: string
}

const props = defineProps<{
  leftTab: 'material' | 'layers' | 'templates' | 'pages'
  pageMode: PageMode
  selectedId: string | null
  layers: AnyCanvasElement[]
  templateList: any[]
  currentTemplateId: string | null
  currentTemplateName: string
  loadingTemplates: boolean
  historyVersions: Array<{ description: string; ts: number; draft: any }>
  dateValues: Record<string, string>
  activeGradientCat: string
  activeMaterialCat: string
  activePresetCat: string
  filteredGradients: any[]
  filteredMaterials: any[]
  filteredPresets: TemplatePreset[]
  bgColors: string[]
  SMART_FIELDS: SmartFieldConfig[]
  TEXT_PRESETS: TextPreset[]
  materialCategories: string[]
}>()

const emit = defineEmits<{
  'update:leftTab': [value: 'material' | 'layers' | 'templates' | 'pages']
  'addText': [partial: any]
  'applyTextPreset': [tp: TextPreset]
  'addSmartField': [sf: SmartFieldConfig]
  'updateDateValues': [payload: { key: string; value: string }]
  'setBackground': [bg: any]
  'update:activeGradientCat': [value: string]
  'update:activeMaterialCat': [value: string]
  'applyColorScheme': [cs: ColorScheme]
  'bgImageFile': [file: File]
  'materialDragStart': [e: DragEvent, mat: any]
  'materialClick': [mat: any]
  'selectElement': [id: string]
  'toggleVisibility': [id: string]
  'toggleLock': [id: string]
  'bringForward': [id: string]
  'sendBackwards': [id: string]
  'bringToFront': [id: string]
  'sendToBack': [id: string]
  'deleteElement': [id: string]
  'update:currentTemplateName': [value: string]
  'createNewFromCanvas': []
  'update:activePresetCat': [value: string]
  'loadPreset': [preset: TemplatePreset]
  'loadTemplateList': []
  'loadTemplate': [id: string]
  'cloneTemplate': [tpl: any]
  'deleteTemplate': [tpl: any]
  'restoreVersion': [idx: number]
}>()

function onMaterialDragStart(e: DragEvent, mat: any) {
  if (e.dataTransfer) {
    e.dataTransfer.setData('application/json', JSON.stringify(mat))
    e.dataTransfer.effectAllowed = 'copy'
  }
  emit('materialDragStart', e, mat)
}

function onMaterialClick(mat: any) {
  emit('materialClick', mat)
}

function onBgImageFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    emit('bgImageFile', file)
  }
  input.value = ''
}

function sanitizeSvg(svg: string): string {
  return svg.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '').replace(/on\w+="[^"]*"/gi, '')
}

function getCategoryName(catId: string): string {
  return CATEGORIES.find(c => c.id === catId)?.name || catId
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
/* ====== 面板通用 ====== */
.panel {
  background: #fff;
  display: flex;
  flex-direction: column;
  box-shadow: 0 0 10px rgba(0,0,0,0.05);
  flex-shrink: 0;
}

.panel-left { width: 260px; border-right: 1px solid #e5e7eb; }

.panel-tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.tab-btn {
  flex: 1;
  padding: 12px 16px;
  background: transparent;
  border: none;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}

.tab-btn:hover { background: #f9fafb; color: #333; }
.tab-btn.active { color: #1976d2; border-bottom-color: #1976d2; font-weight: 600; }

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
  margin-top: 12px;
}

.section-title:first-child { margin-top: 0; }

.section-divider {
  height: 1px;
  background: #eee;
  margin: 16px -16px;
}

.empty-hint {
  padding: 40px 16px;
  text-align: center;
  color: #999;
  font-size: 12px;
  line-height: 1.8;
}

/* 模板名称 */
.tpl-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}
.tpl-name-label {
  font-size: 11px;
  font-weight: 600;
  color: #999;
  white-space: nowrap;
}
.tpl-name-input {
  flex: 1;
  min-width: 0;
  padding: 4px 8px;
  font-size: 13px;
  border: 1px solid #ddd;
  border-radius: 4px;
  outline: none;
  transition: border-color 0.15s;
}
.tpl-name-input:focus {
  border-color: #e84a6e;
}

/* 素材 */
.material-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 8px;
}

.material-item {
  padding: 14px 8px;
  background: #f5f7fa;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}

.material-item:hover {
  background: #e3f2fd;
  border-color: #90caf9;
}

.text-item { display: flex; align-items: center; justify-content: center; }
.mi-label { font-size: 14px; font-weight: 600; color: #333; }
.mi-label.small { font-size: 12px; color: #666; }

/* 日期占位符预览 */
.date-preview-inputs {
  margin-bottom: 8px;
}
.date-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.date-input-row label {
  font-size: 13px;
  color: #666;
  min-width: 40px;
}
.date-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}
.date-input:focus {
  border-color: #409eff;
}

.smart-field-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
}
.sf-icon { font-size: 20px; line-height: 1; }

.color-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
  margin-bottom: 8px;
}

.color-chip {
  aspect-ratio: 1;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: transform 0.1s;
}

.color-chip:hover { transform: scale(1.1); border-color: #90caf9; }

.upload-btn {
  display: block;
  width: 100%;
  padding: 10px;
  background: #f5f7fa;
  border: 2px dashed #c0c4cc;
  border-radius: 8px;
  color: #666;
  font-size: 12px;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s;
}

.upload-btn:hover { background: #e3f2fd; border-color: #90caf9; color: #1976d2; }

/* 图层 */
.layer-row {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  margin-bottom: 4px;
  border-radius: 6px;
  gap: 8px;
  cursor: pointer;
  transition: background 0.1s;
  border: 1px solid transparent;
}

.layer-row:hover { background: #f5f7fa; }
.layer-row.active { background: #e3f2fd; border-color: #90caf9; }

.layer-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eee;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  color: #555;
}

.layer-name {
  flex: 1;
  font-size: 13px;
  color: #333;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.layer-btn {
  padding: 2px 6px;
  background: transparent;
  border: none;
  font-size: 13px;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.1s;
}

.layer-btn:hover { opacity: 1; }
.layer-btn.off { opacity: 0.25; }
.layer-btn.danger:hover { color: #c62828; }

/* 素材库 */
.mat-category-scroll {
  margin-bottom: 12px;
  overflow-x: auto;
  max-height: 44px;
}

.mat-cats {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding-bottom: 4px;
}

.mat-cat-btn {
  padding: 4px 10px;
  background: #f0f2f5;
  border: 1px solid #e0e4ea;
  border-radius: 12px;
  font-size: 11px;
  color: #666;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.mat-cat-btn:hover { background: #e3f2fd; border-color: #90caf9; color: #1976d2; }
.mat-cat-btn.active { background: #e3f2fd; border-color: #1976d2; color: #1976d2; font-weight: 600; }

.mat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  max-height: 280px;
  overflow-y: auto;
}

.mat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  background: #f8f9fb;
  border: 1px solid #e8eaed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
}

.mat-item:hover { background: #e3f2fd; border-color: #90caf9; transform: scale(1.05); }

.mat-shape {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mat-shape :deep(svg) {
  width: 100%;
  height: 100%;
}

.mat-name { font-size: 9px; color: #888; text-align: center; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; width: 100%; }

/* 渐变网格 */
.gradient-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 8px;
}

.gradient-chip {
  position: relative;
  height: 44px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  overflow: hidden;
}

.gradient-chip:hover {
  transform: scale(1.03);
  border-color: #90caf9;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.gradient-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 6px;
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0,0,0,0.4);
  background: linear-gradient(transparent, rgba(0,0,0,0.3));
  text-align: left;
}

/* 文字样式预设 */
.text-preset-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 0 12px 12px;
}

.text-preset-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 4px;
  background: #f8f9fb;
  border: 1.5px solid #e8eaed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.text-preset-btn:hover {
  background: #e3f2fd;
  border-color: #90caf9;
  transform: scale(1.03);
}

.tp-sample {
  font-size: 16px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.tp-name {
  font-size: 10px;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* 配色方案 */
.color-scheme-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 0 12px 12px;
}

.color-scheme-btn {
  position: relative;
  height: 44px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  overflow: hidden;
}

.color-scheme-btn:hover {
  transform: scale(1.05);
  border-color: #90caf9;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.cs-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 6px;
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0,0,0,0.5);
  background: linear-gradient(transparent, rgba(0,0,0,0.35));
  text-align: left;
}

/* 模板 Tab */
.templates-body {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 12px 0;
}

.btn-new-template {
  margin: 0 12px 12px;
  padding: 10px;
  background: linear-gradient(135deg, #e3f2fd, #bbdefb);
  border: 1.5px dashed #90caf9;
  border-radius: 8px;
  color: #1565c0;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-new-template:hover { background: #e3f2fd; border-color: #1976d2; }

.template-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.1s;
}

.template-item:hover { background: #f5f7fa; }
.template-item.active { background: #e3f2fd; }

.tpl-thumb {
  width: 44px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.tpl-thumb-img { width: 100%; height: 100%; object-fit: cover; }
.tpl-thumb-placeholder { font-size: 24px; }

.tpl-info { flex: 1; min-width: 0; cursor: pointer; }
.tpl-name { font-size: 13px; font-weight: 600; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tpl-cat { font-size: 11px; color: #999; margin-top: 2px; }

.tpl-actions { display: flex; gap: 2px; }

.tpl-btn {
  padding: 4px 6px;
  background: transparent;
  border: none;
  font-size: 13px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.1s;
}

.tpl-btn:hover { background: #e8e8e8; }
.tpl-btn.danger:hover { background: #ffebee; }

/* 起始模板 */
.preset-cats {
  display: flex;
  gap: 6px;
  padding: 0 12px 10px;
}

.preset-cat-btn {
  padding: 5px 12px;
  background: #f0f2f5;
  border: 1px solid #e0e4ea;
  border-radius: 14px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.preset-cat-btn:hover { background: #e3f2fd; border-color: #90caf9; color: #1976d2; }
.preset-cat-btn.active { background: #e3f2fd; border-color: #1976d2; color: #1976d2; font-weight: 600; }

.preset-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  padding: 0 12px 12px;
}

.preset-card {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1.5px solid #e8eaed;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.15s;
}

.preset-card:hover {
  border-color: #90caf9;
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.12);
  transform: translateY(-2px);
}

.preset-thumb {
  width: 100%;
  height: 80px;
  background-size: cover;
  background-position: center;
}

.preset-name {
  padding: 8px 10px 2px;
  font-size: 12px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preset-desc {
  padding: 0 10px 8px;
  font-size: 10px;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 历史版本 */
.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.1s;
}

.history-item:hover { background: #fff8e1; }

.history-label {
  font-size: 11px;
  font-weight: 700;
  color: #1976d2;
  background: #e3f2fd;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.history-desc { flex: 1; font-size: 12px; color: #555; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.history-time { font-size: 10px; color: #aaa; flex-shrink: 0; }

.empty-hint.small {
  padding: 16px;
  font-size: 11px;
  color: #bbb;
}

/* 滚动条样式（webkit） */
.panel-body::-webkit-scrollbar { width: 6px; height: 6px; }
.panel-body::-webkit-scrollbar-track { background: transparent; }
.panel-body::-webkit-scrollbar-thumb { background: #c0c4cc; border-radius: 3px; }
.panel-body::-webkit-scrollbar-thumb:hover { background: #9098a8; }
</style>
