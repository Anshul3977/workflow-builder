import { describe, it, expect } from 'vitest'
import { encodeSse, createSseParser } from '@/lib/sse'

describe('SSE helpers', () => {
  it('round-trips events', () => {
    const feed = createSseParser()
    const text = encodeSse('delta', { index: 0, text: 'hi\nthere' }) + encodeSse('done', { ok: true })
    expect(feed(text)).toEqual([
      { event: 'delta', data: { index: 0, text: 'hi\nthere' } },
      { event: 'done', data: { ok: true } },
    ])
  })

  it('handles messages split across chunks at any byte', () => {
    const text = encodeSse('step-start', { index: 1 }) + encodeSse('delta', { text: 'नमस्ते' })
    for (let cut = 1; cut < text.length; cut++) {
      const feed = createSseParser()
      const got = [...feed(text.slice(0, cut)), ...feed(text.slice(cut))]
      expect(got.map((m) => m.event)).toEqual(['step-start', 'delta'])
    }
  })

  it('ignores comments and CRLF line endings', () => {
    const feed = createSseParser()
    expect(feed(': ping\r\n\r\nevent: run\r\ndata: {"a":1}\r\n\r\n')).toEqual([{ event: 'run', data: { a: 1 } }])
  })
})
