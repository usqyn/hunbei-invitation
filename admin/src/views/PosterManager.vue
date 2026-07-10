<template>
  <div class="poster-manager">
    <!-- ============ 顶部操作栏 ============ -->
    <div class="pm-header">
      <h2 class="pm-title">海报模板管理</h2>
      <div class="pm-header-actions">
        <input
          v-model="searchQuery"
          class="pm-search"
          placeholder="搜索模板名称…"
        />
        <select v-model="filterCategory" class="pm-filter-select">
          <option value="">全部分类</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.icon }} {{ cat.name }}
          </option>
        </select>
        <button class="pm-btn primary" @click="openCreateModal">+ 新建模板</button>
      </div>
    </div>

    <!-- ============ 统计卡片 ============ -->
    <div class="pm-stats">
      <div class="pm-stat-card">
        <div class="pm-stat-icon">📊</div>
        <div class="pm-stat-body">
          <div class="pm-stat-value">{{ stats.totalTemplates }}</div>
          <div class="pm-stat-label">模板总数</div>
        </div>
      </div>
      <div class="pm-stat-card">
        <div class="pm-stat-icon">🏷️</div>
        <div class="pm-stat-body">
          <div class="pm-stat-value">{{ stats.categoryCount }}</div>
          <div class="pm-stat-label">分类数量</div>
        </div>
      </div>
      <div class="pm-stat-card">
        <div class="pm-stat-icon">🆓</div>
        <div class="pm-stat-body">
          <div class="pm-stat-value">{{ stats.freeCount }}</div>
          <div class="pm-stat-label">免费模板</div>
        </div>
      </div>
      <div class="pm-stat-card">
        <div class="pm-stat-icon">👑</div>
        <div class="pm-stat-body">
          <div class="pm-stat-value">{{ stats.vipCount }}</div>
          <div class="pm-stat-label">VIP模板</div>
        </div>
      </div>
    </div>

    <!-- ============ 模板网格 ============ -->
    <div class="pm-sort-bar">
      <span class="pm-sort-label">排序：</span>
      <select v-model="sortBy" class="pm-filter-select">
        <option value="created">按创建时间</option>
        <option value="updated">按修改时间</option>
        <option value="name">按名称</option>
      </select>
      <button class="pm-btn sm" @click="toggleSortOrder" :title="sortOrder === 'asc' ? '当前升序，点击切换为降序' : '当前降序，点击切换为升序'">
        {{ sortOrder === 'asc' ? '↑ 升序' : '↓ 降序' }}
      </button>
      <span class="pm-sort-count">共 {{ filteredTemplates.length }} 个模板</span>
    </div>

    <div v-if="loading" class="pm-empty">加载中...</div>
    <div v-else-if="filteredTemplates.length === 0" class="pm-empty">
      {{ searchQuery || filterCategory ? '没有匹配的模板' : '暂无模板，点击「新建模板」创建' }}
    </div>
    <div v-else class="pm-grid">
      <div
        v-for="tpl in filteredTemplates"
        :key="tpl.id"
        class="pm-card"
      >
        <div class="pm-card-cover" @click="openEditModal(tpl)">
          <img
            v-if="tpl.cover_url"
            :src="resolveUrl(tpl.cover_url)"
            class="pm-cover-img"
            alt="cover"
          />
          <div v-else class="pm-cover-placeholder">📄</div>
          <span class="pm-card-badge" :class="{ vip: tpl.is_vip }">
            {{ tpl.is_vip ? 'VIP' : '免费' }}
          </span>
          <span v-if="tpl.is_active === false" class="pm-card-badge inactive">已下架</span>
        </div>
        <div class="pm-card-body">
          <div class="pm-card-name" :title="tpl.name">{{ tpl.name }}</div>
          <div class="pm-card-cat">{{ getCategoryName(tpl.category_id) }}</div>
          <div class="pm-card-actions">
            <button class="pm-btn sm" @click="openEditModal(tpl)">✎ 编辑</button>
            <button class="pm-btn sm" @click="cloneTemplate(tpl)" title="复制此模板创建新模板">⧉ 克隆</button>
            <button class="pm-btn sm" @click="exportTemplateJson(tpl)" title="导出为 JSON 文件">⬇ 导出</button>
            <button class="pm-btn sm danger" @click="onDeleteTemplate(tpl)">🗑 删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ 创建/编辑弹窗 ============ -->
    <Teleport to="body">
      <div v-if="showModal" class="pm-modal-overlay" @click.self="closeModal">
        <div class="pm-modal">
          <div class="pm-modal-header">
            <span class="pm-modal-title">{{ editingId ? '编辑模板' : '新建模板' }}</span>
            <button class="pm-close-btn" @click="closeModal">×</button>
          </div>

          <div class="pm-modal-body">
            <!-- 基础信息 -->
            <div class="pm-form-section">
              <div class="pm-form-row">
                <label>模板名称 *</label>
                <input v-model="form.name" class="pm-input" placeholder="请输入模板名称" maxlength="50" />
              </div>
              <div class="pm-form-row">
                <label>分类 *</label>
                <select v-model="form.category_id" class="pm-input">
                  <option value="">请选择分类</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                    {{ cat.icon }} {{ cat.name }}
                  </option>
                </select>
              </div>
              <div class="pm-form-row two-col">
                <div>
                  <label>封面图 URL</label>
                  <input v-model="form.cover_url" class="pm-input" placeholder="https://…" />
                </div>
                <div>
                  <label>背景图 URL</label>
                  <input v-model="form.background_url" class="pm-input" placeholder="https://…" />
                </div>
              </div>
              <div class="pm-form-row two-col">
                <div>
                  <label class="pm-toggle-label">
                    <span>{{ form.is_free ? '🆓 免费' : '💰 付费' }}</span>
                    <label class="pm-switch">
                      <input type="checkbox" v-model="form.is_free" />
                      <span class="pm-slider"></span>
                    </label>
                  </label>
                </div>
                <div>
                  <label class="pm-toggle-label">
                    <span>{{ form.is_vip ? '👑 VIP' : '普通' }}</span>
                    <label class="pm-switch">
                      <input type="checkbox" v-model="form.is_vip" />
                      <span class="pm-slider"></span>
                    </label>
                  </label>
                </div>
              </div>
              <div class="pm-form-row">
                <label class="pm-toggle-label">
                  <span>{{ form.is_active ? '✅ 已上架' : '⏸ 已下架' }}</span>
                  <label class="pm-switch">
                    <input type="checkbox" v-model="form.is_active" />
                    <span class="pm-slider"></span>
                  </label>
                </label>
              </div>
            </div>

            <!-- 可编辑区域编辑器 -->
            <div class="pm-form-section">
              <div class="pm-section-header">
                <span class="pm-section-title">可编辑区域（坐标单位：像素，画布 750×1334）</span>
                <div class="pm-area-add-btns">
                  <button class="pm-btn sm" @click="addArea('text')">+ 文字区域</button>
                  <button class="pm-btn sm" @click="addArea('image')">+ 图片区域</button>
                </div>
              </div>

              <!-- 画布工具栏：撤销/重做 + 缩放 -->
              <div class="pm-canvas-toolbar">
                <div class="pm-toolbar-group">
                  <button class="pm-btn sm" :disabled="!canUndoPoster" @click="undoPoster" title="撤销">↶ 撤销</button>
                  <button class="pm-btn sm" :disabled="!canRedoPoster" @click="redoPoster" title="重做">↷ 重做</button>
                </div>
                <div class="pm-toolbar-group">
                  <button class="pm-btn sm" @click="zoomCanvas(-0.1)" title="缩小">−</button>
                  <span class="pm-zoom-label">{{ Math.round(canvasZoom * 100) }}%</span>
                  <button class="pm-btn sm" @click="zoomCanvas(0.1)" title="放大">+</button>
                  <button class="pm-btn sm" @click="resetCanvasZoom" title="重置缩放">重置</button>
                </div>
              </div>

              <!-- 画布预览 -->
              <div class="pm-canvas-scroll" :style="{ height: (533 * canvasZoom) + 'px' }">
                <div class="pm-canvas" ref="canvasWrapRef" :style="{ transform: `scale(${canvasZoom})`, transformOrigin: 'top center' }">
                  <img
                    v-if="form.background_url"
                    :src="resolveUrl(form.background_url)"
                    class="pm-canvas-bg"
                    alt="bg"
                  />
                  <div
                    v-for="(area, idx) in form.editableAreas"
                    :key="idx"
                    class="pm-area"
                    :class="{ selected: selectedAreaIdx === idx, text: area.type === 'text', image: area.type === 'image' }"
                    :style="areaStyle(area)"
                    @mousedown.stop="startDragArea($event, idx)"
                    @dblclick.stop="startEditText(idx)"
                  >
                    <!-- 图片区域默认图片预览 -->
                    <img
                      v-if="area.type === 'image' && area.defaultImage"
                      :src="resolveUrl(area.defaultImage)"
                      class="pm-area-img"
                      alt="default"
                    />
                    <span class="pm-area-label">{{ area.type === 'text' ? 'T' : '🖼' }}</span>
                    <!-- 文字内容：非编辑态显示 -->
                    <span class="pm-area-content" v-if="area.type === 'text' && editingAreaIdx !== idx">{{ area.defaultText || area.label }}</span>
                    <!-- 文字内容：编辑态显示 input 覆盖在区域上 -->
                    <input
                      v-if="area.type === 'text' && editingAreaIdx === idx"
                      v-model="form.editableAreas[idx].defaultText"
                      class="pm-area-edit-input"
                      @blur="finishEditText"
                      @keyup.enter="finishEditText"
                      @mousedown.stop
                      @click.stop
                      @dblclick.stop
                    />
                    <button class="pm-area-del" @click.stop="removeArea(idx)">×</button>
                    <!-- 8方向 resize 手柄（仅选中时显示） -->
                    <template v-if="selectedAreaIdx === idx">
                      <span class="pm-rz-hdl nw" @mousedown.stop.prevent="startResize($event, idx, 'nw')"></span>
                      <span class="pm-rz-hdl n"  @mousedown.stop.prevent="startResize($event, idx, 'n')"></span>
                      <span class="pm-rz-hdl ne" @mousedown.stop.prevent="startResize($event, idx, 'ne')"></span>
                      <span class="pm-rz-hdl e"  @mousedown.stop.prevent="startResize($event, idx, 'e')"></span>
                      <span class="pm-rz-hdl se" @mousedown.stop.prevent="startResize($event, idx, 'se')"></span>
                      <span class="pm-rz-hdl s"  @mousedown.stop.prevent="startResize($event, idx, 's')"></span>
                      <span class="pm-rz-hdl sw" @mousedown.stop.prevent="startResize($event, idx, 'sw')"></span>
                      <span class="pm-rz-hdl w"  @mousedown.stop.prevent="startResize($event, idx, 'w')"></span>
                    </template>
                  </div>
                </div>
              </div>

              <!-- 图片区域默认图片上传隐藏 input -->
              <input ref="areaImgFileInput" type="file" accept="image/*" style="display:none" @change="onAreaImgFileChange" />

              <!-- 选中区域的属性面板 -->
              <div v-if="selectedAreaIdx !== null && form.editableAreas[selectedAreaIdx]" class="pm-area-props">
                <div class="pm-section-title">区域属性 — {{ form.editableAreas[selectedAreaIdx].type === 'text' ? '文字' : '图片' }}</div>

                <!-- 区域操作：复制 / 上移 / 下移 -->
                <div class="pm-area-action-bar">
                  <button class="pm-btn sm" @click="duplicateArea(selectedAreaIdx)" title="复制此区域">📋 复制区域</button>
                  <button class="pm-btn sm" @click="moveAreaUp(selectedAreaIdx)" :disabled="selectedAreaIdx === 0" title="上移层级">⬆ 上移</button>
                  <button class="pm-btn sm" @click="moveAreaDown(selectedAreaIdx)" :disabled="selectedAreaIdx === form.editableAreas.length - 1" title="下移层级">⬇ 下移</button>
                </div>

                <div class="pm-form-row">
                  <label>标签 / 名称</label>
                  <input v-model="form.editableAreas[selectedAreaIdx].label" class="pm-input" placeholder="如：邀请人姓名" />
                </div>
                <div class="pm-form-row" v-if="form.editableAreas[selectedAreaIdx].type === 'text'">
                  <label>默认文字</label>
                  <input v-model="form.editableAreas[selectedAreaIdx].defaultText" class="pm-input" placeholder="默认显示文字" />
                </div>
                <!-- 图片区域：默认图片 URL + 上传 -->
                <div class="pm-form-row" v-if="form.editableAreas[selectedAreaIdx].type === 'image'">
                  <label>默认图片 URL</label>
                  <input v-model="form.editableAreas[selectedAreaIdx].defaultImage" class="pm-input" placeholder="https://… 或点击上传" />
                </div>
                <div class="pm-form-row" v-if="form.editableAreas[selectedAreaIdx].type === 'image'">
                  <button class="pm-btn sm" @click="triggerAreaImageUpload">📷 上传默认图片</button>
                </div>
                <div class="pm-form-row two-col">
                  <div>
                    <label>X (px)</label>
                    <input type="number" min="0" max="750" step="1" v-model.number="form.editableAreas[selectedAreaIdx].x" class="pm-input" />
                  </div>
                  <div>
                    <label>Y (px)</label>
                    <input type="number" min="0" max="1334" step="1" v-model.number="form.editableAreas[selectedAreaIdx].y" class="pm-input" />
                  </div>
                </div>
                <div class="pm-form-row two-col">
                  <div>
                    <label>宽 (px)</label>
                    <input type="number" min="1" max="750" step="1" v-model.number="form.editableAreas[selectedAreaIdx].width" class="pm-input" />
                  </div>
                  <div>
                    <label>高 (px)</label>
                    <input type="number" min="1" max="1334" step="1" v-model.number="form.editableAreas[selectedAreaIdx].height" class="pm-input" />
                  </div>
                </div>
                <div class="pm-form-row two-col" v-if="form.editableAreas[selectedAreaIdx].type === 'text'">
                  <div>
                    <label>字号 (px)</label>
                    <input type="number" min="8" max="72" v-model.number="form.editableAreas[selectedAreaIdx].fontSize" class="pm-input" />
                  </div>
                  <div>
                    <label>粗细</label>
                    <select v-model="form.editableAreas[selectedAreaIdx].fontWeight" class="pm-input">
                      <option value="normal">正常</option>
                      <option value="bold">加粗</option>
                    </select>
                  </div>
                </div>
                <div class="pm-form-row two-col" v-if="form.editableAreas[selectedAreaIdx].type === 'text'">
                  <div>
                    <label>颜色</label>
                    <input type="color" v-model="form.editableAreas[selectedAreaIdx].color" class="pm-input pm-color-input" />
                  </div>
                  <div>
                    <label>对齐</label>
                    <select v-model="form.editableAreas[selectedAreaIdx].align" class="pm-input">
                      <option value="left">左对齐</option>
                      <option value="center">居中</option>
                      <option value="right">右对齐</option>
                    </select>
                  </div>
                </div>
                <div class="pm-form-row" v-if="form.editableAreas[selectedAreaIdx].type === 'text'">
                  <label>文字方向</label>
                  <select v-model="form.editableAreas[selectedAreaIdx].direction" class="pm-input">
                    <option value="">跟随系统</option>
                    <option value="ltr">LTR (左到右)</option>
                    <option value="rtl">RTL (右到左)</option>
                    <option value="auto">自动检测</option>
                  </select>
                </div>
              </div>
              <div v-else class="pm-area-hint">点击画布上的区域进行编辑，或点击上方按钮添加新区域</div>
            </div>
          </div>

          <div class="pm-modal-footer">
            <button class="pm-btn" @click="closeModal">取消</button>
            <button class="pm-btn primary" :disabled="saving" @click="saveTemplate">
              {{ saving ? '保存中…' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { api, API_BASE, initApi, uploadImages } from '../composables/useApi'
import { CATEGORIES } from '../types/template'

// ============ 类型定义 ============
interface EditableArea {
  id?: string
  type: 'text' | 'image'
  label: string
  defaultText?: string
  defaultImage?: string   // 图片区域默认图片 URL
  x: number        // 像素坐标
  y: number
  width: number    // 像素尺寸
  height: number
  fontSize?: number
  fontWeight?: string  // 'normal' | 'bold' | 数字字重，保留以兼容历史数据
  color?: string
  align?: 'left' | 'center' | 'right'
  borderRadius?: number
  direction?: 'ltr' | 'rtl' | 'auto'
}

interface PosterTemplateRaw {
  id?: string
  name: string
  category_id: string
  cover_url: string
  background_url: string
  is_free: boolean
  is_vip: boolean
  is_active?: boolean
  config?: { width: number; height: number; editableAreas: EditableArea[] }
  editableAreas: EditableArea[]  // 本地编辑用
  created_at?: string
  updated_at?: string
}

// ============ 状态 ============
const loading = ref(false)
const saving = ref(false)
const templates = ref<PosterTemplateRaw[]>([])
const searchQuery = ref('')
const filterCategory = ref('')
const showModal = ref(false)
const editingId = ref<string | null>(null)
const selectedAreaIdx = ref<number | null>(null)
const editingAreaIdx = ref<number | null>(null)  // 正在画布上直接编辑文字的区域索引
const canvasWrapRef = ref<HTMLElement | null>(null)
const areaImgFileInput = ref<HTMLInputElement | null>(null)

// 模板列表排序
const sortBy = ref<'created' | 'updated' | 'name'>('created')
const sortOrder = ref<'asc' | 'desc'>('desc')

// 画布缩放（CSS transform: scale）
const canvasZoom = ref(1)

// 撤销 / 重做历史栈
interface PosterSnapshot {
  name: string
  category_id: string
  cover_url: string
  background_url: string
  is_free: boolean
  is_vip: boolean
  editableAreas: EditableArea[]
}
const historyStack = ref<PosterSnapshot[]>([])
const redoStack = ref<PosterSnapshot[]>([])

const categories = CATEGORIES

const stats = reactive({
  totalTemplates: 0,
  categoryCount: 0,
  freeCount: 0,
  vipCount: 0,
})

const defaultForm = (): PosterTemplateRaw => ({
  name: '',
  category_id: '',
  cover_url: '',
  background_url: '',
  is_free: true,
  is_vip: false,
  is_active: true,
  editableAreas: [],
})

const form = reactive<PosterTemplateRaw>(defaultForm())

// ============ 计算 ============
const filteredTemplates = computed(() => {
  let list = templates.value
  if (filterCategory.value) {
    list = list.filter(t => t.category_id === filterCategory.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(t => t.name.toLowerCase().includes(q))
  }
  // 排序
  const dir = sortOrder.value === 'asc' ? 1 : -1
  list = [...list].sort((a, b) => {
    if (sortBy.value === 'name') {
      return (a.name || '').localeCompare(b.name || '', 'zh') * dir
    }
    // created / updated，缺失字段回退到对方或 0
    const ta = new Date(
      (sortBy.value === 'updated' ? (a.updated_at || a.created_at) : a.created_at) || 0
    ).getTime()
    const tb = new Date(
      (sortBy.value === 'updated' ? (b.updated_at || b.created_at) : b.created_at) || 0
    ).getTime()
    return (ta - tb) * dir
  })
  return list
})

// 撤销 / 重做可用性
const canUndoPoster = computed(() => historyStack.value.length > 0)
const canRedoPoster = computed(() => redoStack.value.length > 0)

function snapshotForm(): PosterSnapshot {
  return {
    name: form.name,
    category_id: form.category_id,
    cover_url: form.cover_url,
    background_url: form.background_url,
    is_free: form.is_free,
    is_vip: form.is_vip,
    editableAreas: JSON.parse(JSON.stringify(form.editableAreas)),
  }
}

function restoreSnapshot(s: PosterSnapshot) {
  form.name = s.name
  form.category_id = s.category_id
  form.cover_url = s.cover_url
  form.background_url = s.background_url
  form.is_free = s.is_free
  form.is_vip = s.is_vip
  form.editableAreas = JSON.parse(JSON.stringify(s.editableAreas))
}

// 在每次区域操作前调用：记录当前状态用于撤销
function pushPosterHistory() {
  historyStack.value.push(snapshotForm())
  if (historyStack.value.length > 50) historyStack.value.shift()
  // 新操作清空 redo 栈
  redoStack.value = []
}

// 延迟入栈机制：交互开始时记录初始状态（不立即入栈），交互结束时确认发生实际变化后才入栈
// 避免单纯点击（无拖拽/无修改）污染撤销栈
let pendingSnapshot: PosterSnapshot | null = null

function beginInteraction() {
  pendingSnapshot = snapshotForm()
}

function endInteraction() {
  if (!pendingSnapshot) return
  const current = snapshotForm()
  // 仅在 editableAreas 或其他表单字段发生变化时才入栈
  if (JSON.stringify(current.editableAreas) !== JSON.stringify(pendingSnapshot.editableAreas) ||
      current.name !== pendingSnapshot.name ||
      current.category_id !== pendingSnapshot.category_id ||
      current.cover_url !== pendingSnapshot.cover_url ||
      current.background_url !== pendingSnapshot.background_url ||
      current.is_free !== pendingSnapshot.is_free ||
      current.is_vip !== pendingSnapshot.is_vip) {
    historyStack.value.push(pendingSnapshot)
    if (historyStack.value.length > 50) historyStack.value.shift()
    redoStack.value = []
  }
  pendingSnapshot = null
}

function undoPoster() {
  if (historyStack.value.length === 0) return
  // 当前状态入 redo 栈
  redoStack.value.push(snapshotForm())
  const prev = historyStack.value.pop()!
  restoreSnapshot(prev)
  // 修正选中索引
  if (selectedAreaIdx.value !== null && selectedAreaIdx.value >= form.editableAreas.length) {
    selectedAreaIdx.value = form.editableAreas.length > 0 ? form.editableAreas.length - 1 : null
  }
}

function redoPoster() {
  if (redoStack.value.length === 0) return
  historyStack.value.push(snapshotForm())
  const next = redoStack.value.pop()!
  restoreSnapshot(next)
  if (selectedAreaIdx.value !== null && selectedAreaIdx.value >= form.editableAreas.length) {
    selectedAreaIdx.value = form.editableAreas.length > 0 ? form.editableAreas.length - 1 : null
  }
}

// 画布缩放控件
function zoomCanvas(delta: number) {
  const next = Math.round((canvasZoom.value + delta) * 100) / 100
  canvasZoom.value = Math.min(2, Math.max(0.5, next))
}
function resetCanvasZoom() {
  canvasZoom.value = 1
}

// 排序方向切换
function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
}

// ============ 工具函数 ============
function resolveUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url
  return API_BASE + url
}

function getCategoryName(catId: string): string {
  return categories.find(c => c.id === catId)?.name || catId
}

function areaStyle(area: EditableArea): Record<string, string> {
  // Map pixel coords to percentage for preview
  return {
    left: `${(area.x / 750) * 100}%`,
    top: `${(area.y / 1334) * 100}%`,
    width: `${(area.width / 750) * 100}%`,
    height: `${(area.height / 1334) * 100}%`,
    fontSize: area.fontSize ? `${Math.max(10, area.fontSize * 0.35)}px` : '12px',
    fontWeight: area.fontWeight || 'normal',  // 预览中应用字重
    color: area.color || '#333',
    textAlign: area.align || 'center',
    direction: area.direction || 'ltr',
  }
}

// ============ API ============
async function fetchTemplates() {
  loading.value = true
  try {
    // 管理后台需要查看所有模板（含下架），传 all=true 跳过 is_active 过滤
    const res = await api.get('/api/poster/templates', {
      params: { limit: 100, all: 'true' },
    })
    if (res.data.success !== false) {
      templates.value = (res.data.data || []).map((t: any) => normalizeTemplate(t))
    }
  } catch (e) {
    console.error('fetchTemplates error:', e)
    templates.value = []
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  try {
    const res = await api.get('/api/poster/stats')
    if (res.data.success !== false && res.data.data) {
      stats.totalTemplates = res.data.data.totalTemplates ?? templates.value.length
      stats.categoryCount = res.data.data.categoryCount ?? Object.keys(res.data.data.byCategory || {}).length
      stats.freeCount = res.data.data.freeTemplates ?? 0
      stats.vipCount = res.data.data.vipTemplates ?? 0
    }
  } catch (_) {
    computeLocalStats()
  }
}

function computeLocalStats() {
  const list = templates.value
  const cats = new Set(list.map(t => t.category_id).filter(Boolean))
  stats.totalTemplates = list.length
  stats.categoryCount = cats.size
  stats.freeCount = list.filter(t => t.is_free).length
  stats.vipCount = list.filter(t => t.is_vip).length
}

function normalizeTemplate(raw: any): PosterTemplateRaw {
  let config: any = {}
  if (typeof raw.config === 'string') {
    try {
      config = JSON.parse(raw.config || '{}')
    } catch {
      console.warn('Failed to parse template config:', raw.config)
      config = {}
    }
  } else {
    config = raw.config || {}
  }
  const areas = config.editableAreas || []
  return {
    id: raw.id || raw._id,
    name: raw.name || '',
    category_id: raw.category_id || '',
    cover_url: raw.cover_url || '',
    background_url: raw.background_url || '',
    is_free: raw.is_free === 1 || raw.is_free === true,
    is_vip: raw.is_vip === 1 || raw.is_vip === true,
    is_active: raw.is_active !== 0,
    config,
    editableAreas: areas.map((a: any) => ({
      id: a.id || `area_${Date.now()}`,
      type: a.type || 'text',
      label: a.label || '',
      defaultText: a.defaultText || '',
      defaultImage: a.defaultImage || '',
      x: a.x ?? 0,
      y: a.y ?? 0,
      width: a.width ?? 200,
      height: a.height ?? 60,
      fontSize: a.fontSize ?? 28,
      fontWeight: a.fontWeight || 'normal',  // 保留字重字段
      color: a.color || '#333333',
      align: a.align || 'center',
      borderRadius: a.borderRadius || 0,
      direction: a.direction || '',
    })),
    created_at: raw.created_at,
    updated_at: raw.updated_at || raw.updatedAt || raw.modified_at,
  }
}

async function saveTemplate() {
  if (!form.name.trim()) {
    alert('请输入模板名称')
    return
  }
  if (!form.category_id) {
    alert('请选择分类')
    return
  }
  saving.value = true
  try {
    // Build payload matching backend field names (snake_case)
    const payload = {
      name: form.name,
      category_id: form.category_id,
      cover_url: form.cover_url,
      background_url: form.background_url,
      is_free: form.is_free ? 1 : 0,
      is_vip: form.is_vip ? 1 : 0,
      is_active: form.is_active !== false ? 1 : 0,
      config: {
        width: 750,
        height: 1334,
        editableAreas: form.editableAreas.map(a => ({
          id: a.id || `area_${Date.now()}`,
          type: a.type,
          label: a.label,
          defaultText: a.defaultText,
          defaultImage: a.defaultImage,
          x: a.x,
          y: a.y,
          width: a.width,
          height: a.height,
          fontSize: a.fontSize,
          fontWeight: a.fontWeight || 'normal',  // 保留字重字段
          color: a.color,
          align: a.align,
          borderRadius: a.borderRadius,
          direction: a.direction,
        })),
      },
    }

    let res: any
    if (editingId.value) {
      res = await api.put(`/api/poster/templates/${editingId.value}`, payload)
    } else {
      res = await api.post('/api/poster/templates', payload)
    }
    if (res.data && res.data.success === false) {
      throw new Error(res.data.error || '保存失败')
    }
    closeModal()
    await fetchTemplates()
    await fetchStats()
  } catch (e: any) {
    alert('保存失败：' + (e?.response?.data?.error || e?.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

async function onDeleteTemplate(tpl: PosterTemplateRaw) {
  if (!confirm(`确定删除模板「${tpl.name}」？此操作不可撤销。`)) return
  try {
    await api.delete(`/api/poster/templates/${tpl.id}`)
    templates.value = templates.value.filter(t => t.id !== tpl.id)
    computeLocalStats()
    await fetchStats()
  } catch (e: any) {
    alert('删除失败：' + (e?.response?.data?.error || e?.message || '未知错误'))
  }
}

// 导出模板配置为 JSON 文件下载
function exportTemplateJson(tpl: PosterTemplateRaw) {
  const exportData = {
    id: tpl.id,
    name: tpl.name,
    category_id: tpl.category_id,
    category_name: getCategoryName(tpl.category_id),
    cover_url: tpl.cover_url,
    background_url: tpl.background_url,
    is_free: tpl.is_free,
    is_vip: tpl.is_vip,
    is_active: tpl.is_active,
    config: tpl.config || { width: 750, height: 1334, editableAreas: tpl.editableAreas },
    editableAreas: tpl.editableAreas,
    exported_at: new Date().toISOString(),
  }
  const json = JSON.stringify(exportData, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safeName = (tpl.name || 'template').replace(/[\\/:*?"<>|]/g, '_')
  a.download = `poster-template-${safeName}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ============ 克隆模板（复制现有模板数据创建新模板）============
async function cloneTemplate(tpl: PosterTemplateRaw) {
  if (!confirm(`确定克隆模板「${tpl.name}」？将创建一个副本。`)) return
  try {
    // 深拷贝当前模板数据，id 设为 null 让服务端生成新 id，名称加"_副本"后缀
    const clonedAreas = JSON.parse(JSON.stringify(tpl.editableAreas || []))
    // 为克隆的区域生成新 id，避免冲突
    clonedAreas.forEach((a: EditableArea) => {
      a.id = `area_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    })
    const payload = {
      name: `${tpl.name}_副本`,
      category_id: tpl.category_id,
      cover_url: tpl.cover_url,
      background_url: tpl.background_url,
      is_free: tpl.is_free ? 1 : 0,
      is_vip: tpl.is_vip ? 1 : 0,
      is_active: tpl.is_active === false ? 0 : 1,
      config: {
        width: tpl.config?.width || 750,
        height: tpl.config?.height || 1334,
        editableAreas: clonedAreas,
      },
    }
    const res = await api.post('/api/poster/templates', payload)
    if (res.data && res.data.success === false) {
      throw new Error(res.data.error || '克隆失败')
    }
    await fetchTemplates()
    await fetchStats()
    alert('模板克隆成功！')
  } catch (e: any) {
    alert('克隆失败：' + (e?.response?.data?.error || e?.message || '未知错误'))
  }
}

// ============ 弹窗操作 ============
function openCreateModal() {
  Object.assign(form, defaultForm())
  editingId.value = null
  selectedAreaIdx.value = null
  historyStack.value = []
  redoStack.value = []
  canvasZoom.value = 1
  showModal.value = true
}

function openEditModal(tpl: PosterTemplateRaw) {
  Object.assign(form, JSON.parse(JSON.stringify(tpl)))
  editingId.value = tpl.id || null
  selectedAreaIdx.value = null
  historyStack.value = []
  redoStack.value = []
  canvasZoom.value = 1
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingId.value = null
  selectedAreaIdx.value = null
}

// ============ 可编辑区域操作 ============
function addArea(type: 'text' | 'image') {
  pushPosterHistory()
  const area: EditableArea = {
    id: `area_${Date.now()}`,
    type,
    label: type === 'text' ? '新文字区域' : '新图片区域',
    x: 200,
    y: 400,
    width: type === 'text' ? 350 : 300,
    height: type === 'text' ? 80 : 300,
    ...(type === 'text'
      ? { defaultText: '示例文字', fontSize: 28, fontWeight: 'normal', color: '#333333', align: 'center', direction: '' }
      : { borderRadius: 8 }),
  }
  form.editableAreas.push(area)
  selectedAreaIdx.value = form.editableAreas.length - 1
}

function removeArea(idx: number) {
  pushPosterHistory()
  form.editableAreas.splice(idx, 1)
  if (selectedAreaIdx.value === idx) {
    selectedAreaIdx.value = null
  } else if (selectedAreaIdx.value !== null && selectedAreaIdx.value > idx) {
    selectedAreaIdx.value--
  }
}

// ============ 区域复制（深拷贝，y 偏移 20px）============
function duplicateArea(idx: number) {
  if (idx < 0 || idx >= form.editableAreas.length) return
  pushPosterHistory()
  const source = form.editableAreas[idx]
  const dup: EditableArea = JSON.parse(JSON.stringify(source))
  dup.id = `area_${Date.now()}`
  dup.y = source.y + 20
  form.editableAreas.splice(idx + 1, 0, dup)
  selectedAreaIdx.value = idx + 1
}

// ============ 区域层级调整（上移 / 下移）============
function moveAreaUp(idx: number) {
  if (idx <= 0) return
  pushPosterHistory()
  const arr = form.editableAreas
  ;[arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]]
  selectedAreaIdx.value = idx - 1
}

function moveAreaDown(idx: number) {
  if (idx >= form.editableAreas.length - 1) return
  pushPosterHistory()
  const arr = form.editableAreas
  ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
  selectedAreaIdx.value = idx + 1
}

// ============ 画布文字直接编辑 ============
function startEditText(idx: number) {
  const area = form.editableAreas[idx]
  if (!area || area.type !== 'text') return
  // 记录初始状态（延迟入栈），编辑结束时确认文本变化才入栈
  beginInteraction()
  editingAreaIdx.value = idx
  selectedAreaIdx.value = idx
}

function finishEditText() {
  editingAreaIdx.value = null
  // 确认文本发生变化后才入栈
  endInteraction()
}

// ============ 图片区域默认图片 ============
function triggerAreaImageUpload() {
  areaImgFileInput.value?.click()
}

async function onAreaImgFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (selectedAreaIdx.value === null) return
  try {
    const urls = await uploadImages([file])
    const url = urls[0] || ''
    if (url) {
      form.editableAreas[selectedAreaIdx.value].defaultImage = url
    }
  } catch (err: any) {
    alert('图片上传失败：' + (err?.message || err))
  } finally {
    input.value = ''
  }
}

// 拖拽区域
let dragState: { idx: number; startX: number; startY: number; origX: number; origY: number } | null = null

function startDragArea(e: MouseEvent, idx: number) {
  selectedAreaIdx.value = idx
  // 记录初始状态（延迟入栈），mouseup 时确认发生实际拖拽才入栈
  beginInteraction()
  const area = form.editableAreas[idx]
  dragState = {
    idx,
    startX: e.clientX,
    startY: e.clientY,
    origX: area.x,
    origY: area.y,
  }
  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', onDragEnd)
}

function onDragMove(e: MouseEvent) {
  if (!dragState || !canvasWrapRef.value) return
  const rect = canvasWrapRef.value.getBoundingClientRect()
  const scaleX = 750 / rect.width
  const scaleY = 1334 / rect.height
  const area = form.editableAreas[dragState.idx]
  area.x = Math.max(0, Math.min(750 - area.width, dragState.origX + (e.clientX - dragState.startX) * scaleX))
  area.y = Math.max(0, Math.min(1334 - area.height, dragState.origY + (e.clientY - dragState.startY) * scaleY))
}

function onDragEnd() {
  dragState = null
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
  // 确认发生实际拖拽后才入栈
  endInteraction()
}

// ============ Resize（缩放）逻辑 ============
type ResizeDir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
let resizeState: {
  idx: number
  dir: ResizeDir
  startX: number
  startY: number
  origX: number
  origY: number
  origW: number
  origH: number
} | null = null

function startResize(e: MouseEvent, idx: number, dir: ResizeDir) {
  e.preventDefault()
  e.stopPropagation()
  selectedAreaIdx.value = idx
  // 记录初始状态（延迟入栈），mouseup 时确认发生实际缩放才入栈
  beginInteraction()
  const area = form.editableAreas[idx]
  resizeState = {
    idx,
    dir,
    startX: e.clientX,
    startY: e.clientY,
    origX: area.x,
    origY: area.y,
    origW: area.width,
    origH: area.height,
  }
  window.addEventListener('mousemove', onResizeMove)
  window.addEventListener('mouseup', onResizeEnd)
}

function onResizeMove(e: MouseEvent) {
  if (!resizeState || !canvasWrapRef.value) return
  const rect = canvasWrapRef.value.getBoundingClientRect()
  const scaleX = 750 / rect.width
  const scaleY = 1334 / rect.height
  const area = form.editableAreas[resizeState.idx]
  const dx = (e.clientX - resizeState.startX) * scaleX
  const dy = (e.clientY - resizeState.startY) * scaleY
  const minW = 20
  const minH = 20

  let { origX, origY, origW, origH } = resizeState
  let newW = origW
  let newH = origH
  let newX = origX
  let newY = origY

  // 水平方向
  if (resizeState.dir.includes('e')) {
    newW = Math.max(minW, Math.min(750 - origX, origW + dx))
  } else if (resizeState.dir.includes('w')) {
    newW = Math.max(minW, origW - dx)
    newX = origX + (origW - newW)
    if (newX < 0) { newW = origW + origX; newX = 0 }
  }

  // 垂直方向
  if (resizeState.dir.includes('s')) {
    newH = Math.max(minH, Math.min(1334 - origY, origH + dy))
  } else if (resizeState.dir.includes('n')) {
    newH = Math.max(minH, origH - dy)
    newY = origY + (origH - newH)
    if (newY < 0) { newH = origH + origY; newY = 0 }
  }

  area.width = Math.round(newW)
  area.height = Math.round(newH)
  area.x = Math.round(newX)
  area.y = Math.round(newY)
}

function onResizeEnd() {
  resizeState = null
  window.removeEventListener('mousemove', onResizeMove)
  window.removeEventListener('mouseup', onResizeEnd)
  // 确认发生实际缩放后才入栈
  endInteraction()
}

// 组件卸载时清理拖拽监听器，避免拖拽过程中卸载导致监听器残留
onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
  window.removeEventListener('mousemove', onResizeMove)
  window.removeEventListener('mouseup', onResizeEnd)
})

// ============ 初始化 ============
onMounted(async () => {
  await initApi()
  await fetchTemplates()
  await fetchStats()
})
</script>

<style scoped>
.poster-manager {
  height: 100%;
  overflow-y: auto;
  background: #eef1f6;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

/* 顶部操作栏 */
.pm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  flex-wrap: wrap;
  gap: 12px;
}

.pm-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a2e;
}

.pm-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pm-search {
  padding: 8px 14px;
  border: 1px solid #e0e4ea;
  border-radius: 8px;
  font-size: 13px;
  width: 200px;
  outline: none;
  transition: border-color 0.15s;
}
.pm-search:focus { border-color: #1976d2; }

.pm-filter-select {
  padding: 8px 14px;
  border: 1px solid #e0e4ea;
  border-radius: 8px;
  font-size: 13px;
  background: #fff;
  cursor: pointer;
  outline: none;
}

/* 统计卡片 */
.pm-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  padding: 20px 24px;
}

.pm-stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.pm-stat-icon { font-size: 32px; line-height: 1; }
.pm-stat-value { font-size: 24px; font-weight: 700; color: #1a1a2e; }
.pm-stat-label { font-size: 12px; color: #999; margin-top: 2px; }

/* 模板网格 */
.pm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  padding: 0 24px 24px;
}

.pm-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  transition: box-shadow 0.2s, transform 0.2s;
}
.pm-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.12); transform: translateY(-2px); }

