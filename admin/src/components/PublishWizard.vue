<template>
  <Teleport to="body">
    <div v-if="visible" class="wizard-overlay" @click.self="onClose">
      <div class="wizard-modal">
        <!-- 步骤指示器 -->
        <div class="wizard-header">
          <div class="wizard-title">发布模板</div>
          <button class="close-btn" @click="onClose">×</button>
        </div>

        <div class="step-indicator">
          <div
            v-for="(step, idx) in STEPS"
            :key="step.key"
            class="step-item"
            :class="{
              active: currentStep === idx,
              done: currentStep > idx,
            }"
          >
            <div class="step-dot">
              <span v-if="currentStep > idx">✓</span>
              <span v-else>{{ idx + 1 }}</span>
            </div>
            <div class="step-label">{{ step.label }}</div>
          </div>
        </div>

        <!-- ========== Step 0: 模板信息 ========== -->
        <div v-if="currentStep === 0" class="step-content">
          <div class="form-field">
            <label class="field-label">模板名称 *</label>
            <input
              v-model="form.name"
              class="field-input"
              placeholder="如：好久不见 · 中式婚礼"
              maxlength="30"
            />
          </div>
          <div class="form-field">
            <label class="field-label">副标题 / 描述</label>
            <input
              v-model="form.subtitle"
              class="field-input"
              placeholder="如：双向奔赴的爱情"
              maxlength="50"
            />
          </div>
          <div class="form-field">
            <label class="field-label">分类 *</label>
            <div class="category-chips">
              <button
                v-for="cat in CATEGORIES"
                :key="cat.id"
                class="cat-chip"
                :class="{ active: form.category === cat.id }"
                @click="form.category = cat.id"
              >
                <span>{{ cat.icon }}</span>
                <span>{{ cat.name }}</span>
              </button>
            </div>
          </div>
        <div class="form-field">
          <label class="field-label">付费设置</label>
          <div class="price-setting">
            <label class="switch-label">
              <input type="checkbox" v-model="form.isPaid" />
              <span>设为付费模板</span>
            </label>
            <div v-if="form.isPaid" class="price-input-wrap">
              <input v-model.number="form.price" type="number" class="field-input price-input" placeholder="价格（元）" min="1" max="99" />
              <span class="price-unit">元</span>
            </div>
            <label class="switch-label">
              <input type="checkbox" v-model="form.isPremium" />
              <span>含付费元素（VIP专属素材/字体/特效）</span>
            </label>
          </div>
        </div>
        <div class="form-field">
          <label class="field-label">标签（可多选）</label>
            <div class="tag-chips">
              <button
                v-for="tag in TAG_LIST"
                :key="tag"
                class="tag-chip"
                :class="{ active: form.tags.includes(tag) }"
                @click="toggleTag(tag)"
              >{{ tag }}</button>
            </div>
          </div>
          <div class="form-field two-col">
            <div>
              <label class="field-label">页数</label>
              <input v-model.number="form.pageCount" type="number" class="field-input" min="1" max="50" />
            </div>
            <div>
              <label class="field-label">初始点赞数</label>
              <input v-model.number="form.likes" type="number" class="field-input" min="0" />
            </div>
          </div>
        </div>

        <!-- ========== Step 1: 自动校验 ========== -->
        <div v-if="currentStep === 1" class="step-content">
          <div class="validation-list">
            <div
              v-for="item in validationResults"
              :key="item.key"
              class="validation-item"
              :class="item.level"
            >
              <span class="v-icon">{{ item.level === 'ok' ? '✅' : item.level === 'warn' ? '⚠️' : '❌' }}</span>
              <span class="v-text">{{ item.message }}</span>
              <button v-if="item.level === 'warn' && item.fix" class="v-fix-btn" @click="item.fix">
                自动修正
              </button>
            </div>
          </div>
          <div class="validation-summary">
            <span v-if="validationResults.every(v => v.level === 'ok')">
              ✅ 所有检查项通过，可以发布！
            </span>
            <span v-else-if="validationResults.some(v => v.level === 'error')">
              ❌ 请先修复红色错误项后再发布
            </span>
            <span v-else>⚠️ 有警告项，确认后可继续发布</span>
          </div>
        </div>

        <!-- ========== Step 2: 封面生成 ========== -->
        <div v-if="currentStep === 2" class="step-content">
          <div class="cover-preview">
            <img v-if="coverPreview" :src="coverPreview" class="cover-img" alt="封面预览" />
            <div v-else class="cover-placeholder">
              <span>📷</span>
              <span>点击「生成封面」获取预览图</span>
            </div>
          </div>
          <div class="cover-actions">
            <button class="btn-secondary" @click="generateCover" :disabled="generatingCover">
              {{ generatingCover ? '生成中...' : '🔄 生成封面' }}
            </button>
            <label class="btn-secondary">
              自定义上传封面
              <input type="file" accept="image/*" style="display:none" @change="onCoverFile" />
            </label>
          </div>
          <div class="cover-tip">封面将用于小程序模板列表展示，建议 375×667 比例</div>
        </div>

        <!-- ========== Step 3: 上传发布 ========== -->
        <div v-if="currentStep === 3" class="step-content">
          <div v-if="!publishing && !publishDone" class="publish-ready">
            <div class="publish-summary">
              <div class="summary-item">
                <span class="s-label">模板名称</span>
                <span class="s-value">{{ form.name }}</span>
              </div>
              <div class="summary-item">
                <span class="s-label">分类</span>
                <span class="s-value">{{ CATEGORIES.find(c => c.id === form.category)?.name }}</span>
              </div>
              <div class="summary-item">
                <span class="s-label">元素数量</span>
                <span class="s-value">{{ elementCount }} 个</span>
              </div>
            </div>
          </div>

          <!-- 上传进度 -->
          <div v-if="publishing" class="upload-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
            </div>
            <div class="progress-text">
              {{ uploadProgressText }}
            </div>
          </div>

          <!-- 成功 -->
          <div v-if="publishDone && publishSuccess" class="publish-result success">
            <div class="result-icon">✅</div>
            <div class="result-title">发布成功！</div>
            <div class="result-desc">模板已上传到服务器，可在微信小程序中查看</div>
            <div class="result-actions">
              <button class="btn-secondary" @click="onClose">继续编辑</button>
              <button class="btn-primary" @click="onViewTemplate">在小程序中查看</button>
            </div>
          </div>

          <!-- 失败 -->
          <div v-if="publishDone && !publishSuccess" class="publish-result error">
            <div class="result-icon">❌</div>
            <div class="result-title">发布失败</div>
            <div class="result-desc">{{ publishError }}</div>
            <button class="btn-secondary" @click="retryPublish">重试</button>
          </div>
        </div>

        <!-- 底部操作 -->
        <div v-if="!publishDone" class="wizard-footer">
          <button v-if="currentStep > 0" class="btn-secondary" @click="prevStep">← 上一步</button>
          <div style="flex:1"></div>
          <button
            v-if="currentStep < STEPS.length - 1"
            class="btn-primary"
            @click="nextStep"
            :disabled="!canNext"
          >
            下一步 →
          </button>
          <button
            v-else
            class="btn-primary"
            @click="doPublish"
            :disabled="publishing || !canPublish"
          >
            {{ publishing ? '发布中...' : '🚀 立即发布' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { CATEGORIES } from '../types/template'
import { createTemplate, fetchVersion, API_BASE, uploadImages } from '../composables/useApi'
import { serializeElement } from '../utils/element-serializer'

const props = defineProps<{
  visible: boolean
  canvasSize: { width: number; height: number }
  elementCount: number
  getDraft: () => any
  getCanvasEl: () => HTMLCanvasElement | null
  getFabricCanvas?: () => any
  pageMode: string
  getFlipPages?: () => any[]
  saveCurrentFlipPage?: () => void
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'published', templateId: string): void
}>()

const STEPS = [
  { key: 'info', label: '模板信息' },
  { key: 'validate', label: '自动校验' },
  { key: 'cover', label: '生成封面' },
  { key: 'upload', label: '上传发布' },
]

const TAG_LIST = [
  '网红爆款', '新婚', '节日邀请', '限时免费',
  '中国风', '简约', '复古', '浪漫', '活泼', '典雅', '大气', '温馨', '西式', '韩式',
]

const currentStep = ref(0)
const form = reactive({
  name: '',
  subtitle: '',
  category: 'wedding',
  tags: [] as string[],
  pageCount: 10,
  likes: 1000,
  isPaid: false,
  price: 3,
  isPremium: false,
})

const validationResults = ref<Array<{
  key: string
  message: string
  level: 'ok' | 'warn' | 'error'
  fix?: () => void
}>>([])

const coverPreview = ref('')
const generatingCover = ref(false)
const publishing = ref(false)
const publishDone = ref(false)
const publishSuccess = ref(false)
const publishError = ref('')
const uploadProgress = ref(0)
const uploadProgressText = ref('')

const canNext = computed(() => {
  if (currentStep.value === 0) return form.name.trim().length > 0 && form.category
  return true
})

const canPublish = computed(() => {
  return form.name.trim().length > 0 && form.category
})

// 监听打开：重置状态
watch(() => props.visible, (val) => {
  if (val) {
    currentStep.value = 0
    publishDone.value = false
    publishing.value = false
    publishSuccess.value = false
    coverPreview.value = ''
    uploadProgress.value = 0
    form.name = ''
    form.subtitle = ''
    form.category = 'wedding'
    form.tags = []
    form.pageCount = 10
    form.likes = 1000
    form.isPaid = false
    form.price = 3
    form.isPremium = false
  }
})

function onClose() {
  emit('close')
}

function prevStep() {
  if (currentStep.value > 0) currentStep.value--
}

function nextStep() {
  if (currentStep.value === 0) {
    // 模板信息 → 校验
    currentStep.value = 1
    runValidation()
  } else if (currentStep.value === 1) {
    // 校验 → 封面
    currentStep.value = 2
  } else if (currentStep.value === 2) {
    // 封面 → 发布
    currentStep.value = 3
  }
}

function toggleTag(tag: string) {
  const idx = form.tags.indexOf(tag)
  if (idx === -1) form.tags.push(tag)
  else form.tags.splice(idx, 1)
}

function runValidation() {
  const results: typeof validationResults.value = []

  // 名称
  if (!form.name.trim()) {
    results.push({ key: 'name', message: '模板名称未填写', level: 'error' })
  } else {
    results.push({ key: 'name', message: '模板名称已填写', level: 'ok' })
  }

  // 分类
  if (!form.category) {
    results.push({ key: 'category', message: '分类未选择', level: 'error' })
  } else {
    results.push({ key: 'category', message: `已选择分类：${CATEGORIES.find(c => c.id === form.category)?.name}`, level: 'ok' })
  }

  // 元素数量
  const count = props.elementCount
  if (count === 0) {
    results.push({ key: 'elements', message: '画布没有任何元素，请先添加内容', level: 'error' })
  } else {
    results.push({ key: 'elements', message: `画布包含 ${count} 个元素`, level: 'ok' })
  }

  // 空文字块检测
  const draft = props.getDraft()
  const emptyTexts = draft?.elements?.filter((el: any) =>
    el.type === 'text' && !el.content?.trim()
  ) || []
  if (emptyTexts.length > 0) {
    results.push({
      key: 'emptyText',
      message: `检测到 ${emptyTexts.length} 个空文字块，建议填充内容`,
      level: 'warn',
    })
  } else {
    results.push({ key: 'emptyText', message: '无空文字块', level: 'ok' })
  }

  validationResults.value = results
}

async function generateCover() {
  generatingCover.value = true
  try {
    const canvas = props.getCanvasEl()
    if (!canvas) throw new Error('Canvas not found')
    // 生成 2x 分辨率封面
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    coverPreview.value = dataUrl
  } catch (e) {
    console.error('generateCover error:', e)
  } finally {
    generatingCover.value = false
  }
}

async function onCoverFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { coverPreview.value = reader.result as string }
  reader.readAsDataURL(file)
}

