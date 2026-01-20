#!/usr/bin/env python3
"""
Memory Learning Sync - Syncs coaching learning data to Memory MCP.

Stores cross-session learning (acceptance rates, adjusted thresholds)
in the Memory MCP knowledge graph for persistence across sessions.

Location: ~/.claude/scripts/memory-learning-sync.py
"""

import json
import sys
import subprocess
from datetime import datetime
from pathlib import Path

LEARNING_FILE = Path.home() / ".claude" / "coaching-learning.json"


def load_learning() -> dict:
    """Load local learning data."""
    if LEARNING_FILE.exists():
        try:
            with open(LEARNING_FILE) as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "suggestion_stats": {},
        "adjusted_thresholds": {},
        "last_updated": None
    }


def sync_to_memory_mcp(learning: dict):
    """Sync learning data to Memory MCP."""

    # Format observations for the entity
    observations = []

    # Add suggestion stats
    stats = learning.get("suggestion_stats", {})
    for suggestion_type, data in stats.items():
        shown = data.get("shown", 0)
        accepted = data.get("accepted", 0)
        if shown > 0:
            rate = (accepted / shown) * 100
            observations.append(
                f"{suggestion_type}: {accepted}/{shown} accepted ({rate:.1f}% acceptance rate)"
            )

    # Add adjusted thresholds
    adjusted = learning.get("adjusted_thresholds", {})
    for suggestion_type, data in adjusted.items():
        modifier = data.get("modifier", 1)
        reason = data.get("reason", "unknown")
        observations.append(
            f"Threshold adjustment for {suggestion_type}: {modifier}x ({reason})"
        )

    observations.append(f"Last updated: {learning.get('last_updated', 'never')}")

    # This would call the Memory MCP to update the entity
    # For now, output the data that would be sent
    entity_update = {
        "name": "coaching-learning-data",
        "entityType": "learning",
        "observations": observations
    }

    return entity_update


def get_learning_summary():
    """Get a summary of learning data."""
    learning = load_learning()

    summary = {
        "total_suggestions_shown": 0,
        "total_accepted": 0,
        "total_declined": 0,
        "acceptance_rate": 0,
        "by_type": {},
        "adjustments": learning.get("adjusted_thresholds", {})
    }

    stats = learning.get("suggestion_stats", {})
    for suggestion_type, data in stats.items():
        shown = data.get("shown", 0)
        accepted = data.get("accepted", 0)
        declined = data.get("declined", 0)

        summary["total_suggestions_shown"] += shown
        summary["total_accepted"] += accepted
        summary["total_declined"] += declined

        if shown > 0:
            summary["by_type"][suggestion_type] = {
                "shown": shown,
                "accepted": accepted,
                "declined": declined,
                "acceptance_rate": (accepted / shown) * 100
            }

    if summary["total_suggestions_shown"] > 0:
        summary["acceptance_rate"] = (
            summary["total_accepted"] / summary["total_suggestions_shown"]
        ) * 100

    return summary


def main():
    """Main entry point."""
    if len(sys.argv) > 1:
        if sys.argv[1] == "summary":
            summary = get_learning_summary()
            print(json.dumps(summary, indent=2))
        elif sys.argv[1] == "sync":
            learning = load_learning()
            entity = sync_to_memory_mcp(learning)
            print(json.dumps(entity, indent=2))
    else:
        # Default: show summary
        summary = get_learning_summary()
        print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