.pm-card-cover {
  position: relative;
  height: 240px;
  background: #f5f6fa;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pm-cover-img { width: 100%; height: 100%; object-fit: cover; }
.pm-cover-placeholder { font-size: 48px; color: #ccc; }

.pm-card-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  background: #e8f5e9;
  color: #2e7d32;
}
.pm-card-badge.vip { background: linear-gradient(135deg, #ffd54f, #ffb300); color: #5d4037; }
.pm-card-badge.inactive { top: 8px; left: 8px; right: auto; background: #ffebee; color: #c62828; }

.pm-card-body { padding: 12px 14px; }
.pm-card-name { font-size: 14px; font-weight: 600; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pm-card-cat { font-size: 11px; color: #999; margin-top: 2px; margin-bottom: 8px; }
.pm-card-actions { display: flex; gap: 6px; }

/* 按钮 */
.pm-btn {
  padding: 8px 16px;
  border: 1px solid #e0e4ea;
  border-radius: 8px;
  font-size: 13px;
  background: #fff;
  color: #333;
  cursor: pointer;
  transition: all 0.15s;
}
.pm-btn:hover { background: #f0f2f5; }
.pm-btn.primary { background: #1976d2; border-color: #1565c0; color: #fff; }
.pm-btn.primary:hover { background: #1565c0; }
.pm-btn.primary:disabled { opacity: 0.5; cursor: not-allowed; }
.pm-btn.sm { padding: 5px 10px; font-size: 12px; }
.pm-btn.danger { color: #c62828; border-color: #ffcdd2; }
.pm-btn.danger:hover { background: #ffebee; }

/* 空状态 */
.pm-empty { padding: 60px 24px; text-align: center; color: #999; font-size: 14px; }

/* 模板列表排序栏 */
.pm-sort-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  flex-wrap: wrap;
}
.pm-sort-label { font-size: 13px; color: #666; font-weight: 600; }
.pm-sort-count { font-size: 12px; color: #999; margin-left: auto; }

/* ============ 弹窗 ============ */
.pm-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 10000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 40px 20px;
  overflow-y: auto;
}

.pm-modal {
  background: #fff;
  border-radius: 14px;
  width: 100%;
  max-width: 720px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 80px);
}

.pm-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}
.pm-modal-title { font-size: 16px; font-weight: 700; color: #1a1a2e; }

.pm-close-btn {
  width: 32px; height: 32px;
  border: none; background: transparent;
  font-size: 22px; color: #999;
  cursor: pointer; border-radius: 6px;
  transition: background 0.15s;
}
.pm-close-btn:hover { background: #f0f0f0; color: #333; }

.pm-modal-body { flex: 1; overflow-y: auto; padding: 24px; }
.pm-modal-footer {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 16px 24px; border-top: 1px solid #eee; flex-shrink: 0;
}

/* 表单 */
.pm-form-section { margin-bottom: 24px; }
.pm-form-section + .pm-form-section { padding-top: 20px; border-top: 1px solid #f0f0f0; }
.pm-form-row { margin-bottom: 14px; display: flex; flex-direction: column; gap: 6px; }
.pm-form-row.two-col { flex-direction: row; gap: 12px; }
.pm-form-row.two-col > div { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.pm-form-row label { font-size: 12px; font-weight: 600; color: #666; }

.pm-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e0e4ea;
  border-radius: 8px;
  font-size: 13px;
  background: #fff;
  outline: none;
  transition: border-color 0.15s;
}
.pm-input:focus { border-color: #1976d2; }
.pm-color-input { height: 36px; padding: 2px; cursor: pointer; }

/* 开关 */
.pm-toggle-label {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; cursor: pointer; font-size: 13px; font-weight: 600; color: #333;
}
.pm-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
.pm-switch input { opacity: 0; width: 0; height: 0; }
.pm-slider {
  position: absolute; inset: 0;
  background: #ccc; border-radius: 24px;
  transition: 0.3s;
}
.pm-slider::before {
  content: ''; position: absolute;
  height: 18px; width: 18px; left: 3px; bottom: 3px;
  background: #fff; border-radius: 50%; transition: 0.3s;
}
.pm-switch input:checked + .pm-slider { background: #1976d2; }
.pm-switch input:checked + .pm-slider::before { transform: translateX(20px); }

/* 区域编辑器 */
.pm-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
.pm-section-title { font-size: 14px; font-weight: 700; color: #333; }
.pm-area-add-btns { display: flex; gap: 6px; }

.pm-canvas-wrap { display: flex; justify-content: center; margin-bottom: 16px; }

/* 画布工具栏（撤销/重做 + 缩放） */
.pm-canvas-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.pm-toolbar-group { display: flex; align-items: center; gap: 6px; }
.pm-zoom-label {
  font-size: 12px;
  color: #666;
  min-width: 42px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

/* 画布滚动容器（缩放时预留高度，避免遮挡下方属性面板） */
.pm-canvas-scroll {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
  overflow: auto;
}
.pm-canvas {
  position: relative;
  width: 300px; height: 533px;
  background: #f5f6fa;
  border: 2px dashed #d0d0d0;
  border-radius: 10px;
  overflow: hidden;
  user-select: none;
  flex-shrink: 0;
}
.pm-canvas-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; pointer-events: none; }

.pm-area {
  position: absolute;
  border: 2px solid #1976d2;
  border-radius: 4px;
  background: rgba(25, 118, 210, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: move;
  overflow: hidden;
  gap: 4px;
  padding: 2px 4px;
}
.pm-area.selected { border-color: #e84a6e; background: rgba(232, 74, 110, 0.12); box-shadow: 0 0 0 2px rgba(232, 74, 110, 0.3); }
.pm-area.image { border-color: #4caf50; background: rgba(76, 175, 80, 0.1); }
.pm-area.selected.image { border-color: #e84a6e; background: rgba(232, 74, 110, 0.12); }
.pm-area-label { font-size: 11px; font-weight: 700; color: #1976d2; flex-shrink: 0; }
.pm-area.selected .pm-area-label { color: #e84a6e; }
.pm-area-content {
  font-size: 11px; color: #333; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; max-width: calc(100% - 30px);
}

.pm-area-del {
  position: absolute; top: 1px; right: 1px;
  width: 18px; height: 18px;
  border: none; background: rgba(232, 74, 110, 0.8);
  color: #fff; font-size: 12px; line-height: 1;
  border-radius: 50%; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.15s;
}
.pm-area:hover .pm-area-del, .pm-area.selected .pm-area-del { opacity: 1; }

/* resize 手柄 */
.pm-rz-hdl {
  position: absolute;
  width: 10px; height: 10px;
  background: #fff;
  border: 2px solid #e84a6e;
  border-radius: 50%;
  z-index: 10;
}
.pm-rz-hdl.nw { top: -5px; left: -5px; cursor: nwse-resize; }
.pm-rz-hdl.n  { top: -5px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
.pm-rz-hdl.ne { top: -5px; right: -5px; cursor: nesw-resize; }
.pm-rz-hdl.e  { top: 50%; right: -5px; transform: translateY(-50%); cursor: ew-resize; }
.pm-rz-hdl.se { bottom: -5px; right: -5px; cursor: nwse-resize; }
.pm-rz-hdl.s  { bottom: -5px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
.pm-rz-hdl.sw { bottom: -5px; left: -5px; cursor: nesw-resize; }
.pm-rz-hdl.w  { top: 50%; left: -5px; transform: translateY(-50%); cursor: ew-resize; }

.pm-area-props { background: #f8f9fb; border: 1px solid #e8eaed; border-radius: 10px; padding: 16px; }
.pm-area-hint { text-align: center; padding: 20px; color: #999; font-size: 13px; background: #f8f9fb; border-radius: 10px; }

/* 区域操作栏（复制 / 上移 / 下移） */
.pm-area-action-bar { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
.pm-area-action-bar .pm-btn.sm { flex: 1; min-width: 80px; }

/* 画布文字直接编辑 input 覆盖层 */
.pm-area-edit-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: none;
  background: rgba(255, 255, 255, 0.95);
  font-size: inherit;
  color: #333;
  text-align: center;
  outline: 2px solid #e84a6e;
  border-radius: 2px;
  padding: 2px 4px;
  z-index: 5;
}

/* 图片区域默认图片预览 */
.pm-area-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  border-radius: 2px;
}
</style>
