// 验证带组的 writePsd → readPsd 往返 children 顺序（复刻 psd-roundtrip.test.ts 的 source）
import pkg from 'ag-psd'
const { writePsd, readPsd, initializeCanvas } = pkg
initializeCanvas(
  () => { throw new Error('no canvas') },
  (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
)

const kazakhText = 'قىز توي'
const source = {
  width: 600,
  height: 800,
  children: [
    { name: '无栅格图层', left: 0, top: 0, right: 600, bottom: 800, opacity: 255 },
    {
      name: '哈萨克文标题', opacity: 255, left: 50, top: 60, right: 550, bottom: 160,
      text: { text: kazakhText, transform: [1, 0, 0, 1, 50, 60], style: { font: { name: 'KazakhSoftAsilya' }, fontSize: 36, leading: 480, tracking: 0, fillColor: { r: 200, g: 30, b: 60, a: 255 }, paragraphStyle: { justification: 'center' } } },
    },
    {
      name: '旋转文字', opacity: 255, left: 100, top: 300, right: 500, bottom: 400,
      text: { text: 'Happy Wedding!', transform: [0, 1, -1, 0, 100, 300], style: { font: { name: 'ArialMT' }, fontSize: 24, fillColor: { r: 0, g: 0, b: 0, a: 255 } } },
    },
    {
      name: '隐藏图层', hidden: true, left: 0, top: 0, right: 100, bottom: 100, opacity: 255,
      text: { text: 'should-not-appear', transform: [1, 0, 0, 1, 0, 0], style: { font: { name: 'ArialMT' }, fontSize: 12, fillColor: { r: 0, g: 0, b: 0, a: 255 } } },
    },
    {
      name: '组',
      children: [{
        name: '组内文字', opacity: 255, left: 10, top: 10, right: 200, bottom: 60,
        text: { text: 'Grouped Text', transform: [1, 0, 0, 1, 10, 10], style: { font: { name: 'ArialMT' }, fontSize: 14, fillColor: { r: 0, g: 0, b: 0, a: 255 } } },
      }],
    },
  ],
}
const buf = writePsd(source)
const back = readPsd(buf, { useImageData: true, skipThumbnail: true })
function names(children, d = 0) {
  for (const c of children || []) {
    console.log('  '.repeat(d) + c.name + (c.hidden ? ' [hidden]' : ''))
    if (c.children) names(c.children, d + 1)
  }
}
console.log('=== readback children 树 ===')
names(back.children)
