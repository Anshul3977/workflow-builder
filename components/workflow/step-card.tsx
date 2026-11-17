'use client'

import { Trash2, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { STEP_LABELS, stepSummary } from '@/lib/step-summary'
import type { WorkflowStep } from '@/types/workflow'

interface StepCardProps {
  step: WorkflowStep
  onDelete: (stepId: string) => void
  onConfigure: (stepId: string) => void
}

const stepTypeColors: Record<string, string> = {
  clean: 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
  summarize: 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100',
  extract: 'bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100',
  categorize: 'bg-pink-100 text-pink-900 dark:bg-pink-900 dark:text-pink-100',
  sentiment: 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
  translate: 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100',
}

export function StepCard({ step, onDelete, onConfigure }: StepCardProps) {
  const label = STEP_LABELS[step.type] || step.type
  return (
    <Card className="px-4 py-4 sm:px-5 md:px-6 flex items-center justify-between gap-2 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-semibold text-sm shrink-0">
          {step.position + 1}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{label}</p>
            <span className={`hidden md:inline px-2 py-0.5 rounded text-xs font-medium ${stepTypeColors[step.type]}`}>
              {step.type}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{stepSummary(step, step.position)}</p>
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onConfigure(step.id)}
          aria-label={`Configure ${label}`}
        >
          <Settings2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(step.id)}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          aria-label={`Remove ${label}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}
