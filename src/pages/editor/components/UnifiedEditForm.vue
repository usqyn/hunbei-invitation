<template>
  <view v-if="visible" class="popup-overlay" @click="$emit('close')">
    <view class="popup-content" @click.stop>
      <view class="popup-header">
        <view class="header-left" @click="$emit('close')">
          <text class="header-back">‹</text>
        </view>
        <text class="header-title">编辑信息</text>
        <view class="header-right" @click="onConfirm">
          <text class="header-confirm">完成</text>
        </view>
      </view>

      <scroll-view class="popup-scroll" scroll-y>
        <view class="form-container">
          <!-- 新人信息（仅当模板包含对应字段时显示） -->
          <view v-if="hasBasicInfoFields" class="form-section">
            <view class="section-title">
              <text class="title-icon">💑</text>
              <text class="title-text">新人信息</text>
            </view>

            <view v-if="hasField('groomName')" class="form-item">
              <view class="form-label">
                <text class="required">*</text>
                <text class="label-name">新郎姓名</text>
              </view>
              <view class="input-wrapper">
                <input
                  class="form-input"
                  :class="{ 'rtl-input': groomNameRtl.isRtl.value }"
                  placeholder="请输入新郎真实姓名"
                  :value="basicInfo.groomName"
                  @input="(e: any) => onInput('groomName', e.detail.value)"
                  maxlength="20"
                  placeholder-class="input-placeholder"
                />
                <text class="char-count">{{ (basicInfo.groomName || '').length }}/20</text>
              </view>
            </view>

            <view v-if="hasField('brideName')" class="form-item">
              <view class="form-label">
                <text class="required">*</text>
                <text class="label-name">新娘姓名</text>
              </view>
              <view class="input-wrapper">
                <input
                  class="form-input"
                  :class="{ 'rtl-input': brideNameRtl.isRtl.value }"
                  placeholder="请输入新娘真实姓名"
                  :value="basicInfo.brideName"
                  @input="(e: any) => onInput('brideName', e.detail.value)"
                  maxlength="20"
                  placeholder-class="input-placeholder"
                />
                <text class="char-count">{{ (basicInfo.brideName || '').length }}/20</text>
              </view>
            </view>
          </view>

          <!-- 婚礼信息（仅当模板包含对应字段时显示） -->
          <view v-if="hasWeddingInfoFields" class="form-section">
            <view class="section-title">
              <text class="title-icon">📅</text>
              <text class="title-text">婚礼信息</text>
            </view>

            <view v-if="hasField('date')" class="form-item">
              <view class="form-label">
                <text class="label-name">婚礼时间</text>
              </view>
              <picker mode="date" :value="basicInfo.weddingDate" @change="onDateChange">
                <view class="input-wrapper clickable">
                  <text v-if="basicInfo.weddingDate" class="form-value">{{ basicInfo.weddingDate }}</text>
                  <text v-else class="input-placeholder">选择婚礼时间</text>
                  <text class="input-arrow">›</text>
                </view>
              </picker>
            </view>

            <view v-if="hasField('location')" class="form-item" @click="$emit('location')">
              <view class="form-label">
                <text class="label-name">婚礼地点</text>
              </view>
              <view class="input-wrapper clickable">
                <text v-if="basicInfo.location" class="form-value">{{ basicInfo.location }}</text>
                <text v-else class="input-placeholder">搜索定位导航位置</text>
                <view class="location-btn">
                  <text class="location-icon">📍</text>
                  <text class="location-text">定位</text>
                </view>
              </view>
            </view>

            <view v-if="hasField('address')" class="form-item">
              <view class="form-label">
                <text class="label-name">详细地址</text>
              </view>
              <view class="input-wrapper">
                <input
                  class="form-input"
                  :class="{ 'rtl-input': addressRtl.isRtl.value }"
                  placeholder="例：幸福大酒店9F幸福宴会厅"
                  :value="basicInfo.detailAddress"
                  @input="(e: any) => onInput('address', e.detail.value)"
                  maxlength="100"
                  placeholder-class="input-placeholder"
                />
              </view>
            </view>
          </view>

          <!-- 哈萨克语日期（选日期转表达式 + 星期滚轮 + 时间段滚轮） -->
          <view v-if="hasKzDateFields" class="form-section kz-section">
            <view class="section-title">
              <text class="title-icon">📆</text>
              <text class="title-text">哈语日期</text>
              <text class="kz-badge">哈萨克文</text>
            </view>

            <!-- 日期选择器：选中文日期后自动转为哈语表达式 "2026 جىل 1 اي 22 كۇن" -->
            <view v-if="hasField('kzDate')" class="form-item">
              <view class="form-label">
                <text class="label-name">选择日期</text>
                <text class="label-hint">自动转为哈语</text>
              </view>
              <picker mode="date" :value="kzDateValue" @change="onKzDateChange">
                <view class="input-wrapper clickable">
                  <text v-if="kzDateValue" class="form-value">{{ kzDateValue }}</text>
                  <text v-else class="input-placeholder">选择日期自动转为哈语</text>
                  <text class="input-arrow">›</text>
                </view>
              </picker>
            </view>

            <!-- 星期滚动选择器：周一-周日，选后写入哈语星期名 -->
            <view v-if="hasField('kzWeekday')" class="form-item">
              <view class="form-label">
                <text class="label-name">选择星期</text>
                <text class="label-hint">滚动选择</text>
              </view>
              <picker
                mode="selector"
                :range="KZ_WEEKDAY_OPTIONS"
                range-key="label"
                :value="kzWeekdayIndex"
                @change="onKzWeekdayChange"
              >
                <view class="input-wrapper clickable">
                  <text class="form-value">{{ KZ_WEEKDAY_OPTIONS[kzWeekdayIndex].label }}</text>
                  <text v-if="kzPreview.weekday" class="kz-inline-value rtl-text">{{ kzPreview.weekday }}</text>
                  <text v-else class="input-placeholder">选择星期</text>
                  <text class="input-arrow">›</text>
                </view>
              </picker>
            </view>

            <!-- 星期(带括号)滚动选择器：选后写入带括号的哈语星期名 (سەيسەنبى) -->
            <view v-if="hasField('kzWeekdayParen')" class="form-item">
              <view class="form-label">
                <text class="label-name">选择星期(括号)</text>
                <text class="label-hint">滚动选择</text>
              </view>
              <picker
                mode="selector"
                :range="KZ_WEEKDAY_OPTIONS"
                range-key="label"
                :value="kzWeekdayParenIndex"
                @change="onKzWeekdayParenChange"
              >
                <view class="input-wrapper clickable">
                  <text class="form-value">{{ KZ_WEEKDAY_OPTIONS[kzWeekdayParenIndex].label }}</text>
                  <text v-if="kzPreview.weekdayParen" class="kz-inline-value rtl-text">{{ kzPreview.weekdayParen }}</text>
                  <text v-else class="input-placeholder">选择星期</text>
                  <text class="input-arrow">›</text>
                </view>
              </picker>
            </view>

            <!-- 时间段滚动选择器：上午/中午/下午/傍晚/晚上 -->
            <view v-if="hasField('kzTime')" class="form-item">
              <view class="form-label">
                <text class="label-name">选择时间段</text>
                <text class="label-hint">滚动选择</text>
              </view>
              <picker
                mode="selector"
                :range="KZ_TIME_OPTIONS"
                range-key="label"
                :value="kzTimeIndex"
                @change="onKzTimeChange"
              >
                <view class="input-wrapper clickable">
                  <text class="form-value">{{ KZ_TIME_OPTIONS[kzTimeIndex].label }}</text>
                  <text v-if="kzPreview.time" class="kz-inline-value rtl-text">{{ kzPreview.time }}</text>
                  <text v-else class="input-placeholder">选择时间段</text>
                  <text class="input-arrow">›</text>
                </view>
              </picker>
            </view>

            <!-- 哈语日期预览（实时展示写入占位符的内容） -->
            <view v-if="kzPreview.date || kzPreview.weekday || kzPreview.time" class="kz-preview">
              <view v-if="kzPreview.date && hasField('kzDate')" class="kz-preview-row kz-preview-row--full">
                <text class="kz-preview-label">日期</text>
                <text class="kz-preview-value rtl-text">{{ kzPreview.date }}</text>
              </view>
              <view v-if="kzPreview.weekday && hasField('kzWeekday')" class="kz-preview-row">
                <text class="kz-preview-label">星期</text>
                <text class="kz-preview-value rtl-text">{{ kzPreview.weekday }}</text>
              </view>
              <view v-if="kzPreview.weekdayParen && hasField('kzWeekdayParen')" class="kz-preview-row">
                <text class="kz-preview-label">星期(括号)</text>
                <text class="kz-preview-value rtl-text">{{ kzPreview.weekdayParen }}</text>
              </view>
              <view v-if="kzPreview.time && hasField('kzTime')" class="kz-preview-row">
                <text class="kz-preview-label">时间段</text>
                <text class="kz-preview-value rtl-text">{{ kzPreview.time }}</text>
              </view>
            </view>
          </view>

          <!-- 其他信息（动态字段） -->
          <view v-if="extraFields.length > 0" class="form-section">
            <view class="section-title">
              <text class="title-icon">📝</text>
              <text class="title-text">其他信息</text>
            </view>

            <view v-for="field in extraFields" :key="field.key" class="form-item">
              <view class="form-label">
                <text class="label-icon">{{ field.icon }}</text>
                <text class="label-name">{{ field.label }}</text>
              </view>
              <view class="input-wrapper">
                <input
                  class="form-input"
                  :class="{ 'rtl-input': isFieldRtl(field.value || '') }"
                  :placeholder="field.placeholder"
                  :value="field.value"
                  @input="(e: any) => onInput(field.key, e.detail.value)"
                  maxlength="100"
                  placeholder-class="input-placeholder"
                />
              </view>
            </view>
          </view>

          <!-- 无可编辑字段时的空状态提示 -->
          <view v-if="!hasBasicInfoFields && !hasWeddingInfoFields && !hasKzDateFields && extraFields.length === 0" class="empty-state">
            <text class="empty-icon">📋</text>
            <text class="empty-text">此模板暂无可编辑的信息字段</text>
            <text class="empty-sub">请在画布上直接点击文字或图片进行编辑</text>
          </view>

          <view class="tip-box">
            <text class="tip-icon">💡</text>
            <text class="tip-text">填写完整的信息可以让您的邀请函更加温馨动人</text>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import type { EditableElement, BasicInfo } from '@/types'
