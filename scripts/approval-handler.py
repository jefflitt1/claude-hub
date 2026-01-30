#!/usr/bin/env python3
"""
Claude Code Mobile Approval Handler

Reads approval requests from Claude Code via stdin, sends to n8n webhook,
and polls Supabase for the response. Falls back to direct Telegram if n8n is unreachable.

Features:
- "Always" approvals stored in Supabase for auto-approval
- Configurable timeout with faster fallback to terminal
- Proper Claude Code hook output format
"""

import json
import os
import sys
import time
import hashlib
import socket
import signal
import atexit
import urllib.request
import urllib.error
import asyncio

# Try to import Telethon for mark_as_read functionality
try:
    from telethon import TelegramClient
    from telethon.sessions import StringSession
    TELETHON_AVAILABLE = True
except ImportError:
    TELETHON_AVAILABLE = False

# Configuration from environment
N8N_WEBHOOK_URL = os.environ.get('N8N_APPROVAL_WEBHOOK', 'https://n8n.l7-partners.com/webhook/claude-approval')
N8N_CLEANUP_URL = os.environ.get('N8N_CLEANUP_WEBHOOK', 'https://n8n.l7-partners.com/webhook/claude-cleanup')
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://donnmhbwhpjlmpnwgdqr.supabase.co')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '')
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID', '7938188628')
POLL_TIMEOUT = int(os.environ.get('APPROVAL_TIMEOUT', '180'))  # seconds - 3 min for mobile response
POLL_INTERVAL = 1   # seconds

# Telegram User API credentials (for mark_as_read via Telethon)
TELEGRAM_API_ID = os.environ.get('TELEGRAM_API_ID', '34282665')
TELEGRAM_API_HASH = os.environ.get('TELEGRAM_API_HASH', 'ba7794bc1fe83ab88ac5bdcd2e9362a7')
TELEGRAM_SESSION_STRING = os.environ.get('TELEGRAM_SESSION_STRING', '1AZWarzgBu2seDxD_DLXBTp-GuwnNm7qyWuVvq0BLTUfFcuoYj3D-qqTxLMBsEv7TSMAZGt3-p8_dC4X5HRWofhLJUuUKYq7SsMyVmoXf51FkXUqACrdv2hUiKFQoZ_5aSd6vh8gCxTlv0FMJn3WhXDgDhCCMr_u5chhtb66P9WDoZAVLYWvhVfABIdLdkTki83aVIMYVLig2GQYWOHdAGitJPdspb1vBv6vVi3g_8gKq4bfVaJQ-DFdzsHAdokObPs-_QaOXc0hb7EU4QMSuVTGlqWnTVFjGMsvdMROAohHxnBuWPOBD9hgq1w48ZukbvKB2dWjzwBX7IVA59Rocu8K9VTs0Rn4=')

# Track current session for cleanup
_current_session_id = None
_telegram_message_sent = False
_cleanup_done = False


def log_debug(msg):
    """Write debug messages to stderr (not seen by Claude Code)."""
    print(f"[approval-handler] {msg}", file=sys.stderr)


async def _async_mark_as_read(chat_id):
    """Async function to mark Telegram chat as read using Telethon."""
    try:
        client = TelegramClient(
            StringSession(TELEGRAM_SESSION_STRING),
            int(TELEGRAM_API_ID),
            TELEGRAM_API_HASH
        )
        await client.connect()

        if not await client.is_user_authorized():
            log_debug("Telethon client not authorized, skipping mark_as_read")
            await client.disconnect()
            return False

        # Mark the chat as read
        await client.send_read_acknowledge(int(chat_id))
        log_debug(f"Marked chat {chat_id} as read")

        await client.disconnect()
        return True
    except Exception as e:
        log_debug(f"Failed to mark as read: {e}")
        return False


def mark_telegram_as_read():
    """Mark the Telegram approval chat as read (removes unread badge)."""
    if not TELETHON_AVAILABLE:
        log_debug("Telethon not available, skipping mark_as_read")
        return

    if not TELEGRAM_SESSION_STRING or not TELEGRAM_CHAT_ID:
        log_debug("Telegram credentials not configured for mark_as_read")
        return

    try:
        # Run the async function
        asyncio.run(_async_mark_as_read(TELEGRAM_CHAT_ID))
    except Exception as e:
        log_debug(f"mark_telegram_as_read failed: {e}")


