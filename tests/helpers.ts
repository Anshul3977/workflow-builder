import { vi } from 'vitest'
import type { StepTrace } from '@/lib/server/llm'

export type Query = { text: string; values: unknown[] }
type Handler = (q: Query) => Record<string, unknown>[] | undefined

/** A stand-in for neon()'s tagged-template client: records each query and answers via `handler`. */
export function fakeSql(handler: Handler = () => []) {
  const queries: Query[] = []
  const fn = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
    const q = { text: strings.join('$').replace(/\s+/g, ' ').trim(), values }
    queries.push(q)
    return Promise.resolve(handler(q) ?? [])
  })
  return { sql: () => fn, queries, fn }
}

export function trace(over: Partial<StepTrace> = {}): StepTrace {
  return {
    model: 'openai/gpt-oss-20b',
    latencyMs: 120,
    ttftMs: 40,
    inputTokens: 50,
    outputTokens: 20,
    reasoningTokens: 5,
    providerMs: 30,
    startedAt: '2026-11-16T10:00:00.000Z',
    ...over,
  }
}

export function req(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/workflows', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

export async function readSse(res: Response) {
  const { createSseParser } = await import('@/lib/sse')
  const feed = createSseParser()
  return feed(await res.text())
}
