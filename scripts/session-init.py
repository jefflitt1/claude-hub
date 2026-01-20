#!/usr/bin/env python3
"""
Session Init - Called on SessionStart to initialize a fresh session state.

Clears previous session patterns and sets up clean state for new session.
Optionally loads learning data to apply adjusted thresholds.

Location: ~/.claude/scripts/session-init.py
"""

import json
import os
import sys
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

# Setup logging
LOG_FILE = Path.home() / ".claude" / "logs" / "session-init.log"
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    filename=str(LOG_FILE),
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# File locations
STATE_FILE = Path.home() / ".claude" / "session-state.json"
LEARNING_FILE = Path.home() / ".claude" / "coaching-learning.json"
PREFS_FILE = Path.home() / ".claude" / "preferences.json"
SESSION_LOGS_DIR = Path.home() / "Documents" / "Claude Code" / "claude-agents" / "docs" / "session-logs"
SESSION_NOTES = Path.home() / "Documents" / "Claude Code" / "claude-agents" / "docs" / "session-notes.md"
LAST_SESSION_CONTEXT = Path.home() / ".claude" / "last-session-context.json"

# Known projects for context loading
PROJECTS = {
    "l7partners-rewrite": {
        "name": "L7 Partners",
        "keywords": ["TMS", "tenant", "portal", "property"],
        "skills": ["/deal-analysis", "/n8n"]
    },
    "claude-agents": {
        "name": "Claude Hub",
        "keywords": ["dashboard", "agents", "skills", "MCP"],
        "skills": ["/recap", "/context"]
    },
    "jgl-capital": {
        "name": "JGL Capital",
        "keywords": ["trading", "signals", "backtest"],
        "skills": []
    },
    "meta-tools": {
        "name": "Meta-Tools",
        "keywords": ["MCP", "unified", "browser", "comms"],
        "skills": []
    }
}


def load_json_file(path: Path, default: dict = None) -> dict:
    """Load JSON file with fallback to default."""
    if path.exists():
        try:
            with open(path) as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error in {path}: {e}")
        except Exception as e:
            logger.error(f"Error loading {path}: {e}")
    return default or {}


def save_json_file(path: Path, data: dict):
    """Save data to JSON file."""
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving {path}: {e}")


def archive_previous_session(state: dict):
    """Archive previous session state if it had significant activity."""
    if state.get("prompt_count", 0) > 5:
        archive_dir = Path.home() / ".claude" / "session-archives"
        archive_dir.mkdir(parents=True, exist_ok=True)

        session_id = state.get("session_id", "unknown")
        archive_file = archive_dir / f"{session_id}.json"

        try:
            with open(archive_file, "w") as f:
                json.dump(state, f, indent=2)
            logger.info(f"Archived previous session: {session_id}")
        except Exception as e:
            logger.error(f"Error archiving session: {e}")


def create_fresh_state() -> dict:
    """Create a fresh session state."""
    session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    return {
        "session_start": datetime.now().isoformat(),
        "session_id": session_id,
        "prompt_count": 0,
        "patterns": {},
        "tool_usage": {},
        "suggestions_made": [],
        "suggestions_accepted": [],
        "suggestions_declined": [],
        "interjection_count": 0,
        "coach_enabled": True,
        "current_profile": "moderate",
        "project_context": os.getcwd()
    }


def load_learning_adjustments() -> dict:
    """Load learning data to apply threshold adjustments."""
    learning = load_json_file(LEARNING_FILE, {})
    return learning.get("adjusted_thresholds", {})


def detect_project(cwd: str) -> dict:
    """Detect project from current working directory."""
    cwd_lower = cwd.lower()
    for project_key, project_info in PROJECTS.items():
        if project_key in cwd_lower:
            return {"key": project_key, **project_info}
    return None


def load_last_session_capture() -> Optional[dict]:
    """Load auto-captured context from last session."""
    if LAST_SESSION_CONTEXT.exists():
        try:
            with open(LAST_SESSION_CONTEXT) as f:
                data = json.load(f)
            # Check if capture is recent (within last 24 hours)
            captured_at = datetime.fromisoformat(data.get("captured_at", "2000-01-01"))
            age_hours = (datetime.now() - captured_at).total_seconds() / 3600
            if age_hours < 24:
                return data
            logger.info(f"Last session capture too old ({age_hours:.1f} hours)")
        except Exception as e:
            logger.error(f"Error loading last session capture: {e}")
    return None


