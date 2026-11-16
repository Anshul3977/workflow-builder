// Deterministic checks for workflow outputs. Pure functions, unit-tested in tests/rubric.test.ts.
// Each check returns { id, pass, detail } so failures are explainable in the results table.

export interface Check {
  id: string
  pass: boolean
  detail: string
}

export interface StepView {
  type: string
  params: Record<string, unknown>
  input: string
  output: string
}

const SENTIMENTS = ['positive', 'negative', 'neutral', 'mixed'] as const
export type Sentiment = (typeof SENTIMENTS)[number]

const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean)
const BULLET = /^([-*•]|\d+[.)])\s+/
const normalize = (s: string) => s.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ')

/** Sentences, ignoring decimals like "4.5" and common abbreviations. */
export function sentenceCount(s: string): number {
  const text = s.replace(/\b(e\.g|i\.e|etc|vs|Mr|Ms|Dr|Rs)\./gi, '$1').replace(/(\d)\.(\d)/g, '$1$2')
  return text.split(/[.!?।]+(?:\s|$)/).map((x) => x.trim()).filter((x) => /\w|[\u0900-\u097F]/.test(x)).length
}

/** The overall label a sentiment step reports: the first label word on the line mentioning "sentiment", else the first label anywhere. */
export function sentimentLabel(s: string): Sentiment | null {
  const low = s.toLowerCase()
  const line = lines(low).find((l) => l.includes('sentiment')) ?? ''
  const pick = (t: string) => {
    const hits = SENTIMENTS.map((w) => [w, t.search(new RegExp(`\\b${w}\\b`))] as const).filter(([, i]) => i >= 0)
    return hits.length ? hits.sort((a, b) => a[1] - b[1])[0][0] : null
  }
  return pick(line.replace(/^.*?sentiment/, '')) ?? pick(low)
}

/** Share of letters that are Devanagari (Hindi script). */
export function devanagariShare(s: string): number {
  // Count combining marks too: Devanagari vowel signs and viramas are marks, not letters.
  const letters = s.match(/[\p{L}\p{M}]/gu) ?? []
  if (!letters.length) return 0
  return letters.filter((c) => /[\u0900-\u097F]/.test(c)).length / letters.length
}

const MAX_SENTENCES: Record<string, number> = { short: 3, medium: 4, long: 7 }

/** Format checks every step of a given type must pass, whatever the input. */
export function stepChecks(step: StepView, index: number): Check[] {
  const out = step.output.trim()
  const tag = `${index + 1}.${step.type}`
  const checks: Check[] = [{ id: `${tag}.non_empty`, pass: out.length > 0, detail: `${out.length} chars` }]
  if (!out) return checks
  switch (step.type) {
    case 'clean': {
      const ratio = out.length / Math.max(1, step.input.trim().length)
      checks.push({ id: `${tag}.no_double_spaces`, pass: !/ {2,}/.test(out), detail: / {2,}/.test(out) ? 'has runs of spaces' : 'ok' })
      checks.push({ id: `${tag}.length_preserved`, pass: ratio >= 0.6 && ratio <= 1.4, detail: `length ratio ${ratio.toFixed(2)}` })
      break
    }
    case 'summarize': {
      const max = MAX_SENTENCES[String(step.params.length ?? 'medium')] ?? 4
      const n = sentenceCount(out)
      checks.push({ id: `${tag}.sentence_limit`, pass: n <= max + 1, detail: `${n} sentences (asked ≤${max})` })
      checks.push({ id: `${tag}.shorter_than_input`, pass: out.length < step.input.length, detail: `${out.length}/${step.input.length} chars` })
      break
    }
    case 'extract': {
      const ls = lines(out)
      const bullets = ls.filter((l) => BULLET.test(l)).length
      checks.push({ id: `${tag}.bullets`, pass: bullets >= 2 && bullets / ls.length >= 0.8, detail: `${bullets}/${ls.length} lines are bullets` })
      break
    }
    case 'categorize': {
      const asked = String(step.params.categories ?? 'topic, sentiment, urgency').split(/,(?![^(]*\))/).length
      const kv = lines(out).filter((l) => /^([-*•]\s*)?\**[^:]{2,60}\**:\s*\S/.test(l)).length
      checks.push({ id: `${tag}.one_line_per_category`, pass: kv >= asked, detail: `${kv} "Category: value" lines for ${asked} categories` })
      break
    }
    case 'sentiment': {
      const label = sentimentLabel(out)
      checks.push({ id: `${tag}.has_label`, pass: label !== null, detail: label ?? 'no label' })
      checks.push({ id: `${tag}.has_confidence`, pass: /\b(high|medium|low)\b/i.test(out), detail: 'confidence word' })
      break
    }
    case 'translate': {
      if (String(step.params.targetLanguage ?? 'Hindi').toLowerCase() === 'hindi') {
        const share = devanagariShare(out)
        checks.push({ id: `${tag}.devanagari`, pass: share >= 0.7, detail: `${Math.round(share * 100)}% Devanagari letters` })
      }
      break
    }
  }
  return checks
}

export interface Expect {
  /** Strings (any of the alternatives in an inner array) that must appear in the named step's output. */
  mustInclude?: { step: number; any: string[] }[]
  sentiment?: Sentiment | Sentiment[]
}

/** Case-specific facts the workflow must keep. */
export function expectChecks(steps: StepView[], exp: Expect): Check[] {
  const checks: Check[] = []
  for (const m of exp.mustInclude ?? []) {
    const out = normalize(steps[m.step]?.output ?? '')
    const hit = m.any.find((a) => out.includes(normalize(a)))
    checks.push({ id: `fact:${m.any[0]}`, pass: !!hit, detail: hit ? `found "${hit}"` : `missing in step ${m.step + 1}` })
  }
  if (exp.sentiment) {
    const want = ([] as Sentiment[]).concat(exp.sentiment)
    const step = steps.find((s) => s.type === 'sentiment')
    const got = step ? sentimentLabel(step.output) : null
    checks.push({ id: 'sentiment_label', pass: !!got && want.includes(got), detail: `got ${got ?? 'none'}, want ${want.join('|')}` })
  }
  return checks
}
