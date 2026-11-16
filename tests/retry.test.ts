import { describe, it, expect, vi } from 'vitest'
import { withRetry, backoffMs, policyFor, isRetryable, StepTimeoutError, DEFAULT_POLICY, type RetryPolicy } from '@/lib/server/retry'

const fast: RetryPolicy = { retries: 2, timeoutMs: 50, baseDelayMs: 100, maxDelayMs: 1000 }
const noWait = async () => {}
const httpErr = (status: number, headers?: Record<string, string>) => Object.assign(new Error(`HTTP ${status}`), { status, headers })

describe('policyFor', () => {
  it('uses defaults and clamps step overrides', () => {
    expect(policyFor(undefined)).toEqual(DEFAULT_POLICY)
    expect(policyFor({ retries: 9, timeoutMs: 100 })).toMatchObject({ retries: 3, timeoutMs: 2000 })
    expect(policyFor({ parameters: { retries: 0, timeoutMs: 60_000 } })).toMatchObject({ retries: 0, timeoutMs: 30_000 })
  })
})

describe('isRetryable', () => {
  it('retries 429, 5xx, timeouts and connection errors but not other 4xx', () => {
    expect([429, 500, 503, 408].every((s) => isRetryable(httpErr(s)))).toBe(true)
    expect([400, 401, 404, 422].some((s) => isRetryable(httpErr(s)))).toBe(false)
    expect(isRetryable(new StepTimeoutError(10))).toBe(true)
    expect(isRetryable(Object.assign(new Error('x'), { name: 'APIConnectionError' }))).toBe(true)
    expect(isRetryable(new Error('bad prompt'))).toBe(false)
  })
})

describe('backoffMs', () => {
  it('grows exponentially with jitter inside [ceiling/2, ceiling] and caps at maxDelayMs', () => {
    expect(backoffMs(1, fast, undefined, () => 0)).toBe(50)
    expect(backoffMs(1, fast, undefined, () => 1)).toBe(100)
    expect(backoffMs(3, fast, undefined, () => 1)).toBe(400)
    expect(backoffMs(10, fast, undefined, () => 1)).toBe(1000)
  })
  it('honors Retry-After (capped)', () => {
    expect(backoffMs(1, fast, httpErr(429, { 'retry-after': '0.3' }))).toBe(300)
    expect(backoffMs(1, fast, httpErr(429, { 'retry-after': '30' }))).toBe(1000)
  })
})

describe('withRetry', () => {
  it('returns on the first success', async () => {
    const fn = vi.fn(async () => 'ok')
    expect(await withRetry(fn, fast, undefined, noWait)).toEqual({ value: 'ok', attempts: 1 })
  })

  it('retries retryable failures and reports each retry', async () => {
    const fn = vi.fn().mockRejectedValueOnce(httpErr(429)).mockRejectedValueOnce(httpErr(502)).mockResolvedValue('ok')
    const seen: number[] = []
    const r = await withRetry(fn, fast, (i) => seen.push(i.attempt), noWait)
    expect(r).toEqual({ value: 'ok', attempts: 3 })
    expect(seen).toEqual([1, 2])
  })

  it('does not retry a client error', async () => {
    const fn = vi.fn().mockRejectedValue(httpErr(400))
    await expect(withRetry(fn, fast, undefined, noWait)).rejects.toMatchObject({ status: 400, attempts: 1 })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('aborts a hung attempt at the timeout and surfaces StepTimeoutError once retries run out', async () => {
    const hang = (signal: AbortSignal) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))))
    const err = await withRetry(hang, { ...fast, retries: 1, timeoutMs: 20 }, undefined, noWait).catch((e) => e)
    expect(err).toBeInstanceOf(StepTimeoutError)
    expect(err.attempts).toBe(2)
    expect(err.message).toMatch(/timed out after 0.0 s/)
  })
})

describe('run deadline', () => {
  it('refuses to start an attempt after the deadline and caps the attempt timeout to what is left', async () => {
    const { RunDeadlineError } = await import('@/lib/server/retry')
    await expect(withRetry(async () => 'ok', fast, undefined, noWait, Date.now() - 1)).rejects.toBeInstanceOf(RunDeadlineError)
    const hang = (signal: AbortSignal) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))))
    const t0 = Date.now()
    const err = await withRetry(hang, { ...fast, timeoutMs: 5000 }, undefined, noWait, Date.now() + 30).catch((e) => e)
    expect(Date.now() - t0).toBeLessThan(1000)
    expect(err).toBeInstanceOf(StepTimeoutError)
  })
})

describe('provider quota handling', () => {
  it('fails fast when Retry-After is far beyond the backoff cap', async () => {
    const fn = vi.fn().mockRejectedValue(httpErr(429, { 'retry-after': '148' }))
    await expect(withRetry(fn, fast, undefined, noWait)).rejects.toMatchObject({ status: 429, attempts: 1 })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('turns provider errors into short messages', async () => {
    const { describeError } = await import('@/lib/server/retry')
    const tpd = Object.assign(new Error('429 Rate limit reached ... on tokens per day (TPD): Limit 200000'), { status: 429, headers: { 'retry-after': '148' } })
    expect(describeError(tpd)).toBe("The model provider's daily token limit was reached. Try again in about 3 min.")
    expect(describeError(httpErr(429, { 'retry-after': '2' }))).toBe("The model provider's rate limit was reached. Try again in about 2 s.")
    expect(describeError(httpErr(503))).toMatch(/\(503\)/)
    expect(describeError(new Error('plain'))).toBe('plain')
  })
})
