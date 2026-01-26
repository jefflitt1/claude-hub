-- Self-Healing Infrastructure Database Migration
-- Run this in Supabase Dashboard > SQL Editor
-- Created: 2026-01-26

-- ============================================
-- Table: remediation_history
-- Stores historical remediation attempts for learning
-- ============================================
CREATE TABLE IF NOT EXISTS remediation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_signature TEXT NOT NULL,           -- Hash/fingerprint of the issue for matching
  symptoms JSONB NOT NULL DEFAULT '{}',    -- Full symptoms data
  diagnosis TEXT,                          -- AI diagnosis
  fix_applied TEXT,                        -- What fix was attempted
  fix_successful BOOLEAN,                  -- Did it work?
  execution_time_ms INTEGER,               -- How long the fix took
  workflow_execution_id TEXT,              -- n8n execution ID for tracing
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_remediation_signature ON remediation_history(issue_signature);
CREATE INDEX IF NOT EXISTS idx_remediation_created ON remediation_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_remediation_success ON remediation_history(fix_successful, created_at DESC);

-- ============================================
-- Table: known_issue_runbooks
-- Fast-path fixes for known issues (before AI)
-- ============================================
CREATE TABLE IF NOT EXISTS known_issue_runbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern TEXT NOT NULL,                   -- Pattern to match in error/issue text
  pattern_type TEXT DEFAULT 'contains',    -- 'contains', 'regex', 'exact'
  runbook_name TEXT NOT NULL,              -- Human-readable name
  runbook_command TEXT NOT NULL,           -- Command to execute
  cooldown_mins INTEGER DEFAULT 30,        -- Minimum time between executions
  priority INTEGER DEFAULT 100,            -- Lower = higher priority
  enabled BOOLEAN DEFAULT true,            -- Is this runbook active?
  success_count INTEGER DEFAULT 0,         -- Times this runbook succeeded
  failure_count INTEGER DEFAULT 0,         -- Times this runbook failed
  last_executed TIMESTAMPTZ,               -- When was it last run?
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_runbooks_enabled ON known_issue_runbooks(enabled, priority);
CREATE INDEX IF NOT EXISTS idx_runbooks_pattern ON known_issue_runbooks(pattern);

-- ============================================
-- Seed data: Common runbooks
-- ============================================
INSERT INTO known_issue_runbooks (pattern, pattern_type, runbook_name, runbook_command, cooldown_mins, priority)
VALUES
  ('disk.*9[0-9]%', 'regex', 'Clear Docker Cache', 'docker system prune -af', 60, 10),
  ('memory.*high', 'contains', 'Restart Claude Server', 'sudo systemctl restart claude-http-server', 30, 20),
  ('connection.*refused', 'contains', 'Restart Docker', 'sudo systemctl restart docker', 15, 30),
  ('ECONNREFUSED', 'contains', 'Check Service Status', 'systemctl status claude-http-server docker', 5, 40),
  ('timeout', 'contains', 'Check Network', 'ping -c 3 8.8.8.8; curl -s --max-time 5 ifconfig.me', 5, 50),
  ('out of memory', 'contains', 'Clear Memory Cache', 'sync; sudo sh -c "echo 3 > /proc/sys/vm/drop_caches"', 30, 15),
  ('no space left', 'contains', 'Clear Temp Files', 'sudo rm -rf /tmp/* /var/tmp/*; docker system prune -f', 60, 5),
  ('certificate', 'contains', 'Check SSL Certs', 'openssl s_client -connect localhost:3847 -servername localhost 2>/dev/null | openssl x509 -noout -dates', 60, 60)
ON CONFLICT DO NOTHING;

-- ============================================
-- View: Recent remediations summary
-- ============================================
CREATE OR REPLACE VIEW recent_remediations AS
SELECT
  issue_signature,
  COUNT(*) as attempt_count,
  SUM(CASE WHEN fix_successful THEN 1 ELSE 0 END) as success_count,
  MAX(created_at) as last_attempt,
  MAX(CASE WHEN fix_successful THEN fix_applied END) as last_successful_fix
FROM remediation_history
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY issue_signature
ORDER BY last_attempt DESC;

-- ============================================
-- Function: Get matching runbooks for an issue
-- ============================================
CREATE OR REPLACE FUNCTION get_matching_runbooks(issue_text TEXT)
RETURNS TABLE (
  id UUID,
  runbook_name TEXT,
  runbook_command TEXT,
  cooldown_mins INTEGER,
  priority INTEGER,
  can_execute BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.runbook_name,
    r.runbook_command,
    r.cooldown_mins,
    r.priority,
    (r.last_executed IS NULL OR r.last_executed < NOW() - (r.cooldown_mins || ' minutes')::INTERVAL) as can_execute
  FROM known_issue_runbooks r
  WHERE r.enabled = true
    AND (
      (r.pattern_type = 'contains' AND LOWER(issue_text) LIKE '%' || LOWER(r.pattern) || '%')
      OR (r.pattern_type = 'regex' AND issue_text ~* r.pattern)
      OR (r.pattern_type = 'exact' AND LOWER(issue_text) = LOWER(r.pattern))
    )
  ORDER BY r.priority ASC, r.success_count DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;
