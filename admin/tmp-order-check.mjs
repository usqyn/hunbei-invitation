// 决定性验证：writePsd 写入已知顺序的 children，readPsd 读回，看 children 顺序语义
import pkg from 'ag-psd'
const { writePsd, readPsd } = pkg

function layer(name, top) {
  const w = 10, h = 10
  const data = new Uint8Array(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = 200; data[i * 4 + 1] = 100; data[i * 4 + 2] = 50; data[i * 4 + 3] = 255
  }
  return {
    name,
    top, left: 0, bottom: top + h, right: w,
    opacity: 255,
    imageData: { width: w, height: h, data },
  }
}

// 约定：数组第一个元素我们声明为「顶层」（面板最上方）
const psd = {
  width: 100,
  height: 100,
  channels: 3,
  bitsPerChannel: 8,
  colorMode: 3,
  children: [
    layer('TOP-layer', 0),
    layer('MIDDLE-layer', 20),
    layer('BOTTOM-layer', 40),
  ],
}

const buffer = writePsd(psd, { generateThumbnail: false, invalidateTextLayers: false })
const read = readPsd(buffer, { skipLayerImageData: true, skipThumbnail: true, skipCompositeImageData: true })
console.log('children 顺序（读回）:')
read.children.forEach((c, i) => console.log(`  children[${i}] = ${c.name}`))
console.log('psd.layers 存在?', !!read.layers, read.layers ? read.layers.map(l => l.name).join(',') : '')
