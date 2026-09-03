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
              placeholder="将显示在首页模板卡片的小字位置，如：双向奔赴的爱情"
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
          <!-- 问题4：已关联模板时，让用户显式选择覆盖更新还是另存新模板 -->
          <div v-if="currentTemplateId" class="form-field">
            <label class="field-label">发布方式</label>
            <div class="publish-mode-chips">
              <button
                class="pm-chip"
                :class="{ active: publishMode === 'update' }"
                @click="publishMode = 'update'"
              >
                <span class="pm-icon">🔄</span>
                <span class="pm-name">更新当前模板</span>
                <span class="pm-sub">覆盖「{{ currentTemplateName || '当前模板' }}」{{ currentTemplateId ? `（ID: ${currentTemplateId.slice(0, 8)}…）` : '' }}</span>
              </button>
              <button
                class="pm-chip"
                :class="{ active: publishMode === 'new' }"
                @click="publishMode = 'new'"
              >
                <span class="pm-icon">✨</span>
                <span class="pm-name">另存为新模板</span>
                <span class="pm-sub">保留原模板，创建独立的新模板</span>
              </button>
            </div>
          </div>
        <div class="form-field">
          <label class="field-label">会员等级</label>
          <div class="vip-level-chips">
            <button
              v-for="level in VIP_LEVEL_OPTIONS"
              :key="level.value"
              class="vip-level-chip"
              :class="{ active: form.vipLevel === level.value }"
              @click="form.vipLevel = level.value"
            >
              <span class="vl-icon">{{ level.icon }}</span>
              <span class="vl-name">{{ level.name }}</span>
              <span class="vl-desc">{{ level.desc }}</span>
            </button>
          </div>
          <div v-if="form.vipLevel !== 'free'" class="price-input-wrap">
            <label class="switch-label">价格</label>
            <input v-model.number="form.price" type="number" class="field-input price-input" min="0" step="0.1" />
            <span class="price-unit">元 / 次</span>
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
          <!-- 调整模式：可拖动平移 + 缩放，手动裁剪封面取景 -->
          <div
            v-if="coverSourceImg && !coverPreview"
            class="cover-preview cover-adjust"
            :style="coverBoxStyle"
            @mousedown.prevent="onCoverDragStart"
            @mousemove="onCoverDragMove"
            @mouseup="onCoverDragEnd"
            @mouseleave="onCoverDragEnd"
            @wheel.prevent="onCoverWheel"
          >
            <img :src="coverSourceImg" class="cover-img cover-adjust-img" :style="coverImgStyle" draggable="false" alt="调整封面" />
          </div>
          <!-- 最终预览 -->
          <div v-else class="cover-preview" :style="coverBoxStyle">
            <img v-if="coverPreview" :src="coverPreview" class="cover-img" alt="封面预览" />
            <div v-else class="cover-placeholder">
              <span>📷</span>
              <span>点击「生成封面」获取预览图</span>
            </div>
          </div>
          <!-- 缩放滑块（调整模式显示） -->
          <div v-if="coverSourceImg && !coverPreview" class="cover-zoom-row">
            <span class="zoom-label">缩放</span>
            <input
              v-model.number="coverZoom"
              type="range"
              class="zoom-slider"
              min="1"
              max="4"
              step="0.05"
              @input="clampCoverOffsets"
            />
            <span class="zoom-value">{{ coverZoom.toFixed(2) }}x</span>
          </div>
          <div class="cover-actions">
            <!-- 应用调整 -->
            <button
              v-if="coverSourceImg && !coverPreview"
              class="btn-primary"
              @click="applyCoverAdjust"
            >
              ✓ 应用调整
            </button>
            <!-- 已应用 → 可重新调整 -->
            <button v-if="coverPreview" class="btn-secondary" @click="readjustCover">
              ✥ 重新调整取景
            </button>
            <button class="btn-secondary" @click="generateCover" :disabled="generatingCover">
              {{ generatingCover ? '生成中...' : '🔄 生成封面' }}
            </button>
            <label class="btn-secondary">
              自定义上传封面
              <input type="file" accept="image/*" style="display:none" @change="onCoverFile" />
            </label>
          </div>
          <div class="cover-tip">
            {{ coverSourceImg && !coverPreview
              ? '拖动图片调整位置，滚轮或滑块缩放，点击「应用调整」生成最终封面'
              : '封面将用于小程序模板列表展示，自动取景可再手动调整' }}
          </div>
        </div>

        <!-- ========== Step 3: 上传发布 ========== -->
        <div v-if="currentStep === 3" class="step-content">
          <div v-if="!publishing && !publishDone" class="publish-ready">
            <div class="publish-summary">
              <div class="summary-item">
                <span class="s-label">发布方式</span>
                <span class="s-value">{{ currentTemplateId ? (publishMode === 'update' ? '🔄 更新当前模板' : '✨ 另存为新模板') : '✨ 新建模板' }}</span>
              </div>
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
            <div class="result-desc">模板已保存到服务器{{ currentTemplateId && publishMode === 'update' ? '（已覆盖更新原模板）' : '' }}</div>

            <!-- 问题3：模板 ID + 微信云同步状态，让"是否真的传上去了"一目了然 -->
            <div v-if="publishedId" class="cloud-id-row">
              <span class="cloud-id-label">模板 ID</span>
              <code class="cloud-id-value">{{ publishedId }}</code>
              <button class="cloud-copy-btn" @click="copyTemplateId">复制</button>
              <span v-if="publishTip" class="cloud-copy-tip">{{ publishTip }}</span>
            </div>

            <div class="cloud-status" :class="`cloud-status--${cloudStatus}`">
              <template v-if="cloudStatus === 'checking'">
                <span class="cs-dot"></span> 正在核验微信云同步状态…
              </template>
              <template v-else-if="cloudStatus === 'ok'">
                ☁️ 已同步到微信云，小程序端立即可见（进入「模板广场」下拉刷新即可拉取）
              </template>
              <template v-else-if="cloudStatus === 'missing'">
                <div class="cs-main">⚠️ 已保存到服务器，但<b>微信云端没有查到该模板</b> —— 小程序暂时看不到！</div>
                <div class="cs-sub">{{ cloudSyncHint || '可能是服务器的云同步未启用或失败（需要配置微信云环境）。可点击下方按钮重试同步。' }}</div>
                <button class="cs-retry-btn" :disabled="cloudStatus === 'checking'" @click="retryCloudSync">🔁 重新同步到微信云</button>
              </template>
              <template v-else>
                ☁️ 云同步状态未知（该部署模式可能直连微信云）
              </template>
            </div>

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
import { createTemplate, updateTemplate, fetchVersion, API_BASE, uploadImages, checkCloudTemplateExists, resyncTemplate } from '../composables/useApi'
import { serializeElement } from '../utils/element-serializer'
import { uploadPayloadImages } from '../utils/payload-image-upload'
import { shapeText, containsRtl } from '../utils/bidi'

