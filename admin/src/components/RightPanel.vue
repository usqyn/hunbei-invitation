<template>
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
          <select class="form-input" :value="bgType" @change="$emit('update:bgType', ($event.target as HTMLSelectElement).value)">
            <option value="solid">纯色</option>
            <option value="linear-gradient">线性渐变</option>
            <option value="radial-gradient">径向渐变</option>
            <option value="image">图片</option>
          </select>
        </div>

        <div class="form-row" v-if="bgType === 'solid' || bgType === 'linear-gradient' || bgType === 'radial-gradient'">
          <label>主色</label>
          <input type="color" class="form-input color" :value="bgColor1" @input="$emit('update:bgColor1', ($event.target as HTMLInputElement).value)" @change="$emit('bgColorChange')" />
        </div>
        <div class="form-row" v-if="bgType === 'linear-gradient' || bgType === 'radial-gradient'">
          <label>副色</label>
          <input type="color" class="form-input color" :value="bgColor2" @input="$emit('update:bgColor2', ($event.target as HTMLInputElement).value)" @change="$emit('bgColorChange')" />
        </div>
        <div class="form-row" v-if="bgType === 'linear-gradient'">
          <label>角度</label>
          <div class="range-row">
            <input type="range" class="form-input" min="0" max="180" :value="bgAngle" @input="$emit('update:bgAngle', Number(($event.target as HTMLInputElement).value))" @change="$emit('bgColorChange')" />
            <input type="number" class="range-number" min="0" max="180" :value="bgAngle" @change="$emit('update:bgAngle', Number(($event.target as HTMLInputElement).value)); $emit('bgColorChange')" />
          </div>
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
          <select class="form-input" :value="bgScale" @change="$emit('update:bgScale', ($event.target as HTMLSelectElement).value); $emit('bgImageChange')">
            <option value="cover">Cover</option>
            <option value="contain">Contain</option>
            <option value="fill">Fill</option>
          </select>
        </div>

        <div class="form-row" v-if="bgType === 'image'">
          <label>透明度</label>
          <div class="range-row">
            <input type="range" class="form-input" min="0" max="100" :value="bgOpacity" @input="$emit('update:bgOpacity', Number(($event.target as HTMLInputElement).value))" @change="$emit('bgImageChange')" />
            <input type="number" class="range-number" min="0" max="100" :value="bgOpacity" @change="$emit('update:bgOpacity', Number(($event.target as HTMLInputElement).value)); $emit('bgImageChange')" />
          </div>
        </div>

        <div class="section-divider"></div>
        <div class="section-title">画布尺寸</div>
        <div class="form-row">
          <label>预设</label>
          <select class="form-input" :value="sizeLabel" @change="$emit('update:sizeLabel', ($event.target as HTMLSelectElement).value)">
            <option v-for="p in CANVAS_PRESETS" :key="p.label" :value="p.label">{{ p.label }}</option>
          </select>
        </div>
        <div class="form-row two-col">
          <div>
            <label>宽</label>
            <input type="number" class="form-input" :value="canvasSize.width" @change="$emit('manualSize', { e: $event, side: 'width' })" />
          </div>
          <div>
            <label>高</label>
            <input type="number" class="form-input" :value="canvasSize.height" @change="$emit('manualSize', { e: $event, side: 'height' })" />
          </div>
        </div>
      </template>

      <!-- 文字元素属性 -->
      <template v-else-if="selectedElement.type === 'text'">
        <div class="section-title">文字内容</div>
        <textarea
          class="form-textarea"
          :value="selectedElement.content"
          @change="$emit('updateSelected', { content: ($event.target as HTMLTextAreaElement).value })"
        ></textarea>

        <div class="section-title">字体与大小</div>
        <div class="form-row">
          <label>字体</label>
          <div class="font-select-row">
            <select
              class="form-input"
              :value="selectedElement.fontFamily"
              @change="$emit('updateSelected', { fontFamily: ($event.target as HTMLSelectElement).value })"
            >
              <option v-for="f in fontList" :key="f" :value="f">{{ f }}</option>
            </select>
            <label class="font-upload-btn" title="上传字体文件">
              📎
              <input type="file" accept=".ttf,.otf,.woff,.woff2" multiple style="display:none" @change="onFontUpload" />
            </label>
          </div>
        </div>
        <div class="form-row two-col">
          <div>
            <label>字号</label>
            <input
              type="number"
              class="form-input"
              :value="selectedElement.fontSize"
              min="8" max="120"
              @change="$emit('updateSelected', { fontSize: Number(($event.target as HTMLInputElement).value) })"
            />
          </div>
          <div>
            <label>样式</label>
            <select
              class="form-input"
              :value="fontStyleLabel(selectedElement)"
              @change="$emit('fontStyleChange', ($event.target as HTMLSelectElement).value)"
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
              :class="{ active: selectedElement.textAlign === 'left' }"
              @click="$emit('updateSelected', { textAlign: 'left' })"
            >左</button>
            <button
              class="btn-seg"
              :class="{ active: selectedElement.textAlign === 'center' }"
              @click="$emit('updateSelected', { textAlign: 'center' })"
            >中</button>
            <button
              class="btn-seg"
              :class="{ active: selectedElement.textAlign === 'right' }"
              @click="$emit('updateSelected', { textAlign: 'right' })"
            >右</button>
          </div>
        </div>
        <div class="form-row">
          <label>文字方向</label>
          <div class="btn-group">
            <button
              class="btn-seg"
              :class="{ active: selectedElement.direction === 'ltr' }"
              @click="$emit('updateSelected', { direction: 'ltr' })"
            >LTR</button>
            <button
              class="btn-seg"
              :class="{ active: selectedElement.direction === 'rtl' }"
              @click="$emit('updateSelected', { direction: 'rtl' })"
            >RTL</button>
            <button
              class="btn-seg"
              :class="{ active: selectedElement.direction === 'auto' }"
              @click="$emit('updateSelected', { direction: 'auto' })"
            >自动</button>
          </div>
        </div>
        <div class="form-row">
          <label>行高</label>
          <div class="range-row">
            <input
              type="range"
              class="form-input"
              min="1" max="3" step="0.1"
              :value="selectedElement.lineHeight"
              @change="$emit('updateSelected', { lineHeight: Number(($event.target as HTMLInputElement).value) })"
            />
            <input
              type="number"
              class="range-number"
              min="1" max="3" step="0.1"
              :value="selectedElement.lineHeight ?? 1.5"
              @change="$emit('updateSelected', { lineHeight: Number(($event.target as HTMLInputElement).value) })"
            />
          </div>
        </div>
        <div class="form-row">
          <label>字间距</label>
          <div class="range-row">
            <input
              type="range"
              class="form-input"
              min="-5" max="30" step="1"
              :value="selectedElement.letterSpacing"
              @change="$emit('updateSelected', { letterSpacing: Number(($event.target as HTMLInputElement).value) })"
            />
            <input
              type="number"
              class="range-number"
              min="-5" max="30" step="1"
              :value="selectedElement.letterSpacing ?? 0"
              @change="$emit('updateSelected', { letterSpacing: Number(($event.target as HTMLInputElement).value) })"
            />
          </div>
        </div>

        <div class="section-title">颜色与描边</div>
        <div class="form-row two-col">
          <div>
            <label>文字色</label>
            <input
              type="color"
              class="form-input color"
              :value="selectedElement.color"
              @change="$emit('updateSelected', { color: ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div>
            <label>透明度</label>
            <div class="range-row">
              <input
                type="range"
                class="form-input"
                min="0" max="100"
                :value="Math.round((selectedElement.opacity) * 100)"
                @change="$emit('updateSelected', { opacity: Number(($event.target as HTMLInputElement).value) / 100 })"
              />
              <input
                type="number"
                class="range-number"
                min="0" max="100"
                :value="Math.round((selectedElement.opacity ?? 1) * 100)"
                @change="$emit('updateSelected', { opacity: Number(($event.target as HTMLInputElement).value) / 100 })"
              />
            </div>
          </div>
        </div>
        <div class="form-row two-col">
          <div>
            <label>描边色</label>
            <input
              type="color"
              class="form-input color"
              :value="selectedElement.strokeColor || '#000000'"
              @change="$emit('updateSelected', { strokeColor: ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div>
            <label>描边宽度</label>
            <div class="range-row">
              <input
                type="range"
                class="form-input"
                min="0" max="10" step="1"
                :value="selectedElement.strokeWidth"
                @change="$emit('updateSelected', { strokeWidth: Number(($event.target as HTMLInputElement).value) })"
              />
              <input
                type="number"
                class="range-number"
                min="0" max="10" step="1"
                :value="selectedElement.strokeWidth ?? 0"
                @change="$emit('updateSelected', { strokeWidth: Number(($event.target as HTMLInputElement).value) })"
              />
            </div>
          </div>
        </div>

        <div class="section-title">阴影</div>
        <div class="form-row two-col">
          <div>
            <label>阴影色</label>
            <input
              type="color"
              class="form-input color"
              :value="selectedElement.shadowColor || '#000000'"
              @change="$emit('updateSelected', { shadowColor: ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div>
            <label>模糊</label>
            <div class="range-row">
              <input
                type="range"
                class="form-input"
                min="0" max="30" step="1"
                :value="selectedElement.shadowBlur"
                @change="$emit('updateSelected', { shadowBlur: Number(($event.target as HTMLInputElement).value) })"
              />
              <input
                type="number"
                class="range-number"
                min="0" max="30" step="1"
                :value="selectedElement.shadowBlur ?? 0"
                @change="$emit('updateSelected', { shadowBlur: Number(($event.target as HTMLInputElement).value) })"
              />
            </div>
          </div>
        </div>

        <div class="section-title">旋转</div>
        <div class="form-row">
          <label>角度</label>
          <div class="range-row">
            <input
              type="range"
              class="form-input"
              min="-180" max="180"
              :value="Math.round(selectedElement.rotation)"
              @change="$emit('updateSelected', { rotation: Number(($event.target as HTMLInputElement).value) })"
            />
            <input
              type="number"
              class="range-number"
              min="-180" max="180"
              :value="Math.round(selectedElement.rotation ?? 0)"
              @change="$emit('updateSelected', { rotation: Number(($event.target as HTMLInputElement).value) })"
            />
          </div>
        </div>
        <div class="section-title">画布对齐</div>
        <div class="btn-group">
          <button class="btn-seg" @click="$emit('alignLeft', selectedElement.id)" title="左对齐">←</button>
          <button class="btn-seg" @click="$emit('alignCenter', selectedElement.id)" title="水平居中">⇄</button>
          <button class="btn-seg" @click="$emit('alignRight', selectedElement.id)" title="右对齐">→</button>
        </div>
        <div class="btn-group">
          <button class="btn-seg" @click="$emit('alignTop', selectedElement.id)" title="顶部对齐">↑</button>
          <button class="btn-seg" @click="$emit('alignMiddle', selectedElement.id)" title="垂直居中">⇅</button>
          <button class="btn-seg" @click="$emit('alignBottom', selectedElement.id)" title="底部对齐">↓</button>
        </div>
        <div class="section-title">小程序编辑权限</div>
        <div class="form-row">
          <label class="toggle-label">
            <span>允许用户编辑</span>
            <label class="switch">
              <input
                type="checkbox"
                :checked="selectedElement.editable !== false"
                @change="$emit('updateSelected', { editable: ($event.target as HTMLInputElement).checked })"
              />
              <span class="slider"></span>
            </label>
          </label>
        </div>
        <div class="section-title">文字特效</div>
        <div class="text-fx-grid">
          <button class="text-fx-btn" @click="$emit('applyTextFx', 'gradient')" title="渐变填充">渐变</button>
          <button class="text-fx-btn" @click="$emit('applyTextFx', 'longShadow')" title="长阴影">长阴影</button>
          <button class="text-fx-btn" @click="$emit('applyTextFx', 'neon')" title="霓虹发光">霓虹</button>
          <button class="text-fx-btn" @click="$emit('applyTextFx', 'outline')" title="空心描边">描边</button>
          <button class="text-fx-btn" @click="$emit('applyTextFx', 'underline')" title="下划线">下划线</button>
          <button class="text-fx-btn" @click="$emit('applyTextFx', 'clearFx')" title="清除特效">清除</button>
        </div>
        <div class="section-title">模板数据绑定</div>
        <div class="form-row">
          <label>数据字段</label>
          <select
            class="form-input"
            :value="selectedElement.dataKey || ''"
            @change="$emit('updateSelected', { dataKey: ($event.target as HTMLSelectElement).value || undefined })"
          >
            <option value="">无绑定</option>
            <option v-for="k in TEMPLATE_DATA_KEYS" :key="k" :value="k">{{ k }}</option>
          </select>
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
            <label>透明度</label>
            <div class="range-row">
              <input
                type="range"
                class="form-input"
                min="0" max="100"
                :value="Math.round((selectedElement.opacity) * 100)"
                @change="$emit('updateSelected', { opacity: Number(($event.target as HTMLInputElement).value) / 100 })"
              />
              <input
                type="number"
                class="range-number"
                min="0" max="100"
                :value="Math.round((selectedElement.opacity ?? 1) * 100)"
                @change="$emit('updateSelected', { opacity: Number(($event.target as HTMLInputElement).value) / 100 })"
              />
            </div>
          </div>
          <div>
            <label>旋转</label>
            <div class="range-row">
              <input
                type="range"
                class="form-input"
                min="-180" max="180"
                :value="Math.round(selectedElement.rotation)"
                @change="$emit('updateSelected', { rotation: Number(($event.target as HTMLInputElement).value) })"
              />
              <input
                type="number"
                class="range-number"
                min="-180" max="180"
                :value="Math.round(selectedElement.rotation ?? 0)"
                @change="$emit('updateSelected', { rotation: Number(($event.target as HTMLInputElement).value) })"
              />
            </div>
          </div>
        </div>
        <div class="section-title">填充模式</div>
        <div class="form-row">
          <label>填充</label>
          <select
            class="form-input"
            :value="selectedElement.scale"
            @change="$emit('updateSelected', { scale: ($event.target as HTMLSelectElement).value })"
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
            :class="{ active: selectedElement.mask === 'rect' }"
            @click="$emit('updateSelected', { mask: 'rect' })"
          >矩形</button>
          <button
            class="btn-seg"
            :class="{ active: selectedElement.mask === 'rounded' }"
            @click="$emit('updateSelected', { mask: 'rounded' })"
          >圆角</button>
          <button
            class="btn-seg"
            :class="{ active: selectedElement.mask === 'circle' }"
            @click="$emit('updateSelected', { mask: 'circle' })"
          >圆形</button>
          <button
            class="btn-seg"
            :class="{ active: selectedElement.mask === 'heart' }"
            @click="$emit('updateSelected', { mask: 'heart' })"
          >心</button>
          <button
            class="btn-seg"
            :class="{ active: selectedElement.mask === 'alpha' }"
            @click="$emit('updateSelected', { mask: 'alpha' })"
          >自定义形状</button>
        </div>
        <div class="section-title">圆角</div>
        <div class="form-row">
          <label>圆角</label>
          <div class="range-row">
            <input
              type="range" class="form-input" min="0" max="100"
              :value="selectedElement.borderRadius || 0"
              @change="$emit('updateSelected', { borderRadius: Number(($event.target as HTMLInputElement).value) })"
            />
            <input
              type="number" class="range-number" min="0" max="100"
              :value="selectedElement.borderRadius || 0"
              @change="$emit('updateSelected', { borderRadius: Number(($event.target as HTMLInputElement).value) })"
            />
          </div>
        </div>
        <div class="section-title">边框</div>
        <div class="form-row two-col">
          <div>
            <label>粗细</label>
            <input
              type="number" class="form-input" min="0" max="20"
              :value="selectedElement.borderWidth || 0"
              @change="$emit('updateSelected', { borderWidth: Number(($event.target as HTMLInputElement).value) })"
            />
          </div>
          <div>
            <label>颜色</label>
            <input
              type="color" class="form-input color-input"
              :value="selectedElement.borderColor || '#ffffff'"
              @change="$emit('updateSelected', { borderColor: ($event.target as HTMLInputElement).value })"
            />
          </div>
        </div>
        <div class="section-title">滤镜</div>
        <div class="filter-presets">
          <button class="filter-preset-btn" @click="$emit('applyFilterPreset', 'none')">原图</button>
          <button class="filter-preset-btn" @click="$emit('applyFilterPreset', 'vintage')">复古</button>
          <button class="filter-preset-btn" @click="$emit('applyFilterPreset', 'cool')">冷色</button>
          <button class="filter-preset-btn" @click="$emit('applyFilterPreset', 'warm')">暖色</button>
          <button class="filter-preset-btn" @click="$emit('applyFilterPreset', 'bw')">黑白</button>
          <button class="filter-preset-btn" @click="$emit('applyFilterPreset', 'soft')">柔光</button>
        </div>
        <div class="form-row">
          <label>亮度</label>
          <div class="range-row">
            <input
              type="range" class="form-input" min="0" max="200"
              :value="selectedElement.brightness ?? 100"
              @change="$emit('updateSelected', { brightness: Number(($event.target as HTMLInputElement).value) })"
            />
            <input
              type="number" class="range-number" min="0" max="200"
              :value="selectedElement.brightness ?? 100"
              @change="$emit('updateSelected', { brightness: Number(($event.target as HTMLInputElement).value) })"
            />
          </div>
        </div>
        <div class="form-row">
          <label>对比度</label>
          <div class="range-row">
            <input
              type="range" class="form-input" min="-100" max="100"
              :value="selectedElement.contrast ?? 0"
              @change="$emit('updateSelected', { contrast: Number(($event.target as HTMLInputElement).value) })"
            />
            <input
              type="number" class="range-number" min="-100" max="100"
              :value="selectedElement.contrast ?? 0"
              @change="$emit('updateSelected', { contrast: Number(($event.target as HTMLInputElement).value) })"
            />
          </div>
        </div>
        <div class="form-row">
          <label>饱和度</label>
          <div class="range-row">
            <input
              type="range" class="form-input" min="0" max="200"
              :value="selectedElement.saturate ?? 100"
              @change="$emit('updateSelected', { saturate: Number(($event.target as HTMLInputElement).value) })"
            />
            <input
              type="number" class="range-number" min="0" max="200"
              :value="selectedElement.saturate ?? 100"
              @change="$emit('updateSelected', { saturate: Number(($event.target as HTMLInputElement).value) })"
            />
          </div>
        </div>
        <div class="form-row">
          <label>模糊</label>
          <div class="range-row">
            <input
              type="range" class="form-input" min="0" max="20"
              :value="selectedElement.blur ?? 0"
              @change="$emit('updateSelected', { blur: Number(($event.target as HTMLInputElement).value) })"
            />
            <input
              type="number" class="range-number" min="0" max="20"
              :value="selectedElement.blur ?? 0"
              @change="$emit('updateSelected', { blur: Number(($event.target as HTMLInputElement).value) })"
            />
          </div>
        </div>
        <div class="form-row">
          <label>灰度</label>
          <div class="range-row">
            <input
              type="range" class="form-input" min="0" max="100"
              :value="selectedElement.grayscale ?? 0"
              @change="$emit('updateSelected', { grayscale: Number(($event.target as HTMLInputElement).value) })"
            />
            <input
              type="number" class="range-number" min="0" max="100"
              :value="selectedElement.grayscale ?? 0"
              @change="$emit('updateSelected', { grayscale: Number(($event.target as HTMLInputElement).value) })"
            />
          </div>
        </div>
        <div class="section-title">对齐</div>
        <div class="btn-group">
          <button class="btn-seg" @click="$emit('alignLeft', selectedElement.id)" title="左对齐">←</button>
          <button class="btn-seg" @click="$emit('alignCenter', selectedElement.id)" title="水平居中">⇄</button>
          <button class="btn-seg" @click="$emit('alignRight', selectedElement.id)" title="右对齐">→</button>
        </div>
        <div class="btn-group">
          <button class="btn-seg" @click="$emit('alignTop', selectedElement.id)" title="顶部对齐">↑</button>
          <button class="btn-seg" @click="$emit('alignMiddle', selectedElement.id)" title="垂直居中">⇅</button>
          <button class="btn-seg" @click="$emit('alignBottom', selectedElement.id)" title="底部对齐">↓</button>
        </div>
        <div class="section-title">小程序编辑权限</div>
        <div class="form-row">
          <label class="toggle-label">
            <span>允许用户编辑</span>
            <label class="switch">
              <input
                type="checkbox"
                :checked="selectedElement.editable !== false"
                @change="$emit('updateSelected', { editable: ($event.target as HTMLInputElement).checked })"
              />
              <span class="slider"></span>
            </label>
          </label>
        </div>

        <div class="section-title">模板数据绑定</div>
        <div class="form-row">
          <label>数据字段</label>
          <select
            class="form-input"
            :value="selectedElement.dataKey || ''"
            @change="$emit('updateSelected', { dataKey: ($event.target as HTMLSelectElement).value || undefined })"
          >
            <option value="">无绑定</option>
            <option v-for="k in TEMPLATE_DATA_KEYS" :key="k" :value="k">{{ k }}</option>
          </select>
        </div>
      </template>

      <!-- 未知元素 -->
      <template v-else>
        <div class="empty-hint">不支持的元素类型</div>
      </template>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { AnyCanvasElement, TextElement, CanvasSize, CanvasBackground } from '../types/canvas'
