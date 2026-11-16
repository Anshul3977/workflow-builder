import { describe, it, expect, vi, beforeEach } from 'vitest'

const create = vi.fn()
vi.mock('groq-sdk', () => ({ default: class { chat = { completions: { create } } } }))

async function* chunks(parts: object[]) {
  for (const p of parts) yield p
}

describe('streamStep', () => {
  beforeEach(() => {
    vi.resetModules()
    create.mockReset()
    process.env.GROQ_API_KEY = 'test-key'
  })

  it('streams visible text, ignores empty deltas and reads usage from the last chunk', async () => {
    create.mockResolvedValue(
      chunks([
        { model: 'openai/gpt-oss-20b', choices: [{ delta: { role: 'assistant' } }] },
        { choices: [{ delta: { content: 'Hel' } }] },
        { choices: [{ delta: { content: 'lo' } }] },
        { choices: [], usage: { prompt_tokens: 12, completion_tokens: 9, total_time: 0.0234, completion_tokens_details: { reasoning_tokens: 4 } } },
      ]),
    )
    const { streamStep } = await import('@/lib/server/llm')
    const seen: string[] = []
    const out = await streamStep('summarize', 'some text', { length: 'short' }, (d) => seen.push(d))
    expect(seen).toEqual(['Hel', 'lo'])
    expect(out.result).toBe('Hello')
    expect(out.trace).toMatchObject({ model: 'openai/gpt-oss-20b', inputTokens: 12, outputTokens: 9, reasoningTokens: 4, providerMs: 23 })
    expect(out.trace.ttftMs).toBeGreaterThanOrEqual(0)
    expect(out.trace.latencyMs).toBeGreaterThanOrEqual(out.trace.ttftMs!)

    const [body] = create.mock.calls[0]
    expect(body).toMatchObject({ stream: true, stream_options: { include_usage: true } })
    expect(body.messages[0].content).toContain('in 2-3 sentences')
  })

  it('accepts usage under x_groq (older Groq stream shape)', async () => {
    create.mockResolvedValue(chunks([{ choices: [{ delta: { content: 'ok' } }], x_groq: { usage: { prompt_tokens: 3, completion_tokens: 1 } } }]))
    const { streamStep } = await import('@/lib/server/llm')
    const out = await streamStep('clean', 't', {})
    expect(out.tokensUsed).toEqual({ input: 3, output: 1 })
  })

  it('throws AiKeyMissingError without a key', async () => {
    delete process.env.GROQ_API_KEY
    const { streamStep, AiKeyMissingError } = await import('@/lib/server/llm')
    await expect(streamStep('clean', 't', {})).rejects.toBeInstanceOf(AiKeyMissingError)
    expect(create).not.toHaveBeenCalled()
  })
})

describe('buildTrace', () => {
  it('reports no first-token time when nothing streamed', async () => {
    const { buildTrace } = await import('@/lib/server/llm')
    const t = buildTrace(Date.now() - 50, null, undefined, 'm')
    expect(t).toMatchObject({ model: 'm', ttftMs: null, inputTokens: 0, outputTokens: 0, providerMs: null })
    expect(t.latencyMs).toBeGreaterThanOrEqual(50)
  })
})
