#!/usr/bin/env python3
"""
Workflow Analyzer - Enhanced version with full integrations.

Features:
1. Pattern detection and proactive interjections
2. User preference support (coaching levels, thresholds)
3. Project profile detection
4. Supabase analytics logging
5. Memory MCP cross-session learning
6. n8n webhook integration for alerts

Location: ~/.claude/scripts/workflow-analyzer.py
"""

import json
import sys
import os
import subprocess
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

# File locations
STATE_FILE = Path.home() / ".claude" / "session-state.json"
PREFS_FILE = Path.home() / ".claude" / "preferences.json"
PROFILES_FILE = Path.home() / ".claude" / "coaching-profiles.json"
LEARNING_FILE = Path.home() / ".claude" / "coaching-learning.json"


def load_json_file(path: Path, default: dict = None) -> dict:
    """Load JSON file with fallback to default."""
    if path.exists():
        try:
            with open(path) as f:
                return json.load(f)
        except Exception:
            pass
    return default or {}


def save_json_file(path: Path, data: dict):
    """Save data to JSON file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


def load_preferences() -> dict:
    """Load user preferences with defaults."""
    defaults = {
        "coaching": {"level": "moderate", "enabled": True},
        "interjection_thresholds": {
            "repetition_trigger": 2,
            "complexity_steps": 5,
            "context_warning_turns": 30,
            "min_session_minutes": 5,
            "max_interjections_per_10_prompts": 1
        },
        "disabled_suggestions": [],
        "analytics": {
            "log_to_supabase": True,
            "log_to_memory": True,
            "track_acceptance_rate": True
        },
        "n8n_webhooks": {
            "enabled": True,
            "base_url": "https://n8n.l7-partners.com/webhook",
            "endpoints": {
                "session_event": "/claude-session-event",
                "interjection": "/claude-interjection",
                "pattern_alert": "/claude-pattern-alert"
            }
        }
    }
    prefs = load_json_file(PREFS_FILE, defaults)
    # Merge with defaults for any missing keys
    for key, value in defaults.items():
        if key not in prefs:
            prefs[key] = value
        elif isinstance(value, dict):
            for subkey, subvalue in value.items():
                if subkey not in prefs[key]:
                    prefs[key][subkey] = subvalue
    return prefs


def load_profiles() -> dict:
    """Load coaching profiles."""
    return load_json_file(PROFILES_FILE, {"profiles": {}})


def load_learning() -> dict:
    """Load cross-session learning data."""
    return load_json_file(LEARNING_FILE, {
        "suggestion_stats": {},
        "adjusted_thresholds": {},
        "last_updated": None
    })


def save_learning(data: dict):
    """Save learning data."""
    data["last_updated"] = datetime.now().isoformat()
    save_json_file(LEARNING_FILE, data)


def load_state() -> dict:
    """Load current session state."""
    return load_json_file(STATE_FILE, {
        "session_start": datetime.now().isoformat(),
        "session_id": f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "prompt_count": 0,
        "patterns": {},
        "tool_usage": {},
        "suggestions_made": [],
        "suggestions_accepted": [],
        "suggestions_declined": [],
        "interjection_count": 0,
        "coach_enabled": True,
        "current_profile": "moderate"
    })


def save_state(state: dict):
    """Save session state."""
    save_json_file(STATE_FILE, state)


def detect_project_profile(prompt: str, prefs: dict, profiles: dict) -> str:
    """Detect appropriate coaching profile based on prompt content."""
    prompt_lower = prompt.lower()

    mappings = profiles.get("project_type_mappings", {})

    for project_type, config in mappings.items():
        indicators = config.get("indicators", [])
        if any(ind in prompt_lower for ind in indicators):
            return config.get("profile", "moderate")

    return prefs.get("coaching", {}).get("level", "moderate")


def get_profile_config(profile_name: str, profiles: dict) -> dict:
    """Get configuration for a specific profile."""
    profile_configs = profiles.get("profiles", {})
    return profile_configs.get(profile_name, profile_configs.get("moderate", {}))


def should_interject(state: dict, prefs: dict, suggestion_type: str) -> bool:
    """Determine if we should make an interjection."""
    # Check if coaching is enabled
    if not prefs.get("coaching", {}).get("enabled", True):
        return False

    if not state.get("coach_enabled", True):
        return False

    # Check if suggestion type is disabled
    disabled = prefs.get("disabled_suggestions", [])
    if suggestion_type in disabled:
        return False

    # Check interjection rate limit
    thresholds = prefs.get("interjection_thresholds", {})
    max_per_10 = thresholds.get("max_interjections_per_10_prompts", 1)
    prompt_count = state.get("prompt_count", 0)
    interjection_count = state.get("interjection_count", 0)

    if prompt_count > 0:
        rate = (interjection_count / prompt_count) * 10
        if rate >= max_per_10:
            return False

    # Check minimum session time
    min_minutes = thresholds.get("min_session_minutes", 5)
    session_start = state.get("session_start")
    if session_start:
        try:
            start_time = datetime.fromisoformat(session_start)
            elapsed = (datetime.now() - start_time).total_seconds() / 60
            if elapsed < min_minutes:
                return False
        except Exception:
            pass

    # Check if already suggested this session
    if suggestion_type in state.get("suggestions_made", []):
        return False

    return True


def send_webhook(endpoint: str, data: dict, prefs: dict):
    """Send data to n8n webhook."""
    webhooks = prefs.get("n8n_webhooks", {})
    if not webhooks.get("enabled", False):
        return

    base_url = webhooks.get("base_url", "")
    endpoints = webhooks.get("endpoints", {})
    url = base_url + endpoints.get(endpoint, "")

    if not url:
        return

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        pass  # Fail silently


def log_to_supabase(suggestion_type: str, message: str, accepted: bool, state: dict, prefs: dict):
    """Log interjection to Supabase via MCP."""
    if not prefs.get("analytics", {}).get("log_to_supabase", True):
        return

    # Prepare metadata
    metadata = {
        "suggestion_type": suggestion_type,
        "was_accepted": accepted,
        "prompt_count": state.get("prompt_count", 0),
        "coaching_level": state.get("current_profile", "moderate"),
        "session_id": state.get("session_id", "unknown")
    }

    # This would be called via MCP in actual usage
    # For now, write to a log file that can be batch-uploaded
    log_file = Path.home() / ".claude" / "analytics_queue.jsonl"
    with open(log_file, "a") as f:
        entry = {
            "timestamp": datetime.now().isoformat(),
            "skill_id": "workflow-coach",
            "command": f"interjection:{suggestion_type}",
            "machine": os.uname().nodename if hasattr(os, 'uname') else "unknown",
            "project_context": state.get("project_context", "unknown"),
            "success": accepted,
            "notes": json.dumps(metadata)
        }
        f.write(json.dumps(entry) + "\n")


def update_learning(suggestion_type: str, accepted: bool, learning: dict) -> dict:
    """Update cross-session learning based on suggestion outcome."""
    stats = learning.get("suggestion_stats", {})

    if suggestion_type not in stats:
        stats[suggestion_type] = {"shown": 0, "accepted": 0, "declined": 0}

    stats[suggestion_type]["shown"] += 1
    if accepted:
        stats[suggestion_type]["accepted"] += 1
    else:
        stats[suggestion_type]["declined"] += 1

    learning["suggestion_stats"] = stats

    # Adjust thresholds based on acceptance rate
    adjusted = learning.get("adjusted_thresholds", {})
    for stype, data in stats.items():
        if data["shown"] >= 10:  # Only adjust after enough data
            acceptance_rate = data["accepted"] / data["shown"]
            if acceptance_rate < 0.2:
                # Low acceptance - increase threshold
                adjusted[stype] = {"modifier": 1.5, "reason": "low_acceptance"}
            elif acceptance_rate > 0.8:
                # High acceptance - decrease threshold
                adjusted[stype] = {"modifier": 0.75, "reason": "high_acceptance"}

    learning["adjusted_thresholds"] = adjusted
    return learning


def analyze_prompt(prompt: str, state: dict, prefs: dict, profiles: dict, learning: dict) -> dict:
    """Analyze a prompt for coaching opportunities."""
    suggestions = []

    # Track prompt count
    state["prompt_count"] = state.get("prompt_count", 0) + 1

    # Detect and set profile
    profile_name = detect_project_profile(prompt, prefs, profiles)
    state["current_profile"] = profile_name
    profile_config = get_profile_config(profile_name, profiles)

    # Get thresholds (with learning adjustments)
    thresholds = prefs.get("interjection_thresholds", {}).copy()
    adjusted = learning.get("adjusted_thresholds", {})

    prompt_lower = prompt.lower()

    # === Pattern Detection ===

    # 1. Repetitive patterns
    pattern_keywords = ["fix", "test", "deploy", "commit", "review", "format", "lint", "build", "run", "check", "update", "add"]
    repetition_trigger = thresholds.get("repetition_trigger", 2)

    for keyword in pattern_keywords:
        if keyword in prompt_lower:
            state["patterns"][keyword] = state["patterns"].get(keyword, 0) + 1

            # Apply learning adjustment if exists
            if "create_command" in adjusted:
                repetition_trigger = int(repetition_trigger * adjusted["create_command"].get("modifier", 1))

            if state["patterns"][keyword] >= repetition_trigger:
                if should_interject(state, prefs, "create_command"):
                    suggestions.append({
                        "type": "create_command",
                        "message": f"You've used '{keyword}' patterns {state['patterns'][keyword]} times.",
                        "action": f"Create /{keyword} command to automate this",
                        "priority": 2
                    })
                    state["suggestions_made"].append("create_command")

    # 2. Complex multi-step tasks
    complex_indicators = ["implement", "create", "build", "refactor", "migrate", "integrate", "setup", "configure"]
    step_indicators = ["then", "after that", "next", "finally", "also", "and then"]

    has_complex = any(ind in prompt_lower for ind in complex_indicators)
    step_count = sum(1 for ind in step_indicators if ind in prompt_lower)
    complexity_threshold = thresholds.get("complexity_steps", 5)

    if has_complex and step_count >= 2:
        if should_interject(state, prefs, "plan_mode"):
            suggestions.append({
                "type": "plan_mode",
                "message": "This seems like a multi-step task.",
                "action": "Consider using Plan Mode (Shift+Tab) to design approach first",
                "priority": 1
            })
            state["suggestions_made"].append("plan_mode")

    # 3. Parallel opportunities
    list_pattern = prompt.count(",") >= 2 or prompt.count("\n-") >= 2 or prompt.count("\n*") >= 2
    parallel_words = ["and", "also", "plus", "as well as", "along with"]

    if list_pattern and any(word in prompt_lower for word in parallel_words):
        if should_interject(state, prefs, "parallel_execution"):
            suggestions.append({
                "type": "parallel_execution",
                "message": "Multiple independent tasks detected.",
                "action": "These could run in parallel sessions for faster completion",
                "priority": 3
            })
            state["suggestions_made"].append("parallel_execution")

    # 4. Session ending detection
    exit_phrases = ["done", "thanks", "bye", "exit", "finished", "that's all", "all done", "wrap up"]
    if any(phrase in prompt_lower for phrase in exit_phrases):
        if should_interject(state, prefs, "session_end_recap"):
            suggestions.append({
                "type": "session_end_recap",
                "message": "Session ending detected.",
                "action": "Run /recap to save progress before closing",
                "priority": 0
            })
            state["suggestions_made"].append("session_end_recap")

            # Send webhook alert
            send_webhook("session_event", {
                "event": "session_ending",
                "session_id": state.get("session_id"),
                "prompt_count": state["prompt_count"],
                "recap_suggested": True
            }, prefs)

    # 5. Context management
    context_threshold = thresholds.get("context_warning_turns", 30)
    if state["prompt_count"] >= context_threshold:
        if should_interject(state, prefs, "context_management"):
            suggestions.append({
                "type": "context_management",
                "message": f"Session has {state['prompt_count']} prompts.",
                "action": "Consider /compact to compress context or /recap to checkpoint",
                "priority": 2
            })
            state["suggestions_made"].append("context_management")

    # 6. Architectural complexity (suggest thinking mode)
    arch_indicators = ["architecture", "design", "system", "scale", "security", "performance", "optimize"]
    if sum(1 for ind in arch_indicators if ind in prompt_lower) >= 2:
        if should_interject(state, prefs, "thinking_mode"):
            suggestions.append({
                "type": "thinking_mode",
                "message": "This seems architecturally complex.",
                "action": "Consider ultrathink: prefix or Opus model for deeper analysis",
                "priority": 3
            })
            state["suggestions_made"].append("thinking_mode")

    # Update interjection count
    if suggestions:
        state["interjection_count"] = state.get("interjection_count", 0) + 1

        # Send webhook for pattern alert
        send_webhook("interjection", {
            "session_id": state.get("session_id"),
            "suggestions": [s["type"] for s in suggestions],
            "prompt_count": state["prompt_count"],
            "profile": profile_name
        }, prefs)

    return {
        "suggestions": suggestions,
        "state": state,
        "profile": profile_name
    }


def record_suggestion_outcome(suggestion_type: str, accepted: bool, state: dict, prefs: dict, learning: dict):
    """Record the outcome of a suggestion for learning."""
    if accepted:
        state["suggestions_accepted"].append(suggestion_type)
    else:
        state["suggestions_declined"].append(suggestion_type)

    # Log to Supabase
    log_to_supabase(suggestion_type, "", accepted, state, prefs)

    # Update learning
    learning = update_learning(suggestion_type, accepted, learning)
    save_learning(learning)

    return state, learning


def format_suggestions(suggestions: List[dict]) -> str:
    """Format suggestions for display."""
    if not suggestions:
        return ""

    # Sort by priority (lower = more important)
    suggestions.sort(key=lambda x: x.get("priority", 99))

    output = []
    for s in suggestions:
        output.append(f"\nWORKFLOW TIP: {s['message']}")
        output.append(f"Suggestion: {s['action']}")

    return "\n".join(output)


def main():
    """Main entry point for hook integration."""
    # Load all configurations
    prefs = load_preferences()
    profiles = load_profiles()
    learning = load_learning()
    state = load_state()

    # Check if coaching is enabled
    if not prefs.get("coaching", {}).get("enabled", True):
        print(json.dumps({"continue": True}))
        return

    # Read hook input
    try:
        hook_input = json.loads(sys.stdin.read())
    except Exception:
        hook_input = {}

    prompt = hook_input.get("prompt", "")

    if prompt:
        result = analyze_prompt(prompt, state, prefs, profiles, learning)
        save_state(result["state"])

        # Format output
        if result["suggestions"]:
            formatted = format_suggestions(result["suggestions"])
            output = {
                "continue": True,
                "suggestions": result["suggestions"],
                "formatted_output": formatted,
                "profile": result["profile"]
            }
        else:
            output = {"continue": True}
    else:
        output = {"continue": True}

    print(json.dumps(output))


if __name__ == "__main__":
    main()
