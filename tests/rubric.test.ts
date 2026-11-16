import { describe, it, expect } from 'vitest'
import { sentenceCount, sentimentLabel, devanagariShare, stepChecks, expectChecks, type StepView } from '@/eval/rubric'
import { cases } from '@/eval/cases'
import { templates } from '@/scripts/templates.mjs'

const view = (type: string, output: string, params: Record<string, unknown> = {}, input = 'x'.repeat(400)): StepView => ({ type, params, input, output })
const failed = (v: StepView) => stepChecks(v, 0).filter((c) => !c.pass).map((c) => c.id)

describe('rubric helpers', () => {
  it('counts sentences without splitting decimals or abbreviations', () => {
    expect(sentenceCount('It weighs 1.3 kg. Battery lasts 8 hours! Good value, e.g. for students.')).toBe(3)
    expect(sentenceCount('यह अच्छा है। बैटरी चलती है।')).toBe(2)
  })
  it('reads the overall sentiment label', () => {
    expect(sentimentLabel('Overall sentiment: Negative\nConfidence: high\nTones: frustration, not positive')).toBe('negative')
    expect(sentimentLabel('**Sentiment:** mixed (mostly positive)')).toBe('mixed')
    expect(sentimentLabel('no label here')).toBeNull()
  })
  it('measures Devanagari share of letters', () => {
    expect(devanagariShare('यह ईयरबड्स अच्छे हैं')).toBe(1)
    expect(devanagariShare('USB-C चार्जिंग')).toBeGreaterThan(0.5)
    expect(devanagariShare('hello')).toBe(0)
  })
})

describe('stepChecks', () => {
  it('passes well-formed outputs', () => {
    expect(failed(view('extract', '- Meera: retry fix\n- Ana: Figma link by Thursday'))).toEqual([])
    expect(failed(view('categorize', '- Topic: shipping\n- Urgency: high\n- Team: logistics', { categories: 'topic, urgency (low/medium/high), team to route to' }))).toEqual([])
    expect(failed(view('summarize', 'Two sentences here. And another one.', { length: 'short' }))).toEqual([])
    expect(failed(view('translate', 'यह ईयरबड्स छह सप्ताह से इस्तेमाल हो रहे हैं।', { targetLanguage: 'Hindi' }))).toEqual([])
    expect(failed(view('sentiment', 'Sentiment: negative\nConfidence: high'))).toEqual([])
  })
  it('flags format failures', () => {
    expect(failed(view('extract', 'Meera owns the retry fix and Ana sends the link.'))).toContain('1.extract.bullets')
    expect(failed(view('categorize', '- Topic: shipping', { categories: 'topic, urgency, team' }))).toContain('1.categorize.one_line_per_category')
    expect(failed(view('summarize', 'One. Two. Three. Four. Five. Six.', { length: 'short' }))).toContain('1.summarize.sentence_limit')
    expect(failed(view('translate', 'These earbuds are good.', { targetLanguage: 'Hindi' }))).toContain('1.translate.devanagari')
    expect(failed(view('clean', 'too  many   spaces', {}, 'too  many   spaces'))).toContain('1.clean.no_double_spaces')
    expect(failed(view('sentiment', ''))).toEqual(['1.sentiment.non_empty'])
  })
})

describe('expectChecks', () => {
  it('matches any alternative, case-insensitively', () => {
    const steps = [view('extract', '- 45000 riders\n- opened Wednesday')]
    const r = expectChecks(steps, { mustInclude: [{ step: 0, any: ['45,000', '45000'] }, { step: 0, any: ['2028'] }] })
    expect(r.map((c) => c.pass)).toEqual([true, false])
  })
})

describe('eval cases', () => {
  it('reference real templates and valid step indexes', () => {
    const bySlug = new Map((templates as { slug: string; steps: unknown[] }[]).map((t) => [t.slug, t]))
    for (const c of cases) {
      const t = bySlug.get(c.template)
      expect(t, c.id).toBeDefined()
      for (const m of c.expect.mustInclude ?? []) expect(m.step, c.id).toBeLessThan(t!.steps.length)
    }
    expect(new Set(cases.map((c) => c.id)).size).toBe(cases.length)
  })
})
