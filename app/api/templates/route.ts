import { sql } from '@/lib/server/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await sql()`SELECT slug, name, description, category, steps, sample_input FROM workflow_templates WHERE is_public ORDER BY sort_order, name`
    return Response.json({ success: true, data: rows })
  } catch (err) {
    return Response.json({ success: false, error: err instanceof Error ? err.message : 'Failed to load templates' }, { status: 500 })
  }
}
