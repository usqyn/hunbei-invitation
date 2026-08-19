import { ref } from 'vue'
import type { Ref } from 'vue'
import type {
  CanvasBackground,
  CanvasSize,
  CanvasDraft,
  AnyCanvasElement,
  TextElement,
  ImageElement,
  PageMode,
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
  /** 画布重建入口：翻页时复用 loadDraft 的完整保护机制（历史抑制 + 异步图片世代检查） */
  loadDraft: (draft: CanvasDraft, loadOpts?: { resetHistory?: boolean }) => void
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
      // 完整深拷贝元素，保留 visible/locked/strokeColor 等全部字段，
      // 翻页重建后元素显示/锁定状态与保存前保持一致（此前瘦身序列化会丢字段）
      page.elements = JSON.parse(JSON.stringify(options.elements.value))
    }
  }

  function loadCurrentFlipPage() {
    if (options.pageMode.value !== 'flip') return
    const page = flipPages.value[currentFlipPageIndex.value]
    if (page) {
      // 复用 loadDraft 的完整保护机制（suppressHistory + isLoadDrafting + 异步图片世代检查），
      // 此前用 clearCanvas + 逐元素 addText/addImage 重建会产生大量历史记录，
      // 且图片异步加载完成时对象迟到 push 进 elements.value / add 到画布，导致 model 与画布失步，
      // 表现为翻页后元素无法选中、图层列表点击无效。
      options.loadDraft(
        {
          canvasSize: { ...options.canvasSize.value },
          background: { ...(page.background || options.background.value) },
          elements: JSON.parse(JSON.stringify(page.elements || [])),
        },
        { resetHistory: false },
      )
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
