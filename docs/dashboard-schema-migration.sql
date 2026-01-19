-- Dashboard Enhancement Schema Migration
-- Run in Supabase Dashboard → SQL Editor
-- Created: 2026-01-19

-- 1. Create workflow_categories table
CREATE TABLE IF NOT EXISTS workflow_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#30363d',
    icon TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data for categories
INSERT INTO workflow_categories (name, description, color, display_order) VALUES
('Production', 'Active, mission-critical workflows', '#238636', 1),
('Development', 'Workflows under active development', '#1f6feb', 2),
('Integration', 'Third-party service integrations', '#9e6a03', 3),
('Automation', 'Scheduled and trigger-based automations', '#6e40c9', 4),
('Templates', 'Reusable workflow templates', '#30363d', 5)
ON CONFLICT (name) DO NOTHING;

-- 2. Create workflow_executions_summary table
CREATE TABLE IF NOT EXISTS workflow_executions_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_n8n_id TEXT NOT NULL,
    date DATE NOT NULL,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    avg_duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workflow_n8n_id, date)
);

CREATE INDEX IF NOT EXISTS idx_executions_summary_date ON workflow_executions_summary(date DESC);

-- 3. Create workflow_dependencies table
CREATE TABLE IF NOT EXISTS workflow_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_workflow_id TEXT NOT NULL,
    target_workflow_id TEXT NOT NULL,
    dependency_type TEXT NOT NULL, -- 'triggers', 'calls', 'shares_data'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_workflow_id, target_workflow_id, dependency_type)
);

-- 4. Enhance n8n_workflows table with new columns
ALTER TABLE n8n_workflows ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES workflow_categories(id);
ALTER TABLE n8n_workflows ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE n8n_workflows ADD COLUMN IF NOT EXISTS owner TEXT;
ALTER TABLE n8n_workflows ADD COLUMN IF NOT EXISTS webhook_url TEXT;
ALTER TABLE n8n_workflows ADD COLUMN IF NOT EXISTS documentation_url TEXT;
ALTER TABLE n8n_workflows ADD COLUMN IF NOT EXISTS last_success_at TIMESTAMPTZ;
ALTER TABLE n8n_workflows ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMPTZ;
ALTER TABLE n8n_workflows ADD COLUMN IF NOT EXISTS error_count_7d INTEGER DEFAULT 0;
ALTER TABLE n8n_workflows ADD COLUMN IF NOT EXISTS success_count_7d INTEGER DEFAULT 0;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_workflows_category ON n8n_workflows(category_id);
CREATE INDEX IF NOT EXISTS idx_workflows_priority ON n8n_workflows(priority);

-- 5. Create dashboard_sections table
CREATE TABLE IF NOT EXISTS dashboard_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    collapsed_by_default BOOLEAN DEFAULT false,
    icon TEXT,
    color TEXT,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed dashboard sections
INSERT INTO dashboard_sections (name, title, icon, color, display_order) VALUES
('projects', 'Projects', '📁', '#58a6ff', 1),
('workflows', 'n8n Workflows', '⚡', '#d29922', 2),
('agents', 'Agents', '🤖', '#3fb950', 3),
('skills', 'Skills', '✨', '#a371f7', 4),
('mcp_servers', 'MCP Servers', '🔌', '#79c0ff', 5),
('prompts', 'Prompts', '📝', '#f85149', 6)
ON CONFLICT (name) DO NOTHING;

-- 6. Enable RLS on new tables
ALTER TABLE workflow_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_sections ENABLE ROW LEVEL SECURITY;

-- Create permissive read policies for anon
CREATE POLICY "Allow anon read workflow_categories" ON workflow_categories FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read workflow_executions_summary" ON workflow_executions_summary FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read workflow_dependencies" ON workflow_dependencies FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read dashboard_sections" ON dashboard_sections FOR SELECT TO anon USING (true);

-- Done!
SELECT 'Migration complete!' as status;
