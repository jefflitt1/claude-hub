# Claude Code Mobile Approval Flow

## Overview

This system enables approving Claude Code permission requests from your phone via Telegram, with automatic fallback to terminal approval if mobile is unavailable.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Claude Code    │────▶│   n8n Workflow   │────▶│    Telegram     │
│  (Mac/Pi)       │     │   (VPS)          │     │    (Mobile)     │
└────────┬────────┘     └────────┬─────────┘     └────────┬────────┘
         │                       │                        │
         │                       ▼                        │
         │              ┌──────────────────┐              │
         │              │    Supabase      │◀─────────────┘
         │              │   (Cloud DB)     │   (callback writes decision)
         │              └────────┬─────────┘
         │                       │
         └───────────────────────┘
              (polls for decision)
```

## Components

### 1. approval-handler.py (`~/.claude/approval-handler.py`)

Python script invoked by Claude Code's PermissionRequest hook.

**Responsibilities:**
- Receives permission request JSON from Claude Code via stdin
- Sends request to n8n webhook
- Polls Supabase for decision response
- Returns decision to Claude Code or falls through to terminal

**Environment Variables:**
| Variable | Purpose |
|----------|---------|
| `N8N_APPROVAL_WEBHOOK` | Webhook URL for sending requests |
| `N8N_CLEANUP_WEBHOOK` | Webhook URL for message cleanup |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase service role key |
| `TELEGRAM_BOT_TOKEN` | Fallback direct Telegram |
| `TELEGRAM_CHAT_ID` | Your Telegram user ID |

### 2. n8n Workflow: Claude Code Mobile Approvals (VLodg6UPtMa6DV30)

**Webhooks:**
- `/webhook/claude-approval` - Receives permission requests
- `/webhook/claude-callback` - Receives Telegram button clicks
- `/webhook/claude-cleanup` - Cleans up expired messages

**Flow:**
1. Receive request → Format message → Send to Telegram with buttons
2. Store `session_id` → `message_id` mapping in Supabase
3. On callback → Update Supabase with decision → Edit Telegram message
4. On cleanup → Mark message as expired → Edit Telegram message

### 3. Supabase Tables

#### `claude_approvals` - Pending Requests

```sql
CREATE TABLE claude_approvals (
  id SERIAL PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  message_id INTEGER,
  chat_id BIGINT,
  decision TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Status Values:**
- `pending` - Awaiting user response
- `responded` - User clicked a button
- `expired` - Timed out, user approved in terminal
- `cancelled` - Session was terminated

**Decision Values:**
- `approve` - Yes (one-time approval)
- `approveAlways` - Yes, always for this tool pattern
- `deny` - No

#### `claude_always_approvals` - Persistent Rules

```sql
CREATE TABLE claude_always_approvals (
  id SERIAL PRIMARY KEY,
  pattern_key TEXT UNIQUE NOT NULL,
  tool_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Pattern Key Format:**
- Bash commands: `bash:npm`, `bash:git`, `bash:python`
- File operations: `write:ts`, `edit:json`, `write:md`
- Other tools: `webfetch`, `websearch`

When "Always" is tapped, the pattern is stored. Future matching requests auto-approve without sending to Telegram.

### 4. Telegram Bot (8169830247)

Sends formatted approval messages with inline keyboard:
- ✅ Yes → `approve:{session_id}`
- ✅✅ Always → `always:{session_id}`
- ❌ No → `deny:{session_id}`

## Flow Sequence

### Happy Path (Mobile Approval)

```
1. Claude Code needs permission
2. PermissionRequest hook calls approval-handler.py
3. Handler POSTs to n8n webhook
4. n8n sends Telegram message with buttons
5. n8n stores session_id/message_id in Supabase (status=pending)
6. Handler starts polling Supabase
7. User taps button on phone
8. Telegram sends callback to n8n
9. n8n updates Supabase (status=responded, decision=approve)
10. n8n edits Telegram message to show result
11. Handler reads decision from Supabase
12. Handler cleans up record
13. Handler returns {"decision": "approve"} to Claude Code
14. Claude Code proceeds
```

### Fallback Path (Terminal Approval)

```
1-6. Same as above
7. User doesn't respond within 120 seconds
8. Handler times out
9. Handler calls cleanup webhook
10. n8n marks message as expired
11. Handler exits with code 0 (no output)
12. Claude Code falls through to terminal prompt
13. User approves in terminal
```

### Cancellation Path

```
1-6. Same as above
7. User cancels Claude Code (Ctrl+C) or session ends
8. SIGTERM/SIGINT handler calls cleanup webhook
9. n8n marks message as cancelled
10. Telegram message updated to show cancelled
```

## Configuration

### Claude Code Settings (`~/.claude/settings.json`)

```json
{
  "hooks": {
    "PermissionRequest": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.claude/approval-handler.py",
            "timeout": 65000
          }
        ]
      }
    ]
  }
}
```

### Shell Environment (`~/.zshrc`)

```bash
# Claude Code Mobile Approval System
export N8N_APPROVAL_WEBHOOK='https://n8n.l7-partners.com/webhook/claude-approval'
export N8N_CLEANUP_WEBHOOK='https://n8n.l7-partners.com/webhook/claude-cleanup'
export SUPABASE_URL='https://donnmhbwhpjlmpnwgdqr.supabase.co'
export SUPABASE_KEY='your_service_role_key'
export TELEGRAM_BOT_TOKEN='your_bot_token'
export TELEGRAM_CHAT_ID='your_chat_id'
export APPROVAL_TIMEOUT='60'  # Optional: seconds to wait before falling back to terminal
```

## Timing

| Event | Duration |
|-------|----------|
| Message appears in Telegram | ~1-2 seconds after permission request |
| Polling interval | 1 second |
| Default timeout | 180 seconds (increased 2026-01-28) |
| Message self-destruct on timeout | Immediate (calls cleanup webhook) |
| Message self-destruct on terminal approval | After timeout (currently no early detection) |

**Note:** If you approve in terminal instead of Telegram, the message will be cleaned up after the 60-second timeout expires. The handler cannot detect terminal approval while running.

## Troubleshooting

### Messages not appearing in Telegram
1. Check n8n workflow is active
2. Verify `N8N_APPROVAL_WEBHOOK` is correct
3. Check n8n executions for errors

### Decisions not reaching terminal
1. Verify `SUPABASE_KEY` is set in environment
2. Check Supabase table has records with `status=responded`
3. Check n8n callback webhook is working

### Messages not cleaning up
1. Verify `N8N_CLEANUP_WEBHOOK` is correct
2. Check n8n cleanup webhook is active

### Debug Logging
The handler writes debug info to stderr:
```bash
python3 ~/.claude/approval-handler.py < test-input.json 2>&1
```

## Why Supabase (Not Redis)?

The n8n instance runs on a VPS behind Cloudflare, while Redis runs on the local Raspberry Pi at `192.168.4.147`. The VPS cannot reach the Pi's private IP.

Supabase provides:
- Cloud-accessible from both n8n (VPS) and Mac
- REST API with no special client libraries needed
- Built-in authentication via API key
- Audit trail with timestamps
