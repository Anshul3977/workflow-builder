// Eval harness: runs every case through the real runner (streaming, retries, tracing math) against Groq,
// scores it with deterministic rubric checks plus an LLM judge, and writes eval/results.{json,md}.
//
//   GROQ_API_KEY=... pnpm eval            # full run, writes results
//   pnpm eval -- --only triage            # subset, no write
//   pnpm eval -- --check                  # also fail if below eval/floor.json
import { readFileSync, writeFileSync } from 'node:fs'
import Groq from 'groq-sdk'
import { execute, type Step } from '../lib/server/runner'
import { MODEL } from '../lib/server/llm'
import { costUsd } from '../lib/server/pricing'
import { templates } from '../scripts/templates.mjs'
import { cases } from './cases'
import { stepChecks, expectChecks, type Check, type StepView } from './rubric'
import { judge, JUDGE_MODEL, type Judgement } from './judge'

const args = process.argv.slice(2)
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null
const write = !only && !args.includes('--no-write')
const check = args.includes('--check')
const DIR = new URL('.', import.meta.url)

type Template = { slug: string; name: string; description: string; steps: Step[]; sample_input: string }
const bySlug = new Map((templates as Template[]).map((t) => [t.slug, t]))

const pct = (xs: number[], p: number) => {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]
}
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface CaseResult {
  id: string
  template: string
  status: string
  latencyMs: number
  inputTokens: number
  outputTokens: number
  costUsd: number | null
  retries: number
  checks: Check[]
  judge: Judgement | null
  judgeError?: string
  outputs: string[]
}

