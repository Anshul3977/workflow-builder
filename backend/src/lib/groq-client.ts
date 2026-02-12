import Groq from 'groq-sdk'

// Lazy initialization — the Groq constructor reads GROQ_API_KEY from env,
// which isn't available at module-load time since dotenv runs in server.ts.
let _groq: Groq | null = null

function getGroq(): Groq {
  if (!_groq) {
    _groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })
  }
  return _groq
}

export type StepType = 'clean' | 'summarize' | 'extract' | 'categorize' | 'translate' | 'sentiment'

export interface ProcessStepInput {
  type: StepType
  text: string
  config?: Record<string, unknown>
}

export interface ProcessStepOutput {
  result: string
  processingTime: number
  tokensUsed?: {
    input: number
    output: number
  }
}

const PROMPTS: Record<StepType, (text: string, config?: Record<string, unknown>) => string> = {
  clean: (text: string) =>
    `Clean and normalize the following text. Remove extra whitespace, fix formatting, and ensure proper punctuation:

Text: ${text}

Provide only the cleaned text without any explanations.`,

  summarize: (text: string, config?: Record<string, unknown>) => {
    const length = (config?.length as string) || 'medium'
    const lengthHint =
      length === 'short'
        ? 'in 2-3 sentences'
        : length === 'long'
          ? 'in 5-7 sentences'
          : 'in 3-4 sentences'

    return `Summarize the following text ${lengthHint}:

Text: ${text}

Provide only the summary without any explanations.`
  },

  extract: (text: string, config?: Record<string, unknown>) => {
    const topics = (config?.topics as string) || 'key points'

    return `Extract the ${topics} from the following text. List them as bullet points:

Text: ${text}

Provide only the extracted items as a bullet-point list.`
  },

  categorize: (text: string, config?: Record<string, unknown>) => {
    const categories = (config?.categories as string) || 'topic, sentiment, urgency'

    return `Categorize the following text by: ${categories}

Text: ${text}

Provide the categorization in a clear format like:
- Category: value`
  },

  translate: (text: string, config?: Record<string, unknown>) => {
    const targetLanguage = (config?.targetLanguage as string) || 'English'

    return `Translate the following text into ${targetLanguage}. Preserve the original meaning and tone as closely as possible:

Text: ${text}

Provide only the translated text without any explanations.`
  },

  sentiment: (text: string) =>
    `Analyze the sentiment of the following text. Provide a detailed sentiment analysis including:
- Overall sentiment (positive, negative, neutral, or mixed)
- Confidence level (high, medium, low)
- Key emotional tones detected
- Brief explanation of the sentiment assessment

Text: ${text}

Provide the sentiment analysis in a structured format.`,
}

export async function processStep(input: ProcessStepInput): Promise<ProcessStepOutput> {
  const startTime = Date.now()

  const prompt = PROMPTS[input.type](input.text, input.config)

  const chatCompletion = await getGroq().chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const processingTime = Date.now() - startTime
  const result = chatCompletion.choices[0]?.message?.content || ''

  return {
    result,
    processingTime,
    tokensUsed: chatCompletion.usage
      ? {
        input: chatCompletion.usage.prompt_tokens ?? 0,
        output: chatCompletion.usage.completion_tokens ?? 0,
      }
      : undefined,
  }
}
