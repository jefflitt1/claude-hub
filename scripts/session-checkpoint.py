#!/usr/bin/env python3
"""
Session Checkpoint - Called on Stop events to track session progress.
Enables the workflow coach to understand session state.

Integrates workflow analysis for end-of-session suggestions.

Location: ~/.claude/scripts/session-checkpoint.py
"""

import json
import sys
import logging
import subprocess
import urllib.request
from datetime import datetime
from pathlib import Path

# Setup logging
LOG_FILE = Path.home() / ".claude" / "logs" / "session-checkpoint.log"
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    filename=str(LOG_FILE),
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

STATE_FILE = Path.home() / ".claude" / "session-state.json"
PREFS_FILE = Path.home() / ".claude" / "preferences.json"
LEARNING_FILE = Path.home() / ".claude" / "coaching-learning.json"
SESSION_LOGS_DIR = Path.home() / "Documents" / "Claude Code" / "claude-agents" / "docs" / "session-logs"
AUTO_CAPTURE_FILE = Path.home() / ".claude" / "last-session-context.json"


def get_repo_path():
    """Find the claude-agents repo path (handles different locations)."""
    candidates = [
        Path.home() / "Projects" / "claude-agents",  # Mac Studio (non-iCloud)
        Path.home() / "Documents" / "Claude Code" / "claude-agents",  # MacBook
    ]
    for path in candidates:
        if (path / ".git").exists():
            return path
    return None


def git_sync_push():
    """Commit and push changes to sync across machines."""
    repo_path = get_repo_path()

    if not repo_path:
        logger.warning("Could not find claude-agents repo")
        return None

    try:
        # Check if there are changes to commit
        status_result = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=repo_path,
            capture_output=True,
            text=True,
            timeout=30
        )

        if not status_result.stdout.strip():
            logger.info("No changes to commit")
            return "no-changes"

        # Add common files that change during sessions
        subprocess.run(
            ["git", "add",
             "docs/",
             "scripts/",
             "skills/",
             "CLAUDE-personal.md",
             "CLAUDE.md",
             "projects/meta-tools/"],
            cwd=repo_path,
            capture_output=True,
            timeout=30
        )

        # Check if there's anything staged
        diff_result = subprocess.run(
            ["git", "diff", "--cached", "--quiet"],
            cwd=repo_path,
            capture_output=True,
            timeout=30
        )

        if diff_result.returncode == 0:
            logger.info("No staged changes to commit")
            return "no-staged"

        # Commit with auto-generated message
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        commit_result = subprocess.run(
            ["git", "commit", "-m", f"Auto-sync: session end {timestamp}"],
            cwd=repo_path,
            capture_output=True,
            text=True,
            timeout=30
        )

        if commit_result.returncode != 0:
            logger.error(f"Git commit failed: {commit_result.stderr}")
            return "commit-failed"

        # Pull with rebase first to avoid conflicts
        subprocess.run(
            ["git", "pull", "--rebase", "origin", "main"],
            cwd=repo_path,
            capture_output=True,
            text=True,
            timeout=60
        )

        # Push to remote
        push_result = subprocess.run(
            ["git", "push", "origin", "main"],
            cwd=repo_path,
            capture_output=True,
            text=True,
            timeout=60
        )

        if push_result.returncode == 0:
            logger.info("Git push successful")
            return "pushed"
        else:
            logger.error(f"Git push failed: {push_result.stderr}")
            return "push-failed"

    except subprocess.TimeoutExpired:
        logger.error("Git operation timed out")
        return "timeout"
    except Exception as e:
        logger.error(f"Git sync error: {e}")
        return "error"


def auto_capture_session(state: dict, prefs: dict):
    """Automatically capture session context for continuity."""
    try:
        prompt_count = state.get("prompt_count", 0)

        # Only capture if meaningful session (5+ prompts)
        if prompt_count < 5:
            logger.info(f"Skipping auto-capture: only {prompt_count} prompts")
            return

        session_context = {
            "captured_at": datetime.now().isoformat(),
            "session_id": state.get("session_id", ""),
            "prompt_count": prompt_count,
            "patterns_detected": list(state.get("patterns", {}).keys()),
            "tool_usage": state.get("tool_usage", {}),
            "high_activity_patterns": [k for k, v in state.get("patterns", {}).items() if v >= 3],
            "checkpoints": state.get("checkpoints", [])[-3:],  # Last 3 checkpoints
            "working_directory": state.get("working_directory", ""),
        }

        # Save locally for next session
        AUTO_CAPTURE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(AUTO_CAPTURE_FILE, "w") as f:
            json.dump(session_context, f, indent=2)
        logger.info(f"Auto-captured session context: {prompt_count} prompts")

        # Send to n8n for processing/storage
        send_webhook("session_capture", {
            "event": "auto_session_capture",
            "context": session_context
        }, prefs)

    except Exception as e:
        logger.error(f"Auto-capture failed: {e}")