def _do_cleanup(status='cancelled'):
    """Internal cleanup function - idempotent."""
    global _cleanup_done
    if _cleanup_done:
        return
    _cleanup_done = True

    if _current_session_id and _telegram_message_sent:
        try:
            payload = {
                "session_id": _current_session_id,
                "status": status
            }
            data = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(
                N8N_CLEANUP_URL,
                data=data,
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            with urllib.request.urlopen(req, timeout=3) as resp:
                pass
        except Exception:
            pass

        # Mark as read after cleanup (call deferred to avoid issues in signal handlers)
        try:
            mark_telegram_as_read()
        except Exception:
            pass


def _signal_handler(signum, frame):
    """Handle termination signals."""
    _do_cleanup('cancelled')
    sys.exit(0)


# Register cleanup handlers
signal.signal(signal.SIGTERM, _signal_handler)
signal.signal(signal.SIGINT, _signal_handler)
atexit.register(lambda: _do_cleanup('cancelled'))


def get_machine_name():
    """Get a friendly machine identifier."""
    return socket.gethostname().split('.')[0]


def get_project_name(cwd):
    """Extract project name from working directory."""
    if not cwd:
        return "unknown"
    return os.path.basename(cwd.rstrip('/'))


def format_tool_display(tool_name, tool_input):
    """Format tool info for display."""
    if tool_name == 'Bash':
        cmd = tool_input.get('command', '') if isinstance(tool_input, dict) else str(tool_input)
        # Truncate long commands
        if len(cmd) > 200:
            cmd = cmd[:200] + '...'
        return f"Bash: `{cmd}`"
    elif tool_name == 'Write':
        path = tool_input.get('file_path', '') if isinstance(tool_input, dict) else ''
        return f"Write: `{path}`"
    elif tool_name == 'Edit':
        path = tool_input.get('file_path', '') if isinstance(tool_input, dict) else ''
        return f"Edit: `{path}`"
    elif tool_name == 'ExitPlanMode':
        return "📋 Plan Mode Approval"
    else:
        return f"{tool_name}"


def format_plan_mode_display(tool_input):
    """Format ExitPlanMode request for display."""
    allowed_prompts = tool_input.get('allowedPrompts', [])
    plan = tool_input.get('plan', '')

    # Format requested permissions
    perms_display = ""
    if allowed_prompts:
        perm_lines = []
        for p in allowed_prompts[:5]:  # Limit to 5
            tool = p.get('tool', 'Unknown')
            prompt = p.get('prompt', '')[:50]
            perm_lines.append(f"• {tool}: {prompt}")
        perms_display = "\n".join(perm_lines)
        if len(allowed_prompts) > 5:
            perms_display += f"\n  ...+{len(allowed_prompts)-5} more"

    # Extract plan summary (first 200 chars or first heading)
    plan_summary = ""
    if plan:
        lines = plan.strip().split('\n')
        for line in lines[:3]:
            if line.strip():
                plan_summary = line.strip()[:100]
                break

    return perms_display, plan_summary


def get_approval_type(tool_name, permission_mode):
    """Determine the type of approval for button customization."""
    if tool_name == 'ExitPlanMode':
        return 'plan'
    elif permission_mode == 'plan':
        return 'plan_tool'
    else:
        return 'tool'


def format_ask_user_question(tool_input):
    """Format AskUserQuestion for Telegram display with option buttons.

    Returns: (message_text, buttons_data)
    - message_text: Formatted message showing the questions
    - buttons_data: List of button configs for Telegram inline keyboard
    """
    questions = tool_input.get('questions', [])
    if not questions:
        return None, None

    message_lines = ["❓ *Claude needs your input*\n"]
    buttons_data = []

    for q_idx, question in enumerate(questions):
        q_text = question.get('question', 'Question')
        header = question.get('header', '')
        options = question.get('options', [])
        multi_select = question.get('multiSelect', False)

        # Add question text
        if header:
            message_lines.append(f"*{header}*: {q_text}")
        else:
            message_lines.append(f"*Q{q_idx + 1}*: {q_text}")

        if multi_select:
            message_lines.append("_(select multiple)_")

        # Add options as numbered list
        for opt_idx, opt in enumerate(options):
            label = opt.get('label', f'Option {opt_idx + 1}')
            desc = opt.get('description', '')
            message_lines.append(f"  {opt_idx + 1}. {label}")
            if desc:
                message_lines.append(f"     _{desc}_")

            # Create button data
            buttons_data.append({
                'question_idx': q_idx,
                'option_idx': opt_idx,
                'label': label,
                'text': f"{opt_idx + 1}. {label[:20]}" if len(label) > 20 else f"{opt_idx + 1}. {label}"
            })

        message_lines.append("")  # Blank line between questions

    # Add "Other" option note
    message_lines.append("_You can also type a custom response_")

    return "\n".join(message_lines), buttons_data


def format_pretooluse_response(answers, allow=True):
    """Format PreToolUse hook response with answers for AskUserQuestion."""
    if allow and answers:
        return {
            "hookSpecificOutput": {
                "permissionDecision": "allow",
                "updatedInput": {
                    "answers": answers
                }
            }
        }
    elif allow:
        # Allow without modifying input (let it prompt normally)
        return {
            "hookSpecificOutput": {
                "permissionDecision": "allow"
            }
        }
    else:
        return {
            "hookSpecificOutput": {
                "permissionDecision": "deny"
            }
        }


def generate_short_id(session_id):
    """Generate a short 6-char ID for display."""
    return hashlib.md5(session_id.encode()).hexdigest()[:6].upper()


def send_to_n8n(payload):
    """Send approval request to n8n webhook."""
    try:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            N8N_WEBHOOK_URL,
            data=data,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except Exception as e:
        log_debug(f"n8n webhook failed: {e}")
        return False


def send_telegram_direct(message, session_id, approval_type='tool'):
    """Send directly to Telegram as fallback."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return False

    try:
        # Dynamic buttons based on approval type
        if approval_type == 'plan':
            # Plan Mode approval - simpler options
            keyboard = {
                "inline_keyboard": [[
                    {"text": "✅ Approve Plan", "callback_data": f"approve:{session_id}"},
                    {"text": "❌ Deny", "callback_data": f"deny:{session_id}"}
                ]]
            }
        else:
            # Regular tool permission - include "Always" option
            keyboard = {
                "inline_keyboard": [[
                    {"text": "✅ Yes", "callback_data": f"approve:{session_id}"},
                    {"text": "✅✅ Always", "callback_data": f"always:{session_id}"},
                    {"text": "❌ No", "callback_data": f"deny:{session_id}"}
                ]]
            }

        payload = {
            "chat_id": TELEGRAM_CHAT_ID,
            "text": message,
            "parse_mode": "Markdown",
            "reply_markup": keyboard
        }

        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})

        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except Exception as e:
        log_debug(f"Telegram direct send failed: {e}")
        return False


def cleanup_telegram_message(session_id, status='expired'):
    """Call cleanup webhook to dismiss the Telegram message."""
    global _cleanup_done

    if _cleanup_done or not _telegram_message_sent or not session_id:
        return

    _cleanup_done = True

    try:
        payload = {
            "session_id": session_id,
            "status": status
        }
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            N8N_CLEANUP_URL,
            data=data,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            log_debug(f"Cleanup called with status={status}, response={resp.status}")
    except Exception as e:
        log_debug(f"Cleanup webhook failed: {e}")

    # Also mark the chat as read so the message doesn't stay as unread
    mark_telegram_as_read()


def poll_supabase(session_id, timeout=POLL_TIMEOUT):
    """Poll Supabase for approval response."""
    if not SUPABASE_KEY:
        log_debug("SUPABASE_KEY not configured")
        return None

    url = f"{SUPABASE_URL}/rest/v1/claude_approvals?session_id=eq.{session_id}&select=decision,status"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }

    start_time = time.time()

    while time.time() - start_time < timeout:
        try:
            req = urllib.request.Request(url, headers=headers, method='GET')
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                if data and len(data) > 0:
                    record = data[0]
                    if record.get('status') == 'responded' and record.get('decision'):
                        decision = record['decision']
                        log_debug(f"Got decision from Supabase: {decision}")
                        # Clean up the record
                        delete_from_supabase(session_id)
                        return decision
        except Exception as e:
            log_debug(f"Supabase poll error: {e}")

        time.sleep(POLL_INTERVAL)

    return None  # Timeout


def delete_from_supabase(session_id):
    """Delete a session record from Supabase."""
    if not SUPABASE_KEY:
        return

    url = f"{SUPABASE_URL}/rest/v1/claude_approvals?session_id=eq.{session_id}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }

    try:
        req = urllib.request.Request(url, headers=headers, method='DELETE')
        with urllib.request.urlopen(req, timeout=5) as resp:
            log_debug(f"Deleted session {session_id} from Supabase")
    except Exception as e:
        log_debug(f"Failed to delete from Supabase: {e}")


def check_always_approval(tool_name, tool_input):
    """Check if there's an existing 'always' approval for this tool pattern."""
    if not SUPABASE_KEY:
        return None

    # Generate a pattern key for matching
    pattern_key = generate_pattern_key(tool_name, tool_input)

    url = f"{SUPABASE_URL}/rest/v1/claude_always_approvals?pattern_key=eq.{pattern_key}&select=id"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }

    try:
        req = urllib.request.Request(url, headers=headers, method='GET')
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if data and len(data) > 0:
                log_debug(f"Found 'always' approval for pattern: {pattern_key}")
                return True
    except Exception as e:
        log_debug(f"Error checking always approvals: {e}")

    return False


