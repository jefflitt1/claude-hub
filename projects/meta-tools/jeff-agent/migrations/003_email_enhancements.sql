-- Jeff Agent Email Enhancements Migration
-- Migration 003: Add email rules, thread summaries, and project context
-- Run in Supabase SQL Editor after 002_personal_family_extension.sql

-- ============================================================================
-- 1. EMAIL RULES TABLE
-- ============================================================================
-- Auto-triage rules for email categorization

CREATE TABLE IF NOT EXISTS jeff_email_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  -- Matching criteria
  sender_pattern TEXT, -- Regex pattern or exact domain
  subject_pattern TEXT, -- Regex pattern for subject
  keyword_patterns TEXT[], -- Keywords to match in body/subject
  from_domain TEXT, -- Exact domain match (e.g., 'profesia.sk')
  -- Actions
  action TEXT NOT NULL CHECK (action IN (
    'auto_archive', 'auto_low_priority', 'auto_urgent', 'auto_high',
    'skip_inbox', 'suggest_unsubscribe', 'auto_categorize', 'custom'
  )),
  priority TEXT CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  project_id TEXT, -- Auto-assign to project
  tags TEXT[] DEFAULT '{}', -- Auto-apply tags
  -- Rule behavior
  auto_archive_days INTEGER, -- Archive after X days if action is auto_archive
  apply_to_account TEXT CHECK (apply_to_account IN ('personal', 'l7', 'all')),
  -- Metadata
  match_count INTEGER DEFAULT 0, -- Track how often rule matches
  last_matched_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 2. ADD AI SUMMARY COLUMNS TO EMAIL THREADS
-- ============================================================================

ALTER TABLE jeff_email_threads
ADD COLUMN IF NOT EXISTS ai_summary TEXT,
ADD COLUMN IF NOT EXISTS key_points TEXT[],
ADD COLUMN IF NOT EXISTS action_items TEXT[],
ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'urgent')),
ADD COLUMN IF NOT EXISTS summary_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}';

-- ============================================================================
-- 3. PROJECT ACTIVITY LOG TABLE
-- ============================================================================
-- Track project activity for context awareness and momentum tracking

CREATE TABLE IF NOT EXISTS jeff_project_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'task_created', 'task_completed', 'task_updated',
    'email_sent', 'email_received', 'email_responded',
    'file_created', 'file_modified', 'meeting',
    'note', 'milestone', 'other'
  )),
  entity_type TEXT, -- 'task', 'email_thread', 'file', etc.
  entity_id TEXT, -- Reference to the entity
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Email rules
CREATE INDEX IF NOT EXISTS idx_jeff_email_rules_active ON jeff_email_rules(active);
CREATE INDEX IF NOT EXISTS idx_jeff_email_rules_account ON jeff_email_rules(apply_to_account);
CREATE INDEX IF NOT EXISTS idx_jeff_email_rules_domain ON jeff_email_rules(from_domain);

-- Thread summaries
CREATE INDEX IF NOT EXISTS idx_jeff_threads_sentiment ON jeff_email_threads(sentiment);
CREATE INDEX IF NOT EXISTS idx_jeff_threads_summary_updated ON jeff_email_threads(summary_updated_at);

-- Project activity
CREATE INDEX IF NOT EXISTS idx_jeff_project_activity_project ON jeff_project_activity(project_id);
CREATE INDEX IF NOT EXISTS idx_jeff_project_activity_type ON jeff_project_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_jeff_project_activity_date ON jeff_project_activity(created_at DESC);

-- ============================================================================
-- 5. SEED INITIAL EMAIL RULES
-- ============================================================================

-- N8N error emails - low priority, auto-archive
INSERT INTO jeff_email_rules (name, description, sender_pattern, action, priority, apply_to_account, auto_archive_days)
VALUES (
  'N8N Error Emails',
  'Auto-categorize n8n workflow error notifications',
  '%n8n%',
  'auto_low_priority',
  'low',
  'all',
  7
) ON CONFLICT DO NOTHING;

-- Slovak job site - suggest unsubscribe
INSERT INTO jeff_email_rules (name, description, from_domain, action, apply_to_account)
VALUES (
  'Profesia.sk Jobs',
  'Slovak job postings - suggest unsubscribe',
  'profesia.sk',
  'suggest_unsubscribe',
  'all'
) ON CONFLICT DO NOTHING;

-- COBRA/Healthcare - urgent
INSERT INTO jeff_email_rules (name, description, keyword_patterns, action, priority, apply_to_account, tags)
VALUES (
  'Healthcare COBRA',
  'Time-sensitive healthcare enrollment',
  ARRAY['cobra', 'navia', 'healthcare enrollment', 'open enrollment', 'insurance deadline'],
  'auto_urgent',
  'urgent',
  'all',
  ARRAY['healthcare', 'time-sensitive']
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. HELPER FUNCTION: Apply Email Rules
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_email_rules(
  p_sender TEXT,
  p_subject TEXT,
  p_body TEXT,
  p_account TEXT
) RETURNS TABLE (
  rule_id UUID,
  rule_name TEXT,
  action TEXT,
  priority TEXT,
  project_id TEXT,
  tags TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.name,
    r.action,
    r.priority,
    r.project_id,
    r.tags
  FROM jeff_email_rules r
  WHERE r.active = true
    AND (r.apply_to_account = 'all' OR r.apply_to_account = p_account)
    AND (
      -- Domain match
      (r.from_domain IS NOT NULL AND p_sender ILIKE '%@' || r.from_domain)
      -- Sender pattern match
      OR (r.sender_pattern IS NOT NULL AND p_sender ILIKE r.sender_pattern)
      -- Subject pattern match
      OR (r.subject_pattern IS NOT NULL AND p_subject ILIKE r.subject_pattern)
      -- Keyword match
      OR (r.keyword_patterns IS NOT NULL AND (
        SELECT bool_or(
          p_subject ILIKE '%' || kw || '%' OR p_body ILIKE '%' || kw || '%'
        )
        FROM unnest(r.keyword_patterns) AS kw
      ))
    )
  ORDER BY
    CASE r.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
      ELSE 5
    END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. UPDATE RULE MATCH COUNT
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_rule_match(p_rule_id UUID) RETURNS void AS $$
BEGIN
  UPDATE jeff_email_rules
  SET match_count = match_count + 1,
      last_matched_at = now()
  WHERE id = p_rule_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'jeff_email_rules' as table_name, count(*) as row_count FROM jeff_email_rules
UNION ALL
SELECT 'jeff_project_activity', count(*) FROM jeff_project_activity;
