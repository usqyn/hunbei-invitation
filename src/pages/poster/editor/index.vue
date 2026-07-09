<template>
  <view class="poster-editor">
    <!-- Top Toolbar -->
    <view class="toolbar">
      <view class="toolbar-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="toolbar-title">{{ templateName }}</text>
      <view class="toolbar-actions">
        <text
          class="action-btn"
          :class="{ 'action-btn--disabled': !canUndo }"
          @click="onUndo"
        >↶</text>
        <text
          class="action-btn"
          :class="{ 'action-btn--disabled': !canRedo }"
          @click="onRedo"
        >↷</text>
        <text class="action-btn action-btn--text" @click="showTemplatePicker = true">换模板</text>
        <text class="action-btn action-btn--text" @click="onPreview">预览</text>
      </view>
    </view>

    <!-- Canvas Preview Area -->
    <view class="canvas-area">
      <scroll-view class="canvas-scroll" scroll-y>
        <view class="canvas-wrapper" :style="canvasWrapperStyle">
          <image
            v-if="posterStore.currentTemplate"
            class="canvas-bg"
            :src="resolvedBgUrl"
            mode="aspectFit"
          />
          <view
            v-for="area in posterStore.editableAreas"
            :key="area.id"
            class="edit-area"
            :class="{
              'edit-area--active': posterStore.selectedAreaId === area.id,
              'edit-area--text': area.type === 'text',
            }"
            :style="getAreaStyle(area)"
            @click="onAreaClick(area)"
          >
            <image
              v-if="area.type === 'image' && area._src"
              class="area-image"
              :src="area._src"
              mode="aspectFill"
              :style="{ borderRadius: (area.borderRadius || 0) + 'px' }"
            />
            <text
              v-else-if="area.type === 'text' && area._text"
              class="area-text"
              :style="getTextStyle(area)"
            >{{ area._text }}</text>
            <view v-else-if="area.type === 'image'" class="area-placeholder">
              <text class="placeholder-icon">🖼</text>
              <text class="placeholder-label">点击上传</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- Hint when no area selected -->
    <view v-if="!posterStore.selectedAreaId" class="hint-bar">
      <text class="hint-text">点击模板上的文字或图片区域进行编辑</text>
    </view>

    <!-- Bottom Edit Panel (slides up when area selected) -->
    <view
      v-if="selectedArea"
      class="edit-panel"
      :class="{ 'edit-panel--show': !!posterStore.selectedAreaId }"
    >
      <!-- Text area controls -->
      <template v-if="selectedArea.type === 'text'">
        <view class="panel-header">
          <text class="panel-title">编辑文字</text>
          <text class="panel-close" @click="posterStore.selectArea(null)">✕</text>
        </view>
        <scroll-view class="panel-scroll" scroll-y>
          <view class="panel-content">
            <view class="form-item">
              <text class="form-label">文字内容</text>
              <textarea
                class="form-textarea"
                v-model="selectedArea._text"
                placeholder="请输入文字"
                auto-height
                @input="onTextInput"
              />
            </view>
            <view class="form-item">
              <text class="form-label">字号 {{ selectedArea._fontSize }}px</text>
              <slider
                :value="selectedArea._fontSize"
                :min="12"
                :max="80"
                :step="1"
                activeColor="#e84a6e"
                @change="onFontSizeChange"
              />
            </view>
            <view class="form-item">
              <text class="form-label">颜色</text>
              <view class="color-row">
                <view
                  v-for="color in posterStore.colorOptions"
                  :key="color"
                  class="color-dot"
                  :class="{ 'color-dot--active': selectedArea._color === color }"
                  :style="{ background: color }"
                  @click="onColorChange(color)"
                />
              </view>
            </view>
            <view class="form-item">
              <text class="form-label">对齐</text>
              <view class="align-row">
                <view
                  v-for="align in alignOptions"
                  :key="align.value"
                  class="align-btn"
                  :class="{ 'align-btn--active': selectedArea._align === align.value }"
                  @click="onAlignChange(align.value)"
                >
                  <text class="align-icon">{{ align.icon }}</text>
                </view>
              </view>
            </view>
            <view class="form-item">
              <text class="form-label">加粗</text>
              <view class="toggle-row">
                <view
                  class="toggle-btn"
                  :class="{ 'toggle-btn--active': selectedArea._bold }"
                  @click="onBoldChange"
                >
                  <text class="toggle-text">B</text>
                </view>
              </view>
            </view>
            <view class="form-item">
              <text class="form-label">字体</text>
              <view class="font-row">
                <view
                  v-for="font in posterStore.fontOptions"
                  :key="font.value"
                  class="font-btn"
                  :class="{ 'font-btn--active': selectedArea._fontFamily === font.value }"
                  @click="onFontChange(font.value)"
                >
                  <text class="font-text" :style="{ fontFamily: font.value }">{{ font.label }}</text>
                </view>
              </view>
            </view>
            <view class="form-item">
              <text class="form-label">旋转 {{ selectedArea._rotate }}°</text>
              <slider
                :value="selectedArea._rotate"
                :min="-180"
                :max="180"
                :step="1"
                activeColor="#e84a6e"
                @change="onRotateChange"
              />
            </view>
            <view class="form-item">
              <button class="reset-btn" size="mini" @click="onReset">重置</button>
            </view>
          </view>
        </scroll-view>
      </template>

      <!-- Image area controls -->
      <template v-else-if="selectedArea.type === 'image'">
        <view class="panel-header">
          <text class="panel-title">编辑图片</text>
          <text class="panel-close" @click="posterStore.selectArea(null)">✕</text>
        </view>
        <scroll-view class="panel-scroll" scroll-y>
          <view class="panel-content">
            <view class="form-item">
              <view class="image-action-row">
                <button class="img-btn" size="mini" @click="onChooseImage">更换图片</button>
                <button class="img-btn" size="mini" @click="onCropImage">裁剪图片</button>
              </view>
            </view>
            <view class="form-item">
              <text class="form-label">旋转 {{ selectedArea._rotate }}°</text>
              <slider
                :value="selectedArea._rotate"
                :min="-180"
                :max="180"
                :step="1"
                activeColor="#e84a6e"
                @change="onRotateChange"
              />
            </view>
            <view class="form-item">
              <text class="form-label">缩放 {{ Math.round((selectedArea._scale || 1) * 100) }}%</text>
              <view class="scale-row">
                <button class="scale-btn" size="mini" @click="onScaleChange(-0.1)">−</button>
                <slider
                  class="scale-slider"
                  :value="Math.round((selectedArea._scale || 1) * 100)"
                  :min="50"
                  :max="200"
                  :step="5"
                  activeColor="#e84a6e"
                  @change="onScaleSliderChange"
                />
                <button class="scale-btn" size="mini" @click="onScaleChange(0.1)">+</button>
              </view>
            </view>
            <view class="form-item">
              <button class="reset-btn" size="mini" @click="onReset">重置</button>
            </view>
          </view>
        </scroll-view>
      </template>
    </view>

    <!-- Layer Manager Overlay -->
    <view v-if="posterStore.showLayerPanel" class="modal-overlay" @click="posterStore.showLayerPanel = false">
      <view class="layer-modal" @click.stop>
        <view class="layer-modal-header">
          <text class="layer-modal-title">图层管理</text>
          <text class="layer-modal-close" @click="posterStore.showLayerPanel = false">✕</text>
        </view>
        <scroll-view class="layer-modal-body" scroll-y>
          <view v-if="posterStore.editableAreas.length === 0" class="layer-empty">
            <text class="layer-empty-text">暂无元素</text>
          </view>
          <view
            v-for="(area, idx) in posterStore.editableAreas"
            :key="area.id"
            class="layer-item"
            :class="{ 'layer-item--active': posterStore.selectedAreaId === area.id }"
            @click="posterStore.selectArea(area.id)"
          >
            <text class="layer-item-icon">{{ area.type === 'text' ? 'T' : '🖼' }}</text>
            <text class="layer-item-name">{{ area.type === 'text' ? (area._text || '文字') : '图片' }}</text>
            <view class="layer-item-actions">
              <text class="layer-action" @click.stop="onLayerMove(idx, 'up')" v-if="idx > 0">↑</text>
              <text class="layer-action" @click.stop="onLayerMove(idx, 'down')" v-if="idx < posterStore.editableAreas.length - 1">↓</text>
              <text class="layer-action" @click.stop="onLayerMove(idx, 'top')" v-if="idx > 0">⏫</text>
              <text class="layer-action" @click.stop="onLayerMove(idx, 'bottom')" v-if="idx < posterStore.editableAreas.length - 1">⏬</text>
              <text class="layer-action layer-action--danger" @click.stop="onDeleteElement(idx)">✕</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- Bottom Action Bar -->
    <view class="action-bar">
      <view class="action-bar-item" @click="onOpenSticker">
        <text class="action-bar-icon">🎨</text>
        <text class="action-bar-label">素材</text>
      </view>
      <view class="action-bar-item" @click="posterStore.showLayerPanel = true">
        <text class="action-bar-icon">📑</text>
        <text class="action-bar-label">图层</text>
      </view>
      <view class="action-bar-item" @click="onSave">
        <text class="action-bar-icon">💾</text>
        <text class="action-bar-label">保存</text>
      </view>
      <view class="action-bar-item" @click="onExport">
        <text class="action-bar-icon">📤</text>
        <text class="action-bar-label">导出</text>
      </view>
    </view>

    <!-- Hidden Canvas for export -->
    <canvas
      type="2d"
      id="posterCanvas"
      canvas-id="posterCanvas"
      class="hidden-canvas"
      :style="{ width: canvasSize.width + 'px', height: canvasSize.height + 'px' }"
    />

    <!-- Preview Overlay Modal -->
    <view v-if="posterStore.showPreview" class="modal-overlay" @click="posterStore.showPreview = false">
      <view class="preview-modal" @click.stop>
        <view class="preview-modal-header">
          <text class="preview-modal-title">预览效果</text>
          <text class="preview-modal-close" @click="posterStore.showPreview = false">✕</text>
        </view>
        <scroll-view class="preview-modal-body" scroll-y>
          <image
            v-if="posterStore.previewImage"
            class="preview-image"
            :src="posterStore.previewImage"
            mode="widthFix"
          />
          <view v-else class="preview-empty">
            <text class="preview-empty-text">生成预览中...</text>
          </view>
        </scroll-view>
        <view class="preview-modal-footer">
          <button class="preview-btn preview-btn--album" @click="onSaveToAlbum">保存到相册</button>
          <button class="preview-btn preview-btn--share" @click="onShare">分享</button>
        </view>
      </view>
    </view>

    <!-- Template Picker Overlay Modal -->
    <view v-if="posterStore.showTemplatePicker" class="modal-overlay" @click="posterStore.showTemplatePicker = false">
      <view class="picker-modal" @click.stop>
        <view class="picker-modal-header">
          <text class="picker-modal-title">选择模板</text>
          <text class="picker-modal-close" @click="posterStore.showTemplatePicker = false">✕</text>
        </view>
        <scroll-view class="picker-modal-body" scroll-y>
          <view class="picker-grid">
            <view
              v-for="tpl in posterStore.relatedTemplates"
              :key="tpl.id"
              class="picker-card"
              @click="onSwitchTemplate(tpl.id)"
            >
              <image class="picker-card-img" :src="resolveUrl(tpl.cover_url)" mode="aspectFill" />
              <text class="picker-card-name">{{ tpl.name }}</text>
              <view v-if="tpl.is_vip" class="picker-card-vip">VIP</view>
            </view>
          </view>
          <view v-if="posterStore.relatedTemplates.length === 0" class="picker-empty">
            <text class="picker-empty-text">暂无更多模板</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- Sticker Panel Overlay Modal -->
    <view v-if="posterStore.showStickerPanel" class="modal-overlay" @click="posterStore.showStickerPanel = false">
      <view class="sticker-modal" @click.stop>
        <view class="sticker-modal-header">
          <text class="sticker-modal-title">素材库</text>
          <text class="sticker-modal-close" @click="posterStore.showStickerPanel = false">✕</text>
        </view>
        <scroll-view class="sticker-modal-body" scroll-y>
          <view class="sticker-grid">
            <view
              v-for="(sticker, idx) in posterStore.stickers"
              :key="idx"
              class="sticker-item"
              @click="onInsertSticker(sticker)"
            >
              <image class="sticker-img" :src="sticker" mode="aspectFit" />
            </view>
          </view>
          <view v-if="posterStore.stickers.length === 0" class="sticker-empty">
            <text class="sticker-empty-text">暂无素材</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- Toast -->
    <view v-if="toastVisible" class="toast">
      <text class="toast-text">{{ toastMsg }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { usePosterStore } from '@/stores/poster'
import { useGoBack } from '@/composables/useGoBack'
import { API_BASE } from '@/config'
import type { PosterEditableArea } from '@/types/poster'

const posterStore = usePosterStore()
const goBack = useGoBack()

const alignOptions = [
  { value: 'left', icon: '⬅' },
  { value: 'center', icon: '⬌' },
  { value: 'right', icon: '➡' },
]

const toastVisible = ref(false)
const toastMsg = ref('')
let toastTimer: any = null

function showToast(msg: string) {
  toastMsg.value = msg
  toastVisible.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastVisible.value = false
  }, 2000)
}

