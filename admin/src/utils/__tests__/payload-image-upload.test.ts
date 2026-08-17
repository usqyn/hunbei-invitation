import { describe, it, expect, vi } from 'vitest'
import { uploadPayloadImages } from '../payload-image-upload'

function fakeFetch(dataUrl: string) {
  void dataUrl
  return Promise.resolve({
    blob: () => Promise.resolve(new Blob(['fake'], { type: 'image/png' })),
  } as Response)
}

describe('uploadPayloadImages', () => {
  it('将 elements/background/pages 中的 base64 图片批量上传并替换为 URL', async () => {
    const uploader = vi.fn(async (files: File[]) => files.map((_, i) => `https://cdn.example.com/img-${i}.png`))
    const payload = {
      elements: [
        { id: 'a', type: 'image', text: 'data:image/png;base64,AAA' },
        { id: 'b', type: 'text', text: 'hello' },
        { id: 'c', type: 'image', text: 'http://cdn.example.com/keep.png' },
        { id: 'd', type: 'sticker', text: '' },
      ],
      background: { type: 'image', imageUrl: 'data:image/jpeg;base64,BBB' },
      pages: [
        {
          id: 'p1',
          background: { imageUrl: 'data:image/png;base64,CCC' },
          elements: [{ id: 'e', type: 'image', text: 'data:image/png;base64,DDD' }],
        },
      ],
    }

    const result = await uploadPayloadImages(payload, uploader, fakeFetch as any)

    expect(uploader).toHaveBeenCalledTimes(1)
    expect(uploader.mock.calls[0][0]).toHaveLength(4)
    expect(result).not.toBe(payload)
    expect(result.elements[0].text).toBe('https://cdn.example.com/img-0.png')
    expect(result.elements[1].text).toBe('hello')
    expect(result.elements[2].text).toBe('http://cdn.example.com/keep.png')
    expect(result.elements[3].text).toBe('')
    expect(result.background.imageUrl).toBe('https://cdn.example.com/img-3.png')
    expect(result.pages[0].background.imageUrl).toBe('https://cdn.example.com/img-2.png')
    expect(result.pages[0].elements[0].text).toBe('https://cdn.example.com/img-1.png')

    expect(payload.elements[0].text).toBe('data:image/png;base64,AAA')
    expect(payload.background.imageUrl).toBe('data:image/jpeg;base64,BBB')
  })

  it('无 base64 图片时跳过上传并返回原对象', async () => {
    const uploader = vi.fn(async () => [])
    const payload = {
      elements: [{ id: 'a', type: 'image', text: 'http://x/y.png' }],
      background: { imageUrl: '' },
    }
    const result = await uploadPayloadImages(payload, uploader, fakeFetch as any)
    expect(uploader).not.toHaveBeenCalled()
    expect(result).toBe(payload)
  })

  it('上传失败时保留 base64 原样，不中断发布', async () => {
    const uploader = vi.fn(async () => { throw new Error('boom') })
    const payload = { elements: [{ id: 'a', type: 'image', text: 'data:image/png;base64,AAA' }] }
    const result = await uploadPayloadImages(payload, uploader, fakeFetch as any)
    expect(result.elements[0].text).toBe('data:image/png;base64,AAA')
  })
})