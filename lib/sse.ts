// Tiny Server-Sent Events helpers shared by the run route (encode) and the browser (parse).

export interface SseMessage {
  event: string
  data: unknown
}

export function encodeSse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

/** Returns a feed() that accepts text chunks in any split and yields complete messages. */
export function createSseParser() {
  let buffer = ''
  return function feed(chunk: string): SseMessage[] {
    buffer += chunk.replace(/\r\n/g, '\n')
    const out: SseMessage[] = []
    let idx: number
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      let event = 'message'
      const data: string[] = []
      for (const line of block.split('\n')) {
        if (line.startsWith(':')) continue
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
      }
      if (data.length === 0) continue
      const raw = data.join('\n')
      let parsed: unknown = raw
      try {
        parsed = JSON.parse(raw)
      } catch {
        // keep as text
      }
      out.push({ event, data: parsed })
    }
    return out
  }
}
