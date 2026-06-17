<template>
  <div class="app">
    <!-- ========== 顶部导航栏 ========== -->
    <header class="topbar">
      <div class="topbar-left">
        <span class="logo">🎨 婚贝模板制作工具</span>
        <div class="template-tabs">
          <button
            v-for="t in templateList"
            :key="t.id"
            class="tab-btn"
            :class="{ active: currentId === t.id }"
            @click="loadTemplate(t.id)"
          >
            {{ t.name }}
          </button>
        </div>
      </div>
      <div class="topbar-right">
        <button class="btn-secondary" @click="createNewTemplate">+ 新建模板</button>
      </div>
    </header>

    <!-- ========== 主工作区 ========== -->
    <div class="workspace">
      <!-- 左侧：网格画布 -->
      <div class="canvas-panel">
        <div class="canvas-header">
          <span>模板画布</span>
          <span class="canvas-hint">点击格子可编辑内容</span>
        </div>

        <div class="canvas-scroll">
          <div class="canvas-phone">
            <!-- 封面区块 -->
            <div class="cell-group">
              <div class="cell image-cell" :class="{ selected: selectedId === 'coverImage' }" @click="selectElement('coverImage')">
                <img v-if="template.data.coverImage" :src="template.data.coverImage" class="cell-img" />
                <div v-else class="cell-placeholder">
                  <span>📷</span>
                  <text>上传封面图</text>
                </div>
                <div class="cell-label">封面图片</div>
              </div>

              <div class="cell text-cell" :class="{ selected: selectedId === 'coverTitle' }" @click="selectElement('coverTitle')">
                <span class="cell-text" :style="getCellStyle('coverTitle')">{{ template.data.coverTitle }}</span>
                <div class="cell-label">主标题</div>
              </div>

              <div class="cell text-cell" :class="{ selected: selectedId === 'coverSubtitle' }" @click="selectElement('coverSubtitle')">
                <span class="cell-text small" :style="getCellStyle('coverSubtitle')">{{ template.data.coverSubtitle }}</span>
                <div class="cell-label">副标题</div>
              </div>

              <div class="cell text-cell" :class="{ selected: selectedId === 'weddingDate' }" @click="selectElement('weddingDate')">
                <span class="cell-text" :style="getCellStyle('weddingDate')">2050.05.20</span>
                <div class="cell-label">婚礼日期</div>
              </div>
            </div>

            <!-- 分隔装饰 -->
            <div class="cell divider-cell">
              <div class="divider-line"></div>
              <span class="divider-icon">囍</span>
              <div class="divider-line"></div>
            </div>

            <!-- 内容区块 -->
            <div class="cell-group">
              <div class="cell image-cell" :class="{ selected: selectedId === 'photo1' }" @click="selectElement('photo1')">
                <img v-if="template.data.photo1" :src="template.data.photo1" class="cell-img" />
                <div v-else class="cell-placeholder"><span>📷</span><text>相册图1</text></div>
                <div class="cell-label">相册图片1</div>
              </div>

              <div class="cell text-cell" :class="{ selected: selectedId === 'photoTitle' }" @click="selectElement('photoTitle')">
                <span class="cell-text" :style="getCellStyle('photoTitle')">{{ template.data.photoTitle }}</span>
                <div class="cell-label">内容标题</div>
              </div>

              <div class="cell text-cell" :class="{ selected: selectedId === 'photoSubtitle' }" @click="selectElement('photoSubtitle')">
                <span class="cell-text small" :style="getCellStyle('photoSubtitle')">{{ template.data.photoSubtitle }}</span>
                <div class="cell-label">内容副标题</div>
              </div>

              <div class="cell image-cell" :class="{ selected: selectedId === 'photo2' }" @click="selectElement('photo2')">
                <img v-if="template.data.photo2" :src="template.data.photo2" class="cell-img" />
                <div v-else class="cell-placeholder"><span>📷</span><text>相册图2</text></div>
                <div class="cell-label">相册图片2</div>
              </div>

              <div class="cell image-cell" :class="{ selected: selectedId === 'photo3' }" @click="selectElement('photo3')">
                <img v-if="template.data.photo3" :src="template.data.photo3" class="cell-img" />
                <div v-else class="cell-placeholder"><span>📷</span><text>相册图3</text></div>
                <div class="cell-label">相册图片3</div>
              </div>

              <div class="cell image-cell" :class="{ selected: selectedId === 'photo4' }" @click="selectElement('photo4')">
                <img v-if="template.data.photo4" :src="template.data.photo4" class="cell-img" />
                <div v-else class="cell-placeholder"><span>📷</span><text>相册图4</text></div>
                <div class="cell-label">相册图片4</div>
              </div>
            </div>

            <!-- 文字区块 -->
            <div class="cell-group">
              <div class="cell text-cell tall" :class="{ selected: selectedId === 'footerText' }" @click="selectElement('footerText')">
                <span class="cell-text" :style="getCellStyle('footerText')">{{ template.data.footerText }}</span>
                <div class="cell-label">正文内容</div>
              </div>

              <div class="cell text-cell" :class="{ selected: selectedId === 'footerSubText' }" @click="selectElement('footerSubText')">
                <span class="cell-text small" :style="getCellStyle('footerSubText')">{{ template.data.footerSubText }}</span>
                <div class="cell-label">底部标签</div>
              </div>
            </div>

            <!-- 新人信息区（固定） -->
            <div class="cell-group info-area">
              <div class="info-names">
                <span>新郎姓名</span>
                <span class="info-and">囍</span>
                <span>新娘姓名</span>
              </div>
              <div class="info-detail">婚贝大酒店 · 幸福宴会厅</div>
              <div class="info-hint">基本信息在编辑器中填写</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：属性编辑面板 -->
      <div class="property-panel">
        <div class="panel-header">
          <span>属性配置</span>
          <span v-if="selectedId" class="panel-hint">已选中: {{ getElementLabel(selectedId) }}</span>
        </div>

        <div class="panel-body" v-if="selectedId">
          <!-- 文本内容编辑 -->
          <div class="field-group" v-if="isTextElement(selectedId)">
            <label class="field-label">文字内容</label>
            <textarea
              class="field-textarea"
              :value="getTextContent(selectedId)"
              @input="updateTextContent(selectedId, ($event.target as HTMLTextAreaElement).value)"
              :placeholder="getPlaceholder(selectedId)"
            ></textarea>
          </div>

          <!-- 图片上传 -->
          <div class="field-group" v-if="isImageElement(selectedId)">
            <label class="field-label">图片</label>
            <div class="image-upload-area" @click="triggerImageUpload(selectedId)">
              <img v-if="getImageUrl(selectedId)" :src="getImageUrl(selectedId)" class="upload-preview" />
              <div v-else class="upload-placeholder">
                <span>📷</span>
                <text>点击上传图片</text>
              </div>
            </div>
            <input ref="fileInputRef" type="file" accept="image/*" style="display:none" @change="onFileChange" />
            <button v-if="getImageUrl(selectedId)" class="btn-clear" @click="clearImage(selectedId)">移除图片</button>
          </div>

          <!-- 字体样式（文字元素） -->
          <div class="field-group" v-if="isTextElement(selectedId)">
            <label class="field-label">字体</label>
            <select class="field-select" :value="getStyleProp(selectedId, 'font')" @change="updateStyleProp(selectedId, 'font', ($event.target as HTMLSelectElement).value)">
              <option v-for="f in FONT_LIST" :key="f" :value="f">{{ f }}</option>
            </select>
          </div>

          <div class="field-group" v-if="isTextElement(selectedId)">
            <label class="field-label">字号: {{ getStyleProp(selectedId, 'fontSize') }}px</label>
            <input
              type="range" min="12" max="72" step="2"
              :value="getStyleProp(selectedId, 'fontSize')"
              @input="updateStyleProp(selectedId, 'fontSize', Number(($event.target as HTMLInputElement).value))"
              class="field-range"
            />
          </div>

          <div class="field-group" v-if="isTextElement(selectedId)">
            <label class="field-label">颜色</label>
            <div class="color-grid">
              <div
                v-for="c in COLOR_LIST"
                :key="c"
                class="color-swatch"
                :class="{ active: getStyleProp(selectedId, 'color') === c }"
                :style="{ background: c }"
                @click="updateStyleProp(selectedId, 'color', c)"
              ></div>
            </div>
            <input type="color" class="field-color" :value="getStyleProp(selectedId, 'color')" @input="updateStyleProp(selectedId, 'color', ($event.target as HTMLInputElement).value)" />
          </div>

          <div class="field-group" v-if="isTextElement(selectedId)">
            <label class="field-label">行高: {{ getStyleProp(selectedId, 'lineHeight') }}</label>
            <input type="range" min="1" max="4" step="0.2" :value="getStyleProp(selectedId, 'lineHeight')" @input="updateStyleProp(selectedId, 'lineHeight', Number(($event.target as HTMLInputElement).value))" class="field-range" />
          </div>

          <div class="field-group" v-if="isTextElement(selectedId)">
            <label class="field-label">间距: {{ getStyleProp(selectedId, 'spacing') }}px</label>
            <input type="range" min="0" max="20" step="1" :value="getStyleProp(selectedId, 'spacing')" @input="updateStyleProp(selectedId, 'spacing', Number(($event.target as HTMLInputElement).value))" class="field-range" />
          </div>
        </div>

        <!-- 模板基本信息（无选中时显示） -->
        <div class="panel-body" v-else>
          <div class="field-group">
            <label class="field-label">模板名称 *</label>
            <input class="field-input" v-model="template.name" placeholder="如：好久不见" />
          </div>
          <div class="field-group">
            <label class="field-label">副标题</label>
            <input class="field-input" v-model="template.subtitle" placeholder="如：双向奔赴的爱情" />
          </div>
          <div class="field-group">
            <label class="field-label">分类 *</label>
            <select class="field-select" v-model="template.category">
              <option v-for="cat in CATEGORIES" :key="cat.id" :value="cat.id">{{ cat.icon }} {{ cat.name }}</option>
            </select>
          </div>
          <div class="field-group">
            <label class="field-label">主题色</label>
            <div class="color-grid">
              <div
                v-for="c in ['#e84a6e','#f39c12','#3498db','#9b59b6','#e74c3c','#2ecc71','#00cec9','#ff6b8a','#ffa502']"
                :key="c"
                class="color-swatch"
                :class="{ active: template.primaryColor === c }"
                :style="{ background: c }"
                @click="template.primaryColor = c"
              ></div>
            </div>
            <input type="color" class="field-color" v-model="template.primaryColor" />
          </div>
          <div class="field-group">
            <label class="field-label">页数</label>
            <input class="field-input" type="number" v-model.number="template.pageCount" min="1" />
          </div>
          <div class="field-group">
            <label class="field-label">点赞数（初始）</label>
            <input class="field-input" type="number" v-model.number="template.likes" min="0" />
          </div>
        </div>

        <!-- 底部操作栏 -->
        <div class="panel-footer">
          <button class="btn-secondary" @click="resetTemplate">重置</button>
          <button class="btn-primary" :disabled="isSaving" @click="publishTemplate">
            {{ isSaving ? '上传中...' : '发布模板' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ========== Toast 提示 ========== -->
    <div v-if="toast.show" class="toast" :class="toast.type">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import type { TemplateItem, EditableElement, ElementStyle } from './types/template'
import { DEFAULT_TEMPLATE_DATA, DEFAULT_ELEMENT_STYLE, FONT_LIST, COLOR_LIST, CATEGORIES } from './types/template'
import { fetchTemplates, fetchTemplate, createTemplate, updateTemplate, deleteTemplate, uploadImage } from './composables/useApi'
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

// ============ 状态 ============
const templateList = ref<TemplateItem[]>([])
const currentId = ref<string | null>(null)
const selectedId = ref<string | null>(null)
const isSaving = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const uploadingElementId = ref<string | null>(null)

const toast = reactive({ show: false, message: '', type: 'success' })

// 当前编辑的模板
const template = reactive<TemplateItem>({
  id: '',
  name: '未命名模板',
  subtitle: '',
  category: 'wedding',
  cover: '',
  primaryColor: '#e84a6e',
  likes: 0,
  pageCount: 10,
  data: { ...DEFAULT_TEMPLATE_DATA },
  elements: [],
})

// ============ 初始化 ============
onMounted(async () => {
  await loadTemplateList()
  if (templateList.value.length > 0) {
    await loadTemplate(templateList.value[0].id)
  }
})

async function loadTemplateList() {
  try {
    templateList.value = await fetchTemplates()
  } catch (e) {
    showToast('加载模板列表失败: ' + (e as Error).message, 'error')
  }
}

async function loadTemplate(id: string) {
  try {
    const t = await fetchTemplate(id)
    Object.assign(template, t)
    currentId.value = id
    selectedId.value = null
  } catch (e) {
    showToast('加载模板失败', 'error')
  }
}

function createNewTemplate() {
  template.id = ''
  template.name = '新模板'
  template.subtitle = ''
  template.category = 'wedding'
  template.cover = ''
  template.primaryColor = '#e84a6e'
  template.likes = 0
  template.pageCount = 10
  template.data = { ...DEFAULT_TEMPLATE_DATA }
  template.elements = []
  currentId.value = null
  selectedId.value = null
  showToast('已创建空白模板，开始编辑吧！')
}

// ============ 元素选择与编辑 ============
function selectElement(id: string) {
  selectedId.value = selectedId.value === id ? null : id
}

function getElementLabel(id: string): string {
  const labels: Record<string, string> = {
    coverImage: '封面图片', coverTitle: '主标题', coverSubtitle: '副标题',
    weddingDate: '婚礼日期', photo1: '相册1', photo2: '相册2',
    photo3: '相册3', photo4: '相册4', photoTitle: '内容标题',
    photoSubtitle: '内容副标题', footerText: '正文内容', footerSubText: '底部标签',
  }
  return labels[id] || id
}

function isTextElement(id: string): boolean {
  const imageIds = ['coverImage', 'photo1', 'photo2', 'photo3', 'photo4']
  return !imageIds.includes(id)
}

function isImageElement(id: string): boolean {
  return ['coverImage', 'photo1', 'photo2', 'photo3', 'photo4'].includes(id)
}

function getTextContent(id: string): string {
  const map: Record<string, string> = {
    coverTitle: template.data.coverTitle,
    coverSubtitle: template.data.coverSubtitle,
    weddingDate: '2050.05.20',
    photoTitle: template.data.photoTitle,
    photoSubtitle: template.data.photoSubtitle,
    footerText: template.data.footerText,
    footerSubText: template.data.footerSubText,
  }
  return map[id] || ''
}

function updateTextContent(id: string, value: string) {
  const map: Record<string, keyof typeof template.data> = {
    coverTitle: 'coverTitle',
    coverSubtitle: 'coverSubtitle',
    photoTitle: 'photoTitle',
    photoSubtitle: 'photoSubtitle',
    footerText: 'footerText',
    footerSubText: 'footerSubText',
  }
  const key = map[id]
  if (key) template.data[key] = value
}

function getPlaceholder(id: string): string {
  const map: Record<string, string> = {
    coverTitle: '输入主标题，如：我们的婚礼',
    coverSubtitle: '输入英文副标题，如：Our Wedding',
    photoTitle: '输入内容标题',
    photoSubtitle: '输入英文副标题',
    footerText: '输入正文内容（支持换行）',
    footerSubText: '输入底部标签文字',
  }
  return map[id] || ''
}

// ============ 样式 ============
function getCellStyle(id: string): Record<string, string> {
  const el = template.elements.find(e => e.id === id)
  if (!el?.style) {
    return {
      fontSize: '26px',
      color: '#333333',
      fontFamily: '思源宋体',
      lineHeight: '2',
      letterSpacing: '2px',
    }
  }
  return {
    fontSize: `${el.style!.fontSize}px`,
    color: el.style!.color,
    fontFamily: el.style!.font,
    lineHeight: String(el.style!.lineHeight),
    letterSpacing: `${el.style!.spacing}px`,
  }
}

function getStyleProp(id: string, prop: keyof ElementStyle): any {
  let el = template.elements.find(e => e.id === id)
  if (!el) {
    el = createElement(id)
    template.elements.push(el)
  }
  return el.style ? el.style[prop] : DEFAULT_ELEMENT_STYLE[prop]
}

function createElement(id: string): EditableElement {
  const imageIds = ['coverImage', 'photo1', 'photo2', 'photo3', 'photo4']
  return {
    id,
    type: imageIds.includes(id) ? 'image' : 'text',
    text: getTextContent(id) || '',
    dataKey: id as any,
    label: getElementLabel(id),
    style: { ...DEFAULT_ELEMENT_STYLE },
    placeholder: getPlaceholder(id),
  }
}

function updateStyleProp(id: string, prop: keyof ElementStyle, value: any) {
  let el = template.elements.find(e => e.id === id)
  if (!el) {
    el = createElement(id)
    template.elements.push(el)
  }
  if (!el.style) el.style = { ...DEFAULT_ELEMENT_STYLE }
  el.style[prop] = value
  // 同步到 data（文字元素的 style 也存一份到 data.text 供预览）
}

// ============ 图片上传 ============
function triggerImageUpload(id: string) {
  uploadingElementId.value = id
  fileInputRef.value?.click()
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !uploadingElementId.value) return

  try {
    showToast('图片上传中...')
    const url = await uploadImage(file)
    const id = uploadingElementId.value
    const imageMap: Record<string, keyof typeof template.data> = {
      coverImage: 'coverImage', photo1: 'photo1', photo2: 'photo2',
      photo3: 'photo3', photo4: 'photo4',
    }
    const key = imageMap[id]
    if (key) template.data[key] = url
    showToast('图片上传成功')
  } catch (e) {
    showToast('上传失败: ' + (e as Error).message, 'error')
  }

  input.value = ''
  uploadingElementId.value = null
}

function getImageUrl(id: string): string {
  const map: Record<string, keyof typeof template.data> = {
    coverImage: 'coverImage', photo1: 'photo1', photo2: 'photo2',
    photo3: 'photo3', photo4: 'photo4',
  }
  const key = map[id]
  return key ? template.data[key] : ''
}

function clearImage(id: string) {
  const map: Record<string, keyof typeof template.data> = {
    coverImage: 'coverImage', photo1: 'photo1', photo2: 'photo2',
    photo3: 'photo3', photo4: 'photo4',
  }
  const key = map[id]
  if (key) template.data[key] = ''
}

// ============ 发布 ============
async function publishTemplate() {
  if (!template.name || !template.category) {
    showToast('请填写模板名称和分类', 'error')
    return
  }

  isSaving.value = true
  try {
    // 构建最终要提交的模板数据
    const payload = {
      name: template.name,
      subtitle: template.subtitle,
      category: template.category,
      cover: template.data.coverImage || template.cover,
      primaryColor: template.primaryColor,
      likes: template.likes,
      pageCount: template.pageCount,
      data: template.data,
      elements: template.elements.map(e => ({
        type: e.type,
        text: e.text,
        dataKey: e.dataKey,
        label: e.label,
        style: e.style,
      })),
    }

    let result: TemplateItem
    if (currentId.value) {
      result = await updateTemplate(currentId.value, payload)
      showToast('模板更新成功！')
    } else {
      result = await createTemplate(payload)
      currentId.value = result.id
      showToast('模板发布成功！')
    }

    await loadTemplateList()
  } catch (e) {
    showToast('发布失败: ' + (e as Error).message, 'error')
  } finally {
    isSaving.value = false
  }
}

function resetTemplate() {
  if (currentId.value) {
    loadTemplate(currentId.value)
  } else {
    createNewTemplate()
  }
}

// ============ Toast ============
function showToast(message: string, type: 'success' | 'error' = 'success') {
  toast.message = message
  toast.type = type
  toast.show = true
  setTimeout(() => { toast.show = false }, 2500)
}
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f0f2f5;
  color: #333;
  min-height: 100vh;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

/* ========== 顶部栏 ========== */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 60px;
  background: #1a1a2e;
  color: #fff;
  flex-shrink: 0;
  gap: 24px;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 24px;
  flex: 1;
  overflow: hidden;
}

