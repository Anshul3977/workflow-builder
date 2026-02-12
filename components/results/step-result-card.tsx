'use client'

import { useState } from 'react'
import { ChevronDown, Copy, Check } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { StepResult } from '@/types/results'

interface StepResultCardProps {
  result: StepResult
  index?: number
}

const stepTypeLabels: Record<string, string> = {
  clean: 'Clean Text',
  summarize: 'Summarize Text',
  extract: 'Extract Key Points',
  categorize: 'Categorize',
  sentiment: 'Sentiment Analysis',
  translate: 'Translate',
}

export function StepResultCard({ result, index = 0 }: StepResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const isSuccess = result.status === 'success'
  const totalTokens = result.tokensUsed
    ? result.tokensUsed.input + result.tokensUsed.output
    : 0

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full"
      >
        <div className="px-5 py-4 md:px-6 flex items-center justify-between hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-4 flex-1 text-left">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-semibold text-sm">
              {index + 1}
            </div>
            <div className="flex-1">
              <p className="font-medium">
                {stepTypeLabels[result.stepType] || result.stepType}
              </p>
              <p className="text-sm text-muted-foreground">
                {result.processingTime}ms • {totalTokens} tokens
              </p>
            </div>
            <Badge variant={isSuccess ? 'default' : 'destructive'}>
              {isSuccess ? 'Success' : 'Failed'}
            </Badge>
          </div>
          <ChevronDown
            className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''
              }`}
          />
        </div>
      </button>

      {isExpanded && (
        <div className="border-t bg-muted/30 px-5 py-5 md:px-6 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">Input</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(result.input, 'input')}
              >
                {copiedField === 'input' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="bg-background p-4 rounded border text-sm text-foreground max-h-32 overflow-y-auto leading-relaxed">
              {result.input}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">Output</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(result.output, 'output')}
              >
                {copiedField === 'output' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="bg-background p-4 rounded border text-sm text-foreground max-h-32 overflow-y-auto leading-relaxed">
              {result.output || 'No output'}
            </div>
          </div>

          {result.error && (
            <div>
              <h4 className="text-sm font-medium text-destructive mb-2">Error</h4>
              <div className="bg-destructive/10 p-4 rounded border border-destructive/30 text-sm text-destructive leading-relaxed">
                {result.error}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
