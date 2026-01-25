#!/bin/bash
#
# Claude Automate - General-purpose headless Claude execution
#
# A wrapper for running Claude Code in headless mode with various presets.
#
# Usage:
#   claude-automate <preset> [options]
#   claude-automate --prompt "your prompt here"
#   claude-automate --file /path/to/prompt.txt
#
# Presets:
#   digest       - Morning Feedly digest
#   inbox-triage - Triage unread emails
#   portfolio    - L7 portfolio status check
#   market-scan  - Quick market scan
#   weekly       - Weekly summary report
#   cre-alerts   - CRE deal/article alerts
#   habits       - Habit and wellbeing check
#   backup       - Export memory graph to Supabase
#
# Options:
#   --dry-run    - Preview without executing actions
#   --model      - Model to use (default: sonnet)
#   --verbose    - Show full output
#   --log        - Log to file

set -e

# Defaults
MODEL="sonnet"
DRY_RUN=false
VERBOSE=false
LOG_OUTPUT=false
PRESET=""
CUSTOM_PROMPT=""
PROMPT_FILE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        digest|inbox-triage|portfolio|market-scan|weekly|cre-alerts|habits|backup)
            PRESET="$1"
            shift
            ;;
        --prompt)
            CUSTOM_PROMPT="$2"
            shift 2
            ;;
        --file)
            PROMPT_FILE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --model)
            MODEL="$2"
            shift 2
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --log)
            LOG_OUTPUT=true
            shift
            ;;
        --help|-h)
            echo "Usage: claude-automate <preset> [options]"
            echo ""
            echo "Presets:"
            echo "  digest        - Morning Feedly digest"
            echo "  inbox-triage  - Triage unread emails"
            echo "  portfolio     - L7 portfolio status check"
            echo "  market-scan   - Quick market scan"
            echo "  weekly        - Weekly summary report"
            echo "  cre-alerts    - CRE deal/article alerts"
            echo "  habits        - Habit and wellbeing check"
            echo "  backup        - Export memory graph to Supabase"
            echo ""
            echo "Options:"
            echo "  --prompt TEXT - Custom prompt"
            echo "  --file PATH   - Read prompt from file"
            echo "  --dry-run     - Preview without actions"
            echo "  --model NAME  - Model (default: sonnet)"
            echo "  --verbose     - Show full output"
            echo "  --log         - Log to ~/.claude/logs/"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Preset prompts
get_preset_prompt() {
    case $1 in
        digest)
            cat << 'EOF'
Generate a morning digest from Feedly:
1. Get top 15 unread articles using feedly_all_articles
2. Group by category (Markets, Real Estate, Other)
3. Summarize top 3 per category with title, source, and 1-sentence summary
4. Add 2-3 quick insights
Keep under 2000 characters. Mark articles as read when done.
EOF
            ;;
        inbox-triage)
            cat << 'EOF'
Triage my inbox:
1. Use jeff_triage_inbox(account="all", count=20) to scan recent emails
2. Categorize by priority (urgent, high, normal, low)
3. For urgent/high items, suggest a brief response or action
4. Track important threads using jeff_track_email_thread
5. Output a summary of what needs attention
EOF
            ;;
        portfolio)
            cat << 'EOF'
Generate L7 portfolio status:
1. Use l7_list_tables to see available data
2. Query properties table for current portfolio
3. Calculate key metrics: total units, occupancy, NOI
4. Note any properties needing attention
5. Format as a brief status report
EOF
            ;;
        market-scan)
            cat << 'EOF'
Quick market scan:
1. Get SPY, QQQ, IWM quotes using mcp__tradestation__marketData
2. Get VIX if available
3. Check Feedly Markets category for top 5 unread articles
4. Summarize: market direction, key movers, any notable news
Keep it brief - 500 characters max.
EOF
            ;;
        weekly)
            cat << 'EOF'
Generate weekly summary report:
1. Use jeff_list_tasks to get tasks completed this week
2. Check session-notes.md for session summaries from past 7 days
3. Query l7_sql for any L7 metrics changes this week
4. Summarize: accomplishments by project, pending items, upcoming priorities
5. Note any blockers or decisions needed
Format as a brief weekly report suitable for review.
EOF
            ;;
        cre-alerts)
            cat << 'EOF'
Check for CRE opportunities:
1. Use feedly_stream for Real Estate category, get 20 unread articles
2. Filter for: new listings, market reports, deal announcements
3. For any promising deals, extract: property type, location, size, price
4. Check l7_query for any tracked properties with status changes
5. Output: prioritized list of items needing attention
Mark reviewed articles as read.
EOF
            ;;
        habits)
            cat << 'EOF'
Habit and wellbeing check:
1. Use jeff_habit_status to get current habit tracking
2. Use jeff_habits_at_risk to identify streaks in danger
3. Use jeff_wellbeing_summary for recent PERMA scores
4. Summarize: habits on track, habits needing attention, wellbeing trends
5. Suggest one specific action to improve lowest-scoring area
Keep encouraging but actionable.
EOF
            ;;
        backup)
            cat << 'EOF'
Export memory and context to Supabase:
1. Use session_export_to_memory to save current session state
2. Use mcp__MCP_DOCKER__read_graph to get current memory graph state
3. For each important entity, ensure it's persisted to memory_graph table
4. Verify: count entities in Supabase vs in-memory graph
5. Report: entities synced, any sync errors, last backup time
This ensures memory persists across Docker restarts.
EOF
            ;;
        *)
            echo "Unknown preset: $1" >&2
            exit 1
            ;;
    esac
}

# Determine prompt
if [ -n "$CUSTOM_PROMPT" ]; then
    PROMPT="$CUSTOM_PROMPT"
elif [ -n "$PROMPT_FILE" ]; then
    if [ ! -f "$PROMPT_FILE" ]; then
        echo "Error: File not found: $PROMPT_FILE" >&2
        exit 1
    fi
    PROMPT=$(cat "$PROMPT_FILE")
elif [ -n "$PRESET" ]; then
    PROMPT=$(get_preset_prompt "$PRESET")
else
    echo "Error: Must specify a preset, --prompt, or --file" >&2
    echo "Run 'claude-automate --help' for usage" >&2
    exit 1
fi

# Add dry-run modifier
if [ "$DRY_RUN" = true ]; then
    PROMPT="$PROMPT

IMPORTANT: This is a DRY RUN. Do NOT send messages, emails, or make any changes.
Only output what you WOULD do, formatted for review."
fi

# Build command
CLAUDE_CMD="claude -p --model $MODEL --permission-mode acceptEdits"

# Execute
if [ "$LOG_OUTPUT" = true ]; then
    LOG_DIR="$HOME/.claude/logs"
    mkdir -p "$LOG_DIR"
    LOG_FILE="$LOG_DIR/automate-$(date +%Y%m%d-%H%M%S).log"
    echo "[$(date)] Running: $PRESET / custom prompt" >> "$LOG_FILE"
    OUTPUT=$($CLAUDE_CMD "$PROMPT" 2>&1 | tee -a "$LOG_FILE")
else
    OUTPUT=$($CLAUDE_CMD "$PROMPT" 2>&1)
fi

if [ "$VERBOSE" = true ]; then
    echo "$OUTPUT"
else
    # Show condensed output - last 20 lines
    echo "$OUTPUT" | tail -20
fi
