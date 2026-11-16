import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fakeSql, req, readSse, trace, type Query } from '../helpers'

// --- mocks: session, database and the LLM call --------------------------------------
const session = { user: null as null | { id: string; email: string } }
vi.mock('@/lib/auth/server', () => ({ auth: { getSession: async () => ({ data: session.user ? { user: session.user } : null }) } }))

let demoRunsThisHour = 0
const TEMPLATE_STEPS = [
  { id: 's1', type: 'clean' },
  { id: 's2', type: 'summarize' },
]
const db = fakeSql((q: Query) => {
  if (q.text.startsWith('SELECT count(*)')) return [{ n: demoRunsThisHour }]
  if (q.text.includes('FROM workflow_templates')) return q.values[0] === 'support-ticket-triage' ? [{ steps: TEMPLATE_STEPS }] : []
  if (q.text.startsWith('INSERT INTO workflow_runs')) return [{ id: '11111111-1111-1111-1111-111111111111' }]
  return []
})
vi.mock('@/lib/server/db', () => ({ sql: () => db.fn }))

const streamStep = vi.fn()
vi.mock('@/lib/server/llm', async (orig) => ({ ...(await orig<typeof import('@/lib/server/llm')>()), streamStep }))

const { POST, GET } = await import('@/app/api/workflows/route')

beforeEach(() => {
  session.user = null
  demoRunsThisHour = 0
  db.queries.length = 0
  process.env.GROQ_API_KEY = 'test-key'
  streamStep.mockReset()
  streamStep.mockImplementation(async (type: string, text: string, _p: unknown, onDelta: (s: string) => void) => {
    onDelta(`${type}:`)
    onDelta(text.slice(0, 5))
    return { result: `${type}:${text.slice(0, 5)}`, processingTime: 7, tokensUsed: { input: 10, output: 4 }, trace: trace({ inputTokens: 10, outputTokens: 4 }) }
  })
})

const demo = { templateSlug: 'support-ticket-triage', input: 'my order is late' }
const inserted = (table: string) => db.queries.filter((q) => q.text.startsWith(`INSERT INTO ${table}`))

describe('POST /api/workflows: guards', () => {
  it('rejects invalid bodies with 400', async () => {
    expect((await POST(req('nope'))).status).toBe(400)
    expect((await POST(req({ input: '' }))).status).toBe(400)
  })

  it('returns 503 AI_KEY_MISSING when no Groq key is set', async () => {
    delete process.env.GROQ_API_KEY
    const res = await POST(req(demo))
    expect(res.status).toBe(503)
    expect(await res.json()).toMatchObject({ code: 'AI_KEY_MISSING' })
  })

  it('makes guests pick a template', async () => {
    const res = await POST(req({ input: 'x', steps: [{ id: 'a', type: 'clean' }] }))
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ code: 'LOGIN_REQUIRED' })
  })

  it('caps demo input at 2,000 characters', async () => {
    expect((await POST(req({ ...demo, input: 'a'.repeat(2001) }))).status).toBe(400)
  })

  it('rate-limits demo runs per client and never creates a run row', async () => {
    demoRunsThisHour = 5
    const res = await POST(req(demo, { accept: 'text/event-stream' }))
    expect(res.status).toBe(429)
    expect(await res.json()).toMatchObject({ code: 'RATE_LIMITED' })
    expect(inserted('workflow_runs')).toHaveLength(0)
  })

  it('returns 404 for an unknown template', async () => {
    expect((await POST(req({ ...demo, templateSlug: 'nope' }))).status).toBe(404)
  })
})

describe('POST /api/workflows: running', () => {
  it('streams run, step and delta events, then done, over SSE', async () => {
    const res = await POST(req(demo, { accept: 'text/event-stream' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
    const events = await readSse(res)
    expect(events.map((e) => e.event)).toEqual([
      'run',
      'step-start', 'delta', 'delta', 'step-end',
      'step-start', 'delta', 'delta', 'step-end',
      'done',
    ])
    expect(events[0].data).toMatchObject({ demo: true, steps: [{ type: 'clean' }, { type: 'summarize' }] })
    const done = events.at(-1)!.data as { results: { status: string; totals: object } }
    expect(done.results.status).toBe('completed')
    expect(done.results.totals).toMatchObject({ inputTokens: 20, outputTokens: 8, model: 'openai/gpt-oss-20b', retries: 0 })
  })

  it('stores a demo run with a hashed client id, one trace row per step and the rollups', async () => {
    await readSse(await POST(req(demo, { accept: 'text/event-stream' })))
    const [run] = inserted('workflow_runs')
    expect(run.values.slice(1, 4)).toEqual(['support-ticket-triage', null, true])
    expect(String(run.values[4])).toMatch(/^[0-9a-f]{32}$/)
    const traces = inserted('workflow_step_traces')
    expect(traces.map((q) => [q.values[1], q.values[3], q.values[6]])).toEqual([
      [0, 'clean', 120],
      [1, 'summarize', 120],
    ])
    const update = db.queries.find((q) => q.text.startsWith('UPDATE workflow_runs SET status'))!
    expect(update.values).toContain('completed')
    expect(update.values).toContain(20) // input tokens
  })

  it('reports a failing step in the stream and marks the run failed', async () => {
    streamStep.mockRejectedValueOnce(new Error('upstream 500'))
    const events = await readSse(await POST(req(demo, { accept: 'text/event-stream' })))
    const end = events.find((e) => e.event === 'step-end')!.data as { result: { status: string; error: string } }
    expect(end.result).toMatchObject({ status: 'error', error: 'upstream 500' })
    expect((events.at(-1)!.data as { results: { status: string } }).results.status).toBe('failed')
    expect(streamStep).toHaveBeenCalledTimes(1)
  })

  it('still answers with plain JSON when the client does not ask for a stream', async () => {
    const res = await POST(req(demo))
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(await res.json()).toMatchObject({ success: true, demo: true, results: { status: 'completed' } })
  })

  it('lets signed-in users run their own steps, tied to their user id', async () => {
    session.user = { id: 'user-1', email: 'a@b.co' }
    const res = await POST(req({ input: 'hello world', steps: [{ id: 'x', type: 'sentiment' }] }))
    expect(await res.json()).toMatchObject({ success: true, demo: false })
    const [run] = inserted('workflow_runs')
    expect(run.values.slice(2, 5)).toEqual(['user-1', false, null])
  })
})

describe('GET /api/workflows', () => {
  it('requires a session', async () => {
    expect((await GET(new Request('http://localhost/api/workflows'))).status).toBe(401)
  })
  it("returns only the caller's runs, with limit capped at 100", async () => {
    session.user = { id: 'user-9', email: 'x@y.z' }
    const res = await GET(new Request('http://localhost/api/workflows?limit=500'))
    expect(res.status).toBe(200)
    const list = db.queries.find((q) => q.text.startsWith('SELECT * FROM workflow_runs'))!
    expect(list.values).toEqual(['user-9', 100, 0])
  })
})
