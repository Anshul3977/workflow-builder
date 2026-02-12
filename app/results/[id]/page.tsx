'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ResultsViewer } from '@/components/results/results-viewer'
import { useHistoryStore } from '@/lib/stores/history-store'
import { workflowApi } from '@/lib/api'
import { ArrowLeft } from 'lucide-react'
import type { WorkflowRun } from '@/types/results'
import { AuthGuard } from '@/components/auth/auth-guard'

export default function ResultsPage() {
  const router = useRouter()
  const params = useParams()
  const runId = params.id as string

  const [run, setRun] = useState<WorkflowRun | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const cachedRun = useHistoryStore((state) =>
    state.runs.find((r) => r.id === runId)
  )

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setIsLoading(true)

        if (cachedRun) {
          setRun(cachedRun)
          setIsLoading(false)
          return
        }

        const response = await workflowApi.getResults(runId)
        setRun(response.run)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load results'
        toast.error(message)
        router.push('/history')
      } finally {
        setIsLoading(false)
      }
    }

    fetchResults()
  }, [runId, cachedRun, router])

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Workflow Results</h1>
            <p className="text-muted-foreground">
              View detailed results from your workflow execution
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : run ? (
          <ResultsViewer run={run} />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Results not found</p>
          </div>
        )}
      </div>
    </AuthGuard>
  )
}
