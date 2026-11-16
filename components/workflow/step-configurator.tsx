'use client'

import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { WorkflowStep, StepType } from '@/types/workflow'

interface StepConfiguratorProps {
  step: WorkflowStep
  onUpdate: (parameters: Record<string, unknown>) => void
}

export function StepConfigurator({ step, onUpdate }: StepConfiguratorProps) {
  const [parameters, setParameters] = useState(step.config.parameters)

  const handleParameterChange = (key: string, value: unknown) => {
    const updated = { ...parameters, [key]: value }
    setParameters(updated)
    onUpdate(updated)
  }

  const renderConfigFields = (type: StepType) => {
    switch (type) {
      case 'summarize':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="length">Summary Length</Label>
              <Select
                value={(parameters.length as string) || 'medium'}
                onValueChange={(value) => handleParameterChange('length', value)}
              >
                <SelectTrigger id="length">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short (1-2 sentences)</SelectItem>
                  <SelectItem value="medium">Medium (up to 3 sentences)</SelectItem>
                  <SelectItem value="long">Long (5+ sentences)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )
      case 'extract':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="max-points">Maximum Points to Extract</Label>
              <Select
                value={String(parameters.maxPoints || 5)}
                onValueChange={(value) => handleParameterChange('maxPoints', parseInt(value))}
              >
                <SelectTrigger id="max-points">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 points</SelectItem>
                  <SelectItem value="5">5 points</SelectItem>
                  <SelectItem value="10">10 points</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )
      case 'categorize':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="categories">Categories (comma-separated)</Label>
              <Input
                id="categories"
                value={(parameters.categories as string) || ''}
                onChange={(e) => handleParameterChange('categories', e.target.value)}
                placeholder="e.g., Work, Personal, Urgent"
              />
            </div>
          </div>
        )
      case 'translate':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="target-lang">Target Language</Label>
              <Select
                value={(parameters.targetLanguage as string) || 'Hindi'}
                onValueChange={(value) => handleParameterChange('targetLanguage', value)}
              >
                <SelectTrigger id="target-lang">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hindi">Hindi</SelectItem>
                  <SelectItem value="Spanish">Spanish</SelectItem>
                  <SelectItem value="French">French</SelectItem>
                  <SelectItem value="German">German</SelectItem>
                  <SelectItem value="Chinese">Chinese</SelectItem>
                  <SelectItem value="Japanese">Japanese</SelectItem>
                  <SelectItem value="Arabic">Arabic</SelectItem>
                  <SelectItem value="Portuguese">Portuguese</SelectItem>
                  <SelectItem value="Marathi">Marathi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )
      case 'sentiment':
      default:
        return (
          <div className="text-sm text-muted-foreground">
            No parameters to configure for {type} step.
          </div>
        )
    }
  }

  const index = step.position ?? 0
  const source = parameters.source === undefined ? 'previous' : String(parameters.source)

  return (
    <div className="space-y-4">
      {renderConfigFields(step.type)}
      <fieldset className="space-y-4 border-t pt-4">
        <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Advanced</legend>
        {index > 0 && (
          <div className="space-y-2">
            <Label htmlFor="source">Reads from</Label>
            <Select
              value={source}
              onValueChange={(v) => handleParameterChange('source', v === 'previous' ? undefined : v === 'input' ? 'input' : Number(v))}
            >
              <SelectTrigger id="source">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="previous">Previous step (chain)</SelectItem>
                <SelectItem value="input">Original input</SelectItem>
                {Array.from({ length: Math.max(0, index - 1) }, (_, i) => (
                  <SelectItem key={i} value={String(i)}>
                    Step {i + 1} output
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="retries">Retries</Label>
            <Select value={String(parameters.retries ?? 2)} onValueChange={(v) => handleParameterChange('retries', Number(v))}>
              <SelectTrigger id="retries">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n === 0 ? 'No retries' : `${n} (backoff)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeout">Timeout per attempt</Label>
            <Select value={String(parameters.timeoutMs ?? 20000)} onValueChange={(v) => handleParameterChange('timeoutMs', Number(v))}>
              <SelectTrigger id="timeout">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5000, 10000, 20000, 30000].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n / 1000} s
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Retries cover rate limits, server errors, timeouts and dropped connections, with exponential backoff that honors Retry-After.</p>
      </fieldset>
    </div>
  )
}
