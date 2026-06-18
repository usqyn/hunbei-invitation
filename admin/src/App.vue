<template>
  <div class="app" @keydown="onKeyDown" tabindex="0" ref="appRootRef">
    <!-- ============ 顶部工具栏 ============ -->
    <header class="toolbar">
      <div class="toolbar-left">
        <span class="logo">🎨 婚贝模板制作</span>
        <span class="toolbar-divider"></span>

        <button class="tb-btn" :disabled="!canUndo" @click="undo" title="撤销 (Ctrl+Z)">
          ↶ 撤销
        </button>
        <button class="tb-btn" :disabled="!canRedo" @click="redo" title="重做 (Ctrl+Y)">
          ↷ 重做
        </button>

        <span class="toolbar-divider"></span>

        <button class="tb-btn primary" @click="addText">✎ 添加文字</button>
        <button class="tb-btn" @click="triggerImageUpload">🖼 添加图片</button>
        <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="onImageFile" />

        <span class="toolbar-divider"></span>

        <!-- 画布尺寸 -->
        <select class="tb-select" v-model="sizeLabel" @change="onPresetChange">
          <option v-for="p in CANVAS_PRESETS" :key="p.label" :value="p.label">{{ p.label }}</option>
        </select>
      </div>

      <div class="toolbar-right">
        <span class="zoom-label">缩放 {{ Math.round(zoom * 100) }}%</span>
        <button class="tb-btn sm" @click="zoom = Math.max(0.3, zoom - 0.1)">−</button>
        <button class="tb-btn sm" @click="zoom = 1">100%</button>
        <button class="tb-btn sm" @click="zoom = Math.min(3, zoom + 0.1)">+</button>
        <span class="toolbar-divider"></span>
        <button class="tb-btn danger" @click="deleteSelected" title="删除选中 (Del)">🗑 删除</button>
        <span class="toolbar-divider"></span>
        <button class="tb-btn publish-btn" @click="showPublishWizard = true" title="发布模板">🚀 发布</button>
        <button class="tb-btn" @click="onExportPNG" title="导出 PNG">📥 导出</button>
      </div>
    </header>

    <!-- ============ 主工作区 ============ -->
    <main class="workspace">
      <!-- 左侧面板 -->
      <aside class="panel panel-left">
        <div class="panel-tabs">
          <button
            class="tab-btn"
            :class="{ active: leftTab === 'material' }"
            @click="leftTab = 'material'"
          >素材</button>
          <button
            class="tab-btn"
            :class="{ active: leftTab === 'layers' }"
            @click="leftTab = 'layers'"
          >图层</button>
          <button
            class="tab-btn"
            :class="{ active: leftTab === 'templates' }"
            @click="loadTemplateList(); leftTab = 'templates'"
          >模板</button>
        </div>

        <!-- 素材 Tab -->
        <div v-if="leftTab === 'material'" class="panel-body">
          <div class="section-title">文字</div>
          <div class="material-grid">
            <button class="material-item text-item" @click="addText({ content: '标题文字', fontSize: 32, fontWeight: 'bold' as any })">
              <span class="mi-label">大标题</span>
            </button>
            <button class="material-item text-item" @click="addText({ content: '副标题文字', fontSize: 20 } as any)">
              <span class="mi-label small">副标题</span>
            </button>
            <button class="material-item text-item" @click="addText({ content: '一段正文文字，可换行编辑。', fontSize: 16, textAlign: 'left' as any } as any)">
              <span class="mi-label small">正文</span>
            </button>
          </div>
          <div class="section-divider"></div>
          <div class="section-title">背景颜色</div>
          <div class="color-grid">
            <button v-for="c in bgColors" :key="c" class="color-chip" :style="{ background: c }" @click="setBackground({ type: 'solid', color1: c } as any)"></button>
          </div>
          <div class="section-title">背景渐变</div>
          <div class="color-grid">
            <button v-for="(g, idx) in gradients" :key="'g' + idx" class="color-chip wide" :style="{ background: g.css }" @click="setBackground({ type: 'linear-gradient', color1: g.c1, color2: g.c2, angle: g.angle } as any)"></button>
          </div>
          <div class="section-title">上传背景图</div>
          <label class="upload-btn">点击上传背景图<input type="file" accept="image/*" style="display:none" @change="onBgImageFile" /></label>
          <div class="section-divider"></div>
          <div class="section-title">素材库</div>
          <div class="mat-category-scroll">
            <div class="mat-cats">
              <button v-for="cat in materialCategories" :key="cat" class="mat-cat-btn" :class="{ active: activeMaterialCat === cat }" @click="activeMaterialCat = cat">{{ cat }}</button>
            </div>
          </div>
          <div class="mat-grid">
            <div v-for="mat in filteredMaterials" :key="mat.id" class="mat-item" draggable="true" @dragstart="onMaterialDragStart($event, mat)" @click="onMaterialClick(mat)" :title="mat.name">
              <div v-if="mat.type === 'shape'" class="mat-shape" v-html="mat.svg" :style="{ color: mat.color || '#333' }"></div>
              <div v-else class="mat-emoji">{{ mat.emoji }}</div>
              <div class="mat-name">{{ mat.name }}</div>
            </div>
          </div>
        </div>

        <!-- 图层 Tab -->
        <div v-if="leftTab === 'layers'" class="panel-body">
          <div v-if="layers.length === 0" class="empty-hint">画布暂无元素<br/>点击「添加文字/图片」开始</div>
          <div v-for="el in layers" :key="el.id" class="layer-row" :class="{ active: selectedId === el.id }">
            <span class="layer-icon" @click="selectElement(el.id)">{{ el.type === 'text' ? 'T' : el.type === 'image' ? '🖼' : '✦' }}</span>
            <span class="layer-name" @click="selectElement(el.id)">{{ el.name }}</span>
            <button class="layer-btn" :class="{ off: !el.visible }" @click="toggleVisibility(el.id)" :title="el.visible ? '隐藏' : '显示'">👁</button>
            <button class="layer-btn" :class="{ off: !el.locked }" @click="toggleLock(el.id)" :title="el.locked ? '解锁' : '锁定'">🔒</button>
            <button class="layer-btn" @click="bringForward(el.id)" title="上移一层">⬆</button>
            <button class="layer-btn" @click="sendBackwards(el.id)" title="下移一层">⬇</button>
            <button class="layer-btn" @click="bringToFront(el.id)" title="置于顶层">🔝</button>
            <button class="layer-btn" @click="sendToBack(el.id)" title="置于底层">🔻</button>
            <button class="layer-btn danger" @click="deleteElement(el.id)" title="删除">🗑</button>
          </div>
        </div>

        <!-- 模板 Tab -->
        <div v-if="leftTab === 'templates'" class="panel-body templates-body">
          <button class="btn-new-template" @click="createNewFromCanvas">+ 新建空白模板</button>
          <div v-if="loadingTemplates" class="empty-hint">加载中...</div>
          <div v-else-if="!templateList.length" class="empty-hint">暂无模板<br/>先在画布制作，再发布</div>
          <div v-for="tpl in templateList" :key="tpl.id" class="template-item" :class="{ active: currentTemplateId === tpl.id }">
            <div class="tpl-thumb" @click="onLoadTemplate(tpl.id)">
              <img v-if="tpl.cover" :src="tpl.cover.startsWith('http') ? tpl.cover : API_BASE + tpl.cover" class="tpl-thumb-img" />
              <div v-else class="tpl-thumb-placeholder">📄</div>
            </div>
            <div class="tpl-info" @click="onLoadTemplate(tpl.id)">
              <div class="tpl-name">{{ tpl.name }}</div>
              <div class="tpl-cat">{{ getCategoryName(tpl.category) }}</div>
            </div>
            <div class="tpl-actions">
              <button class="tpl-btn" @click="onCloneTemplate(tpl)" title="克隆">📋</button>
              <button class="tpl-btn danger" @click="onDeleteTemplate(tpl)" title="删除">🗑</button>
            </div>
          </div>
          <div class="section-divider"></div>
          <div class="section-title">历史版本</div>
          <div v-if="historyVersions.length === 0" class="empty-hint small">无历史记录</div>
          <div v-for="(ver, idx) in historyVersions" :key="ver.ts" class="history-item" @click="onRestoreVersion(idx)">
            <span class="history-label">v{{ historyVersions.length - idx }}</span>
            <span class="history-desc">{{ ver.description }}</span>
            <span class="history-time">{{ formatTime(ver.ts) }}</span>
          </div>
        </div>
      </aside>

      <!-- 中间画布 -->
      <section class="canvas-area">
        <div class="canvas-scroll" @wheel.prevent="onWheel">
          <div
            class="phone-frame"
            :style="{
              width: (canvasSize.width * zoom) + 'px',
              height: (canvasSize.height * zoom) + 'px',
            }"
          >
            <div
              class="phone-notch"
              :style="{ width: (40 * zoom) + 'px', height: (6 * zoom) + 'px' }"
            ></div>
            <canvas
              ref="canvasRef"
              class="fabric-canvas"
              :style="{
                width: (canvasSize.width * zoom) + 'px',
                height: (canvasSize.height * zoom) + 'px',
              }"
              @dragover="onCanvasDragOver"
              @drop="onCanvasDrop"
            ></canvas>
            <div
              class="phone-home"
              :style="{ width: (80 * zoom) + 'px', height: (6 * zoom) + 'px' }"
            ></div>
          </div>
        </div>

        <!-- 画布底部状态栏 -->
        <div class="canvas-footer">
          <span>画布：{{ canvasSize.width }} × {{ canvasSize.height }}</span>
          <span v-if="selectedId">已选中：{{ selectedElement?.type === 'text' ? '文字' : '图片' }}（{{ canvasSize.width }} × {{ canvasSize.height }}）</span>
          <span v-else>未选中元素 · 提示：点击画布元素以编辑</span>
        </div>
      </section>

      <!-- 右侧属性面板 -->
      <aside class="panel panel-right">
        <div class="panel-tabs">
          <button class="tab-btn active">属性</button>
        </div>

        <div class="panel-body">
          <!-- 未选中：显示画布属性 -->
          <template v-if="!selectedElement">
            <div class="section-title">画布背景</div>
            <div class="form-row">
              <label>类型</label>
              <select class="form-input" v-model="bgType">
                <option value="solid">纯色</option>
                <option value="linear-gradient">线性渐变</option>
                <option value="radial-gradient">径向渐变</option>
                <option value="image">图片</option>
              </select>
            </div>

            <div class="form-row" v-if="bgType === 'solid' || bgType === 'linear-gradient' || bgType === 'radial-gradient'">
              <label>主色</label>
              <input type="color" class="form-input color" v-model="bgColor1" @change="onBgColorChange" />
            </div>
            <div class="form-row" v-if="bgType === 'linear-gradient' || bgType === 'radial-gradient'">
              <label>副色</label>
              <input type="color" class="form-input color" v-model="bgColor2" @change="onBgColorChange" />
            </div>
            <div class="form-row" v-if="bgType === 'linear-gradient'">
              <label>角度 {{ bgAngle }}°</label>
              <input type="range" class="form-input" min="0" max="180" v-model.number="bgAngle" @change="onBgColorChange" />
            </div>

            <div class="form-row" v-if="bgType === 'image'">
              <label>上传图片</label>
              <label class="upload-btn small">
                点击上传背景
                <input type="file" accept="image/*" style="display:none" @change="onBgImageFile" />
              </label>
            </div>

            <div class="form-row" v-if="bgType === 'image'">
              <label>填充模式</label>
              <select class="form-input" v-model="bgScale" @change="onBgImageChange">
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="fill">Fill</option>
              </select>
            </div>

            <div class="form-row" v-if="bgType === 'image'">
              <label>透明度 {{ bgOpacity }}%</label>
              <input type="range" class="form-input" min="0" max="100" v-model.number="bgOpacity" @change="onBgImageChange" />
            </div>

            <div class="section-divider"></div>
            <div class="section-title">画布尺寸</div>
            <div class="form-row">
              <label>预设</label>
              <select class="form-input" v-model="sizeLabel" @change="onPresetChange">
                <option v-for="p in CANVAS_PRESETS" :key="p.label" :value="p.label">{{ p.label }}</option>
              </select>
            </div>
            <div class="form-row two-col">
              <div>
                <label>宽</label>
                <input type="number" class="form-input" :value="canvasSize.width" @change="e => onManualSize(e, 'width')" />
              </div>
              <div>
                <label>高</label>
                <input type="number" class="form-input" :value="canvasSize.height" @change="e => onManualSize(e, 'height')" />
              </div>
            </div>
          </template>

          <!-- 文字元素属性 -->
          <template v-else-if="selectedElement.type === 'text'">
            <div class="section-title">文字内容</div>
            <textarea
              class="form-textarea"
              :value="(selectedElement as any).content"
              @change="e => updateSelected({ content: (e.target as HTMLTextAreaElement).value })"
            ></textarea>

            <div class="section-title">字体与大小</div>
            <div class="form-row">
              <label>字体</label>
              <select
                class="form-input"
                :value="(selectedElement as any).fontFamily"
                @change="e => updateSelected({ fontFamily: (e.target as HTMLSelectElement).value })"
              >
                <option v-for="f in fontList" :key="f" :value="f">{{ f }}</option>
              </select>
            </div>
            <div class="form-row two-col">
              <div>
                <label>字号</label>
                <input
                  type="number"
                  class="form-input"
                  :value="(selectedElement as any).fontSize"
                  min="8" max="120"
                  @change="e => updateSelected({ fontSize: Number((e.target as HTMLInputElement).value) })"
                />
              </div>
              <div>
                <label>样式</label>
                <select
                  class="form-input"
                  :value="fontStyleLabel(selectedElement as any)"
                  @change="e => onFontStyleChange((e.target as HTMLSelectElement).value)"
                >
                  <option value="normal">正常</option>
                  <option value="bold">加粗</option>
                  <option value="italic">斜体</option>
                  <option value="bold-italic">加粗+斜体</option>
                </select>
              </div>
            </div>

            <div class="section-title">对齐与行高</div>
            <div class="form-row">
              <label>对齐</label>
              <div class="btn-group">
                <button
                  class="btn-seg"
                  :class="{ active: (selectedElement as any).textAlign === 'left' }"
                  @click="updateSelected({ textAlign: 'left' })"
                >左</button>
                <button
                  class="btn-seg"
                  :class="{ active: (selectedElement as any).textAlign === 'center' }"
                  @click="updateSelected({ textAlign: 'center' })"
                >中</button>
                <button
                  class="btn-seg"
                  :class="{ active: (selectedElement as any).textAlign === 'right' }"
                  @click="updateSelected({ textAlign: 'right' })"
                >右</button>
              </div>
            </div>
            <div class="form-row">
              <label>行高 {{ (selectedElement as any).lineHeight.toFixed(2) }}</label>
              <input
                type="range"
                class="form-input"
                min="1" max="3" step="0.1"
                :value="(selectedElement as any).lineHeight"
                @change="e => updateSelected({ lineHeight: Number((e.target as HTMLInputElement).value) })"
              />
            </div>
            <div class="form-row">
              <label>字间距 {{ (selectedElement as any).letterSpacing }}px</label>
              <input
                type="range"
                class="form-input"
                min="-5" max="30" step="1"
                :value="(selectedElement as any).letterSpacing"
                @change="e => updateSelected({ letterSpacing: Number((e.target as HTMLInputElement).value) })"
              />
            </div>

            <div class="section-title">颜色与描边</div>
            <div class="form-row two-col">
              <div>
                <label>文字色</label>
                <input
                  type="color"
                  class="form-input color"
                  :value="(selectedElement as any).color"
                  @change="e => updateSelected({ color: (e.target as HTMLInputElement).value })"
                />
              </div>
              <div>
                <label>透明度 {{ Math.round(((selectedElement as any).opacity) * 100) }}%</label>
                <input
                  type="range"
                  class="form-input"
                  min="0" max="100"
                  :value="Math.round(((selectedElement as any).opacity) * 100)"
                  @change="e => updateSelected({ opacity: Number((e.target as HTMLInputElement).value) / 100 })"
                />
              </div>
            </div>
            <div class="form-row two-col">
              <div>
                <label>描边色</label>
                <input
                  type="color"
                  class="form-input color"
                  :value="(selectedElement as any).strokeColor || '#000000'"
                  @change="e => updateSelected({ strokeColor: (e.target as HTMLInputElement).value })"
                />
              </div>
              <div>
                <label>描边宽度 {{ (selectedElement as any).strokeWidth }}px</label>
                <input
                  type="range"
                  class="form-input"
                  min="0" max="10" step="1"
                  :value="(selectedElement as any).strokeWidth"
                  @change="e => updateSelected({ strokeWidth: Number((e.target as HTMLInputElement).value) })"
                />
              </div>
            </div>

            <div class="section-title">阴影</div>
            <div class="form-row two-col">
              <div>
                <label>阴影色</label>
                <input
                  type="color"
                  class="form-input color"
                  :value="(selectedElement as any).shadowColor || '#000000'"
                  @change="e => updateSelected({ shadowColor: (e.target as HTMLInputElement).value })"
                />
              </div>
              <div>
                <label>模糊 {{ (selectedElement as any).shadowBlur }}px</label>
                <input
                  type="range"
                  class="form-input"
                  min="0" max="30" step="1"
                  :value="(selectedElement as any).shadowBlur"
                  @change="e => updateSelected({ shadowBlur: Number((e.target as HTMLInputElement).value) })"
                />
              </div>
            </div>

            <div class="section-title">旋转</div>
            <div class="form-row">
              <label>角度 {{ Math.round((selectedElement as any).rotation) }}°</label>
              <input
                type="range"
                class="form-input"
                min="-180" max="180"
                :value="Math.round((selectedElement as any).rotation)"
                @change="e => updateSelected({ rotation: Number((e.target as HTMLInputElement).value) })"
              />
            </div>
          </template>

          <!-- 图片元素属性 -->
          <template v-else-if="selectedElement.type === 'image'">
            <div class="section-title">图片</div>
            <div class="form-row">
              <label>替换图片</label>
              <label class="upload-btn small">
                点击上传
                <input type="file" accept="image/*" style="display:none" @change="onImageReplaceFile" />
              </label>
            </div>
            <div class="form-row two-col">
              <div>
                <label>透明度 {{ Math.round(((selectedElement as any).opacity) * 100) }}%</label>
                <input
                  type="range"
                  class="form-input"
                  min="0" max="100"
                  :value="Math.round(((selectedElement as any).opacity) * 100)"
                  @change="e => updateSelected({ opacity: Number((e.target as HTMLInputElement).value) / 100 })"
                />
              </div>
              <div>
                <label>旋转 {{ Math.round((selectedElement as any).rotation) }}°</label>
                <input
                  type="range"
                  class="form-input"
                  min="-180" max="180"
                  :value="Math.round((selectedElement as any).rotation)"
                  @change="e => updateSelected({ rotation: Number((e.target as HTMLInputElement).value) })"
                />
              </div>
            </div>
            <div class="section-title">填充模式</div>
            <div class="form-row">
              <label>填充</label>
              <select
                class="form-input"
                :value="(selectedElement as any).scale"
                @change="e => updateSelected({ scale: (e.target as HTMLSelectElement).value } as any)"
              >
                <option value="cover">cover</option>
                <option value="contain">contain</option>
                <option value="fill">fill</option>
                <option value="none">none</option>
              </select>
            </div>
            <div class="section-title">剪裁形状（标记用）</div>
            <div class="btn-group">
              <button
                class="btn-seg"
                :class="{ active: (selectedElement as any).mask === 'rect' }"
                @click="updateSelected({ mask: 'rect' } as any)"
              >矩形</button>
              <button
                class="btn-seg"
                :class="{ active: (selectedElement as any).mask === 'rounded' }"
                @click="updateSelected({ mask: 'rounded' } as any)"
              >圆角</button>
              <button
                class="btn-seg"
                :class="{ active: (selectedElement as any).mask === 'circle' }"
                @click="updateSelected({ mask: 'circle' } as any)"
              >圆形</button>
              <button
                class="btn-seg"
                :class="{ active: (selectedElement as any).mask === 'heart' }"
                @click="updateSelected({ mask: 'heart' } as any)"
              >心</button>
            </div>
            <div class="section-title">对齐</div>
            <div class="btn-group">
              <button class="btn-seg" @click="alignLeft(selectedElement.id)" title="左对齐">←</button>
              <button class="btn-seg" @click="alignCenter(selectedElement.id)" title="水平居中">⇄</button>
              <button class="btn-seg" @click="alignRight(selectedElement.id)" title="右对齐">→</button>
            </div>
            <div class="btn-group">
              <button class="btn-seg" @click="alignTop(selectedElement.id)" title="顶部对齐">↑</button>
              <button class="btn-seg" @click="alignMiddle(selectedElement.id)" title="垂直居中">⇅</button>
              <button class="btn-seg" @click="alignBottom(selectedElement.id)" title="底部对齐">↓</button>
            </div>
          </template>

          <!-- 未知元素 -->
          <template v-else>
            <div class="empty-hint">不支持的元素类型</div>
          </template>
        </div>
      </aside>
    </main>

    <!-- 发布向导 -->
    <PublishWizard
      :visible="showPublishWizard"
      :canvasSize="canvasSize"
      :elementCount="elements.length"
      :getDraft="getDraft"
      :getCanvasEl="getCanvasEl"
      @close="showPublishWizard = false"
      @published="onTemplatePublished"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useCanvas } from './composables/useCanvas'
