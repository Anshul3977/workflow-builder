// LLM-as-judge: a larger model grades each run against a fixed rubric and returns JSON scores.
import Groq from 'groq-sdk'
import { z } from 'zod'
import { instructionFor, type StepType } from '../lib/server/llm'

export const JUDGE_MODEL = process.env.JUDGE_MODEL || 'openai/gpt-oss-120b'

export const JudgeSchema = z.object({
  faithfulness: z.number().int().min(1).max(5),
  completeness: z.number().int().min(1).max(5),
  instruction_following: z.number().int().min(1).max(5),
  unsupported_claims: z.array(z.string()).default([]),
  reason: z.string().default(''),
})
export type Judgement = z.infer<typeof JudgeSchema>

const RUBRIC = `You grade the output of a multi-step text workflow. Score each dimension from 1 (bad) to 5 (excellent):
- faithfulness: every fact in the final output is supported by the original input. Invented names, numbers, dates or claims lower this sharply.
- completeness: the final output keeps the information the workflow's purpose needs (e.g. all owners and deadlines, all hard facts, the real mood).
- instruction_following: each step did what its instruction asked (format, length, language, categories). Judge against the instruction text shown, not a format you would prefer.
List any unsupported claims verbatim (empty list if none). Be strict; 5 means you would ship it unchanged.
Reply with only a JSON object: {"faithfulness":n,"completeness":n,"instruction_following":n,"unsupported_claims":[...],"reason":"one sentence"}`

export async function judge(
  client: Groq,
  args: { purpose: string; input: string; steps: { type: string; params: Record<string, unknown>; input: string; output: string }[] },
): Promise<{ judgement: Judgement; inputTokens: number; outputTokens: number }> {
  const stepText = args.steps
    .map((s, i) => `Step ${i + 1} (${s.type}). Instruction given:\n${instructionFor(s.type as StepType, s.params)}\nInput it read: ${s.input === args.input ? 'the original input' : 'see earlier step output'}\nOutput:\n${s.output}`)
    .join('\n\n')
  const res = await client.chat.completions.create({
    model: JUDGE_MODEL,
    temperature: 0,
    reasoning_effort: 'medium',
    max_completion_tokens: 3000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: RUBRIC },
      { role: 'user', content: `Workflow purpose: ${args.purpose}\n\nOriginal input:\n${args.input}\n\n${stepText}` },
    ],
  } as Parameters<typeof client.chat.completions.create>[0] & { stream?: false })
  const text = (res as Groq.Chat.ChatCompletion).choices[0]?.message?.content ?? '{}'
  const judgement = JudgeSchema.parse(JSON.parse(text))
  const usage = (res as Groq.Chat.ChatCompletion).usage
  return { judgement, inputTokens: usage?.prompt_tokens ?? 0, outputTokens: usage?.completion_tokens ?? 0 }
}
