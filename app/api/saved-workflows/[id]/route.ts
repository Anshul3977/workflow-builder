import { sql } from '@/lib/server/db'
import { getUser, json, unauthorized } from '@/lib/server/session'

const UUID = /^[0-9a-f-]{36}$/i
type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const user = await getUser()
  if (!user) return unauthorized()
  const { id } = await params
  if (!UUID.test(id)) return json({ success: false, error: 'Not found' }, 404)
  const [row] = await sql()`SELECT * FROM workflows WHERE id = ${id} AND user_id = ${user.id}`
  return row ? json({ success: true, data: row }) : json({ success: false, error: 'Not found' }, 404)
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getUser()
  if (!user) return unauthorized()
  const { id } = await params
  if (!UUID.test(id)) return json({ success: false, error: 'Not found' }, 404)
  const rows = await sql()`DELETE FROM workflows WHERE id = ${id} AND user_id = ${user.id} RETURNING id`
  return rows.length ? json({ success: true }) : json({ success: false, error: 'Not found' }, 404)
}