def store_always_approval(tool_name, tool_input):
    """Store an 'always' approval for future auto-approval."""
    if not SUPABASE_KEY:
        return

    pattern_key = generate_pattern_key(tool_name, tool_input)

    url = f"{SUPABASE_URL}/rest/v1/claude_always_approvals"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }

    payload = {
        "pattern_key": pattern_key,
        "tool_name": tool_name,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

    try:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers=headers, method='POST')
        with urllib.request.urlopen(req, timeout=5) as resp:
            log_debug(f"Stored 'always' approval for: {pattern_key}")
    except urllib.error.HTTPError as e:
        if e.code == 409:  # Conflict - already exists
            log_debug(f"Always approval already exists for: {pattern_key}")
        else:
            log_debug(f"Failed to store always approval: {e}")
    except Exception as e:
        log_debug(f"Failed to store always approval: {e}")


def generate_pattern_key(tool_name, tool_input):
    """Generate a pattern key for 'always' approval matching.

    For Bash: uses first word of command (e.g., 'npm', 'git', 'python')
    For Write/Edit: uses file extension or directory pattern
    For others: just the tool name
    """
    if tool_name == 'Bash':
        cmd = tool_input.get('command', '') if isinstance(tool_input, dict) else str(tool_input)
        # Extract first word/command
        first_word = cmd.split()[0] if cmd.split() else 'unknown'
        # Remove path prefix if present
        first_word = first_word.split('/')[-1]
        return f"bash:{first_word}"
    elif tool_name in ('Write', 'Edit'):
        path = tool_input.get('file_path', '') if isinstance(tool_input, dict) else ''
        # Use file extension
        ext = path.split('.')[-1] if '.' in path else 'noext'
        return f"{tool_name.lower()}:{ext}"
    else:
        return f"{tool_name.lower()}"