const templateName = computed(() => posterStore.currentTemplate?.name || '海报编辑器')

const resolvedBgUrl = computed(() => {
  const url = posterStore.currentTemplate?.background_url
  return url ? resolveUrl(url) : ''
})

const canvasSize = computed(() => posterStore.canvasSize)

const canvasWrapperStyle = computed(() => {
  const ratio = canvasSize.value.width / canvasSize.value.height
  const w = 100
  const h = w / ratio
  return {
    width: `${w}%`,
    paddingBottom: `${h}%`,
  }
})

function resolveUrl(url: string): string {
  if (!url) return url
  if (url.startsWith('/uploads/')) return API_BASE + url
  return url
}

const selectedArea = computed(() => {
  if (!posterStore.selectedAreaId) return null
  return posterStore.editableAreas.find(a => a.id === posterStore.selectedAreaId) || null
})

const canUndo = computed(() => posterStore.canUndo())
const canRedo = computed(() => posterStore.canRedo())

function getAreaStyle(area: PosterEditableArea): Record<string, string> {
  const cw = canvasSize.value.width
  const ch = canvasSize.value.height
  const x = (area._x ?? area.x) / cw * 100
  const y = (area._y ?? area.y) / ch * 100
  const w = (area._w ?? area.width) / cw * 100
  const h = (area._h ?? area.height) / ch * 100
  const rotate = area._rotate || 0
  const scale = area._scale || 1
  return {
    position: 'absolute',
    left: `${x}%`,
    top: `${y}%`,
    width: `${w}%`,
    height: `${h}%`,
    transform: `rotate(${rotate}deg) scale(${scale})`,
    'transform-origin': 'center center',
  }
}

