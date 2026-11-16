// Groq on-demand list prices, USD per 1M tokens (input, output).
// Source checked 2026-11-12: https://console.groq.com/docs/models
// Unknown models return null rather than a guessed price.
export const GROQ_USD_PER_MILLION: Record<string, [number, number]> = {
  'openai/gpt-oss-20b': [0.075, 0.3],
  'openai/gpt-oss-120b': [0.15, 0.6],
}

export function costUsd(model: string, inputTokens: number, outputTokens: number): number | null {
  const price = GROQ_USD_PER_MILLION[model]
  if (!price) return null
  return (inputTokens / 1e6) * price[0] + (outputTokens / 1e6) * price[1]
}
