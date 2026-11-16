// Per-step retry policy: bounded attempts, exponential backoff with full jitter,
// Retry-After honored for 429s, and a hard timeout on every attempt.

export interface RetryPolicy {
  /** Extra attempts after the first one. */
  retries: number
  /** Abort an attempt after this many ms. */
  timeoutMs: number
  baseDelayMs: number
  maxDelayMs: number
}

export const DEFAULT_POLICY: RetryPolicy = { retries: 2, timeoutMs: 20_000, baseDelayMs: 400, maxDelayMs: 4_000 }

export const LIMITS = { retries: [0, 3], timeoutMs: [2_000, 30_000] } as const

const clamp = (n: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, Math.round(n)))

/** Builds a step's policy from its config ({ retries?, timeoutMs? }), clamped to safe bounds. */
export function policyFor(config: Record<string, unknown> | undefined): RetryPolicy {
  const p = { ...DEFAULT_POLICY }
  const params = (config?.parameters as Record<string, unknown> | undefined) ?? {}
  const r = Number(config?.retries ?? params.retries)
  const t = Number(config?.timeoutMs ?? params.timeoutMs)
  if (Number.isFinite(r)) p.retries = clamp(r, LIMITS.retries)
  if (Number.isFinite(t)) p.timeoutMs = clamp(t, LIMITS.timeoutMs)
  return p
}

export class RunDeadlineError extends Error {
  code = 'RUN_DEADLINE'
  constructor() {
    super('Run deadline reached before this step could finish')
  }
}

/** A short, user-facing message for provider errors (the raw 429 body is a JSON blob). */
export function describeError(err: unknown): string {
  const e = err as ErrorLike & { message?: string }
  if (e?.status === 429) {
    const wait = retryAfterMs(err)
    const perDay = /tokens per day|TPD/i.test(e.message ?? '')
    const when = wait == null ? 'shortly' : wait < 90_000 ? `in about ${Math.max(1, Math.ceil(wait / 1000))} s` : `in about ${Math.ceil(wait / 60_000)} min`
    return `The model provider's ${perDay ? 'daily token' : 'rate'} limit was reached. Try again ${when}.`
  }
  if (typeof e?.status === 'number' && e.status >= 500) return `The model provider returned an error (${e.status}). Try again.`
  return err instanceof Error ? err.message : 'Step failed'
}

export class StepTimeoutError extends Error {
  code = 'STEP_TIMEOUT'
  constructor(ms: number) {
    super(`Step timed out after ${(ms / 1000).toFixed(1)} s`)
  }
}

type ErrorLike = { status?: number; name?: string; code?: string; headers?: Headers | Record<string, string> }

/** Rate limits, server errors, timeouts and dropped connections are worth another try; 4xx client errors are not. */
export function isRetryable(err: unknown): boolean {
  if (err instanceof StepTimeoutError) return true
  const e = err as ErrorLike
  if (typeof e?.status === 'number') return e.status === 408 || e.status === 409 || e.status === 429 || e.status >= 500
  return ['APIConnectionError', 'APIConnectionTimeoutError', 'FetchError', 'TypeError'].includes(e?.name ?? '') || e?.code === 'ECONNRESET'
}

function retryAfterMs(err: unknown): number | null {
  const h = (err as ErrorLike)?.headers
  const raw = h instanceof Headers ? h.get('retry-after') : h?.['retry-after']
  if (!raw) return null
  const secs = Number(raw)
  if (Number.isFinite(secs)) return secs * 1000
  const at = Date.parse(raw)
  return Number.isFinite(at) ? Math.max(0, at - Date.now()) : null
}

/** Delay before attempt `attempt + 1` (attempt is 1-based). */
export function backoffMs(attempt: number, policy: RetryPolicy, err?: unknown, random = Math.random): number {
  const hinted = retryAfterMs(err)
  if (hinted != null) return Math.min(policy.maxDelayMs, hinted)
  const ceiling = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** (attempt - 1))
  return Math.round(ceiling * (0.5 + random() / 2)) // jitter in [ceiling/2, ceiling]
}

export interface AttemptInfo {
  attempt: number
  delayMs: number
  reason: string
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * Runs `fn` with a per-attempt timeout (via AbortSignal) and retries retryable failures.
 * `onRetry` fires before each wait, so a streaming UI can clear partial output.
 */
export async function withRetry<T>(
  fn: (signal: AbortSignal, attempt: number) => Promise<T>,
  policy: RetryPolicy,
  onRetry: (info: AttemptInfo) => void = () => {},
  wait: (ms: number) => Promise<void> = sleep,
  /** Epoch ms after which no attempt may run (the whole run's budget). */
  deadlineAt = Infinity,
): Promise<{ value: T; attempts: number }> {
  for (let attempt = 1; ; attempt++) {
    const budget = Math.min(policy.timeoutMs, deadlineAt - Date.now())
    if (budget <= 0) throw Object.assign(new RunDeadlineError(), { attempts: attempt - 1 })
    const controller = new AbortController()
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, budget)
    try {
      const value = await fn(controller.signal, attempt)
      return { value, attempts: attempt }
    } catch (raw) {
      const err = timedOut ? new StepTimeoutError(budget) : raw
      const delayMs = backoffMs(attempt, policy, err)
      // A provider asking for a longer wait than our cap (e.g. a daily token quota) will not clear in time: fail fast.
      const hinted = retryAfterMs(err)
      const futile = hinted != null && hinted > policy.maxDelayMs * 2
      if (attempt > policy.retries || !isRetryable(err) || futile || Date.now() + delayMs >= deadlineAt) {
        if (err instanceof Error) (err as Error & { attempts?: number }).attempts = attempt
        throw err
      }
      onRetry({ attempt, delayMs, reason: err instanceof Error ? err.message.slice(0, 160) : 'error' })
      await wait(delayMs)
    } finally {
      clearTimeout(timer)
    }
  }
}