function getTextStyle(area: PosterEditableArea): Record<string, string> {
  const cw = canvasSize.value.width
  const fontSizePx = (area._fontSize || 28) / cw * 100
  return {
    fontSize: `${fontSizePx}cqw`,
    color: area._color || '#333',
    textAlign: (area._align as any) || 'center',
    fontWeight: area._bold ? 'bold' : 'normal',
    fontFamily: area._fontFamily || 'sans-serif',
    width: '100%',
    height: '100%',
    display: 'flex',
    'align-items': 'center',
    'justify-content': area._align === 'left' ? 'flex-start' : area._align === 'right' ? 'flex-end' : 'center',
    'word-break': 'break-word',
    'overflow': 'hidden',
    'line-height': '1.4',
    padding: '2px',
  }
}

function onAreaClick(area: PosterEditableArea) {
  posterStore.selectArea(area.id)
}

// ---- text editing ----
function onTextInput(e: any) {
  if (!selectedArea.value) return
  const text = e.detail.value
  posterStore.updateText(selectedArea.value.id, text)
  posterStore.pushHistory()
}

function onFontSizeChange(e: any) {
  if (!selectedArea.value) return
  posterStore.updateStyle(selectedArea.value.id, 'fontSize', e.detail.value)
  posterStore.pushHistory()
}