import {
  uploadImage,
  API_BASE,
  fetchTemplates,
  fetchTemplate,
  deleteTemplate,
  fetchVersion,
} from './composables/useApi'
import PublishWizard from './components/PublishWizard.vue'
import type { TextElement, ImageElement, CanvasBackground, CanvasSize, AnyCanvasElement, HistorySnapshot } from './types/canvas'
import { CANVAS_PRESETS, DEFAULT_CANVAS_SIZE } from './types/canvas'
import { CATEGORIES } from './types/template'
import { ALL_MATERIALS, getMaterialCategories, getMaterialsByCategory } from './constants/materials'

// 字体列表
const fontList = [
  '思源宋体, serif',
  '思源黑体, sans-serif',
  '华文楷体, KaiTi, serif',
  '华文行楷, serif',
  '华文隶书, serif',
  'Arial, sans-serif',
  'Georgia, serif',
]

// 颜色与渐变预设
const bgColors = [
  '#ffffff', '#f5f5f5', '#fff3e0', '#ffe0b2', '#f8bbd0',
  '#f8d7da', '#e1bee7', '#d1c4e9', '#c5cae9', '#b3e5fc',
  '#b2ebf2', '#b2dfdb', '#c8e6c9', '#dcedc8', '#fff9c4',
  '#f0f4c3', '#ffebee', '#e3f2fd', '#e8eaf6', '#fce4ec',
]

