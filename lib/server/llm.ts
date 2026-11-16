import Groq from 'groq-sdk'

export type StepType = 'clean' | 'summarize' | 'extract' | 'categorize' | 'translate' | 'sentiment'
export const STEP_TYPES: StepType[] = ['clean', 'summarize', 'extract', 'categorize', 'translate', 'sentiment']
// Groq retires models over time; GROQ_MODEL lets a deployment switch without a code change.
export const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b'

export class AiKeyMissingError extends Error {
  code = 'AI_KEY_MISSING'
  constructor() {
    super('The AI key (GROQ_API_KEY) is not configured on this deployment yet.')
  }
}

export const hasAiKey = () => Boolean(process.env.GROQ_API_KEY)

let _groq: Groq | null = null
function groq() {
  if (!hasAiKey()) throw new AiKeyMissingError()
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return _groq
}

type Params = Record<string, unknown>

const PROMPTS: Record<StepType, (text: string, p: Params) => string> = {
  clean: (text) =>
    `Clean and normalize the following text. Remove extra whitespace, fix formatting, and ensure proper punctuation.\n\nText: ${text}\n\nReturn only the cleaned text.`,
  summarize: (text, p) => {
    const hint = p.length === 'short' ? 'in 2-3 sentences' : p.length === 'long' ? 'in 5-7 sentences' : 'in 3-4 sentences'
    return `Summarize the following text ${hint}.\n\nText: ${text}\n\nReturn only the summary.`
  },
  extract: (text, p) => {
    const topics = (p.topics as string) || 'key points'
    const max = Number(p.maxPoints) || 0
    return `Extract the ${topics} from the following text as a bullet-point list${max ? ` (at most ${max} bullets)` : ''}.\n\nText: ${text}\n\nReturn only the list.`
  },
  categorize: (text, p) => {
    const categories = (p.categories as string) || 'topic, sentiment, urgency'
    return `Categorize the following text by: ${categories}\n\nText: ${text}\n\nAnswer as lines of the form "- Category: value".`
  },
  translate: (text, p) => {
    const lang = (p.targetLanguage as string) || 'Hindi'
    return `Translate the following text into ${lang}, keeping the meaning and tone.\n\nText: ${text}\n\nReturn only the translation.`
  },
  sentiment: (text) =>
    `Analyze the sentiment of the following text. Give: overall sentiment (positive, negative, neutral or mixed), confidence (high, medium, low), the main emotional tones, and a one-line reason.\n\nText: ${text}\n\nUse a short structured format.`,
}

export interface StepTrace {
  model: string
  /** Wall time for the whole step, ms. */
  latencyMs: number
  /** Time to the first output token, ms (streaming only). */
  ttftMs: number | null
  inputTokens: number
  outputTokens: number
  /** Reasoning tokens, counted inside outputTokens, for reasoning models. */
  reasoningTokens: number
  /** Groq's server-side generation time, ms, when reported. */
  providerMs: number | null
  startedAt: string
}

export interface StepOutput {
  result: string
  processingTime: number
  tokensUsed?: { input: number; output: number }
  trace: StepTrace
}

type Usage = {
  prompt_tokens?: number
  completion_tokens?: number
  total_time?: number
  completion_tokens_details?: { reasoning_tokens?: number }
}

function request(type: StepType, text: string, params: Params) {
  return {
    model: MODEL,
    messages: [{ role: 'user' as const, content: PROMPTS[type](text, params) }],
    // gpt-oss is a reasoning model: keep reasoning short and leave room for it in the token budget
    ...(MODEL.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' as const } : {}),
    max_completion_tokens: 2000,
  }
}

export function buildTrace(start: number, firstToken: number | null, usage: Usage | undefined, model = MODEL): StepTrace {
  const end = Date.now()
  return {
    model,
    latencyMs: end - start,
    ttftMs: firstToken === null ? null : firstToken - start,
    inputTokens: usage?.prompt_tokens ?? 0,
    outputTokens: usage?.completion_tokens ?? 0,
    reasoningTokens: usage?.completion_tokens_details?.reasoning_tokens ?? 0,
    providerMs: usage?.total_time != null ? Math.round(usage.total_time * 1000) : null,
    startedAt: new Date(start).toISOString(),
  }
}

function toOutput(result: string, trace: StepTrace): StepOutput {
  return {
    result,
    processingTime: trace.latencyMs,
    tokensUsed: { input: trace.inputTokens, output: trace.outputTokens },
    trace,
  }
}

/** Runs one step and calls onDelta with each chunk of visible output as Groq streams it. */
export async function streamStep(
  type: StepType,
  text: string,
  params: Params,
  onDelta: (chunk: string) => void = () => {},
  signal?: AbortSignal,
): Promise<StepOutput> {
  const start = Date.now()
  const client = groq()
  const stream = await client.chat.completions.create(
    { ...request(type, text, params), stream: true, stream_options: { include_usage: true } } as Parameters<typeof client.chat.completions.create>[0] & { stream: true },
    { timeout: 30_000, signal },
  )
  let out = ''
  let first: number | null = null
  let usage: Usage | undefined
  let model = MODEL
  for await (const chunk of stream) {
    const c = chunk as { model?: string; usage?: Usage; x_groq?: { usage?: Usage }; choices?: { delta?: { content?: string | null } }[] }
    if (c.model) model = c.model
    const delta = c.choices?.[0]?.delta?.content
    if (delta) {
      if (first === null) first = Date.now()
      out += delta
      onDelta(delta)
    }
    usage = c.usage ?? c.x_groq?.usage ?? usage
  }
  return toOutput(out, buildTrace(start, first, usage, model))
}

/** Non-streaming variant, kept for scripts and simple callers. */
export async function runStep(type: StepType, text: string, params: Params): Promise<StepOutput> {
  const start = Date.now()
  const res = await groq().chat.completions.create(request(type, text, params), { timeout: 30_000 })
  return toOutput(res.choices[0]?.message?.content ?? '', buildTrace(start, null, res.usage as Usage | undefined, res.model))
}
