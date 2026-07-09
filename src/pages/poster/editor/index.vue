<template>
  <view class="poster-editor">
    <!-- ===== 顶部工具栏 ===== -->
    <view class="toolbar">
      <view class="toolbar-left" @click="goBack">
        <text class="back-icon">‹</text>
        <text>返回</text>
      </view>
      <text class="toolbar-title">{{ templateName }}</text>
      <view class="toolbar-right">
        <view
          class="toolbar-action"
          :class="{ 'toolbar-action--disabled': !canUndo }"
          @click="onUndo"
        >↩</view>
        <view
          class="toolbar-action"
          :class="{ 'toolbar-action--disabled': !canRedo }"
          @click="onRedo"
        >↪</view>
        <view class="toolbar-btn tpl-btn" @click="posterStore.showTemplatePicker = true">换模板</view>
        <view class="toolbar-btn preview-btn" @click="onPreview">预览</view>
      </view>
    </view>

    <!-- ===== 画布区域 ===== -->
    <view class="canvas-area">
      <!-- 加载中 -->
      <view v-if="posterStore.templateLoading" class="loading-state">
        <text class="loading-text">⏳ 加载模板中...</text>
      </view>
      <!-- 无模板 -->
      <view v-else-if="!posterStore.currentTemplate" class="empty-state">
        <text class="empty-icon">📋</text>
        <text class="empty-text">暂未加载模板</text>
        <button class="empty-btn" @click="goToTemplates">去挑选模板</button>
      </view>
      <!-- 画布 -->
      <scroll-view v-else class="canvas-scroll" scroll-y enhanced show-scrollbar="{{false}}">
        <view class="canvas-wrapper" :style="canvasWrapperStyle">
          <image
            v-if="posterStore.currentTemplate"
            class="canvas-bg"
            :src="resolvedBgUrl"
            mode="aspectFill"
          />
          <!-- 可编辑区域 -->
          <view
            v-for="area in posterStore.editableAreas"
            :key="area.id"
            class="edit-area"
            :class="{
              'edit-area--active': posterStore.selectedAreaId === area.id,
              'edit-area--image': area.type === 'image',
              'edit-area--text': area.type === 'text',
            }"
            :style="getAreaStyle(area)"
            @click.stop="onAreaClick(area)"
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
              <text class="placeholder-icon">📷</text>
              <text class="placeholder-label">点击换图</text>
            </view>
            <!-- 选中手柄 -->
            <view v-if="posterStore.selectedAreaId === area.id" class="area-handle area-handle--tl"></view>
            <view v-if="posterStore.selectedAreaId === area.id" class="area-handle area-handle--tr"></view>
            <view v-if="posterStore.selectedAreaId === area.id" class="area-handle area-handle--bl"></view>
            <view v-if="posterStore.selectedAreaId === area.id" class="area-handle area-handle--br"></view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- ===== 编辑面板：无选中 ===== -->
    <view v-if="!posterStore.selectedAreaId" class="edit-panel edit-panel--hint">
      <text class="hint-icon">👆</text>
      <text class="hint-title">点击海报上的文字或图片区域进行编辑</text>
      <text class="hint-sub">选中后可修改内容、样式和位置</text>
    </view>

    <!-- ===== 编辑面板：文字 ===== -->
    <view v-if="selectedArea && selectedArea.type === 'text'" class="edit-panel">
      <view class="panel-header">
        <text class="panel-title">编辑文字</text>
        <view class="panel-close" @click="posterStore.selectArea(null)">✕</view>
      </view>
      <scroll-view class="panel-scroll" scroll-y enhanced show-scrollbar="{{false}}">
        <view class="panel-content">
          <!-- 文字内容 -->
          <view class="form-item">
            <textarea
              class="form-textarea"
              v-model="selectedArea._text"
              placeholder="输入文字内容"
              auto-height
              @input="onTextInput"
            />
          </view>
          <!-- 字号 -->
          <view class="form-row">
            <text class="form-label">字号</text>
            <slider
              :value="selectedArea._fontSize"
              :min="12" :max="80" :step="1"
              activeColor="#e84a6e" backgroundColor="#e8e8e8"
              block-size="18" block-color="#fff"
              style="flex:1;margin:0 20rpx;"
              @change="onFontSizeChange"
            />
            <text class="form-value">{{ selectedArea._fontSize }}</text>
          </view>
          <!-- 颜色 -->
          <view class="form-row">
            <text class="form-label">颜色</text>
            <scroll-view class="color-scroll" scroll-x enhanced show-scrollbar="{{false}}">
              <view class="color-list">
                <view
                  v-for="color in posterStore.colorOptions"
                  :key="color"
                  class="color-dot"
                  :class="{ 'color-dot--active': selectedArea._color === color }"
                  :style="{ background: color }"
                  @click="onColorChange(color)"
                />
              </view>
            </scroll-view>
          </view>
          <!-- 对齐 -->
          <view class="form-row">
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
          <!-- 加粗 -->
          <view class="form-row">
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
          <!-- 字体 -->
          <view class="form-row">
            <text class="form-label">字体</text>
            <scroll-view class="font-scroll" scroll-x enhanced show-scrollbar="{{false}}">
              <view class="font-list">
                <view
                  v-for="font in posterStore.fontOptions"
                  :key="font.value"
                  class="font-btn"
                  :class="{ 'font-btn--active': selectedArea._fontFamily === font.value }"
                  @click="onFontChange(font.value)"
                >
                  <text class="font-text">{{ font.label }}</text>
                </view>
              </view>
            </scroll-view>
          </view>
          <!-- 旋转 -->
          <view class="form-row">
            <text class="form-label">旋转</text>
            <slider
              :value="selectedArea._rotate"
              :min="-180" :max="180" :step="1"
              activeColor="#e84a6e" backgroundColor="#e8e8e8"
              block-size="18" block-color="#fff"
              style="flex:1;margin:0 20rpx;"
              @change="onRotateChange"
            />
            <text class="form-value">{{ selectedArea._rotate }}°</text>
          </view>
          <!-- 重置 -->
          <view class="form-item">
            <button class="reset-btn" @click="onReset">恢复默认</button>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- ===== 编辑面板：图片 ===== -->
    <view v-if="selectedArea && selectedArea.type === 'image'" class="edit-panel">
      <view class="panel-header">
        <text class="panel-title">编辑图片</text>
        <view class="panel-close" @click="posterStore.selectArea(null)">✕</view>
      </view>
      <scroll-view class="panel-scroll" scroll-y enhanced show-scrollbar="{{false}}">
        <view class="panel-content">
          <view class="form-item">
            <view class="image-action-row">
              <button class="img-btn" @click="onChooseImage">更换图片</button>
            </view>
          </view>
          <!-- 旋转 -->
          <view class="form-row">
            <text class="form-label">旋转</text>
            <slider
              :value="selectedArea._rotate"
              :min="-180" :max="180" :step="1"
              activeColor="#e84a6e" backgroundColor="#e8e8e8"
              block-size="18" block-color="#fff"
              style="flex:1;margin:0 20rpx;"
              @change="onRotateChange"
            />
            <text class="form-value">{{ selectedArea._rotate }}°</text>
          </view>
          <!-- 缩放 -->
          <view class="form-row">
            <text class="form-label">缩放</text>
            <view class="scale-row">
              <view class="scale-btn" @click="onScaleChange(-0.1)">−</view>
              <slider
                class="scale-slider"
                :value="Math.round((selectedArea._scale || 1) * 100)"
                :min="50" :max="200" :step="5"
                activeColor="#e84a6e" backgroundColor="#e8e8e8"
                block-size="18" block-color="#fff"
                @change="onScaleSliderChange"
              />
              <view class="scale-btn" @click="onScaleChange(0.1)">+</view>
            </view>
          </view>
          <!-- 重置 -->
          <view class="form-item">
            <button class="reset-btn" @click="onReset">恢复默认</button>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- ===== 底部操作栏 ===== -->
    <view class="action-bar">
      <view class="action-bar-item action-bar-item--outline" @click="onOpenSticker">
        <text>🎨 素材</text>
      </view>
      <view class="action-bar-item action-bar-item--outline" @click="posterStore.showLayerPanel = true">
        <text>📑 图层</text>
      </view>
      <view class="action-bar-item action-bar-item--outline" @click="onSave">
        <text>💾 保存</text>
      </view>
      <view class="action-bar-item action-bar-item--primary" @click="onExport">
        <text>📤 导出海报</text>
      </view>
    </view>

    <!-- ===== 隐藏 Canvas ===== -->
    <canvas
      type="2d"
      id="posterCanvas"
      canvas-id="posterCanvas"
      class="hidden-canvas"
      :style="{ width: canvasSize.width + 'px', height: canvasSize.height + 'px' }"
    />

    <!-- ===== 预览弹窗 ===== -->
    <view v-if="posterStore.showPreview" class="modal-overlay" @click="posterStore.showPreview = false">
      <view class="preview-modal" @click.stop>
        <view class="preview-modal-header">
          <text>海报预览</text>
          <view class="preview-modal-close" @click="posterStore.showPreview = false">✕</view>
        </view>
        <scroll-view class="preview-modal-body" scroll-y>
          <image
            v-if="posterStore.previewImage"
            class="preview-image"
            :src="posterStore.previewImage"
            mode="widthFix"
          />
          <view v-else class="preview-empty">
            <view class="spinner"></view>
            <text>正在生成海报...</text>
          </view>
        </scroll-view>
        <view class="preview-modal-footer" v-if="posterStore.previewImage">
          <button class="preview-btn preview-btn--album" @click="onSaveToAlbum">保存到相册</button>
          <button class="preview-btn preview-btn--share" @click="onShare">分享给好友</button>
        </view>
      </view>
    </view>

    <!-- ===== 模板切换弹窗 ===== -->
    <view v-if="posterStore.showTemplatePicker" class="modal-overlay modal-overlay--bottom" @click="posterStore.showTemplatePicker = false">
      <view class="bottom-sheet" @click.stop>
        <view class="bottom-sheet-header">
          <text>选择模板</text>
          <view class="bottom-sheet-close" @click="posterStore.showTemplatePicker = false">✕</view>
        </view>
        <scroll-view class="bottom-sheet-body" scroll-y enhanced show-scrollbar="{{false}}">
          <view class="picker-grid">
            <view
              v-for="tpl in posterStore.relatedTemplates"
              :key="tpl.id"
              class="picker-card"
              :class="{ 'picker-card--active': posterStore.currentTemplate?.id === tpl.id }"
              @click="onSwitchTemplate(tpl.id)"
            >
              <image class="picker-card-img" :src="resolveUrl(tpl.cover_url)" mode="aspectFill" />
              <text class="picker-card-name">{{ tpl.name }}</text>
              <view v-if="tpl.is_vip" class="picker-card-vip">VIP</view>
            </view>
          </view>
          <view v-if="posterStore.relatedTemplates.length === 0" class="picker-empty">
            <text>暂无更多模板</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- ===== 图层管理弹窗 ===== -->
    <view v-if="posterStore.showLayerPanel" class="modal-overlay modal-overlay--bottom" @click="posterStore.showLayerPanel = false">
      <view class="bottom-sheet" @click.stop>
        <view class="bottom-sheet-header">
          <text>图层管理</text>
          <view class="bottom-sheet-close" @click="posterStore.showLayerPanel = false">✕</view>
        </view>
        <scroll-view class="bottom-sheet-body" scroll-y enhanced show-scrollbar="{{false}}">
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

    <!-- ===== 素材面板 ===== -->
    <view v-if="posterStore.showStickerPanel" class="modal-overlay modal-overlay--bottom" @click="posterStore.showStickerPanel = false">
      <view class="bottom-sheet" @click.stop>
        <view class="bottom-sheet-header">
          <text>素材库</text>
          <view class="bottom-sheet-close" @click="posterStore.showStickerPanel = false">✕</view>
        </view>
        <scroll-view class="bottom-sheet-body" scroll-y enhanced show-scrollbar="{{false}}">
          <view class="sticker-grid" v-if="posterStore.stickers.length > 0">
            <view
              v-for="(sticker, idx) in posterStore.stickers"
              :key="idx"
              class="sticker-item"
              @click="onInsertSticker(sticker)"
            >
              <image class="sticker-img" :src="sticker" mode="aspectFit" />
            </view>
          </view>
          <view v-else class="sticker-empty">
            <text class="sticker-empty-icon">🎨</text>
            <text class="sticker-empty-text">暂无素材</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- ===== Toast ===== -->
    <view v-if="toastVisible" class="toast" :class="{ 'toast--show': toastVisible }">
      <text>{{ toastMsg }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { usePosterStore } from '@/stores/poster'
import { useGoBack } from '@/composables/useGoBack'
import { API_BASE } from '@/config'
import { request } from '@/utils/request'
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
  posterStore.previewImage = ''
  await nextTick()
  try {
    const canvas = await getCanvasNode()
    if (canvas) {
      const tempPath = await posterStore.drawPoster(canvas)
      posterStore.previewImage = tempPath || ''
    }
    if (!posterStore.previewImage) {
      showToast('预览生成失败，请重试')
    }
  } catch (e) {
    console.warn('preview failed:', e)
    showToast('预览生成失败')
    posterStore.showPreview = false
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

function goToTemplates() {
  uni.navigateTo({ url: '/pages/poster/index/index' })
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
onMounted(async () => {
  const pages = getCurrentPages()
  const curPage = pages[pages.length - 1] as any
  const options = curPage?.options || {}

  const templateId = options.templateId || options.id
  const workId = options.workId

  if (workId) {
    posterStore.setWorkId(workId)
    try {
      const workData = await request<{ template_id: string; template_name?: string; cover_url?: string; content: any }>({
        url: `/api/poster/works/${workId}`,
        hideLoading: true,
      })
      if (workData && workData.content && workData.content.editableAreas) {
        const templateIdToLoad = workData.template_id || templateId
        if (templateIdToLoad) {
          await posterStore.loadTemplate(templateIdToLoad)
        }
        posterStore.restoreFromWork(workData.content.editableAreas)
        showToast('已加载作品')
      } else if (templateId) {
        await posterStore.loadTemplate(templateId)
      }
    } catch (e) {
      console.warn('加载作品失败:', e)
      if (templateId) {
        await posterStore.loadTemplate(templateId)
      }
    }
  } else if (templateId) {
    await posterStore.loadTemplate(templateId)
  } else {
    posterStore.loadRelatedTemplates()
    posterStore.showTemplatePicker = true
  }

  posterStore.loadRelatedTemplates()
})
</script>

<style lang="scss" scoped>
/* ================================================================
   海报编辑器 v3 — hunbei-invitation
   主题色: #e84a6e (粉红)
   ================================================================ */

.poster-editor {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background: linear-gradient(180deg, #0f0f23 0%, #1a1a2e 40%, #16213e 100%);
  overflow: hidden;
}

/* ==================== 工具栏 ==================== */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20rpx;
  height: 96rpx;
  flex-shrink: 0;
  background: rgba(15, 15, 35, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1rpx solid rgba(255,255,255,0.06);
  z-index: 100;
}

.toolbar-left {
  display: flex;
  align-items: center;
  font-size: 28rpx;
  color: #fff;
  gap: 2rpx;
  padding: 10rpx 16rpx 10rpx 6rpx;
  border-radius: 30rpx;
  background: rgba(255,255,255,0.06);
}
.toolbar-left:active { background: rgba(255,255,255,0.14); }

.back-icon {
  font-size: 40rpx;
  line-height: 1;
  margin-top: -2rpx;
  color: #fff;
  font-weight: 300;
}

.toolbar-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
  opacity: 0.9;
  letter-spacing: 1rpx;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.toolbar-action {
  width: 52rpx;
  height: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  color: #fff;
  border-radius: 50%;
  background: rgba(255,255,255,0.06);
  transition: all 0.2s;
}
.toolbar-action:active {
  background: rgba(255,255,255,0.18);
  transform: scale(0.92);
}
.toolbar-action--disabled {
  opacity: 0.25;
  pointer-events: none;
}

.toolbar-btn {
  padding: 10rpx 22rpx;
  border-radius: 24rpx;
  font-size: 22rpx;
  font-weight: 500;
  transition: all 0.2s;
}
.toolbar-btn.tpl-btn {
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.7);
}
.toolbar-btn.preview-btn {
  background: linear-gradient(135deg, #e84a6e, #ff6b8a);
  color: #fff;
  box-shadow: 0 4rpx 12rpx rgba(232,74,110,0.3);
}
.toolbar-btn:active { transform: scale(0.94); opacity: 0.85; }

/* ==================== 画布区 ==================== */
.canvas-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 30rpx 20rpx;
}

.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
}
.loading-text {
  font-size: 28rpx;
  color: rgba(255,255,255,0.6);
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
}
.empty-icon { font-size: 80rpx; opacity: 0.5; }
.empty-text { font-size: 28rpx; color: rgba(255,255,255,0.5); }
.empty-btn {
  padding: 18rpx 52rpx;
  background: linear-gradient(135deg, #e84a6e, #ff6b8a);
  color: #fff;
  font-size: 26rpx;
  border-radius: 40rpx;
  border: none;
  box-shadow: 0 6rpx 18rpx rgba(232,74,110,0.3);
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

/* ---- 可编辑区域 ---- */
.edit-area {
  position: absolute;
  z-index: 10;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  transition: box-shadow 0.2s;
}
.edit-area--image {
  border: 2rpx solid rgba(255,255,255,0.2);
  border-radius: 6rpx;
}
.edit-area--text {
  border: 2rpx solid rgba(255,255,255,0.12);
  border-radius: 6rpx;
}
.edit-area--active.edit-area--image {
  border-color: rgba(232,74,110,0.6);
}
.edit-area--active.edit-area--text {
  border-color: rgba(232,74,110,0.5);
}
.edit-area--active {
  background: rgba(232,74,110,0.06) !important;
  z-index: 20;
}

.area-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
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
  background: rgba(0,0,0,0.2);
  backdrop-filter: blur(4px);
  gap: 6rpx;
}
.placeholder-icon { font-size: 40rpx; }
.placeholder-label { font-size: 20rpx; color: rgba(255,255,255,0.7); }

/* ---- 选中手柄 ---- */
.area-handle {
  position: absolute;
  width: 16rpx;
  height: 16rpx;
  background: #fff;
  border: 2rpx solid #e84a6e;
  border-radius: 50%;
  z-index: 25;
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.25);
  animation: handlePulse 2s ease-in-out infinite;
}
.area-handle--tl { top: -8rpx; left: -8rpx; }
.area-handle--tr { top: -8rpx; right: -8rpx; }
.area-handle--bl { bottom: -8rpx; left: -8rpx; }
.area-handle--br { bottom: -8rpx; right: -8rpx; }

@keyframes handlePulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(232,74,110,0.4); }
  50% { box-shadow: 0 0 0 8rpx rgba(232,74,110,0); }
}

