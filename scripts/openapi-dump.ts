// Writes the OpenAPI document to a file so it can be linted (pnpm openapi:lint) or fed to client generators.
import { writeFileSync } from 'node:fs'
import { openapi } from '../lib/openapi'

const out = process.argv[2] ?? 'openapi.json'
writeFileSync(out, JSON.stringify(openapi, null, 2) + '\n')
console.log(`wrote ${out}`)
