import { describe, expect, it } from 'vitest'
import { mapDbRunToWorkflowRun } from '@/lib/api'

const base = {
  id: '11111111-1111-1111-1111-111111111111',
  input_text: 'notes',
  status: 'completed',
  created_at: '2026-11-17T00:00:00.000Z',
  results: {
    workflowRunId: '11111111-1111-1111-1111-111111111111',
    initialInput: 'notes',
    totalProcessingTime: 10,
    status: 'completed',
    steps: [{ stepId: 's', stepType: 'clean', input: 'notes', output: 'Notes', processingTime: 10, status: 'success' }],
  },
}

describe('mapDbRunToWorkflowRun', () => {
  it('fills cost and attempts from the trace table when the stored JSON has no trace', () => {
    const run = mapDbRunToWorkflowRun({
      ...base,
      traces: [
        {
          step_index: 0,
          model: 'openai/gpt-oss-20b',
          latency_ms: 400,
          ttft_ms: 120,
          provider_ms: 300,
          input_tokens: 10,
          output_tokens: 4,
          reasoning_tokens: 0,
          started_at: '2026-11-17T00:00:00.000Z',
          attempts: 2,
          cost_usd: 0.0000686,
        },
      ],
    })
    expect(run.results?.steps[0].trace).toMatchObject({ attempts: 2, costUsd: 0.0000686, latencyMs: 400 })
  })

  it('keeps a cost already stored on the step and backfills one that is missing', () => {
    const withCost = mapDbRunToWorkflowRun({
      ...base,
      results: {
        ...base.results,
        steps: [{ ...base.results.steps[0], trace: { model: 'm', latencyMs: 1, ttftMs: 1, inputTokens: 1, outputTokens: 1, reasoningTokens: 0, providerMs: 1, startedAt: '', costUsd: 0.01 } }],
      },
      traces: [{ step_index: 0, model: 'm', latency_ms: 1, ttft_ms: 1, provider_ms: 1, input_tokens: 1, output_tokens: 1, reasoning_tokens: 0, started_at: '', attempts: 3, cost_usd: 0.5 }],
    })
    expect(withCost.results?.steps[0].trace).toMatchObject({ costUsd: 0.01, attempts: 3 })
  })
})