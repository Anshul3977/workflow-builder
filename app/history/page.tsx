'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { HistoryTable } from '@/components/history/history-table'
import { useHistoryStore } from '@/lib/stores/history-store'
import { workflowApi } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { AuthGuard } from '@/components/auth/auth-guard'

export default function HistoryPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isClearing, setIsClearing] = useState(false)
  const runs = useHistoryStore((state) => state.runs)
  const setRuns = useHistoryStore((state) => state.setRuns)

  const fetchHistory = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await workflowApi.getHistory(50, 0)
      setRuns(response.runs)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load history'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [setRuns])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const handleClearHistory = async () => {
    try {
      setIsClearing(true)
      await workflowApi.clearHistory()
      setRuns([])
      toast.success('All workflow runs have been cleared')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to clear history'
      toast.error(message)
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <AuthGuard>
      <div className="space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Workflow History</h1>
            <p className="text-muted-foreground mt-2">
              View and manage your workflow execution history
            </p>
          </div>

          {!isLoading && runs.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive self-start">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear History
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all your runs?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {runs.length} workflow run{runs.length !== 1 ? 's' : ''} from your history. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearHistory}
                    disabled={isClearing}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isClearing ? 'Clearing...' : 'Delete All'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <HistoryTable runs={runs} />
        )}
      </div>
    </AuthGuard>
  )
}
