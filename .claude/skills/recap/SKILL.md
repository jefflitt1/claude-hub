---
name: recap
description: Auto-detect session accomplishments and save to session log. Use when user says "recap", "what did we do", "save session", or at end of session. Handles concurrent terminals safely.
allowed-tools: Read, Write, Bash, Glob
---

# Session Recap Skill

Auto-detect what was accomplished in this session and save to session logs.

## Quick Reference

| Command | Action |
|---------|--------|
| `/recap` | Save this terminal's recap to log file |
| `/recap merge` | Consolidate all logs into session-notes.md |
| `/recap status` | Show pending log files |

## Instructions for `/recap`

### Step 0: Log Skill Invocation

Track this skill usage for analytics:

```bash
docker mcp tools call insert_row 'table=claude_skill_usage' 'data={
  "skill_id": "recap",
  "command": "/recap",
  "machine": "mac",
  "project_context": "PROJECT_ID",
  "success": true
}'
```

### Step 1: Generate Session ID

```
SESSION_ID = {terminal}_{YYYYMMDD}_{HHMM}
Example: mac_20260116_1430
```

### Step 2: Auto-Detect Accomplishments

Analyze the conversation history to identify:
- **Completed tasks** - What was built, fixed, configured, or deployed
- **Key decisions** - Architecture choices, tool selections, approaches
- **New open items** - Tasks discovered but not completed
- **Blockers resolved** - Problems that were solved
- **Skills invoked** - Which /skills were used (recap, done, context, deal-analysis, etc.)
- **Estimated token usage** - Count conversation turns × 2000 (rough estimate)

DO NOT ask the user. Infer from conversation.

### Step 3: Write Session Log

Write to: `~/claude-agents/docs/session-logs/{YYYYMMDD}_{SESSION_ID}.md`

Format:
```markdown
# Session Recap: {SESSION_ID}
**Time:** {timestamp}
**Terminal:** {mac|pi}
**Est. Tokens:** ~{turn_count * 2000}

## Completed
- Item 1
- Item 2

## Decisions Made
- Decision 1

## New Open Items
- Item 1

## Notes
Additional context
```

### Step 4: Auto-Merge and Git Sync

After saving the log file, AUTOMATICALLY run the merge process (do NOT ask):

1. Find all pending logs in `~/claude-agents/docs/session-logs/`
2. Read and consolidate all logs
3. Update session-notes.md
4. Archive the log files
5. **Git commit and push to sync across devices:**

```bash
cd ~/Documents/Claude\ Code/claude-agents 2>/dev/null || cd ~/Projects/claude-agents
git add -A
git commit -m "Session recap: $(date +%Y-%m-%d)"
git push
```

See "Instructions for `/recap merge`" below for details.

### Step 5: Save to Supabase

Insert the session log into the database for dashboard tracking:

```bash
docker mcp tools call insert_row 'table=claude_session_logs' 'data={
  "session_date": "YYYY-MM-DD",
  "session_number": N,
  "machine": "mac|pi",
  "project_id": "project-id-if-applicable",
  "summary": "One-line summary of session",
  "accomplishments": {"items": ["Item 1", "Item 2"]},
  "files_changed": {"files": ["file1.ts", "file2.tsx"]},
  "tokens_used": ESTIMATED_TOKENS,
  "turn_count": TURN_COUNT,
  "skills_invoked": ["recap", "other-skills-used"]
}'
```

Determine `session_number` by querying existing sessions for today:
```bash
docker mcp tools call execute_sql "query=SELECT COALESCE(MAX(session_number), 0) + 1 as next FROM claude_session_logs WHERE session_date = 'YYYY-MM-DD'"
```

Detect `project_id` from current working directory:
- `~/claude-agents/` → `claude-hub`
- `~/l7partners-rewrite/` → `l7partners-rewrite`
- `~/supabase-mcp-server/` → `null`
- `~/magic.md` or magic work → `magic-kb`

### Step 6: Update Token Usage Table

Update the `claude_token_usage` table for dashboard tracking. This table aggregates daily token usage.

First, check if today's entry exists:
```bash
docker mcp tools call execute_sql "query=SELECT id, input_tokens, output_tokens FROM claude_token_usage WHERE date = 'YYYY-MM-DD'"
```

If entry exists, delete and re-insert with updated totals (the table has a generated column):
```bash
docker mcp tools call delete_rows 'table=claude_token_usage' 'filters={"date": "YYYY-MM-DD"}'
```

Then insert the updated totals (estimate 60% input, 40% output):
```bash
docker mcp tools call insert_row 'table=claude_token_usage' 'data={
  "date": "YYYY-MM-DD",
  "input_tokens": TOTAL_INPUT,
  "output_tokens": TOTAL_OUTPUT,
  "model": "claude-opus-4-5",
  "machine": "mac",
  "notes": "Sessions X-Y"
}'
```

**Token estimation:**
- Input tokens ≈ 60% of total (context, tool results)
- Output tokens ≈ 40% of total (responses, tool calls)
- Total per session ≈ turn_count × 2000

To get cumulative total for today, query session logs:
```bash
docker mcp tools call execute_sql "query=SELECT SUM(tokens_used) as total FROM claude_session_logs WHERE session_date = 'YYYY-MM-DD' AND tokens_used IS NOT NULL"
```

### Step 7: Confirm

```
Recap saved and merged.

Session: {SESSION_ID}
- X completed items
- Y new open items
- ~Z tokens used

Saved to: claude_session_logs (Supabase)
Token usage updated in claude_token_usage.
Changes committed to claude-agents repo.
```

---

## Instructions for `/recap merge`

Can also be run standalone with `/recap merge`.

### Step 1: Find Pending Logs

```bash
ls ~/claude-agents/docs/session-logs/*.md 2>/dev/null | grep -v archive
```

If none found: "No session logs to merge."

### Step 2: Read and Consolidate

1. Read each log file
2. Combine "Completed" items (deduplicate)
3. Combine "Decisions Made"
4. Combine "New Open Items"

### Step 3: Update session-notes.md

Update `~/claude-agents/docs/session-notes.md`:
1. Update "Last Updated" date
2. Add completed items to "Completed This Session"
3. Update "Open Items" - add new, remove completed
4. Preserve existing structure

### Step 4: Archive Logs

```bash
mkdir -p ~/claude-agents/docs/session-logs/archive
mv ~/claude-agents/docs/session-logs/*.md ~/claude-agents/docs/session-logs/archive/
```

### Step 5: Commit

```bash
cd ~/claude-agents && git add -A && git commit -m "Merge session recaps: {date}" && git push
```

---

## Instructions for `/recap status`

1. List pending logs in `~/claude-agents/docs/session-logs/`
2. Show item count in each
3. Show last merge date from session-notes.md

Example:
```
Pending session logs:
- 20260116_mac_1430.md (5 completed, 2 open)

Last merge: 2026-01-15 (Session 2)
```
