import { sql } from './db'
import type { StepResult, Execution } from './runner'

/** Stores one trace row for a finished step. Idempotent per (run, step index). */
export async function saveStepTrace(runId: string, index: number, r: StepResult) {
  const t = r.trace
  await sql()`
    INSERT INTO workflow_step_traces
      (run_id, step_index, step_id, step_type, status, model, latency_ms, ttft_ms, provider_ms,
       input_tokens, output_tokens, reasoning_tokens, error, started_at, attempts, cost_usd)
    VALUES (${runId}, ${index}, ${r.stepId}, ${r.stepType}, ${r.status}, ${t?.model ?? null},
      ${t?.latencyMs ?? r.processingTime}, ${t?.ttftMs ?? null}, ${t?.providerMs ?? null},
      ${t?.inputTokens ?? 0}, ${t?.outputTokens ?? 0}, ${t?.reasoningTokens ?? 0}, ${r.error ?? null}, ${t?.startedAt ?? null},
      ${r.attempts ?? t?.attempts ?? 1}, ${t?.costUsd ?? null})
    ON CONFLICT (run_id, step_index) DO NOTHING`
}

export async function finishRun(runId: string, result: Execution) {
  await sql()`UPDATE workflow_runs SET status = ${result.status}, results = ${JSON.stringify(result)}::jsonb,
    total_processing_time = ${result.totalProcessingTime}, model = ${result.totals.model},
    input_tokens = ${result.totals.inputTokens}, output_tokens = ${result.totals.outputTokens},
    cost_usd = ${result.totals.costUsd},
    completed_at = now() WHERE id = ${runId}`
}

export async function failRun(runId: string, message: string) {
  await sql()`UPDATE workflow_runs SET status = 'failed', error_message = ${message}, completed_at = now() WHERE id = ${runId}`
}

export async function tracesFor(runId: string) {
  return sql()`SELECT step_index, step_id, step_type, status, model, latency_ms, ttft_ms, provider_ms,
    input_tokens, output_tokens, reasoning_tokens, error, started_at, attempts, cost_usd::float8 AS cost_usd
    FROM workflow_step_traces WHERE run_id = ${runId} ORDER BY step_index`
}
