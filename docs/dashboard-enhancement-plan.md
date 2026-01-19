# Claude Hub Dashboard Enhancement Plan

## Status: Phase 1 Complete ✅
**Completed:** 2026-01-19 (Session 4)
**Migration file:** `docs/dashboard-schema-migration.sql`

---

## 1. Database Schema Enhancements

### Current State
The `n8n_workflows` table exists but needs integration with Claude Hub's entity system.

### ✅ COMPLETED - New Tables Created (2026-01-19)

#### `workflow_categories` - Organize workflows into meaningful groups
```sql
CREATE TABLE workflow_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#30363d',
    icon TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data
INSERT INTO workflow_categories (name, description, color, display_order) VALUES
('Production', 'Active, mission-critical workflows', '#238636', 1),
('Development', 'Workflows under active development', '#1f6feb', 2),
('Integration', 'Third-party service integrations', '#9e6a03', 3),
('Automation', 'Scheduled and trigger-based automations', '#6e40c9', 4),
('Templates', 'Reusable workflow templates', '#30363d', 5);
```

#### `workflow_executions_summary` - Track execution statistics
```sql
CREATE TABLE workflow_executions_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_n8n_id TEXT NOT NULL REFERENCES n8n_workflows(n8n_id),
    date DATE NOT NULL,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    avg_duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workflow_n8n_id, date)
);

CREATE INDEX idx_executions_summary_date ON workflow_executions_summary(date DESC);
```

#### `workflow_dependencies` - Track workflow interconnections
```sql
CREATE TABLE workflow_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_workflow_id TEXT NOT NULL,
    target_workflow_id TEXT NOT NULL,
    dependency_type TEXT NOT NULL, -- 'triggers', 'calls', 'shares_data'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_workflow_id, target_workflow_id, dependency_type)
);
```

#### Enhance `n8n_workflows` table
```sql
-- Add new columns for better organization
ALTER TABLE n8n_workflows ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES workflow_categories(id);
ALTER TABLE n8n_workflows ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal'; -- critical, high, normal, low
ALTER TABLE n8n_workflows ADD COLUMN IF NOT EXISTS owner TEXT;
ALTER TABLE n8n_workflows ADD COLUMN IF NOT EXISTS webhook_url TEXT;
ALTER TABLE n8n_workflows ADD COLUMN IF NOT EXISTS documentation_url TEXT;
ALTER TABLE n8n_workflows ADD COLUMN IF NOT EXISTS last_success_at TIMESTAMPTZ;
ALTER TABLE n8n_workflows ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMPTZ;
ALTER TABLE n8n_workflows ADD COLUMN IF NOT EXISTS error_count_7d INTEGER DEFAULT 0;
ALTER TABLE n8n_workflows ADD COLUMN IF NOT EXISTS success_count_7d INTEGER DEFAULT 0;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_workflows_project ON n8n_workflows(project);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON n8n_workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_active ON n8n_workflows(active);
```

#### `dashboard_sections` - Configurable dashboard layout
```sql
CREATE TABLE dashboard_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    collapsed_by_default BOOLEAN DEFAULT false,
    icon TEXT,
    color TEXT,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 2. UI/UX Design Improvements

### Current Issues
1. **Visual monotony** - All sections look identical, hard to scan
2. **No visual hierarchy** - Important items don't stand out
3. **Information density** - Too much info crammed into cards
4. **No status indicators** - Can't see health at a glance
5. **Flat structure** - No grouping within sections

### Proposed Improvements

#### A. Section Differentiation
Each major section gets a unique visual identity:

| Section | Accent Color | Icon | Border Style |
|---------|-------------|------|--------------|
| Projects | Blue (#58a6ff) | 📁 | Solid left border |
| n8n Workflows | Orange (#d29922) | ⚡ | Top gradient |
| Agents | Green (#3fb950) | 🤖 | Subtle glow |
| Skills | Purple (#a371f7) | ✨ | Dashed border |
| MCP Servers | Cyan (#79c0ff) | 🔌 | Double border |
| Prompts | Red (#f85149) | 📝 | Corner accent |

#### B. Collapsible Project Groups (for n8n Workflows)
```
▼ L7 Partners (4 workflows, 3 active)
   ├─ Master Tenant Management    [production] ●
   ├─ L7 Partners website submission [production] ●
   ├─ PDF to weaviate - L7        [production] ●
   └─ Lead Scraper to email       [approved] ○