const gradients = [
  { css: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)', c1: '#fce4ec', c2: '#f8bbd0', angle: 135 },
  { css: 'linear-gradient(180deg, #e3f2fd 0%, #90caf9 100%)', c1: '#e3f2fd', c2: '#90caf9', angle: 180 },
  { css: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)', c1: '#e8f5e9', c2: '#c8e6c9', angle: 135 },
  { css: 'linear-gradient(135deg, #fff3e0 0%, #ffcc80 100%)', c1: '#fff3e0', c2: '#ffcc80', angle: 135 },
  { css: 'linear-gradient(135deg, #f3e5f5 0%, #ce93d8 100%)', c1: '#f3e5f5', c2: '#ce93d8', angle: 135 },
  { css: 'linear-gradient(135deg, #e0e0e0 0%, #9e9e9e 100%)', c1: '#e0e0e0', c2: '#9e9e9e', angle: 135 },
  { css: 'linear-gradient(180deg, #ffffff 0%, #f5f5f5 100%)', c1: '#ffffff', c2: '#f5f5f5', angle: 180 },
  { css: 'linear-gradient(135deg, #ffecb3 0%, #ffe082 100%)', c1: '#ffecb3', c2: '#ffe082', angle: 135 },
]

// ============ DOM refs ============
const appRootRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

