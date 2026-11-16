import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

let _sql: NeonQueryFunction<false, false> | null = null

/** Tagged-template SQL over HTTP. Values are sent as parameters, never interpolated. */
export function sql() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')
    _sql = neon(process.env.DATABASE_URL)
  }
  return _sql
}