/* ==================== 编辑面板 ==================== */
.edit-panel {
  flex-shrink: 0;
  max-height: 440rpx;
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  box-shadow: 0 -4rpx 20rpx rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.edit-panel--hint {
  text-align: center;
  padding: 48rpx 40rpx;
  background: linear-gradient(180deg, rgba(255,255,255,0.95), #fff);
}
.hint-icon { font-size: 56rpx; display: block; margin-bottom: 12rpx; }
.hint-title { color: #555; font-size: 26rpx; display: block; font-weight: 500; }
.hint-sub { color: #aaa; font-size: 22rpx; margin-top: 6rpx; display: block; }

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 28rpx;
  border-bottom: 1rpx solid #f0f0f0;
  flex-shrink: 0;
}
.panel-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #1a1a2e;
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.panel-title::before {
  content: '';
  width: 6rpx;
  height: 24rpx;
  background: linear-gradient(180deg, #e84a6e, #1a1a2e);
  border-radius: 3rpx;
}
.panel-close {
  width: 44rpx;
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  color: #999;
  border-radius: 50%;
  background: #f5f5f5;
}

.panel-scroll {
  flex: 1;
  min-height: 0;
  max-height: 360rpx;
}

.panel-content {
  padding: 16rpx 28rpx 28rpx;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.form-item {
  display: flex;
  flex-direction: column;
}

.form-row {
  display: flex;
  align-items: center;
  padding: 14rpx 0;
  border-top: 1rpx solid #f4f4f4;
}

.form-label {
  width: 80rpx;
  font-size: 26rpx;
  color: #888;
  flex-shrink: 0;
  font-weight: 500;
}

.form-value {
  width: 60rpx;
  text-align: right;
  font-size: 26rpx;
  color: #333;
  flex-shrink: 0;
  font-weight: 500;
}

.form-textarea {
  width: 100%;
  min-height: 100rpx;
  padding: 18rpx 22rpx;
  border: 2rpx solid #eee;
  border-radius: 14rpx;
  font-size: 28rpx;
  color: #333;
  background: #fafafa;
}

/* ---- 颜色 ---- */
.color-scroll {
  flex: 1;
  white-space: nowrap;
  overflow-x: auto;
}
.color-list {
  display: inline-flex;
  gap: 16rpx;
  padding: 4rpx 0;
}
.color-dot {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  border: 3rpx solid transparent;
  box-shadow: 0 3rpx 8rpx rgba(0,0,0,0.12);
  flex-shrink: 0;
  transition: all 0.2s;
}
.color-dot--active {
  border-color: #1a1a2e;
  transform: scale(1.18);
  box-shadow: 0 4rpx 14rpx rgba(0,0,0,0.2);
}

/* ---- 对齐 ---- */
.align-row {
  display: flex;
  gap: 8rpx;
  flex: 1;
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
  transition: all 0.2s;
}
.align-btn--active {
  border-color: #e84a6e;
  background: #fdf0f3;
}
.align-icon { font-size: 32rpx; color: #666; }

/* ---- 加粗 ---- */
.toggle-row {
  display: flex;
  flex: 1;
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
  transition: all 0.2s;
}
.toggle-btn--active {
  border-color: #e84a6e;
  background: #fdf0f3;
}
.toggle-text { font-size: 32rpx; font-weight: bold; color: #666; }
.toggle-btn--active .toggle-text { color: #e84a6e; }

/* ---- 字体 ---- */
.font-scroll {
  flex: 1;
  white-space: nowrap;
  overflow-x: auto;
}
.font-list {
  display: inline-flex;
  gap: 12rpx;
  padding: 4rpx 0;
}
.font-btn {
  padding: 10rpx 22rpx;
  background: #f5f5f5;
  border-radius: 10rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s;
}
.font-btn--active {
  border-color: #e84a6e;
  background: #fdf0f3;
}
.font-text { font-size: 24rpx; color: #666; white-space: nowrap; }
.font-btn--active .font-text { color: #e84a6e; }

/* ---- 图片按钮 ---- */
.image-action-row {
  display: flex;
  gap: 16rpx;
}
.img-btn {
  flex: 1;
  background: linear-gradient(135deg, #e84a6e, #ff6b8a) !important;
  color: #fff !important;
  font-size: 26rpx !important;
  border-radius: 14rpx !important;
  padding: 20rpx !important;
  box-shadow: 0 4rpx 12rpx rgba(232,74,110,0.25);
}
.img-btn:active { transform: scale(0.96); opacity: 0.9; }

/* ---- 缩放 ---- */
.scale-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex: 1;
}
.scale-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border: 2rpx solid #e8e8e8;
  border-radius: 50%;
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  flex-shrink: 0;
  transition: all 0.15s;
}
.scale-btn:active {
  background: #e84a6e;
  color: #fff;
  border-color: #e84a6e;
}
.scale-slider { flex: 1; }

/* ---- 重置 ---- */
.reset-btn {
  width: 100%;
  padding: 16rpx;
  background: #fff !important;
  color: #e84a6e !important;
  border: 2rpx solid rgba(232,74,110,0.25) !important;
  font-size: 26rpx !important;
  border-radius: 14rpx !important;
}
.reset-btn:active { background: #fef5f5 !important; }

/* ==================== 底部操作栏 ==================== */
.action-bar {
  flex-shrink: 0;
  display: flex;
  gap: 14rpx;
  padding: 20rpx 28rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1rpx solid rgba(0,0,0,0.04);
}

.action-bar-item {
  padding: 22rpx 0;
  border-radius: 16rpx;
  font-size: 26rpx;
  font-weight: 500;
  text-align: center;
  transition: all 0.2s;
}
.action-bar-item:active { transform: scale(0.96); }

.action-bar-item--outline {
  flex: 0.8;
  background: #fff;
  color: #555;
  border: 2rpx solid #e8e8e8;
}
.action-bar-item--outline:active { background: #f5f5f5; }

.action-bar-item--primary {
  flex: 1.4;
  background: linear-gradient(135deg, #e84a6e, #ff6b8a);
  color: #fff;
  box-shadow: 0 6rpx 18rpx rgba(232,74,110,0.35);
  font-weight: 700;
  letter-spacing: 2rpx;
}
.action-bar-item--primary:active { box-shadow: 0 3rpx 10rpx rgba(232,74,110,0.25); }

/* ==================== 隐藏 Canvas ==================== */
.hidden-canvas {
  position: fixed;
  left: -9999px;
  top: -9999px;
  opacity: 0;
  pointer-events: none;
}

/* ==================== 弹窗遮罩 ==================== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-overlay--bottom {
  align-items: flex-end;
}

/* ---- 底部弹出 ---- */
.bottom-sheet {
  width: 100%;
  max-height: 68vh;
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 -8rpx 30rpx rgba(0,0,0,0.15);
}
.bottom-sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 30rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #1a1a2e;
  border-bottom: 1rpx solid #f0f0f0;
  flex-shrink: 0;
}
.bottom-sheet-close {
  width: 44rpx;
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #999;
  border-radius: 50%;
  background: #f5f5f5;
}
.bottom-sheet-body {
  flex: 1;
  min-height: 0;
  padding: 20rpx;
}

/* ---- 预览弹窗 ---- */
.preview-modal {
  width: 88%;
  max-height: 88vh;
  background: #fff;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20rpx 60rpx rgba(0,0,0,0.4);
}
.preview-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26rpx 30rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #1a1a2e;
  border-bottom: 1rpx solid #f0f0f0;
  flex-shrink: 0;
}
.preview-modal-close {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #999;
  border-radius: 50%;
  background: #f5f5f5;
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400rpx;
  gap: 20rpx;
  color: #999;
  font-size: 28rpx;
}
.spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid #eee;
  border-top-color: #e84a6e;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.preview-modal-footer {
  display: flex;
  gap: 16rpx;
  padding: 26rpx 30rpx;
  border-top: 1rpx solid #f0f0f0;
  flex-shrink: 0;
}
.preview-btn {
  flex: 1;
  font-size: 28rpx !important;
  border-radius: 14rpx !important;
  padding: 22rpx !important;
}
.preview-btn--album {
  background: linear-gradient(135deg, #e84a6e, #ff6b8a) !important;
  color: #fff !important;
  box-shadow: 0 4rpx 14rpx rgba(232,74,110,0.3);
  font-weight: 600;
}
.preview-btn--share {
  background: #fff !important;
  color: #1a1a2e !important;
  border: 2rpx solid #e8e8e8;
  font-weight: 500;
}

/* ---- 模板选择 ---- */
.picker-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.picker-card {
  width: calc(50% - 8rpx);
  border-radius: 14rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.06);
  position: relative;
  transition: all 0.2s;
}
.picker-card:active { transform: scale(0.97); }
.picker-card--active { outline: 3rpx solid #e84a6e; outline-offset: -3rpx; }
.picker-card-img { width: 100%; height: 220rpx; display: block; object-fit: cover; }
.picker-card-name {
  display: block;
  padding: 12rpx 14rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: #fff;
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
  color: #999;
  font-size: 28rpx;
}

/* ---- 素材 ---- */
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
  background: #fafafa;
  border-radius: 14rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s;
}
.sticker-item:active {
  background: #fdf0f3;
  border-color: #e84a6e;
  transform: scale(0.95);
}
.sticker-img { width: 75%; height: 75%; }
.sticker-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300rpx;
  gap: 12rpx;
}
.sticker-empty-icon { font-size: 64rpx; }
.sticker-empty-text { font-size: 28rpx; color: #bbb; }

/* ---- 图层 ---- */
.layer-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200rpx;
}
.layer-empty-text { font-size: 28rpx; color: #bbb; }

.layer-item {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid #f5f5f5;
  gap: 16rpx;
  transition: background 0.15s;
  border-radius: 10rpx;
  margin-bottom: 4rpx;
}
.layer-item:active { background: #f5f5f5; }
.layer-item--active { background: #fdf0f3; }
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
  transition: background 0.15s;
}
.layer-action:active { background: #e0e0e0; }
.layer-action--danger {
  color: #e84a6e;
  background: #fff0f0;
  font-size: 28rpx;
}

/* ==================== Toast ==================== */
.toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.8);
  background: rgba(0,0,0,0.82);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #fff;
  padding: 20rpx 44rpx;
  border-radius: 34rpx;
  font-size: 26rpx;
  z-index: 9999;
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  pointer-events: none;
}
.toast--show {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}
</style>