function onColorChange(color: string) {
  if (!selectedArea.value) return
  posterStore.updateStyle(selectedArea.value.id, 'color', color)
  posterStore.pushHistory()
}

function onAlignChange(align: string) {
  if (!selectedArea.value) return
  posterStore.updateStyle(selectedArea.value.id, 'align', align)
  posterStore.pushHistory()
}

function onBoldChange() {
  if (!selectedArea.value) return
  posterStore.updateStyle(selectedArea.value.id, 'bold', !selectedArea.value._bold)
  posterStore.pushHistory()
}

function onFontChange(font: string) {
  if (!selectedArea.value) return
  posterStore.updateStyle(selectedArea.value.id, 'fontFamily', font)
  posterStore.pushHistory()
}

function onRotateChange(e: any) {
  if (!selectedArea.value) return
  posterStore.updateStyle(selectedArea.value.id, 'rotate', e.detail.value)
  posterStore.pushHistory()
}

function onScaleChange(delta: number) {
  if (!selectedArea.value) return
  const newScale = Math.max(0.5, Math.min(2, (selectedArea.value._scale || 1) + delta))
  posterStore.updateStyle(selectedArea.value.id, 'scale', newScale)
  posterStore.pushHistory()
}

function onScaleSliderChange(e: any) {
  if (!selectedArea.value) return
  posterStore.updateStyle(selectedArea.value.id, 'scale', e.detail.value / 100)
  posterStore.pushHistory()
}