/**
 * 等待浏览器 @font-face 加载完成（特别是哈萨克字体 KazakhSoftAsilya）
 * 避免导出 PNG 时字体未就绪导致阿拉伯文固化成错乱字符
 */
async function waitForFontsLoaded(): Promise<void> {
  try {
    // document.fonts.ready 是浏览器原生 FontFaceSet API
    // 等待所有 @font-face 声明的字体加载完成（或失败）
    if (typeof document !== 'undefined' && (document as any).fonts) {
      await (document as any).fonts.ready
    }
  } catch (e) {
    console.warn('waitForFontsLoaded failed', e)
  }
}

/**
 * 在导出 PNG 前，临时把画布上所有阿拉伯文 IText 的 text 字段替换为
 * bidi-shaper 处理后的视觉顺序字符串，导出完成后再恢复原始值。
 * 这样既保证导出 PNG 正确，又不影响 admin 画布的编辑态显示。
 */
async function withBidiShapedText<T>(
  fCanvas: any,
  fn: () => Promise<T> | T
): Promise<T> {
  const originals: Array<{ obj: any; text: string }> = []
  try {
    const objects = fCanvas?.getObjects?.() || []
    for (const obj of objects) {
      // 只对含阿拉伯字符的文本元素做 shaping，避免无谓修改
      if (obj?.type === 'i-text' || obj?.type === 'textbox' || obj?.type === 'text') {
        const original = obj.text
        if (original && containsRtl(original)) {
          originals.push({ obj, text: original })
          obj.set('text', shapeText(original))
        }
      }
    }
    fCanvas?.renderAll?.()
  } catch (e) {
    console.warn('[withBidiShapedText] apply failed', e)
  }

  try {
    return await fn()
  } finally {
    // 恢复原始 text，避免影响后续编辑
    for (const { obj, text } of originals) {
      try { obj.set('text', text) } catch { /* ignore */ }
    }
    fCanvas?.renderAll?.()
  }
}

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
  currentTemplateId?: string
  currentTemplateName?: string
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

