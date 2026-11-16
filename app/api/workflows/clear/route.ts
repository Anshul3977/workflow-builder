import { sql } from '@/lib/server/db'
import { getUser, json, unauthorized } from '@/lib/server/session'

export async function DELETE() {
  const user = await getUser()
  if (!user) return unauthorized()
  const rows = await sql()`DELETE FROM workflow_runs WHERE user_id = ${user.id} RETURNING id`
  return json({ success: true, deletedCount: rows.length })
}