async function doPublish() {
  if (publishing.value) return
  publishing.value = true
  uploadProgress.value = 0
  uploadProgressText.value = '准备发布...'

  try {
    props.saveCurrentFlipPage?.()
    const draft = props.getDraft()

    uploadProgress.value = 20
    uploadProgressText.value = '生成高清渲染图...'

    // 生成 2x 渲染图
    let renderedImageUrl = ''
    const fCanvas = props.getFabricCanvas?.()
    if (fCanvas) {
      try {
        const dataUrl = fCanvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 })
        const res = await fetch(dataUrl)
        const blob = await res.blob()
        const file = new File([blob], `render-${Date.now()}.png`, { type: 'image/png' })
        const urls = await uploadImages([file])
        renderedImageUrl = urls[0] || ''
      } catch (e) {
        console.error('renderedImage upload failed:', e)
      }
    }

    uploadProgress.value = 40
    uploadProgressText.value = '上传模板数据...'

    // 构建 payload
    const cSize = draft?.canvasSize || { width: 375, height: 667 }
    const isFlipMode = props.pageMode === 'flip'
    const flipPages = props.getFlipPages?.() || []

    const payload: any = {
      name: form.name,
      subtitle: form.subtitle,
      category: form.category,
      tags: form.tags,
      cover: coverPreview.value || '',
      primaryColor: '#e84a6e',
      likes: form.likes,
      pageCount: isFlipMode ? flipPages.length : form.pageCount,
      status: 'published',
      isPaid: form.isPaid,
      price: form.isPaid ? form.price : 0,
      isPremium: form.isPremium,
      renderedImage: renderedImageUrl,
      orientation: props.canvasSize.width > props.canvasSize.height ? 'landscape' : 'portrait',
      templateType: isFlipMode ? 'flip' : 'canvas',
      data: {
        coverImage: coverPreview.value || '',
        coverTitle: form.name,
        coverSubtitle: form.subtitle,
        photo1: '',
        photo2: '',
        photo3: '',
        photo4: '',
        photoTitle: '',
        photoSubtitle: '',
        footerText: '',
        footerSubText: '',
        inviter: '', invitee: '', date: '', time: '',
        location: '', address: '', phone: '',
      },
      canvasSize: cSize,
      background: draft?.background || { type: 'solid', color1: '#ffffff' },
    }

    if (isFlipMode) {
      payload.pages = flipPages.map(page => ({
        id: page.id,
        name: page.name,
        pageType: page.pageType,
        background: page.background,
        elements: (page.elements || []).map((el: any) =>
          serializeElement(el, { canvasWidth: cSize.width })
        ),
      }))
    } else {
      payload.elements = (draft?.elements || []).map((el: any) =>
        serializeElement(el, { canvasWidth: cSize.width })
      )
    }

    // Auto-assign dataKey for text elements whose content matches template data values
    // This enables mini-program user edits to propagate back to templateData
    const dataValueToKey: Record<string, string> = {}
    for (const [key, value] of Object.entries(payload.data)) {
      if (value && typeof value === 'string') {
        dataValueToKey[value] = key
      }
    }
    // 只在非翻页模式下处理 elements 的 dataKey 自动绑定
    if (payload.elements && Array.isArray(payload.elements)) {
      payload.elements.forEach((el: any) => {
        if (el.type === 'text' && !el.dataKey && el.text && dataValueToKey[el.text]) {
          el.dataKey = dataValueToKey[el.text]
        }
      })
    }

    uploadProgress.value = 50
    uploadProgressText.value = '保存到服务器...'

    const result = await createTemplate(payload)

    uploadProgress.value = 90
    uploadProgressText.value = '完成！'

    // 刷新版本号
    await fetchVersion()

    uploadProgress.value = 100
    publishSuccess.value = true
    publishDone.value = true
    emit('published', result.id)
    window.dispatchEvent(new CustomEvent('publish-success'))
  } catch (e: any) {
    publishSuccess.value = false
    publishDone.value = true
    publishError.value = e?.response?.data?.error || e?.message || '未知错误'
  } finally {
    publishing.value = false
  }
}

