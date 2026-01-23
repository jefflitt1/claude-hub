-- Proposed Actions SQL Function
-- Run in Supabase SQL Editor after 001_priority_dashboard.sql

-- =============================================================================
-- PROPOSED ACTIONS TABLE (for caching/tracking dismissed actions)
-- =============================================================================

CREATE TABLE IF NOT EXISTS jeff_proposed_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    title TEXT NOT NULL,
    reason TEXT,
    source_type TEXT,
    source_id UUID,
    suggested_actions TEXT[] DEFAULT '{}',
    is_dismissed BOOLEAN DEFAULT false,
    dismissed_at TIMESTAMPTZ,
    snoozed_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposed_actions_active
ON jeff_proposed_actions(is_dismissed, snoozed_until);

-- =============================================================================
-- FUNCTION: Get Proposed Actions
-- =============================================================================

CREATE OR REPLACE FUNCTION get_proposed_actions(action_limit INT DEFAULT 10)
RETURNS TABLE (
    id UUID,
    action_type TEXT,
    priority TEXT,
    title TEXT,
    reason TEXT,
    source_type TEXT,
    source_id UUID,
    suggested_actions TEXT[],
    source_data JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH all_actions AS (
        -- Overdue tasks (highest priority)
        SELECT
            t.id,
            'complete_task'::TEXT as action_type,
            'high'::TEXT as priority,
            ('Complete: ' || t.title)::TEXT as title,
            ('Overdue by ' || (now()::date - t.due_date::date) || ' days')::TEXT as reason,
            'task'::TEXT as source_type,
            t.id as source_id,
            ARRAY['mark_done', 'view', 'reschedule']::TEXT[] as suggested_actions,
            jsonb_build_object(
                'title', t.title,
                'due_date', t.due_date,
                'project_id', t.project_id,
                'kanban_column', t.kanban_column
            ) as source_data,
            1 as sort_order,
            t.due_date as sort_date
        FROM jeff_tasks t
        WHERE t.due_date < now()
          AND t.status != 'completed'

        UNION ALL

        -- Email threads needing response
        SELECT
            e.id,
            'reply_email'::TEXT,
            CASE WHEN e.is_vip_sender THEN 'high' ELSE 'medium' END::TEXT,
            ('Reply to: ' || COALESCE(e.subject, 'No subject'))::TEXT,
            CASE
                WHEN e.is_vip_sender THEN 'VIP sender waiting'
                ELSE 'Waiting ' || COALESCE(EXTRACT(DAY FROM (now() - e.updated_at))::INT, 0) || ' days'
            END::TEXT,
            'email_thread'::TEXT,
            e.id,
            ARRAY['create_task', 'open_email', 'snooze']::TEXT[],
            jsonb_build_object(
                'subject', e.subject,
                'account', e.account,
                'gmail_thread_id', e.gmail_thread_id,
                'is_vip', e.is_vip_sender
            ),
            2,
            e.updated_at
        FROM jeff_email_threads e
        WHERE e.needs_response = true
          AND e.status = 'active'

        UNION ALL

        -- Stale in-progress tasks (>3 days)
        SELECT
            t.id,
            'followup'::TEXT,
            'medium'::TEXT,
            ('Stale: ' || t.title)::TEXT,
            ('In Progress ' || COALESCE(EXTRACT(DAY FROM (now() - t.updated_at))::INT, 0) || ' days')::TEXT,
            'task'::TEXT,
            t.id,
            ARRAY['mark_done', 'view', 'move_column']::TEXT[],
            jsonb_build_object(
                'title', t.title,
                'project_id', t.project_id,
                'kanban_column', t.kanban_column
            ),
            3,
            t.updated_at
        FROM jeff_tasks t
        WHERE t.kanban_column = 'in_progress'
          AND t.status != 'completed'
          AND t.updated_at < now() - interval '3 days'

        UNION ALL

        -- Tasks due within 48 hours
        SELECT
            t.id,
            'review'::TEXT,
            'medium'::TEXT,
            ('Due soon: ' || t.title)::TEXT,
            CASE
                WHEN t.due_date::date = now()::date THEN 'Due today'
                ELSE 'Due tomorrow'
            END::TEXT,
            'task'::TEXT,
            t.id,
            ARRAY['view', 'mark_done', 'reschedule']::TEXT[],
            jsonb_build_object(
                'title', t.title,
                'due_date', t.due_date,
                'project_id', t.project_id
            ),
            4,
            t.due_date
        FROM jeff_tasks t
        WHERE t.due_date >= now()
          AND t.due_date < now() + interval '48 hours'
          AND t.status != 'completed'
    )
    SELECT
        a.id,
        a.action_type,
        a.priority,
        a.title,
        a.reason,
        a.source_type,
        a.source_id,
        a.suggested_actions,
        a.source_data
    FROM all_actions a
    ORDER BY a.sort_order, a.sort_date
    LIMIT action_limit;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- DONE!
-- =============================================================================
