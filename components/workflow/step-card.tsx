'use client'

import { Trash2, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { WorkflowStep } from '@/types/workflow'

interface StepCardProps {
  step: WorkflowStep
  onDelete: (stepId: string) => void
  onConfigure: (stepId: string) => void
}

const stepTypeLabels: Record<string, string> = {
  summarize: 'Summarize Text',
  extract: 'Extract Key Points',
  categorize: 'Categorize',
  sentiment: 'Sentiment Analysis',
  translate: 'Translate',
}

const stepTypeColors: Record<string, string> = {
  summarize: 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100',
  extract: 'bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100',
  categorize: 'bg-pink-100 text-pink-900 dark:bg-pink-900 dark:text-pink-100',
  sentiment: 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
  translate: 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100',
}

export function StepCard({ step, onDelete, onConfigure }: StepCardProps) {
  return (
    <Card className="px-5 py-4 md:px-6 flex items-center justify-between hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-semibold text-sm">
          {step.position + 1}
        </div>
        <div>
          <p className="font-medium">{stepTypeLabels[step.type] || step.type}</p>
          <p className="text-xs text-muted-foreground">
            {Object.keys(step.config.parameters).length > 0
              ? `${Object.keys(step.config.parameters).length} parameter(s) configured`
              : 'No parameters configured'}
          </p>
        </div>
        <div className={`ml-auto hidden md:inline px-2 py-1 rounded text-xs font-medium ${stepTypeColors[step.type]}`}>
          {step.type}
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onConfigure(step.id)}
          title="Configure step"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(step.id)}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          title="Delete step"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}
