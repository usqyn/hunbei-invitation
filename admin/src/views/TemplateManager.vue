<template>
  <div class="tm-manager">
    <!-- ============ 顶部操作栏 ============ -->
    <div class="tm-header">
      <h2 class="tm-title">模板管理</h2>
      <div class="tm-header-actions">
        <input v-model="searchQuery" class="tm-search" placeholder="搜索模板名称…" />
        <select v-model="filterCategory" class="tm-filter-select">
          <option value="">全部分类</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
        <select v-model="filterTier" class="tm-filter-select">
          <option value="">全部档位</option>
          <option value="free">免费</option>
          <option value="limited">限免版</option>
          <option value="personal">VIP版</option>
          <option value="svip">SVIP版</option>
          <option value="pro">专业版</option>
        </select>
        <select v-model="filterSync" class="tm-filter-select">
          <option value="all">全部同步状态</option>
          <option value="synced">已同步</option>
          <option value="unsynced">未同步</option>
        </select>
        <button class="tm-btn primary" @click="createNew" title="清空画布并新建空白模板">+ 新建空白模板</button>
        <button class="tm-btn" @click="onCheckSync" :disabled="isCheckingSync" title="批量检查云端同步状态">
          {{ isCheckingSync ? '⏳ 检查中...' : '🔍 检查状态' }}
        </button>
        <button class="tm-btn" @click="onResyncAll" :disabled="isResyncingAll || stats.unsyncedCount === 0" title="批量重新同步未同步的模板">
          {{ isResyncingAll ? '⏳ 同步中...' : `🔄 同步全部${stats.unsyncedCount ? `（${stats.unsyncedCount}）` : ''}` }}
        </button>
        <button class="tm-btn" @click="onPull" :disabled="isPulling" title="从云端拉取模板到本地">
          {{ isPulling ? '⏳ 拉取中...' : '⬇️ 从云端拉取' }}
        </button>
      </div>
    </div>

    <!-- ============ 统计卡片 ============ -->
    <div class="tm-stats">
      <div class="tm-stat-card">
        <div class="tm-stat-icon">📊</div>
        <div class="tm-stat-body">
          <div class="tm-stat-value">{{ stats.totalTemplates }}</div>
          <div class="tm-stat-label">模板总数</div>
        </div>
      </div>
      <div class="tm-stat-card">
        <div class="tm-stat-icon">🏷️</div>
        <div class="tm-stat-body">
          <div class="tm-stat-value">{{ stats.categoryCount }}</div>
          <div class="tm-stat-label">分类数量</div>
        </div>
      </div>
      <div class="tm-stat-card">
        <div class="tm-stat-icon">🆓</div>
        <div class="tm-stat-body">
          <div class="tm-stat-value">{{ stats.freeCount }}</div>
          <div class="tm-stat-label">免费档（免费+限免）</div>
        </div>
      </div>
      <div class="tm-stat-card">
        <div class="tm-stat-icon">💰</div>
        <div class="tm-stat-body">
          <div class="tm-stat-value">{{ stats.paidCount }}</div>
          <div class="tm-stat-label">付费档（VIP/SVIP/专业）</div>
        </div>
      </div>
      <div class="tm-stat-card" :class="{ warn: stats.unsyncedCount > 0 }">
        <div class="tm-stat-icon">☁️</div>
        <div class="tm-stat-body">
          <div class="tm-stat-value">{{ stats.unsyncedCount }}</div>
          <div class="tm-stat-label">未同步云端</div>
        </div>
      </div>
    </div>

    <!-- ============ 排序栏 ============ -->
    <div class="tm-sort-bar">
      <span class="tm-sort-label">排序：</span>
      <select v-model="sortBy" class="tm-filter-select">
        <option value="updated">按修改时间</option>
        <option value="created">按创建时间</option>
        <option value="name">按名称</option>
      </select>
      <button class="tm-btn sm" @click="toggleSortOrder" :title="sortOrder === 'asc' ? '当前升序，点击切换为降序' : '当前降序，点击切换为升序'">
        {{ sortOrder === 'asc' ? '↑ 升序' : '↓ 降序' }}
      </button>
      <span class="tm-sort-count">共 {{ filteredTemplates.length }} 个模板</span>
    </div>

    <!-- ============ 模板网格 ============ -->
    <div v-if="loading" class="tm-empty">加载中...</div>
    <div v-else-if="filteredTemplates.length === 0" class="tm-empty">
      {{ searchQuery || filterCategory || filterTier || filterSync !== 'all' ? '没有匹配的模板' : '暂无模板，点击「新建空白模板」创建' }}
    </div>
    <div v-else class="tm-grid">
      <div v-for="tpl in filteredTemplates" :key="tpl.id" class="tm-card" :class="{ active: tpl.cloud_synced !== 1 }">
        <div class="tm-card-cover" @click="openTemplate(tpl)">
          <img v-if="tpl.cover" :src="resolveUrl(tpl.cover)" class="tm-cover-img" alt="cover" />
          <div v-else class="tm-cover-placeholder">📄</div>
          <span v-if="tpl.cloud_synced !== 1" class="tm-card-badge unsynced" title="未同步到微信云">⚠️ 未同步</span>
          <span class="tm-card-badge" :class="'tier-' + tpl.vipLevel">{{ tierMeta(tpl.vipLevel).label }}</span>
        </div>
        <div class="tm-card-body">
          <div class="tm-card-name" :title="tpl.name">{{ tpl.name }}</div>
          <div class="tm-card-cat">
            <span>{{ getCategoryName(tpl.category) }}</span>
            <span class="tm-card-likes">❤️ {{ tpl.likes || 0 }}</span>
          </div>
          <div class="tm-card-actions">
            <button class="tm-btn sm primary" @click="openTemplate(tpl)" title="切回编辑器并加载此模板">✎ 打开编辑</button>
            <select class="tm-tier-select" :value="tpl.vipLevel || 'free'" @change="onChangeTier(tpl, $event)" title="切换档位">
              <option value="free">免费</option>
              <option value="limited">限免版</option>
              <option value="personal">VIP版</option>
              <option value="svip">SVIP版</option>
              <option value="pro">专业版</option>
            </select>
            <button v-if="tpl.cloud_synced !== 1" class="tm-btn sm" @click="onResync(tpl)" title="重新同步到云">🔄</button>
            <button class="tm-btn sm" @click="onClone(tpl)" title="克隆（复制此模板创建新模板）">📋</button>
            <button class="tm-btn sm danger" @click="onSafeDelete(tpl)" title="安全删除（先删云端再删本地）">🗑</button>
            <button class="tm-btn sm danger" @click="onHardDelete(tpl)" title="彻底删除（云端+本地物理删除，不可恢复）">⛔</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 全局 Toast 通知 -->
    <Teleport to="body">
      <transition name="toast-fade">
        <div v-if="toast.visible" class="tm-toast" :class="toast.type">
          <span class="tm-toast-icon">{{ toast.type === 'success' ? '✅' : '❌' }}</span>
          <span class="tm-toast-text">{{ toast.message }}</span>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import {
  API_BASE,
  initApi,
  fetchTemplates,
  fetchTemplate,
  createTemplate,
  updateTemplate,
  resyncTemplate,
  resyncAllTemplates,
  safeDeleteTemplate,
  hardDeleteTemplate,
  batchCheckCloudSync,
  pullTemplatesFromCloud,
} from '../composables/useApi'
import { CATEGORIES } from '../types/template'
import { getCategoryName } from '../utils/common'