// ============ 本地状态 ============
const leftTab = ref<'material' | 'layers' | 'templates'>('material')
const sizeLabel = ref('375 × 667')

// 背景 UI 状态
const bgType = ref<'solid' | 'linear-gradient' | 'radial-gradient' | 'image'>('solid')
const bgColor1 = ref('#ffffff')
const bgColor2 = ref('#f5f5f5')
const bgAngle = ref(180)
const bgScale = ref<'contain' | 'cover' | 'fill' | 'none'>('cover')
const bgOpacity = ref(100)

// ============ 画布 composable ============
const {
  canvasSize,
  background,
  selectedId,
  selectedElement,
  elements,
  zoom,
  canUndo,
  canRedo,
  init,
  setSize,
  setBackground,
  addText: canvasAddText,
  addImage: canvasAddImage,
  deleteSelected,
  deleteElement,
  toggleVisibility,
  toggleLock,
  selectElement,
  updateSelected,
  bringToFront,
  sendToBack,
  bringForward,
  sendBackwards,
  copySelected,
  pasteFromClipboard,
  alignLeft,
  alignCenter,
  alignRight,
  alignTop,
  alignMiddle,
  alignBottom,
  undo,
  redo,
  pushHistory,
  getDraft,
  loadDraft,
  clearCanvas,
} = useCanvas({
  canvasRef,
  initialSize: { ...DEFAULT_CANVAS_SIZE },
  onSelectionChange: (el) => {
    // 选中元素时，同步 UI 状态到画布
    console.log('selected:', el?.id)
  },
  onBackgroundChange: (bg) => {
    // 同步 App.vue 本地背景状态
    bgType.value = bg.type
    bgColor1.value = bg.color1
    bgColor2.value = bg.color2 ?? bg.color1
    bgAngle.value = bg.angle ?? 180
  },
})

