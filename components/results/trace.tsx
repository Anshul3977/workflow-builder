import type { StepResult, StepTrace } from '@/types/results'
import { STEP_LABELS } from '@/lib/step-summary'

export { STEP_LABELS }

export const ms = (n: number | null | undefined) =>
  n == null ? '–' : n >= 1000 ? `${(n / 1000).toFixed(2)} s` : `${Math.round(n)} ms`

/** Cost at list price, with 3 significant digits so fractions of a cent stay readable ($0.0000686). */
export const usd = (n: number | null | undefined) => {
  if (n == null) return '–'
  if (n === 0) return '$0'
  const decimals = Math.min(10, Math.max(2, 2 - Math.floor(Math.log10(n))))
  return `$${n.toFixed(decimals)}`
}

const shortModel = (m: string) => m.split('/').pop() ?? m

/** One line of per-step trace facts: latency, time to first token, tokens and model. */
export function TraceChips({ trace, className = '' }: { trace: StepTrace; className?: string }) {
  const items: [string, string][] = [
    ['latency', ms(trace.latencyMs)],
    ['first token', ms(trace.ttftMs)],
    ['tokens in/out', `${trace.inputTokens} / ${trace.outputTokens}`],
  ]
  if (trace.reasoningTokens) items.push(['reasoning', String(trace.reasoningTokens)])
  if (trace.costUsd != null) items.push(['est. cost', usd(trace.costUsd)])
  if (trace.attempts && trace.attempts > 1) items.push(['attempts', String(trace.attempts)])
  items.push(['model', shortModel(trace.model)])
  return (
    <dl className={`flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground ${className}`}>
      {items.map(([k, v]) => (
        <div key={k} className="flex gap-1.5">
          <dt className="opacity-70">{k}</dt>
          <dd className="text-foreground">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Waterfall of step timings: where the run's time went, with the first-token mark on each bar. */
export function TraceWaterfall({ steps }: { steps: StepResult[] }) {
  const rows = steps.map((s) => {
    const start = s.trace?.startedAt ? Date.parse(s.trace.startedAt) : NaN
    return { s, start, dur: s.trace?.latencyMs ?? s.processingTime }
  })
  const known = rows.every((r) => Number.isFinite(r.start))
  let cursor = 0
  const placed = rows.map((r) => {
    const offset = known ? r.start - rows[0].start : cursor
    cursor = offset + r.dur
    return { ...r, offset }
  })
  const total = Math.max(1, ...placed.map((r) => r.offset + r.dur))

  return (
    <div className="space-y-2.5" role="table" aria-label="Step timing">
      {placed.map(({ s, offset, dur }, i) => {
        const ttft = s.trace?.ttftMs
        return (
          <div key={s.stepId} role="row" className="grid grid-cols-[8.5rem_1fr_4.5rem] items-center gap-3 text-xs">
            <span role="cell" className="truncate text-muted-foreground">
              {i + 1}. {STEP_LABELS[s.stepType] ?? s.stepType}
            </span>
            <span role="cell" className="relative h-5 rounded bg-muted">
              <span
                className={`absolute inset-y-0 rounded ${s.status === 'error' ? 'bg-destructive/70' : 'bg-primary/80'}`}
                style={{ left: `${(offset / total) * 100}%`, width: `${Math.max(1, (dur / total) * 100)}%` }}
              />
              {ttft != null && (
                <span
                  title={`first token at ${ms(ttft)}`}
                  className="absolute inset-y-0 w-px bg-background/90"
                  style={{ left: `${((offset + ttft) / total) * 100}%` }}
                />
              )}
            </span>
            <span role="cell" className="text-right font-mono tabular-nums">
              {ms(dur)}
            </span>
          </div>
        )
      })}
      <p className="pt-1 text-[11px] text-muted-foreground">Bars show each step&apos;s wall time; the thin mark is the first streamed token.</p>
    </div>
  )
}
