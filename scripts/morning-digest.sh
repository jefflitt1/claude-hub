#!/bin/bash
#
# Morning Digest - Headless Claude Automation
#
# Queries Feedly for unread articles, summarizes by category,
# and sends digest via Telegram.
#
# Usage:
#   ./morning-digest.sh              # Run with defaults
#   ./morning-digest.sh --dry-run    # Preview without sending
#   ./morning-digest.sh --email      # Send via email instead of Telegram
#
# Schedule with cron:
#   30 6 * * * /Users/jeff-probis/.claude/scripts/morning-digest.sh >> /Users/jeff-probis/.claude/logs/digest.log 2>&1

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$HOME/.claude/logs"
LOG_FILE="$LOG_DIR/digest-$(date +%Y%m%d).log"
DRY_RUN=false
SEND_EMAIL=false
TELEGRAM_CHAT="Jeff Littell"  # Your Telegram chat name

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --email)
            SEND_EMAIL=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting morning digest..."

# The prompt for Claude to execute
DIGEST_PROMPT='Generate my morning digest:

1. Use feedly_all_articles(count=15, unreadOnly=true) to get unread articles
2. Group articles by category (Markets, Real Estate, Other)
3. For each category, list top 3 articles with:
   - Title
   - Source
   - 1-sentence summary
4. Add a "Quick Takes" section with 2-3 key insights

Format the output as a clean, readable message suitable for Telegram.
Keep it concise - under 2000 characters total.

At the end, mark the articles as read using feedly_mark_read.'

# Build the claude command
CLAUDE_CMD="claude -p --model sonnet --permission-mode acceptEdits"

# Add appropriate output tool based on mode
if [ "$DRY_RUN" = true ]; then
    log "DRY RUN mode - will only preview digest"
    DIGEST_PROMPT="$DIGEST_PROMPT

DO NOT send any messages. Just output the formatted digest to stdout."
elif [ "$SEND_EMAIL" = true ]; then
    log "Email mode - will send via unified-comms"
    DIGEST_PROMPT="$DIGEST_PROMPT

After generating the digest, send it to jglittell@gmail.com with subject 'Morning Digest - $(date +%B\ %d)' using message_send from unified-comms."
else
    log "Telegram mode - will send to $TELEGRAM_CHAT"
    DIGEST_PROMPT="$DIGEST_PROMPT

After generating the digest, send it to '$TELEGRAM_CHAT' using mcp__telegram__send_message."
fi

# Execute
log "Running Claude headless..."

if OUTPUT=$($CLAUDE_CMD "$DIGEST_PROMPT" 2>&1); then
    log "Digest completed successfully"
    echo "$OUTPUT" >> "$LOG_FILE"

    if [ "$DRY_RUN" = true ]; then
        echo ""
        echo "=== DIGEST PREVIEW ==="
        echo "$OUTPUT"
        echo "======================"
    fi
else
    log "ERROR: Digest failed"
    echo "$OUTPUT" >> "$LOG_FILE"
    exit 1
fi

log "Morning digest complete"
