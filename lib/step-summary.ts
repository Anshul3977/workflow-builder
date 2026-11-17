import type { WorkflowStep } from '@/types/workflow'

export const STEP_LABELS: Record<string, string> = {
  clean: 'Clean Text',
  summarize: 'Summarize Text',
  extract: 'Extract Key Points',
  categorize: 'Categorize',
  sentiment: 'Sentiment Analysis',
  translate: 'Translate',
}

/** Where a step after the first reads from. Null for the first step, which always sees the original input. */
export function readsFrom(source: unknown, index: number): string | null {
  if (index <= 0) return null
  if (source === 'input') return 'reads original input'
  if (typeof source === 'number' && Number.isInteger(source) && source >= 0 && source < index) {
    return `reads step ${source + 1}`
  }
  return 'reads previous step'
}

/** One line under a pipeline step: the setting a person would look for, plus where the text comes from. */
export function stepSummary(step: Pick<WorkflowStep, 'type' | 'config'>, index: number): string {
  const p = step.config?.parameters ?? {}
  const parts: string[] = []
  if (step.type === 'summarize') {
    const length = typeof p.length === 'string' && p.length.trim() ? p.length.trim() : 'medium'
    parts.push(`${length} summary`)
  } else if (step.type === 'extract') {
    const topics = typeof p.topics === 'string' ? p.topics.trim() : ''
    parts.push(topics || 'key points')
  } else if (step.type === 'categorize') {
    const categories = typeof p.categories === 'string' ? p.categories.trim() : ''
    parts.push(categories ? `categories: ${categories}` : 'categories')
  } else if (step.type === 'translate') {
    const lang = typeof p.targetLanguage === 'string' && p.targetLanguage.trim() ? p.targetLanguage.trim() : 'Hindi'
    parts.push(`to ${lang}`)
  } else if (step.type === 'clean') {
    parts.push('tidy formatting')
  } else if (step.type === 'sentiment') {
    parts.push('label and confidence')
  } else {
    parts.push(step.type)
  }
  const src = readsFrom(p.source, index)
  if (src) parts.unshift(src)
  return parts.join(' · ')
}
