<template>
  <header class="toolbar">
    <div class="toolbar-left">
      <span class="logo">🎨 婚贝模板制作</span>
      <span class="toolbar-divider"></span>

      <!-- 顶部页面切换 -->
      <button class="tb-btn" :class="{ active: currentView === 'editor' }" @click="$emit('changeView', 'editor')">✏️ 模板编辑</button>
      <button class="tb-btn" :class="{ active: currentView === 'poster' }" @click="$emit('changeView', 'poster')">🖼 海报模板</button>

      <span class="toolbar-divider"></span>

      <button class="tb-btn" :disabled="!canUndo" @click="$emit('undo')" title="撤销 (Ctrl+Z)">
        ↶ 撤销
      </button>
      <button class="tb-btn" :disabled="!canRedo" @click="$emit('redo')" title="重做 (Ctrl+Y)">
        ↷ 重做
      </button>

      <span class="toolbar-divider"></span>

      <button class="tb-btn primary" @click="$emit('addText')">✎ 添加文字</button>
      <button class="tb-btn" @click="$emit('triggerImageUpload')">🖼 添加图片</button>
      <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="onImageFile" />

      <span class="toolbar-divider"></span>

      <!-- 画布尺寸 -->
      <select class="tb-select" :value="sizeLabel" @change="$emit('update:sizeLabel', ($event.target as HTMLSelectElement).value)">
        <option v-for="p in CANVAS_PRESETS" :key="p.label" :value="p.label">{{ p.label }}</option>
      </select>

      <span class="toolbar-divider"></span>

      <!-- 页面模式 -->
      <button class="tb-btn" :class="{ active: pageMode === 'single' }" @click="$emit('changePageMode', 'single')" title="单页模式">📄 单页</button>
      <button class="tb-btn" :class="{ active: pageMode === 'long' }" @click="$emit('changePageMode', 'long')" title="长页面模式">📃 长页面</button>
      <button class="tb-btn" :class="{ active: pageMode === 'landscape' }" @click="$emit('changePageMode', 'landscape')" title="横屏卡片模式">🃏 横屏</button>
      <button class="tb-btn" :class="{ active: pageMode === 'flip' }" @click="$emit('changePageMode', 'flip')" title="翻页模式（多页）">📖 翻页</button>
    </div>

    <div class="toolbar-right">
      <span class="zoom-label">缩放 {{ Math.round(zoom * 100) }}%</span>
      <button class="tb-btn sm" @click="$emit('zoomOut')">−</button>
      <button class="tb-btn sm" @click="$emit('zoomReset')">100%</button>
      <button class="tb-btn sm" @click="$emit('zoomIn')">+</button>
      <span class="toolbar-divider"></span>
      <button class="tb-btn sm" :class="{ active: showGrid }" @click="$emit('toggleGrid')" title="网格/吸附">{{ showGrid ? '🧲' : '⊞' }}</button>
      <span class="toolbar-divider"></span>
      <button class="tb-btn danger" @click="$emit('deleteSelected')" title="删除选中 (Del)">🗑 删除</button>
      <span class="toolbar-divider"></span>
      <span v-if="autoSaveLabel" class="auto-save-indicator" :title="autoSaveTitle">🕒 {{ autoSaveLabel }}</span>
      <button class="tb-btn" :disabled="isSaving" @click="$emit('save')" :title="isSaving ? '保存中…' : '保存到服务器 (Ctrl+S)'">
        {{ isSaving ? '💾 保存中…' : '💾 保存' }}
      </button>
      <button class="tb-btn publish-btn" @click="$emit('publish')" title="发布模板">🚀 发布</button>
      <button class="tb-btn" @click="$emit('export')" title="导出 PNG">📥 导出</button>
      <span class="toolbar-divider"></span>
      <button class="tb-btn sm" @click="$emit('logout')" title="退出登录">🚪 退出</button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { CANVAS_PRESETS } from '../types/canvas'
import type { PageMode } from '../types/canvas'

const props = defineProps<{
  currentView: 'editor' | 'poster'
  canUndo: boolean
  canRedo: boolean
  sizeLabel: string
  pageMode: PageMode
  zoom: number
  showGrid: boolean
  isSaving: boolean
  lastAutoSaveTime: number
}>()

const emit = defineEmits<{
  'changeView': [view: 'editor' | 'poster']
  'undo': []
  'redo': []
  'addText': []
  'triggerImageUpload': []
  'imageFile': [file: File]
  'update:sizeLabel': [value: string]
  'changePageMode': [mode: PageMode]
  'zoomOut': []
  'zoomIn': []
  'zoomReset': []
  'toggleGrid': []
  'deleteSelected': []
  'save': []
  'publish': []
  'export': []
  'logout': []
}>()

const fileInput = ref<HTMLInputElement | null>(null)

// 自动保存时间格式化：显示「已自动保存 HH:MM」
const autoSaveLabel = computed(() => {
  const ts = props.lastAutoSaveTime
  if (!ts) return ''
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `已自动保存 ${hh}:${mm}`
})

const autoSaveTitle = computed(() => {
  const ts = props.lastAutoSaveTime
  if (!ts) return ''
  return `上次自动保存：${new Date(ts).toLocaleString()}`
})

function onImageFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    emit('imageFile', file)
  }
  input.value = ''
}
</script>

<style scoped>
/* ====== 顶部工具栏 ====== */
.toolbar {
  height: 52px;
  background: #2b2f38;
  color: #fff;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  flex-shrink: 0;
}

.toolbar-left, .toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-right {
  margin-left: auto;
}

.logo {
  font-size: 14px;
  font-weight: 600;
  color: #ffd54f;
  margin-right: 8px;
}

.toolbar-divider {
  width: 1px;
  height: 22px;
  background: rgba(255,255,255,0.15);
  margin: 0 4px;
}

.tb-btn {
  padding: 6px 14px;
  background: #3b4049;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}

.tb-btn:hover:not(:disabled) { background: #4a5160; }
.tb-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.tb-btn.active { background: #4a5160; border-color: #64b5f6; color: #64b5f6; }
.tb-btn.primary { background: #1976d2; border-color: #1565c0; }
.tb-btn.primary:hover:not(:disabled) { background: #1565c0; }
.tb-btn.danger { background: #c62828; border-color: #b71c1c; }
.tb-btn.danger:hover:not(:disabled) { background: #b71c1c; }
.tb-btn.sm { padding: 6px 10px; font-size: 12px; min-width: 60px; }

.tb-select {
  padding: 6px 10px;
  background: #3b4049;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.zoom-label { font-size: 12px; color: #bbb; }

/* 自动保存指示 */
.auto-save-indicator {
  font-size: 11px;
  color: #9ccc65;
  white-space: nowrap;
  padding: 0 4px;
}

/* 发布按钮 */
.tb-btn.publish-btn {
  background: linear-gradient(135deg, #e84a6e, #ff6b8a);
  border-color: #e84a6e;
  font-weight: 700;
  padding: 6px 16px;
}

.tb-btn.publish-btn:hover { background: linear-gradient(135deg, #c0392b, #e84a6e); }
</style>
