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
                  <SelectItem value="medium">Medium (3-4 sentences)</SelectItem>
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
                value={(parameters.targetLanguage as string) || 'es'}
                onValueChange={(value) => handleParameterChange('targetLanguage', value)}
              >
                <SelectTrigger id="target-lang">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="zh">Chinese</SelectItem>
                  <SelectItem value="ja">Japanese</SelectItem>
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

  return <div className="space-y-4">{renderConfigFields(step.type)}</div>
}
