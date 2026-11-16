import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { openapi } from '@/lib/openapi'

const API_DIR = join(process.cwd(), 'app/api')

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? routeFiles(p) : name === 'route.ts' ? [p] : []
  })
}

/** app/api/workflows/[id]/route.ts → /api/workflows/{id}; [...path] → {path} */
const toOpenApiPath = (file: string) =>
  '/api/' + relative(API_DIR, file).replace(/\/?route\.ts$/, '').replace(/\[(?:\.\.\.)?([^\]]+)\]/g, '{$1}')

function exportedMethods(file: string): string[] {
  const src = readFileSync(file, 'utf8')
  const fns = [...src.matchAll(/export (?:async )?function (GET|POST|PUT|PATCH|DELETE)\b/g)].map((m) => m[1])
  const destructured = src.match(/export const \{([^}]+)\}/)?.[1].split(',').map((s) => s.trim()) ?? []
  return [...fns, ...destructured.filter((m) => /^(GET|POST|PUT|PATCH|DELETE)$/.test(m))].map((m) => m.toLowerCase())
}

describe('OpenAPI spec', () => {
  const paths = openapi.paths as Record<string, Record<string, unknown>>
  const routes = routeFiles(API_DIR).map((f) => ({ path: toOpenApiPath(f), methods: exportedMethods(f) }))

  it('documents every route handler and method', () => {
    expect(routes.length).toBeGreaterThan(5)
    const missing = routes.flatMap((r) => r.methods.filter((m) => !paths[r.path]?.[m]).map((m) => `${m.toUpperCase()} ${r.path}`))
    expect(missing).toEqual([])
  })

  it('has no documented operation without a handler', () => {
    const byPath = new Map(routes.map((r) => [r.path, r.methods]))
    const stale = Object.entries(paths).flatMap(([p, ops]) => Object.keys(ops).filter((m) => !byPath.get(p)?.includes(m)).map((m) => `${m.toUpperCase()} ${p}`))
    expect(stale).toEqual([])
  })

  it('only references schemas that exist', () => {
    const refs = [...JSON.stringify(openapi).matchAll(/"#\/components\/schemas\/(\w+)"/g)].map((m) => m[1])
    const missing = refs.filter((r) => !(r in openapi.components.schemas))
    expect(new Set(missing)).toEqual(new Set())
  })

  it('serves the spec as JSON', async () => {
    const { GET } = await import('@/app/api/openapi.json/route')
    const res = GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.openapi).toBe('3.1.0')
    expect(body.components.schemas.Step.properties.config.properties.retries.maximum).toBe(3)
  })
})
