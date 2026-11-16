'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { WorkflowTemplate } from '@/lib/api'
import { ArrowRight } from 'lucide-react'

interface TemplateGalleryProps {
  templates: WorkflowTemplate[]
  isLoading?: boolean
  activeSlug?: string | null
  onSelect: (template: WorkflowTemplate) => void
  actionLabel?: string
}

export function TemplateGallery({ templates, isLoading, activeSlug, onSelect, actionLabel = 'Use template' }: TemplateGalleryProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    )
  }
  if (templates.length === 0) return <p className="text-sm text-muted-foreground">No templates yet.</p>

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((t) => {
        const active = t.slug === activeSlug
        return (
          <Card key={t.slug} className={`flex flex-col gap-3 p-5 transition-colors ${active ? 'border-primary ring-1 ring-primary' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold leading-tight">{t.name}</h3>
              {t.category && <span className="shrink-0 text-xs text-muted-foreground">{t.category}</span>}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">{t.description}</p>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {t.steps.map((s, i) => (
                <span key={s.id} className="inline-flex items-center gap-1.5">
                  <Badge variant="secondary" className="capitalize font-normal">{s.type}</Badge>
                  {i < t.steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                </span>
              ))}
            </div>
            <Button size="sm" variant={active ? 'default' : 'outline'} onClick={() => onSelect(t)} className="mt-1">
              {active ? 'Selected' : actionLabel}
            </Button>
          </Card>
        )
      })}
    </div>
  )
}