def load_state() -> dict:
    """Load current session state."""
    if STATE_FILE.exists():
        try:
            with open(STATE_FILE) as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
        except Exception as e:
            logger.error(f"Error loading state: {e}")
    return {"prompt_count": 0, "tool_usage": {}, "checkpoints": []}


def save_state(state: dict):
    """Save session state."""
    try:
        STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(STATE_FILE, "w") as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving state: {e}")


def load_preferences() -> dict:
    """Load user preferences."""
    if PREFS_FILE.exists():
        try:
            with open(PREFS_FILE) as f:
                return json.load(f)
        except Exception:
            pass
    return {"coaching": {"enabled": True, "level": "moderate"}}


def send_webhook(endpoint: str, data: dict, prefs: dict):
    """Send webhook notification to n8n."""
    webhooks = prefs.get("n8n_webhooks", {})
    if not webhooks.get("enabled", False):
        return

    base_url = webhooks.get("base_url", "https://n8n.l7-partners.com/webhook")
    endpoints = webhooks.get("endpoints", {})
    url = base_url + endpoints.get(endpoint, f"/{endpoint}")

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        urllib.request.urlopen(req, timeout=5)
        logger.info(f"Webhook sent to {endpoint}")
    except Exception as e:
        logger.debug(f"Webhook failed (non-critical): {e}")


def analyze_session_end(state: dict, prefs: dict) -> list:
    """Analyze session state and return end-of-session suggestions."""
    suggestions = []

    if not prefs.get("coaching", {}).get("enabled", True):
        return suggestions

    prompt_count = state.get("prompt_count", 0)
    recap_ran = "recap" in state.get("suggestions_accepted", [])

    # Check if significant session without recap
    if prompt_count >= 10 and not recap_ran:
        suggestions.append({
            "type": "session_end_recap",
            "message": f"Session had {prompt_count} prompts.",
            "action": "Consider running /recap to save progress"
        })

        # Send webhook alert for sessions ending without recap
        send_webhook("session_event", {
            "event": "session_end_no_recap",
            "session_id": state.get("session_id"),
            "prompt_count": prompt_count,
            "patterns_detected": list(state.get("patterns", {}).keys())
        }, prefs)

    # Check for unfinished patterns (started tasks)
    patterns = state.get("patterns", {})
    high_activity = [k for k, v in patterns.items() if v >= 3]
    if high_activity and prompt_count >= 5:
        suggestions.append({
            "type": "pattern_summary",
            "message": f"High-activity patterns: {', '.join(high_activity)}",
            "action": "Consider creating commands for frequently used patterns"
        })

    return suggestions


def format_suggestions(suggestions: list) -> str:
    """Format suggestions for stderr output."""
    if not suggestions:
        return ""

    lines = ["\n[Workflow Coach]"]
    for s in suggestions:
        lines.append(f"  {s['message']}")
        lines.append(f"  → {s['action']}")
    return "\n".join(lines) + "\n"


def load_learning() -> dict:
    """Load cross-session learning data."""
    if LEARNING_FILE.exists():
        try:
            with open(LEARNING_FILE) as f:
                return json.load(f)
        except Exception:
            pass
    return {"suggestion_stats": {}, "adjusted_thresholds": {}, "last_updated": None}


