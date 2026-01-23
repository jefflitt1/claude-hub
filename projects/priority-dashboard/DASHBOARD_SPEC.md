# Personal Priority Dashboard - Design Specification

## Overview

A unified task/email management dashboard combining:
- Task list with due dates and priority scoring
- Kanban board view with customizable columns
- Email thread linking (personal + L7 accounts)
- Auto-prioritization with manual overrides
- Cross-account visibility

## Architecture Decision: Single Supabase Project

**Recommendation: Keep everything in one Supabase project (current setup).**

**Pros:**
- Single source of truth across all domains (L7 properties, JGL trading, personal tasks)
- Cross-project queries (e.g., tasks related to specific properties or trades)
- Unified authentication and RLS policies
- Lower cost (one project billing)
- Simplified backups and migrations

**When to split:**
- If Supabase project exceeds free tier limits significantly
- If you need to isolate L7 Partners data for compliance/client access
- If row counts exceed 500K+ with performance issues

**Current status:** ~80 tables, well within limits. Keep unified.

---

## Schema Design

### New Tables

```sql
-- Priority scoring breakdown
CREATE TABLE jeff_priority_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL, -- 'task' or 'email_thread'
    entity_id UUID NOT NULL,

    -- Auto-calculated factors (0-10 scale)
    deadline_factor NUMERIC(3,1) DEFAULT 0, -- Days until due
    sender_weight NUMERIC(3,1) DEFAULT 0,   -- VIP = 10, normal = 5
    urgency_keywords NUMERIC(3,1) DEFAULT 0, -- "urgent", "ASAP", etc.
    thread_activity NUMERIC(3,1) DEFAULT 0, -- Multiple replies = higher

    -- Composite score (weighted average)
    auto_score NUMERIC(3,1) GENERATED ALWAYS AS (
        (deadline_factor * 0.4) +
        (sender_weight * 0.2) +
        (urgency_keywords * 0.2) +
        (thread_activity * 0.2)
    ) STORED,

    -- Manual override (if set, takes precedence)
    manual_override NUMERIC(3,1) DEFAULT NULL,

    -- Final effective score
    effective_score NUMERIC(3,1) GENERATED ALWAYS AS (
        COALESCE(manual_override,
            (deadline_factor * 0.4) +
            (sender_weight * 0.2) +
            (urgency_keywords * 0.2) +
            (thread_activity * 0.2)
        )
    ) STORED,

    factors_json JSONB DEFAULT '{}', -- Detailed breakdown

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Kanban columns configuration
CREATE TABLE jeff_kanban_columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE, -- 'inbox', 'ready', 'in_progress', 'review', 'done'
    position INT NOT NULL,
    wip_limit INT DEFAULT NULL, -- NULL = unlimited
    color TEXT DEFAULT '#6B7280', -- Tailwind gray-500
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Default columns
INSERT INTO jeff_kanban_columns (name, slug, position, wip_limit, color, is_default) VALUES
    ('Inbox', 'inbox', 0, NULL, '#9CA3AF', true),
    ('Ready', 'ready', 1, NULL, '#3B82F6', false),
    ('In Progress', 'in_progress', 2, 3, '#F59E0B', false),
    ('Review', 'review', 3, NULL, '#8B5CF6', false),
    ('Done', 'done', 4, NULL, '#10B981', false);

-- Google Tasks sync table
CREATE TABLE jeff_google_tasks_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_task_id TEXT NOT NULL UNIQUE,
    google_list_id TEXT NOT NULL,
    google_list_name TEXT,
    jeff_task_id UUID REFERENCES jeff_tasks(id) ON DELETE SET NULL,

    -- Sync metadata
    last_synced_at TIMESTAMPTZ DEFAULT now(),
    sync_direction TEXT DEFAULT 'bidirectional', -- 'to_google', 'from_google', 'bidirectional'
    sync_status TEXT DEFAULT 'synced', -- 'synced', 'pending_push', 'pending_pull', 'conflict'

    -- Google task data cache
    google_data JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT now()
);

-- VIP senders for priority scoring
CREATE TABLE jeff_vip_senders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_pattern TEXT NOT NULL, -- Can be full email or domain like '@l7-partners.com'
    weight NUMERIC(3,1) DEFAULT 8, -- Priority boost (0-10)
    name TEXT,
    account TEXT, -- 'personal', 'l7', or NULL for both
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert some default VIPs
INSERT INTO jeff_vip_senders (email_pattern, weight, name, account) VALUES
    ('%@l7-partners.com', 8, 'L7 Partners Team', 'l7'),
    ('%@jglcap.com', 9, 'JGL Capital', 'personal'),
    ('mplittell@gmail.com', 10, 'Megan', 'personal');
```

