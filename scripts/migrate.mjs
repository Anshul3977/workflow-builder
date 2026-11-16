// Usage: node --env-file=.env.local scripts/migrate.mjs
import { readFileSync } from 'node:fs'
import { Pool } from '@neondatabase/serverless'
import { templates } from './templates.mjs'

const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL })
const sql = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')
await pool.query(sql)
for (const [i, t] of templates.entries()) {
  await pool.query(
    `INSERT INTO workflow_templates (slug, name, description, category, steps, sample_input, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, category=EXCLUDED.category,
       steps=EXCLUDED.steps, sample_input=EXCLUDED.sample_input, sort_order=EXCLUDED.sort_order`,
    [t.slug, t.name, t.description, t.category, JSON.stringify(t.steps), t.sample_input, i],
  )
}
const { rows } = await pool.query(`SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema IN ('public','neon_auth') ORDER BY 1,2`)
console.log(rows.map((r) => `${r.table_schema}.${r.table_name}`).join('\n'))
console.log('templates:', (await pool.query('SELECT count(*) FROM workflow_templates')).rows[0].count)
await pool.end()
