'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { StepType } from '@/types/workflow'

interface StepTypeSelectorProps {
  onSelectType: (type: StepType) => void
}

const stepTypes: Array<{
  type: StepType
  label: string
  description: string
}> = [
  {
    type: 'summarize',
    label: 'Summarize',
    description: 'Condense text into shorter form',
  },
  {
    type: 'extract',
    label: 'Extract',
    description: 'Pull out key points and information',
  },
  {
    type: 'categorize',
    label: 'Categorize',
    description: 'Classify text into categories',
  },
  {
    type: 'sentiment',
    label: 'Sentiment',
    description: 'Analyze emotional tone',
  },
  {
    type: 'translate',
    label: 'Translate',
    description: 'Convert to another language',
  },
]

export function StepTypeSelector({ onSelectType }: StepTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">Add a new step:</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {stepTypes.map((step) => (
          <Button
            key={step.type}
            variant="outline"
            className="h-auto p-4 flex flex-col items-start gap-2 justify-start hover:bg-accent"
            onClick={() => onSelectType(step.type)}
          >
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="font-medium">{step.label}</span>
            </div>
            <span className="text-xs text-muted-foreground">{step.description}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}
