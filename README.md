# Claude Hub

A knowledge graph and dashboard for tracking Claude agents, skills, prompts, MCP servers, and n8n workflows.

**URL:** https://claude.l7-partners.com
**Repo:** https://github.com/jefflitt1/claude-hub

## Overview

Claude Hub is a centralized dashboard that visualizes and tracks all Claude-related infrastructure including:
- Projects and knowledge bases
- AI agents (codebase, consultant, processor, webhook-based)
- Skills (slash commands and context-aware triggers)
- MCP servers (Model Context Protocol connections)
- n8n workflows (automation pipelines)
- System prompts and templates

## Architecture

```
Mac (Development)              Cloud Services
├── Claude Code CLI            ├── Lovable (React frontend)
├── Interactive editing        ├── Supabase (PostgreSQL)
├── Test & refine              ├── Cloudflare (hosting)
└── Push to repo               └── GitHub (source)

Raspberry Pi (Automation)
├── n8n (self-hosted workflows)
└── cloudflared tunnel
```

## Tech Stack

- **Frontend:** Lovable (React) at https://claude.l7-partners.com
- **Database:** Supabase (PostgreSQL)
- **Data Sync:** JSON files → Supabase via n8n
- **Automation:** n8n at https://n8n.l7-partners.com
- **Hosting:** Cloudflare (Lovable) + Raspberry Pi (n8n)

## Project Structure

```
claude-hub/
├── README.md              # This file
├── CLAUDE.md              # Claude Code project context
├── data/
│   ├── projects.json      # Projects and knowledge bases
│   ├── agents.json        # AI agent definitions
│   ├── skills.json        # Skill/command registry
│   ├── workflows.json     # n8n workflow metadata (legacy)
│   ├── prompts.json       # System prompt registry
│   └── mcp-servers.json   # MCP server configurations
├── prompts/               # System prompt files
├── docs/
│   ├── session-notes.md   # Consolidated session history
│   ├── dashboard-enhancement-plan.md  # UI/UX design specs
│   └── session-logs/      # Per-terminal session logs
├── skills/                # Skill definitions
├── workflows/             # n8n workflow exports
└── configs/               # Machine-specific configs
```

## Supabase Tables

### Core Dashboard Tables
| Table | Description |
|-------|-------------|
| `claude_projects` | Projects and knowledge bases |
| `claude_agents` | AI agent definitions |
| `claude_skills` | Skill/command registry |
| `claude_workflows` | Workflow metadata (legacy) |
| `claude_prompts` | System prompt registry |
| `claude_mcp_servers` | MCP server configurations |

### n8n Workflow Tracking (NEW)
| Table | Description |
|-------|-------------|
| `n8n_workflows` | Full workflow inventory with analysis |
| `workflow_categories` | Workflow categorization (Production, Development, etc.) |

### n8n_workflows Schema
```sql
n8n_id          TEXT        -- n8n workflow ID
name            TEXT        -- Workflow name
active          BOOLEAN     -- Active in n8n
project         TEXT        -- Assigned project (L7 Partners, Claude Hub, etc.)
status          TEXT        -- production, WIP, template, deprecated, etc.
services        TEXT[]      -- Integrated services (Gmail, Supabase, Telegram, etc.)
trigger_type    TEXT        -- webhook, schedule, manual
node_count      INTEGER     -- Number of nodes
purpose         TEXT        -- Description of what the workflow does
recommendation  TEXT        -- Action recommendation (keep, delete, review)
last_success_at TIMESTAMPTZ -- Last successful run
last_error_at   TIMESTAMPTZ -- Last error
```

## Data Schemas

### Projects
```json
{
  "id": "project-id",
  "name": "Display Name",
  "description": "What this project does",
  "type": "app|business|knowledge-base",
  "status": "active|planned|archived",
  "connections": {
    "workflows": ["workflow-id"],
    "agents": ["agent-id"],
    "mcpServers": ["server-id"]
  }
}
```

### Agents
```json
{
  "id": "agent-id",
  "name": "Agent Name",
  "description": "What this agent does",
  "type": "codebase|consultant|webhook-based|skill-based",
  "project": "project-id",
  "capabilities": ["capability-1", "capability-2"],
  "usesSkills": ["skill-id"]
}
```

### Skills
```json
{
  "id": "skill-id",
  "name": "Skill Name",
  "description": "What this skill does",
  "trigger": "/command|context-aware",
  "location": "~/.claude/skills/skill-name/SKILL.md",
  "commands": [
    { "command": "/skill-name", "description": "Main command" }
  ]
}
```

## MCP Servers

| Server | Purpose | Platforms |
|--------|---------|-----------|
| n8n-mcp | Workflow automation | Mac, Pi |
| gmail | jglittell@gmail.com | Mac, Pi |
| gmail-l7 | jeff@jglcap.com | Mac, Pi |
| github | Repository access | Mac, Pi |
| gdrive-jgl | Personal Google Drive | Mac, Pi |
| gdrive-l7 | L7 Partners Google Drive | Mac, Pi |
| supabase | L7 Partners database | Mac |
| brave | Web search | Mac |
| playwright | Browser automation | Mac |
| memory | Knowledge graph | Mac, Pi |

## n8n Workflows

### By Project
| Project | Count | Description |
|---------|-------|-------------|
| L7 Partners | 12 | Tenant management, chatbot, document processing |
| Claude Hub | 8 | Dashboard sync, agent monitoring, GitHub integration |
| Personal | 13 | Sports briefings, email management |
| PROBIS | 7 | ROI calculator, Weaviate integration |
| Duncan | 14 | Lead gen, social media automation |
| Tutorials | 6 | YouTube tutorial implementations |

### Production Workflows
| Workflow | Project | Services |
|----------|---------|----------|
| Master Tenant Management | L7 Partners | Telegram, Supabase, Gmail, MongoDB, Weaviate |
| Daily Sports Briefing | Personal | Perplexity, ESPN, Claude, Gmail |
| GitHub → Supabase Sync | Claude Hub | GitHub, Supabase |
| Claude Code Mobile Approvals | Claude Hub | Telegram, Redis |

## Development

### Adding a New Project
1. Add entry to `data/projects.json`
2. Define any related agents in `data/agents.json`
3. Register skills in `data/skills.json`
4. Push to GitHub → n8n syncs to Supabase

### Adding a New Skill
1. Create skill file at `~/.claude/skills/<skill-name>/SKILL.md`
2. Register in `data/skills.json` with trigger and commands
3. Reference from relevant agents in `data/agents.json`

### Data Sync Flow
```
JSON files (this repo)
    ↓ GitHub push
n8n workflow (GitHub → Supabase Sync)
    ↓
Supabase tables
    ↓
Lovable React dashboard
```

## Deployment

Changes to this repo are synced to Supabase via n8n:
1. Push to `main` branch
2. GitHub webhook triggers n8n workflow
3. n8n fetches JSON from raw.githubusercontent.com
4. n8n upserts to Supabase tables
5. Lovable dashboard reflects changes

## Security Notes

- Webhook URLs in workflow configs are considered semi-sensitive
- Supabase uses Row Level Security (RLS)
- All user input is sanitized before rendering
- No sensitive credentials stored in repo

## License

Private repository - L7 Partners / JGL Capital
