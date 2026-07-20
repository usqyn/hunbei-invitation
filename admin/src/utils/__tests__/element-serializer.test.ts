import { describe, it, expect } from 'vitest'
import { serializeElement } from '../element-serializer'

describe('serializeElement', () => {
  // ---------------------------------------------------------------------------
  // 1. text 元素：fontSize 由 px 转换为 rpx
  // ---------------------------------------------------------------------------
  describe('text 元素的 px→rpx 转换', () => {
    it('应将 fontSize 按 750/canvasWidth 比例从 px 转换为 rpx', () => {
      // canvasWidth = 375 → pxToRpx = 750 / 375 = 2
      const el = {
        id: 't1',
        type: 'text',
        x: 100,
        y: 100,
        width: 200,
        height: 50,
        content: 'Hello',
        fontFamily: 'Arial',
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333333',
        textAlign: 'center',
        direction: 'ltr',
        letterSpacing: 2,
      }

      const result = serializeElement(el, { canvasWidth: 375 })!

      expect(result).not.toBeNull()
      // 中心坐标 → 左上角坐标
      expect(result.x).toBe(0) // 100 - 200/2
      expect(result.y).toBe(75) // 100 - 50/2
      // fontSize 14px * 2 = 28rpx
      expect(result.style?.fontSize).toBe(28)
      // letterSpacing 2 * 2 = 4
      expect(result.style?.spacing).toBe(4)
      // 文本内容
      expect(result.text).toBe('Hello')
      expect(result.type).toBe('text')
    })

    it('未提供 canvasWidth 时不进行 px→rpx 转换（pxToRpx = 1）', () => {
      const el = {
        id: 't2',
        type: 'text',
        x: 100,
        y: 100,
        width: 200,
        height: 50,
        content: 'Hi',
        fontSize: 14,
        letterSpacing: 2,
      }

      const result = serializeElement(el)!

      // pxToRpx = 1，原样保留
      expect(result.style?.fontSize).toBe(14)
      expect(result.style?.spacing).toBe(2)
    })

    it('应使用非 2 倍的比例正确换算（canvasWidth = 500 → 1.5）', () => {
      const el = {
        id: 't3',
        type: 'text',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        content: 'X',
        fontSize: 10,
        letterSpacing: 4,
      }
      // pxToRpx = 750 / 500 = 1.5
      const result = serializeElement(el, { canvasWidth: 500 })!

      expect(result.style?.fontSize).toBe(15) // 10 * 1.5
      expect(result.style?.spacing).toBe(6) // 4 * 1.5
    })
  })

  // ---------------------------------------------------------------------------
  // 2. image 元素：borderRadius / borderWidth 转换（image 的"spacing/strokeWidth"对应 borderRadius/borderWidth）
  // ---------------------------------------------------------------------------
  describe('image 元素的 px→rpx 转换', () => {
    it('应将 borderRadius 与 borderWidth 转换为 rpx', () => {
      const el = {
        id: 'img1',
        type: 'image',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        src: 'http://example.com/a.png',
        borderRadius: 8,
        borderColor: '#ff0000',
        borderWidth: 2,
      }

      const result = serializeElement(el, { canvasWidth: 375 })!

      expect(result).not.toBeNull()
      expect(result.type).toBe('image')
      // text 取 src
      expect(result.text).toBe('http://example.com/a.png')
      // borderRadius 8 * 2 = 16, borderWidth 2 * 2 = 4
      expect(result.style?.borderRadius).toBe(16)
      expect(result.style?.borderWidth).toBe(4)
      expect(result.style?.borderColor).toBe('#ff0000')
      // image 元素的固定占位字段
      expect(result.style?.font).toBe('')
      expect(result.style?.color).toBe('')
      expect(result.style?.spacing).toBe(0)
    })

    it('未提供 canvasWidth 时 borderRadius / borderWidth 原样保留', () => {
      const el = {
        id: 'img2',
        type: 'image',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        src: 'x.png',
        borderRadius: 5,
        borderWidth: 1,
      }
      const result = serializeElement(el)!

      expect(result.style?.borderRadius).toBe(5)
      expect(result.style?.borderWidth).toBe(1)
    })
  })

  // ---------------------------------------------------------------------------
  // 3. 缺失/未定义字段时的优雅处理
  // ---------------------------------------------------------------------------
  describe('缺失字段时的优雅降级', () => {
    it('null / undefined 元素返回 null', () => {
      expect(serializeElement(null)).toBeNull()
      expect(serializeElement(undefined)).toBeNull()
    })

    it('非法 type 返回 null', () => {
      expect(serializeElement({ id: 'x', type: 'rect' })).toBeNull()
      expect(serializeElement({ id: 'x', type: 'group' })).toBeNull()
    })

    it('text 元素缺省字段时使用合理默认值', () => {
      const el = {
        id: 't-min',
        type: 'text',
        x: 100,
        y: 100,
        width: 200,
        height: 50,
        // 无 content / fontSize / letterSpacing / opacity / rotation 等
      }
      const result = serializeElement(el)!

      // text 为空字符串
      expect(result.text).toBe('')
      // fontSize 未提供 → 默认 28
      expect(result.style?.fontSize).toBe(28)
      // letterSpacing 未提供 → 默认 2，pxToRpx=1 → 2
      expect(result.style?.spacing).toBe(2)
      // 默认透明度 1
      expect(result.opacity).toBe(1)
      // 默认 zIndex 0
      expect(result.zIndex).toBe(0)
      // 默认旋转 0
      expect(result.rotation).toBe(0)
      // 默认可编辑 true
      expect(result.editable).toBe(true)
      // 默认方向 ltr
      expect(result.style?.direction).toBe('ltr')
      // 默认描边宽度 0
      expect(result.style?.strokeWidth).toBe(0)
      // 默认无阴影
      expect(result.style?.shadowOffsetX).toBe(0)
      expect(result.style?.shadowOffsetY).toBe(0)
      expect(result.style?.shadowBlur).toBe(0)
      // label 取 name
      expect(result.label).toBeUndefined()
    })

    it('editable 显式为 false 时应保留为 false', () => {
      const el = { id: 't', type: 'text', x: 0, y: 0, width: 10, height: 10, editable: false }
      const result = serializeElement(el)!
      expect(result.editable).toBe(false)
    })

    it('缺省 width/height 时按 0 计算且不报错', () => {
      const el = { id: 't', type: 'text', x: 50, y: 60 }
      const result = serializeElement(el)!
      // topLeftX = 50 - 0/2 = 50, topLeftY = 60 - 0/2 = 60
      expect(result.x).toBe(50)
      expect(result.y).toBe(60)
      expect(result.width).toBe(0)
      expect(result.height).toBe(0)
    })

    it('label 优先取 label，缺失时回退到 name', () => {
      const withLabel = serializeElement({ id: 't', type: 'text', x: 0, y: 0, width: 1, height: 1, label: '主标题' })!
      expect(withLabel.label).toBe('主标题')

      const withName = serializeElement({ id: 't', type: 'text', x: 0, y: 0, width: 1, height: 1, name: '文字' })!
      expect(withName.label).toBe('文字')
    })

    it('text 取值优先级：content > text > src', () => {
      expect(serializeElement({ id: 't', type: 'text', x: 0, y: 0, width: 1, height: 1, content: 'C', text: 'T' })!.text).toBe('C')
      expect(serializeElement({ id: 't', type: 'text', x: 0, y: 0, width: 1, height: 1, text: 'T', src: 'S' })!.text).toBe('T')
      expect(serializeElement({ id: 't', type: 'text', x: 0, y: 0, width: 1, height: 1, src: 'S' })!.text).toBe('S')
    })
  })

  // ---------------------------------------------------------------------------
  // 4. borderRadius、shadowOffset、shadowBlur 的 px→rpx 转换
  // ---------------------------------------------------------------------------
  describe('圆角与阴影相关字段的 px→rpx 转换', () => {
    it('text 元素的 shadowOffsetX/Y、shadowBlur、strokeWidth 应转换', () => {
      const el = {
        id: 't-shadow',
        type: 'text',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        content: 'X',
        strokeWidth: 1,
        shadowOffsetX: 2,
        shadowOffsetY: 3,
        shadowBlur: 4,
      }
      // pxToRpx = 2
      const result = serializeElement(el, { canvasWidth: 375 })!

      expect(result.style?.strokeWidth).toBe(2) // 1 * 2
      expect(result.style?.shadowOffsetX).toBe(4) // 2 * 2
      expect(result.style?.shadowOffsetY).toBe(6) // 3 * 2
      expect(result.style?.shadowBlur).toBe(8) // 4 * 2
    })

    it('image 元素的 borderRadius 应转换', () => {
      const el = {
        id: 'img-r',
        type: 'image',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        src: 'x.png',
        borderRadius: 10,
        borderWidth: 3,
      }
      const result = serializeElement(el, { canvasWidth: 375 })!

      expect(result.style?.borderRadius).toBe(20) // 10 * 2
      expect(result.style?.borderWidth).toBe(6) // 3 * 2
    })

    it('转换结果应四舍五入为整数（Math.round）', () => {
      // pxToRpx = 750 / 300 = 2.5
      const el = {
        id: 't-round',
        type: 'text',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        content: 'X',
        fontSize: 5, // 5 * 2.5 = 12.5 → 13
        shadowBlur: 3, // 3 * 2.5 = 7.5 → 8
      }
      const result = serializeElement(el, { canvasWidth: 300 })!

      expect(result.style?.fontSize).toBe(13)
      expect(result.style?.shadowBlur).toBe(8)
    })
  })

  // ---------------------------------------------------------------------------
  // 5. 不对"已经是 rpx 的值"二次转换
  // ---------------------------------------------------------------------------
  describe('rpx 转换的边界行为', () => {
    it('函数不感知单位，未传 canvasWidth 时 pxToRpx=1，数值原样保留（即不做转换）', () => {
      // serializeElement 没有"已为 rpx"的状态标记，是否转换完全由 canvasWidth 控制。
      // 当不希望对已为 rpx 的值再次缩放时，调用方不传 canvasWidth 即可保持原值。
      const el = {
        id: 't-rpx',
        type: 'text',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        content: 'X',
        fontSize: 28, // 已经是 rpx 值
        letterSpacing: 4,
      }
      const result = serializeElement(el)!

      expect(result.style?.fontSize).toBe(28) // 原样保留，未被再次缩放
      expect(result.style?.spacing).toBe(4)
    })

    it('传 canvasWidth 时会无条件按比例缩放（不区分 px/rpx）', () => {
      // 即便值已经是 rpx，传入 canvasWidth 后仍会按 750/canvasWidth 缩放
      const el = {
        id: 't-rpx2',
        type: 'text',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        content: 'X',
        fontSize: 28,
      }
      const result = serializeElement(el, { canvasWidth: 375 })!

      expect(result.style?.fontSize).toBe(56) // 28 * 2，被再次缩放
    })
  })

  // ---------------------------------------------------------------------------
  // 附加：sticker 类型映射、RTL 检测、坐标取整
  // ---------------------------------------------------------------------------
  describe('其他行为', () => {
    it('sticker 类型应映射为 image 且不生成 style', () => {
      const el = {
        id: 's1',
        type: 'sticker',
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        src: 'sticker.svg',
        name: '爱心',
      }
      const result = serializeElement(el, { canvasWidth: 375 })!

      expect(result).not.toBeNull()
      expect(result.type).toBe('image') // sticker → image
      expect(result.text).toBe('sticker.svg')
      expect(result.label).toBe('爱心')
      // sticker 既非 text 也非 image 分支 → 不设置 style
      expect(result.style).toBeUndefined()
    })

    it('direction 为 auto 时应根据内容自动检测 RTL', () => {
      const rtlEl = {
        id: 't-rtl',
        type: 'text',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        content: 'مرحبا', // 阿拉伯语，命中 RTL 字符范围
        direction: 'auto',
      }
      const rtlResult = serializeElement(rtlEl)!
      expect(rtlResult.style?.direction).toBe('rtl')
      expect(rtlResult.style?.textAlign).toBe('right')

      const ltrEl = {
        id: 't-ltr',
        type: 'text',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        content: 'Hello',
        direction: 'auto',
      }
      const ltrResult = serializeElement(ltrEl)!
      expect(ltrResult.style?.direction).toBe('ltr')
      expect(ltrResult.style?.textAlign).toBe('center')
    })

    it('RTL 文本应强制使用 KazakhSoftAsilya 字体并设字间距为 0', () => {
      const rtlEl = {
        id: 't-rtl-font',
        type: 'text',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        content: 'توي تاماش',
        direction: 'rtl',
        fontFamily: '思源宋体',
        letterSpacing: 5,
      }
      const result = serializeElement(rtlEl)!
      expect(result.style?.font).toBe('KazakhSoftAsilya')
      expect(result.style?.spacing).toBe(0)
    })

    it('RTL 文本但用户已显式设置 KazakhSoftAsilya 字体时应保留', () => {
      const rtlEl = {
        id: 't-rtl-font-keep',
        type: 'text',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        content: 'توي تاماش',
        direction: 'rtl',
        fontFamily: 'KazakhSoftAsilyaQaniq',
        letterSpacing: 2,
      }
      const result = serializeElement(rtlEl)!
      expect(result.style?.font).toBe('KazakhSoftAsilyaQaniq')
    })

    it('坐标与尺寸应四舍五入到两位小数', () => {
      // topLeftX = 100.123 - 33.333... / 2... 用奇数尺寸验证取整
      const el = {
        id: 't-round-coord',
        type: 'text',
        x: 100.555,
        y: 200.666,
        width: 33.333,
        height: 11.111,
        content: 'X',
      }
      const result = serializeElement(el)!
      // x = Math.round((100.555 - 16.6665) * 100) / 100
      const expectedX = Math.round((100.555 - 33.333 / 2) * 100) / 100
      const expectedY = Math.round((200.666 - 11.111 / 2) * 100) / 100
      expect(result.x).toBe(expectedX)
      expect(result.y).toBe(expectedY)
      // 不超过两位小数
      expect(String(result.x).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2)
    })

    it('dataKey 应透传', () => {
      const el = {
        id: 't',
        type: 'text',
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        content: 'X',
        dataKey: 'coverTitle',
      }
      const result = serializeElement(el)!
      expect(result.dataKey).toBe('coverTitle')
    })
  })
})
