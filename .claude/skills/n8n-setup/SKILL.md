---
name: n8n-setup
description: Setup instructions for n8n CLI and API access. Use when user needs to configure n8n API key, install n8n-cli, or troubleshoot n8n connection issues.
allowed-tools: Bash, Read, Write
---

# n8n Agent Setup Instructions

## Step 0: Log Skill Invocation

```bash
docker mcp tools call insert_row 'table=claude_skill_usage' 'data={
  "skill_id": "n8n-setup",
  "command": "/n8n-setup",
  "machine": "mac",
  "project_context": "PROJECT_ID",
  "success": true
}'
```

## 1. Set your n8n API Key

Add your API key to your shell profile. Open `~/.zprofile` and add:

```bash
export N8N_API_KEY="your-api-key-here"
```

Then reload your shell:
```bash
source ~/.zprofile
```

Or for the current session only:
```bash
export N8N_API_KEY="your-api-key-here"
```

## 2. Generate an API Key in n8n (if you don't have one)

1. Log into n8n at https://n8n.l7-partners.com
2. Go to **Settings** > **API** (or **n8n API**)
3. Click **Create API Key**
4. Copy the generated key and save it securely

## 3. Test the Connection

```bash
n8n-cli status
```

Expected output:
```
Checking n8n API at https://n8n.l7-partners.com...
Connected successfully!
  Total workflows: X
  Active workflows: Y
```

## 4. Available Commands

The `n8n-cli` tool is now available at `~/.local/bin/n8n-cli`. Quick reference:

```bash
# Check status
n8n-cli status

# List all workflows
n8n-cli workflows list

# List active workflows only
n8n-cli workflows active

# Get workflow details
n8n-cli workflows get <id>

# Activate/deactivate workflows
n8n-cli workflows activate <id>
n8n-cli workflows deactivate <id>

# Run a workflow
n8n-cli executions run <workflow-id>
n8n-cli executions run <workflow-id> '{"key": "value"}'

# Check recent executions
n8n-cli executions list

# Check failed executions
n8n-cli executions errors

# List webhooks
n8n-cli webhooks list

# Trigger a webhook
n8n-cli webhooks trigger <path> '{"data": "test"}'

# Backup all workflows
n8n-cli workflows backup
```

## 5. Using with Claude Code

The n8n skill is now available in Claude Code. You can ask Claude to:

- "List my n8n workflows"
- "Show me failed executions"
- "Create a new webhook workflow"
- "Activate workflow 123"
- "Check what webhooks are active"
- "Run workflow X with this data"

Claude will use the n8n-cli tool and API knowledge from the skill file.

## Files Created

- `~/.claude/skills/n8n/SKILL.md` - Skill documentation with API reference
- `~/.local/bin/n8n-cli` - CLI helper script
- `~/.zprofile` - Updated to include `~/.local/bin` in PATH

## Security Notes

- The API key provides admin access to your n8n instance
- Never commit the API key to version control
- The Cloudflare Access layer provides additional security for the web UI
- API access bypasses Cloudflare Access (by design for automation)
