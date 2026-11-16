import { z } from 'zod'
import { streamStep, STEP_TYPES, AiKeyMissingError, type StepType, type StepOutput, type StepTrace } from './llm'

export const StepSchema = z.object({
  id: z.string().max(100),
  type: z.enum(STEP_TYPES as [StepType, ...StepType[]]),
  position: z.number().optional(),
  // The builder stores { type, parameters }; older clients sent the parameters directly.
  config: z.record(z.unknown()).optional(),
})
export type Step = z.infer<typeof StepSchema>

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
}

export interface RunTotals {
  inputTokens: number
  outputTokens: number
  model: string | null
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
  | { type: 'step-end'; index: number; result: StepResult }

export type StepFn = (
  type: StepType,
  text: string,
  params: Record<string, unknown>,
  onDelta: (chunk: string) => void,
) => Promise<StepOutput>

export function totalsOf(steps: StepResult[]): RunTotals {
  return {
    inputTokens: steps.reduce((n, s) => n + (s.trace?.inputTokens ?? 0), 0),
    outputTokens: steps.reduce((n, s) => n + (s.trace?.outputTokens ?? 0), 0),
    model: steps.find((s) => s.trace)?.trace?.model ?? null,
  }
}

/**
 * Runs steps in order; each step's output is the next step's input. Stops at the first error.
 * `emit` receives live events (step start, streamed text, step end) for the UI.
 */
export async function execute(
  runId: string,
  steps: Step[],
  input: string,
  emit: (e: RunEvent) => void = () => {},
  runStepFn: StepFn = streamStep,
): Promise<Execution> {
  const start = Date.now()
  const results: StepResult[] = []
  let current = input
  for (const [index, step] of steps.entries()) {
    const t0 = Date.now()
    emit({ type: 'step-start', index, stepId: step.id, stepType: step.type })
    let result: StepResult
    try {
      const out = await runStepFn(step.type, current, paramsOf(step), (text) => emit({ type: 'delta', index, text }))
      result = { stepId: step.id, stepType: step.type, input: current, output: out.result, processingTime: out.processingTime, status: 'success', tokensUsed: out.tokensUsed, trace: out.trace }
      current = out.result
    } catch (err) {
      if (err instanceof AiKeyMissingError) throw err
      result = { stepId: step.id, stepType: step.type, input: current, output: '', processingTime: Date.now() - t0, status: 'error', error: err instanceof Error ? err.message : 'Step failed' }
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