// ---- image editing ----
function onChooseImage() {
  // #ifdef MP-WEIXIN
  uni.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sourceType: ['album', 'camera'],
    success: (res: any) => {
      if (res.tempFiles && res.tempFiles.length > 0 && selectedArea.value) {
        posterStore.updateImage(selectedArea.value.id, res.tempFiles[0].tempFilePath)
        posterStore.pushHistory()
        showToast('图片已更换')
      }
    },
    fail: () => showToast('图片选择失败'),
  })
  // #endif
  // #ifndef MP-WEIXIN
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res: any) => {
      if (res.tempFilePaths && res.tempFilePaths.length > 0 && selectedArea.value) {
        posterStore.updateImage(selectedArea.value.id, res.tempFilePaths[0])
        posterStore.pushHistory()
        showToast('图片已更换')
      }
    },
    fail: () => showToast('图片选择失败'),
  })
  // #endif
}

function onCropImage() {
  showToast('裁剪功能开发中')
}

function onReset() {
  if (!selectedArea.value) return
  posterStore.resetArea(selectedArea.value.id)
  posterStore.pushHistory()
  showToast('已重置')
}

// ---- toolbar ----
function onUndo() {
  if (!canUndo.value) return
  posterStore.undo()
}

function onRedo() {
  if (!canRedo.value) return
  posterStore.redo()
}

// ---- preview ----
async function onPreview() {
  posterStore.showPreview = true
  await nextTick()
  const canvas = await getCanvasNode()
  if (canvas) {
    const tempPath = await posterStore.drawPoster(canvas)
    posterStore.previewImage = tempPath
  }
}

// ---- export ----
async function onExport() {
  uni.showLoading({ title: '导出中...' })
  try {
    const canvas = await getCanvasNode()
    if (!canvas) {
      uni.hideLoading()
      showToast('导出失败')
      return
    }
    const tempPath = await posterStore.drawPoster(canvas)
    if (tempPath) {
      // #ifdef MP-WEIXIN
      uni.saveImageToPhotosAlbum({
        filePath: tempPath,
        success: () => {
          uni.hideLoading()
          showToast('已保存到相册')
        },
        fail: (err: any) => {
          uni.hideLoading()
          if (err.errMsg.includes('auth')) {
            uni.showModal({
              title: '提示',
              content: '需要您授权保存图片到相册',
              confirmText: '去设置',
              success: (res) => {
                if (res.confirm) uni.openSetting({})
              },
            })
          } else {
            showToast('保存失败')
          }
        },
      })
      // #endif
      // #ifndef MP-WEIXIN
      uni.hideLoading()
      showToast('导出成功')
      // #endif
    } else {
      uni.hideLoading()
      showToast('导出失败')
    }
  } catch (e) {
    uni.hideLoading()
    showToast('导出失败')
    console.warn('export failed:', e)
  }
}

// ---- save ----
async function onSave() {
  await posterStore.saveWork()
}