import { CANVAS_PRESETS } from '../types/canvas'
import { TEMPLATE_DATA_KEYS } from '../constants/config-data'

defineProps<{
  selectedElement: AnyCanvasElement | null
  canvasSize: CanvasSize
  bgType: string
  bgColor1: string
  bgColor2: string
  bgAngle: number
  bgScale: string
  bgOpacity: number
  sizeLabel: string
  fontList: string[]
}>()

const emit = defineEmits<{
  'updateSelected': [patch: any]
  'update:bgType': [value: string]
  'update:bgColor1': [value: string]
  'update:bgColor2': [value: string]
  'update:bgAngle': [value: number]
  'update:bgScale': [value: string]
  'update:bgOpacity': [value: number]
  'update:sizeLabel': [value: string]
  'bgColorChange': []
  'bgImageChange': []
  'bgImageFile': [file: File]
  'imageReplaceFile': [file: File]
  'manualSize': [payload: { e: Event; side: 'width' | 'height' }]
  'fontUpload': [files: FileList]
  'fontStyleChange': [value: string]
  'applyTextFx': [type: string]
  'applyFilterPreset': [name: string]
  'alignLeft': [id: string]
  'alignCenter': [id: string]
  'alignRight': [id: string]
  'alignTop': [id: string]
  'alignMiddle': [id: string]
  'alignBottom': [id: string]
}>()

