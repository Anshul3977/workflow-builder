import { createClient } from '@supabase/supabase-js';
if (!process.env.SUPABASE_URL) {
    throw new Error('SUPABASE_URL environment variable is not set');
}
if (!process.env.SUPABASE_KEY) {
    throw new Error('SUPABASE_KEY environment variable is not set');
}
export const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
export async function createWorkflowRun(inputText, workflowId, userId) {
    const { data, error } = await supabase
        .from('workflow_runs')
        .insert({
        workflow_id: workflowId || null,
        user_id: userId || null,
        input_text: inputText,
        status: 'pending',
    })
        .select()
        .single();
    if (error) {
        throw new Error(`Failed to create workflow run: ${error.message}`);
    }
    return data;
}
export async function updateWorkflowRun(runId, updates) {
    const { data, error } = await supabase
        .from('workflow_runs')
        .update({
        ...updates,
        completed_at: updates.status === 'completed' || updates.status === 'failed' ? new Date().toISOString() : undefined,
    })
        .eq('id', runId)
        .select()
        .single();
    if (error) {
        throw new Error(`Failed to update workflow run: ${error.message}`);
    }
    return data;
}
export async function getWorkflowRun(runId) {
    const { data, error } = await supabase.from('workflow_runs').select('*').eq('id', runId).single();
    if (error) {
        throw new Error(`Failed to fetch workflow run: ${error.message}`);
    }
    return data;
}
export async function listWorkflowRuns(userId, limit = 50, offset = 0) {
    let query = supabase.from('workflow_runs').select('*', { count: 'exact' }).order('created_at', { ascending: false });
    if (userId) {
        query = query.eq('user_id', userId);
    }
    const { data, error, count } = await query.range(offset, offset + limit - 1);
    if (error) {
        throw new Error(`Failed to list workflow runs: ${error.message}`);
    }
    return {
        runs: data || [],
        total: count || 0,
    };
}
export async function getWorkflow(workflowId) {
    const { data, error } = await supabase.from('workflows').select('*').eq('id', workflowId).single();
    if (error) {
        throw new Error(`Failed to fetch workflow: ${error.message}`);
    }
    return data;
}
//# sourceMappingURL=supabase-client.js.map