-- Jeff Agent Database Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- 1. Create jeff_tasks table
CREATE TABLE IF NOT EXISTS jeff_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'blocked', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  project_id TEXT,
  source_type TEXT CHECK (source_type IN ('manual', 'email', 'session', 'workflow')),
  source_id TEXT,
  due_date TIMESTAMPTZ,
  reminder_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 2. Create jeff_email_threads table
CREATE TABLE IF NOT EXISTS jeff_email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_thread_id TEXT NOT NULL,
  account TEXT NOT NULL CHECK (account IN ('personal', 'l7')),
  subject TEXT,
  participants JSONB,
  last_message_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'snoozed', 'waiting')),
  priority TEXT DEFAULT 'normal',
  project_id TEXT,
  needs_response BOOLEAN DEFAULT false,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(gmail_thread_id, account)
);

-- 3. Create jeff_associations table
CREATE TABLE IF NOT EXISTS jeff_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('email_thread', 'task', 'project', 'contact')),
  entity_id TEXT NOT NULL,
  related_type TEXT NOT NULL,
  related_id TEXT NOT NULL,
  relationship TEXT NOT NULL,
  confidence NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entity_type, entity_id, related_type, related_id, relationship)
);

-- 4. Create jeff_contacts table
CREATE TABLE IF NOT EXISTS jeff_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  company TEXT,
  default_account TEXT CHECK (default_account IN ('personal', 'l7')),
  project_ids TEXT[],
  tags TEXT[] DEFAULT '{}',
  last_contact_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_jeff_tasks_status ON jeff_tasks(status);
CREATE INDEX IF NOT EXISTS idx_jeff_tasks_priority ON jeff_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_jeff_tasks_project ON jeff_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_jeff_tasks_due_date ON jeff_tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_jeff_email_threads_account ON jeff_email_threads(account);
CREATE INDEX IF NOT EXISTS idx_jeff_email_threads_status ON jeff_email_threads(status);
CREATE INDEX IF NOT EXISTS idx_jeff_email_threads_project ON jeff_email_threads(project_id);

CREATE INDEX IF NOT EXISTS idx_jeff_associations_entity ON jeff_associations(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_jeff_associations_related ON jeff_associations(related_type, related_id);

CREATE INDEX IF NOT EXISTS idx_jeff_contacts_email ON jeff_contacts(email);

-- 6. Enable Row Level Security (optional - adjust as needed)
-- ALTER TABLE jeff_tasks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE jeff_email_threads ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE jeff_associations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE jeff_contacts ENABLE ROW LEVEL SECURITY;

-- Verification query
SELECT 'jeff_tasks' as table_name, count(*) as row_count FROM jeff_tasks
UNION ALL
SELECT 'jeff_email_threads', count(*) FROM jeff_email_threads
UNION ALL
SELECT 'jeff_associations', count(*) FROM jeff_associations
UNION ALL
SELECT 'jeff_contacts', count(*) FROM jeff_contacts;
