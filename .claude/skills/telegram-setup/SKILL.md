# Telegram MCP Setup Skill

Setup instructions for the Telegram MCP server on Mac and Pi.

## Overview

**MCP Server**: `chigwell/telegram-mcp` (Telethon-based, full account access)
**Repo Location**: `~/telegram-mcp/`
**Capabilities**: Read chats, send messages, manage groups, contacts, search

## Prerequisites

1. **Telegram API Credentials** from https://my.telegram.org/apps
   - API ID (number)
   - API Hash (string)
2. **uv** package manager installed
3. **Python 3.10+**

## Mac Setup

### 1. Clone and Install
```bash
cd ~
git clone https://github.com/chigwell/telegram-mcp.git
cd telegram-mcp

# Install uv if needed
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"

# Install dependencies
uv sync
```

### 2. Configure .env
```bash
cp .env.example .env
# Edit with your credentials:
# TELEGRAM_API_ID=your_id
# TELEGRAM_API_HASH=your_hash
# TELEGRAM_SESSION_NAME=jeff_claude_session
```

### 3. Generate Session String
```bash
cd ~/telegram-mcp
export PATH="$HOME/.local/bin:$PATH"
uv run session_string_generator.py
```
- Enter phone number: `+16318383779`
- Enter code from Telegram app
- Copy the session string to .env `TELEGRAM_SESSION_STRING=`

### 4. Configure Claude Code MCP
Add to `~/.claude/settings.local.json` or project `.mcp.json`:
```json
{
  "mcpServers": {
    "telegram": {
      "command": "/Users/jeff-probis/.local/bin/uv",
      "args": ["--directory", "/Users/jeff-probis/telegram-mcp", "run", "main.py"],
      "env": {
        "TELEGRAM_API_ID": "your_id",
        "TELEGRAM_API_HASH": "your_hash",
        "TELEGRAM_SESSION_NAME": "jeff_claude_session",
        "TELEGRAM_SESSION_STRING": "your_session_string"
      }
    }
  }
}
```

### 5. Test
```bash
cd ~/telegram-mcp
uv run main.py
# Should start MCP server
```

---

## Raspberry Pi Setup (via SSH)

### 1. SSH to Pi
```bash
ssh jeff@raspberrypi.local
# or use the Pi's IP address
```

### 2. Clone and Install
```bash
cd ~
git clone https://github.com/chigwell/telegram-mcp.git
cd telegram-mcp

# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"

# Install dependencies (may take longer on Pi)
uv sync
```

### 3. Copy Credentials from Mac
The session string generated on Mac should work on Pi (same account).

```bash
# From Mac, copy .env to Pi:
scp ~/telegram-mcp/.env jeff@raspberrypi.local:~/telegram-mcp/.env
```

### 4. Configure Claude Code on Pi
Same as Mac but with Pi paths:
```json
{
  "mcpServers": {
    "telegram": {
      "command": "/home/jeff/.local/bin/uv",
      "args": ["--directory", "/home/jeff/telegram-mcp", "run", "main.py"],
      "env": {
        "TELEGRAM_API_ID": "your_id",
        "TELEGRAM_API_HASH": "your_hash",
        "TELEGRAM_SESSION_NAME": "jeff_claude_session",
        "TELEGRAM_SESSION_STRING": "your_session_string"
      }
    }
  }
}
```

---

## Available Tools (after setup)

| Tool | Description |
|------|-------------|
| `list_chats` | List all chats/groups/channels |
| `get_chat_history` | Read messages from a chat |
| `send_message` | Send a message to a chat |
| `search_messages` | Search across chats |
| `list_contacts` | Get contact list |
| `get_me` | Get your account info |
| `create_group` | Create a new group |
| `join_chat` | Join via invite link |

## Troubleshooting

### Session Expired
Re-run `uv run session_string_generator.py` and update the session string.

### Rate Limited on my.telegram.org
Wait 15-30 minutes and try again. The code goes to your Telegram app, not SMS.

### Pi Connection Issues
Ensure the Pi has internet access and can reach Telegram servers.

---

## Security Notes

- **Never share your session string** - it provides full account access
- Store credentials in `.env` file (gitignored)
- The session string is tied to your account, not the device
- Revoke sessions at https://my.telegram.org if compromised
