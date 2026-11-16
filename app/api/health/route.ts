import { sql } from '@/lib/server/db'
import { hasAiKey, MODEL } from '@/lib/server/llm'

export const dynamic = 'force-dynamic'

export async function GET() {
  const now = new Date().toISOString()
  let database = { name: 'Neon Postgres', status: 'healthy' as 'healthy' | 'unhealthy', message: 'Connected', lastChecked: now, responseTime: 0 }
  const t0 = Date.now()
  try {
    await sql()`SELECT 1`
    database.responseTime = Date.now() - t0
    database.message = `Connected · ${database.responseTime} ms (Singapore)`
  } catch (err) {
    database = { ...database, status: 'unhealthy', message: err instanceof Error ? err.message : 'Connection failed' }
  }
  let stats = { runsTotal: 0, runs24h: 0, medianRunMs: 0 }
  if (database.status === 'healthy') {
    try {
      const [r] = await sql()`SELECT count(*)::int AS total,
        count(*) FILTER (WHERE created_at > now() - interval '24 hours')::int AS day,
        coalesce(percentile_cont(0.5) WITHIN GROUP (ORDER BY total_processing_time) FILTER (WHERE status = 'completed'), 0)::int AS p50
        FROM workflow_runs`
      stats = { runsTotal: r.total, runs24h: r.day, medianRunMs: r.p50 }
    } catch {}
  }
  const ai = hasAiKey()
  const llm = {
    name: 'Groq LLM',
    status: ai ? ('healthy' as const) : ('unhealthy' as const),
    message: ai ? `Key configured · ${MODEL.split('/').pop()}` : 'AI key needed: GROQ_API_KEY is not set on this deployment',
    lastChecked: now,
    responseTime: 0,
  }
  const backend = { name: 'API (Vercel Functions)', status: 'healthy' as const, message: 'Running', lastChecked: now, responseTime: 0 }
  return Response.json({
    status: database.status === 'healthy' && ai ? 'healthy' : 'unhealthy',
    timestamp: now,
    health: { backend, database, llm, uptime: 0, requestsProcessed: stats.runsTotal, averageResponseTime: stats.medianRunMs, runs24h: stats.runs24h },
  })
}
