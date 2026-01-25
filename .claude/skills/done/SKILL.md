---
name: done
description: End-of-session command. Saves recap, merges to session-notes, commits, and confirms ready to exit. Use instead of typing "exit" directly.
allowed-tools: Read, Write, Bash, Glob
---

# Done Skill

End your session cleanly. This runs the full recap process and confirms you can exit.

## Workflow

When user types `/done`:

### Step 0: Log Skill Invocation

```bash
docker mcp tools call insert_row 'table=claude_skill_usage' 'data={
  "skill_id": "done",
  "command": "/done",
  "machine": "mac",
  "project_context": "PROJECT_ID",
  "success": true
}'
```

### Step 1: Generate Session ID

```
SESSION_ID = {terminal}_{YYYYMMDD}_{HHMM}
Example: mac_20260117_1530
```

Detect terminal from hostname or environment.

### Step 2: Auto-Detect Accomplishments

Analyze the conversation history to identify:
- **Completed tasks** - What was built, fixed, configured, or deployed
- **Key decisions** - Architecture choices, tool selections, approaches
- **New open items** - Tasks discovered but not completed
- **Blockers resolved** - Problems that were solved

DO NOT ask the user. Infer from conversation.

### Step 3: Write Session Log

Write to: `~/claude-agents/docs/session-logs/{YYYYMMDD}_{SESSION_ID}.md`

Format:
```markdown
# Session Recap: {SESSION_ID}
**Time:** {timestamp}
**Terminal:** {mac|pi}

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

### Step 4: Merge to Session Notes

1. Find all pending logs in `~/claude-agents/docs/session-logs/`
2. Read and consolidate all logs
3. Update `~/claude-agents/docs/session-notes.md`:
   - Update "Last Updated" date
   - Add completed items to "Completed This Session"
   - Update "Open Items" - add new, remove completed
4. Archive the log files to `~/claude-agents/docs/session-logs/archive/`

### Step 5: Commit and Push

```bash
cd ~/claude-agents && git add -A && git commit -m "Session recap: {SESSION_ID}" && git push
```

### Step 6: Confirm Exit Ready

Display:
```
Session complete.

Saved: {SESSION_ID}
- X completed items logged
- Y open items for next session

Changes pushed to claude-agents repo.

You can now type 'exit' to close the terminal.
```

## Key Differences from /recap

- `/done` is the END of session command - use it when you're finished working
- `/recap` can be used mid-session to checkpoint progress
- `/done` always runs the full merge and commit process
- `/done` ends with a clear "ready to exit" message