function fontStyleLabel(el: TextElement): string {
  const b = el.fontWeight === 'bold'
  const i = el.fontStyle === 'italic'
  if (b && i) return 'bold-italic'
  if (b) return 'bold'
  if (i) return 'italic'
  return 'normal'
}

function onBgImageFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    emit('bgImageFile', file)
  }
  input.value = ''
}

function onImageReplaceFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    emit('imageReplaceFile', file)
  }
  input.value = ''
}

function onFontUpload(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.length) {
    emit('fontUpload', input.files)
  }
  input.value = ''
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

.empty-hint {
  padding: 40px 16px;
  text-align: center;
  color: #999;
  font-size: 12px;
  line-height: 1.8;
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

/* 滑块 + 数值输入框组合 */
.range-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.range-row > input[type="range"] {
  flex: 1;
  min-width: 0;
}
.range-number {
  width: 56px;
  flex-shrink: 0;
  padding: 4px 6px;
  border: 1px solid #e0e4ea;
  border-radius: 6px;
  font-size: 12px;
  text-align: center;
  background: #fff;
  outline: none;
  transition: border-color 0.15s;
}
.range-number:focus { border-color: #1976d2; }

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

.font-select-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
.font-select-row .form-input {
  flex: 1;
}
.font-upload-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: border-color 0.15s;
}
.font-upload-btn:hover {
  border-color: #e84a6e;
}

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

/* 开关 toggle */
.toggle-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 6px 0;
  cursor: pointer;
}

