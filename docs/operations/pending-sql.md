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

## telegram_chat_history table (for Telegram bot memory)

```sql
CREATE TABLE IF NOT EXISTS telegram_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_username TEXT NOT NULL,
  chat_id BIGINT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries by bot + chat_id (most recent first)
CREATE INDEX idx_chat_history_lookup
ON telegram_chat_history (bot_username, chat_id, created_at DESC);

-- Enable RLS
ALTER TABLE telegram_chat_history ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated access
CREATE POLICY "Enable all for authenticated users" ON telegram_chat_history
  FOR ALL USING (true);

-- Comment
COMMENT ON TABLE telegram_chat_history IS 'Stores Telegram bot conversation history for short-term memory';
```

## memory_graph table (for memory-session integration)

```sql
CREATE TABLE IF NOT EXISTS memory_graph (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_name TEXT UNIQUE NOT NULL,
  entity_type TEXT NOT NULL,
  observations TEXT[] DEFAULT '{}',
  relations JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_memory_graph_type ON memory_graph(entity_type);
CREATE INDEX idx_memory_graph_updated ON memory_graph(updated_at DESC);

-- Full text search on observations
CREATE INDEX idx_memory_graph_observations ON memory_graph USING GIN (observations);

-- Enable RLS
ALTER TABLE memory_graph ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated access
CREATE POLICY "Enable all for authenticated users" ON memory_graph
  FOR ALL USING (true);

-- Comment
COMMENT ON TABLE memory_graph IS 'Persistent storage for MCP memory graph entities, relations, and observations';
```

---
Created: 2026-01-20
Updated: 2026-01-20
Run these in Supabase Dashboard → SQL Editor