### Schema Modifications

```sql
-- Add kanban column to jeff_tasks
ALTER TABLE jeff_tasks
    ADD COLUMN IF NOT EXISTS kanban_column TEXT DEFAULT 'inbox',
    ADD COLUMN IF NOT EXISTS kanban_position INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS priority_score NUMERIC(3,1) DEFAULT 5,
    ADD COLUMN IF NOT EXISTS email_thread_id UUID REFERENCES jeff_email_threads(id),
    ADD COLUMN IF NOT EXISTS account TEXT DEFAULT 'personal', -- 'personal', 'l7', 'jgl'
    ADD COLUMN IF NOT EXISTS google_task_id TEXT;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_tasks_kanban ON jeff_tasks(kanban_column, kanban_position);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON jeff_tasks(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_email ON jeff_tasks(email_thread_id);

-- Add more fields to email threads
ALTER TABLE jeff_email_threads
    ADD COLUMN IF NOT EXISTS priority_score NUMERIC(3,1) DEFAULT 5,
    ADD COLUMN IF NOT EXISTS is_vip_sender BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS urgency_keywords TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS response_deadline TIMESTAMPTZ;
```

---

## Priority Scoring Algorithm

```typescript
interface PriorityFactors {
  deadlineFactor: number;    // 0-10: Days until due (1 day = 10, 7 days = 5, 30+ = 0)
  senderWeight: number;      // 0-10: VIP = 8-10, normal = 5
  urgencyKeywords: number;   // 0-10: Based on subject/body keywords
  threadActivity: number;    // 0-10: Recent replies, thread length
}

function calculateDeadlineFactor(dueDate: Date | null): number {
  if (!dueDate) return 3; // No deadline = medium-low priority

  const daysUntil = differenceInDays(dueDate, new Date());

  if (daysUntil < 0) return 10;      // Overdue
  if (daysUntil === 0) return 10;    // Due today
  if (daysUntil <= 1) return 9;      // Due tomorrow
  if (daysUntil <= 3) return 7;      // Due in 3 days
  if (daysUntil <= 7) return 5;      // Due this week
  if (daysUntil <= 14) return 3;     // Due in 2 weeks
  return 1;                          // Due later
}

function calculateUrgencyKeywords(text: string): number {
  const urgentPatterns = [
    { pattern: /URGENT|ASAP|CRITICAL/i, score: 3 },
    { pattern: /immediately|right away|as soon as/i, score: 2 },
    { pattern: /deadline|due date|by (today|tomorrow|EOD)/i, score: 2 },
    { pattern: /important|priority|action required/i, score: 1 },
  ];

  let score = 0;
  for (const { pattern, score: points } of urgentPatterns) {
    if (pattern.test(text)) score += points;
  }

  return Math.min(score, 10); // Cap at 10
}
```

---

## Views for Dashboard

```sql
-- Unified task view with priority and email context
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
    -- Email context
    e.id as email_thread_id,
    e.subject as email_subject,
    e.gmail_thread_id,
    e.account as email_account,
    e.participants,
    e.ai_summary as email_summary,
    e.needs_response as email_needs_response,
    -- Priority breakdown
    ps.auto_score,
    ps.manual_override,
    ps.factors_json as priority_factors,
    -- Computed fields
    CASE
        WHEN t.due_date < now() THEN 'overdue'
        WHEN t.due_date < now() + interval '1 day' THEN 'due_today'
        WHEN t.due_date < now() + interval '3 days' THEN 'due_soon'
        ELSE 'normal'
    END as urgency_level,
    -- Google sync status
    gs.google_task_id,
    gs.sync_status as google_sync_status
FROM jeff_tasks t
LEFT JOIN jeff_email_threads e ON t.email_thread_id = e.id
LEFT JOIN jeff_priority_scores ps ON ps.entity_type = 'task' AND ps.entity_id = t.id
LEFT JOIN jeff_google_tasks_sync gs ON gs.jeff_task_id = t.id
WHERE t.status != 'completed' OR t.completed_at > now() - interval '7 days';

-- Kanban board summary
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
```

---

## Lovable Prompt Framework

