'use client'

import { ChevronDown } from 'lucide-react'
import { StepCard } from './step-card'
import { StepTypeSelector } from './step-type-selector'
import type { Workflow, StepType } from '@/types/workflow'

interface WorkflowPipelineProps {
  workflow: Workflow
  onAddStep: (type: StepType) => void
  onRemoveStep: (stepId: string) => void
  onConfigureStep: (stepId: string) => void
}

export function WorkflowPipeline({
  workflow,
  onAddStep,
  onRemoveStep,
  onConfigureStep,
}: WorkflowPipelineProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Processing Pipeline</h2>

      {workflow.steps.length > 0 ? (
        <div className="space-y-3">
          {workflow.steps.map((step, index) => (
            <div key={step.id}>
              <StepCard
                step={step}
                onDelete={onRemoveStep}
                onConfigure={onConfigureStep}
              />
              {index < workflow.steps.length - 1 && (
                <div className="flex justify-center py-2">
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground">No steps added yet. Start by adding your first processing step below.</p>
        </div>
      )}

      <div className="border-t pt-4">
        <StepTypeSelector onSelectType={onAddStep} />
      </div>
    </div>
  )
}
