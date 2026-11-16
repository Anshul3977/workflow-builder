import type {
  RunWorkflowResponse,
  HistoryResponse,
  HealthResponse,
} from '@/types/api'
import type { Workflow, WorkflowStep } from '@/types/workflow'
import type { WorkflowRun } from '@/types/results'

// Same-origin API routes (Next.js on Vercel). Auth travels as an httpOnly cookie.
const API_BASE = '/api'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      credentials: 'same-origin',
    })
  } catch {
    throw new ApiError('Network error. Check your connection and try again.')
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new ApiError(data.error || `Request failed (${response.status})`, response.status, data.code)
  }
  return response.json()
}

// Maps a DB record (snake_case) to the frontend WorkflowRun (camelCase)
function mapDbRunToWorkflowRun(dbRun: Record<string, unknown>): WorkflowRun {
  return {
    id: dbRun.id as string,
    workflowId: (dbRun.workflow_id as string) || undefined,
    input: (dbRun.input_text as string) || '',
    status: dbRun.status as WorkflowRun['status'],
    results: dbRun.results as WorkflowRun['results'],
    createdAt: dbRun.created_at as string,
    completedAt: (dbRun.completed_at as string) || undefined,
  }
}

export const workflowApi = {
  async run(workflow: Workflow, input: string, templateSlug?: string | null): Promise<RunWorkflowResponse> {
    const payload = {
      steps: workflow.steps,
      input,
      templateSlug: templateSlug || undefined,
    }
    return fetchApi<RunWorkflowResponse>('/workflows', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async getHistory(limit = 50, offset = 0): Promise<{ runs: WorkflowRun[]; total: number }> {
    const response = await fetchApi<HistoryResponse>(
      `/workflows?limit=${limit}&offset=${offset}`,
    )
    return {
      runs: (response.data || []).map(mapDbRunToWorkflowRun),
      total: response.pagination?.total ?? 0,
    }
  },

  async getResults(runId: string): Promise<{ run: WorkflowRun }> {
    const response = await fetchApi<{ success: boolean; data: Record<string, unknown> }>(`/workflows/${runId}`)
    return {
      run: mapDbRunToWorkflowRun(response.data),
    }
  },

  async clearHistory(): Promise<{ deletedCount: number }> {
    return fetchApi<{ deletedCount: number }>('/workflows/clear', {
      method: 'DELETE',
    })
  },
}

export const healthApi = {
  async getStatus(): Promise<HealthResponse> {
    return fetchApi<HealthResponse>('/health')
  },
}

export interface SavedWorkflow {
  id: string
  name: string
  description: string | null
  steps: unknown[]
  user_id: string
  created_at: string
  updated_at: string
}

export const savedWorkflowApi = {
  async save(name: string, steps: unknown[], description?: string): Promise<SavedWorkflow> {
    const response = await fetchApi<{ success: boolean; data: SavedWorkflow }>('/saved-workflows', {
      method: 'POST',
      body: JSON.stringify({ name, steps, description }),
    })
    return response.data
  },

  async list(): Promise<SavedWorkflow[]> {
    const response = await fetchApi<{ success: boolean; data: SavedWorkflow[] }>('/saved-workflows')
    return response.data || []
  },

  async delete(id: string): Promise<void> {
    await fetchApi<{ success: boolean }>(`/saved-workflows/${id}`, { method: 'DELETE' })
  },
}

export interface WorkflowTemplate {
  slug: string
  name: string
  description: string | null
  category: string | null
  steps: WorkflowStep[]
  sample_input: string
}

export const templateApi = {
  async list(): Promise<WorkflowTemplate[]> {
    const response = await fetchApi<{ success: boolean; data: WorkflowTemplate[] }>('/templates')
    return response.data || []
  },
}