.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background: #ccc;
  transition: 0.3s;
  border-radius: 22px;
}

.slider::before {
  content: '';
  position: absolute;
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background: #fff;
  transition: 0.3s;
  border-radius: 50%;
}

.switch input:checked + .slider { background: #1976d2; }
.switch input:checked + .slider::before { transform: translateX(18px); }

/* 滤镜预设 */
.filter-presets {
  display: flex;
  gap: 6px;
  padding: 0 12px 10px;
  flex-wrap: wrap;
}

.filter-preset-btn {
  padding: 4px 10px;
  background: #f0f2f5;
  border: 1px solid #e0e4ea;
  border-radius: 12px;
  font-size: 11px;
  color: #666;
  cursor: pointer;
  transition: all 0.15s;
}

.filter-preset-btn:hover {
  background: #e3f2fd;
  border-color: #90caf9;
  color: #1976d2;
}

/* 文字特效 */
.text-fx-grid {
  display: flex;
  gap: 6px;
  padding: 0 12px 10px;
  flex-wrap: wrap;
}

.text-fx-btn {
  padding: 5px 12px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  border-radius: 14px;
  font-size: 11px;
  color: #fff;
  cursor: pointer;
  transition: all 0.15s;
  font-weight: 500;
}

.text-fx-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
}

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

/* 滚动条样式（webkit） */
.panel-body::-webkit-scrollbar { width: 6px; height: 6px; }
.panel-body::-webkit-scrollbar-track { background: transparent; }
.panel-body::-webkit-scrollbar-thumb { background: #c0c4cc; border-radius: 3px; }
.panel-body::-webkit-scrollbar-thumb:hover { background: #9098a8; }
</style>