// ---- preview modal actions ----
function onSaveToAlbum() {
  if (!posterStore.previewImage) {
    showToast('图片生成中...')
    return
  }
  // #ifdef MP-WEIXIN
  uni.saveImageToPhotosAlbum({
    filePath: posterStore.previewImage,
    success: () => showToast('已保存到相册'),
    fail: () => showToast('保存失败'),
  })
  // #endif
  // #ifndef MP-WEIXIN
  showToast('已保存')
  // #endif
}

function onShare() {
  if (!posterStore.previewImage) {
    showToast('图片生成中...')
    return
  }
  // #ifdef MP-WEIXIN
  uni.share({
    provider: 'weixin',
    scene: 'WXSceneSession',
    type: 2,
    imageUrl: posterStore.previewImage,
    success: () => showToast('分享成功'),
    fail: () => showToast('分享取消'),
  })
  // #endif
  // #ifndef MP-WEIXIN
  showToast('分享功能仅在微信可用')
  // #endif
}

// ---- sticker ----
function onOpenSticker() {
  if (posterStore.stickers.length === 0) {
    posterStore.loadStickers()
  }
  posterStore.showStickerPanel = true
}

function onInsertSticker(src: string) {
  posterStore.insertSticker(src)
  posterStore.showStickerPanel = false
  showToast('已添加素材')
}

// ---- layer management ----
function onLayerMove(idx: number, direction: string) {
  posterStore.moveLayer(idx, direction)
  showToast('图层已调整')
}

function onDeleteElement(idx: number) {
  const area = posterStore.editableAreas[idx]
  if (!area) return
  uni.showModal({
    title: '确认删除',
    content: `确定删除此${area.type === 'text' ? '文字' : '图片'}元素吗？`,
    confirmText: '删除',
    cancelText: '取消',
    confirmColor: '#e84a6e',
    success: (res) => {
      if (res.confirm) {
        posterStore.deleteElement(idx)
        showToast('已删除')
      }
    },
  })
}

// ---- template picker ----
async function onSwitchTemplate(id: string) {
  await posterStore.switchTemplate(id)
  showToast('模板已切换')
}

// ---- canvas helper ----
function getCanvasNode(): Promise<any> {
  return new Promise((resolve) => {
    nextTick(() => {
      const query = uni.createSelectorQuery()
      query
        .select('#posterCanvas')
        .fields({ node: true, size: true })
        .exec((res: any) => {
          if (res && res[0] && res[0].node) {
            resolve(res[0].node)
          } else {
            resolve(null)
          }
        })
    })
  })
}

// ---- lifecycle ----
onMounted(() => {
  const pages = getCurrentPages()
  const curPage = pages[pages.length - 1] as any
  const options = curPage?.options || {}

  const templateId = options.templateId || options.id
  if (templateId) {
    posterStore.loadTemplate(templateId)
  } else {
    // try to load default template list
    posterStore.loadRelatedTemplates()
    posterStore.showTemplatePicker = true
  }

  posterStore.loadRelatedTemplates()
})
</script>

<style lang="scss" scoped>
.poster-editor {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  overflow: hidden;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  height: 88rpx;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
}

.toolbar-back {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 48rpx;
  color: #fff;
  font-weight: 300;
}

.toolbar-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
  flex: 1;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300rpx;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.action-btn {
  font-size: 36rpx;
  color: #fff;
  padding: 8rpx 12rpx;
  border-radius: 8rpx;
  transition: opacity 0.2s;
}

.action-btn--text {
  font-size: 26rpx;
  padding: 10rpx 20rpx;
  background: rgba(232, 74, 110, 0.2);
  border: 1rpx solid rgba(232, 74, 110, 0.4);
  color: #ff6b8a;
}

.action-btn--disabled {
  opacity: 0.3;
  pointer-events: none;
}

/* Canvas Area */
.canvas-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 20rpx 0;
}

.canvas-scroll {
  flex: 1;
  height: 100%;
}

.canvas-wrapper {
  position: relative;
  margin: 0 auto;
  max-width: 750rpx;
}

.canvas-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 12rpx;
  display: block;
}

.edit-area {
  position: absolute;
  z-index: 10;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: outline 0.15s;
}

