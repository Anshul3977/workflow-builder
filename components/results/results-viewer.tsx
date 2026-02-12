'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StepResultCard } from './step-result-card'
import type { WorkflowRun } from '@/types/results'
import { format } from 'date-fns'

interface ResultsViewerProps {
  run: WorkflowRun
}

export function ResultsViewer({ run }: ResultsViewerProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString || dateString.trim() === '') return null
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm:ss')
    } catch {
      return dateString
    }
  }

  const isSuccess = run.status === 'completed'
  const totalTime = run.results?.totalProcessingTime ?? 0
  const steps = run.results?.steps ?? []
  const totalTokens = steps.reduce((sum, step) => {
    return sum + (step.tokensUsed ? step.tokensUsed.input + step.tokensUsed.output : 0)
  }, 0)

  // Use input text as run name, fallback to "Untitled Workflow"
  const runName = run.input?.slice(0, 60) || 'Untitled Workflow'

  return (
    <div className="space-y-6">
      <Card className="p-6 md:p-8 border-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Workflow Run</h3>
            <p className="text-lg font-semibold">{runName}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
            <Badge variant={isSuccess ? 'default' : 'destructive'} className="text-base">
              {isSuccess ? 'Completed Successfully' : 'Failed'}
            </Badge>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Duration</h3>
            <p className="text-lg font-semibold">{(totalTime / 1000).toFixed(2)}s</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Tokens Used</h3>
            <p className="text-lg font-semibold">{totalTokens.toLocaleString()}</p>
          </div>
          <div className="md:col-span-2">
            <h3 className="text-sm font-medium text-muted-foreground">Completed At</h3>
            <p className="text-base">{formatDate(run.completedAt) || formatDate(run.createdAt) || 'Just now'}</p>
          </div>
        </div>
      </Card>

      {steps.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Processing Steps</h2>
          <div className="space-y-3">
            {steps.map((step, index) => (
              <StepResultCard key={step.stepId} result={step} index={index} />
            ))}
          </div>
        </div>
      )}

      <Card className="p-5 md:p-6 bg-muted/50">
        <h3 className="text-sm font-medium mb-3">Original Input</h3>
        <div className="bg-background p-4 rounded border text-sm text-foreground max-h-40 overflow-y-auto leading-relaxed">
          {run.input}
        </div>
      </Card>
    </div>
  )
}
