import { describe, it, expect, vi } from 'vitest'
import { fakeSql } from './helpers'

const db = fakeSql((q) => [{ n: q.text.includes('is_demo') ? 4 : 30 }])
vi.mock('@/lib/server/db', () => ({ sql: () => db.fn }))

const { clientHash, runsLeft, DEMO_RUNS_PER_HOUR } = await import('@/lib/server/limits')
const r = (h: Record<string, string>) => new Request('http://x', { headers: h })

describe('clientHash', () => {
  it('uses the first forwarded IP and never returns the raw IP', () => {
    const a = clientHash(r({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))
    expect(a).toBe(clientHash(r({ 'x-forwarded-for': '203.0.113.7' })))
    expect(a).not.toContain('203.0.113.7')
    expect(a).toMatch(/^[0-9a-f]{32}$/)
  })
  it('differs per IP', () => {
    expect(clientHash(r({ 'x-forwarded-for': '1.1.1.1' }))).not.toBe(clientHash(r({ 'x-forwarded-for': '2.2.2.2' })))
  })
})

describe('runsLeft', () => {
  it('counts demo runs by client hash and user runs by user id', async () => {
    expect(await runsLeft({ client: 'abc' })).toBe(DEMO_RUNS_PER_HOUR - 4)
    expect(await runsLeft({ userId: 'u1' })).toBe(0)
    expect(db.queries[0].values).toEqual(['abc'])
    expect(db.queries[1].values).toEqual(['u1'])
  })
})