function retryPublish() {
  publishDone.value = false
  publishSuccess.value = false
  publishError.value = ''
  uploadProgress.value = 0
}

function onViewTemplate() {
  window.open(`/pages/preview/index`, '_blank')
  onClose()
}
</script>

<style scoped>
.wizard-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.wizard-modal {
  background: #fff;
  border-radius: 16px;
  width: 520px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.wizard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
  background: #fafafa;
}

.wizard-title {
  font-size: 18px;
  font-weight: 700;
  color: #333;
}

.close-btn {
  width: 32px;
  height: 32px;
  background: #f0f0f0;
  border: none;
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
}

.close-btn:hover { background: #e0e0e0; }

/* 步骤指示器 */
.step-indicator {
  display: flex;
  justify-content: center;
  padding: 20px 24px;
  gap: 0;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
  position: relative;
}

.step-item:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 14px;
  left: calc(50% + 14px);
  width: calc(100% - 28px);
  height: 2px;
  background: #e0e0e0;
}

.step-item.done:not(:last-child)::after {
  background: #1976d2;
}

.step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #999;
  position: relative;
  z-index: 1;
  transition: all 0.2s;
}

.step-item.active .step-dot {
  background: #1976d2;
  color: #fff;
}

.step-item.done .step-dot {
  background: #4caf50;
  color: #fff;
}

