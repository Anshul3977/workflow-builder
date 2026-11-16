'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, Circle, Loader2, X, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { StepTrace } from '@/types/results'
import { STEP_LABELS, TraceChips, ms } from './trace'

export interface LiveStep {
  id: string
  type: string
  status: 'pending' | 'running' | 'success' | 'error'
  output: string
  error?: string
  trace?: StepTrace
}

export interface LiveRunState {
  runId: string | null
  startedAt: number
  finishedAt: number | null
  status: 'connecting' | 'running' | 'completed' | 'failed'
  steps: LiveStep[]
  error?: string
}

function Elapsed({ from, to }: { from: number; to: number | null }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (to) return
    const t = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(t)
  }, [to])
  return <span className="font-mono tabular-nums">{ms((to ?? now) - from)}</span>
}

const icon = {
  pending: <Circle className="h-4 w-4 text-muted-foreground/50" />,
  running: <Loader2 className="h-4 w-4 animate-spin text-primary motion-reduce:animate-none" />,
  success: <Check className="h-4 w-4 text-primary" />,
  error: <X className="h-4 w-4 text-destructive" />,
}

/** Shows a run as it happens: each step's text streams in, then its trace appears. */
export function LiveRun({ state }: { state: LiveRunState }) {
  const done = state.status === 'completed' || state.status === 'failed'
  return (
    <Card className="p-5 md:p-6 space-y-5" aria-live="polite" aria-busy={!done}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">
            {state.status === 'connecting' && 'Starting run…'}
            {state.status === 'running' && 'Running'}
            {state.status === 'completed' && 'Run complete'}
            {state.status === 'failed' && 'Run failed'}
          </h2>
          <p className="text-xs text-muted-foreground">
            <Elapsed from={state.startedAt} to={state.finishedAt} /> elapsed · output streams as Groq generates it
          </p>
        </div>
        {done && state.runId && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/results/${state.runId}`}>
              Full trace <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <ol className="space-y-4">
        {state.steps.map((s, i) => (
          <li key={`${s.id}-${i}`} className="grid grid-cols-[1.25rem_1fr] gap-3" data-status={s.status}>
            <span className="mt-0.5">{icon[s.status]}</span>
            <div className="min-w-0 space-y-2">
              <p className={`text-sm font-medium ${s.status === 'pending' ? 'text-muted-foreground' : ''}`}>
                {i + 1}. {STEP_LABELS[s.type] ?? s.type}
              </p>
              {(s.output || s.status === 'running') && (
                <div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded border bg-muted/40 p-3 text-sm leading-relaxed" data-testid="live-output">
                  {s.output}
                  {s.status === 'running' && (
                    <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse bg-primary motion-reduce:animate-none" aria-hidden />
                  )}
                </div>
              )}
              {s.error && <p className="text-sm text-destructive">{s.error}</p>}
              {s.trace && <TraceChips trace={s.trace} />}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  )
}