import { showToast } from '@/composables/useFeedback'
import { useRtl } from '@/composables/useRtl'
import { RTL_CHAR_REGEX } from '@/constants/editor'
import { toKazakhDate, getKzWeekdayOptions, getTimePeriodOptions } from '@/utils/kz-date'

const SMART_FIELD_META: Record<string, { label: string; icon: string; placeholder: string }> = {
  inviter: { label: '邀请者', icon: '👤', placeholder: '请输入邀请者姓名' },
  invitee: { label: '受邀者', icon: '👥', placeholder: '请输入受邀者姓名' },
  date: { label: '日期', icon: '📅', placeholder: '请选择日期' },
  time: { label: '时间', icon: '⏰', placeholder: '请填写时间' },
  location: { label: '地点', icon: '📍', placeholder: '请填写地点' },
  address: { label: '详细地址', icon: '🏠', placeholder: '请填写详细地址' },
  phone: { label: '联系电话', icon: '📞', placeholder: '请填写联系电话' },
  year: { label: '年份', icon: '📅', placeholder: '例如: 2025' },
  month: { label: '月份', icon: '📅', placeholder: '例如: 6' },
  day: { label: '日', icon: '📅', placeholder: '例如: 15' },
  // 哈萨克语阿拉伯文日期字段（admin 端发布对应 dataKey 占位符后由此识别）
  // kzDate：选日期后输出表达式 "2026 جىلعى 1 ايدىڭ 22 كۇنى"（从属格形式）
  kzDate: { label: '哈语日期', icon: '📆', placeholder: '2026 جىلعى 1 ايدىڭ 22 كۇنى' },
  // kzWeekday：星期滚轮选择，输出哈语星期名
  kzWeekday: { label: '哈语星期', icon: '📆', placeholder: 'سەيسەنبى' },
  // kzTime：时间段滚轮，输出哈语时间段
  kzTime: { label: '哈语时间段', icon: '⏰', placeholder: 'تۇستەن كەيىن' },
  // 哈语新人姓名/地址：文本输入，自动 RTL 渲染（出现在"其他信息"区）
  kzGroomName: { label: '哈语新郎名', icon: '👨', placeholder: 'نۇرلان' },
  kzBrideName: { label: '哈语新娘名', icon: '👩', placeholder: 'اينۇر' },
  kzAddress: { label: '哈语地址', icon: '🏠', placeholder: 'قىزىلوردا قالاسى, توي سارايى' },
}

