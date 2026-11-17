import type { Metadata } from 'next'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { openapi } from '@/lib/openapi'

export const metadata: Metadata = { title: 'API reference · Workflow Builder' }

type Op = {
  summary: string
  description?: string
  tags: readonly string[]
  security?: readonly unknown[]
  parameters?: readonly { name: string; in: string; required?: boolean; description?: string }[]
  requestBody?: unknown
  responses: Record<string, { description: string }>
}

const METHOD_STYLE: Record<string, string> = {
  get: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  post: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  delete: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  put: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  patch: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
}

function Text({ children }: { children: string }) {
  // Minimal inline-code rendering for `backticks` in spec descriptions.
  return (
    <>
      {children.split(/(`[^`]+`)/).map((part, i) =>
        part.startsWith('`') ? (
          <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
            {part.slice(1, -1)}
          </code>
        ) : (
          part
        ),
      )}
    </>
  )
}

export default function ApiDocsPage() {
  const ops = Object.entries(openapi.paths).flatMap(([path, methods]) =>
    Object.entries(methods as Record<string, Op>).map(([method, op]) => ({ path, method, op })),
  )
  const grouped = openapi.tags.map((t) => ({ ...t, ops: ops.filter((o) => o.op.tags[0] === t.name && !(o.path.startsWith('/api/auth') && o.method !== 'get')) }))

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">OpenAPI {openapi.openapi}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{openapi.info.title}</h1>
        <p className="text-muted-foreground leading-relaxed">{openapi.info.description}</p>
        <p className="text-sm">
          Machine-readable spec:{' '}
          <Link href="/api/openapi.json" className="font-mono underline underline-offset-4">
            /api/openapi.json
          </Link>{' '}
          (import into Postman, Insomnia or an OpenAPI client generator).
        </p>
        <pre className="overflow-x-auto rounded border bg-muted/40 p-3 text-xs leading-relaxed">
{`curl -N https://workflow-builder-umber.vercel.app/api/workflows \\
  -H 'Content-Type: application/json' -H 'Accept: text/event-stream' \\
  -d '{"templateSlug":"meeting-notes-to-actions","input":"..."}'`}
        </pre>
      </header>

      {grouped.map((g) => (
        <section key={g.name} className="space-y-3" aria-labelledby={`tag-${g.name}`}>
          <div>
            <h2 id={`tag-${g.name}`} className="text-xl font-semibold">{g.name}</h2>
            <p className="text-sm text-muted-foreground">{g.description}</p>
          </div>
          {g.ops.map(({ path, method, op }) => (
            <Card key={`${method} ${path}`} className="space-y-3 p-5" data-testid="api-op">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded px-2 py-0.5 font-mono text-xs font-semibold uppercase ${METHOD_STYLE[method]}`}>
                  {path.startsWith('/api/auth') ? 'ANY' : method}
                </span>
                <code className="font-mono text-sm">{path}</code>
                {op.security && <span className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground">session</span>}
              </div>
              <p className="font-medium">{op.summary}</p>
              {op.description && (
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  <Text>{op.description}</Text>
                </p>
              )}
              {op.parameters && op.parameters.length > 0 && (
                <ul className="text-sm">
                  {op.parameters.map((p) => (
                    <li key={p.name} className="font-mono text-xs">
                      {p.name} <span className="text-muted-foreground">({p.in}{p.required ? ', required' : ''})</span>
                      {p.description && <span className="font-sans text-muted-foreground"> · {p.description}</span>}
                    </li>
                  ))}
                </ul>
              )}
              <dl className="grid grid-cols-[3.5rem_1fr] gap-x-3 gap-y-1 text-xs">
                {Object.entries(op.responses).map(([code, r]) => (
                  <div key={code} className="contents">
                    <dt className={`font-mono ${code.startsWith('2') ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>{code}</dt>
                    <dd className="text-muted-foreground">
                      <Text>{r.description}</Text>
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          ))}
        </section>
      ))}
    </div>
  )
}
