import { processStep as processGroqStep } from './groq-client.js';
export async function executeWorkflowSteps(workflowRunId, steps, initialInput) {
    const startTime = Date.now();
    const results = [];
    let currentInput = initialInput;
    for (const step of steps) {
        const stepStartTime = Date.now();
        try {
            const processInput = {
                type: step.type,
                text: currentInput,
                config: step.config,
            };
            const output = await processGroqStep(processInput);
            const result = {
                stepId: step.id,
                stepType: step.type,
                input: currentInput,
                output: output.result,
                processingTime: output.processingTime,
                status: 'success',
                tokensUsed: output.tokensUsed,
            };
            results.push(result);
            // Update input for next step (chaining)
            currentInput = output.result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            const result = {
                stepId: step.id,
                stepType: step.type,
                input: currentInput,
                output: '',
                processingTime: Date.now() - stepStartTime,
                status: 'error',
                error: errorMessage,
            };
            results.push(result);
            // Stop execution on error
            break;
        }
    }
    const totalProcessingTime = Date.now() - startTime;
    return {
        workflowRunId,
        initialInput,
        steps: results,
        totalProcessingTime,
        status: results.some((r) => r.status === 'error') ? 'failed' : 'completed',
    };
}
//# sourceMappingURL=step-processor.js.map