const VIP_LEVEL_OPTIONS = [
  { value: 'free', name: '免费', icon: '🆓', desc: '免费用户可用，带水印' },
  { value: 'limited', name: '限免版', icon: '🎫', desc: '第1次免费/第2次分享/第3次起每次6.6' },
  { value: 'personal', name: 'VIP版', icon: '👑', desc: 'VIP会员免费，非会员每次9.9' },
  { value: 'svip', name: 'SVIP版', icon: '💠', desc: '专业版免费，其余每次18.8' },
  { value: 'pro', name: '专业版', icon: '💎', desc: '专业版可用，最高权益' },
]

const currentStep = ref(0)
const form = reactive({
  name: '',
  subtitle: '',
  category: 'wedding',
  tags: [] as string[],
  pageCount: 10,
  likes: 1000,
  vipLevel: 'free' as 'free' | 'limited' | 'personal' | 'svip' | 'pro',
  price: 0,
})

const validationResults = ref<Array<{
  key: string
  message: string
  level: 'ok' | 'warn' | 'error'
  fix?: () => void
}>>([])

const coverPreview = ref('')
// 封面调整：原始图（画布截图/上传图）→ 拖动平移 + 缩放取景 → 应用后生成最终 coverPreview
const coverSourceImg = ref('')
const coverZoom = ref(1)
const coverOffsetX = ref(0)
const coverOffsetY = ref(0)
const COVER_BOX_W = 200 // 预览框宽度（px），与 .cover-preview CSS 一致
let coverDragging = false
let coverDragStartX = 0
let coverDragStartY = 0
let coverDragStartOffX = 0
let coverDragStartOffY = 0

// 预览框尺寸按画布比例（横版模板不会变形）
const coverBoxStyle = computed(() => {
  const w = props.canvasSize.width || 375
  const h = props.canvasSize.height || 667
  return {
    width: COVER_BOX_W + 'px',
    height: Math.round(COVER_BOX_W * (h / w)) + 'px',
  }
})

// 调整中的图片变换：object-fit: cover 提供基础 cover 缩放，
// scale(coverZoom) 在此之上叠加用户缩放，translate 为用户平移（box 像素）
const coverImgStyle = computed(() => ({
  transform: `translate(${coverOffsetX.value}px, ${coverOffsetY.value}px) scale(${coverZoom.value})`,
}))

// 约束平移范围：缩放 ≥1 时图片始终铺满取景框，不允许拖出露白
function clampCoverOffsets() {
  const maxPanX = ((coverZoom.value - 1) / 2) * COVER_BOX_W
  const maxPanY = ((coverZoom.value - 1) / 2) * (COVER_BOX_W * ((props.canvasSize.height || 667) / (props.canvasSize.width || 375)))
  coverOffsetX.value = Math.max(-maxPanX, Math.min(maxPanX, coverOffsetX.value))
  coverOffsetY.value = Math.max(-maxPanY, Math.min(maxPanY, coverOffsetY.value))
}

function onCoverDragStart(e: MouseEvent) {
  coverDragging = true
  coverDragStartX = e.clientX
  coverDragStartY = e.clientY
  coverDragStartOffX = coverOffsetX.value
  coverDragStartOffY = coverOffsetY.value
}

function onCoverDragMove(e: MouseEvent) {
  if (!coverDragging) return
  coverOffsetX.value = coverDragStartOffX + (e.clientX - coverDragStartX)
  coverOffsetY.value = coverDragStartOffY + (e.clientY - coverDragStartY)
  clampCoverOffsets()
}

