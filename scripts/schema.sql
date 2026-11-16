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
