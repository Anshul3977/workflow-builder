import { z } from 'zod'
import { sql } from '@/lib/server/db'
import { getUser, json, unauthorized } from '@/lib/server/session'
import { execute, StepSchema, type Step, type RunEvent } from '@/lib/server/runner'
import { saveStepTrace, finishRun, failRun } from '@/lib/server/traces'
import { encodeSse } from '@/lib/sse'
import { AiKeyMissingError, hasAiKey } from '@/lib/server/llm'
import { clientHash, runsLeft, DEMO_RUNS_PER_HOUR, USER_RUNS_PER_HOUR } from '@/lib/server/limits'
import { DEMO_INPUT_MAX, USER_INPUT_MAX } from '@/lib/run-limits'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const RunSchema = z.object({
  steps: z.array(StepSchema).max(8).optional(),
  input: z.string().trim().min(1).max(USER_INPUT_MAX),
  workflowId: z.string().uuid().optional(),
  templateSlug: z.string().max(100).optional(),
})

type Prepared = { runId: string; steps: Step[]; input: string; demo: boolean }

/** Validates, applies demo/user rate limits, resolves template steps and creates the run row. */
async function prepare(req: Request): Promise<Prepared | Response> {
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
    if (body.input.length > DEMO_INPUT_MAX) return json({ success: false, error: 'Demo runs are limited to 2,000 characters.' }, 400)
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
  return { runId: run.id as string, steps, input: body.input, demo: !user }
}

/** Runs the steps, saving a trace row as each step finishes. */
async function run(p: Prepared, emit: (e: RunEvent) => void = () => {}) {
  const traceWrites: Promise<unknown>[] = []
  const result = await execute(p.runId, p.steps, p.input, (e) => {
    if (e.type === 'step-end') traceWrites.push(saveStepTrace(p.runId, e.index, e.result).catch(() => {}))
    emit(e)
  })
  await Promise.all(traceWrites)
  await finishRun(p.runId, result)
  return result
}

const wantsStream = (req: Request) =>
  (req.headers.get('accept') ?? '').includes('text/event-stream') || new URL(req.url).searchParams.get('stream') === '1'

// POST /api/workflows: run a workflow. Signed-in users run any steps; guests run a seeded template.
// With `Accept: text/event-stream` the response is an SSE stream: run, step-start, delta, step-end, done | error.
export async function POST(req: Request) {
  const p = await prepare(req)
  if (p instanceof Response) return p

  if (!wantsStream(req)) {
    try {
      const result = await run(p)
      return json({ success: true, runId: p.runId, demo: p.demo, results: result })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Run failed'
      await failRun(p.runId, message)
      return json({ success: false, error: message }, 500)
    }
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true
      const send = (event: string, data: unknown) => {
        if (!open) return
        try {
          controller.enqueue(encoder.encode(encodeSse(event, data)))
        } catch {
          open = false // client went away; keep running so the run is still saved
        }
      }
      send('run', { runId: p.runId, demo: p.demo, steps: p.steps.map((s) => ({ id: s.id, type: s.type })) })
      try {
        const result = await run(p, (e) => send(e.type, e))
        send('done', { runId: p.runId, demo: p.demo, results: result })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Run failed'
        await failRun(p.runId, message).catch(() => {})
        send('error', { message, code: err instanceof AiKeyMissingError ? err.code : undefined })
      } finally {
        if (open) controller.close()
      }
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
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
