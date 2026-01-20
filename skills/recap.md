# Session Recap Skill

**Trigger:** `/recap` or "recap this session"

## Instructions

You are the Session Recap agent. Your job is to auto-detect what was accomplished in this session and update the session notes. Multiple terminals may run this skill concurrently, so you must handle conflicts.

### Step 1: Generate Session ID

Create a unique session identifier:
```
SESSION_ID = {terminal_type}_{timestamp}
Example: mac_20260115_2245
```

### Step 2: Auto-Detect Accomplishments

Analyze the conversation history to identify:
- **Completed tasks** - What was built, fixed, configured, or deployed?
- **Key decisions** - Architecture choices, tool selections, approaches taken
- **New open items** - Tasks discovered but not completed
- **Blockers resolved** - Problems that were solved
- **Credentials/URLs added** - New services, endpoints, or keys

DO NOT ask the user what was accomplished. Infer it from the conversation.

### Step 3: Write to Session Log (Append-Safe)

Write your recap to a timestamped log file to avoid conflicts:

```
~/claude-agents/docs/session-logs/{DATE}_{SESSION_ID}.md
```

Format:
```markdown
# Session Recap: {SESSION_ID}
**Time:** {timestamp}
**Terminal:** {mac|pi|other}

## Completed
- Item 1
- Item 2

## Decisions Made
- Decision 1

## New Open Items
- Item 1

## Notes
Any additional context
```

### Step 4: Merge to Main Notes (If Requested)

Only merge to `session-notes.md` if:
- User explicitly says "merge" or "finalize"
- OR this is the last/primary terminal closing

When merging:
1. Read all log files from today: `~/claude-agents/docs/session-logs/YYYYMMDD_*.md`
2. Deduplicate completed items
3. Update `session-notes.md` with consolidated info
4. Move merged log files to `~/claude-agents/docs/session-logs/archive/`

### Step 5: Extract Tasks to Jeff-Agent

For each item in "New Open Items", create a task in Jeff-Agent:

```
Use jeff_create_task with:
- title: The open item text
- description: Context from the session
- priority: normal (or high if marked urgent)
- project_id: Detected from working directory (l7-partners, jgl-capital, etc.)
- source_type: "session"
- tags: ["from-recap", relevant-tags]
```

This ensures actionable items are tracked, not just documented.

### Step 6: Commit and Push

```bash
cd ~/claude-agents
git add -A
git commit -m "Session recap: {brief_summary}"
git push
```

---

## Concurrency Handling

Multiple terminals can safely run `/recap` because:
1. Each writes to a **unique log file** (timestamped)
2. Main `session-notes.md` is only updated during explicit **merge**
3. Git handles the final sync

---

## Example Output

```
Recap saved to: ~/claude-agents/docs/session-logs/20260115_mac_2245.md

Detected:
- 3 completed items
- 1 new open item
- 0 blockers

Run `/recap merge` to consolidate all session logs into session-notes.md
```

---

## /recap merge Instructions

When user runs `/recap merge`, follow these steps:

### Step 1: Find All Pending Logs

```bash
ls ~/claude-agents/docs/session-logs/*.md 2>/dev/null | grep -v archive
```

If no files found, respond: "No session logs to merge."

### Step 2: Read and Consolidate

1. Read each log file in `~/claude-agents/docs/session-logs/`
2. Combine all "Completed" items (deduplicate if same item appears twice)
3. Combine all "Decisions Made"
4. Combine all "New Open Items"
5. Note which terminals/sessions contributed

### Step 3: Update session-notes.md

Read `~/claude-agents/docs/session-notes.md` and update:

1. **Update "Last Updated"** - Set to current date/session
2. **Add to "Completed This Session"** - Merge new completed items
3. **Update "Open Items"** - Add new items, remove completed ones
4. **Update any changed status** - MCP servers, architecture, etc.

Preserve the existing structure. Only modify sections that need updates.

### Step 4: Archive Merged Logs

```bash
mkdir -p ~/claude-agents/docs/session-logs/archive
mv ~/claude-agents/docs/session-logs/*.md ~/claude-agents/docs/session-logs/archive/
```

### Step 5: Commit and Push

```bash
cd ~/claude-agents
git add -A
git commit -m "Merge session recaps: {date}"
git push
```

### Example Output

```
Merged 3 session logs into session-notes.md:
- mac_20260115_2216 (8 items)
- pi_20260115_2230 (2 items)
- mac_20260115_2245 (4 items)

Archived to: ~/claude-agents/docs/session-logs/archive/

Changes:
- Added 12 completed items (2 duplicates removed)
- Added 3 new open items
- Removed 2 completed open items
```

---

## /recap status Instructions

When user runs `/recap status`:

1. List all pending log files in `~/claude-agents/docs/session-logs/`
2. Show count of items in each
3. Show last merge date from session-notes.md

Example output:
```
Pending session logs:
- 20260115_mac_2216.md (8 completed, 2 open)
- 20260115_pi_2230.md (2 completed, 0 open)

Last merge: 2026-01-15 (Session 2)
```

---

## Quick Commands

| Command | Action |
|---------|--------|
| `/recap` | Save this terminal's recap to log file |
| `/recap merge` | Consolidate all logs into session-notes.md |
| `/recap status` | Show pending log files |