// 图层：按 zIndex 降序显示（最上层排第一）
const layers = computed(() => [...elements.value].sort((a, b) => b.zIndex - a.zIndex))

// ============ Phase 2: 素材库 ============
const materialCategories = getMaterialCategories()
const activeMaterialCat = ref('全部')
const filteredMaterials = computed(() => getMaterialsByCategory(activeMaterialCat.value))

function onMaterialDragStart(e: DragEvent, mat: any) {
  if (e.dataTransfer) {
    e.dataTransfer.setData('application/json', JSON.stringify(mat))
    e.dataTransfer.effectAllowed = 'copy'
  }
}

function onMaterialClick(mat: any) {
  const cx = canvasSize.value.width / 2
  const cy = canvasSize.value.height / 2
  if (mat.type === 'shape' && mat.svg) {
    const blob = new Blob([mat.svg], { type: 'image/svg+xml' })
    const reader = new FileReader()
    reader.onload = () => {
      canvasAddImage(reader.result as string, {
        x: cx, y: cy, width: 100, height: 100, name: mat.name,
      } as any)
    }
    reader.readAsDataURL(blob)
  } else if (mat.type === 'sticker' && mat.emoji) {
    canvasAddText({ content: mat.emoji, x: cx, y: cy, fontSize: 48, fontFamily: 'Arial, sans-serif', textAlign: 'center', name: mat.name })
  }
}

