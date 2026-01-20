# Pending SQL - Run in Supabase Dashboard

## saved_articles table (for Feedly integration)

```sql
CREATE TABLE IF NOT EXISTS saved_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  url TEXT,
  source_feed TEXT,
  category TEXT,
  summary TEXT,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  project_id TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX idx_saved_articles_category ON saved_articles(category);
CREATE INDEX idx_saved_articles_project ON saved_articles(project_id);
CREATE INDEX idx_saved_articles_saved_at ON saved_articles(saved_at DESC);

-- Enable RLS
ALTER TABLE saved_articles ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated access
CREATE POLICY "Enable all for authenticated users" ON saved_articles
  FOR ALL USING (true);
```

## claude_session_context table (for session-context MCP)

```sql
CREATE TABLE IF NOT EXISTS claude_session_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  active_project TEXT,
  working_context JSONB DEFAULT '{}',
  active_files TEXT[] DEFAULT '{}',
  recent_tasks JSONB DEFAULT '[]',
  session_summary TEXT,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_session_context_session ON claude_session_context(session_id);
CREATE INDEX idx_session_context_project ON claude_session_context(active_project);
```

---
Created: 2026-01-20
Run these in Supabase Dashboard → SQL Editor
