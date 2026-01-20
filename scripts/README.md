# Claude Code Scripts

Location: `~/Documents/Claude Code/claude-agents/scripts/`

## Maintenance Scripts

### rotate-logs.sh
Deletes Claude Code debug logs older than N days (default: 7).

```bash
./rotate-logs.sh        # Delete logs older than 7 days
./rotate-logs.sh 14     # Delete logs older than 14 days
```

**Cron setup (optional):**
```bash
crontab -e
0 3 * * * ~/Documents/Claude\ Code/claude-agents/scripts/rotate-logs.sh 7 >> ~/.claude/logs/rotate.log 2>&1
```

### cron-analytics-sync.sh
Syncs coaching analytics to Supabase every 30 minutes.

```bash
crontab -e
*/30 * * * * ~/Documents/Claude\ Code/claude-agents/scripts/cron-analytics-sync.sh
```

## Python Scripts

| Script | Purpose |
|--------|---------|
| `sync-analytics.py` | Sync coaching analytics to Supabase |
| `session-init.py` | Initialize session context |
| `session-checkpoint.py` | Save session checkpoints |
| `memory-learning-sync.py` | Sync learning patterns to memory |
| `workflow-analyzer.py` | Analyze n8n workflow patterns |
| `telegram-mark-read-server.py` | HTTP server for Telegram mark-read |

## Directory Structure

```
claude-agents/
├── scripts/           # This directory (version controlled)
│   ├── *.sh           # Shell scripts
│   └── *.py           # Python scripts
└── docs/
    └── operations/    # Operational docs (moved from ~/.claude/docs/)

~/.claude/             # Claude Code app data (NOT version controlled)
├── debug/             # Session debug logs
├── logs/              # Cron job logs
├── history.jsonl      # Command history
└── preferences.json   # User preferences
```

## Notes

- Scripts that operate on Claude Code app data (debug/, logs/) still reference `~/.claude/`
- Scripts and docs are now version controlled in the project repo
- Logs output to `~/.claude/logs/` to keep app data separate from code
