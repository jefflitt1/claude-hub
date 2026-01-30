# n8n Maintenance Awareness System

## Overview

Allows n8n workflows to skip execution during planned maintenance windows by checking the `planned_maintenance` Supabase table.

## Components

### 1. Supabase Table: `planned_maintenance`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `device_name` | text | Device under maintenance (e.g., "Mac Studio", "JLDesktop") |
| `start_time` | timestamptz | Maintenance start |
| `end_time` | timestamptz | Maintenance end |
| `reason` | text | Why (e.g., "Monthly restart", "OS update") |
| `status` | text | scheduled, in_progress, completed, cancelled |
| `affected_services` | text[] | Array of affected services |
| `notify_workflows` | boolean | Whether workflows should check this |
| `created_at` | timestamptz | Record creation time |

### 2. Sub-Workflow: "Check Maintenance Window"

**Location:** `n8n-workflows/check-maintenance-window.json`

**Returns:**
- `maintenance_active`: boolean
- `device_name`: string (if active)
- `reason`: string (if active)
- `end_time`: string (if active)

## Usage in Workflows

### Option A: Call Sub-Workflow (Recommended)

```
1. Add "Execute Workflow" node at start
2. Select "Check Maintenance Window" workflow
3. Add IF node checking {{ $json.maintenance_active }}
4. True branch → Stop/Skip execution
5. False branch → Continue normal flow
```

### Option B: Inline Query

Add this Supabase node at workflow start:

```sql
SELECT COUNT(*) as active FROM planned_maintenance
WHERE status IN ('scheduled', 'in_progress')
AND start_time <= NOW()
AND end_time >= NOW()
```

Then IF node: `{{ $json.active > 0 }}` → skip

## Scheduling Maintenance

### Via Supabase Dashboard

```sql
INSERT INTO planned_maintenance (device_name, start_time, end_time, reason, affected_services)
VALUES (
  'Mac Studio',
  '2026-02-01 02:00:00-05',
  '2026-02-01 02:30:00-05',
  'Monthly restart',
  ARRAY['ollama', 'docker']
);
```

### Via MCP (l7-business)

```
Use l7_insert tool with:
- table: planned_maintenance
- data: { device_name, start_time, end_time, reason, status: 'scheduled' }
```

## Rolling Maintenance Schedule

Per IT policy, monthly maintenance windows:

| Device | Window | Day |
|--------|--------|-----|
| Mac Studio | 2:00-2:30 AM ET | 1st Saturday |
| JLDesktop (PC1) | 2:30-3:00 AM ET | 1st Saturday |
| JLDesktop2 (PC2) | 3:00-3:30 AM ET | 1st Saturday |
| Pi (jeffn8nhost) | 3:30-4:00 AM ET | 1st Saturday |

## Workflows to Update

These workflows should check maintenance before executing:

- [ ] Self-Healing Monitor (`JaTL7b6ka9mH4MuJ`)
- [ ] Email Classification Pipeline
- [ ] Daily Backup
- [ ] Any workflow that touches Mac Studio services

## Marking Maintenance Complete

After maintenance:

```sql
UPDATE planned_maintenance
SET status = 'completed'
WHERE id = '<maintenance-id>';
```

Or via MCP: `l7_update` with status = 'completed'
