# Claude Hub

**URL:** https://claude.l7-partners.com
**Repo:** https://github.com/jefflitt1/claude-hub

## Overview

A knowledge graph & dashboard to track and visualize Claude agents, knowledge bases, prompts, MCP servers, and n8n workflows.

## Architecture

```
Mac (Development)          Cloud Services
├── Claude Code CLI        ├── Lovable (React frontend)
├── Interactive editing    ├── Supabase (PostgreSQL)
├── Test & refine          ├── Cloudflare (hosting)
└── Push to this repo      └── GitHub (source)

Raspberry Pi (Automation)
├── n8n (self-hosted)
└── cloudflared tunnel
```

## Tech Stack

- **Frontend:** Lovable (React) at https://claude.l7-partners.com
- **Database:** Supabase (PostgreSQL)
- **Automation:** n8n at https://n8n.l7-partners.com
- **Hosting:** Cloudflare (Lovable) + Raspberry Pi (n8n)

## Skills

| Skill | Trigger | Purpose |
|-------|---------|---------|
| recap | `/recap` | Auto-detect session accomplishments, save to log |
| recap merge | `/recap merge` | Consolidate all session logs into session-notes.md |
| recap status | `/recap status` | Show pending session logs |

Skills are registered in `~/.claude/skills/` (personal) or `.claude/skills/` (project).

## Auto-Recap Behavior

**IMPORTANT:** Automatically run `/recap` (without asking) when ANY of these conditions are met:

1. **"exit" command** - ALWAYS run recap before processing exit
2. **Long session** - Conversation exceeds ~50 turns or significant work completed
3. **Major milestone** - Feature completed, bug fixed, or deployment done
4. **Session ending** - User says "done", "thanks", "bye", or similar
5. **Context getting full** - Before context window compression would lose details

After auto-recap, run `/recap merge` if there are 3+ pending session logs.

Do NOT ask "should I run recap?" - just do it when thresholds are met.

## Project Structure

```
claude-hub/
├── CLAUDE.md              # This file - project context
├── README.md              # Full documentation
├── data/                  # JSON data (synced to Supabase)
│   ├── projects.json
│   ├── agents.json
│   ├── skills.json
│   ├── prompts.json
│   └── mcp-servers.json
├── docs/
│   ├── session-notes.md   # Running session notes
│   ├── dashboard-enhancement-plan.md  # UI/UX specs
│   └── session-logs/      # Per-terminal recap logs
├── skills/                # Custom Claude skills
├── prompts/               # System instruction files
├── workflows/             # n8n workflow exports
├── projects/              # Project-specific configs
└── configs/               # Machine-specific configs
```

## Data Flow

```
JSON files (this repo)
    ↓ GitHub push
n8n workflow (GitHub → Supabase Sync)
    ↓
Supabase tables
    ↓
Lovable React dashboard
```

## MCP Servers

| Server | Purpose |
|--------|---------|
| n8n-mcp | Connect to n8n at https://n8n.l7-partners.com |
| gdrive-JGL | Google Drive access (JGL account) |
| gdrive-L7 | Google Drive access (L7 account) |

## Supabase Tables

| Table | Purpose |
|-------|---------|
| `n8n_workflows` | Full n8n workflow inventory with analysis |
| `workflow_categories` | Workflow categorization |
| `claude_projects` | Projects and knowledge bases |
| `claude_agents` | AI agent definitions |
| `claude_skills` | Skill registry |

## Tracked Projects

All projects under `projects/` subfolder:

| Project | Type | Location |
|---------|------|----------|
| Claude Hub | App | This repo (root) |
| JGL Capital | Trading System | `projects/jgl-capital/` |
| L7 Partners | Property Management | `projects/l7partners-rewrite/` |
| Supabase MCP | MCP Server | `projects/supabase-mcp-server/` |
| Magic Agent | Knowledge Base | `~/magic.md` (standalone) |

## Development Notes

- Claude Code is interactive-only, can't run headlessly
- n8n handles all scheduled/automated tasks via Claude API
- MCP connects Claude Code → n8n (not reverse)
- Data syncs from JSON → Supabase → Lovable dashboard

---

## Master Documentation

| Document | Purpose |
|----------|---------|
| `docs/master-business-plan.md` | Operations overview, all projects, agents, skills, gaps |
| `docs/documentation-best-practices.md` | Standards for all Claude documentation |
| `docs/session-notes.md` | Running session accomplishments |

For project-specific documentation, see each project's `docs/business-plan.md`.
