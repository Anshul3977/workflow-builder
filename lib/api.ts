import type {
  ApiResponse,
  RunWorkflowRequest,
  RunWorkflowResponse,
  HistoryResponse,
  HealthResponse,
} from '@/types/api'
import type { Workflow } from '@/types/workflow'
import type { WorkflowRun } from '@/types/results'
import { supabase } from '@/lib/supabase'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  return headers
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  const authHeaders = await getAuthHeaders()

  try {
    const response = await fetch(url, {
      headers: {
        ...authHeaders,
        ...options?.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `API Error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`API request failed: ${message}`)
  }
}

// Maps a Supabase DB record (snake_case) to the frontend WorkflowRun (camelCase)
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
  async run(workflow: Workflow, input: string): Promise<RunWorkflowResponse> {
    const payload = {
      steps: workflow.steps,
      input,
      workflowId: workflow.id,
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

  async checkService(service: string): Promise<ApiResponse<unknown>> {
    return fetchApi<ApiResponse<unknown>>(`/health/${service}`)
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

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
