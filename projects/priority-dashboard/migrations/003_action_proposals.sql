-- Action Proposals SQL Migration
-- Run in Supabase SQL Editor after 002_proposed_actions.sql

-- =============================================================================
-- ACTION PROPOSALS TABLE
-- Stores AI-generated action suggestions with draft content
-- =============================================================================

CREATE TABLE IF NOT EXISTS jeff_action_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type TEXT NOT NULL, -- 'task', 'email_thread'
    source_id UUID NOT NULL,
    action_type TEXT NOT NULL, -- 'complete_task', 'reply_email', 'followup', etc.
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),

    -- AI-generated content
    proposed_actions JSONB DEFAULT '[]',
    draft_content JSONB, -- For email drafts: {subject, body, tone}
    reasoning TEXT,
    confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),

    -- User interaction
    is_accepted BOOLEAN,
    is_dismissed BOOLEAN DEFAULT false,
    dismissed_at TIMESTAMPTZ,
    snoozed_until TIMESTAMPTZ,
    accepted_action TEXT, -- Which action was taken

    -- Metadata
    model_used TEXT, -- 'claude-3.5-sonnet', 'deepseek-r1:14b', etc.
    generation_time_ms INT,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT now() + interval '24 hours'
);

-- Index for active proposals (filter expires_at at query time, not in index)
CREATE INDEX IF NOT EXISTS idx_action_proposals_active
ON jeff_action_proposals(source_type, source_id, expires_at)
WHERE is_dismissed = false;

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_action_proposals_analytics
ON jeff_action_proposals(action_type, is_accepted, created_at);

-- =============================================================================
-- DRAFT RESPONSES TABLE
-- Stores AI-generated email draft responses
-- =============================================================================

CREATE TABLE IF NOT EXISTS jeff_draft_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_thread_id UUID REFERENCES jeff_email_threads(id) ON DELETE CASCADE,
    proposal_id UUID REFERENCES jeff_action_proposals(id) ON DELETE SET NULL,

    -- Draft content
    subject TEXT,
    body TEXT NOT NULL,
    tone TEXT DEFAULT 'professional' CHECK (tone IN ('professional', 'friendly', 'brief', 'formal')),

    -- Editing state
    is_edited BOOLEAN DEFAULT false,
    edited_body TEXT,
    edit_count INT DEFAULT 0,

    -- Sending state
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ,
    sent_message_id TEXT, -- Gmail message ID after sending

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for finding drafts by thread
CREATE INDEX IF NOT EXISTS idx_draft_responses_thread
ON jeff_draft_responses(email_thread_id)
WHERE is_sent = false;

-- =============================================================================
-- EMAIL TEMPLATES TABLE
-- Reusable templates for common response patterns
-- =============================================================================

CREATE TABLE IF NOT EXISTS jeff_email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'acknowledgment', 'followup', 'decline', 'schedule', etc.

    -- Template content
    subject_template TEXT,
    body_template TEXT NOT NULL, -- Supports {{variables}}
    tone TEXT DEFAULT 'professional',

    -- Matching rules
    sender_patterns TEXT[], -- Email patterns that trigger this template
    subject_patterns TEXT[], -- Subject patterns
    keyword_patterns TEXT[], -- Body keyword patterns

    -- Usage tracking
    use_count INT DEFAULT 0,
    last_used_at TIMESTAMPTZ,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- FUNCTION: Get Action Proposals with AI Context
-- =============================================================================

