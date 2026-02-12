import { Router, Request, Response, type IRouter } from 'express'
import { z } from 'zod'
import {
    createWorkflow,
    listWorkflows,
    getWorkflow,
    deleteWorkflow,
} from '../lib/supabase-client.js'
import { authMiddleware } from '../middleware/auth-middleware.js'

const router: IRouter = Router()

const SaveWorkflowSchema = z.object({
    name: z.string().min(1).max(100),
    steps: z.array(z.unknown()),
    description: z.string().optional(),
})

// POST /api/saved-workflows - Save a new workflow
router.post('/saved-workflows', authMiddleware, async (req: Request, res: Response) => {
    try {
        const validated = SaveWorkflowSchema.parse(req.body)
        const userId = req.user!.id

        const workflow = await createWorkflow(
            validated.name,
            validated.steps,
            userId,
            validated.description,
        )

        res.json({ success: true, data: workflow })
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ success: false, error: 'Invalid request', details: error.errors })
            return
        }
        const msg = error instanceof Error ? error.message : 'Unknown error'
        console.error('Error saving workflow:', msg)
        res.status(500).json({ success: false, error: msg })
    }
})

// GET /api/saved-workflows - List user's saved workflows
router.get('/saved-workflows', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50
        const offset = req.query.offset ? parseInt(req.query.offset as string) : 0

        const { workflows, total } = await listWorkflows(userId, limit, offset)

        res.json({
            success: true,
            data: workflows,
            pagination: { limit, offset, total },
        })
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        console.error('Error listing saved workflows:', msg)
        res.status(500).json({ success: false, error: msg })
    }
})

// GET /api/saved-workflows/:id - Get a saved workflow
router.get('/saved-workflows/:id', authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
    try {
        const workflow = await getWorkflow(req.params.id)
        res.json({ success: true, data: workflow })
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        res.status(404).json({ success: false, error: msg })
    }
})

// DELETE /api/saved-workflows/:id - Delete a saved workflow
router.delete('/saved-workflows/:id', authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
    try {
        await deleteWorkflow(req.params.id)
        res.json({ success: true })
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        res.status(500).json({ success: false, error: msg })
    }
})

export default router