// ============ 事件 ============
const emit = defineEmits<{
  (e: 'load-template', id: string): void
  (e: 'create-new'): void
}>()

// ============ 类型 ============
interface TmTemplate {
  id: string
  name: string
  category: string
  cover: string
  vipLevel: 'free' | 'limited' | 'personal' | 'svip' | 'pro'
  cloud_synced: number
  status: string
  likes: number
  createdAt: string
  updatedAt: string
}

const TIER_META: Record<string, { label: string }> = {
  free: { label: '免费' },
  limited: { label: '限免版' },
  personal: { label: 'VIP版' },
  svip: { label: 'SVIP版' },
  pro: { label: '专业版' },
}

const tierMeta = (level?: string) => TIER_META[level || 'free'] || TIER_META.free

// ============ 状态 ============
const categories = CATEGORIES
const loading = ref(false)
const templates = ref<TmTemplate[]>([])
const searchQuery = ref('')
const filterCategory = ref('')
const filterTier = ref('')
const filterSync = ref<'all' | 'synced' | 'unsynced'>('all')
const sortBy = ref<'created' | 'updated' | 'name'>('updated')
const sortOrder = ref<'asc' | 'desc'>('desc')
const isCheckingSync = ref(false)
const isResyncingAll = ref(false)
const isPulling = ref(false)