function onCoverDragEnd() {
  coverDragging = false
}

function onCoverWheel(e: WheelEvent) {
  coverZoom.value = Math.max(1, Math.min(4, coverZoom.value + (e.deltaY > 0 ? -0.1 : 0.1)))
  clampCoverOffsets()
}

// 生成封面：截取画布 → 进入调整模式
async function generateCover() {
  generatingCover.value = true
  try {
    const canvas = props.getCanvasEl()
    if (!canvas) throw new Error('Canvas not found')
    // 生成 2x 分辨率封面
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    coverSourceImg.value = dataUrl
    coverPreview.value = ''
    coverZoom.value = 1
    coverOffsetX.value = 0
    coverOffsetY.value = 0
  } catch (e) {
    console.error('generateCover error:', e)
  } finally {
    generatingCover.value = false
  }
}

// 上传自定义封面 → 同样进入调整模式（可裁剪取景后再应用）
async function onCoverFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    coverSourceImg.value = reader.result as string
    coverPreview.value = ''
    coverZoom.value = 1
    coverOffsetX.value = 0
    coverOffsetY.value = 0
  }
  reader.readAsDataURL(file)
  input.value = ''
}

// 应用调整：按预览框中的取景把原图绘制到输出尺寸的离屏 canvas
function applyCoverAdjust() {
  const src = coverSourceImg.value
  if (!src) return
  const img = new Image()
  img.onload = () => {
    const outW = props.canvasSize.width || 375
    const outH = props.canvasSize.height || 667
    const boxW = COVER_BOX_W
    const c = document.createElement('canvas')
    c.width = outW
    c.height = outH
    const ctx = c.getContext('2d')
    if (!ctx) return
    // 基础 cover 缩放 × 用户缩放，与 CSS object-fit:cover + scale 完全对应
    const baseScale = Math.max(outW / img.width, outH / img.height)
    const s = baseScale * coverZoom.value
    const dw = img.width * s
    const dh = img.height * s
    // 预览框平移 px → 输出像素（等比换算）
    const k = outW / boxW
    const x = (outW - dw) / 2 + coverOffsetX.value * k
    const y = (outH - dh) / 2 + coverOffsetY.value * k
    ctx.drawImage(img, x, y, dw, dh)
    coverPreview.value = c.toDataURL('image/jpeg', 0.9)
  }
  img.src = src
}

// 重新调整：回到调整模式（保留当前缩放/平移设置）
function readjustCover() {
  if (!coverSourceImg.value) return
  coverPreview.value = ''
}
const generatingCover = ref(false)
const publishing = ref(false)
const publishDone = ref(false)
const publishSuccess = ref(false)
const publishError = ref('')
const uploadProgress = ref(0)
const uploadProgressText = ref('')
const publishTip = ref('')

// 问题4：当前已关联模板时，允许选择「更新原模板」还是「另存为新模板」。
// 历史 bug：发布成功后 currentTemplateId 指向刚发布的模板，紧接着导入新 PSD 再发布，
// 会静默走 updateTemplate 把上一个模板覆盖掉。
const publishMode = ref<'update' | 'new'>('update')

// 问题3：发布后的云端状态核验。本地服务器保存成功 ≠ 小程序可见
// （小程序读的是微信云数据库，需要 server 的 cloudSync 把模板写入云端）。
const publishedId = ref('')
const cloudStatus = ref<'checking' | 'ok' | 'missing' | 'unknown'>('unknown')
const cloudSyncHint = ref('')

async function verifyCloudSync(id: string) {
  if (!id) { cloudStatus.value = 'unknown'; return }
  cloudStatus.value = 'checking'
  cloudSyncHint.value = ''
  const r = await checkCloudTemplateExists(id)
  cloudStatus.value = r.exists ? 'ok' : 'missing'
}

async function retryCloudSync() {
  const id = publishedId.value
  if (!id) return
  cloudStatus.value = 'checking'
  cloudSyncHint.value = ''
  const r = await resyncTemplate(id)
  if (r.success) {
    await verifyCloudSync(id)
    if (cloudStatus.value !== 'ok') cloudSyncHint.value = '已重试，但云端仍未查询到该模板，请检查服务器的云同步配置'
  } else {
    cloudStatus.value = 'missing'
    cloudSyncHint.value = r.message || '重试失败，请检查服务器的云同步配置'
  }
}