▶ Claude Hub (4 workflows, 4 active)
▶ Personal (2 workflows, 2 active)
▶ PROBIS (4 workflows, 2 active)
▶ Tutorials (6 workflows, 2 active)
...
```

#### C. Status Indicators
- 🟢 Green dot = Active & healthy
- 🟡 Yellow dot = Active but has recent errors
- 🔴 Red dot = Critical/broken
- ⚪ Gray dot = Inactive/disabled

#### D. Quick Stats Bar
At the top of sections, show aggregate stats:
```
n8n Workflows  |  85 total  •  23 active  •  16 production  •  32 WIP  •  14 deprecated
```

#### E. Card Improvements
- **Hover preview**: Show more details on hover without clicking
- **Action buttons**: Quick links to n8n editor, logs, trigger
- **Service badges**: Show integrated services as small icons
- **Last run info**: "Last run: 2h ago ✓" or "Last run: 1d ago ✗"

---

## 3. Implementation Approach

### Phase 1: Database Updates
1. Run SQL migrations to add new tables/columns
2. Populate `workflow_categories` with initial data
3. Update existing workflows with category assignments

### Phase 2: API Enhancement
1. Add Supabase client to Express server
2. Create `/api/n8n-workflows` endpoint fetching from Supabase
3. Add `/api/n8n-workflows/by-project` grouped endpoint
4. Add `/api/dashboard-stats` for quick stats

### Phase 3: Frontend Updates
1. Add new CSS for section differentiation
2. Implement collapsible project groups
3. Add status indicators and quick stats
4. Improve card design with hover states

### Phase 4: Data Sync
1. Create n8n workflow to sync execution stats daily
2. Update `error_count_7d` and `success_count_7d` fields
3. Track `last_success_at` and `last_error_at`

---

## 4. n8n Workflows Section Design

### Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ ⚡ n8n WORKFLOWS                                    [Expand All] │
│─────────────────────────────────────────────────────────────────│
│ 85 total • 23 active • 16 production • 12 templates             │
├─────────────────────────────────────────────────────────────────┤
│ ▼ L7 Partners                                    4 workflows    │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Master Tenant Management           [production] ● 2h ago ✓  │ │
│ │ Telegram, Supabase, Gmail +4       53 nodes                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ L7 Partners website submission     [production] ● 1d ago ✓  │ │
│ │ Netlify, Gmail, Sheets             10 nodes                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ▶ Claude Hub                                     4 workflows    │
│ ▶ Personal                                       2 workflows    │
│ ▶ PROBIS                                         4 workflows    │
│ ▶ Magic Agent                                    3 workflows    │
└─────────────────────────────────────────────────────────────────┘
```

### Card Details (Expanded)
```
┌─────────────────────────────────────────────────────────────────┐
│ Master Tenant Management                                        │
│ [production] ● Active                           Last: 2h ago ✓  │
├─────────────────────────────────────────────────────────────────┤
│ AI-powered tenant chatbot for L7 Partners portal                │
├─────────────────────────────────────────────────────────────────┤
│ Services: [Telegram] [Supabase] [Gmail] [MongoDB] [+3]          │
│ Trigger: webhook    Nodes: 53    Created: Aug 2025              │
├─────────────────────────────────────────────────────────────────┤
│ [Open in n8n] [View Logs] [Trigger Now]                         │
└─────────────────────────────────────────────────────────────────┘
```
