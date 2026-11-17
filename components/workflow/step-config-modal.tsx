'use client'

import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { STEP_LABELS } from '@/lib/step-summary'
import { StepConfigurator } from './step-configurator'
import type { WorkflowStep } from '@/types/workflow'

interface StepConfigModalProps {
  isOpen: boolean
  step: WorkflowStep | null
  onClose: () => void
  onUpdate: (stepId: string, parameters: Record<string, unknown>) => void
}

type OutsideEvent = { target: EventTarget | null; preventDefault: () => void }

/** Radix portals the select menu outside the dialog, which otherwise looks like a click away and dismisses it. */
function keepSelectOpen(event: OutsideEvent) {
  const target = event.target
  if (target instanceof Element && target.closest('[data-radix-select-content]')) event.preventDefault()
}

export function StepConfigModal({
  isOpen,
  step,
  onClose,
  onUpdate,
}: StepConfigModalProps) {
  if (!step) return null
  const outside: Pick<ComponentProps<typeof DialogContent>, 'onInteractOutside' | 'onPointerDownOutside' | 'onFocusOutside'> = {
    onInteractOutside: keepSelectOpen,
    onPointerDownOutside: keepSelectOpen,
    onFocusOutside: keepSelectOpen,
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-md" {...outside}>
        <DialogHeader>
          <DialogTitle>Configure Step</DialogTitle>
          <DialogDescription>
            {STEP_LABELS[step.type] || step.type} (Step {step.position + 1}). Changes apply as you edit.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto pr-1">
          <StepConfigurator
            key={step.id}
            step={step}
            onUpdate={(parameters) => onUpdate(step.id, parameters)}
          />
        </div>
        <DialogFooter>
          <Button type="button" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
