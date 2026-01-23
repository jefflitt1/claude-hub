# New Mac Setup Guide

Last updated: 2026-01-22

## Quick Setup Checklist

### 1. Install Homebrew
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
Follow the post-install instructions to add brew to PATH.

### 2. Install Git & Generate SSH Key
```bash
brew install git
ssh-keygen -t ed25519 -C "your-email@example.com"
# Press Enter for defaults (no passphrase)
cat ~/.ssh/id_ed25519.pub
```
Add the public key to GitHub: https://github.com/settings/keys

### 3. Clone Repos
```bash
mkdir -p ~/Documents/Claude\ Code
cd ~/Documents/Claude\ Code
git clone git@github.com:jefflitt1/claude-agents.git
```

### 4. Install Node.js
```bash
brew install node
```

### 5. Install Claude Code CLI
```bash
npm install -g @anthropic-ai/claude-code
claude  # Opens browser for Anthropic auth
```

### 6. Setup CLAUDE.md
Copy from iCloud or create symlink:
```bash
# Option A: Copy from iCloud (if synced)
cp ~/Library/Mobile\ Documents/com~apple~CloudDocs/Documents/CLAUDE-config-backup.md ~/CLAUDE.md

# Option B: Symlink to repo version (recommended)
ln -sf ~/Documents/Claude\ Code/claude-agents/CLAUDE-personal.md ~/CLAUDE.md
```

### 7. Install Docker Desktop
Download from: https://www.docker.com/products/docker-desktop/
Or via Homebrew:
```bash
brew install --cask docker
```

### 8. Install Ollama (for local models)
```bash
brew install ollama
ollama serve  # Start in background
ollama pull deepseek-r1:14b  # Fast reasoning
ollama pull deepseek-r1:32b  # Best local reasoning
```

---

## MCP Server Setup

### OAuth-based (re-authenticate on new machine)
| Server | Command |
|--------|---------|
| Gemini CLI | `gemini` (opens browser) |
| Codex CLI | `codex login` (opens browser) |

### API Key-based
Create config directories:
```bash
mkdir -p ~/.config/grok-cli ~/.config/deepseek
```

**Grok CLI** (`~/.config/grok-cli/config.json`):
```json
{
  "api_key": "YOUR_GROK_API_KEY"
}
```

**DeepSeek** (`~/.config/deepseek/config.json`):
```json
{
  "api_key": "YOUR_DEEPSEEK_API_KEY"
}
```

### iMessage MCP (Apple Messages)
```bash
cd ~/Documents/Claude\ Code
git clone https://github.com/carterlasalle/mac_messages_mcp.git
cd mac_messages_mcp
npm install && npm run build
```

**Grant Full Disk Access:**
System Settings → Privacy & Security → Full Disk Access → Add Terminal/Claude Code

**Add to Claude Code settings** (`~/.claude/settings.json`):
```json
{
  "mcpServers": {
    "imessage": {
      "command": "node",
      "args": ["~/Documents/Claude Code/mac_messages_mcp/build/index.js"]
    }
  }
}
```

**Features:**
- Read message history from `~/Library/Messages/chat.db`
- Send iMessage or SMS (auto-detects)
- Attachment processing
- Group chat support
- Contact management

---

## Verification Checklist

- [ ] `brew --version` works
- [ ] `git --version` works
- [ ] `node --version` works (should be 18+)
- [ ] `claude --version` works
- [ ] SSH key added to GitHub
- [ ] claude-agents repo cloned
- [ ] CLAUDE.md exists at ~/CLAUDE.md
- [ ] Docker Desktop running
- [ ] Ollama running (`ollama list`)
- [ ] Gemini CLI authenticated
- [ ] Codex CLI authenticated
- [ ] iMessage MCP installed (optional)

---

## Troubleshooting

### SSH Permission Denied
```bash
# Check if key exists
ls -la ~/.ssh/

# Test GitHub connection
ssh -T git@github.com

# If fails, add key to agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

### Claude Code Not Finding CLAUDE.md
Ensure file exists at `~/CLAUDE.md` (home directory, not Documents).

### MCP Server Connection Issues
Check Claude Code logs:
```bash
cat ~/.claude/logs/mcp.log
```

### iMessage MCP Can't Read Messages
Grant Full Disk Access to the terminal app you're using.