CREATE OR REPLACE FUNCTION get_action_proposals_with_context(proposal_limit INT DEFAULT 10)
RETURNS TABLE (
    id UUID,
    source_type TEXT,
    source_id UUID,
    action_type TEXT,
    priority TEXT,
    title TEXT,
    reason TEXT,
    proposed_actions JSONB,
    draft_content JSONB,
    source_context JSONB,
    confidence FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH active_proposals AS (
        SELECT
            ap.id,
            ap.source_type,
            ap.source_id,
            ap.action_type,
            ap.priority,
            ap.proposed_actions,
            ap.draft_content,
            ap.reasoning,
            ap.confidence,
            ap.created_at
        FROM jeff_action_proposals ap
        WHERE ap.is_dismissed = false
          AND ap.expires_at > now()
          AND (ap.snoozed_until IS NULL OR ap.snoozed_until < now())
        ORDER BY
            CASE ap.priority
                WHEN 'urgent' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                WHEN 'low' THEN 4
            END,
            ap.created_at DESC
        LIMIT proposal_limit
    )
    SELECT
        ap.id,
        ap.source_type,
        ap.source_id,
        ap.action_type,
        ap.priority,
        CASE
            WHEN ap.source_type = 'task' THEN t.title
            WHEN ap.source_type = 'email_thread' THEN e.subject
        END as title,
        ap.reasoning as reason,
        ap.proposed_actions,
        ap.draft_content,
        CASE
            WHEN ap.source_type = 'task' THEN jsonb_build_object(
                'title', t.title,
                'due_date', t.due_date,
                'status', t.status,
                'project_id', t.project_id
            )
            WHEN ap.source_type = 'email_thread' THEN jsonb_build_object(
                'subject', e.subject,
                'from_email', e.from_email,
                'from_name', e.from_name,
                'account', e.account,
                'is_vip', e.is_vip_sender,
                'gmail_thread_id', e.gmail_thread_id
            )
        END as source_context,
        ap.confidence
    FROM active_proposals ap
    LEFT JOIN jeff_tasks t ON ap.source_type = 'task' AND ap.source_id = t.id
    LEFT JOIN jeff_email_threads e ON ap.source_type = 'email_thread' AND ap.source_id = e.id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FUNCTION: Record Action Taken
-- =============================================================================

CREATE OR REPLACE FUNCTION record_action_taken(
    p_proposal_id UUID,
    p_action_type TEXT,
    p_was_accepted BOOLEAN DEFAULT true
) RETURNS VOID AS $$
BEGIN
    UPDATE jeff_action_proposals
    SET
        is_accepted = p_was_accepted,
        accepted_action = p_action_type,
        is_dismissed = true,
        dismissed_at = now()
    WHERE id = p_proposal_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FUNCTION: Snooze Proposal
-- =============================================================================

CREATE OR REPLACE FUNCTION snooze_proposal(
    p_proposal_id UUID,
    p_snooze_hours INT DEFAULT 4
) RETURNS VOID AS $$
BEGIN
    UPDATE jeff_action_proposals
    SET snoozed_until = now() + (p_snooze_hours || ' hours')::interval
    WHERE id = p_proposal_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FUNCTION: Get Action Analytics
-- =============================================================================

CREATE OR REPLACE FUNCTION get_action_analytics(days_back INT DEFAULT 30)
RETURNS TABLE (
    action_type TEXT,
    total_proposed BIGINT,
    total_accepted BIGINT,
    total_dismissed BIGINT,
    acceptance_rate NUMERIC,
    avg_confidence NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ap.action_type,
        COUNT(*)::BIGINT as total_proposed,
        COUNT(*) FILTER (WHERE ap.is_accepted = true)::BIGINT as total_accepted,
        COUNT(*) FILTER (WHERE ap.is_dismissed = true AND ap.is_accepted IS DISTINCT FROM true)::BIGINT as total_dismissed,
        ROUND(100.0 * COUNT(*) FILTER (WHERE ap.is_accepted = true) / NULLIF(COUNT(*), 0), 1) as acceptance_rate,
        ROUND(AVG(ap.confidence)::NUMERIC, 2) as avg_confidence
    FROM jeff_action_proposals ap
    WHERE ap.created_at > now() - (days_back || ' days')::interval
    GROUP BY ap.action_type
    ORDER BY acceptance_rate DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SEED DEFAULT TEMPLATES
-- =============================================================================

INSERT INTO jeff_email_templates (name, category, subject_template, body_template, tone, keyword_patterns)
VALUES
    ('Quick Acknowledgment', 'acknowledgment',
     NULL,
     'Hi {{sender_name}},

Thanks for your email. I''ll review this and get back to you {{timeframe}}.

Best,
Jeff',
     'professional',
     ARRAY['review', 'look at', 'check', 'thoughts']),

    ('Meeting Follow-up', 'followup',
     'Re: {{subject}}',
     'Hi {{sender_name}},

Great meeting today. Here are the key action items we discussed:

{{action_items}}

Let me know if I missed anything.

Best,
Jeff',
     'professional',
     ARRAY['meeting', 'call', 'sync', 'discussion']),

    ('Scheduling Response', 'schedule',
     'Re: {{subject}}',
     'Hi {{sender_name}},

{{time_suggestion}} works for me. I''ll send a calendar invite.

Best,
Jeff',
     'brief',
     ARRAY['schedule', 'calendar', 'meeting', 'availability', 'free']),

    ('Polite Decline', 'decline',
     'Re: {{subject}}',
     'Hi {{sender_name}},

Thank you for thinking of me. Unfortunately, I won''t be able to {{request}} at this time due to {{reason}}.

I appreciate your understanding.

Best,
Jeff',
     'professional',
     ARRAY['opportunity', 'invite', 'participate', 'join'])
ON CONFLICT DO NOTHING;

-- =============================================================================
-- DONE!
-- =============================================================================