function onRestoreVersion(idx: number) {
  const ver = historyVersions.value[idx]
  if (!ver) return
  if (!confirm(`恢复到 v${historyVersions.value.length - idx}？当前未保存的更改将丢失。`)) return
  loadDraft(ver.draft)
}

async function onCanvasDrop(e: DragEvent) {
  e.preventDefault()
  const json = e.dataTransfer?.getData('application/json')
  if (!json) return
  try {
    const mat = JSON.parse(json)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom.value
    const y = (e.clientY - rect.top) / zoom.value

    if (mat.type === 'shape' && mat.svg) {
      // 将 SVG 转为 data URL，再通过图片元素方式加入
      const blob = new Blob([mat.svg], { type: 'image/svg+xml' })
      const reader = new FileReader()
      reader.onload = () => {
        canvasAddImage(reader.result as string, {
          x, y,
          width: 100,
          height: 100,
          name: mat.name,
        } as any)
      }
      reader.readAsDataURL(blob)
    } else if (mat.type === 'sticker' && mat.emoji) {
      // emoji 贴纸：作为文字加入
      canvasAddText({
        content: mat.emoji,
        x, y,
        fontSize: 48,
        fontFamily: 'Arial, sans-serif',
        textAlign: 'center',
        name: mat.name,
      })
    }
  } catch (_) {}
}

function onCanvasDragOver(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
}

// ============ Phase 3: 模板列表 ============
const templateList = ref<any[]>([])
const loadingTemplates = ref(false)
const currentTemplateId = ref<string | null>(null)
const showPublishWizard = ref(false)
const historyVersions = ref<Array<{ description: string; ts: number; draft: any }>>([])
const autoSaveTimer = ref<ReturnType<typeof setInterval> | null>(null)

function getCanvasEl(): HTMLCanvasElement | null {
  return canvasRef.value || null
}

async function loadTemplateList() {
  loadingTemplates.value = true
  try {
    templateList.value = await fetchTemplates()
  } catch (e) {
    console.error('loadTemplateList error:', e)
    templateList.value = []
  } finally {
    loadingTemplates.value = false
  }
}

async function onLoadTemplate(id: string) {
  try {
    const tpl = await fetchTemplate(id)
    // 将 API 模板转成 CanvasDraft 格式
    const draft = {
      canvasSize: { width: 375, height: 667 },
      background: { type: 'solid', color1: '#ffffff' },
      elements: (tpl.elements || []).map((el: any, idx: number) => ({
        id: el.id || `el_${idx}`,
        type: el.type,
        name: el.label || (el.type === 'text' ? '文字' : '图片'),
        x: 187,
        y: 200 + idx * 80,
        width: 240,
        height: 60,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        zIndex: idx,
        content: el.text || '',
        fontFamily: el.style?.font || '思源宋体, serif',
        fontSize: el.style?.fontSize || 24,
        fontWeight: 'normal',
        fontStyle: 'normal',
        color: el.style?.color || '#333333',
        textAlign: 'center',
        lineHeight: el.style?.lineHeight || 1.5,
        letterSpacing: el.style?.spacing || 2,
        strokeColor: 'transparent',
        strokeWidth: 0,
        shadowColor: 'transparent',
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowBlur: 0,
        src: el.type === 'image' ? (tpl.data as any)?.[el.dataKey] || '' : '',
        scale: 'cover',
        mask: 'rect',
        borderRadius: 0,
        borderColor: 'transparent',
        borderWidth: 0,
        brightness: 100,
        contrast: 0,
        blur: 0,
        grayscale: 0,
        saturate: 100,
      })),
    }
    loadDraft(draft)
    currentTemplateId.value = id
  } catch (e) {
    alert('加载模板失败：' + (e as Error).message)
  }
}

function onCloneTemplate(tpl: any) {
  currentTemplateId.value = null
  onLoadTemplate(tpl.id)
}

async function onDeleteTemplate(tpl: any) {
  if (!confirm(`确定删除模板「${tpl.name}」？`)) return
  try {
    await deleteTemplate(tpl.id)
    await fetchVersion()
    templateList.value = templateList.value.filter(t => t.id !== tpl.id)
  } catch (e) {
    alert('删除失败：' + (e as Error).message)
  }
}

