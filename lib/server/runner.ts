import { z } from 'zod'
import { runStep, STEP_TYPES, AiKeyMissingError, type StepType } from './llm'

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
}

export interface Execution {
  workflowRunId: string
  initialInput: string
  steps: StepResult[]
  totalProcessingTime: number
  status: 'completed' | 'failed'
}

/** Runs steps in order; each step's output is the next step's input. Stops at the first error. */
export async function execute(runId: string, steps: Step[], input: string): Promise<Execution> {
  const start = Date.now()
  const results: StepResult[] = []
  let current = input
  for (const step of steps) {
    const t0 = Date.now()
    try {
      const out = await runStep(step.type, current, paramsOf(step))
      results.push({ stepId: step.id, stepType: step.type, input: current, output: out.result, processingTime: out.processingTime, status: 'success', tokensUsed: out.tokensUsed })
      current = out.result
    } catch (err) {
      if (err instanceof AiKeyMissingError) throw err
      results.push({ stepId: step.id, stepType: step.type, input: current, output: '', processingTime: Date.now() - t0, status: 'error', error: err instanceof Error ? err.message : 'Step failed' })
      break
    }
  }
  return {
    workflowRunId: runId,
    initialInput: input,
    steps: results,
    totalProcessingTime: Date.now() - start,
    status: results.some((r) => r.status === 'error') ? 'failed' : 'completed',
  }
}
