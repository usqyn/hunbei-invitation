<template>
  <section class="canvas-area">
    <!-- 单页模式：手机框 -->
    <template v-if="pageMode === 'single'">
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
    </template>
    <!-- 长页面模式：滚动视口 -->
    <template v-else-if="pageMode === 'long'">
      <div class="viewport-wrap" @wheel.prevent="onWheel">
        <div class="viewport-header">长页面 · 可上下拖动元素</div>
        <div
          class="viewport-scroll"
          :style="{ height: (667 * zoom) + 'px' }"
        >
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
        </div>
        <div class="viewport-footer">
          高 {{ canvasSize.height }}px · 区域内滚动查看全页
        </div>
      </div>
    </template>
    <!-- 横屏卡片模式 -->
    <template v-else-if="pageMode === 'landscape'">
      <div class="card-wrap" @wheel.prevent="onWheel">
        <div class="card-header">横屏卡片 · 宽 {{ canvasSize.width }} × 高 {{ canvasSize.height }}</div>
        <div class="card-viewport">
          <div
            class="card-frame"
            :style="{
              width: (canvasSize.width * zoom) + 'px',
              height: (canvasSize.height * zoom) + 'px',
            }"
          >
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
          </div>
        </div>
        <div class="card-footer">卡片居中展示 · 传统横版贺卡风格</div>
      </div>
    </template>
    <!-- 翻页模式：多页编辑 -->
    <template v-else-if="pageMode === 'flip'">
      <div class="flip-canvas-wrap" @wheel.prevent="onWheel">
        <div class="flip-header">翻页模式 · 当前第 {{ currentFlipPageIndex + 1 }} / {{ flipPages.length }} 页</div>
        <div class="flip-nav">
          <button class="flip-nav-btn" @click="$emit('prevFlipPage')" :disabled="currentFlipPageIndex === 0">← 上一页</button>
          <div class="flip-indicators">
            <span
              v-for="(_, idx) in flipPages"
              :key="idx"
              class="flip-indicator"
              :class="{ active: currentFlipPageIndex === idx }"
              @click="$emit('selectFlipPage', idx)"
            ></span>
          </div>
          <button class="flip-nav-btn" @click="$emit('nextFlipPage')" :disabled="currentFlipPageIndex === flipPages.length - 1">下一页 →</button>
        </div>
        <div class="flip-viewport">
          <div
            class="flip-frame"
            :style="{
              width: (canvasSize.width * zoom) + 'px',
              height: (canvasSize.height * zoom) + 'px',
            }"
          >
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
          </div>
        </div>
        <div class="flip-footer">
          当前页面：{{ flipPages[currentFlipPageIndex]?.name || '-' }} · 点击左侧页面列表切换页面
        </div>
      </div>
    </template>

    <!-- 画布底部状态栏 -->
    <div class="canvas-footer">
      <span>画布：{{ canvasSize.width }} × {{ canvasSize.height }}</span>
      <span v-if="selectedId">已选中：{{ selectedElement?.type === 'text' ? '文字' : '图片' }}（{{ Math.round((selectedElement as any).width || 0) }} × {{ Math.round((selectedElement as any).height || 0) }}）</span>
      <span v-else>未选中元素 · 提示：点击画布元素以编辑</span>
      <button class="preview-toggle-btn" @click="$emit('togglePreview')">
        {{ showPreview ? '收起预览' : '预览效果' }}
      </button>
    </div>

    <!-- 实时预览面板 -->
    <div v-if="showPreview" class="preview-panel">
      <div class="preview-phone-frame">
        <div class="preview-phone-notch"></div>
        <div class="preview-phone-screen">
          <img v-if="previewImage" :src="previewImage" class="preview-img" alt="预览" />
          <div v-else class="preview-placeholder">点击刷新获取预览</div>
        </div>
        <div class="preview-phone-home"></div>
      </div>
      <button class="preview-refresh-btn" @click="$emit('refreshPreview')">刷新预览</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { PageMode, CanvasSize, AnyCanvasElement, FlipPage } from '../types/canvas'

const props = defineProps<{
  pageMode: PageMode
  canvasSize: CanvasSize
  zoom: number
  selectedId: string | null
  selectedElement: AnyCanvasElement | null
  showPreview: boolean
  previewImage: string
  currentFlipPageIndex: number
  flipPages: FlipPage[]
}>()

