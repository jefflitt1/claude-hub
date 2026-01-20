#!/bin/bash
# Claude Code Log Rotation Script
# Deletes debug logs older than specified days
# Usage: ./rotate-logs.sh [days] (default: 7)

CLAUDE_DEBUG_DIR="$HOME/.claude/debug"
DAYS_TO_KEEP="${1:-7}"

if [ ! -d "$CLAUDE_DEBUG_DIR" ]; then
    echo "Debug directory not found: $CLAUDE_DEBUG_DIR"
    exit 1
fi

echo "Rotating logs in: $CLAUDE_DEBUG_DIR"
echo "Keeping logs from last $DAYS_TO_KEEP days"
echo ""

# Count files before
BEFORE_COUNT=$(find "$CLAUDE_DEBUG_DIR" -name "*.txt" -type f | wc -l | tr -d ' ')
BEFORE_SIZE=$(du -sh "$CLAUDE_DEBUG_DIR" 2>/dev/null | cut -f1)

# Find and delete old logs
DELETED=$(find "$CLAUDE_DEBUG_DIR" -name "*.txt" -type f -mtime +$DAYS_TO_KEEP -delete -print | wc -l | tr -d ' ')

# Count files after
AFTER_COUNT=$(find "$CLAUDE_DEBUG_DIR" -name "*.txt" -type f | wc -l | tr -d ' ')
AFTER_SIZE=$(du -sh "$CLAUDE_DEBUG_DIR" 2>/dev/null | cut -f1)

echo "Results:"
echo "  Files before: $BEFORE_COUNT ($BEFORE_SIZE)"
echo "  Files deleted: $DELETED"
echo "  Files after: $AFTER_COUNT ($AFTER_SIZE)"
echo ""
echo "Done."
