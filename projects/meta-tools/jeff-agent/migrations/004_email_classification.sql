-- Jeff Agent Email Classification Migration
-- Migration 004: Add LLM classification columns and email processing pipeline support
-- Run in Supabase SQL Editor after 003_email_enhancements.sql
-- Depends on: priority-dashboard/migrations/003_action_proposals.sql (jeff_action_proposals table)
--
-- 10-Category Classification Scheme:
--   spam, marketing, orders, intel_cre, intel_markets, intel_general,
--   local, fyi, needs_response, urgent

-- ============================================================================
-- 1. ADD CLASSIFICATION COLUMNS TO EMAIL THREADS
-- ============================================================================

ALTER TABLE jeff_email_threads
ADD COLUMN IF NOT EXISTS classification TEXT CHECK (classification IN (
  'spam', 'marketing', 'orders',
  'intel_cre', 'intel_markets', 'intel_general',
  'local', 'fyi', 'needs_response', 'urgent'
)),
ADD COLUMN IF NOT EXISTS classification_confidence FLOAT CHECK (
  classification_confidence >= 0 AND classification_confidence <= 1
),
ADD COLUMN IF NOT EXISTS suggested_action TEXT CHECK (suggested_action IN (
  'auto_delete', 'auto_archive', 'archive_and_index', 'tag_status',
  'read', 'reply', 'create_task', 'create_proposal', 'suggest_draft',
  'notify', 'escalate'
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

CREATE INDEX IF NOT EXISTS idx_jeff_threads_intel
ON jeff_email_threads(classification, classified_at DESC)
WHERE classification IN ('intel_cre', 'intel_markets', 'intel_general');

CREATE INDEX IF NOT EXISTS idx_jeff_threads_actionable
ON jeff_email_threads(classification, priority)
WHERE classification IN ('needs_response', 'urgent');

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
  model TEXT NOT NULL, -- 'deepseek-r1:14b', 'deepseek-r1:32b', 'rule-based'
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
-- 4. EMAIL RULES TABLE (Rule-based fast path)
-- ============================================================================
-- Pre-classify known senders without LLM. Populated from Gmail filter analysis.

CREATE TABLE IF NOT EXISTS jeff_email_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,

  -- Match criteria (any combination)
  sender_pattern TEXT,        -- ILIKE pattern: '%@amazon.com', '%costar%'
  subject_pattern TEXT,       -- ILIKE pattern: '%order%', '%offering memo%'
  account TEXT,               -- 'personal', 'l7', or NULL for both

  -- Classification output
  classification TEXT NOT NULL CHECK (classification IN (
    'spam', 'marketing', 'orders',
    'intel_cre', 'intel_markets', 'intel_general',
    'local', 'fyi', 'needs_response', 'urgent'
  )),
  suggested_action TEXT NOT NULL CHECK (suggested_action IN (
    'auto_delete', 'auto_archive', 'archive_and_index', 'tag_status',
    'read', 'reply', 'create_task', 'create_proposal', 'suggest_draft',
    'notify', 'escalate'
  )),
  confidence FLOAT DEFAULT 0.95, -- Rule-based defaults to high confidence

  -- Metadata
  source TEXT DEFAULT 'gmail_filter', -- 'gmail_filter', 'manual', 'learned'
  is_active BOOLEAN DEFAULT true,
  priority INT DEFAULT 100, -- Lower = evaluated first (for ordering)

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_rules_active
ON jeff_email_rules(priority ASC)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_email_rules_sender
ON jeff_email_rules(sender_pattern)
WHERE sender_pattern IS NOT NULL AND is_active = true;

-- ============================================================================
-- 5. FUNCTION: Classify and Update Thread
-- ============================================================================
-- Called by n8n workflow after Ollama returns classification or rule matches

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
  v_needs_response BOOLEAN;
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
      AND active = true
  ) INTO v_is_vip;

  -- Map classification to priority (10 categories)
  v_priority := CASE p_classification
    WHEN 'urgent' THEN 'urgent'
    WHEN 'needs_response' THEN CASE WHEN v_is_vip THEN 'high' ELSE 'normal' END
    WHEN 'intel_cre' THEN CASE WHEN v_is_vip THEN 'high' ELSE 'normal' END
    WHEN 'intel_markets' THEN 'normal'
    WHEN 'intel_general' THEN 'low'
    WHEN 'orders' THEN 'low'
    WHEN 'local' THEN 'low'
    WHEN 'fyi' THEN 'low'
    WHEN 'marketing' THEN 'low'
    WHEN 'spam' THEN 'low'
    ELSE 'normal'
  END;

  -- Determine if thread needs response
  v_needs_response := p_classification IN ('needs_response', 'urgent');

  -- Update thread with classification
  UPDATE jeff_email_threads SET
    classification = p_classification,
    classification_confidence = p_confidence,
    suggested_action = p_suggested_action,
    classified_by = p_model,
    classified_at = now(),
    is_vip_sender = v_is_vip,
    priority = v_priority,
    needs_response = v_needs_response
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
    'needs_response', v_needs_response,
    'action', p_suggested_action
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. FUNCTION: Get Classification Analytics
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
-- 7. FUNCTION: Auto-Create Action Proposal from Classification
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
  v_thread RECORD;
  v_is_vip BOOLEAN := false;
BEGIN
  -- Create proposals for actionable classifications:
  -- - urgent & needs_response: always
  -- - intel_cre from VIP senders (e.g., OMs from brokers): surface for review
  IF p_classification NOT IN ('needs_response', 'urgent', 'intel_cre') THEN
    RETURN NULL;
  END IF;

  -- For intel_cre, only create proposals for VIP senders
  IF p_classification = 'intel_cre' THEN
    SELECT * INTO v_thread FROM jeff_email_threads WHERE id = p_thread_id;
    SELECT EXISTS(
      SELECT 1 FROM jeff_vip_senders
      WHERE v_thread.from_email ILIKE pattern
        AND active = true
    ) INTO v_is_vip;

    IF NOT v_is_vip THEN
      RETURN NULL; -- Non-VIP intel_cre just gets archived and indexed
    END IF;
  END IF;

  v_action_type := CASE p_classification
    WHEN 'urgent' THEN 'reply_email'
    WHEN 'needs_response' THEN 'reply_email'
    WHEN 'intel_cre' THEN 'review' -- VIP CRE intel → surface for review
    ELSE 'review'
  END;

  v_priority := CASE p_classification
    WHEN 'urgent' THEN 'urgent'
    WHEN 'needs_response' THEN 'high'
    WHEN 'intel_cre' THEN 'medium' -- VIP CRE gets medium priority
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
-- 8. FUNCTION: Apply Rule-Based Classification
-- ============================================================================
-- Attempts to classify an email using rules before falling back to LLM

CREATE OR REPLACE FUNCTION apply_email_rules(
  p_thread_id UUID,
  p_sender_email TEXT,
  p_subject TEXT,
  p_account TEXT DEFAULT NULL -- 'personal' or 'l7'
) RETURNS JSONB AS $$
DECLARE
  v_rule RECORD;
  v_result JSONB;
BEGIN
  -- Find first matching rule (ordered by priority)
  SELECT * INTO v_rule
  FROM jeff_email_rules
  WHERE is_active = true
    AND (sender_pattern IS NULL OR p_sender_email ILIKE sender_pattern)
    AND (subject_pattern IS NULL OR p_subject ILIKE subject_pattern)
    AND (account IS NULL OR account = p_account)
    -- Require at least one pattern to match
    AND (sender_pattern IS NOT NULL OR subject_pattern IS NOT NULL)
  ORDER BY priority ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('matched', false);
  END IF;

  -- If we have a thread_id, apply via classify_email_thread (updates the thread)
  IF p_thread_id IS NOT NULL THEN
    v_result := classify_email_thread(
      p_thread_id,
      v_rule.classification,
      v_rule.confidence,
      v_rule.suggested_action,
      'rule-based',
      'Matched rule: ' || v_rule.rule_name
    );

    RETURN v_result || jsonb_build_object(
      'matched', true,
      'rule_id', v_rule.id,
      'rule_name', v_rule.rule_name
    );
  END IF;

  -- No thread_id: just return the rule match without updating anything
  RETURN jsonb_build_object(
    'matched', true,
    'rule_id', v_rule.id,
    'rule_name', v_rule.rule_name,
    'classification', v_rule.classification,
    'confidence', v_rule.confidence,
    'action', v_rule.suggested_action
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'jeff_email_classifications' as table_name, count(*) as row_count FROM jeff_email_classifications
UNION ALL
SELECT 'jeff_email_rules', count(*) FROM jeff_email_rules
UNION ALL
SELECT 'jeff_email_threads (with classification)', count(*) FROM jeff_email_threads WHERE classification IS NOT NULL;