// 基础字段 key（值从 basicInfo 读取，但仅在模板中存在对应 dataKey 时显示）
const BASIC_FIELD_KEYS = ['groomName', 'brideName', 'date', 'location', 'address']

// 日期占位符全局字段
const DATE_PLACEHOLDER_KEYS = ['year', 'month', 'day']

// 哈萨克语字段（由专用选择器自动填充，不作为普通文本输入项出现在"其他信息"中）
const KZ_FIELD_KEYS = ['kzDate', 'kzWeekday', 'kzWeekdayParen', 'kzTime']

const props = defineProps<{
  visible: boolean
  basicInfo: BasicInfo
  elements: EditableElement[]
  templateData?: Record<string, string | undefined>
  /** 模板中所有元素的 dataKey 集合（跨 canvas/page/flip 三种模式） */
  templateDataKeys?: string[]
}>()

const emit = defineEmits<{
  close: []
  confirm: []
  location: []
  update: [key: string, value: string]
}>()

/**
 * 收集模板中实际使用的所有 dataKey（跨三种模式）
 * 优先使用父组件传入的 templateDataKeys（完整集合），否则从 elements prop 回退
 */
const allAvailableKeys = computed(() => {
  if (props.templateDataKeys && props.templateDataKeys.length > 0) {
    return new Set(props.templateDataKeys)
  }
  // 回退：仅从当前 elements prop 收集（不如父组件传入的完整）
  const keys = new Set<string>()
  props.elements.forEach(el => {
    if (el.dataKey) keys.add(el.dataKey)
  })
  return keys
})

