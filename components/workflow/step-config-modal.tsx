'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StepConfigurator } from './step-configurator'
import type { WorkflowStep } from '@/types/workflow'

interface StepConfigModalProps {
  isOpen: boolean
  step: WorkflowStep | null
  onClose: () => void
  onUpdate: (stepId: string, parameters: Record<string, unknown>) => void
}

const stepTypeLabels: Record<string, string> = {
  summarize: 'Summarize Text',
  extract: 'Extract Key Points',
  categorize: 'Categorize',
  sentiment: 'Sentiment Analysis',
  translate: 'Translate',
}

export function StepConfigModal({
  isOpen,
  step,
  onClose,
  onUpdate,
}: StepConfigModalProps) {
  if (!step) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configure Step</DialogTitle>
          <DialogDescription>
            {stepTypeLabels[step.type] || step.type} (Step {step.position + 1})
          </DialogDescription>
        </DialogHeader>
        <StepConfigurator
          step={step}
          onUpdate={(parameters) => {
            onUpdate(step.id, parameters)
            onClose()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
