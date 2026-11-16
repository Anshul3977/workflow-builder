export interface StepTrace {
  model: string
  latencyMs: number
  ttftMs: number | null
  inputTokens: number
  outputTokens: number
  reasoningTokens: number
  providerMs: number | null
  startedAt: string
  /** Attempts made, including retries. */
  attempts?: number
  /** Estimated cost at Groq list price, USD. */
  costUsd?: number | null
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
  trace?: StepTrace
  attempts?: number
}

export interface ExecutionResult {
  workflowRunId: string
  initialInput: string
  steps: StepResult[]
  totalProcessingTime: number
  status: 'completed' | 'failed'
  totals?: { inputTokens: number; outputTokens: number; model: string | null; costUsd?: number | null; retries?: number }
}

export interface WorkflowRun {
  id: string
  workflowId?: string
  input: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  results?: ExecutionResult
  createdAt: string
  completedAt?: string
}