const emit = defineEmits<{
  'wheel': [e: WheelEvent]
  'canvasDrop': [e: DragEvent]
  'canvasDragOver': [e: DragEvent]
  'togglePreview': []
  'refreshPreview': []
  'prevFlipPage': []
  'nextFlipPage': []
  'selectFlipPage': [idx: number]
  'update:canvasRef': [el: HTMLCanvasElement | null]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

// 暴露 canvasRef 给父组件
defineExpose({ canvasRef })

// 当 canvasRef 变化时通知父组件
watch(canvasRef, (el) => {
  emit('update:canvasRef', el)
}, { immediate: true })

function onWheel(e: WheelEvent) {
  emit('wheel', e)
}

function onCanvasDrop(e: DragEvent) {
  emit('canvasDrop', e)
}

function onCanvasDragOver(e: DragEvent) {
  emit('canvasDragOver', e)
}
</script>

<style scoped>
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

/* 长页面视口模式 */
.viewport-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  background-image:
    linear-gradient(45deg, #e0e4ea 25%, transparent 25%),
    linear-gradient(-45deg, #e0e4ea 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e0e4ea 75%),
    linear-gradient(-45deg, transparent 75%, #e0e4ea 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, 10px 0;
  background-color: #eef1f6;
}

.viewport-header {
  font-size: 11px;
  color: #999;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

.viewport-scroll {
  overflow-y: auto;
  border: 2px solid #c0c4cc;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  background: #fff;
}

.viewport-scroll::-webkit-scrollbar { width: 6px; }
.viewport-scroll::-webkit-scrollbar-track { background: #f0f0f0; border-radius: 3px; }
.viewport-scroll::-webkit-scrollbar-thumb { background: #c0c4cc; border-radius: 3px; }

.viewport-footer {
  font-size: 11px;
  color: #999;
  margin-top: 8px;
}

/* 横屏卡片模式 */
.card-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  background-image:
    linear-gradient(45deg, #e0e4ea 25%, transparent 25%),
    linear-gradient(-45deg, #e0e4ea 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e0e4ea 75%),
    linear-gradient(-45deg, transparent 75%, #e0e4ea 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, 10px 0;
  background-color: #eef1f6;
}

.card-header {
  font-size: 11px;
  color: #999;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

.card-viewport {
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-frame {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.18);
  overflow: hidden;
  transition: width 0.2s, height 0.2s;
}

.card-footer {
  font-size: 11px;
  color: #999;
  margin-top: 8px;
}

.fabric-canvas {
  background: #fff;
  display: block;
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

/* 翻页模式画布区域 */
.flip-canvas-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.flip-header {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
}

.flip-nav {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
}

.flip-nav-btn {
  padding: 6px 16px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.flip-nav-btn:hover:not(:disabled) {
  border-color: #1976d2;
  color: #1976d2;
}

.flip-nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.flip-indicators {
  display: flex;
  gap: 8px;
}

.flip-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ddd;
  cursor: pointer;
  transition: all 0.2s;
}

.flip-indicator:hover { background: #bbb; }
.flip-indicator.active { background: #1976d2; }

.flip-viewport {
  background: #e0e0e0;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.flip-frame {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.flip-footer {
  font-size: 12px;
  color: #999;
  margin-top: 10px;
}

/* ====== 实时预览面板 ====== */
.preview-toggle-btn {
  margin-left: auto;
  padding: 4px 12px;
  background: #1976d2;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}
.preview-toggle-btn:hover { background: #1565c0; }

.preview-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 20px;
  background: #e3f2fd;
  border-top: 1px solid #bbdefb;
}

.preview-phone-frame {
  position: relative;
  width: 180px;
  height: 320px;
  background: #1a1a1a;
  border-radius: 24px;
  padding: 12px 6px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.preview-phone-notch {
  width: 32px;
  height: 5px;
  background: #333;
  border-radius: 3px;
  margin-bottom: 6px;
}

.preview-phone-screen {
  flex: 1;
  width: 100%;
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.preview-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #999;
}

.preview-phone-home {
  width: 40px;
  height: 4px;
  background: #555;
  border-radius: 2px;
  margin-top: 6px;
}

.preview-refresh-btn {
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #90caf9;
  border-radius: 6px;
  font-size: 13px;
  color: #1976d2;
  cursor: pointer;
  transition: all 0.15s;
}
.preview-refresh-btn:hover { background: #e3f2fd; }

/* 滚动条样式（webkit） */
.canvas-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
.canvas-scroll::-webkit-scrollbar-track { background: transparent; }
.canvas-scroll::-webkit-scrollbar-thumb { background: #c0c4cc; border-radius: 3px; }
.canvas-scroll::-webkit-scrollbar-thumb:hover { background: #9098a8; }
</style>