.step-label {
  font-size: 11px;
  color: #999;
}

.step-item.active .step-label {
  color: #1976d2;
  font-weight: 600;
}

.step-item.done .step-label { color: #4caf50; }

/* 内容区 */
.step-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  max-height: 420px;
}

/* 表单 */
.form-field {
  margin-bottom: 20px;
}

.form-field.two-col {
  display: flex;
  gap: 16px;
}

.form-field.two-col > div { flex: 1; }

.field-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #555;
  margin-bottom: 8px;
}

.field-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  background: #fafafa;
  transition: border-color 0.15s;
}

.field-input:focus {
  outline: none;
  border-color: #1976d2;
  background: #fff;
}

/* 分类选择 */
.category-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cat-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1.5px solid #e0e0e0;
  border-radius: 20px;
  background: #fff;
  font-size: 13px;
  color: #555;
  cursor: pointer;
  transition: all 0.15s;
}

.cat-chip:hover { border-color: #1976d2; color: #1976d2; }
.cat-chip.active { background: #e3f2fd; border-color: #1976d2; color: #1976d2; }

/* 标签 */
.tag-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-chip {
  padding: 5px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 14px;
  background: #fff;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  transition: all 0.15s;
}

.tag-chip:hover { border-color: #1976d2; color: #1976d2; }
.tag-chip.active { background: #e3f2fd; border-color: #1976d2; color: #1976d2; }

/* 校验 */
.validation-list { margin-bottom: 20px; }

.validation-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 8px;
  font-size: 13px;
}

.validation-item.ok { background: #e8f5e9; color: #2e7d32; }
.validation-item.warn { background: #fff8e1; color: #f57f17; }
.validation-item.error { background: #ffebee; color: #c62828; }

.v-icon { font-size: 16px; }
.v-text { flex: 1; }

.v-fix-btn {
  padding: 3px 10px;
  background: #f57f17;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
}

.validation-summary {
  text-align: center;
  padding: 16px;
  border-radius: 8px;
  background: #f5f7fa;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

/* 封面 */
.cover-preview {
  width: 200px;
  height: 356px;
  margin: 0 auto 20px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #999;
  font-size: 12px;
}

.cover-placeholder span { font-size: 48px; }

.cover-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 16px;
}

/* 发布 */
.publish-summary {
  background: #f5f7fa;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #e8e8e8;
  font-size: 13px;
}

.summary-item:last-child { border-bottom: none; }
.s-label { color: #888; }
.s-value { font-weight: 600; color: #333; }

.upload-progress { margin: 20px 0; }

.progress-bar {
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1976d2, #42a5f5);
  border-radius: 4px;
  transition: width 0.3s;
}

.progress-text {
  text-align: center;
  margin-top: 10px;
  font-size: 13px;
  color: #666;
}

.publish-result {
  text-align: center;
  padding: 32px 16px;
}

.result-icon { font-size: 64px; margin-bottom: 16px; }
.result-title { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
.result-desc { font-size: 13px; color: #666; margin-bottom: 24px; }
.result-actions { display: flex; gap: 12px; justify-content: center; }

.cover-tip {
  text-align: center;
  font-size: 12px;
  color: #999;
}

/* 按钮 */
.btn-primary {
  padding: 10px 24px;
  background: linear-gradient(135deg, #1976d2, #1565c0);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 600;
  transition: opacity 0.15s;
}

.btn-primary:hover:not(:disabled) { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-secondary {
  padding: 10px 20px;
  background: #fff;
  color: #555;
  border: 1.5px solid #ddd;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-secondary:hover:not(:disabled) { background: #f5f7fa; }
.btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

/* 底部 */
.wizard-footer {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid #eee;
  background: #fafafa;
}

/* 付费设置 */
.price-setting {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.switch-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #555;
  cursor: pointer;
}
.switch-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}
.price-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 24px;
}
.price-input {
  width: 120px;
}
.price-unit {
  font-size: 13px;
  color: #666;
}
</style>