async function main() {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not set')
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY, maxRetries: 8 })
  const selected = cases.filter((c) => !only || c.id.includes(only) || c.template.includes(only))
  const results: CaseResult[] = []
  let judgeIn = 0
  let judgeOut = 0

  for (const c of selected) {
    const t = bySlug.get(c.template)
    if (!t) throw new Error(`unknown template ${c.template}`)
    const input = c.input === 'sample' ? t.sample_input : c.input
    const exec = await execute(`eval-${c.id}`, t.steps, input)
    const views: StepView[] = exec.steps.map((s, i) => ({
      type: s.stepType,
      params: ((t.steps[i].config?.parameters as Record<string, unknown>) ?? {}),
      input: s.input,
      output: s.output,
    }))
    const checks = [...views.flatMap((v, i) => stepChecks(v, i)), ...expectChecks(views, c.expect)]
    if (exec.status !== 'completed') checks.push({ id: 'run_completed', pass: false, detail: exec.steps.find((s) => s.error)?.error ?? 'failed' })

    let j: Judgement | null = null
    let judgeError: string | undefined
    try {
      const r = await judge(client, { purpose: `${t.name}: ${t.description}`, input, steps: views })
      j = r.judgement
      judgeIn += r.inputTokens
      judgeOut += r.outputTokens
    } catch (e) {
      judgeError = e instanceof Error ? e.message.slice(0, 200) : 'judge failed'
    }

    const res: CaseResult = {
      id: c.id,
      template: c.template,
      status: exec.status,
      latencyMs: exec.totalProcessingTime,
      inputTokens: exec.totals.inputTokens,
      outputTokens: exec.totals.outputTokens,
      costUsd: exec.totals.costUsd,
      retries: exec.totals.retries,
      checks,
      judge: j,
      judgeError,
      outputs: views.map((v) => v.output),
    }
    results.push(res)
    const passed = checks.filter((x) => x.pass).length
    console.log(
      `${c.id.padEnd(18)} ${exec.status.padEnd(9)} checks ${passed}/${checks.length}  judge ${j ? `${j.faithfulness}/${j.completeness}/${j.instruction_following}` : 'ERR'}  ${exec.totalProcessingTime} ms  retries ${exec.totals.retries}`,
    )
    for (const x of checks.filter((x) => !x.pass)) console.log(`    ✗ ${x.id}: ${x.detail}`)
    await sleep(4000) // stay inside free-tier token-per-minute limits (8k TPM per model)
  }

  const allChecks = results.flatMap((r) => r.checks)
  const judged = results.filter((r) => r.judge).map((r) => r.judge!)
  const summary = {
    model: MODEL,
    judgeModel: JUDGE_MODEL,
    date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
    cases: results.length,
    runsCompleted: results.filter((r) => r.status === 'completed').length,
    checkPassRate: allChecks.filter((x) => x.pass).length / Math.max(1, allChecks.length),
    checksPassed: allChecks.filter((x) => x.pass).length,
    checksTotal: allChecks.length,
    casesAllChecksPass: results.filter((r) => r.checks.every((x) => x.pass)).length,
    judge: {
      judged: judged.length,
      faithfulness: mean(judged.map((x) => x.faithfulness)),
      completeness: mean(judged.map((x) => x.completeness)),
      instruction_following: mean(judged.map((x) => x.instruction_following)),
      casesWithUnsupportedClaims: judged.filter((x) => x.unsupported_claims.length > 0).length,
    },
    latencyMs: { p50: pct(results.map((r) => r.latencyMs), 50), p95: pct(results.map((r) => r.latencyMs), 95) },
    costUsd: {
      meanPerRun: mean(results.map((r) => r.costUsd ?? 0)),
      totalWorkflow: results.reduce((n, r) => n + (r.costUsd ?? 0), 0),
      judge: costUsd(JUDGE_MODEL, judgeIn, judgeOut),
    },
    retries: results.reduce((n, r) => n + r.retries, 0),
  }

  const byTemplate = [...new Set(results.map((r) => r.template))].map((slug) => {
    const rs = results.filter((r) => r.template === slug)
    const cs = rs.flatMap((r) => r.checks)
    const js = rs.filter((r) => r.judge).map((r) => r.judge!)
    return { slug, cases: rs.length, checks: `${cs.filter((x) => x.pass).length}/${cs.length}`, faith: mean(js.map((x) => x.faithfulness)), comp: mean(js.map((x) => x.completeness)), instr: mean(js.map((x) => x.instruction_following)), p50: pct(rs.map((r) => r.latencyMs), 50) }
  })

  console.log('\n' + JSON.stringify(summary, null, 2))

  if (write) {
    writeFileSync(new URL('results.json', DIR), JSON.stringify({ summary, byTemplate, results }, null, 2) + '\n')
    const f = (n: number) => n.toFixed(2)
    const failures = results.flatMap((r) => r.checks.filter((x) => !x.pass).map((x) => `| ${r.id} | ${x.id} | ${x.detail} |`))
    const md = [
      `# Eval results`,
      ``,
      `Generated by \`pnpm eval\` on ${summary.date}. Workflow model \`${summary.model}\`, judge \`${summary.judgeModel}\`. ${summary.cases} cases (5 templates × 3 inputs: each template's sample plus 2 held-out inputs).`,
      ``,
      `| Metric | Value |`,
      `| --- | --- |`,
      `| Runs completed | ${summary.runsCompleted}/${summary.cases} |`,
      `| Rubric checks passed | ${summary.checksPassed}/${summary.checksTotal} (${(summary.checkPassRate * 100).toFixed(1)}%) |`,
      `| Cases passing every check | ${summary.casesAllChecksPass}/${summary.cases} |`,
      `| Judge: faithfulness (1–5) | ${f(summary.judge.faithfulness)} |`,
      `| Judge: completeness (1–5) | ${f(summary.judge.completeness)} |`,
      `| Judge: instruction following (1–5) | ${f(summary.judge.instruction_following)} |`,
      `| Cases with an unsupported claim (judge) | ${summary.judge.casesWithUnsupportedClaims}/${summary.judge.judged} |`,
      `| End-to-end run latency p50 / p95 | ${summary.latencyMs.p50} / ${summary.latencyMs.p95} ms |`,
      `| Mean cost per run (list price) | $${summary.costUsd.meanPerRun.toFixed(6)} |`,
      `| Retries triggered | ${summary.retries} |`,
      ``,
      `## By template`,
      ``,
      `| Template | Checks | Faithfulness | Completeness | Instructions | p50 ms |`,
      `| --- | --- | --- | --- | --- | --- |`,
      ...byTemplate.map((b) => `| ${b.slug} | ${b.checks} | ${f(b.faith)} | ${f(b.comp)} | ${f(b.instr)} | ${b.p50} |`),
      ``,
      `## Failed checks`,
      ``,
      ...(failures.length ? [`| Case | Check | Detail |`, `| --- | --- | --- |`, ...failures] : ['None.']),
      ``,
    ].join('\n')
    writeFileSync(new URL('results.md', DIR), md)
    console.log('wrote eval/results.json and eval/results.md')
  }

  if (check) {
    const floor = JSON.parse(readFileSync(new URL('floor.json', DIR), 'utf8'))
    const fails = [
      summary.checkPassRate < floor.checkPassRate && `checkPassRate ${summary.checkPassRate.toFixed(3)} < ${floor.checkPassRate}`,
      summary.judge.faithfulness < floor.faithfulness && `faithfulness ${summary.judge.faithfulness.toFixed(2)} < ${floor.faithfulness}`,
      summary.runsCompleted < summary.cases && `${summary.cases - summary.runsCompleted} runs failed`,
    ].filter(Boolean)
    if (fails.length) {
      console.error('EVAL GATE FAILED:\n' + fails.join('\n'))
      process.exit(1)
    }
    console.log('eval gate passed')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
