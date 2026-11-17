import { describe, expect, it } from 'vitest'
import { readsFrom, stepSummary } from '@/lib/step-summary'
import type { WorkflowStep } from '@/types/workflow'

function step(type: WorkflowStep['type'], parameters: Record<string, unknown> = {}): WorkflowStep {
  return { id: 's', type, position: 0, config: { type, parameters } }
}

describe('step summaries', () => {
  it('describes the setting a recruiter would look for', () => {
    expect(stepSummary(step('summarize', { length: 'short' }), 0)).toBe('short summary')
    expect(stepSummary(step('translate', { targetLanguage: 'Hindi' }), 1)).toBe('reads previous step · to Hindi')
    expect(stepSummary(step('clean'), 0)).toBe('tidy formatting')
    expect(stepSummary(step('sentiment'), 0)).toBe('label and confidence')
  })

  it('shows fan-out: a later step can read the original input or an earlier step', () => {
    expect(readsFrom('input', 1)).toBe('reads original input')
    expect(readsFrom(0, 2)).toBe('reads step 1')
    expect(readsFrom(undefined, 1)).toBe('reads previous step')
    expect(readsFrom('input', 0)).toBeNull()
    expect(stepSummary(step('extract', { source: 'input', topics: 'action items with owner and deadline' }), 1)).toBe(
      'reads original input · action items with owner and deadline',
    )
    expect(stepSummary(step('categorize', { source: 0, categories: 'topic, urgency' }), 2)).toBe(
      'reads step 1 · categories: topic, urgency',
    )
  })
})
