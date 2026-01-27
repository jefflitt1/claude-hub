-- Jeff Agent Email Classification Migration
-- Migration 004: Add LLM classification columns and email processing pipeline support
-- Run in Supabase SQL Editor after 003_email_enhancements.sql
-- Depends on: priority-dashboard/migrations/003_action_proposals.sql (jeff_action_proposals table)

-- ============================================================================
-- 1. ADD CLASSIFICATION COLUMNS TO EMAIL THREADS
-- ============================================================================

ALTER TABLE jeff_email_threads
ADD COLUMN IF NOT EXISTS classification TEXT CHECK (classification IN (
  'spam', 'marketing', 'fyi', 'needs_response', 'urgent'
)),
ADD COLUMN IF NOT EXISTS classification_confidence FLOAT CHECK (
  classification_confidence >= 0 AND classification_confidence <= 1
),
ADD COLUMN IF NOT EXISTS suggested_action TEXT CHECK (suggested_action IN (
  'archive', 'read', 'reply', 'create_task', 'escalate'
)),
ADD COLUMN IF NOT EXISTS classified_by TEXT, -- 'deepseek-r1:14b', 'claude-3.5-sonnet', 'rule-based'
ADD COLUMN IF NOT EXISTS classified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS from_email TEXT,
ADD COLUMN IF NOT EXISTS from_name TEXT,
ADD COLUMN IF NOT EXISTS snippet TEXT, -- First ~200 chars of body for quick preview
ADD COLUMN IF NOT EXISTS is_vip_sender BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS response_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS urgency_keywords TEXT[];

-- ============================================================================
-- 2. INDEXES FOR CLASSIFICATION QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_jeff_threads_classification
ON jeff_email_threads(classification)
WHERE classification IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jeff_threads_needs_response
ON jeff_email_threads(needs_response, priority)
WHERE needs_response = true AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_jeff_threads_vip
ON jeff_email_threads(is_vip_sender)
WHERE is_vip_sender = true;

CREATE INDEX IF NOT EXISTS idx_jeff_threads_from_email
ON jeff_email_threads(from_email);

-- ============================================================================
-- 3. EMAIL CLASSIFICATION RESULTS TABLE
-- ============================================================================
-- Stores every classification result for analytics and model improvement

CREATE TABLE IF NOT EXISTS jeff_email_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_thread_id UUID REFERENCES jeff_email_threads(id) ON DELETE CASCADE,
  gmail_message_id TEXT, -- Specific message classified

  -- Classification output
  classification TEXT NOT NULL,
  confidence FLOAT NOT NULL,
  suggested_action TEXT NOT NULL,
  reasoning TEXT, -- Model's reasoning for classification

  -- Model metadata
  model TEXT NOT NULL, -- 'deepseek-r1:14b', 'deepseek-r1:32b', 'claude-3.5-sonnet'
  inference_time_ms INT,
  token_count INT,

  -- Input context
  input_sender TEXT,
  input_subject TEXT,
  input_snippet TEXT,

  -- Feedback for model improvement
  was_correct BOOLEAN, -- User feedback on classification accuracy
  corrected_classification TEXT, -- What it should have been
  corrected_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_classifications_thread
ON jeff_email_classifications(email_thread_id);

