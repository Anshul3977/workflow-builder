import { StepType } from './groq-client.js';
export interface WorkflowStep {
    id: string;
    type: StepType;
    config?: Record<string, unknown>;
}
export interface StepResult {
    stepId: string;
    stepType: string;
    input: string;
    output: string;
    processingTime: number;
    status: 'success' | 'error';
    error?: string;
    tokensUsed?: {
        input: number;
        output: number;
    };
}
export interface WorkflowExecutionResult {
    workflowRunId: string;
    initialInput: string;
    steps: StepResult[];
    totalProcessingTime: number;
    status: 'completed' | 'failed';
}
export declare function executeWorkflowSteps(workflowRunId: string, steps: WorkflowStep[], initialInput: string): Promise<WorkflowExecutionResult>;
//# sourceMappingURL=step-processor.d.ts.map