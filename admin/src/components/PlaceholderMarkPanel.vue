<template>
  <div class="ph-panel">
    <div class="ph-header">
      <div class="ph-tabs">
        <button
          class="ph-tab"
          :class="{ active: activeTab === 'cn' }"
          @click="activeTab = 'cn'"
        >中文</button>
        <button
          class="ph-tab"
          :class="{ active: activeTab === 'kz' }"
          @click="activeTab = 'kz'"
        >哈语</button>
      </div>
      <input
        class="ph-search"
        v-model="searchQuery"
        placeholder="搜索占位符…"
      />
    </div>
    <div class="ph-hint">选中文字后点击按钮插入 token，无选区则在光标处插入</div>
    <div class="ph-btns">
      <button
        v-for="d in filteredDefs"
        :key="d.key"
        class="ph-btn"
        :class="{ kz: d.group === 'kz' }"
        :title="`{${d.key}}`"
        @click="mark(d.key)"
      >{{ d.label }}</button>
      <div v-if="filteredDefs.length === 0" class="ph-empty">无匹配占位符</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { PLACEHOLDER_DEFS } from '../constants/placeholder-defs'

const props = defineProps<{
  content: string
  defaults?: Record<string, string>
}>()

const emit = defineEmits<{
  update: [patch: { content: string; defaults: Record<string, string> }]
}>()

const activeTab = ref<'cn' | 'kz'>('cn')
const searchQuery = ref('')

const filteredDefs = computed(() => {
  const list = PLACEHOLDER_DEFS.filter(d => d.group === activeTab.value)
  if (!searchQuery.value.trim()) return list
  const q = searchQuery.value.trim().toLowerCase()
  return list.filter(d =>
    d.label.toLowerCase().includes(q) ||
    d.key.toLowerCase().includes(q)
  )
})

// 与小程序端 kz-date.ts 的 7 个星期词对齐（识别哈语星期/星期(括号)用）
const KZ_WEEKDAY_RE = /^(جەكسەنبى|دۇيسەنبى|سەيسەنبى|سارسەنبى|بەيسەنبى|جۇما|سەنبى)$/
const KZ_WEEKDAY_PAREN_RE = /^\(?(جەكسەنبى|دۇيسەنبى|سەيسەنبى|سارسەنبى|بەيسەنبى|جۇما|سەنبى)\)?$/
// 与小程序端 kz-date.ts 的 5 个时间段词对齐
const KZ_TIME_PERIOD_RE = /^(تاڭە|تۇستە|تۇستەن كەيىن|كەشتە|تۇندە)$/
// 哈语日期：支持 "2026 جىلعى 1 ايدىڭ 22 كۇنى" 与 "2026-جىلى 10-ايدىڭ 01-كۇنى"
const KZ_DATE_RE = /(\d{4})[- ](جىلعى|جىلى)[- ](\d{1,2})([- ]ايدىڭ[- ])(\d{1,2})([- ]كۇنى)/
const CN_DATE_RE = /(\d{4})[年\-/.]([01]?\d)[月\-/.]([012]?\d|3[01])/
const TIME_RE = /([01]?\d|2[0-3]):([0-5]\d)/
const PHONE_RE = /1\d{10}/
const YEAR_RE = /(?:19|20)\d{2}/

/** 解析选区原文，回填 defaults（保证标记后画布预览与原文一致） */
function buildDefaults(key: string, selected: string): Record<string, string> {
  const d: Record<string, string> = {}
  const s = selected.trim()
  if (key === 'kzDate') {
    const m = s.match(KZ_DATE_RE)
    if (m) {
      d.year = m[1]
      d.month = String(Number(m[3]))
      d.day = String(Number(m[5]))
      d.kzDate = s
    }
  } else if (key === 'date') {
    const m = s.match(CN_DATE_RE)
    if (m) {
      d.year = m[1]
      d.month = String(Number(m[2]))
      d.day = String(Number(m[3]))
      d.date = `${m[1]}-${String(Number(m[2])).padStart(2, '0')}-${String(Number(m[3])).padStart(2, '0')}`
    }
  } else if (key === 'time') {
    const m = s.match(TIME_RE)
    if (m) d.time = `${m[1]}:${m[2]}`
  } else if (key === 'phone') {
    const m = s.match(PHONE_RE)
    if (m) d.phone = m[0]
  } else if (key === 'year') {
    const m = s.match(YEAR_RE)
    if (m) d.year = m[0]
  } else if (key === 'month') {
    const m = s.match(/^(0?[1-9]|1[0-2])$/)
    if (m) d.month = String(Number(m[1]))
  } else if (key === 'day') {
    const m = s.match(/^(0?[1-9]|[12]\d|3[01])$/)
    if (m) d.day = String(Number(m[1]))
  } else if (key === 'kzWeekdayParen' && KZ_WEEKDAY_PAREN_RE.test(s)) {
    d.kzWeekdayParen = s
  } else if (key === 'kzWeekday' && KZ_WEEKDAY_RE.test(s)) {
    d.kzWeekday = s
  } else if (key === 'kzTime' && KZ_TIME_PERIOD_RE.test(s)) {
    d.kzTime = s
  }
  return d
}

function mark(requestedKey: string) {
  const content = props.content ?? ''
  const ta = document.getElementById('text-content-editor') as HTMLTextAreaElement | null
  let start = ta?.selectionStart ?? content.length
  let end = ta?.selectionEnd ?? start
  if (end < start) { const t = start; start = end; end = t }
  const selected = content.slice(start, end)
  const token = `{${requestedKey}}`
  const newContent = content.slice(0, start) + token + content.slice(end)
  const defaults = { ...(props.defaults || {}) }
  if (selected) {
    const detected = buildDefaults(requestedKey, selected)
    Object.assign(defaults, detected)
  }
  emit('update', { content: newContent, defaults })
}
</script>

<style scoped>
.ph-panel {
  margin: 6px 0;
  padding: 8px;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  background: #f6f8fa;
}
.ph-header {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}
.ph-tabs {
  display: flex;
  gap: 0;
  flex-shrink: 0;
}
.ph-tab {
  padding: 3px 10px;
  font-size: 12px;
  border: 1px solid #d0d7de;
  background: #fff;
  color: #57606a;
  cursor: pointer;
}
.ph-tab:first-child { border-radius: 4px 0 0 4px; }
.ph-tab:last-child { border-radius: 0 4px 4px 0; border-left: none; }
.ph-tab.active {
  background: #1976d2;
  border-color: #1976d2;
  color: #fff;
}
.ph-search {
  flex: 1;
  min-width: 0;
  padding: 3px 8px;
  font-size: 12px;
  border: 1px solid #d0d7de;
  border-radius: 4px;
  outline: none;
  background: #fff;
}
.ph-search:focus { border-color: #1976d2; }
.ph-hint {
  font-size: 11px;
  color: #8b949e;
  margin-bottom: 6px;
  line-height: 1.4;
}
.ph-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.ph-btn {
  padding: 3px 8px;
  font-size: 12px;
  border: 1px solid #d0d7de;
  border-radius: 4px;
  background: #ffffff;
  color: #24292f;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.15s;
}
.ph-btn:hover {
  border-color: #1976d2;
  color: #1976d2;
}
.ph-btn.kz {
  font-family: 'KazakhSoftAsilya', serif;
}
.ph-empty {
  font-size: 12px;
  color: #8b949e;
  padding: 4px 0;
}
</style>
