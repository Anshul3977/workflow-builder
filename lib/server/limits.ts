import { createHash } from 'node:crypto'
import { sql } from './db'

export const DEMO_RUNS_PER_HOUR = 5
export const USER_RUNS_PER_HOUR = 30

export function clientHash(req: Request): string {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown'
  // Salted so raw IPs are never stored.
  return createHash('sha256').update(`${process.env.NEON_AUTH_COOKIE_SECRET ?? ''}:${ip}`).digest('hex').slice(0, 32)
}

/** Returns the number of runs left this hour (before this one), counted from workflow_runs. */
export async function runsLeft(opts: { userId?: string; client?: string }): Promise<number> {
  const db = sql()
  if (opts.userId) {
    const [r] = await db`SELECT count(*)::int AS n FROM workflow_runs WHERE user_id = ${opts.userId} AND created_at > now() - interval '1 hour'`
    return USER_RUNS_PER_HOUR - (r.n as number)
  }
  const [r] = await db`SELECT count(*)::int AS n FROM workflow_runs WHERE is_demo AND client_hash = ${opts.client!} AND created_at > now() - interval '1 hour'`
  return DEMO_RUNS_PER_HOUR - (r.n as number)
}