function getCategoryName(catId: string): string {
  return CATEGORIES.find(c => c.id === catId)?.name || catId
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

function createNewFromCanvas() {
  currentTemplateId.value = null
  clearCanvas()
  historyVersions.value = []
  pushHistory('new')
}

// ============ Phase 4: 发布与导出 ============
function onExportPNG() {
  const canvas = getCanvasEl()
  if (!canvas) return
  const dataUrl = canvas.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `hunbei-template-${Date.now()}.png`
  a.click()
}

function onTemplatePublished(id: string) {
  showPublishWizard.value = false
  loadTemplateList()
  currentTemplateId.value = id
}

// ============ 本地草稿自动保存 ============
const DRAFT_KEY = 'hunbei-draft-v1'
const AUTO_SAVE_INTERVAL = 30_000 // 30 秒

function saveDraftToLocal() {
  try {
    const draft = getDraft()
    draft._savedAt = Date.now()
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch (_) {}
}

function restoreDraftFromLocal() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return false
    const draft = JSON.parse(raw)
    if (draft && Array.isArray(draft.elements)) {
      loadDraft(draft)
      return true
    }
  } catch (_) {}
  return false
}

onBeforeUnmount(() => {
  if (autoSaveTimer.value) clearInterval(autoSaveTimer.value)
  saveDraftToLocal()
})

// ============ 事件处理 ============

// 文字添加：支持传入一些初始属性
function addText(partial?: Partial<TextElement>) {
  canvasAddText(partial)
  // 自动切换到图层 Tab 便于看到新元素
  // leftTab.value = 'layers'
}

// 文件上传
function triggerImageUpload() {
  fileInput.value?.click()
}

async function onImageFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    // 读成 DataURL：离线可用 + 预览快速
    const dataUrl = await fileToDataURL(file)
    await canvasAddImage(dataUrl)
  } catch (err) {
    alert('图片上传失败：' + (err as Error).message)
  } finally {
    input.value = ''
  }
}

async function onImageReplaceFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !selectedId.value) return
  try {
    const dataUrl = await fileToDataURL(file)
    // 先通过 API：把真实图片上传到服务器（可选）
    // 在阶段 1 中我们只把图片加到画布上，用于替换所选图片
    // 简单做法：删除当前元素 → 添加新图片
    const id = selectedId.value
    deleteElement(id)
    await canvasAddImage(dataUrl)
  } catch (err) {
    alert('图片上传失败：' + (err as Error).message)
  } finally {
    input.value = ''
  }
}

async function onBgImageFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const dataUrl = await fileToDataURL(file)
    bgType.value = 'image'
    setBackground({ type: 'image', imageUrl: dataUrl, imageScale: bgScale.value, imageOpacity: bgOpacity.value / 100, color1: bgColor1.value })
  } catch (err) {
    alert('图片上传失败：' + (err as Error).message)
  } finally {
    input.value = ''
  }
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// 背景设置：类型改变 / 颜色改变
function onBgColorChange() {
  setBackground({
    type: bgType.value,
    color1: bgColor1.value,
    color2: bgColor2.value,
    angle: bgAngle.value,
  })
}

function onBgImageChange() {
  if (bgType.value === 'image' && background.value.imageUrl) {
    setBackground({
      type: 'image',
      imageUrl: background.value.imageUrl,
      imageScale: bgScale.value,
      imageOpacity: bgOpacity.value / 100,
      color1: bgColor1.value,
    })
  }
}

// 画布尺寸
function onPresetChange() {
  const preset = CANVAS_PRESETS.find(p => p.label === sizeLabel.value)
  if (preset) {
    setSize({ width: preset.width, height: preset.height })
  }
}

function onManualSize(e: Event, side: 'width' | 'height') {
  const value = Number((e.target as HTMLInputElement).value)
  if (!value || value < 50) return
  const newSize: CanvasSize = {
    width: side === 'width' ? value : canvasSize.value.width,
    height: side === 'height' ? value : canvasSize.value.height,
  }
  setSize(newSize)
}

// 文字「加粗/斜体」映射
function fontStyleLabel(el: TextElement): string {
  const b = el.fontWeight === 'bold'
  const i = el.fontStyle === 'italic'
  if (b && i) return 'bold-italic'
  if (b) return 'bold'
  if (i) return 'italic'
  return 'normal'
}

function onFontStyleChange(val: string) {
  const patch: Partial<TextElement> = {}
  if (val === 'bold') { patch.fontWeight = 'bold'; patch.fontStyle = 'normal' }
  else if (val === 'italic') { patch.fontWeight = 'normal'; patch.fontStyle = 'italic' }
  else if (val === 'bold-italic') { patch.fontWeight = 'bold'; patch.fontStyle = 'italic' }
  else { patch.fontWeight = 'normal'; patch.fontStyle = 'normal' }
  updateSelected(patch as any)
}

// ============ 键盘 ============
function onKeyDown(e: KeyboardEvent) {
  // 仅当焦点不在输入框里时响应快捷键
  const target = e.target as HTMLElement
  if (
    target &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' ||
      target.isContentEditable)
  ) {
    // 允许 Ctrl+A 之类，这里我们不拦截
    return
  }

  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
    e.preventDefault()
    undo()
    return
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
    e.preventDefault()
    redo()
    return
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
    e.preventDefault()
    redo()
    return
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
    e.preventDefault()
    copySelected()
    return
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
    e.preventDefault()
    pasteFromClipboard()
    return
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selectedId.value) {
      e.preventDefault()
      deleteSelected()
    }
    return
  }
}

