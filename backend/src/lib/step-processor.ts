import { processStep as processGroqStep, ProcessStepInput, StepType } from './groq-client.js'

export interface WorkflowStep {
  id: string
  type: StepType
  config?: Record<string, unknown>
}

export interface StepResult {
  stepId: string
  stepType: string
  input: string
  output: string
  processingTime: number
  status: 'success' | 'error'
  error?: string
  tokensUsed?: {
    input: number
    output: number
  }
}

export interface WorkflowExecutionResult {
  workflowRunId: string
  initialInput: string
  steps: StepResult[]
  totalProcessingTime: number
  status: 'completed' | 'failed'
}

export async function executeWorkflowSteps(
  workflowRunId: string,
  steps: WorkflowStep[],
  initialInput: string
): Promise<WorkflowExecutionResult> {
  const startTime = Date.now()
  const results: StepResult[] = []
  let currentInput = initialInput

  for (const step of steps) {
    const stepStartTime = Date.now()

    try {
      const processInput: ProcessStepInput = {
        type: step.type,
        text: currentInput,
        config: step.config,
      }

      const output = await processGroqStep(processInput)

      const result: StepResult = {
        stepId: step.id,
        stepType: step.type,
        input: currentInput,
        output: output.result,
        processingTime: output.processingTime,
        status: 'success',
        tokensUsed: output.tokensUsed,
      }

      results.push(result)

      // Update input for next step (chaining)
      currentInput = output.result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

      const result: StepResult = {
        stepId: step.id,
        stepType: step.type,
        input: currentInput,
        output: '',
        processingTime: Date.now() - stepStartTime,
        status: 'error',
        error: errorMessage,
      }

      results.push(result)

      // Stop execution on error
      break
    }
  }

  const totalProcessingTime = Date.now() - startTime

  return {
    workflowRunId,
    initialInput,
    steps: results,
    totalProcessingTime,
    status: results.some((r) => r.status === 'error') ? 'failed' : 'completed',
  }
}
