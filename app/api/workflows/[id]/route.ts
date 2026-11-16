import { sql } from '@/lib/server/db'
import { getUser, json } from '@/lib/server/session'

const UUID = /^[0-9a-f-]{36}$/i

// A run is visible to its owner; demo runs (no owner) are visible by link.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) return json({ success: false, error: 'Run not found' }, 404)
  const user = await getUser()
  const [run] = await sql()`SELECT * FROM workflow_runs WHERE id = ${id}
    AND (is_demo OR user_id = ${user?.id ?? '__none__'})`
  if (!run) return json({ success: false, error: 'Run not found' }, 404)
  delete run.client_hash
  return json({ success: true, data: run })
}