/** 检查模板是否包含某个 dataKey 的元素 */
function hasField(key: string): boolean {
  return allAvailableKeys.value.has(key)
}

/** 新人信息区块是否至少有一个字段需要显示 */
const hasBasicInfoFields = computed(() => {
  return hasField('groomName') || hasField('brideName')
})

/** 婚礼信息区块是否至少有一个字段需要显示 */
const hasWeddingInfoFields = computed(() => {
  return hasField('date') || hasField('location') || hasField('address')
})

// 额外字段（从 elements 的 dataKey 收集，排除基础字段和哈语拆分字段）
const extraFields = computed(() => {
  const seen = new Set([...BASIC_FIELD_KEYS, ...KZ_FIELD_KEYS])
  const result: Array<{ key: string; label: string; icon: string; placeholder: string; value: string }> = []

  props.elements.forEach(el => {
    if (el.dataKey && el.dataKey in SMART_FIELD_META && !seen.has(el.dataKey)) {
      seen.add(el.dataKey)
      const meta = SMART_FIELD_META[el.dataKey]
      result.push({
        key: el.dataKey,
        label: meta.label,
        icon: meta.icon,
        placeholder: meta.placeholder,
        value: el.text || '',
      })
    }
  })

  // 添加日期占位符全局字段（仅在模板使用了对应占位符时显示）
  if (props.templateData) {
    DATE_PLACEHOLDER_KEYS.forEach(key => {
      if (!seen.has(key) && key in SMART_FIELD_META && hasField(key)) {
        seen.add(key)
        const meta = SMART_FIELD_META[key]
        result.push({
          key,
          label: meta.label,
          icon: meta.icon,
          placeholder: meta.placeholder,
          value: props.templateData![key] || '',
        })
      }
    })
  }

  // 新增：占位符 token 字段（token 化元素无 dataKey，其字段在此展示为文本输入项；
  // 哈语日期/星期/时间段走上方专用选择器区，year/month/day 走上方日期占位符区）
  allAvailableKeys.value.forEach(key => {
    if (!seen.has(key) && key in SMART_FIELD_META) {
      seen.add(key)
      const meta = SMART_FIELD_META[key]
      result.push({
        key,
        label: meta.label,
        icon: meta.icon,
        placeholder: meta.placeholder,
        value: props.templateData?.[key] || '',
      })
    }
  })

  return result
})

// 哈萨克语阿拉伯文 RTL 输入支持
const groomNameRtl = useRtl(() => props.basicInfo.groomName || '')
const brideNameRtl = useRtl(() => props.basicInfo.brideName || '')
const addressRtl = useRtl(() => props.basicInfo.detailAddress || '')

/** 动态字段 RTL 检测（v-for 循环内使用） */
function isFieldRtl(text: string): boolean {
  return RTL_CHAR_REGEX.test(text || '')
}

function onInput(key: string, value: string) {
  emit('update', key, value)
}

function onDateChange(e: any) {
  emit('update', 'date', e.detail.value)
}

