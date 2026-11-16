// OpenAPI 3.1 description of the public API, served at /api/openapi.json and rendered at /docs/api.
// tests/openapi.test.ts fails if a route handler exists without a matching path + method here.
import { STEP_TYPES } from '@/lib/server/llm'
import { DEFAULT_POLICY, LIMITS } from '@/lib/server/retry'
import { DEMO_RUNS_PER_HOUR, USER_RUNS_PER_HOUR } from '@/lib/server/limits'

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` })
const jsonBody = (schema: object) => ({ content: { 'application/json': { schema } } })
const ok = (description: string, schema: object) => ({ description, ...jsonBody(schema) })
const err = (description: string) => ({ description, ...jsonBody(ref('Error')) })
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
const authed = [{ session: [] }]

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'Workflow Builder API',
    version: '3.0.0',
    description:
      'Chain LLM text steps (clean, summarize, extract, categorize, sentiment, translate) into a workflow and run it. ' +
      'Runs stream over Server-Sent Events, each step is traced (latency, time to first token, tokens, cost, attempts) in Postgres, ' +
      `and failed attempts retry with exponential backoff. Guests can run public templates (${DEMO_RUNS_PER_HOUR} runs/hour per client); ` +
      `signed-in users can run their own steps (${USER_RUNS_PER_HOUR} runs/hour).`,
  },
  servers: [{ url: 'https://workflow-builder-umber.vercel.app' }],
  tags: [
    { name: 'Runs', description: 'Execute workflows and read run results' },
    { name: 'Workflows', description: 'Saved workflows (signed-in users)' },
    { name: 'Meta', description: 'Templates, health and this spec' },
    { name: 'Auth', description: 'Neon Auth session endpoints (proxied)' },
  ],
  paths: {
    '/api/workflows': {
      post: {
        tags: ['Runs'],
        summary: 'Run a workflow',
        description:
          'Runs steps in order, feeding each output into the next. Send `Accept: text/event-stream` (or `?stream=1`) for an SSE stream; ' +
          'otherwise the response is JSON when the run ends.\n\n' +
          'SSE events: `run` {runId, demo, steps} → per step `step-start`, `delta` {index, text}*, optional `retry` {index, attempt, delayMs, reason}, ' +
          '`step-end` {index, result} → `done` {runId, demo, results} or `error` {message, code}. ' +
          'On `retry`, discard the partial output streamed for that step.',
        parameters: [{ name: 'stream', in: 'query', schema: { type: 'string', enum: ['1'] }, description: 'Same as Accept: text/event-stream' }],
        requestBody: { required: true, ...jsonBody(ref('RunRequest')) },
        responses: {
          200: {
            description: 'Run finished (JSON) or SSE stream started',
            content: {
              'application/json': { schema: ref('RunResponse') },
              'text/event-stream': { schema: { type: 'string', description: 'SSE frames: `event: <name>\\ndata: <json>\\n\\n`' } },
            },
          },
          400: err('Invalid request, no steps, or demo input over 2,000 characters'),
          401: err('LOGIN_REQUIRED: guests must pick a template'),
          404: err('Template not found'),
          429: err('RATE_LIMITED'),
          500: err('Run failed'),
          503: err('AI_KEY_MISSING: the deployment has no Groq key'),
        },
      },
      get: {
        tags: ['Runs'],
        summary: "List the signed-in user's runs",
        security: authed,
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0, default: 0 } },
        ],
        responses: {
          200: ok('Runs, newest first', { type: 'object', properties: { success: { const: true }, data: { type: 'array', items: ref('RunRow') }, total: { type: 'integer' } } }),
          401: err('Not signed in'),
        },
      },
    },
    '/api/workflows/{id}': {
      get: {
        tags: ['Runs'],
        summary: 'Get a run with its step traces',
        description: 'Demo runs are readable by anyone with the link (shareable); user runs only by their owner.',
        parameters: [idParam],
        responses: {
          200: ok('The run', { type: 'object', properties: { success: { const: true }, data: { allOf: [ref('RunRow'), { type: 'object', properties: { traces: { type: 'array', items: ref('TraceRow') } } }] } } }),
          404: err('Run not found'),
        },
      },
    },
    '/api/workflows/clear': {
      delete: {
        tags: ['Runs'],
        summary: "Delete all of the signed-in user's runs",
        security: authed,
        responses: { 200: ok('Deleted', { type: 'object', properties: { success: { const: true }, deletedCount: { type: 'integer' } } }), 401: err('Not signed in') },
      },
    },
    '/api/saved-workflows': {
      post: {
        tags: ['Workflows'],
        summary: 'Save a workflow',
        security: authed,
        requestBody: {
          required: true,
          ...jsonBody({
            type: 'object',
            required: ['name', 'steps'],
            properties: { name: { type: 'string', minLength: 1, maxLength: 120 }, description: { type: 'string', maxLength: 500 }, steps: { type: 'array', minItems: 1, maxItems: 8, items: ref('Step') } },
          }),
        },
        responses: { 201: ok('Saved', { type: 'object', properties: { success: { const: true }, data: ref('SavedWorkflow') } }), 400: err('Invalid workflow'), 401: err('Not signed in') },
      },
      get: {
        tags: ['Workflows'],
        summary: 'List saved workflows',
        security: authed,
        responses: { 200: ok('Up to 100, most recently updated first', { type: 'object', properties: { success: { const: true }, data: { type: 'array', items: ref('SavedWorkflow') } } }), 401: err('Not signed in') },
      },
    },
    '/api/saved-workflows/{id}': {
      get: {
        tags: ['Workflows'],
        summary: 'Get a saved workflow',
        security: authed,
        parameters: [idParam],
        responses: { 200: ok('The workflow', { type: 'object', properties: { success: { const: true }, data: ref('SavedWorkflow') } }), 401: err('Not signed in'), 404: err('Not found') },
      },
      delete: {
        tags: ['Workflows'],
        summary: 'Delete a saved workflow',
        security: authed,
        parameters: [idParam],
        responses: { 200: ok('Deleted', { type: 'object', properties: { success: { const: true } } }), 401: err('Not signed in'), 404: err('Not found') },
      },
    },
    '/api/templates': {
      get: {
        tags: ['Meta'],
        summary: 'List public templates',
        responses: {
          200: ok('Templates in display order', {
            type: 'object',
            properties: {
              success: { const: true },
              data: {
                type: 'array',
                items: { type: 'object', properties: { slug: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' }, category: { type: 'string' }, steps: { type: 'array', items: ref('Step') }, sample_input: { type: 'string' } } },
              },
            },
          }),
          500: err('Database error'),
        },
      },
    },
    '/api/health': {
      get: {
        tags: ['Meta'],
        summary: 'Health and 24 h trace stats',
        responses: {
          200: ok('Database, LLM key and trace percentiles', {
            type: 'object',
            properties: {
              status: { enum: ['healthy', 'unhealthy'] },
              timestamp: { type: 'string', format: 'date-time' },
              health: {
                type: 'object',
                properties: {
                  runs24h: { type: 'integer' },
                  traces: { type: 'object', properties: { steps24h: { type: 'integer' }, p50StepMs: { type: 'integer' }, p50TtftMs: { type: 'integer' }, tokens24h: { type: 'integer' } } },
                },
                additionalProperties: true,
              },
            },
          }),
        },
      },
    },
    '/api/openapi.json': {
      get: { tags: ['Meta'], summary: 'This document', responses: { 200: ok('OpenAPI 3.1 JSON', { type: 'object' }) } },
    },
    '/api/auth/{path}': Object.fromEntries(
      ['get', 'post', 'put', 'patch', 'delete'].map((m) => [
        m,
        {
          tags: ['Auth'],
          summary: `Neon Auth handler (${m.toUpperCase()})`,
          description: 'Sign-up, sign-in, session and sign-out, handled by @neon/auth. Sets the session cookie used by `session` security.',
          parameters: [{ name: 'path', in: 'path', required: true, schema: { type: 'string' }, description: 'One or more path segments, e.g. `sign-in/email`' }],
          responses: { 200: { description: 'Handled by Neon Auth' } },
        },
      ]),
    ),
  },
  components: {
    securitySchemes: { session: { type: 'apiKey', in: 'cookie', name: '__Secure-neon-auth.session_token', description: 'Neon Auth session cookie (neon-auth.session_token, with the __Secure- prefix over HTTPS)' } },
    schemas: {
      Error: { type: 'object', required: ['success', 'error'], properties: { success: { const: false }, error: { type: 'string' }, code: { type: 'string', enum: ['LOGIN_REQUIRED', 'RATE_LIMITED', 'AI_KEY_MISSING'] }, details: { type: 'array', items: { type: 'object' } } } },
      Step: {
        type: 'object',
        required: ['id', 'type'],
        properties: {
          id: { type: 'string', maxLength: 100 },
          type: { type: 'string', enum: [...STEP_TYPES] },
          position: { type: 'number' },
          config: {
            type: 'object',
            description: 'Step settings. `parameters` holds prompt options (e.g. `targetLanguage` for translate).',
            properties: {
              parameters: { type: 'object', additionalProperties: true },
              retries: { type: 'integer', minimum: LIMITS.retries[0], maximum: LIMITS.retries[1], default: DEFAULT_POLICY.retries, description: 'Extra attempts on 429, 5xx, timeouts and connection errors' },
              source: {
                oneOf: [{ const: 'previous' }, { const: 'input' }, { type: 'integer', minimum: 0 }],
                default: 'previous',
                description: "Text this step reads: the previous step's output (default), the run's original `input`, or an earlier step's output by 0-based index (fan-out)",
              },
              timeoutMs: { type: 'integer', minimum: LIMITS.timeoutMs[0], maximum: LIMITS.timeoutMs[1], default: DEFAULT_POLICY.timeoutMs, description: 'Per-attempt timeout' },
            },
            additionalProperties: true,
          },
        },
      },
      RunRequest: {
        type: 'object',
        required: ['input'],
        properties: {
          input: { type: 'string', minLength: 1, maxLength: 8000 },
          steps: { type: 'array', maxItems: 8, items: ref('Step'), description: 'Signed-in users only; guests use templateSlug' },
          templateSlug: { type: 'string', maxLength: 100 },
          workflowId: { type: 'string', format: 'uuid' },
        },
      },
      StepTrace: {
        type: 'object',
        properties: {
          model: { type: 'string' },
          latencyMs: { type: 'integer' },
          ttftMs: { type: ['integer', 'null'] },
          inputTokens: { type: 'integer' },
          outputTokens: { type: 'integer' },
          reasoningTokens: { type: 'integer' },
          providerMs: { type: ['number', 'null'] },
          startedAt: { type: 'string', format: 'date-time' },
          attempts: { type: 'integer', minimum: 1 },
          costUsd: { type: ['number', 'null'], description: 'Estimate at Groq list price' },
        },
      },
      StepResult: {
        type: 'object',
        properties: {
          stepId: { type: 'string' },
          stepType: { type: 'string' },
          input: { type: 'string' },
          output: { type: 'string' },
          processingTime: { type: 'integer' },
          status: { enum: ['success', 'error'] },
          error: { type: 'string' },
          attempts: { type: 'integer' },
          trace: ref('StepTrace'),
        },
      },
      Execution: {
        type: 'object',
        properties: {
          workflowRunId: { type: 'string', format: 'uuid' },
          initialInput: { type: 'string' },
          steps: { type: 'array', items: ref('StepResult') },
          totalProcessingTime: { type: 'integer' },
          status: { enum: ['completed', 'failed'] },
          totals: { type: 'object', properties: { inputTokens: { type: 'integer' }, outputTokens: { type: 'integer' }, model: { type: ['string', 'null'] }, costUsd: { type: ['number', 'null'] }, retries: { type: 'integer' } } },
        },
      },
      RunResponse: { type: 'object', properties: { success: { type: 'boolean' }, runId: { type: 'string', format: 'uuid' }, demo: { type: 'boolean' }, results: ref('Execution') } },
      RunRow: { type: 'object', description: 'Row of workflow_runs (results holds the Execution JSON)', additionalProperties: true, properties: { id: { type: 'string', format: 'uuid' }, status: { type: 'string' }, is_demo: { type: 'boolean' }, input_text: { type: 'string' }, results: ref('Execution'), model: { type: ['string', 'null'] }, input_tokens: { type: 'integer' }, output_tokens: { type: 'integer' }, cost_usd: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' } } },
      TraceRow: { type: 'object', additionalProperties: true, properties: { step_index: { type: 'integer' }, step_type: { type: 'string' }, status: { type: 'string' }, model: { type: 'string' }, latency_ms: { type: 'integer' }, ttft_ms: { type: ['integer', 'null'] }, input_tokens: { type: 'integer' }, output_tokens: { type: 'integer' }, attempts: { type: 'integer' }, cost_usd: { type: ['number', 'null'] } } },
      SavedWorkflow: { type: 'object', additionalProperties: true, properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' }, description: { type: ['string', 'null'] }, steps: { type: 'array', items: ref('Step') }, updated_at: { type: 'string', format: 'date-time' } } },
    },
  },
} as const

type Operation = { operationId?: string; security?: readonly unknown[] }

/** Fills in what is derivable: operationId from method + path, and explicit `security: []` on public operations. */
function finalize<T extends { paths: Record<string, Record<string, Operation>> }>(doc: T): T {
  for (const [path, ops] of Object.entries(doc.paths)) {
    const name = path
      .replace(/^\/api\//, '')
      .split(/[/.-]/)
      .map((seg) => seg.replace(/[{}]/g, ''))
      .map((seg, i, all) => (all[i - 1] !== undefined && path.includes(`{${seg}}`) ? `By${seg[0].toUpperCase()}${seg.slice(1)}` : seg[0].toUpperCase() + seg.slice(1)))
      .join('')
    for (const [method, op] of Object.entries(ops)) {
      op.operationId ??= `${method}${name}`
      op.security ??= []
    }
  }
  return doc
}

export const openapi = finalize(structuredClone(spec) as unknown as typeof spec & { paths: Record<string, Record<string, Operation>> }) as typeof spec
