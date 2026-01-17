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
Mac (Development)              Raspberry Pi (Production)
├── Claude Code CLI            ├── n8n (self-hosted)
├── Interactive editing        ├── Claude Hub web app
├── Test & refine              ├── cloudflared tunnel
└── Push to repo               └── Auto-deploys on push
```

## Tech Stack

- **Backend:** Node.js + Express.js
- **Frontend:** Vanilla JavaScript (no build step)
- **Data:** JSON files (easy editing, git-tracked)
- **Automation:** n8n at https://n8n.l7-partners.com
- **Hosting:** Raspberry Pi + Cloudflare Tunnel

## Quick Start

```bash
cd app
npm install
npm start
# Visit http://localhost:3000
```

## Project Structure

```
claude-hub/
├── README.md              # This file
├── CLAUDE.md              # Claude Code project context
├── app/
│   ├── server.js          # Express API server
│   └── public/
│       └── index.html     # Dashboard frontend
├── data/
│   ├── projects.json      # Projects and knowledge bases
│   ├── agents.json        # AI agent definitions
│   ├── skills.json        # Skill/command registry
│   ├── workflows.json     # n8n workflow metadata
│   ├── prompts.json       # System prompt registry
│   └── mcp-servers.json   # MCP server configurations
├── prompts/               # System prompt files
├── docs/
│   ├── session-notes.md   # Consolidated session history
│   └── session-logs/      # Per-terminal session logs
└── configs/               # Machine-specific configs
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/projects` | List all projects |
| `GET /api/projects/:id` | Get project by ID |
| `GET /api/agents` | List all agents |
| `GET /api/skills` | List all skills |
| `GET /api/workflows` | List all workflows |
| `GET /api/prompts` | List all prompts |
| `GET /api/mcp-servers` | List MCP servers |
| `GET /api/graph` | Full graph data (all entities) |
| `GET /api/health/n8n` | n8n instance health check |

## Data Schema

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

## Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| GitHub → Supabase Sync | Push to repo | Sync project data to Supabase |
| Daily Agent Digest | Schedule (daily) | Email summary of agent activity |
| L7 Chatbot | Webhook | AI assistant for L7 Partners TMS |
| n8n Health Check | Manual/MCP | Verify n8n instance status |

## Development

### Adding a New Project
1. Add entry to `data/projects.json`
2. Define any related agents in `data/agents.json`
3. Register skills in `data/skills.json`
4. Create skill files in `~/.claude/skills/`

### Adding a New Skill
1. Create skill file at `~/.claude/skills/<skill-name>/SKILL.md`
2. Register in `data/skills.json` with trigger and commands
3. Reference from relevant agents in `data/agents.json`

### Testing
```bash
# Start server
cd app && npm start

# Test API endpoints
curl http://localhost:3000/api/projects
curl http://localhost:3000/api/health/n8n
```

## Deployment

The app auto-deploys to the Raspberry Pi when changes are pushed to the main branch.

1. Cloudflared tunnel points `claude.l7-partners.com` → localhost:3000
2. GitHub webhook triggers n8n workflow
3. n8n syncs data to Supabase for backup

## Security Notes

- Webhook URLs in `data/workflows.json` are considered semi-sensitive
- No authentication currently implemented (internal tool)
- XSS protection via HTML escaping in frontend
- All user input is sanitized before rendering

## License

Private repository - L7 Partners / JGL Capital
