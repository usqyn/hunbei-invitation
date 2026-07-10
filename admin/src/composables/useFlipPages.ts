import { ref } from 'vue'
import type { Ref } from 'vue'
import type {
  CanvasBackground,
  CanvasSize,
  AnyCanvasElement,
  TextElement,
  ImageElement,
  PageMode,
} from '../types/canvas'

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
      const cSize = options.canvasSize.value
      const pxToRpx = 750 / cSize.width
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
          const fontSize = el.fontSize != null ? Math.round(el.fontSize / pxToRpx) : 24
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
            fontSize: fontSize,
            fontWeight: el.fontWeight === 'bold' ? 'bold' : 'normal',
            fontStyle: el.fontStyle || 'normal',
            color: el.color || '#333333',
            textAlign: el.textAlign || 'center',
            lineHeight: el.lineHeight || 1.5,
            letterSpacing: el.letterSpacing || 2,
            strokeColor: el.strokeColor || 'transparent',
            strokeWidth: el.strokeWidth || 0,
            shadowColor: el.shadowColor || 'transparent',
            shadowOffsetX: el.shadowOffsetX || 0,
            shadowOffsetY: el.shadowOffsetY || 0,
            shadowBlur: el.shadowBlur || 0,
            textDecoration: el.textDecoration || 'none',
            direction: el.direction || 'auto',
            dataKey: el.dataKey,
            editable: el.editable !== false,
          } as any)
        }
      })
    }
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
  }
}
