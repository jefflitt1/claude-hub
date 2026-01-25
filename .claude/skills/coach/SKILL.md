# Workflow Coach Stats Skill

View coaching analytics and session statistics.

## Quick Reference

| Command | Action |
|---------|--------|
| `/coach stats` | Show coaching statistics |
| `/coach status` | Current session status |
| `/coach disable` | Disable coaching for session |
| `/coach enable` | Re-enable coaching |

## Instructions for `/coach stats`

### Step 1: Query Supabase for Recent Stats

Get skill usage data from the last 7 days:

```bash
docker mcp tools call execute_sql "query=SELECT
  skill_id,
  command,
  COUNT(*) as count,
  COUNT(CASE WHEN success THEN 1 END) as success_count
FROM claude_skill_usage
WHERE invoked_at > NOW() - INTERVAL '7 days'
AND skill_id LIKE '%coach%' OR command LIKE '%coach%'
GROUP BY skill_id, command
ORDER BY count DESC"
```

### Step 2: Get Session Statistics

Query session logs for coaching-related patterns:

```bash
docker mcp tools call execute_sql "query=SELECT
  session_date,
  session_number,
  tokens_used,
  turn_count,
  skills_invoked
FROM claude_session_logs
WHERE session_date > CURRENT_DATE - INTERVAL '7 days'
ORDER BY session_date DESC, session_number DESC
LIMIT 10"
```

### Step 3: Read Local Learning Data

Read the coaching learning file:

```bash
cat ~/.claude/coaching-learning.json
```

### Step 4: Get Queue Status

Check analytics queue:

```bash
python3 ~/.claude/scripts/sync-analytics.py stats
```

### Step 5: Display Summary

Format the output as a table:

```
## Workflow Coach Stats (Last 7 Days)

### Suggestion Patterns
| Pattern | Count | Accepted | Declined |
|---------|-------|----------|----------|
| repetitive_task | X | Y | Z |
| complex_workflow | X | Y | Z |

### Session Activity
| Date | Sessions | Tokens | Avg Turns |
|------|----------|--------|-----------|
| 2026-01-18 | 2 | 120k | 40 |

### Learning Adjustments
- pattern_x: threshold adjusted to Y (was Z)

### Queue Status
- Pending: X entries
- Processed: Y entries
```

---

## Instructions for `/coach status`

### Step 1: Read Current Session State

```bash
cat ~/.claude/session-state.json
```

### Step 2: Display Status

```
## Current Session Status

Session ID: session_20260118_1301
Started: 2026-01-18T13:01:00
Prompts: 45
Patterns Detected: 3
Suggestions Made: 2
Coaching: Enabled
Profile: moderate
```

---

## Instructions for `/coach disable`

### Step 1: Update Session State

Update `~/.claude/session-state.json` to set `coach_enabled: false`

### Step 2: Confirm

```
Workflow coaching disabled for this session.
Run `/coach enable` to re-enable.
```

---

## Instructions for `/coach enable`

### Step 1: Update Session State

Update `~/.claude/session-state.json` to set `coach_enabled: true`

### Step 2: Confirm

```
Workflow coaching re-enabled.
```
