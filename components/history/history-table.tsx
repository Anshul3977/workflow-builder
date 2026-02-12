'use client'

import { format } from 'date-fns'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { WorkflowRun } from '@/types/results'

interface HistoryTableProps {
  runs: WorkflowRun[]
}

function getRunName(input: string | undefined): string {
  if (!input || input.trim() === '') return 'Untitled Run'
  const trimmed = input.trim().replace(/\s+/g, ' ')
  if (trimmed.length <= 65) return trimmed
  return trimmed.slice(0, 65).trimEnd() + '...'
}

export function HistoryTable({ runs }: HistoryTableProps) {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm')
    } catch {
      return dateString
    }
  }

  if (runs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-muted-foreground">No workflow runs yet. Start building and running workflows!</p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table className="min-w-[600px]">
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="min-w-[200px]">Name</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="hidden sm:table-cell w-[80px]">Steps</TableHead>
            <TableHead className="hidden lg:table-cell w-[100px]">Duration</TableHead>
            <TableHead className="hidden md:table-cell w-[160px]">Date</TableHead>
            <TableHead className="w-[80px]">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => {
            const steps = run.results?.steps ?? []
            const totalTime = run.results?.totalProcessingTime ?? 0
            const isSuccess = run.status === 'completed'
            return (
              <TableRow key={run.id}>
                <TableCell className="font-medium">
                  <div className="flex items-start gap-2.5 pl-1">
                    <span className="mt-1.5 h-2 w-2 rounded-full shrink-0 bg-primary/60" />
                    <span className="leading-snug">{getRunName(run.input)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={isSuccess ? 'default' : 'destructive'}>
                    {isSuccess ? 'Success' : 'Failed'}
                  </Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {steps.length} step{steps.length !== 1 ? 's' : ''}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {(totalTime / 1000).toFixed(2)}s
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {formatDate(run.completedAt || run.createdAt)}
                </TableCell>
                <TableCell>
                  <Link href={`/results/${run.id}`}>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