function copyTemplateId() {
  if (!publishedId.value) return
  try {
    navigator.clipboard?.writeText(publishedId.value)
    publishTip.value = '模板 ID 已复制'
    setTimeout(() => { publishTip.value = '' }, 1500)
  } catch { /* ignore */ }
}

const canNext = computed(() => {
  if (currentStep.value === 0) return form.name.trim().length > 0 && form.category
  // 校验步骤：若有 error 级别的校验项，则阻止进入下一步
  if (currentStep.value === 1) {
    return !validationResults.value.some(v => v.level === 'error')
  }
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
    coverSourceImg.value = ''
    coverZoom.value = 1
    coverOffsetX.value = 0
    coverOffsetY.value = 0
    uploadProgress.value = 0
    form.name = ''
    form.subtitle = ''
    form.category = 'wedding'
    form.tags = []
    form.pageCount = 10
    form.likes = 1000
    form.vipLevel = 'free'
    form.price = 0
    publishMode.value = 'update'
    publishedId.value = ''
    cloudStatus.value = 'unknown'
    cloudSyncHint.value = ''
    publishTip.value = ''
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

// 自动修正：空文字块 —— 为画布中所有空文字元素填充默认文字
function fixEmptyTexts() {
  const fCanvas = props.getFabricCanvas?.()
  if (!fCanvas || !fCanvas.getObjects) {
    runValidation()
    return
  }
  let fixed = 0
  const objs = fCanvas.getObjects() as any[]
  objs.forEach((obj: any) => {
    const isText = obj.elementType === 'text' || obj.type === 'i-text' || obj.type === 'textbox'
    if (!isText) return
    const text = (obj.text || '').toString().trim()
    if (!text) {
      obj.set('text', '请输入文字')
      fixed++
    }
  })
  if (fixed > 0) {
    fCanvas.renderAll && fCanvas.renderAll()
  }
  // 重新校验（getDraft 会同步 fabric → 数据模型，使修正后的内容反映到校验结果）
  runValidation()
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
      fix: fixEmptyTexts,
    })
  } else {
    results.push({ key: 'emptyText', message: '无空文字块', level: 'ok' })
  }

  validationResults.value = results
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
        // 修复阿拉伯文显示混乱：导出前先等待字体加载完成，
        // 避免字体未加载完成即固化 PNG 导致字符永久错乱
        await waitForFontsLoaded()
        // 导出前对阿拉伯文文本做 bidi-shaper shaping，导出后恢复
        // 解决 Fabric.js Canvas 渲染阿拉伯文时不连写、顺序错乱的问题
        renderedImageUrl = await withBidiShapedText(fCanvas, async () => {
          // Fabric.js 需要重新渲染一次，确保字体生效后再 toDataURL
          fCanvas.renderAll()
          const dataUrl = fCanvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 })
          const res = await fetch(dataUrl)
          const blob = await res.blob()
          const file = new File([blob], `render-${Date.now()}.png`, { type: 'image/png' })
          const urls = await uploadImages([file])
          return urls[0] || ''
        })
      } catch (e) {
        console.error('renderedImage upload failed:', e)
      }
    }

    uploadProgress.value = 40
    uploadProgressText.value = '上传封面与模板数据...'

    // 封面图：若为 base64 则先上传为文件，得到可访问 URL
    let coverUrl = ''
    if (coverPreview.value && coverPreview.value.startsWith('data:')) {
      try {
        const blob = await (await fetch(coverPreview.value)).blob()
        const file = new File([blob], `cover_${Date.now()}.jpg`, { type: 'image/jpeg' })
        const urls = await uploadImages([file])
        coverUrl = urls[0] || ''
      } catch (e) {
        console.warn('封面上传失败，使用base64', e)
      }
    } else if (coverPreview.value) {
      coverUrl = coverPreview.value
    }

    // 构建 payload
    const cSize = draft?.canvasSize || { width: 375, height: 667 }
    const isFlipMode = props.pageMode === 'flip'
    const flipPages = props.getFlipPages?.() || []

    let payload: any = {
      name: form.name,
      subtitle: form.subtitle,
      category: form.category,
      tags: form.tags,
      cover: coverUrl || coverPreview.value || '',
      primaryColor: '#e84a6e',
      likes: form.likes,
      pageCount: isFlipMode ? flipPages.length : form.pageCount,
      status: 'published',
      vipLevel: form.vipLevel,
      // 会员等级与付费标识统一：free→免费，limited→限免(付费但VIP不免费)，personal→VIP版(付费+VIP免费)，svip→SVIP版(付费但VIP不免费)，pro→专业版
      isPaid: form.vipLevel === 'free' ? 0 : 1,
      isPremium: form.vipLevel === 'pro' ? 1 : 0,
      vip_free: form.vipLevel === 'personal' || form.vipLevel === 'pro' ? 1 : 0,
      price: form.vipLevel === 'free' ? 0 : Math.max(0, form.price || 0),
      renderedImage: renderedImageUrl,
      orientation: props.canvasSize.width > props.canvasSize.height ? 'landscape' : 'portrait',
      templateType: isFlipMode ? 'flip' : 'canvas',
      data: {
        coverImage: coverUrl || coverPreview.value || '',
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
        ).filter(Boolean),
      }))
    } else {
      payload.elements = (draft?.elements || []).map((el: any) =>
        serializeElement(el, { canvasWidth: cSize.width })
      ).filter(Boolean)
    }

    // 收集元素 defaults（占位符标记/识别回填的原文默认值）合并进 data：
    // 用户显式填写的字段优先，未填写的空字段用识别原文兜底（保证发布后渲染与 PSD 原文一致）
    const defaults: Record<string, string> = {}
    const collectDefaults = (els: any[]) => (els || []).forEach((el: any) => {
      if (el && el.type === 'text' && el.defaults && typeof el.defaults === 'object') {
        Object.entries(el.defaults).forEach(([k, v]) => {
          if (typeof v === 'string' && v && !defaults[k]) defaults[k] = v
        })
      }
    })
    collectDefaults(draft?.elements || [])
    if (isFlipMode) {
      flipPages.forEach(page => collectDefaults(page.elements || []))
    }
    for (const [k, v] of Object.entries(defaults)) {
      if (!payload.data[k]) payload.data[k] = v
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

    uploadProgress.value = 45
    uploadProgressText.value = '上传图片素材...'

    // base64 图片（PSD 导入 / 本地添加 / 背景图）批量上传为文件，payload 只保留 URL，
    // 避免超大 JSON 触发服务端 body 限制并撑大数据库
    payload = await uploadPayloadImages(payload, uploadImages)

    uploadProgress.value = 50
    uploadProgressText.value = '保存到服务器...'

    // 问题4：发布方式由用户显式选择——
    // - update：更新当前已关联模板（props.currentTemplateId）
    // - new：另存为新模板（即使 currentTemplateId 存在也不覆盖）
    // 未关联模板时永远是新建。
    let result
    const isUpdate = !!(props.currentTemplateId && publishMode.value === 'update')
    if (isUpdate) {
      result = await updateTemplate(props.currentTemplateId, payload)
    } else {
      result = await createTemplate(payload)
    }
    publishedId.value = result?.id || ''

    // 问题3：服务器本地保存成功 ≠ 小程序可见。发布完成后核验模板是否已写入微信云，
    // 并在成功页展示真实状态（防止"本地显示上传成功，小程序却看不到"的静默失败）。
    // - Express 后端：响应行带 cloud_synced 字段（server 在 POST/PUT 里同步等待云端写入）；
    //   cloud_synced=1 → 已同步；=0 → 未同步（给出警告 + 重试按钮，并再次核验防止竞态）。
    // - 直连云函数部署：模板本身就写入了云数据库，响应行没有 cloud_synced 字段 → 视为已同步。
    {
      const row: any = result
      if (row && (row.cloud_synced === 1 || row.cloud_synced === true)) {
        cloudStatus.value = 'ok'
      } else if (row && row.cloud_synced !== undefined) {
        cloudStatus.value = 'missing'
        verifyCloudSync(publishedId.value)
      } else {
        cloudStatus.value = 'ok'
      }
    }

    uploadProgress.value = 90
    uploadProgressText.value = '完成！'

    // 刷新版本号
    await fetchVersion()

    uploadProgress.value = 100
    publishSuccess.value = true
    publishDone.value = true
    emit('published', {
      id: result.id,
      name: form.name,
      category: form.category,
      subtitle: form.subtitle,
    })
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

/* 调整模式：取景框，支持拖动/滚轮 */
.cover-preview.cover-adjust {
  cursor: grab;
  user-select: none;
  touch-action: none;
}
.cover-preview.cover-adjust:active { cursor: grabbing; }

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 调整中的图片：object-fit cover 基础上叠加 translate/scale 变换 */
.cover-adjust-img {
  transform-origin: center center;
  will-change: transform;
  pointer-events: none;
}

/* 缩放滑块行 */
.cover-zoom-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 0 auto 16px;
  max-width: 320px;
}
.zoom-label {
  font-size: 12px;
  color: #666;
  flex-shrink: 0;
}
.zoom-slider {
  flex: 1;
  accent-color: #1976d2;
}
.zoom-value {
  font-size: 12px;
  color: #333;
  min-width: 44px;
  text-align: right;
  font-variant-numeric: tabular-nums;
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

/* 问题4：发布方式选择 */
.publish-mode-chips {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.pm-chip {
  text-align: left;
  padding: 10px 12px;
  border: 1.5px solid #e0e3e8;
  border-radius: 8px;
  background: #fafbfc;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 3px;
  transition: all 0.15s;
}
.pm-chip:hover { border-color: #90caf9; }
.pm-chip.active {
  border-color: #1976d2;
  background: #e3f2fd;
}
.pm-icon { font-size: 16px; }
.pm-name { font-size: 13px; font-weight: 600; color: #333; }
.pm-sub { font-size: 11px; color: #888; line-height: 1.4; word-break: break-all; }

/* 问题3：模板 ID 展示 + 云同步状态 */
.cloud-id-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.cloud-id-label { font-size: 12px; color: #888; }
.cloud-id-value {
  font-size: 12px;
  background: #f1f3f5;
  padding: 3px 8px;
  border-radius: 4px;
  color: #495057;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cloud-copy-btn {
  font-size: 11px;
  padding: 3px 10px;
  border: 1px solid #d0d5da;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  color: #555;
}
.cloud-copy-btn:hover { background: #f1f3f5; }
.cloud-copy-tip { font-size: 11px; color: #2e7d32; }

.cloud-status {
  margin: 0 auto 24px;
  max-width: 420px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 12.5px;
  line-height: 1.6;
  text-align: left;
}
.cloud-status--checking {
  background: #e3f2fd;
  color: #1565c0;
}
.cloud-status--ok {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #a5d6a7;
}
.cloud-status--missing {
  background: #fff3e0;
  color: #5d4037;
  border: 1px solid #ffb74d;
}
.cloud-status--unknown {
  background: #f1f3f5;
  color: #666;
}
.cs-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #1976d2;
  animation: csPulse 1s infinite;
}
@keyframes csPulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}
.cs-main { font-weight: 600; color: #bf360c; }
.cs-main b { color: #d84315; }
.cs-sub { margin: 6px 0 10px; color: #795548; }
.cs-retry-btn {
  padding: 6px 14px;
  font-size: 12px;
  border: 1px solid #ef6c00;
  color: #ef6c00;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
}
.cs-retry-btn:hover { background: #fff3e0; }
.cs-retry-btn:disabled { opacity: 0.5; cursor: not-allowed; }

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
.vip-level-chips {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.vip-level-chip {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1.5px solid #e0e0e0;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}
.vip-level-chip:hover { border-color: #1976d2; }
.vip-level-chip.active {
  border-color: #1976d2;
  background: #e3f2fd;
}
.vl-icon { font-size: 22px; }
.vl-name {
  font-size: 14px;
  font-weight: 600;
  color: #222;
  flex-shrink: 0;
}
.vl-desc {
  font-size: 12px;
  color: #888;
  margin-left: auto;
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
