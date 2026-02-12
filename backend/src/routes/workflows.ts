import { Router, Request, Response, type IRouter } from 'express'
import { z } from 'zod'
import { executeWorkflowSteps } from '../lib/step-processor.js'
import {
  createWorkflowRun,
  updateWorkflowRun,
  getWorkflowRun,
  listWorkflowRuns,
} from '../lib/supabase-client.js'
import { authMiddleware } from '../middleware/auth-middleware.js'

const router: IRouter = Router()

const ProcessWorkflowSchema = z.object({
  steps: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['clean', 'summarize', 'extract', 'categorize', 'translate', 'sentiment']),
      config: z.record(z.unknown()).optional(),
    })
  ),
  input: z.string().min(1),
  workflowId: z.string().optional(),
})

type ProcessWorkflowRequest = z.infer<typeof ProcessWorkflowSchema>

// POST /api/workflows - Process workflow steps (authenticated)
router.post('/workflows', authMiddleware, async (req: Request<{}, {}, ProcessWorkflowRequest>, res: Response) => {
  try {
    const validatedBody = ProcessWorkflowSchema.parse(req.body)
    const userId = req.user?.id

    // Create workflow run record
    const run = await createWorkflowRun(validatedBody.input, validatedBody.workflowId, userId)

    // Update status to running
    await updateWorkflowRun(run.id, { status: 'running' })

    try {
      // Execute workflow steps sequentially
      const execution = await executeWorkflowSteps(run.id, validatedBody.steps, validatedBody.input)

      // Update run with results
      await updateWorkflowRun(run.id, {
        status: execution.status,
        results: execution,
        total_processing_time: execution.totalProcessingTime,
      })
    } catch (error) {
      // Guarantee the run is marked failed even on unexpected crash
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      await updateWorkflowRun(run.id, {
        status: 'failed',
        error_message: errorMessage,
      })
      throw error // Re-throw to be caught by the outer catch block for the API response
    }

    // Fetch updated run
    const updatedRun = await getWorkflowRun(run.id)

    res.json({
      success: true,
      runId: updatedRun.id,
      results: updatedRun.results,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: error.errors,
      })
      return
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Error processing workflow:', errorMessage)

    res.status(500).json({
      success: false,
      error: errorMessage,
    })
  }
})

// GET /api/workflows - List workflow runs (authenticated, scoped to user)
router.get('/workflows', authMiddleware, async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0
    const userId = req.user?.id

    const { runs, total } = await listWorkflowRuns(userId, limit, offset)

    res.json({
      success: true,
      data: runs,
      pagination: {
        limit,
        offset,
        total,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Error listing workflows:', errorMessage)

    res.status(500).json({
      success: false,
      error: errorMessage,
    })
  }
})

// DELETE /api/workflows/clear - Delete all workflow runs for current user
router.delete('/workflows/clear', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }

    const { getSupabase } = await import('../lib/supabase-client.js')
    const { error, count } = await getSupabase()
      .from('workflow_runs')
      .delete()
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to clear history: ${error.message}`)
    }

    res.json({
      success: true,
      message: `Cleared ${count ?? 0} workflow run(s)`,
      deletedCount: count ?? 0,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Error clearing workflow history:', errorMessage)

    res.status(500).json({
      success: false,
      error: errorMessage,
    })
  }
})

// GET /api/workflows/:id - Get workflow run details (authenticated)
router.get('/workflows/:id', authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params

    const run = await getWorkflowRun(id)

    res.json({
      success: true,
      data: run,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Error fetching workflow:', errorMessage)

    res.status(404).json({
      success: false,
      error: errorMessage,
    })
  }
})

export default router
