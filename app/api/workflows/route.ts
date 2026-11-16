import { z } from 'zod'
import { sql } from '@/lib/server/db'
import { getUser, json, unauthorized } from '@/lib/server/session'
import { execute, StepSchema, type Step } from '@/lib/server/runner'
import { AiKeyMissingError, hasAiKey } from '@/lib/server/llm'
import { clientHash, runsLeft, DEMO_RUNS_PER_HOUR, USER_RUNS_PER_HOUR } from '@/lib/server/limits'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const RunSchema = z.object({
  steps: z.array(StepSchema).max(8).optional(),
  input: z.string().trim().min(1).max(8000),
  workflowId: z.string().uuid().optional(),
  templateSlug: z.string().max(100).optional(),
})

// POST /api/workflows: run a workflow. Signed-in users run any steps; guests run a seeded template.
export async function POST(req: Request) {
  const parsed = RunSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return json({ success: false, error: 'Invalid request', details: parsed.error.issues }, 400)
  const body = parsed.data
  if (!hasAiKey()) return json({ success: false, code: 'AI_KEY_MISSING', error: new AiKeyMissingError().message }, 503)

  const user = await getUser()
  const db = sql()
  let steps: Step[] = body.steps ?? []
  let client: string | null = null

  if (!user) {
    if (!body.templateSlug) return json({ success: false, code: 'LOGIN_REQUIRED', error: 'Log in to run your own steps, or pick a template to try it without an account.' }, 401)
    if (body.input.length > 2000) return json({ success: false, error: 'Demo runs are limited to 2,000 characters.' }, 400)
    client = clientHash(req)
    if ((await runsLeft({ client })) <= 0)
      return json({ success: false, code: 'RATE_LIMITED', error: `Demo limit reached (${DEMO_RUNS_PER_HOUR} runs per hour). Log in for more, or try again later.` }, 429)
  } else if ((await runsLeft({ userId: user.id })) <= 0) {
    return json({ success: false, code: 'RATE_LIMITED', error: `You've hit ${USER_RUNS_PER_HOUR} runs this hour. Try again a bit later.` }, 429)
  }

  if (body.templateSlug && (!user || steps.length === 0)) {
    const [t] = await db`SELECT steps FROM workflow_templates WHERE slug = ${body.templateSlug} AND is_public`
    if (!t) return json({ success: false, error: 'Template not found' }, 404)
    steps = t.steps as Step[]
  }
  if (steps.length === 0) return json({ success: false, error: 'Add at least one step.' }, 400)

  let workflowId: string | null = null
  if (user && body.workflowId) {
    const [w] = await db`SELECT id FROM workflows WHERE id = ${body.workflowId} AND user_id = ${user.id}`
    workflowId = w ? (w.id as string) : null
  }

  const [run] = await db`
    INSERT INTO workflow_runs (workflow_id, template_slug, user_id, is_demo, client_hash, input_text, status)
    VALUES (${workflowId}, ${body.templateSlug ?? null}, ${user?.id ?? null}, ${!user}, ${client}, ${body.input}, 'running')
    RETURNING id`
  try {
    const result = await execute(run.id as string, steps, body.input)
    await db`UPDATE workflow_runs SET status = ${result.status}, results = ${JSON.stringify(result)}::jsonb,
      total_processing_time = ${result.totalProcessingTime}, completed_at = now() WHERE id = ${run.id}`
    return json({ success: true, runId: run.id, demo: !user, results: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Run failed'
    await db`UPDATE workflow_runs SET status = 'failed', error_message = ${message}, completed_at = now() WHERE id = ${run.id}`
    return json({ success: false, error: message }, 500)
  }
}

// GET /api/workflows: the signed-in user's run history.
export async function GET(req: Request) {
  const user = await getUser()
  if (!user) return unauthorized()
  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 100)
  const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0)
  const db = sql()
  const rows = await db`SELECT * FROM workflow_runs WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
  const [c] = await db`SELECT count(*)::int AS n FROM workflow_runs WHERE user_id = ${user.id}`
  return json({ success: true, data: rows, pagination: { limit, offset, total: c.n } })
}
