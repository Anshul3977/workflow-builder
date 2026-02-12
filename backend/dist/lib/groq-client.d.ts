export type StepType = 'clean' | 'summarize' | 'extract' | 'categorize' | 'translate' | 'sentiment';
export interface ProcessStepInput {
    type: StepType;
    text: string;
    config?: Record<string, unknown>;
}
export interface ProcessStepOutput {
    result: string;
    processingTime: number;
    tokensUsed?: {
        input: number;
        output: number;
    };
}
export declare function processStep(input: ProcessStepInput): Promise<ProcessStepOutput>;
//# sourceMappingURL=groq-client.d.ts.map