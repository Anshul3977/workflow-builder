import Groq from 'groq-sdk'

export type StepType = 'clean' | 'summarize' | 'extract' | 'categorize' | 'translate' | 'sentiment'
export const STEP_TYPES: StepType[] = ['clean', 'summarize', 'extract', 'categorize', 'translate', 'sentiment']
export const MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

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

export interface StepOutput {
  result: string
  processingTime: number
  tokensUsed?: { input: number; output: number }
}

export async function runStep(type: StepType, text: string, params: Params): Promise<StepOutput> {
  const start = Date.now()
  const client = groq()
  const res = await client.chat.completions.create(
    { model: MODEL, messages: [{ role: 'user', content: PROMPTS[type](text, params) }], max_tokens: 900 },
    { timeout: 30_000 },
  )
  return {
    result: res.choices[0]?.message?.content ?? '',
    processingTime: Date.now() - start,
    tokensUsed: res.usage ? { input: res.usage.prompt_tokens ?? 0, output: res.usage.completion_tokens ?? 0 } : undefined,
  }
}
