import { ref } from 'vue'
import type { Ref } from 'vue'
import type {
  CanvasBackground,
  CanvasSize,
  AnyCanvasElement,
  TextElement,
  ImageElement,
  PageMode,
  FlipPage,
} from '../types/canvas'
import { createId } from '../types/canvas'

export interface FlipPageItem {
  id: string
  name: string
  pageType: string
  background: any
  elements: any[]
}

export interface UseFlipPagesOptions {
  pageMode: Ref<PageMode>
  background: Ref<CanvasBackground>
  elements: Ref<AnyCanvasElement[]>
  canvasSize: Ref<CanvasSize>
  setBackground: (bg: Partial<CanvasBackground>) => void
  clearCanvas: () => void
  addImage: (src: string, partial?: Partial<ImageElement>) => Promise<ImageElement | null>
  addText: (partial?: Partial<TextElement>) => TextElement | undefined
}

export function useFlipPages(options: UseFlipPagesOptions) {
  const flipPages = ref<FlipPageItem[]>([])
  const currentFlipPageIndex = ref(0)

  function initFlipPages() {
    flipPages.value = [
      { id: 'flip-p1', name: '封面', pageType: 'cover', background: { type: 'solid', color1: '#ffffff' }, elements: [] },
      { id: 'flip-p2', name: '照片', pageType: 'photo', background: { type: 'solid', color1: '#faf6f3' }, elements: [] },
      { id: 'flip-p3', name: '邀请', pageType: 'invitation', background: { type: 'solid', color1: '#faf6f3' }, elements: [] },
      { id: 'flip-p4', name: '时间地点', pageType: 'info', background: { type: 'solid', color1: '#faf6f3' }, elements: [] },
      { id: 'flip-p5', name: '照片', pageType: 'photo', background: { type: 'solid', color1: '#faf6f3' }, elements: [] },
      { id: 'flip-p6', name: '倒计时', pageType: 'countdown', background: { type: 'linear-gradient', color1: '#fff3e0', color2: '#ffe0b2', angle: 180 }, elements: [] },
      { id: 'flip-p7', name: '照片', pageType: 'photo', background: { type: 'solid', color1: '#faf6f3' }, elements: [] },
      { id: 'flip-p8', name: '尾页', pageType: 'ending', background: { type: 'solid', color1: '#ffffff' }, elements: [] },
    ]
    currentFlipPageIndex.value = 0
  }

  function selectFlipPage(idx: number) {
    if (idx < 0 || idx >= flipPages.value.length) return
    saveCurrentFlipPage()
    currentFlipPageIndex.value = idx
    loadCurrentFlipPage()
  }

  function prevFlipPage() {
    if (currentFlipPageIndex.value > 0) {
      selectFlipPage(currentFlipPageIndex.value - 1)
    }
  }

  function nextFlipPage() {
    if (currentFlipPageIndex.value < flipPages.value.length - 1) {
      selectFlipPage(currentFlipPageIndex.value + 1)
    }
  }

  function saveCurrentFlipPage() {
    if (options.pageMode.value !== 'flip') return
    const page = flipPages.value[currentFlipPageIndex.value]
    if (page) {
      page.background = { ...options.background.value }
      page.elements = options.elements.value.map(el => {
        const textEl = el as TextElement
        const imgEl = el as ImageElement
        return {
          id: el.id,
          type: el.type,
          text: el.type === 'image' ? imgEl.src : textEl.content,
          dataKey: (el as any).dataKey,
          label: el.name || '元素',
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          zIndex: el.zIndex,
          rotation: el.rotation,
          opacity: el.opacity,
          editable: el.editable !== false,
          fontFamily: textEl.fontFamily,
          fontSize: textEl.fontSize,
          fontWeight: textEl.fontWeight,
          fontStyle: textEl.fontStyle,
          color: textEl.color,
          textAlign: textEl.textAlign,
          lineHeight: textEl.lineHeight,
          letterSpacing: textEl.letterSpacing,
          strokeColor: textEl.strokeColor,
          strokeWidth: textEl.strokeWidth,
          shadowColor: textEl.shadowColor,
          shadowOffsetX: textEl.shadowOffsetX,
          shadowOffsetY: textEl.shadowOffsetY,
          shadowBlur: textEl.shadowBlur,
          textDecoration: textEl.textDecoration,
          direction: textEl.direction,
          src: imgEl.src,
          scale: imgEl.scale,
          mask: imgEl.mask,
          borderRadius: imgEl.borderRadius,
          borderColor: imgEl.borderColor,
          borderWidth: imgEl.borderWidth,
          brightness: imgEl.brightness,
          contrast: imgEl.contrast,
          blur: imgEl.blur,
          grayscale: imgEl.grayscale,
          saturate: imgEl.saturate,
        }
      })
    }
  }

  function loadCurrentFlipPage() {
    if (options.pageMode.value !== 'flip') return
    const page = flipPages.value[currentFlipPageIndex.value]
    if (page) {
      options.setBackground(page.background)
      options.clearCanvas()
      page.elements.forEach(el => {
        if (el.type === 'image') {
          options.addImage(el.text || el.src, {
            id: el.id,
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            rotation: el.rotation ?? 0,
            opacity: el.opacity ?? 1,
            zIndex: el.zIndex ?? 0,
            src: el.text || el.src || '',
            scale: el.scale || 'cover',
            mask: el.mask || 'rect',
            borderRadius: el.borderRadius || 0,
            borderColor: el.borderColor || 'transparent',
            borderWidth: el.borderWidth || 0,
            brightness: el.brightness ?? 100,
            contrast: el.contrast ?? 0,
            blur: el.blur ?? 0,
            grayscale: el.grayscale ?? 0,
            saturate: el.saturate ?? 100,
            dataKey: el.dataKey,
            editable: el.editable !== false,
          } as any)
        } else {
          options.addText({
            id: el.id,
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            rotation: el.rotation ?? 0,
            opacity: el.opacity ?? 1,
            zIndex: el.zIndex ?? 0,
            content: el.text || '',
            fontFamily: el.fontFamily || '思源宋体, serif',
            fontSize: el.fontSize ?? 24,
            fontWeight: el.fontWeight === 'bold' ? 'bold' : 'normal',
            fontStyle: el.fontStyle || 'normal',
            color: el.color || '#333333',
            textAlign: el.textAlign || 'center',
            lineHeight: el.lineHeight || 1.5,
            letterSpacing: el.letterSpacing ?? 2,
            strokeColor: el.strokeColor || 'transparent',
            strokeWidth: el.strokeWidth ?? 0,
            shadowColor: el.shadowColor || 'transparent',
            shadowOffsetX: el.shadowOffsetX ?? 0,
            shadowOffsetY: el.shadowOffsetY ?? 0,
            shadowBlur: el.shadowBlur ?? 0,
            textDecoration: el.textDecoration || 'none',
            direction: el.direction || 'auto',
            dataKey: el.dataKey,
            editable: el.editable !== false,
          } as any)
        }
      })
    }
  }

  function addFlipPage(afterIndex?: number) {
    saveCurrentFlipPage()
    const newPage: FlipPageItem = {
      id: createId('flip'),
      name: `新页面 ${flipPages.value.length + 1}`,
      pageType: 'custom',
      background: { type: 'solid', color1: '#ffffff' } as CanvasBackground,
      elements: [],
    }
    if (afterIndex !== undefined && afterIndex >= 0 && afterIndex < flipPages.value.length) {
      flipPages.value.splice(afterIndex + 1, 0, newPage)
      currentFlipPageIndex.value = afterIndex + 1
    } else {
      flipPages.value.push(newPage)
      currentFlipPageIndex.value = flipPages.value.length - 1
    }
    loadCurrentFlipPage()
  }

  function removeFlipPage(idx: number) {
    if (flipPages.value.length <= 1) return
    saveCurrentFlipPage()
    flipPages.value.splice(idx, 1)
    // 删除的是当前页之前的页面时，后续页面整体前移一位，当前页索引需同步减一以保持指向同一页面；
    // 否则当索引越界（删除最后一页或当前页已是末页）时回退到新的末页。
    if (idx < currentFlipPageIndex.value) {
      currentFlipPageIndex.value -= 1
    } else if (currentFlipPageIndex.value >= flipPages.value.length) {
      currentFlipPageIndex.value = flipPages.value.length - 1
    }
    loadCurrentFlipPage()
  }

  function moveFlipPageUp(idx: number) {
    if (idx <= 0) return
    saveCurrentFlipPage()
    const temp = flipPages.value[idx]
    flipPages.value[idx] = flipPages.value[idx - 1]
    flipPages.value[idx - 1] = temp
    if (currentFlipPageIndex.value === idx) {
      currentFlipPageIndex.value = idx - 1
    } else if (currentFlipPageIndex.value === idx - 1) {
      currentFlipPageIndex.value = idx
    }
    loadCurrentFlipPage()
  }

  function moveFlipPageDown(idx: number) {
    if (idx >= flipPages.value.length - 1) return
    saveCurrentFlipPage()
    const temp = flipPages.value[idx]
    flipPages.value[idx] = flipPages.value[idx + 1]
    flipPages.value[idx + 1] = temp
    if (currentFlipPageIndex.value === idx) {
      currentFlipPageIndex.value = idx + 1
    } else if (currentFlipPageIndex.value === idx + 1) {
      currentFlipPageIndex.value = idx
    }
    loadCurrentFlipPage()
  }

  function renameFlipPage(idx: number, name: string) {
    if (idx < 0 || idx >= flipPages.value.length) return
    flipPages.value[idx].name = name
  }

  // 拖拽排序：将 fromIdx 的页面移动到 toIdx 位置
  function moveFlipPage(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return
    if (fromIdx < 0 || fromIdx >= flipPages.value.length) return
    if (toIdx < 0 || toIdx >= flipPages.value.length) return
    saveCurrentFlipPage()
    const [moved] = flipPages.value.splice(fromIdx, 1)
    flipPages.value.splice(toIdx, 0, moved)
    // 同步当前选中页索引，确保仍指向同一逻辑页面
    const cur = currentFlipPageIndex.value
    if (cur === fromIdx) {
      currentFlipPageIndex.value = toIdx
    } else if (fromIdx < cur && toIdx >= cur) {
      currentFlipPageIndex.value = cur - 1
    } else if (fromIdx > cur && toIdx <= cur) {
      currentFlipPageIndex.value = cur + 1
    }
    loadCurrentFlipPage()
  }

  // 复制指定页面（深拷贝所有元素和背景），插入到 idx+1 位置
  function duplicateFlipPage(idx: number) {
    if (idx < 0 || idx >= flipPages.value.length) return
    saveCurrentFlipPage()
    const source = flipPages.value[idx]
    const dup: FlipPageItem = {
      id: createId('flip'),
      name: `${source.name} 副本`,
      pageType: source.pageType,
      background: JSON.parse(JSON.stringify(source.background)),
      elements: JSON.parse(JSON.stringify(source.elements)),
    }
    flipPages.value.splice(idx + 1, 0, dup)
    currentFlipPageIndex.value = idx + 1
    loadCurrentFlipPage()
  }

  return {
    flipPages,
    currentFlipPageIndex,
    initFlipPages,
    selectFlipPage,
    prevFlipPage,
    nextFlipPage,
    saveCurrentFlipPage,
    loadCurrentFlipPage,
    addFlipPage,
    removeFlipPage,
    moveFlipPageUp,
    moveFlipPageDown,
    moveFlipPage,
    renameFlipPage,
    duplicateFlipPage,
  }
}
