import { Router } from 'express';
import { z } from 'zod';
import { executeWorkflowSteps } from '../lib/step-processor.js';
import { createWorkflowRun, updateWorkflowRun, getWorkflowRun, listWorkflowRuns, } from '../lib/supabase-client.js';
const router = Router();
const ProcessWorkflowSchema = z.object({
    steps: z.array(z.object({
        id: z.string(),
        type: z.enum(['clean', 'summarize', 'extract', 'categorize', 'translate', 'sentiment']),
        config: z.record(z.unknown()).optional(),
    })),
    input: z.string().min(1),
    workflowId: z.string().optional(),
});
// POST /api/workflows - Process workflow steps
router.post('/workflows', async (req, res) => {
    try {
        const validatedBody = ProcessWorkflowSchema.parse(req.body);
        // Create workflow run record
        const run = await createWorkflowRun(validatedBody.input, validatedBody.workflowId, req.query.userId);
        // Update status to running
        await updateWorkflowRun(run.id, { status: 'running' });
        // Execute workflow steps sequentially
        const execution = await executeWorkflowSteps(run.id, validatedBody.steps, validatedBody.input);
        // Update run with results
        await updateWorkflowRun(run.id, {
            status: execution.status,
            results: execution,
            total_processing_time: execution.totalProcessingTime,
        });
        // Fetch updated run
        const updatedRun = await getWorkflowRun(run.id);
        res.json({
            success: true,
            runId: updatedRun.id,
            results: updatedRun.results,
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({
                success: false,
                error: 'Invalid request',
                details: error.errors,
            });
            return;
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error processing workflow:', errorMessage);
        res.status(500).json({
            success: false,
            error: errorMessage,
        });
    }
});
// GET /api/workflows - List workflow runs
router.get('/workflows', async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;
        const offset = req.query.offset ? parseInt(req.query.offset) : 0;
        const userId = req.query.userId;
        const { runs, total } = await listWorkflowRuns(userId, limit, offset);
        res.json({
            success: true,
            data: runs,
            pagination: {
                limit,
                offset,
                total,
            },
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error listing workflows:', errorMessage);
        res.status(500).json({
            success: false,
            error: errorMessage,
        });
    }
});
// GET /api/workflows/:id - Get workflow run details
router.get('/workflows/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const run = await getWorkflowRun(id);
        res.json({
            success: true,
            data: run,
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error fetching workflow:', errorMessage);
        res.status(404).json({
            success: false,
            error: errorMessage,
        });
    }
});
export default router;
//# sourceMappingURL=workflows.js.map