.edit-area--active {
  outline: 3rpx solid #e84a6e;
  outline-offset: -3rpx;
  background: rgba(232, 74, 110, 0.05);
}

.edit-area--text {
  cursor: text;
}

.area-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.area-text {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  word-break: break-word;
  overflow: hidden;
}

.area-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.15);
  border: 2rpx dashed rgba(255, 255, 255, 0.4);
  border-radius: 8rpx;
  gap: 6rpx;
}

.placeholder-icon {
  font-size: 40rpx;
  opacity: 0.6;
}

.placeholder-label {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.6);
}

/* Hint Bar */
.hint-bar {
  flex-shrink: 0;
  padding: 16rpx 24rpx;
  background: rgba(255, 255, 255, 0.05);
  text-align: center;
}

.hint-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.5);
}

/* Edit Panel */
.edit-panel {
  flex-shrink: 0;
  max-height: 500rpx;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  box-shadow: 0 -4rpx 30rpx rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
  flex-shrink: 0;
}

.panel-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.panel-close {
  font-size: 36rpx;
  color: #999;
  padding: 8rpx 16rpx;
}

.panel-scroll {
  flex: 1;
  min-height: 0;
  max-height: 420rpx;
}

.panel-content {
  padding: 20rpx 30rpx 30rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.form-label {
  font-size: 26rpx;
  color: #666;
  font-weight: 500;
}

.form-textarea {
  width: 100%;
  min-height: 100rpx;
  padding: 16rpx 20rpx;
  border: 1rpx solid #e0e0e0;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333;
  background: #fafafa;
}

.color-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.color-dot {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  border: 4rpx solid transparent;
  transition: border-color 0.15s, transform 0.15s;
}

.color-dot--active {
  border-color: #e84a6e;
  transform: scale(1.1);
}

.align-row {
  display: flex;
  gap: 16rpx;
}

.align-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
  transition: border-color 0.15s, background 0.15s;
}

.align-btn--active {
  border-color: #e84a6e;
  background: #fdf0f3;
}

.align-icon {
  font-size: 32rpx;
  color: #666;
}

.toggle-row {
  display: flex;
  gap: 16rpx;
}

.toggle-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
  transition: border-color 0.15s, background 0.15s;
}

.toggle-btn--active {
  border-color: #e84a6e;
  background: #fdf0f3;
}

.toggle-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #666;
}

.toggle-btn--active .toggle-text {
  color: #e84a6e;
}

.font-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.font-btn {
  padding: 12rpx 24rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
  transition: border-color 0.15s, background 0.15s;
}

.font-btn--active {
  border-color: #e84a6e;
  background: #fdf0f3;
}

.font-text {
  font-size: 26rpx;
  color: #666;
}

.font-btn--active .font-text {
  color: #e84a6e;
}

.image-action-row {
  display: flex;
  gap: 20rpx;
}

.img-btn {
  flex: 1;
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%) !important;
  color: #fff !important;
  font-size: 26rpx !important;
  border-radius: 12rpx !important;
}

.scale-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.scale-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 12rpx;
  font-size: 36rpx;
  color: #666;
  flex-shrink: 0;
}

.scale-slider {
  flex: 1;
}

.reset-btn {
  width: 100%;
  background: #f5f5f5 !important;
  color: #666 !important;
  font-size: 26rpx !important;
  border-radius: 12rpx !important;
}

/* Action Bar */
.action-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 16rpx 30rpx;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
}

.action-bar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.action-bar-icon {
  font-size: 40rpx;
}

.action-bar-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
}

/* Hidden Canvas */
.hidden-canvas {
  position: fixed;
  left: -9999px;
  top: -9999px;
  opacity: 0;
  pointer-events: none;
}

/* Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Preview Modal */
.preview-modal {
  width: 90%;
  max-width: 680rpx;
  max-height: 85vh;
  background: #fff;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
  flex-shrink: 0;
}

.preview-modal-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.preview-modal-close {
  font-size: 36rpx;
  color: #999;
  padding: 8rpx 16rpx;
}

.preview-modal-body {
  flex: 1;
  min-height: 0;
  padding: 20rpx;
}

.preview-image {
  width: 100%;
  border-radius: 12rpx;
}

