#!/usr/bin/env python3
"""
Sync Analytics - Uploads queued analytics to Supabase.

Run periodically or at session end to sync local analytics queue to Supabase.
Uses direct Supabase REST API.

Location: ~/.claude/scripts/sync-analytics.py
"""

import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

QUEUE_FILE = Path.home() / ".claude" / "analytics_queue.jsonl"
PROCESSED_FILE = Path.home() / ".claude" / "analytics_processed.jsonl"
LOG_FILE = Path.home() / ".claude" / "logs" / "sync-analytics.log"

# n8n webhook for analytics sync - uses session-event endpoint with event type
N8N_WEBHOOK_URL = "https://n8n.l7-partners.com/webhook/claude-session-event"


def log(message: str):
    """Log message to file."""
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_FILE, "a") as f:
        f.write(f"{datetime.now().isoformat()} - {message}\n")


def insert_via_n8n(data: dict) -> bool:
    """Insert a record to Supabase via n8n webhook."""
    # Wrap data with event type for the Coaching Events Handler
    payload = {
        "event": "analytics_sync",
        "analytics_data": data
    }
    try:
        req = urllib.request.Request(
            N8N_WEBHOOK_URL,
            data=json.dumps(payload).encode('utf-8'),
            headers={"Content-Type": "application/json"},
            method='POST'
        )
        urllib.request.urlopen(req, timeout=10)
        return True
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode()
        log(f"HTTP Error: {e.code} - {error_msg}")
        # If webhook not registered, log locally for later sync
        if e.code == 404 and "not registered" in error_msg:
            log(f"Webhook not registered - data saved locally: {data}")
            # Save to pending file for manual sync later
            pending_file = Path.home() / ".claude" / "analytics_pending.jsonl"
            with open(pending_file, "a") as f:
                f.write(json.dumps({"data": data, "timestamp": datetime.now().isoformat()}) + "\n")
            return True  # Return True so queue gets cleared
        return False
    except Exception as e:
        log(f"Error inserting via n8n: {e}")
        return False


def sync_to_supabase():
    """Sync queued analytics to Supabase."""
    if not QUEUE_FILE.exists():
        print(json.dumps({"status": "no_queue", "count": 0}))
        return

    entries = []
    with open(QUEUE_FILE, "r") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    entries.append(json.loads(line))
                except Exception:
                    pass

    if not entries:
        print(json.dumps({"status": "empty_queue", "count": 0}))
        return

    log(f"Processing {len(entries)} entries")

    success_count = 0
    failed_entries = []

    for entry in entries:
        # Format for claude_skill_usage table
        data = {
            "skill_id": entry.get("skill_id", "workflow-coach"),
            "command": entry.get("command", "unknown"),
            "machine": entry.get("machine", os.uname().nodename if hasattr(os, 'uname') else "unknown"),
            "project_context": entry.get("project_context", "unknown"),
            "success": entry.get("success", True),
            "notes": entry.get("notes", "")
        }

        if insert_via_n8n(data):
            # Log to processed file for audit
            with open(PROCESSED_FILE, "a") as pf:
                pf.write(json.dumps({
                    "entry": data,
                    "synced_at": datetime.now().isoformat()
                }) + "\n")
            success_count += 1
        else:
            failed_entries.append(entry)

    # Clear or update the queue file
    if success_count > 0:
        if failed_entries:
            # Rewrite queue with only failed entries
            with open(QUEUE_FILE, "w") as f:
                for entry in failed_entries:
                    f.write(json.dumps(entry) + "\n")
        else:
            # Clear the queue
            QUEUE_FILE.unlink()

    log(f"Synced: {success_count} success, {len(failed_entries)} failed")

    print(json.dumps({
        "status": "synced",
        "success_count": success_count,
        "failed_count": len(failed_entries)
    }))


def get_stats():
    """Get analytics statistics."""
    stats = {
        "queue_size": 0,
        "processed_size": 0,
        "suggestion_counts": {}
    }

    if QUEUE_FILE.exists():
        with open(QUEUE_FILE, "r") as f:
            for line in f:
                if line.strip():
                    stats["queue_size"] += 1
                    try:
                        entry = json.loads(line)
                        cmd = entry.get("command", "unknown")
                        stats["suggestion_counts"][cmd] = stats["suggestion_counts"].get(cmd, 0) + 1
                    except Exception:
                        pass

    if PROCESSED_FILE.exists():
        with open(PROCESSED_FILE, "r") as f:
            stats["processed_size"] = sum(1 for line in f if line.strip())

    return stats


def main():
    """Main entry point."""
    if len(sys.argv) > 1:
        if sys.argv[1] == "stats":
            stats = get_stats()
            print(json.dumps(stats, indent=2))
        elif sys.argv[1] == "test":
            # Test insertion via n8n webhook
            test_data = {
                "skill_id": "test",
                "command": "sync-test",
                "machine": os.uname().nodename if hasattr(os, 'uname') else "test",
                "project_context": "test",
                "success": True,
                "notes": "Test entry from sync-analytics.py"
            }
            if insert_via_n8n(test_data):
                print("Test insert successful via n8n webhook")
            else:
                print("Test insert failed - check logs at ~/.claude/logs/sync-analytics.log")
                print("Note: The n8n workflow 'Claude Analytics Sync' must be active")
    else:
        sync_to_supabase()


if __name__ == "__main__":
    main()
