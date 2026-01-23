-- Priority Dashboard Schema Migration
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/jzgxswemtbzodvvqoyxn/sql

-- =============================================================================
-- 1. PRIORITY SCORES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS jeff_priority_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    deadline_factor NUMERIC(3,1) DEFAULT 0,
    sender_weight NUMERIC(3,1) DEFAULT 0,
    urgency_keywords NUMERIC(3,1) DEFAULT 0,
    thread_activity NUMERIC(3,1) DEFAULT 0,
    auto_score NUMERIC(3,1) GENERATED ALWAYS AS (
        (deadline_factor * 0.4) +
        (sender_weight * 0.2) +
        (urgency_keywords * 0.2) +
        (thread_activity * 0.2)
    ) STORED,
    manual_override NUMERIC(3,1) DEFAULT NULL,
    effective_score NUMERIC(3,1) GENERATED ALWAYS AS (
        COALESCE(manual_override,
            (deadline_factor * 0.4) +
            (sender_weight * 0.2) +
            (urgency_keywords * 0.2) +
            (thread_activity * 0.2)
        )
    ) STORED,
    factors_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(entity_type, entity_id)
);

-- =============================================================================
-- 2. KANBAN COLUMNS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS jeff_kanban_columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    position INT NOT NULL,
    wip_limit INT DEFAULT NULL,
    color TEXT DEFAULT '#6B7280',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default columns (only if table is empty)
INSERT INTO jeff_kanban_columns (name, slug, position, wip_limit, color, is_default)
SELECT * FROM (VALUES
    ('Inbox', 'inbox', 0, NULL::INT, '#9CA3AF', true),
    ('Ready', 'ready', 1, NULL::INT, '#3B82F6', false),
    ('In Progress', 'in_progress', 2, 3, '#F59E0B', false),
    ('Review', 'review', 3, NULL::INT, '#8B5CF6', false),
    ('Done', 'done', 4, NULL::INT, '#10B981', false)
) AS v(name, slug, position, wip_limit, color, is_default)
WHERE NOT EXISTS (SELECT 1 FROM jeff_kanban_columns LIMIT 1);

-- =============================================================================
-- 3. GOOGLE TASKS SYNC TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS jeff_google_tasks_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_task_id TEXT NOT NULL UNIQUE,
    google_list_id TEXT NOT NULL,
    google_list_name TEXT,
    jeff_task_id UUID REFERENCES jeff_tasks(id) ON DELETE SET NULL,
    last_synced_at TIMESTAMPTZ DEFAULT now(),
    sync_direction TEXT DEFAULT 'bidirectional',
    sync_status TEXT DEFAULT 'synced',
    google_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 4. VIP SENDERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS jeff_vip_senders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_pattern TEXT NOT NULL,
    weight NUMERIC(3,1) DEFAULT 8,
    name TEXT,
    account TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default VIPs (only if table is empty)
INSERT INTO jeff_vip_senders (email_pattern, weight, name, account)
SELECT * FROM (VALUES
    ('%@l7-partners.com', 8.0, 'L7 Partners Team', 'l7'),
    ('%@jglcap.com', 9.0, 'JGL Capital', 'personal'),
    ('mplittell@gmail.com', 10.0, 'Megan', 'personal')
) AS v(email_pattern, weight, name, account)
WHERE NOT EXISTS (SELECT 1 FROM jeff_vip_senders LIMIT 1);

-- =============================================================================
-- 5. ALTER jeff_tasks TABLE
-- =============================================================================

ALTER TABLE jeff_tasks
    ADD COLUMN IF NOT EXISTS kanban_column TEXT DEFAULT 'inbox',
    ADD COLUMN IF NOT EXISTS kanban_position INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS priority_score NUMERIC(3,1) DEFAULT 5,
    ADD COLUMN IF NOT EXISTS email_thread_id UUID,
    ADD COLUMN IF NOT EXISTS account TEXT DEFAULT 'personal',
    ADD COLUMN IF NOT EXISTS google_task_id TEXT;

-- Add foreign key constraint for email_thread_id (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'jeff_tasks_email_thread_id_fkey'
    ) THEN
        ALTER TABLE jeff_tasks
        ADD CONSTRAINT jeff_tasks_email_thread_id_fkey
        FOREIGN KEY (email_thread_id) REFERENCES jeff_email_threads(id);
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tasks_kanban ON jeff_tasks(kanban_column, kanban_position);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON jeff_tasks(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_email ON jeff_tasks(email_thread_id);

-- =============================================================================
-- 6. ALTER jeff_email_threads TABLE
-- =============================================================================

ALTER TABLE jeff_email_threads
    ADD COLUMN IF NOT EXISTS priority_score NUMERIC(3,1) DEFAULT 5,
    ADD COLUMN IF NOT EXISTS is_vip_sender BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS urgency_keywords TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS response_deadline TIMESTAMPTZ;

-- =============================================================================
-- 7. CREATE DASHBOARD VIEW
-- =============================================================================

CREATE OR REPLACE VIEW jeff_dashboard_tasks AS
SELECT
    t.id,
    t.title,
    t.description,
    t.status,
    t.priority,
    t.priority_score,
    t.kanban_column,
    t.kanban_position,
    t.project_id,
    t.account,
    t.due_date,
    t.tags,
    t.created_at,
    e.id as email_thread_id,
    e.subject as email_subject,
    e.gmail_thread_id,
    e.account as email_account,
    e.participants,
    e.ai_summary as email_summary,
    e.needs_response as email_needs_response,
    ps.auto_score,
    ps.manual_override,
    ps.factors_json as priority_factors,
    CASE
        WHEN t.due_date < now() THEN 'overdue'
        WHEN t.due_date < now() + interval '1 day' THEN 'due_today'
        WHEN t.due_date < now() + interval '3 days' THEN 'due_soon'
        ELSE 'normal'
    END as urgency_level,
    gs.google_task_id,
    gs.sync_status as google_sync_status
FROM jeff_tasks t
LEFT JOIN jeff_email_threads e ON t.email_thread_id = e.id
LEFT JOIN jeff_priority_scores ps ON ps.entity_type = 'task' AND ps.entity_id = t.id
LEFT JOIN jeff_google_tasks_sync gs ON gs.jeff_task_id = t.id
WHERE t.status != 'completed' OR t.completed_at > now() - interval '7 days';

-- =============================================================================
-- 8. CREATE KANBAN SUMMARY VIEW
-- =============================================================================

CREATE OR REPLACE VIEW jeff_kanban_summary AS
SELECT
    kc.slug as column_slug,
    kc.name as column_name,
    kc.wip_limit,
    kc.color,
    COUNT(t.id) as task_count,
    COALESCE(SUM(CASE WHEN t.priority_score >= 8 THEN 1 ELSE 0 END), 0) as high_priority_count
FROM jeff_kanban_columns kc
LEFT JOIN jeff_tasks t ON t.kanban_column = kc.slug AND t.status != 'completed'
GROUP BY kc.slug, kc.name, kc.wip_limit, kc.color, kc.position
ORDER BY kc.position;

-- =============================================================================
-- DONE! Tables and views created for Priority Dashboard.
-- =============================================================================