const stats = reactive({
  totalTemplates: 0,
  categoryCount: 0,
  freeCount: 0,
  paidCount: 0,
  unsyncedCount: 0,
})

// ============ 过滤 + 排序 ============
const filteredTemplates = computed(() => {
  let list = templates.value
  if (filterCategory.value) list = list.filter(t => t.category === filterCategory.value)
  if (filterTier.value) list = list.filter(t => (t.vipLevel || 'free') === filterTier.value)
  if (filterSync.value === 'synced') list = list.filter(t => t.cloud_synced === 1)
  if (filterSync.value === 'unsynced') list = list.filter(t => t.cloud_synced !== 1)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(t => t.name.toLowerCase().includes(q))
  }
  const dir = sortOrder.value === 'asc' ? 1 : -1
  return [...list].sort((a, b) => {
    if (sortBy.value === 'name') {
      return (a.name || '').localeCompare(b.name || '', 'zh') * dir
    }
    const ta = new Date((sortBy.value === 'updated' ? a.updatedAt : a.createdAt) || 0).getTime()
    const tb = new Date((sortBy.value === 'updated' ? b.updatedAt : b.createdAt) || 0).getTime()
    return (ta - tb) * dir
  })
})

function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
}

// ============ 统计 ============
function computeStats() {
  const list = templates.value
  const cats = new Set(list.map(t => t.category).filter(Boolean))
  stats.totalTemplates = list.length
  stats.categoryCount = cats.size
  stats.freeCount = list.filter(t => (t.vipLevel || 'free') === 'free' || (t.vipLevel || 'free') === 'limited').length
  stats.paidCount = list.filter(t => ['personal', 'svip', 'pro'].includes(t.vipLevel || '')).length
  stats.unsyncedCount = list.filter(t => t.cloud_synced !== 1).length
}

// ============ 工具 ============
function resolveUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url
  return API_BASE + url
}

function normalizeTemplate(raw: any): TmTemplate {
  return {
    id: raw.id || raw._id,
    name: raw.name || '',
    category: raw.category || raw.category_id || '',
    cover: raw.cover || raw.cover_url || '',
    vipLevel: (raw.vipLevel || 'free') as TmTemplate['vipLevel'],
    cloud_synced: raw.cloud_synced === 1 || raw.cloud_synced === true ? 1 : 0,
    status: raw.status || 'draft',
    likes: raw.likes || 0,
    createdAt: raw.createdAt || raw.created_at || '',
    updatedAt: raw.updatedAt || raw.updated_at || '',
  }
}

// ============ Toast ============
const toast = reactive({ visible: false, message: '', type: 'success' as 'success' | 'error' })
let toastTimer: ReturnType<typeof setTimeout> | null = null
function showToast(message: string, type: 'success' | 'error' = 'success') {
  if (toastTimer) clearTimeout(toastTimer)
  toast.message = message
  toast.type = type
  toast.visible = true
  toastTimer = setTimeout(() => { toast.visible = false }, 2500)
}

// ============ 数据加载 ============
async function loadTemplates() {
  loading.value = true
  try {
    const list = await fetchTemplates()
    templates.value = list.filter((t: any) => t.status !== 'deleted').map(normalizeTemplate)
    computeStats()
  } catch (e: any) {
    console.error('loadTemplates error:', e)
    templates.value = []
    showToast('加载模板失败：' + (e?.message || '未知错误'), 'error')
  } finally {
    loading.value = false
  }
}

// ============ 操作 ============
function openTemplate(tpl: TmTemplate) {
  emit('load-template', tpl.id)
}

function createNew() {
  emit('create-new')
}

async function onChangeTier(tpl: TmTemplate, e: Event) {
  const target = e.target as HTMLSelectElement
  const vipLevel = target.value as TmTemplate['vipLevel']
  try {
    await updateTemplate(tpl.id, { vipLevel })
    tpl.vipLevel = vipLevel
    showToast(`「${tpl.name}」已切换为 ${tierMeta(vipLevel).label}`)
  } catch (err: any) {
    console.error('更新档位失败:', err)
    showToast('更新失败：' + (err?.message || err), 'error')
    target.value = tpl.vipLevel || 'free'
  }
}