```markdown
# Personal Priority Dashboard

Build a task and email management dashboard with the following features:

## Tech Stack
- React + TypeScript
- Tailwind CSS + shadcn/ui components
- Supabase for backend (existing database)
- Real-time subscriptions for live updates

## Core Features

### 1. Kanban Board View (Primary)
- 5 columns: Inbox, Ready, In Progress, Review, Done
- Drag-and-drop tasks between columns
- WIP limit indicator on In Progress (max 3)
- Color-coded by priority: Red (10-8), Orange (7-6), Yellow (5-4), Blue (3-1)
- Show email icon if task has linked email thread

### 2. List View (Alternative)
- Sortable table with columns: Title, Priority, Due Date, Project, Account
- Filter by: Account (Personal/L7/JGL), Project, Priority, Due Date Range
- Batch actions: Move to column, Change priority, Archive

### 3. Task Card Design
```
┌─────────────────────────────────────────┐
│ [🔴 9] Fix tenant lease renewal issue   │
│ L7 Partners • Due: Today                │
│ [📧] Email thread linked                │
│ Tags: [urgent] [lease] [property]       │
└─────────────────────────────────────────┘
```
- Priority badge with color + number
- Project name and due date
- Email indicator if linked
- Tags as pills

### 4. Task Detail Sidebar
When clicking a task:
- Full description (editable)
- Priority score breakdown (auto vs manual)
- Linked email thread preview (subject, sender, snippet)
- "Open in Gmail" button
- Due date picker
- Project selector
- Status/column selector
- Add/remove tags
- Mark complete button

### 5. Quick Actions
- `Cmd+K` command palette for:
  - Create new task
  - Search tasks
  - Change view (kanban/list)
  - Filter by project
- Quick add from anywhere: `+` button floating

### 6. Filters Bar
- Account filter: [All] [Personal] [L7] [JGL]
- Priority filter: [All] [High (8-10)] [Medium (5-7)] [Low (1-4)]
- Due date: [All] [Today] [This Week] [Overdue] [No Date]
- Project dropdown
- "Show completed" toggle

### 7. Email Integration
- Tasks can link to email threads
- Email sidebar shows:
  - Thread subject
  - Participants
  - AI summary (if available)
  - "View in Gmail" deep link
  - Action items extracted
- Create task from email (future)

### 8. Priority Scoring Display
- Show auto-calculated score
- Allow manual override (click to change)
- Tooltip showing breakdown:
  - Deadline factor: X/10
  - Sender weight: X/10
  - Urgency keywords: X/10
  - Thread activity: X/10

## Data Model

Connect to existing Supabase tables:
- `jeff_tasks` - Main task data
- `jeff_email_threads` - Email thread links
- `jeff_kanban_columns` - Column configuration
- `jeff_priority_scores` - Priority breakdown

## Real-time Features
- Subscribe to `jeff_tasks` changes
- Update board when tasks move/change
- Show toast notifications for changes

## Responsive Design
- Desktop: Full kanban board with sidebar
- Tablet: Kanban with collapsible sidebar
- Mobile: Swipeable columns or list view

## Color Scheme
Use existing dashboard theme colors:
- Background: slate-900
- Cards: slate-800
- Accent: blue-500
- Priority Red: red-500
- Priority Orange: orange-500
- Priority Yellow: yellow-500
- Success: green-500

## Authentication
Use existing Supabase auth (jeff@l7-partners.com)
```

---

## Integration Points

### 1. n8n Workflows

**Priority Scorer Workflow** (runs every 15 min):
1. Fetch tasks without recent priority update
2. For each task:
   - Check if linked to email thread
   - Calculate deadline factor
   - Check sender against VIP list
   - Scan for urgency keywords
   - Update jeff_priority_scores
3. Recalculate effective scores

**Google Tasks Sync Workflow** (runs every 30 min):
1. Fetch Google Tasks via API
2. Compare with jeff_google_tasks_sync
3. Push new/updated tasks to Google
4. Pull new/updated tasks from Google
5. Resolve conflicts (prefer newest)

### 2. jeff-agent Integration

The dashboard reads from `jeff_tasks` which is already managed by jeff-agent.
New tasks created in dashboard automatically appear in jeff-agent tools.

### 3. unified-comms Integration

Link tasks to email threads via `jeff_email_threads.gmail_thread_id`.
Deep link format: `https://mail.google.com/mail/u/0/#inbox/{thread_id}`

---

## Implementation Phases

