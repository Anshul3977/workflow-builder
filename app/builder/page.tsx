'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Card } from '@/components/ui/card'
import { WorkflowPipeline } from '@/components/workflow/workflow-pipeline'
import { StepConfigModal } from '@/components/workflow/step-config-modal'
import { useWorkflowStore } from '@/lib/stores/workflow-store'
import { useUIStore } from '@/lib/stores/ui-store'
import { useHistoryStore } from '@/lib/stores/history-store'
import { workflowApi, savedWorkflowApi } from '@/lib/api'
import type { SavedWorkflow } from '@/lib/api'
import { useRouter } from 'next/navigation'
import type { WorkflowRun } from '@/types/results'
import type { WorkflowStep } from '@/types/workflow'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Save, FolderOpen, Trash2, X } from 'lucide-react'

export default function BuilderPage() {
  const router = useRouter()
  const [isRunning, setIsRunning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [workflowName, setWorkflowName] = useState('')
  const [savedWorkflows, setSavedWorkflows] = useState<SavedWorkflow[]>([])
  const [showSavedList, setShowSavedList] = useState(false)
  const [loadingSaved, setLoadingSaved] = useState(false)

  const workflow = useWorkflowStore((state) => state.workflow)
  const setWorkflow = useWorkflowStore((state) => state.setWorkflow)
  const addStep = useWorkflowStore((state) => state.addStep)
  const removeStep = useWorkflowStore((state) => state.removeStep)
  const updateStep = useWorkflowStore((state) => state.updateStep)
  const setInput = useWorkflowStore((state) => state.setInput)
  const markSaved = useWorkflowStore((state) => state.markSaved)

  const stepConfigModalOpen = useUIStore((state) => state.stepConfigModalOpen)
  const selectedStepId = useUIStore((state) => state.selectedStepId)
  const openStepConfigModal = useUIStore((state) => state.openStepConfigModal)
  const closeStepConfigModal = useUIStore((state) => state.closeStepConfigModal)

  const addRun = useHistoryStore((state) => state.addRun)

  const selectedStep = workflow.steps.find((s) => s.id === selectedStepId) || null

  const fetchSavedWorkflows = useCallback(async () => {
    try {
      setLoadingSaved(true)
      const workflows = await savedWorkflowApi.list()
      setSavedWorkflows(workflows)
    } catch {
      // silently fail — user may not have any saved workflows
    } finally {
      setLoadingSaved(false)
    }
  }, [])

  useEffect(() => {
    fetchSavedWorkflows()
  }, [fetchSavedWorkflows])

  const handleSaveWorkflow = async () => {
    if (!workflowName.trim()) {
      toast.error('Please enter a workflow name')
      return
    }
    if (workflow.steps.length === 0) {
      toast.error('Add at least one step before saving')
      return
    }

    setIsSaving(true)
    try {
      await savedWorkflowApi.save(workflowName.trim(), workflow.steps)
      toast.success('Workflow saved!')
      setShowSaveDialog(false)
      setWorkflowName('')
      markSaved()
      fetchSavedWorkflows()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save workflow'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleLoadWorkflow = (saved: SavedWorkflow) => {
    setWorkflow({
      ...workflow,
      name: saved.name,
      steps: saved.steps as WorkflowStep[],
    })
    setShowSavedList(false)
    toast.success(`Loaded "${saved.name}"`)
  }

  const handleDeleteWorkflow = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await savedWorkflowApi.delete(id)
      toast.success('Workflow deleted')
      fetchSavedWorkflows()
    } catch {
      toast.error('Failed to delete workflow')
    }
  }

  const handleRunWorkflow = async () => {
    if (workflow.steps.length === 0) {
      toast.error('Please add at least one step to the workflow')
      return
    }

    if (!workflow.input.trim()) {
      toast.error('Please enter input text')
      return
    }

    setIsRunning(true)
    try {
      const response = await workflowApi.run(workflow, workflow.input)
      const run: WorkflowRun = {
        id: response.runId,
        workflowId: workflow.id,
        input: response.results.initialInput,
        status: response.results.status === 'completed' ? 'completed' : 'failed',
        results: response.results,
        createdAt: new Date().toISOString(),
      }
      addRun(run)
      toast.success('Workflow executed successfully')
      router.push(`/results/${response.runId}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to run workflow'
      toast.error(message)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <AuthGuard>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Workflow Builder</h1>
            <p className="text-muted-foreground mt-2">
              Create multi-step text processing pipelines by combining different operations
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowSavedList(!showSavedList); if (!showSavedList) fetchSavedWorkflows() }}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Load
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveDialog(true)}
              disabled={workflow.steps.length === 0}
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </div>

        {/* Save Dialog */}
        {showSaveDialog && (
          <Card className="p-4 border-2 border-primary/20 bg-primary/5">
            <div className="flex items-center gap-3">
              <Input
                placeholder="Workflow name..."
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveWorkflow()}
                className="flex-1"
                autoFocus
              />
              <Button onClick={handleSaveWorkflow} disabled={isSaving} size="sm">
                {isSaving ? <Spinner className="h-4 w-4" /> : 'Save'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowSaveDialog(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Saved Workflows List */}
        {showSavedList && (
          <Card className="p-4 border-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Saved Workflows</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowSavedList(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {loadingSaved ? (
              <div className="flex justify-center py-4"><Spinner className="h-5 w-5" /></div>
            ) : savedWorkflows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No saved workflows yet. Build and save one!
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {savedWorkflows.map((saved) => (
                  <div
                    key={saved.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleLoadWorkflow(saved)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{saved.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(saved.steps as unknown[]).length} step{(saved.steps as unknown[]).length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteWorkflow(saved.id, e)}
                      className="text-destructive hover:text-destructive ml-2 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-2">
              <label htmlFor="input" className="text-sm font-medium">
                Input Text
              </label>
              <Textarea
                id="input"
                placeholder="Enter the text you want to process..."
                value={workflow.input}
                onChange={(e) => setInput(e.target.value)}
                className="min-h-[200px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {workflow.input.length} characters
              </p>
            </div>

            <Button
              onClick={handleRunWorkflow}
              disabled={isRunning || workflow.steps.length === 0 || !workflow.input.trim()}
              className="w-full"
              size="lg"
            >
              {isRunning ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Running Workflow...
                </>
              ) : (
                'Run Workflow'
              )}
            </Button>
          </div>

          <div>
            <WorkflowPipeline
              workflow={workflow}
              onAddStep={addStep}
              onRemoveStep={removeStep}
              onConfigureStep={openStepConfigModal}
            />
          </div>
        </div>

        <StepConfigModal
          isOpen={stepConfigModalOpen}
          step={selectedStep}
          onClose={closeStepConfigModal}
          onUpdate={(stepId, parameters) => {
            const step = workflow.steps.find((s) => s.id === stepId)
            if (step) {
              updateStep(stepId, {
                type: step.type,
                parameters,
              })
            }
          }}
        />
      </div>
    </AuthGuard>
  )
}
