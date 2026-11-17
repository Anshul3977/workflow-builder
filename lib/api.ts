import type {
  HistoryResponse,
  HealthResponse,
} from '@/types/api'
import type { Workflow, WorkflowStep } from '@/types/workflow'
import type { WorkflowRun, ExecutionResult, StepResult } from '@/types/results'
import { createSseParser } from '@/lib/sse'

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

type DbTrace = {
  step_index: number
  model: string | null
  latency_ms: number
  ttft_ms: number | null
  provider_ms: number | null
  input_tokens: number
  output_tokens: number
  reasoning_tokens: number
  started_at: string | null
  attempts?: number | null
  cost_usd?: number | null
}

function traceFromRow(t: DbTrace): NonNullable<StepResult['trace']> {
  return {
    model: t.model ?? '',
    latencyMs: t.latency_ms,
    ttftMs: t.ttft_ms,
    providerMs: t.provider_ms,
    inputTokens: t.input_tokens,
    outputTokens: t.output_tokens,
    reasoningTokens: t.reasoning_tokens,
    startedAt: t.started_at ?? '',
    ...(t.attempts != null ? { attempts: t.attempts } : {}),
    ...(t.cost_usd != null ? { costUsd: t.cost_usd } : {}),
  }
}

// Older runs stored no trace in their JSON; fill it from the trace table when present.
function withTraces(results: WorkflowRun['results'], traces?: DbTrace[]): WorkflowRun['results'] {
  if (!results || !traces?.length) return results
  return {
    ...results,
    steps: results.steps.map((s, i) => {
      const t = traces.find((x) => x.step_index === i)
      if (!t) return s
      const fromRow = traceFromRow(t)
      if (!s.trace) return { ...s, trace: fromRow }
      return {
        ...s,
        trace: {
          ...s.trace,
          attempts: s.trace.attempts ?? fromRow.attempts,
          costUsd: s.trace.costUsd ?? fromRow.costUsd,
        },
      }
    }),
  }
}

// Maps a DB record (snake_case) to the frontend WorkflowRun (camelCase)
export function mapDbRunToWorkflowRun(dbRun: Record<string, unknown>): WorkflowRun {
  return {
    id: dbRun.id as string,
    workflowId: (dbRun.workflow_id as string) || undefined,
    input: (dbRun.input_text as string) || '',
    status: dbRun.status as WorkflowRun['status'],
    results: withTraces(dbRun.results as WorkflowRun['results'], dbRun.traces as DbTrace[] | undefined),
    createdAt: dbRun.created_at as string,
    completedAt: (dbRun.completed_at as string) || undefined,
  }
}

export interface RunStreamHandlers {
  onRun?: (e: { runId: string; demo: boolean; steps: { id: string; type: string }[] }) => void
  onStepStart?: (e: { index: number; stepId: string; stepType: string }) => void
  onDelta?: (e: { index: number; text: string }) => void
  onStepEnd?: (e: { index: number; result: StepResult }) => void
  /** A step attempt failed and will be retried; its partial output should be discarded. */
  onRetry?: (e: { index: number; attempt: number; delayMs: number; reason: string }) => void
}

export const workflowApi = {
  /** Runs a workflow and streams step output as it is generated (SSE over a POST response). */
  async runStream(
    workflow: Workflow,
    input: string,
    templateSlug: string | null | undefined,
    handlers: RunStreamHandlers,
    signal?: AbortSignal,
  ): Promise<{ runId: string; demo: boolean; results: ExecutionResult }> {
    let response: Response
    try {
      response = await fetch(`${API_BASE}/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        credentials: 'same-origin',
        body: JSON.stringify({ steps: workflow.steps, input, templateSlug: templateSlug || undefined }),
        signal,
      })
    } catch {
      throw new ApiError('Network error. Check your connection and try again.')
    }
    if (!response.ok || !response.body) {
      const data = await response.json().catch(() => ({}))
      throw new ApiError(data.error || `Request failed (${response.status})`, response.status, data.code)
    }
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
    const feed = createSseParser()
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      for (const m of feed(value)) {
        const d = m.data as never
        if (m.event === 'run') handlers.onRun?.(d)
        else if (m.event === 'step-start') handlers.onStepStart?.(d)
        else if (m.event === 'delta') handlers.onDelta?.(d)
        else if (m.event === 'step-end') handlers.onStepEnd?.(d)
        else if (m.event === 'retry') handlers.onRetry?.(d)
        else if (m.event === 'done') return d
        else if (m.event === 'error') {
          const e = m.data as { message?: string; code?: string }
          throw new ApiError(e.message || 'Run failed', 500, e.code)
        }
      }
    }
    throw new ApiError('The connection closed before the run finished. Check History for the saved result.')
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