.logo {
  font-size: 18px;
  font-weight: 700;
  white-space: nowrap;
  color: #e84a6e;
}

.template-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  flex: 1;
}

.template-tabs::-webkit-scrollbar { display: none; }

.tab-btn {
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.2);
  background: transparent;
  color: rgba(255,255,255,0.7);
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.tab-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
.tab-btn.active { background: #e84a6e; border-color: #e84a6e; color: #fff; }

.topbar-right { flex-shrink: 0; }

/* ========== 按钮 ========== */
.btn-primary {
  padding: 8px 20px;
  background: linear-gradient(135deg, #e84a6e, #ff6b8a);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-primary:hover:not(:disabled) { opacity: 0.9; }

.btn-secondary {
  padding: 8px 16px;
  background: #fff;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.btn-secondary:hover { background: #f5f5f5; }

.btn-clear {
  padding: 4px 12px;
  background: #ff4757;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  margin-top: 8px;
}

/* ========== 工作区 ========== */
.workspace {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ========== 画布面板 ========== */
.canvas-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #e8eef5;
  overflow: hidden;
}

.canvas-header {
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #eee;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.canvas-hint { font-weight: 400; color: #999; font-size: 12px; }

.canvas-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  justify-content: center;
}

.canvas-phone {
  width: 320px;
  background: #fff;
  border-radius: 32px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
}

/* ========== 格子 ========== */
.cell-group { padding: 0; }

.cell {
  position: relative;
  border: 2px dashed transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.cell:hover { border-color: #e84a6e; }

.cell.selected {
  border-color: #e84a6e !important;
  box-shadow: inset 0 0 0 2px rgba(232,74,110,0.2);
}

.cell-label {
  position: absolute;
  bottom: 4px;
  right: 8px;
  font-size: 10px;
  color: rgba(255,255,255,0.8);
  background: rgba(0,0,0,0.4);
  padding: 2px 6px;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.cell:hover .cell-label,
.cell.selected .cell-label { opacity: 1; }

/* 图片格子 */
.image-cell { min-height: 200px; overflow: hidden; }

.cell-img {
  width: 100%;
  height: 100%;
  min-height: 200px;
  object-fit: cover;
  display: block;
}

.cell-placeholder {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #f5f5f5;
  color: #aaa;
}

.cell-placeholder span { font-size: 40px; }
.cell-placeholder text { font-size: 12px; }

/* 文字格子 */
.text-cell {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: #fff;
  min-height: 60px;
}

.text-cell.tall { min-height: 120px; }

.cell-text {
  word-break: break-word;
  white-space: pre-wrap;
}

.cell-text.small { font-size: 14px; opacity: 0.8; }

/* 分隔装饰 */
.divider-cell {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  background: #fff;
  gap: 12px;
}

.divider-line { flex: 1; height: 1px; background: #e84a6e; opacity: 0.4; }
.divider-icon { font-size: 24px; color: #e84a6e; }

/* 基本信息区 */
.info-area {
  background: #fff8fa;
  padding: 24px 20px;
  text-align: center;
  border-top: 1px solid #f0e0e5;
}

.info-names { display: flex; align-items: center; justify-content: center; gap: 16px; font-size: 18px; font-weight: 600; margin-bottom: 8px; }
.info-and { font-size: 24px; color: #e84a6e; }
.info-detail { font-size: 13px; color: #999; margin-bottom: 4px; }
.info-hint { font-size: 11px; color: #ccc; }

/* ========== 属性面板 ========== */
.property-panel {
  width: 340px;
  flex-shrink: 0;
  background: #fff;
  border-left: 1px solid #eee;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  font-weight: 600;
  font-size: 15px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-hint { font-size: 12px; color: #e84a6e; font-weight: 400; }

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.field-group { margin-bottom: 16px; }

.field-label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
  font-weight: 500;
}

.field-input, .field-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  background: #fafafa;
}

.field-input:focus, .field-select:focus {
  outline: none;
  border-color: #e84a6e;
}

.field-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  min-height: 80px;
  background: #fafafa;
  font-family: inherit;
}

.field-textarea:focus { outline: none; border-color: #e84a6e; }

.field-range { width: 100%; cursor: pointer; accent-color: #e84a6e; }
.field-color { width: 100%; height: 36px; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; margin-top: 4px; }

/* 颜色格子 */
.color-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: transform 0.15s;
}

.color-swatch:hover { transform: scale(1.15); }
.color-swatch.active { border-color: #333; transform: scale(1.15); }

/* 图片上传区 */
.image-upload-area {
  border: 2px dashed #ddd;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s;
}

.image-upload-area:hover { border-color: #e84a6e; }

.upload-preview { width: 100%; height: 120px; object-fit: cover; display: block; }
.upload-placeholder { display: flex; flex-direction: column; align-items: center; gap: 8px; color: #aaa; font-size: 12px; }
.upload-placeholder span { font-size: 32px; }

/* 底部操作栏 */
.panel-footer {
  padding: 16px 20px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.panel-footer .btn-primary { flex: 1; padding: 10px; text-align: center; }
.panel-footer .btn-secondary { flex: 1; }

/* ========== Toast ========== */
.toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 24px;
  border-radius: 24px;
  font-size: 14px;
  color: #fff;
  z-index: 9999;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}

.toast.success { background: #2ecc71; }
.toast.error { background: #e74c3c; }
</style>