async function onResync(tpl: TmTemplate) {
  try {
    await resyncTemplate(tpl.id)
    tpl.cloud_synced = 1
    computeStats()
    showToast(`「${tpl.name}」已同步到云端`)
  } catch (err: any) {
    showToast('同步失败：' + (err?.message || err), 'error')
  }
}

async function onResyncAll() {
  isResyncingAll.value = true
  try {
    const res = await resyncAllTemplates()
    showToast(`✅ 同步完成：${res.synced} 个模板已同步`)
    await loadTemplates()
  } catch (err: any) {
    showToast('批量同步失败：' + (err?.message || err), 'error')
  } finally {
    isResyncingAll.value = false
  }
}

async function onCheckSync() {
  isCheckingSync.value = true
  try {
    const res = await batchCheckCloudSync()
    showToast(`检查完成：${res.synced} 已同步 / ${res.unsynced} 未同步`)
    await loadTemplates()
  } catch (err: any) {
    showToast('检查失败：' + (err?.message || err), 'error')
  } finally {
    isCheckingSync.value = false
  }
}

async function onPull() {
  isPulling.value = true
  try {
    const res = await pullTemplatesFromCloud()
    const parts: string[] = []
    if (res.inserted > 0) parts.push(`新增 ${res.inserted}`)
    if (res.updated > 0) parts.push(`更新 ${res.updated}`)
    if (res.skipped > 0) parts.push(`跳过 ${res.skipped}`)
    showToast(`✅ 拉取完成：${parts.join('，') || '云端无变化'}`)
    await loadTemplates()
  } catch (err: any) {
    showToast('拉取失败：' + (err?.message || err), 'error')
  } finally {
    isPulling.value = false
  }
}

async function onSafeDelete(tpl: TmTemplate) {
  const confirmed = confirm(
    `确定要安全删除模板「${tpl.name}」吗？\n\n⚠️ 此操作将：\n1. 先删除云端数据\n2. 云端删除成功后，再删除本地数据\n\n此操作不可恢复！`
  )
  if (!confirmed) return
  try {
    const res = await safeDeleteTemplate(tpl.id)
    templates.value = templates.value.filter(t => t.id !== tpl.id)
    computeStats()
    if (res.cloudDeleted) {
      showToast(`已删除「${tpl.name}」（云端+本地）`)
    } else {
      showToast(`已删除本地「${tpl.name}」，云端删除失败：${res.message}`, 'error')
    }
  } catch (err: any) {
    showToast('删除失败：' + (err?.message || err), 'error')
  }
}

async function onHardDelete(tpl: TmTemplate) {
  const confirmed = confirm(
    `确定要彻底删除模板「${tpl.name}」吗？\n\n⚠️ 此操作将：\n1. 删除云端数据\n2. 本地记录物理删除\n\n彻底删除后无法恢复，请谨慎操作！`
  )
  if (!confirmed) return
  try {
    const res = await hardDeleteTemplate(tpl.id)
    templates.value = templates.value.filter(t => t.id !== tpl.id)
    computeStats()
    if (res.cloudDeleted) {
      showToast(`已彻底删除「${tpl.name}」（云端+本地）`)
    } else {
      showToast(`已物理删除本地「${tpl.name}」，云端删除失败：${res.message}`, 'error')
    }
  } catch (err: any) {
    showToast('删除失败：' + (err?.message || err), 'error')
  }
}

async function onClone(tpl: TmTemplate) {
  if (!confirm(`确定克隆模板「${tpl.name}」？将创建一个副本。`)) return
  try {
    const src = await fetchTemplate(tpl.id)
    await createTemplate({
      ...(src as any),
      id: undefined,
      name: `${tpl.name}_副本`,
      category: tpl.category,
      cover: tpl.cover,
      vipLevel: tpl.vipLevel,
    } as any)
    showToast(`已克隆「${tpl.name}_副本」`)
    await loadTemplates()
  } catch (err: any) {
    showToast('克隆失败：' + (err?.message || err), 'error')
  }
}

// ============ 初始化 ============
onMounted(async () => {
  await initApi()
  await loadTemplates()
})
</script>

<style scoped>
.tm-manager {
  height: 100%;
  overflow-y: auto;
  background: #f5f6fa;
}

/* ============ 顶部操作栏 ============ */
.tm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  flex-wrap: wrap;
  gap: 12px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.tm-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a2e;
}