def format_decision_output(decision):
    """Format the decision in Claude Code's expected hook output format."""
    if decision in ('approve', 'approveAlways'):
        return {
            "hookSpecificOutput": {
                "hookEventName": "PermissionRequest",
                "decision": {
                    "behavior": "allow"
                }
            }
        }
    else:  # deny
        return {
            "hookSpecificOutput": {
                "hookEventName": "PermissionRequest",
                "decision": {
                    "behavior": "deny",
                    "message": "Denied via Telegram"
                }
            }
        }


def handle_ask_user_question(request, session_id, tool_input, cwd):
    """Handle AskUserQuestion tool via PreToolUse hook.

    Sends the questions to Telegram, waits for response, and returns
    the selected answers via updatedInput.
    """
    global _telegram_message_sent

    # Format the question for display
    message_text, buttons_data = format_ask_user_question(tool_input)

    if not message_text:
        # No questions - allow without modification
        log_debug("AskUserQuestion has no questions, allowing through")
        response = format_pretooluse_response(None, allow=True)
        print(json.dumps(response))
        sys.exit(0)

    # Prepare display info
    machine = get_machine_name()
    project = get_project_name(cwd)
    short_id = generate_short_id(session_id)

    # Build payload for n8n with question-specific data
    payload = {
        "session_id": session_id,
        "short_id": short_id,
        "tool_name": "AskUserQuestion",
        "tool_display": "❓ User Question",
        "tool_input": message_text,
        "machine": machine,
        "project": project,
        "cwd": cwd,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "approval_type": "question",  # New type for questions
        "buttons_data": buttons_data,  # Option buttons for n8n to build
        "questions": tool_input.get('questions', [])  # Raw questions for reference
    }

    # Try n8n first
    n8n_success = send_to_n8n(payload)

    if n8n_success:
        _telegram_message_sent = True
    else:
        # Fallback to direct Telegram (simplified - no buttons for now)
        message = f"""❓ *Claude needs your input*

📍 *{machine}* → `{project}`

{message_text}

_Tap a button or reply with your choice_
_ID: {short_id}_"""

        # Build simple buttons from options (first question only for direct fallback)
        if buttons_data:
            # For direct Telegram, create buttons for first 4 options
            keyboard = {"inline_keyboard": []}
            row = []
            for btn in buttons_data[:4]:
                row.append({
                    "text": btn['text'],
                    "callback_data": f"answer:{session_id}:{btn['question_idx']}:{btn['label']}"
                })
                if len(row) == 2:
                    keyboard["inline_keyboard"].append(row)
                    row = []
            if row:
                keyboard["inline_keyboard"].append(row)
            # Add skip option
            keyboard["inline_keyboard"].append([
                {"text": "⏭️ Skip (ask in terminal)", "callback_data": f"skip:{session_id}"}
            ])

            telegram_success = send_telegram_with_keyboard(message, keyboard)
        else:
            telegram_success = send_telegram_direct(message, session_id, 'question')

        if telegram_success:
            _telegram_message_sent = True
        else:
            log_debug("Both n8n and Telegram failed - falling through to terminal")
            # Allow the question through without pre-filled answers
            response = format_pretooluse_response(None, allow=True)
            print(json.dumps(response))
            sys.exit(0)

    # Poll Supabase for response
    decision = poll_supabase(session_id)

    if decision:
        log_debug(f"Received question response: {decision}")

        if decision == 'deny' or decision == 'skip':
            # User wants to answer in terminal
            log_debug("User chose to skip - allowing through to terminal")
            response = format_pretooluse_response(None, allow=True)
            print(json.dumps(response))
            sys.exit(0)

        # Check if decision contains answer data (format: "answer:q_idx:label")
        if decision.startswith('answer:'):
            parts = decision.split(':', 2)
            if len(parts) >= 3:
                q_idx = parts[1]
                answer_label = parts[2]
                answers = {q_idx: answer_label}
                response = format_pretooluse_response(answers, allow=True)
                print(json.dumps(response))
                sys.exit(0)

        # Default: approve without pre-filled answers
        response = format_pretooluse_response(None, allow=True)
        print(json.dumps(response))
        sys.exit(0)
    else:
        # Timeout - let user answer in terminal
        log_debug("Timeout waiting for response - allowing through to terminal")
        cleanup_telegram_message(session_id, status='expired')
        response = format_pretooluse_response(None, allow=True)
        print(json.dumps(response))
        sys.exit(0)


