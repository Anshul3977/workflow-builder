export type StepType = 'summarize' | 'extract' | 'categorize' | 'sentiment' | 'translate'

export interface StepConfig {
  type: StepType
  parameters: Record<string, unknown>
}

export interface WorkflowStep {
  id: string
  type: StepType
  position: number
  config: StepConfig
}

export interface Workflow {
  id: string
  name: string
  steps: WorkflowStep[]
  input: string
  createdAt: string
  updatedAt: string
}
