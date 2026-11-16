import { describe, it, expect, vi } from 'vitest'
import { execute, sourceOf, totalsOf, type RunEvent, type StepFn, type Step } from '@/lib/server/runner'
import { AiKeyMissingError } from '@/lib/server/llm'
import { trace } from './helpers'

const steps: Step[] = [
  { id: 'a', type: 'clean' },
  { id: 'b', type: 'summarize', config: { parameters: { length: 'short' } } },
  { id: 'c', type: 'translate', config: { targetLanguage: 'Hindi' } },
]

const echo: StepFn = async (type, text, _p, onDelta) => {
  const out = `${type}(${text})`
  onDelta(out.slice(0, 3))
  onDelta(out.slice(3))
  return { result: out, processingTime: 10, tokensUsed: { input: 5, output: 2 }, trace: trace({ inputTokens: 5, outputTokens: 2 }) }
}

describe('execute', () => {
  it("chains each step's output into the next step", async () => {
    const r = await execute('run-1', steps, 'x', undefined, echo)
    expect(r.status).toBe('completed')
    expect(r.steps.map((s) => s.input)).toEqual(['x', 'clean(x)', 'summarize(clean(x))'])
    expect(r.steps.at(-1)?.output).toBe('translate(summarize(clean(x)))')
  })

  it('passes step parameters in both the new and the legacy config shape', async () => {
    const seen: Record<string, unknown>[] = []
    await execute('r', steps, 'x', undefined, async (t, text, p, d) => (seen.push(p), echo(t, text, p, d)))
    expect(seen).toEqual([{}, { length: 'short' }, { targetLanguage: 'Hindi' }])
  })

  it('emits start, streamed deltas and end for every step, in order', async () => {
    const events: RunEvent[] = []
    await execute('r', steps.slice(0, 2), 'x', (e) => events.push(e), echo)
    expect(events.map((e) => `${e.type}:${e.index}`)).toEqual([
      'step-start:0', 'delta:0', 'delta:0', 'step-end:0',
      'step-start:1', 'delta:1', 'delta:1', 'step-end:1',
    ])
    const text = events.filter((e) => e.type === 'delta' && e.index === 0).map((e) => (e as { text: string }).text).join('')
    expect(text).toBe('clean(x)')
  })

  it('stops at the first failing step and records the error', async () => {
    const fn = vi.fn<StepFn>(async (t, text, p, d) => {
      if (t === 'summarize') throw new Error('rate limited by provider')
      return echo(t, text, p, d)
    })
    const r = await execute('r', steps, 'x', undefined, fn)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(r.status).toBe('failed')
    expect(r.steps[1]).toMatchObject({ status: 'error', error: 'rate limited by provider', output: '' })
  })

  it('rethrows a missing AI key instead of recording a failed step', async () => {
    await expect(execute('r', steps, 'x', undefined, async () => { throw new AiKeyMissingError() })).rejects.toBeInstanceOf(AiKeyMissingError)
  })

  it('rolls up tokens and model across steps', async () => {
    const r = await execute('r', steps, 'x', undefined, echo)
    expect(r.totals).toMatchObject({ inputTokens: 15, outputTokens: 6, model: 'openai/gpt-oss-20b', retries: 0 })
    // 15 input + 6 output tokens at $0.075 / $0.30 per 1M
    expect(r.totals.costUsd).toBeCloseTo(2.925e-6, 12)
    expect(totalsOf([])).toEqual({ inputTokens: 0, outputTokens: 0, model: null, costUsd: null, retries: 0 })
  })

  it('retries a rate-limited step, tells the stream, and records the attempts', async () => {
    let calls = 0
    const flaky: StepFn = async (t, text, p, d, signal) => {
      calls++
      if (calls === 1) throw Object.assign(new Error('429 rate limited'), { status: 429 })
      return echo(t, text, p, d, signal)
    }
    const events: RunEvent[] = []
    const waits: number[] = []
    const r = await execute('r', steps.slice(0, 1), 'x', (e) => events.push(e), {
      runStepFn: flaky,
      wait: async (ms) => void waits.push(ms),
    })
    expect(r.status).toBe('completed')
    expect(events.map((e) => e.type)).toEqual(['step-start', 'retry', 'delta', 'delta', 'step-end'])
    expect(r.steps[0].trace?.attempts).toBe(2)
    expect(r.totals.retries).toBe(1)
    expect(waits).toHaveLength(1)
  })

  it('gives up after the policy runs out and keeps the attempt count', async () => {
    const down: StepFn = async () => { throw Object.assign(new Error('503 unavailable'), { status: 503 }) }
    const r = await execute('r', steps.slice(0, 1), 'x', undefined, {
      runStepFn: down,
      policy: () => ({ retries: 2, timeoutMs: 1000, baseDelayMs: 1, maxDelayMs: 1 }),
      wait: async () => {},
    })
    expect(r.steps[0]).toMatchObject({ status: 'error', attempts: 3, error: 'The model provider returned an error (503). Try again.' })
  })

  it('lets a step read the original input or an earlier step instead of the previous output', async () => {
    const fanOut = [
      { id: 'a', type: 'clean' as const },
      { id: 'b', type: 'sentiment' as const },
      { id: 'c', type: 'categorize' as const, config: { source: 0 } },
      { id: 'd', type: 'summarize' as const, config: { source: 'input' } },
    ]
    const r = await execute('r', fanOut, 'raw', undefined, echo)
    expect(r.steps.map((s) => s.input)).toEqual(['raw', r.steps[0].output, r.steps[0].output, 'raw'])
  })

  it('ignores a source that points forward or at itself', () => {
    const outs = ['zero', 'one']
    expect(sourceOf({ id: 'x', type: 'clean', config: { source: 2 } }, 2, 'in', outs)).toBe('one')
    expect(sourceOf({ id: 'x', type: 'clean', config: { source: 'nope' } }, 0, 'in', [])).toBe('in')
  })
})