.tm-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.tm-search {
  padding: 8px 14px;
  border: 1px solid #e0e4ea;
  border-radius: 8px;
  font-size: 13px;
  width: 200px;
  outline: none;
  transition: border-color 0.15s;
}
.tm-search:focus { border-color: #1976d2; }

.tm-filter-select {
  padding: 8px 14px;
  border: 1px solid #e0e4ea;
  border-radius: 8px;
  font-size: 13px;
  background: #fff;
  cursor: pointer;
  outline: none;
}

/* ============ 统计卡片 ============ */
.tm-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  padding: 20px 24px;
}

.tm-stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.tm-stat-card.warn { background: #fff8f0; border: 1px solid #ffe0b2; }

.tm-stat-icon { font-size: 32px; line-height: 1; }
.tm-stat-value { font-size: 24px; font-weight: 700; color: #1a1a2e; }
.tm-stat-card.warn .tm-stat-value { color: #e65100; }
.tm-stat-label { font-size: 12px; color: #999; margin-top: 2px; }

/* ============ 排序栏 ============ */
.tm-sort-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  flex-wrap: wrap;
}
.tm-sort-label { font-size: 13px; color: #666; font-weight: 600; }
.tm-sort-count { font-size: 12px; color: #999; margin-left: auto; }

/* ============ 模板网格 ============ */
.tm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  padding: 0 24px 24px;
}

.tm-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  transition: box-shadow 0.2s, transform 0.2s;
}
.tm-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.12); transform: translateY(-2px); }
.tm-card.active { box-shadow: 0 0 0 2px #ffb300; }

.tm-card-cover {
  position: relative;
  height: 280px;
  background: #f5f6fa;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tm-cover-img { width: 100%; height: 100%; object-fit: cover; }
.tm-cover-placeholder { font-size: 48px; color: #ccc; }

.tm-card-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
}
.tm-card-badge.tier-free { background: #e8f5e9; color: #2e7d32; }
.tm-card-badge.tier-limited { background: #e0f2f1; color: #00695c; }
.tm-card-badge.tier-personal { background: #fff3e0; color: #e65100; }
.tm-card-badge.tier-svip { background: #ede7f6; color: #4527a0; }
.tm-card-badge.tier-pro { background: #f3e5f5; color: #6a1b9a; }
.tm-card-badge.unsynced {
  top: 8px;
  left: 8px;
  right: auto;
  background: #fff3e0;
  color: #e65100;
}

.tm-card-body { padding: 12px 14px; }
.tm-card-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tm-card-cat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: #999;
  margin-top: 2px;
  margin-bottom: 8px;
}
.tm-card-likes { font-size: 11px; color: #e57373; }

.tm-card-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.tm-tier-select {
  padding: 5px 6px;
  border: 1px solid #e0e4ea;
  border-radius: 6px;
  font-size: 12px;
  background: #fff;
  cursor: pointer;
  outline: none;
}

/* ============ 按钮 ============ */
.tm-btn {
  padding: 8px 16px;
  border: 1px solid #e0e4ea;
  border-radius: 8px;
  font-size: 13px;
  background: #fff;
  color: #333;
  cursor: pointer;
  transition: all 0.15s;
}
.tm-btn:hover { background: #f0f2f5; }
.tm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.tm-btn.primary { background: #1976d2; border-color: #1565c0; color: #fff; }
.tm-btn.primary:hover { background: #1565c0; }
.tm-btn.sm { padding: 5px 10px; font-size: 12px; }
.tm-btn.danger { color: #c62828; border-color: #ffcdd2; }
.tm-btn.danger:hover { background: #ffebee; }

/* ============ 空状态 ============ */
.tm-empty { padding: 60px 24px; text-align: center; color: #999; font-size: 14px; }

/* ============ Toast ============ */
.tm-toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 8px 30px rgba(0,0,0,0.2);
  z-index: 10000;
  font-size: 13px;
  color: #333;
  max-width: 80vw;
}
.tm-toast.error { border-left: 4px solid #e53935; }
.tm-toast.success { border-left: 4px solid #43a047; }
.tm-toast-icon { flex-shrink: 0; }
.tm-toast-text { white-space: pre-line; }

.toast-fade-enter-active, .toast-fade-leave-active { transition: opacity 0.25s, transform 0.25s; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(-10px); }
</style>
