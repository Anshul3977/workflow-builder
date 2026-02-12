export declare const supabase: import("@supabase/supabase-js").SupabaseClient<any, "public", "public", any, any>;
export interface Workflow {
    id: string;
    user_id: string | null;
    name: string;
    description: string | null;
    steps: unknown;
    created_at: string;
    updated_at: string;
}
export interface WorkflowRun {
    id: string;
    workflow_id: string | null;
    user_id: string | null;
    input_text: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    results: unknown;
    error_message: string | null;
    total_processing_time: number | null;
    created_at: string;
    completed_at: string | null;
}
export interface WorkflowTemplate {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    steps: unknown;
    is_public: boolean;
    created_at: string;
}
export declare function createWorkflowRun(inputText: string, workflowId?: string, userId?: string): Promise<WorkflowRun>;
export declare function updateWorkflowRun(runId: string, updates: Partial<WorkflowRun>): Promise<WorkflowRun>;
export declare function getWorkflowRun(runId: string): Promise<WorkflowRun>;
export declare function listWorkflowRuns(userId?: string, limit?: number, offset?: number): Promise<{
    runs: WorkflowRun[];
    total: number;
}>;
export declare function getWorkflow(workflowId: string): Promise<Workflow>;
//# sourceMappingURL=supabase-client.d.ts.map