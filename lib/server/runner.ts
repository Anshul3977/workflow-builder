import { z } from 'zod'
import { streamStep, STEP_TYPES, AiKeyMissingError, type StepType, type StepOutput, type StepTrace } from './llm'
import { withRetry, policyFor, describeError, type RetryPolicy } from './retry'
import { costUsd } from './pricing'

export const StepSchema = z.object({
  id: z.string().max(100),
  type: z.enum(STEP_TYPES as [StepType, ...StepType[]]),
  position: z.number().optional(),
  // The builder stores { type, parameters }; older clients sent the parameters directly.
  config: z.record(z.unknown()).optional(),
})
export type Step = z.infer<typeof StepSchema>

/**
 * Which text a step reads. Default is the previous step's output (a chain). `source: "input"` reads the run's
 * original input and `source: <n>` reads step n's output (0-based, earlier steps only), so a workflow can fan out
 * from one cleaned text instead of feeding, say, a sentiment report into a categorizer.
 */
export function sourceOf(step: Step, index: number, input: string, outputs: string[]): string {
  const src = step.config?.source ?? (step.config?.parameters as Record<string, unknown> | undefined)?.source
  if (src === 'input') return input
  if (typeof src === 'number' && Number.isInteger(src) && src >= 0 && src < index) return outputs[src]
  return index === 0 ? input : outputs[index - 1]
}

function paramsOf(step: Step): Record<string, unknown> {
  const c = step.config ?? {}
  return (c.parameters as Record<string, unknown>) ?? c
}

export interface StepResult {
  stepId: string
  stepType: string
  input: string
  output: string
  processingTime: number
  status: 'success' | 'error'
  error?: string
  tokensUsed?: { input: number; output: number }
  trace?: StepTrace
  /** Attempts made, including retries. */
  attempts?: number
}

export interface RunTotals {
  inputTokens: number
  outputTokens: number
  model: string | null
  costUsd: number | null
  retries: number
}

export interface Execution {
  workflowRunId: string
  initialInput: string
  steps: StepResult[]
  totalProcessingTime: number
  status: 'completed' | 'failed'
  totals: RunTotals
}

export type RunEvent =
  | { type: 'step-start'; index: number; stepId: string; stepType: string }
  | { type: 'delta'; index: number; text: string }
  | { type: 'retry'; index: number; attempt: number; delayMs: number; reason: string }
  | { type: 'step-end'; index: number; result: StepResult }

export type StepFn = (
  type: StepType,
  text: string,
  params: Record<string, unknown>,
  onDelta: (chunk: string) => void,
  signal?: AbortSignal,
) => Promise<StepOutput>

export function totalsOf(steps: StepResult[]): RunTotals {
  const costs = steps.map((s) => s.trace?.costUsd).filter((c): c is number => typeof c === 'number')
  return {
    inputTokens: steps.reduce((n, s) => n + (s.trace?.inputTokens ?? 0), 0),
    outputTokens: steps.reduce((n, s) => n + (s.trace?.outputTokens ?? 0), 0),
    model: steps.find((s) => s.trace)?.trace?.model ?? null,
    costUsd: costs.length ? costs.reduce((a, b) => a + b, 0) : null,
    retries: steps.reduce((n, s) => n + Math.max(0, (s.trace?.attempts ?? s.attempts ?? 1) - 1), 0),
  }
}

/**
 * Runs steps in order; each step's output is the next step's input. Stops at the first error.
 * `emit` receives live events (step start, streamed text, step end) for the UI.
 */
export interface ExecuteOptions {
  runStepFn?: StepFn
  /** Overrides each step's policy (tests use tiny delays). */
  policy?: (step: Step) => RetryPolicy
  wait?: (ms: number) => Promise<void>
  /** Whole-run budget in ms; keeps retries inside the function's max duration. */
  deadlineMs?: number
}

// Inside the route's maxDuration (120 s) with room to save the run.
export const RUN_DEADLINE_MS = 100_000

export async function execute(
  runId: string,
  steps: Step[],
  input: string,
  emit: (e: RunEvent) => void = () => {},
  opts: ExecuteOptions | StepFn = {},
): Promise<Execution> {
  const { runStepFn = streamStep, policy = (st: Step) => policyFor(st.config), wait, deadlineMs = RUN_DEADLINE_MS } =
    typeof opts === 'function' ? { runStepFn: opts } : opts
  const start = Date.now()
  const deadlineAt = start + deadlineMs
  const results: StepResult[] = []
  const outputs: string[] = []
  for (const [index, step] of steps.entries()) {
    const t0 = Date.now()
    const current = sourceOf(step, index, input, outputs)
    emit({ type: 'step-start', index, stepId: step.id, stepType: step.type })
    let result: StepResult
    try {
      const { value: out, attempts } = await withRetry(
        (signal) => runStepFn(step.type, current, paramsOf(step), (text) => emit({ type: 'delta', index, text }), signal),
        policy(step),
        (info) => emit({ type: 'retry', index, ...info }),
        wait,
        deadlineAt,
      )
      const trace = { ...out.trace, attempts, costUsd: costUsd(out.trace.model, out.trace.inputTokens, out.trace.outputTokens) }
      result = { stepId: step.id, stepType: step.type, input: current, output: out.result, processingTime: Date.now() - t0, status: 'success', tokensUsed: out.tokensUsed, trace, attempts }
      outputs.push(out.result)
    } catch (err) {
      if (err instanceof AiKeyMissingError) throw err
      const attempts = (err as { attempts?: number }).attempts ?? 1
      result = { stepId: step.id, stepType: step.type, input: current, output: '', processingTime: Date.now() - t0, status: 'error', error: describeError(err), attempts }
    }
    results.push(result)
    emit({ type: 'step-end', index, result })
    if (result.status === 'error') break
  }
  return {
    workflowRunId: runId,
    initialInput: input,
    steps: results,
    totalProcessingTime: Date.now() - start,
    status: results.some((r) => r.status === 'error') ? 'failed' : 'completed',
    totals: totalsOf(results),
  }
}
