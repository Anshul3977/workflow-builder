-- Workflow Builder schema (Neon Postgres). Safe to re-run.
-- Users live in Neon Auth's own `neon_auth` schema; user_id below stores that user's id.

CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
  template_slug TEXT,
  user_id TEXT,                      -- NULL for demo runs
  is_demo BOOLEAN NOT NULL DEFAULT false,
  client_hash TEXT,                  -- salted hash of the caller's IP, for demo rate limits
  input_text TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  results JSONB,
  error_message TEXT,
  total_processing_time INTEGER,     -- ms
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  steps JSONB NOT NULL DEFAULT '[]',
  sample_input TEXT NOT NULL DEFAULT '',
  is_public BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_runs_user_created ON workflow_runs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_demo_client ON workflow_runs(client_hash, created_at) WHERE is_demo;

-- Per-step traces: one row per executed step, written when the step finishes.
CREATE TABLE IF NOT EXISTS workflow_step_traces (
  id BIGSERIAL PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  step_id TEXT NOT NULL,
  step_type TEXT NOT NULL,
  status VARCHAR(10) NOT NULL CHECK (status IN ('success', 'error')),
  model TEXT,
  latency_ms INTEGER NOT NULL,
  ttft_ms INTEGER,                   -- time to first streamed token
  provider_ms INTEGER,               -- Groq-reported generation time
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  reasoning_tokens INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (run_id, step_index)
);
CREATE INDEX IF NOT EXISTS idx_traces_created ON workflow_step_traces(created_at DESC);

-- Run-level rollups so history and stats don't need to unpack JSON.
ALTER TABLE workflow_runs ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE workflow_runs ADD COLUMN IF NOT EXISTS input_tokens INTEGER;
ALTER TABLE workflow_runs ADD COLUMN IF NOT EXISTS output_tokens INTEGER;
