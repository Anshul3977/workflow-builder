import { z } from 'zod'
import { sql } from '@/lib/server/db'
import { getUser, json, unauthorized } from '@/lib/server/session'
import { StepSchema } from '@/lib/server/runner'

const SaveSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(500).optional(),
  steps: z.array(StepSchema.passthrough()).min(1).max(8),
})

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return unauthorized()
  const parsed = SaveSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return json({ success: false, error: 'Invalid workflow', details: parsed.error.issues }, 400)
  const { name, description, steps } = parsed.data
  const [row] = await sql()`INSERT INTO workflows (user_id, name, description, steps)
    VALUES (${user.id}, ${name}, ${description ?? null}, ${JSON.stringify(steps)}::jsonb) RETURNING *`
  return json({ success: true, data: row }, 201)
}

export async function GET() {
  const user = await getUser()
  if (!user) return unauthorized()
  const rows = await sql()`SELECT * FROM workflows WHERE user_id = ${user.id} ORDER BY updated_at DESC LIMIT 100`
  return json({ success: true, data: rows })
}
