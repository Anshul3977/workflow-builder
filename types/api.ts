import type { StepResult } from './results'
import type { Workflow } from './workflow'
import type { HealthMetrics } from './health'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  details?: unknown
}

export interface RunWorkflowRequest {
  steps: Workflow['steps']
  input: string
  workflowId?: string
}

export interface ExecutionResult {
  workflowRunId: string
  initialInput: string
  steps: StepResult[]
  totalProcessingTime: number
  status: 'completed' | 'failed'
}

export interface RunWorkflowResponse {
  success: boolean
  runId: string
  results: ExecutionResult
}

export interface HistoryResponse {
  success: boolean
  data: Record<string, unknown>[]
  pagination: {
    limit: number
    offset: number
    total: number
  }
}

export interface HealthResponse {
  status: 'healthy'
  timestamp: string
  health: HealthMetrics
}