// ============ 哈萨克语日期（日期表达式 + 星期 + 时间段） ============

// 星期选项（中文标签供用户滚动选择，选中后取 kz 值写入占位符）
const KZ_WEEKDAY_OPTIONS = getKzWeekdayOptions()
const KZ_TIME_OPTIONS = getTimePeriodOptions()

/** 模板是否使用了任意哈语字段（决定是否显示"哈语日期"区块） */
const hasKzDateFields = computed(() => {
  return KZ_FIELD_KEYS.some(k => hasField(k))
})

/** 哈语日期选择器的当前值（中文日期，用于驱动 toKazakhDate 转换） */
const kzDateValue = ref('')

/** 当前选中的星期索引（KZ_WEEKDAY_OPTIONS 下标），默认 0=周一 */
const kzWeekdayIndex = ref(0)

/** 当前选中的星期(括号)索引，默认 0=周一 */
const kzWeekdayParenIndex = ref(0)

/** 当前选中的时间段索引（KZ_TIME_OPTIONS 下标），默认 0=上午 */
const kzTimeIndex = ref(0)

/** 从 templateData 反查星期索引（用于回显已选值） */
function findWeekdayIndex(kzText: string): number {
  if (!kzText) return 0
  // kzWeekdayParen 存储的是带括号格式，需去括号后匹配
  const cleaned = kzText.replace(/[()（）]/g, '')
  const idx = KZ_WEEKDAY_OPTIONS.findIndex(o => o.kz === kzText || o.kz === cleaned)
  return idx >= 0 ? idx : 0
}

/** 从 templateData 反查时间段索引（用于回显已选值） */
function findTimeIndex(kzText: string): number {
  if (!kzText) return 0
  const idx = KZ_TIME_OPTIONS.findIndex(o => o.kz === kzText)
  return idx >= 0 ? idx : 0
}

/** 选择日期后自动转换为哈语日期表达式，写入 kzDate 占位符 */
function onKzDateChange(e: any) {
  const dateStr = e.detail.value
  kzDateValue.value = dateStr
  const parts = toKazakhDate(dateStr)
  // 输出 "2026 جىل 1 اي 22 كۇن" 表达式
  if (hasField('kzDate')) emit('update', 'kzDate', parts.fullDate)
}

/** 滚动选择星期（周一-周日），写入哈语星期名到 kzWeekday 占位符 */
function onKzWeekdayChange(e: any) {
  const idx = Number(e.detail.value)
  kzWeekdayIndex.value = idx
  const opt = KZ_WEEKDAY_OPTIONS[idx]
  if (opt) emit('update', 'kzWeekday', opt.kz)
}

/** 滚动选择星期(括号)，写入带括号的哈语星期名到 kzWeekdayParen 占位符 */
function onKzWeekdayParenChange(e: any) {
  const idx = Number(e.detail.value)
  kzWeekdayParenIndex.value = idx
  const opt = KZ_WEEKDAY_OPTIONS[idx]
  if (opt) emit('update', 'kzWeekdayParen', `(${opt.kz})`)
}

/** 滚动选择时间段，写入哈语时间段到 kzTime 占位符 */
function onKzTimeChange(e: any) {
  const idx = Number(e.detail.value)
  kzTimeIndex.value = idx
  const opt = KZ_TIME_OPTIONS[idx]
  if (opt) emit('update', 'kzTime', opt.kz)
}

/** 哈语各字段当前值（来自 templateData，选择后实时更新） */
const kzPreview = computed(() => {
  const td = (props.templateData || {}) as any
  return {
    date: td.kzDate || '',
    weekday: td.kzWeekday || '',
    weekdayParen: td.kzWeekdayParen || '',
    time: td.kzTime || '',
  }
})

/** 弹窗打开时回显已选的星期/时间段索引 */
function initKzSelectors() {
  const td = (props.templateData || {}) as any
  kzWeekdayIndex.value = findWeekdayIndex(td.kzWeekday || '')
  kzWeekdayParenIndex.value = findWeekdayIndex(td.kzWeekdayParen || '')
  kzTimeIndex.value = findTimeIndex(td.kzTime || '')
}

// 组件挂载时（弹窗打开）初始化选择器回显
onMounted(() => {
  initKzSelectors()
})

function onConfirm() {
  // 仅验证当前显示的必填字段
  if (hasField('groomName') && !props.basicInfo.groomName?.trim()) {
    showToast('请输入新郎姓名', 'warning')
    return
  }
  if (hasField('brideName') && !props.basicInfo.brideName?.trim()) {
    showToast('请输入新娘姓名', 'warning')
    return
  }
  emit('confirm')
}
</script>

