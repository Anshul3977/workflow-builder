import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy initialization — env vars aren't available at module-load time
// since dotenv runs in server.ts after ES module imports resolve.
let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    if (!process.env.SUPABASE_URL) {
      throw new Error('SUPABASE_URL environment variable is not set')
    }
    if (!process.env.SUPABASE_KEY) {
      throw new Error('SUPABASE_KEY environment variable is not set')
    }
    _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
  }
  return _supabase
}

// Re-export as supabase for backward compatibility (used in server.ts health check)
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getSupabase(), prop, receiver)
  },
})

export interface Workflow {
  id: string
  user_id: string | null
  name: string
  description: string | null
  steps: unknown
  created_at: string
  updated_at: string
}

export interface WorkflowRun {
  id: string
  workflow_id: string | null
  user_id: string | null
  input_text: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  results: unknown
  error_message: string | null
  total_processing_time: number | null
  created_at: string
  completed_at: string | null
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string | null
  category: string | null
  steps: unknown
  is_public: boolean
  created_at: string
}

export async function createWorkflowRun(
  inputText: string,
  workflowId?: string,
  userId?: string
): Promise<WorkflowRun> {
  // Validate that the workflow exists before referencing it (foreign key constraint)
  let validWorkflowId: string | null = null
  if (workflowId) {
    const { data: workflow } = await getSupabase()
      .from('workflows')
      .select('id')
      .eq('id', workflowId)
      .single()
    validWorkflowId = workflow ? workflowId : null
  }

  const { data, error } = await getSupabase()
    .from('workflow_runs')
    .insert({
      workflow_id: validWorkflowId,
      user_id: userId || null,
      input_text: inputText,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create workflow run: ${error.message}`)
  }

  return data
}

export async function updateWorkflowRun(
  runId: string,
  updates: Partial<WorkflowRun>
): Promise<WorkflowRun> {
  const { data, error } = await getSupabase()
    .from('workflow_runs')
    .update({
      ...updates,
      completed_at: updates.status === 'completed' || updates.status === 'failed' ? new Date().toISOString() : undefined,
    })
    .eq('id', runId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update workflow run: ${error.message}`)
  }

  return data
}

export async function getWorkflowRun(runId: string): Promise<WorkflowRun> {
  const { data, error } = await getSupabase().from('workflow_runs').select('*').eq('id', runId).single()

  if (error) {
    throw new Error(`Failed to fetch workflow run: ${error.message}`)
  }

  return data
}

export async function listWorkflowRuns(
  userId?: string,
  limit = 50,
  offset = 0
): Promise<{ runs: WorkflowRun[]; total: number }> {
  let query = getSupabase().from('workflow_runs').select('*', { count: 'exact' }).order('created_at', { ascending: false })

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1)

  if (error) {
    throw new Error(`Failed to list workflow runs: ${error.message}`)
  }

  return {
    runs: data || [],
    total: count || 0,
  }
}

export async function getWorkflow(workflowId: string): Promise<Workflow> {
  const { data, error } = await getSupabase().from('workflows').select('*').eq('id', workflowId).single()

  if (error) {
    throw new Error(`Failed to fetch workflow: ${error.message}`)
  }

  return data
}

export async function createWorkflow(
  name: string,
  steps: unknown,
  userId: string,
  description?: string,
): Promise<Workflow> {
  const { data, error } = await getSupabase()
    .from('workflows')
    .insert({
      name,
      steps,
      user_id: userId,
      description: description || null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to save workflow: ${error.message}`)
  }

  return data
}

export async function listWorkflows(
  userId: string,
  limit = 50,
  offset = 0,
): Promise<{ workflows: Workflow[]; total: number }> {
  const { data, error, count } = await getSupabase()
    .from('workflows')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw new Error(`Failed to list workflows: ${error.message}`)
  }

  return {
    workflows: data || [],
    total: count || 0,
  }
}

export async function deleteWorkflow(workflowId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('workflows')
    .delete()
    .eq('id', workflowId)

  if (error) {
    throw new Error(`Failed to delete workflow: ${error.message}`)
  }
}
