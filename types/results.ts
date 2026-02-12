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

export interface ExecutionResult {
  workflowRunId: string
  initialInput: string
  steps: StepResult[]
  totalProcessingTime: number
  status: 'completed' | 'failed'
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