// 滚轮缩放
function onWheel(e: WheelEvent) {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.08 : 0.08
    zoom.value = Math.max(0.3, Math.min(3, zoom.value + delta))
  }
}

// ============ 聚焦根元素以接收键盘事件 ============
onMounted(() => {
  // 1. 聚焦以便接收键盘事件
  setTimeout(() => appRootRef.value?.focus(), 50)
  // 2. 恢复草稿
  if (!restoreDraftFromLocal()) {
    pushHistory('init')
  }
  // 3. 启动定时自动保存
  autoSaveTimer.value = setInterval(saveDraftToLocal, AUTO_SAVE_INTERVAL)
  // 4. 加载模板列表
  loadTemplateList()
})
</script>

<style scoped>
* { box-sizing: border-box; }

/* ====== 根布局 ====== */
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #eef1f6;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', 'Segoe UI', sans-serif;
  color: #333;
  outline: none;
}

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

/* ====== 主工作区 ====== */
.workspace {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

.panel {
  background: #fff;
  display: flex;
  flex-direction: column;
  box-shadow: 0 0 10px rgba(0,0,0,0.05);
  flex-shrink: 0;
}

.panel-left { width: 260px; border-right: 1px solid #e5e7eb; }
.panel-right { width: 320px; border-left: 1px solid #e5e7eb; }

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
.color-chip.wide { grid-column: span 3; aspect-ratio: 2.5 / 1; }

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
.upload-btn.small { padding: 8px; font-size: 12px; }

.empty-hint {
  padding: 40px 16px;
  text-align: center;
  color: #999;
  font-size: 12px;
  line-height: 1.8;
}

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

/* ====== 画布 ====== */
.canvas-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #eef1f6;
  min-width: 0;
  overflow: hidden;
}

.canvas-scroll {
  flex: 1;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  /* 棋盘格背景，便于看到透明元素 */
  background-image:
    linear-gradient(45deg, #e0e4ea 25%, transparent 25%),
    linear-gradient(-45deg, #e0e4ea 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e0e4ea 75%),
    linear-gradient(-45deg, transparent 75%, #e0e4ea 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, 10px 0;
  background-color: #eef1f6;
}

.phone-frame {
  position: relative;
  background: #000;
  border-radius: 40px;
  padding: 24px 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  transition: width 0.2s, height 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.phone-notch {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: #000;
  border-radius: 0 0 8px 8px;
  z-index: 10;
}

.phone-home {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  border-radius: 3px;
  z-index: 10;
}

.fabric-canvas {
  background: #fff;
  display: block;
  /* 由外层容器设置实际尺寸 */
}

.canvas-footer {
  padding: 10px 16px;
  background: #fff;
  border-top: 1px solid #e5e7eb;
  font-size: 12px;
  color: #666;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-shrink: 0;
}

/* ====== 表单 ====== */
.form-row {
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-row.two-col {
  flex-direction: row;
  gap: 8px;
}

.form-row.two-col > div { flex: 1; display: flex; flex-direction: column; gap: 6px; }

label {
  font-size: 11px;
  color: #666;
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #e0e4ea;
  border-radius: 6px;
  font-size: 13px;
  background: #fff;
  transition: border-color 0.15s;
}

.form-input:focus { outline: none; border-color: #1976d2; }

.form-input.color {
  height: 36px;
  padding: 2px;
  cursor: pointer;
}

.form-textarea {
  width: 100%;
  min-height: 72px;
  padding: 8px 10px;
  border: 1px solid #e0e4ea;
  border-radius: 6px;
  font-size: 13px;
  resize: vertical;
  font-family: inherit;
}

.form-textarea:focus { outline: none; border-color: #1976d2; }

.btn-group {
  display: flex;
  gap: 4px;
  background: #f5f7fa;
  padding: 3px;
  border-radius: 6px;
}

.btn-seg {
  flex: 1;
  padding: 6px 8px;
  background: transparent;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-seg:hover { color: #1976d2; }
.btn-seg.active { background: #fff; color: #1976d2; box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-weight: 600; }

/* 滚动条样式（webkit） */
.panel-body::-webkit-scrollbar,
.canvas-scroll::-webkit-scrollbar { width: 6px; height: 6px; }

.panel-body::-webkit-scrollbar-track,
.canvas-scroll::-webkit-scrollbar-track { background: transparent; }

.panel-body::-webkit-scrollbar-thumb,
.canvas-scroll::-webkit-scrollbar-thumb { background: #c0c4cc; border-radius: 3px; }

.panel-body::-webkit-scrollbar-thumb:hover,
.canvas-scroll::-webkit-scrollbar-thumb:hover { background: #9098a8; }

/* ====== Phase 2: 素材库 ====== */
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

.mat-emoji { font-size: 28px; line-height: 1; }
.mat-name { font-size: 9px; color: #888; text-align: center; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; width: 100%; }

/* ====== Phase 3: 模板 Tab ====== */
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

/* ====== Phase 4: 工具栏发布按钮 ====== */
.tb-btn.publish-btn {
  background: linear-gradient(135deg, #e84a6e, #ff6b8a);
  border-color: #e84a6e;
  font-weight: 700;
  padding: 6px 16px;
}

.tb-btn.publish-btn:hover { background: linear-gradient(135deg, #c0392b, #e84a6e); }

/* 空提示小号 */
.empty-hint.small {
  padding: 16px;
  font-size: 11px;
  color: #bbb;
}
</style>