CREATE INDEX IF NOT EXISTS idx_email_classifications_model
ON jeff_email_classifications(model, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_classifications_feedback
ON jeff_email_classifications(was_correct)
WHERE was_correct IS NOT NULL;

-- ============================================================================
-- 4. FUNCTION: Classify and Update Thread
-- ============================================================================
-- Called by n8n workflow after Ollama returns classification

CREATE OR REPLACE FUNCTION classify_email_thread(
  p_thread_id UUID,
  p_classification TEXT,
  p_confidence FLOAT,
  p_suggested_action TEXT,
  p_model TEXT,
  p_reasoning TEXT DEFAULT NULL,
  p_inference_time_ms INT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_thread RECORD;
  v_is_vip BOOLEAN := false;
  v_priority TEXT;
BEGIN
  -- Get thread
  SELECT * INTO v_thread FROM jeff_email_threads WHERE id = p_thread_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Thread not found');
  END IF;

  -- Check VIP status
  SELECT EXISTS(
    SELECT 1 FROM jeff_vip_senders
    WHERE v_thread.from_email ILIKE pattern
      AND is_active = true
  ) INTO v_is_vip;

  -- Map classification to priority
  v_priority := CASE p_classification
    WHEN 'urgent' THEN 'urgent'
    WHEN 'needs_response' THEN CASE WHEN v_is_vip THEN 'high' ELSE 'normal' END
    WHEN 'fyi' THEN 'low'
    WHEN 'marketing' THEN 'low'
    WHEN 'spam' THEN 'low'
    ELSE 'normal'
  END;

  -- Update thread with classification
  UPDATE jeff_email_threads SET
    classification = p_classification,
    classification_confidence = p_confidence,
    suggested_action = p_suggested_action,
    classified_by = p_model,
    classified_at = now(),
    is_vip_sender = v_is_vip,
    priority = v_priority,
    needs_response = (p_classification IN ('needs_response', 'urgent'))
  WHERE id = p_thread_id;

  -- Store classification record
  INSERT INTO jeff_email_classifications (
    email_thread_id, classification, confidence, suggested_action,
    model, reasoning, inference_time_ms,
    input_sender, input_subject, input_snippet
  ) VALUES (
    p_thread_id, p_classification, p_confidence, p_suggested_action,
    p_model, p_reasoning, p_inference_time_ms,
    v_thread.from_email, v_thread.subject, v_thread.snippet
  );

  RETURN jsonb_build_object(
    'thread_id', p_thread_id,
    'classification', p_classification,
    'confidence', p_confidence,
    'priority', v_priority,
    'is_vip', v_is_vip,
    'action', p_suggested_action
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. FUNCTION: Get Classification Analytics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_classification_analytics(
  p_days_back INT DEFAULT 30,
  p_model TEXT DEFAULT NULL
) RETURNS TABLE (
  classification TEXT,
  total_count BIGINT,
  avg_confidence NUMERIC,
  accuracy_rate NUMERIC,
  model TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.classification,
    COUNT(*)::BIGINT,
    ROUND(AVG(c.confidence)::NUMERIC, 3),
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE c.was_correct = true) /
      NULLIF(COUNT(*) FILTER (WHERE c.was_correct IS NOT NULL), 0),
      1
    ),
    c.model
  FROM jeff_email_classifications c
  WHERE c.created_at > now() - (p_days_back || ' days')::interval
    AND (p_model IS NULL OR c.model = p_model)
  GROUP BY c.classification, c.model
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. FUNCTION: Auto-Create Action Proposal from Classification
-- ============================================================================

CREATE OR REPLACE FUNCTION create_proposal_from_classification(
  p_thread_id UUID,
  p_classification TEXT,
  p_confidence FLOAT,
  p_draft_content JSONB DEFAULT NULL,
  p_model TEXT DEFAULT 'deepseek-r1:14b'
) RETURNS UUID AS $$
DECLARE
  v_proposal_id UUID;
  v_action_type TEXT;
  v_priority TEXT;
BEGIN
  -- Only create proposals for actionable classifications
  IF p_classification NOT IN ('needs_response', 'urgent') THEN
    RETURN NULL;
  END IF;

  v_action_type := CASE p_classification
    WHEN 'urgent' THEN 'reply_email'
    WHEN 'needs_response' THEN 'reply_email'
    ELSE 'review'
  END;

  v_priority := CASE p_classification
    WHEN 'urgent' THEN 'urgent'
    WHEN 'needs_response' THEN 'high'
    ELSE 'medium'
  END;

  INSERT INTO jeff_action_proposals (
    source_type, source_id, action_type, priority,
    draft_content, confidence, model_used,
    reasoning
  ) VALUES (
    'email_thread', p_thread_id, v_action_type, v_priority,
    p_draft_content, p_confidence, p_model,
    'Auto-generated from email classification: ' || p_classification
  )
  RETURNING id INTO v_proposal_id;

  RETURN v_proposal_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'jeff_email_classifications' as table_name, count(*) as row_count FROM jeff_email_classifications
UNION ALL
SELECT 'jeff_email_threads (with classification)', count(*) FROM jeff_email_threads WHERE classification IS NOT NULL;