def send_telegram_with_keyboard(message, keyboard):
    """Send Telegram message with custom inline keyboard."""
    if not TELEGRAM_BOT_TOKEN:
        log_debug("No Telegram bot token configured")
        return False

    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {
            "chat_id": TELEGRAM_CHAT_ID,
            "text": message,
            "parse_mode": "Markdown",
            "reply_markup": keyboard
        }
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=data,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except Exception as e:
        log_debug(f"Telegram direct send failed: {e}")
        return False


def main():
    global _current_session_id, _telegram_message_sent

    try:
        # Read input from Claude Code
        input_data = sys.stdin.read()
        if not input_data.strip():
            # No input - let Claude Code fall through to terminal
            sys.exit(0)

        request = json.loads(input_data)

        session_id = request.get('session_id', f"unknown-{int(time.time())}")
        _current_session_id = session_id
        tool_name = request.get('tool_name', 'Unknown')
        tool_input = request.get('tool_input', {})
        cwd = request.get('cwd', os.getcwd())
        permission_mode = request.get('permission_mode', 'default')
        hook_event_name = request.get('hook_event_name', 'PermissionRequest')

        log_debug(f"Hook event: {hook_event_name}, tool: {tool_name}")

        # Handle AskUserQuestion via PreToolUse hook
        if hook_event_name == 'PreToolUse' and tool_name == 'AskUserQuestion':
            return handle_ask_user_question(request, session_id, tool_input, cwd)

        # Determine approval type for dynamic buttons (for PermissionRequest)
        approval_type = get_approval_type(tool_name, permission_mode)
        log_debug(f"Approval type: {approval_type} (tool={tool_name}, mode={permission_mode})")

        # Check for existing "always" approval first (skip for plan approvals)
        if approval_type != 'plan' and check_always_approval(tool_name, tool_input):
            log_debug(f"Auto-approving via 'always' rule for {tool_name}")
            response = format_decision_output('approve')
            print(json.dumps(response))
            sys.exit(0)

        # Prepare display info
        machine = get_machine_name()
        project = get_project_name(cwd)
        short_id = generate_short_id(session_id)
        tool_display = format_tool_display(tool_name, tool_input)

        # Format tool_input for display - different for Plan Mode
        if approval_type == 'plan':
            perms_display, plan_summary = format_plan_mode_display(tool_input)
            tool_input_str = f"Plan: {plan_summary}\n\nRequested Permissions:\n{perms_display}" if perms_display else f"Plan: {plan_summary}"
        elif isinstance(tool_input, dict):
            tool_input_str = json.dumps(tool_input, indent=2)
            if len(tool_input_str) > 500:
                tool_input_str = tool_input_str[:500] + '\n...(truncated)'
        else:
            tool_input_str = str(tool_input)[:500]

        # Build payload for n8n
        payload = {
            "session_id": session_id,
            "short_id": short_id,
            "tool_name": tool_name,
            "tool_display": tool_display,
            "tool_input": tool_input_str,
            "machine": machine,
            "project": project,
            "cwd": cwd,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "approval_type": approval_type,  # NEW: for dynamic buttons
            "permission_mode": permission_mode
        }

        # Try n8n first
        n8n_success = send_to_n8n(payload)

        if n8n_success:
            _telegram_message_sent = True
        else:
            # Fallback to direct Telegram
            if approval_type == 'plan':
                message = f"""📋 *Plan Mode Approval*

📍 *{machine}* → `{project}`

{tool_input_str}

_Approve to proceed with plan execution_
_ID: {short_id}_"""
            else:
                message = f"""🔔 *Claude Code Approval*

📍 *{machine}* → `{project}`
{tool_display}

```
{tool_input_str}
```

_ID: {short_id}_"""

            telegram_success = send_telegram_direct(message, session_id, approval_type)
            if telegram_success:
                _telegram_message_sent = True
            else:
                log_debug("Both n8n and Telegram failed - falling through to terminal")
                sys.exit(0)

        # Poll Supabase for response
        decision = poll_supabase(session_id)

        if decision:
            # Got response from Telegram - the callback already updated the message
            log_debug(f"Received decision: {decision}")

            # If "always" was chosen, store for future auto-approval
            if decision == 'approveAlways':
                store_always_approval(tool_name, tool_input)

            # Format and return decision
            response = format_decision_output(decision)
            print(json.dumps(response))
            sys.exit(0)
        else:
            # Timeout - user will approve in terminal, so clean up Telegram message
            log_debug("Timeout waiting for response - cleaning up Telegram and falling through to terminal")
            cleanup_telegram_message(session_id, status='expired')
            # Notify user to respond in terminal
            try:
                import subprocess
                subprocess.run([
                    'terminal-notifier',
                    '-title', 'Claude Code',
                    '-message', 'Telegram approval timed out - respond in terminal',
                    '-sound', 'Ping'
                ], capture_output=True, timeout=2)
            except Exception:
                pass
            sys.exit(0)

    except json.JSONDecodeError as e:
        log_debug(f"Invalid JSON input: {e}")
        sys.exit(0)
    except Exception as e:
        log_debug(f"Unexpected error: {e}")
        # atexit handler will clean up if needed
        sys.exit(0)


if __name__ == "__main__":
    main()
