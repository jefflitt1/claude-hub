# Lovable Prompt: n8n Workflows Section

## Overview
Add a new "n8n Workflows" section to the Claude Hub dashboard. This section displays all 85 n8n workflows grouped by project, with collapsible groups, status indicators, and detailed workflow cards.

## Data Source

### Supabase Table: `n8n_workflows`
```sql
-- Query to fetch workflows grouped by project
SELECT
  n8n_id,
  name,
  active,
  project,
  status,
  services,
  trigger_type,
  node_count,
  purpose,
  recommendation,
  last_success_at,
  last_error_at,
  created_at,
  updated_at
FROM n8n_workflows
ORDER BY project, name;
```

### Supabase Connection
- Project URL: `donnmhbwhpjlmpnwgdqr.supabase.co`
- Use existing Supabase client from the app

## Section Design

### Visual Identity
- **Accent Color**: Orange (#d29922)
- **Icon**: Lightning bolt (⚡)
- **Border Style**: Top gradient (orange to transparent)

### Layout Structure
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
│                                                                 │
│ ▶ Claude Hub                                     4 workflows    │
│ ▶ Personal                                       2 workflows    │
│ ▶ PROBIS                                         4 workflows    │
└─────────────────────────────────────────────────────────────────┘
```

## Components Needed

### 1. N8nWorkflowsSection (main container)
```tsx
// Section with orange accent, collapsible project groups
interface N8nWorkflowsSectionProps {
  workflows: Workflow[];
}

// Features:
// - Section header with icon and "Expand All" button
// - Quick stats bar showing totals
// - List of ProjectGroup components
```

### 2. QuickStatsBar
```tsx
// Horizontal stats showing:
// - Total workflows count
// - Active count (where active = true)
// - Production count (where status = 'production')
// - Template count (where status = 'template')

// Style: Small text, separated by bullets (•)
// Colors: Numbers in white, labels in gray (#8b949e)
```

### 3. ProjectGroup (collapsible)
```tsx
interface ProjectGroupProps {
  projectName: string;
  workflows: Workflow[];
  isExpanded: boolean;
  onToggle: () => void;
}

// Features:
// - Clickable header with chevron (▼/▶)
// - Project name on left
// - Workflow count on right
// - Smooth expand/collapse animation
// - Show WorkflowCard list when expanded
```

### 4. WorkflowCard
```tsx
interface Workflow {
  n8n_id: string;
  name: string;
  active: boolean;
  project: string;
  status: 'production' | 'WIP' | 'template' | 'deprecated' | 'inactive';
  services: string[];  // Array of service names
  trigger_type: 'webhook' | 'schedule' | 'manual';
  node_count: number;
  purpose: string;
  last_success_at: string | null;
  last_error_at: string | null;
}

// Card layout:
// Row 1: Name | [status badge] | StatusDot | LastRun
// Row 2: Services (truncated) | Node count
```

### 5. StatusBadge
```tsx
// Pill-shaped badge showing workflow status
// Colors:
// - production: Green bg (#238636), white text
// - WIP: Blue bg (#1f6feb), white text
// - template: Gray bg (#30363d), gray text
// - deprecated: Red bg (#da3633), white text
// - inactive: Dark gray bg (#21262d), gray text
```

### 6. StatusDot
```tsx
// Small colored circle indicating health
// - Green (#3fb950): active && no recent errors
// - Yellow (#d29922): active && has recent errors (last_error_at > last_success_at)
// - Red (#f85149): critical/broken (deprecated with errors)
// - Gray (#484f58): inactive (active = false)
```

### 7. ServiceBadges
```tsx
// Small inline badges for integrated services
// Show first 3 services, then "+N" for overflow
// Example: [Telegram] [Supabase] [Gmail] +4

// Style: Tiny pills, dark bg (#21262d), light text (#8b949e)
```

### 8. LastRunIndicator
```tsx
// Shows relative time and success/fail
// Examples:
// - "2h ago ✓" (green checkmark)
// - "1d ago ✗" (red X)
// - "Never" (gray, if no last_success_at)
```

## Interaction Behavior

### Expand/Collapse
- Click project header to toggle that group
- "Expand All" / "Collapse All" button in section header
- Remember expanded state in localStorage

### Default State
- First project group expanded by default
- All others collapsed
- Show projects with most workflows first (or alphabetical)

### Hover Effects
- Cards: Slight border color change (#30363d → #484f58)
- Project headers: Background highlight

## CSS Variables (match existing theme)
```css
:root {
  --bg-primary: #0d1117;
  --bg-secondary: #161b22;
  --bg-tertiary: #21262d;
  --border-default: #30363d;
  --border-hover: #484f58;
  --text-primary: #f0f6fc;
  --text-secondary: #8b949e;
  --accent-orange: #d29922;
  --status-green: #3fb950;
  --status-yellow: #d29922;
  --status-red: #f85149;
  --status-gray: #484f58;
}
```

## Sample Data for Testing
```json
[
  {
    "n8n_id": "abc123",
    "name": "Master Tenant Management",
    "active": true,
    "project": "L7 Partners",
    "status": "production",
    "services": ["Telegram", "Supabase", "Gmail", "MongoDB", "Weaviate", "Claude", "Redis"],
    "trigger_type": "webhook",
    "node_count": 53,
    "purpose": "AI-powered tenant chatbot for L7 Partners portal",
    "last_success_at": "2026-01-17T20:00:00Z",
    "last_error_at": null
  },
  {
    "n8n_id": "def456",
    "name": "Daily Sports Briefing",
    "active": true,
    "project": "Personal",
    "status": "production",
    "services": ["Perplexity", "ESPN", "Claude", "Gmail"],
    "trigger_type": "schedule",
    "node_count": 12,
    "purpose": "Morning sports news digest via email",
    "last_success_at": "2026-01-17T07:00:00Z",
    "last_error_at": null
  },
  {
    "n8n_id": "ghi789",
    "name": "GitHub → Supabase Sync",
    "active": true,
    "project": "Claude Hub",
    "status": "production",
    "services": ["GitHub", "Supabase"],
    "trigger_type": "webhook",
    "node_count": 8,
    "purpose": "Sync JSON data from repo to Supabase tables",
    "last_success_at": "2026-01-17T18:00:00Z",
    "last_error_at": null
  }
]
```

## Integration Notes
- Place this section after the existing "Projects" section
- Use the same Supabase client already configured in the app
- Match the existing dark theme and card styles
- Make sure the section is responsive (stack cards on mobile)
