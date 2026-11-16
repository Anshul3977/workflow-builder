import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fakeSql } from '../helpers'

const session = { user: null as null | { id: string; email: string } }
vi.mock('@/lib/auth/server', () => ({ auth: { getSession: async () => ({ data: session.user ? { user: session.user } : null }) } }))

const RUN = '22222222-2222-2222-2222-222222222222'
const db = fakeSql((q) => {
  if (q.text.includes('FROM workflow_runs')) return q.values[0] === RUN ? [{ id: RUN, is_demo: true, client_hash: 'secret', status: 'completed' }] : []
  if (q.text.includes('FROM workflow_step_traces')) return [{ step_index: 0, latency_ms: 300, ttft_ms: 90, model: 'm' }]
  return []
})
vi.mock('@/lib/server/db', () => ({ sql: () => db.fn }))

const { GET } = await import('@/app/api/workflows/[id]/route')
const call = (id: string) => GET(new Request(`http://localhost/api/workflows/${id}`), { params: Promise.resolve({ id }) })

beforeEach(() => { db.queries.length = 0 })

describe('GET /api/workflows/[id]', () => {
  it('404s on a malformed id without touching the database', async () => {
    expect((await call('../etc')).status).toBe(404)
    expect(db.queries).toHaveLength(0)
  })
  it('404s on an unknown run', async () => {
    expect((await call('33333333-3333-3333-3333-333333333333')).status).toBe(404)
  })
  it('returns the run with its traces and hides the client hash', async () => {
    const body = await (await call(RUN)).json()
    expect(body.data.client_hash).toBeUndefined()
    expect(body.data.traces).toEqual([{ step_index: 0, latency_ms: 300, ttft_ms: 90, model: 'm' }])
  })
})