def get_recent_session_context(project_key: str = None) -> str:
    """Get recent session context from logs and notes."""
    context_lines = []

    # Try to get last session log
    if SESSION_LOGS_DIR.exists():
        log_files = sorted(SESSION_LOGS_DIR.glob("*.md"), key=lambda f: f.stat().st_mtime, reverse=True)

        # Filter by project if specified
        if project_key:
            project_logs = [f for f in log_files if project_key in f.name.lower()]
            if project_logs:
                log_files = project_logs

        if log_files:
            latest_log = log_files[0]
            try:
                content = latest_log.read_text()
                # Extract first 500 chars as summary
                lines = content.split('\n')[:15]
                summary = '\n'.join(lines)
                if len(summary) > 500:
                    summary = summary[:500] + "..."
                context_lines.append(f"## Last Session ({latest_log.name})")
                context_lines.append(summary)
            except Exception as e:
                logger.error(f"Error reading log {latest_log}: {e}")

    # Try to get recent notes from session-notes.md
    if SESSION_NOTES.exists():
        try:
            content = SESSION_NOTES.read_text()
            # Get last entry (usually marked with date header)
            lines = content.split('\n')
            # Find last date header
            for i in range(len(lines) - 1, -1, -1):
                if lines[i].startswith('## 202'):  # Date header like "## 2026-01-19"
                    recent = '\n'.join(lines[i:i+10])
                    context_lines.append(f"\n## Recent Notes")
                    context_lines.append(recent)
                    break
        except Exception as e:
            logger.error(f"Error reading session notes: {e}")

    return '\n'.join(context_lines) if context_lines else None


def main():
    """Initialize fresh session state."""
    logger.info("Session starting - initializing fresh state")

    try:
        # Load existing state to archive if significant
        existing_state = load_json_file(STATE_FILE, {})
        if existing_state:
            archive_previous_session(existing_state)

        # Create fresh state
        fresh_state = create_fresh_state()

        # Load and apply any learning adjustments
        adjustments = load_learning_adjustments()
        if adjustments:
            fresh_state["learning_adjustments"] = adjustments
            logger.info(f"Applied {len(adjustments)} learning adjustments")

        # Load preferences to check coaching status
        prefs = load_json_file(PREFS_FILE, {})
        coaching_enabled = prefs.get("coaching", {}).get("enabled", True)
        fresh_state["coach_enabled"] = coaching_enabled

        # Detect project from working directory
        cwd = os.getcwd()
        project = detect_project(cwd)
        if project:
            fresh_state["detected_project"] = project["key"]
            fresh_state["project_name"] = project["name"]
            logger.info(f"Detected project: {project['name']}")

        # Save fresh state
        save_json_file(STATE_FILE, fresh_state)

        logger.info(f"Session initialized: {fresh_state['session_id']}")

        # Output for hook
        print(json.dumps({
            "continue": True,
            "session_id": fresh_state["session_id"],
            "coaching_enabled": coaching_enabled,
            "detected_project": project["name"] if project else None,
            "message": "startup hook success: Success"
        }))

        # Auto-load context and output to stderr (shown to user)
        context_output = []

        if project:
            context_output.append(f"\n[Session Init] Project: {project['name']}")
            if project.get("skills"):
                context_output.append(f"  Relevant skills: {', '.join(project['skills'])}")

        # Load auto-captured context from last session
        last_capture = load_last_session_capture()
        if last_capture:
            fresh_state["last_session"] = {
                "session_id": last_capture.get("session_id"),
                "prompt_count": last_capture.get("prompt_count"),
                "patterns": last_capture.get("high_activity_patterns", [])
            }
            context_output.append(f"\n[Last Session] {last_capture.get('prompt_count', 0)} prompts")
            if last_capture.get("high_activity_patterns"):
                context_output.append(f"  Active patterns: {', '.join(last_capture['high_activity_patterns'])}")

        # Load recent session context
        recent_context = get_recent_session_context(project["key"] if project else None)
        if recent_context:
            context_output.append(f"\n[Auto-loaded Context]")
            context_output.append(recent_context)
        else:
            context_output.append("\n[Session Init] No recent session logs found. Run /context for Memory MCP context.")

        sys.stderr.write('\n'.join(context_output) + '\n')

    except Exception as e:
        logger.error(f"Error initializing session: {e}")
        print(json.dumps({"continue": True, "error": str(e)}))


if __name__ == "__main__":
    main()
