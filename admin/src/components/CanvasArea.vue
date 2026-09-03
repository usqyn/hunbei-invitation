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
          <!--
            缩放通过外层 wrapper 的 CSS transform scale(zoom) 完成：
            - Fabric 内部使用 getBoundingClientRect() 计算 canvas 坐标，
              只有当 canvas 的 CSS 显示尺寸 == backing store 尺寸时，指针映射才正确；
              过去直接把 canvas style.width/height *= zoom 会导致 zoom<1 时右半部分
              命中判定偏移（历史上反复修不掉的"右边无法编辑"的根因）。
            - wrapper 的 box 尺寸已经是 zoom 倍，布局/滚动占位保持正确；
              wrapper 内部再 transform: scale(zoom) 保证视觉缩放。
            - 注意 transform-origin 要把 wrapper 视觉块对齐到 wrapper 盒子的左上角，
              避免溢出/滚动条偏差。
          -->
          <div
            class="canvas-zoom-wrapper"
            :style="canvasWrapperStyle"
          >
            <canvas
              ref="canvasRef"
              class="fabric-canvas"
              @dragover="onCanvasDragOver"
              @drop="onCanvasDrop"
            ></canvas>
          </div>
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
          <div
            class="canvas-zoom-wrapper"
            :style="canvasWrapperStyle"
          >
            <canvas
              ref="canvasRef"
              class="fabric-canvas"
              @dragover="onCanvasDragOver"
              @drop="onCanvasDrop"
            ></canvas>
          </div>
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
            <div
              class="canvas-zoom-wrapper"
              :style="canvasWrapperStyle"
            >
              <canvas
                ref="canvasRef"
                class="fabric-canvas"
                @dragover="onCanvasDragOver"
                @drop="onCanvasDrop"
              ></canvas>
            </div>
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
            <div
              class="canvas-zoom-wrapper"
              :style="canvasWrapperStyle"
            >
              <canvas
                ref="canvasRef"
                class="fabric-canvas"
                @dragover="onCanvasDragOver"
                @drop="onCanvasDrop"
              ></canvas>
            </div>
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
import { ref, watch, computed } from 'vue'
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

// Fabric 内部使用 HTMLCanvasElement.getBoundingClientRect() 做屏幕坐标 → 画布逻辑坐标映射。
// 历史上直接把 canvas.style.width/height *= zoom 会让 CSS 显示尺寸 ≠ backing store，
// 导致 zoom<1 时命中判定整体左偏（右半边元素选不中）。
// 这里改为"外层 wrapper box = 逻辑 W×H，再 transform: scale(zoom)"：
//   - wrapper 外层（phone-frame / card-frame / flip-frame 等）已经设置 box 尺寸
//     为 W*zoom × H*zoom，因此视觉占位与滚动条都正确；
//   - 内部 wrapper 的 layout box 保持 W×H，并以 origin = top-left 做 scale(zoom)，
//     结果视觉尺寸 = W*zoom × H*zoom，正好落在外层 box 内；
//   - canvas CSS 尺寸始终是 W×H = backing store，命中坐标在 0.3×~3× 任何 zoom 都精确。
const canvasWrapperStyle = computed(() => ({
  width: props.canvasSize.width + 'px',
  height: props.canvasSize.height + 'px',
  transform: `scale(${props.zoom})`,
  transformOrigin: 'top left',
}))


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
  /* Fabric v6 内部依赖 getBoundingClientRect 计算命中坐标：
     canvas 的 CSS 显示尺寸必须 = backing store，
     因此缩放由外层 canvas-zoom-wrapper 的 CSS transform 完成，
     这里禁止任何组件内联或样式对 canvas width/height 的 zoom 倍改写。 */
  box-sizing: content-box;
}

.canvas-zoom-wrapper {
  position: relative;
  /* flex 容器会被外层 frame 统一居中对齐，
     wrapper 视觉缩放从 top-left 开始以贴合 frame 的 inner top-left padding */
  flex-shrink: 0;
  /* transform 与尺寸在脚本端 canvasWrapperStyle 内联写入 */
}

/* 外层 frame 统一以 content-box 计，保证 wrapper 视觉 (W*z) 正好落在 padding box 内部；
   不强制改 box-sizing，仅避免 canvas 的滚动条干扰 */
.viewport-scroll .canvas-zoom-wrapper,
.card-frame .canvas-zoom-wrapper,
.flip-frame .canvas-zoom-wrapper {
  margin: 0;
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
