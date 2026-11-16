import { describe, it, expect, vi } from 'vitest'
import { fakeSql } from '../helpers'

const db = fakeSql((q) => {
  if (q.text.includes('FROM workflow_runs')) return [{ total: 12, day: 3, p50: 2400 }]
  if (q.text.includes('FROM workflow_step_traces')) return [{ n: 7, p50: 800, ttft: 210, tokens: 4200 }]
  return [{ '?column?': 1 }]
})
vi.mock('@/lib/server/db', () => ({ sql: () => db.fn }))
const { GET } = await import('@/app/api/health/route')

describe('GET /api/health', () => {
  it('reports run stats, trace stats and whether the AI key is set', async () => {
    delete process.env.GROQ_API_KEY
    const body = await (await GET()).json()
    expect(body.status).toBe('unhealthy')
    expect(body.health.llm.status).toBe('unhealthy')
    expect(body.health.database.status).toBe('healthy')
    expect(body.health).toMatchObject({ requestsProcessed: 12, runs24h: 3, averageResponseTime: 2400 })
    expect(body.health.traces).toEqual({ steps24h: 7, p50StepMs: 800, p50TtftMs: 210, tokens24h: 4200 })

    process.env.GROQ_API_KEY = 'k'
    expect((await (await GET()).json()).status).toBe('healthy')
  })
})