.preview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400rpx;
}

.preview-empty-text {
  font-size: 28rpx;
  color: #999;
}

.preview-modal-footer {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 30rpx;
  border-top: 1rpx solid #f0f0f0;
  flex-shrink: 0;
}

.preview-btn {
  flex: 1;
  font-size: 28rpx !important;
  border-radius: 12rpx !important;
}

.preview-btn--album {
  background: linear-gradient(135deg, #e84a6e 0%, #ff6b8a 100%) !important;
  color: #fff !important;
}

.preview-btn--share {
  background: #f5f5f5 !important;
  color: #333 !important;
}

/* Template Picker Modal */
.picker-modal {
  width: 92%;
  max-width: 700rpx;
  max-height: 80vh;
  background: #fff;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.picker-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
  flex-shrink: 0;
}

.picker-modal-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.picker-modal-close {
  font-size: 36rpx;
  color: #999;
  padding: 8rpx 16rpx;
}

.picker-modal-body {
  flex: 1;
  min-height: 0;
  padding: 20rpx;
}

.picker-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.picker-card {
  width: calc(50% - 10rpx);
  position: relative;
  border-radius: 12rpx;
  overflow: hidden;
  background: #f5f5f5;
}

.picker-card-img {
  width: 100%;
  height: 300rpx;
}

.picker-card-name {
  display: block;
  padding: 12rpx;
  font-size: 24rpx;
  color: #333;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-card-vip {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  padding: 4rpx 12rpx;
  background: linear-gradient(135deg, #f39c12, #e67e22);
  color: #fff;
  font-size: 18rpx;
  border-radius: 8rpx;
  font-weight: 600;
}

.picker-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300rpx;
}

.picker-empty-text {
  font-size: 28rpx;
  color: #999;
}

/* Sticker Modal */
.sticker-modal {
  width: 92%;
  max-width: 700rpx;
  max-height: 70vh;
  background: #fff;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sticker-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
  flex-shrink: 0;
}

.sticker-modal-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.sticker-modal-close {
  font-size: 36rpx;
  color: #999;
  padding: 8rpx 16rpx;
}

.sticker-modal-body {
  flex: 1;
  min-height: 0;
  padding: 20rpx;
}

.sticker-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.sticker-item {
  width: calc(25% - 12rpx);
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9f9f9;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
  transition: border-color 0.15s;
}

.sticker-item:active {
  border-color: #e84a6e;
}

.sticker-img {
  width: 80%;
  height: 80%;
}

.sticker-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300rpx;
}

.sticker-empty-text {
  font-size: 28rpx;
  color: #999;
}

/* Toast */
.toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 20rpx 40rpx;
  border-radius: 12rpx;
  z-index: 9999;
  pointer-events: none;
  animation: toast-fade 0.3s ease;
}

@keyframes toast-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

.toast-text {
  font-size: 28rpx;
  color: #fff;
}

/* Layer Modal */
.layer-modal {
  width: 90%;
  max-width: 680rpx;
  max-height: 70vh;
  background: #fff;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.layer-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
  flex-shrink: 0;
}

.layer-modal-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.layer-modal-close {
  font-size: 36rpx;
  color: #999;
  padding: 8rpx 16rpx;
}

.layer-modal-body {
  flex: 1;
  min-height: 0;
  padding: 10rpx 0;
  max-height: 55vh;
}

.layer-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200rpx;
}

.layer-empty-text {
  font-size: 28rpx;
  color: #999;
}

.layer-item {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #f5f5f5;
  gap: 16rpx;
  transition: background 0.15s;
}

.layer-item:active {
  background: #f5f5f5;
}

.layer-item--active {
  background: #fdf0f3;
}

.layer-item-icon {
  font-size: 32rpx;
  width: 48rpx;
  text-align: center;
  flex-shrink: 0;
}

.layer-item-name {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-item-actions {
  display: flex;
  gap: 4rpx;
  flex-shrink: 0;
}

.layer-action {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #666;
  background: #f0f0f0;
  border-radius: 8rpx;
}

.layer-action:active {
  background: #e0e0e0;
}

.layer-action--danger {
  color: #e84a6e;
  background: #fff0f0;
  font-size: 28rpx;
}
</style>
