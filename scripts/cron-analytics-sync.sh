#!/bin/bash
# Cron job for syncing Claude coaching analytics to Supabase
# Add to crontab: */30 * * * * ~/Documents/Claude\ Code/claude-agents/scripts/cron-analytics-sync.sh
#
# Location: ~/Documents/Claude Code/claude-agents/scripts/cron-analytics-sync.sh

LOG_FILE="$HOME/.claude/logs/cron-analytics.log"
SCRIPT="$HOME/Documents/Claude Code/claude-agents/scripts/sync-analytics.py"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Run sync
echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting analytics sync" >> "$LOG_FILE"
python3 "$SCRIPT" >> "$LOG_FILE" 2>&1
echo "$(date '+%Y-%m-%d %H:%M:%S') - Sync complete" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
