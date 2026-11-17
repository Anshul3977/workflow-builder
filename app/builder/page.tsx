'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
import { workflowApi, savedWorkflowApi, templateApi, healthApi, ApiError } from '@/lib/api'
import type { SavedWorkflow, WorkflowTemplate } from '@/lib/api'
import { useRouter } from 'next/navigation'
import type { WorkflowRun } from '@/types/results'
import type { WorkflowStep } from '@/types/workflow'
import { useAuth } from '@/lib/auth-provider'
import { TemplateGallery } from '@/components/workflow/template-gallery'
import { Save, FolderOpen, Trash2, X, KeyRound, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { LiveRun, type LiveRunState } from '@/components/results/live-run'
import { inputLimit, inputTooLong } from '@/lib/run-limits'

export default function BuilderPage() {
  const router = useRouter()
  const [isRunning, setIsRunning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [workflowName, setWorkflowName] = useState('')
  const [savedWorkflows, setSavedWorkflows] = useState<SavedWorkflow[]>([])
  const [showSavedList, setShowSavedList] = useState(false)
  const [loadingSaved, setLoadingSaved] = useState(false)
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [templateSlug, setTemplateSlug] = useState<string | null>(null)
  const [aiReady, setAiReady] = useState<boolean | null>(null)
  const [live, setLive] = useState<LiveRunState | null>(null)
  const liveRef = useRef<HTMLDivElement>(null)
  const { user, isLoading: authLoading } = useAuth()
  const isGuest = !authLoading && !user

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
  const charLimit = inputLimit(isGuest)
  const charCount = workflow.input.trim().length
  const overLimit = inputTooLong(workflow.input, isGuest)

  const applyTemplate = useCallback(
    (t: WorkflowTemplate) => {
      setWorkflow({
        ...useWorkflowStore.getState().workflow,
        name: t.name,
        steps: t.steps.map((step, i) => ({ ...step, id: `${step.type}-${i}-${Date.now()}`, position: i })),
        input: t.sample_input,
      })
      setTemplateSlug(t.slug)
    },
    [setWorkflow],
  )

  useEffect(() => {
    templateApi
      .list()
      .then((list) => {
        setTemplates(list)
        const wanted = new URLSearchParams(window.location.search).get('template')
        const match = list.find((t) => t.slug === wanted)
        if (match) applyTemplate(match)
      })
      .catch(() => toast.error('Could not load templates'))
      .finally(() => setLoadingTemplates(false))
    healthApi
      .getStatus()
      .then((r) => setAiReady(r.health.llm.status === 'healthy'))
      .catch(() => setAiReady(null))
  }, [applyTemplate])

  // Editing steps by hand turns a template into a custom workflow.
  const editAddStep: typeof addStep = (type) => { setTemplateSlug(null); addStep(type) }
  const editRemoveStep: typeof removeStep = (id) => { setTemplateSlug(null); removeStep(id) }

  const fetchSavedWorkflows = useCallback(async () => {
    if (!user) return
    try {
      setLoadingSaved(true)
      const workflows = await savedWorkflowApi.list()
      setSavedWorkflows(workflows)
    } catch {
      // silently fail — user may not have any saved workflows
    } finally {
      setLoadingSaved(false)
    }
  }, [user])

  useEffect(() => {
    fetchSavedWorkflows()
  }, [fetchSavedWorkflows])

  const handleSaveWorkflow = async () => {
    if (!user) {
      toast.error('Log in to save workflows')
      router.push('/login')
      return
    }
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
    if (!window.confirm('Delete this saved workflow?')) return
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

    if (isGuest && !templateSlug) {
      toast.error('Pick a template to try it without an account, or log in to run your own steps.')
      return
    }

    setIsRunning(true)
    const patch = (i: number, f: (st: LiveRunState['steps'][number]) => LiveRunState['steps'][number]) =>
      setLive((l) => (l ? { ...l, steps: l.steps.map((st, j) => (j === i ? f(st) : st)) } : l))
    setLive({
      runId: null,
      startedAt: Date.now(),
      finishedAt: null,
      status: 'connecting',
      steps: workflow.steps.map((st) => ({ id: st.id, type: st.type, status: 'pending', output: '' })),
    })
    requestAnimationFrame(() => liveRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
    try {
      const response = await workflowApi.runStream(workflow, workflow.input, templateSlug, {
        onRun: (e) =>
          setLive((l) =>
            l && {
              ...l,
              runId: e.runId,
              status: 'running',
              steps: e.steps.map((st) => ({ id: st.id, type: st.type, status: 'pending', output: '' })),
            },
          ),
        onStepStart: (e) => patch(e.index, (st) => ({ ...st, status: 'running' })),
        onDelta: (e) => patch(e.index, (st) => ({ ...st, output: st.output + e.text })),
        onRetry: (e) =>
          patch(e.index, (st) => ({ ...st, output: '', retry: { attempt: e.attempt, delayMs: e.delayMs, reason: e.reason } })),
        onStepEnd: (e) =>
          patch(e.index, (st) => ({
            ...st,
            status: e.result.status,
            output: e.result.output || st.output,
            error: e.result.error,
            trace: e.result.trace,
          })),
      })
      const ok = response.results.status === 'completed'
      setLive((l) => l && { ...l, runId: response.runId, status: ok ? 'completed' : 'failed', finishedAt: Date.now() })
      const run: WorkflowRun = {
        id: response.runId,
        workflowId: workflow.id,
        input: response.results.initialInput,
        status: ok ? 'completed' : 'failed',
        results: response.results,
        createdAt: new Date().toISOString(),
      }
      addRun(run)
      if (ok) toast.success('Workflow finished')
      else toast.error('A step failed. See the run below.')
    } catch (error) {
      if (error instanceof ApiError && error.code === 'AI_KEY_MISSING') setAiReady(false)
      const message = error instanceof Error ? error.message : 'Failed to run workflow'
      setLive((l) => l && { ...l, status: 'failed', finishedAt: Date.now(), error: message })
      toast.error(message)
    } finally {
      setIsRunning(false)
    }
  }

  return (
      <div className="space-y-10">
        {aiReady === false && (
          <Card className="flex items-start gap-3 p-4 border-amber-500/40 bg-amber-500/5">
            <KeyRound className="h-5 w-5 mt-0.5 text-amber-600 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">AI key needed</p>
              <p className="text-muted-foreground">
                This deployment doesn&apos;t have its Groq API key yet, so runs are paused. You can still browse templates, build and save workflows.
              </p>
            </div>
          </Card>
        )}

        {isGuest && (
          <Card className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-muted/40">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm flex-1">
              <span className="font-medium">Demo mode.</span> Pick a template below and run it without an account (5 runs per hour). Log in to build your own steps and save them.
            </p>
            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline"><Link href="/login">Log in</Link></Button>
              <Button asChild size="sm"><Link href="/signup">Sign up</Link></Button>
            </div>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
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
              disabled={!user}
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
              <label htmlFor="workflow-name" className="sr-only">Workflow name</label>
              <Input
                id="workflow-name"
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
              <Button variant="ghost" size="sm" onClick={() => setShowSaveDialog(false)} aria-label="Cancel save">
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
              <Button variant="ghost" size="sm" onClick={() => setShowSavedList(false)} aria-label="Close saved workflows">
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
                  <div key={saved.id} className="flex items-center gap-2 rounded-lg border p-2 transition-colors hover:bg-muted/50">
                    <button
                      type="button"
                      className="min-w-0 flex-1 rounded-md px-2 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => handleLoadWorkflow(saved)}
                    >
                      <p className="truncate text-sm font-medium">{saved.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(saved.steps as unknown[]).length} step{(saved.steps as unknown[]).length !== 1 ? 's' : ''}
                      </p>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDeleteWorkflow(saved.id, e)}
                      className="shrink-0 text-destructive hover:text-destructive"
                      aria-label={`Delete ${saved.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Start from a template</h2>
            <p className="text-sm text-muted-foreground">Each one fills in the steps and a sample input you can edit.</p>
          </div>
          <TemplateGallery templates={templates} isLoading={loadingTemplates} activeSlug={templateSlug} onSelect={applyTemplate} />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
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
                aria-describedby="input-count"
              />
              <p id="input-count" className={`text-xs ${overLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                {charCount.toLocaleString('en-US')} / {charLimit.toLocaleString('en-US')} characters
                {isGuest ? ' · demo limit' : ''}
                {overLimit ? '. Shorten the text to run it.' : ''}
              </p>
            </div>

            <Button
              onClick={handleRunWorkflow}
              disabled={isRunning || workflow.steps.length === 0 || !workflow.input.trim() || overLimit || aiReady === false || (isGuest && !templateSlug)}
              className="w-full"
              size="lg"
            >
              {isRunning ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Running Workflow...
                </>
              ) : isGuest && !templateSlug ? (
                'Pick a template to run without an account'
              ) : overLimit ? (
                'Input is over the limit'
              ) : (
                'Run Workflow'
              )}
            </Button>

            {live && (
              <div ref={liveRef} className="scroll-mt-24">
                <LiveRun state={live} />
              </div>
            )}
          </div>

          <div>
            <WorkflowPipeline
              workflow={workflow}
              onAddStep={(type) => (isGuest ? toast.info('Log in to add your own steps') : editAddStep(type))}
              onRemoveStep={(id) => (isGuest ? toast.info('Log in to edit steps') : editRemoveStep(id))}
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
              setTemplateSlug(null)
              updateStep(stepId, {
                type: step.type,
                parameters,
              })
            }
          }}
        />
      </div>
  )
}