### Phase 1: Core Dashboard (Week 1)
- [ ] Run schema migrations
- [ ] Build kanban board component
- [ ] Implement drag-and-drop
- [ ] Connect to Supabase real-time
- [ ] Basic filtering

### Phase 2: Priority System (Week 2)
- [ ] Implement priority scoring
- [ ] Build priority breakdown tooltip
- [ ] Manual override UI
- [ ] VIP sender management

### Phase 3: Email Integration (Week 3)
- [ ] Email thread sidebar
- [ ] Link task to email flow
- [ ] Gmail deep links
- [ ] AI summary display

### Phase 4: Google Tasks Sync (Week 4)
- [ ] n8n sync workflow
- [ ] Conflict resolution UI
- [ ] Sync status indicators
- [ ] Manual sync trigger

---

## SQL Migrations (Ready to Run)

Save as: `migrations/001_priority_dashboard.sql`

```sql
-- Run this in Supabase SQL Editor

-- 1. Priority scores table
CREATE TABLE IF NOT EXISTS jeff_priority_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    deadline_factor NUMERIC(3,1) DEFAULT 0,
    sender_weight NUMERIC(3,1) DEFAULT 0,
    urgency_keywords NUMERIC(3,1) DEFAULT 0,
    thread_activity NUMERIC(3,1) DEFAULT 0,
    manual_override NUMERIC(3,1) DEFAULT NULL,
    factors_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Kanban columns
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

INSERT INTO jeff_kanban_columns (name, slug, position, wip_limit, color, is_default) VALUES
    ('Inbox', 'inbox', 0, NULL, '#9CA3AF', true),
    ('Ready', 'ready', 1, NULL, '#3B82F6', false),
    ('In Progress', 'in_progress', 2, 3, '#F59E0B', false),
    ('Review', 'review', 3, NULL, '#8B5CF6', false),
    ('Done', 'done', 4, NULL, '#10B981', false)
ON CONFLICT (slug) DO NOTHING;

-- 3. Google Tasks sync
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

-- 4. VIP senders
CREATE TABLE IF NOT EXISTS jeff_vip_senders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_pattern TEXT NOT NULL,
    weight NUMERIC(3,1) DEFAULT 8,
    name TEXT,
    account TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO jeff_vip_senders (email_pattern, weight, name, account) VALUES
    ('%@l7-partners.com', 8, 'L7 Partners Team', 'l7'),
    ('%@jglcap.com', 9, 'JGL Capital', 'personal'),
    ('mplittell@gmail.com', 10, 'Megan', 'personal')
ON CONFLICT DO NOTHING;

-- 5. Add columns to jeff_tasks
ALTER TABLE jeff_tasks
    ADD COLUMN IF NOT EXISTS kanban_column TEXT DEFAULT 'inbox',
    ADD COLUMN IF NOT EXISTS kanban_position INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS priority_score NUMERIC(3,1) DEFAULT 5,
    ADD COLUMN IF NOT EXISTS email_thread_id UUID,
    ADD COLUMN IF NOT EXISTS account TEXT DEFAULT 'personal',
    ADD COLUMN IF NOT EXISTS google_task_id TEXT;

-- 6. Add indexes
CREATE INDEX IF NOT EXISTS idx_tasks_kanban ON jeff_tasks(kanban_column, kanban_position);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON jeff_tasks(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_email ON jeff_tasks(email_thread_id);
CREATE INDEX IF NOT EXISTS idx_priority_entity ON jeff_priority_scores(entity_type, entity_id);

-- 7. Add columns to email threads
ALTER TABLE jeff_email_threads
    ADD COLUMN IF NOT EXISTS priority_score NUMERIC(3,1) DEFAULT 5,
    ADD COLUMN IF NOT EXISTS is_vip_sender BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS urgency_keywords TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS response_deadline TIMESTAMPTZ;

-- 8. Dashboard view
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
    CASE
        WHEN t.due_date < now() THEN 'overdue'
        WHEN t.due_date < now() + interval '1 day' THEN 'due_today'
        WHEN t.due_date < now() + interval '3 days' THEN 'due_soon'
        ELSE 'normal'
    END as urgency_level,
    t.google_task_id
FROM jeff_tasks t
LEFT JOIN jeff_email_threads e ON t.email_thread_id = e.id
WHERE t.status != 'completed' OR t.completed_at > now() - interval '7 days';

-- 9. Kanban summary view
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

-- 10. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE jeff_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE jeff_kanban_columns;
```