<style lang="scss" scoped>
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.popup-content {
  width: 100%;
  height: 85vh;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.header-left,
.header-right {
  min-width: 100rpx;
}

.header-back {
  font-size: 56rpx;
  color: var(--color-text-primary);
  font-weight: 300;
}

.header-title {
  font-size: 34rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.header-confirm {
  font-size: 28rpx;
  color: var(--color-primary);
  font-weight: 500;
  text-align: right;
}

.popup-scroll {
  flex: 1;
  min-height: 0;
}

.form-container {
  padding: 24rpx 32rpx 48rpx;
}

.form-section {
  background: #fafafa;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
  padding-bottom: 16rpx;
  border-bottom: 1px solid var(--color-border);
}

.title-icon {
  font-size: 32rpx;
}

.title-text {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.form-item {
  margin-bottom: 28rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.form-label {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.required {
  color: var(--color-primary);
  font-size: 28rpx;
  margin-right: 4rpx;
}

.label-icon {
  font-size: 28rpx;
  margin-right: 8rpx;
}

.label-name {
  font-size: 28rpx;
  color: var(--color-text-primary);
  font-weight: 500;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 28rpx;
  border: 2rpx solid #eee;
  transition: border-color 0.2s ease;
}

.form-input {
  flex: 1;
  font-size: 30rpx;
  color: var(--color-text-primary);
}

.input-placeholder {
  flex: 1;
  font-size: 30rpx;
  color: #bbb;
}

.form-value {
  flex: 1;
  font-size: 30rpx;
  color: var(--color-text-primary);
}

.input-arrow {
  font-size: 36rpx;
  color: #ccc;
  font-weight: 300;
}

.char-count {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.location-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}

.location-icon {
  font-size: 28rpx;
}

.location-text {
  font-size: 26rpx;
  color: var(--color-primary);
}

.tip-box {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 20rpx 24rpx;
  background: #fff8e6;
  border-radius: 16rpx;
  margin-top: 8rpx;
}

.tip-icon {
  font-size: 28rpx;
  flex-shrink: 0;
}

.tip-text {
  font-size: 24rpx;
  color: #8a6d3b;
  line-height: 1.5;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 24rpx;
  text-align: center;
}

.empty-icon {
  font-size: 64rpx;
  margin-bottom: 16rpx;
}

.empty-text {
  font-size: 28rpx;
  color: var(--color-text-primary);
  margin-bottom: 8rpx;
}

.empty-sub {
  font-size: 24rpx;
  color: var(--color-text-secondary);
}

/* ============ 哈萨克语日期区块 ============ */
.kz-section {
  background: #f3f0ff;
}

.kz-badge {
  margin-left: auto;
  font-size: 20rpx;
  color: #6c5ce7;
  background: #e8e3ff;
  padding: 4rpx 14rpx;
  border-radius: 20rpx;
  font-weight: 500;
}

.label-hint {
  margin-left: auto;
  font-size: 22rpx;
  color: var(--color-text-secondary);
  font-weight: 400;
}

/* 选择器内的哈语预览值（内联展示已转换的阿拉伯文） */
.kz-inline-value {
  margin-left: 16rpx;
  margin-right: auto;
  font-size: 28rpx;
  color: #6c5ce7;
  direction: rtl;
  text-align: right;
  unicode-bidi: isolate;
  font-family: 'KazakhSoftAsilya', 'Scheherazade New', 'Amiri', 'Noto Sans Arabic', sans-serif;
}

/* 哈语日期预览面板 */
.kz-preview {
  margin-top: 20rpx;
  padding: 20rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  border: 2rpx dashed #d4ceff;
}

.kz-preview-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10rpx 0;

  & + & {
    border-top: 1px solid #f0edff;
  }
}

.kz-preview-row--full {
  .kz-preview-value {
    font-size: 26rpx;
  }
}

.kz-preview-label {
  font-size: 26rpx;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.kz-preview-value {
  font-size: 30rpx;
  color: #6c5ce7;
  font-weight: 500;
  direction: rtl;
  text-align: right;
  unicode-bidi: isolate;
  font-family: 'KazakhSoftAsilya', 'Scheherazade New', 'Amiri', 'Noto Sans Arabic', sans-serif;
}
</style>