def save_learning(learning: dict):
    """Save learning data."""
    try:
        learning["last_updated"] = datetime.now().isoformat()
        LEARNING_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(LEARNING_FILE, "w") as f:
            json.dump(learning, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving learning: {e}")


def detect_acceptance(state: dict) -> dict:
    """Detect which suggestions were acted upon."""
    outcomes = {}
    suggestions_made = state.get("suggestions_made", [])
    session_id = state.get("session_id", "")

    # Check if recap was run (look for session log file)
    if "session_end_recap" in suggestions_made:
        session_date = session_id.replace("session_", "").split("_")[0] if session_id else ""
        if session_date:
            # Look for any log file from today
            log_pattern = f"*{session_date}*.md"
            log_files = list(SESSION_LOGS_DIR.glob(log_pattern)) if SESSION_LOGS_DIR.exists() else []
            outcomes["session_end_recap"] = len(log_files) > 0

    # Check pattern-based suggestions
    if "create_command" in suggestions_made:
        # If patterns decreased, likely command was created
        patterns = state.get("patterns", {})
        previous_checkpoint = state.get("checkpoints", [{}])[-2] if len(state.get("checkpoints", [])) > 1 else {}
        prev_patterns = previous_checkpoint.get("patterns_detected", [])
        outcomes["create_command"] = len(patterns) < len(prev_patterns)

    return outcomes


def update_learning_from_session(state: dict, learning: dict) -> dict:
    """Update learning data based on session outcomes."""
    outcomes = detect_acceptance(state)
    stats = learning.get("suggestion_stats", {})

    for suggestion_type, accepted in outcomes.items():
        if suggestion_type not in stats:
            stats[suggestion_type] = {"shown": 0, "accepted": 0, "declined": 0}

        stats[suggestion_type]["shown"] += 1
        if accepted:
            stats[suggestion_type]["accepted"] += 1
            state.setdefault("suggestions_accepted", []).append(suggestion_type)
        else:
            stats[suggestion_type]["declined"] += 1
            state.setdefault("suggestions_declined", []).append(suggestion_type)

    learning["suggestion_stats"] = stats

    # Adjust thresholds based on acceptance rates
    adjusted = learning.get("adjusted_thresholds", {})
    for stype, data in stats.items():
        if data["shown"] >= 5:  # Only adjust after enough data
            acceptance_rate = data["accepted"] / data["shown"]
            if acceptance_rate < 0.2:
                adjusted[stype] = {"modifier": 1.5, "reason": "low_acceptance"}
                logger.info(f"Threshold increased for {stype}: acceptance rate {acceptance_rate:.0%}")
            elif acceptance_rate > 0.8:
                adjusted[stype] = {"modifier": 0.75, "reason": "high_acceptance"}
                logger.info(f"Threshold decreased for {stype}: acceptance rate {acceptance_rate:.0%}")

    learning["adjusted_thresholds"] = adjusted
    return learning


def main():
    """Record checkpoint on Stop event with workflow analysis."""
    logger.info("Stop event received - recording checkpoint")

    try:
        state = load_state()
        prefs = load_preferences()

        # Record checkpoint
        checkpoints = state.get("checkpoints", [])
        checkpoints.append({
            "time": datetime.now().isoformat(),
            "prompt_count": state.get("prompt_count", 0),
            "patterns_detected": list(state.get("patterns", {}).keys()),
            "suggestions_made": len(state.get("suggestions_made", []))
        })

        # Keep only last 10 checkpoints
        state["checkpoints"] = checkpoints[-10:]

        # Update learning from session outcomes
        learning = load_learning()
        if state.get("suggestions_made"):
            learning = update_learning_from_session(state, learning)
            save_learning(learning)
            logger.info(f"Learning updated: {learning.get('suggestion_stats', {})}")

        save_state(state)

        # Auto-capture session context for next session continuity
        auto_capture_session(state, prefs)

        logger.info(f"Checkpoint recorded: prompt_count={state.get('prompt_count', 0)}")

        # Auto-sync to remote for multi-machine sync
        sync_status = git_sync_push()
        if sync_status == "pushed":
            sys.stderr.write("\n[Git Sync] Changes pushed to remote\n")
        elif sync_status == "no-changes":
            pass  # Silent - no changes
        elif sync_status in ("push-failed", "commit-failed", "error"):
            sys.stderr.write(f"\n[Git Sync] Sync failed: {sync_status}\n")

        # Run workflow analysis for end-of-session suggestions
        suggestions = analyze_session_end(state, prefs)
        if suggestions:
            formatted = format_suggestions(suggestions)
            sys.stderr.write(formatted)
            logger.info(f"Suggestions output: {[s['type'] for s in suggestions]}")

        # Trigger analytics sync (fire and forget)
        try:
            subprocess.Popen(
                ["python3", str(Path.home() / ".claude" / "scripts" / "sync-analytics.py")],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            logger.info("Analytics sync triggered")
        except Exception as e:
            logger.debug(f"Analytics sync trigger failed: {e}")

        # Output for hook
        print(json.dumps({"continue": True}))

    except Exception as e:
        logger.error(f"Error in checkpoint: {e}")
        print(json.dumps({"continue": True, "error": str(e)}))


if __name__ == "__main__":
    main()
