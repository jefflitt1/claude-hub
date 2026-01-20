# Claude Hub

**URL:** https://claude.l7-partners.com
**Repo:** https://github.com/jefflitt1/claude-hub

## Overview

Knowledge graph & dashboard for Claude agents, prompts, MCP servers, and n8n workflows.

## Architecture

```
Mac (Development)          Cloud Services
├── Claude Code CLI        ├── Lovable (React frontend)
├── Interactive editing    ├── Supabase (PostgreSQL)
└── Push to repo           └── Cloudflare (hosting)

Raspberry Pi (Automation)
├── n8n (self-hosted)
└── cloudflared tunnel
```

## Tech Stack

- **Frontend:** Lovable (React)
- **Database:** Supabase (PostgreSQL)
- **Automation:** n8n at https://n8n.l7-partners.com
- **Hosting:** Cloudflare + Raspberry Pi

## Project Structure

```
claude-hub/
├── CLAUDE.md              # This file
├── data/                  # JSON data (synced to Supabase)
├── docs/
│   ├── session-notes.md   # Running session notes
│   └── session-logs/      # Per-terminal recap logs
├── skills/                # Custom Claude skills
├── prompts/               # System instruction files
├── workflows/             # n8n workflow exports
└── projects/              # Subprojects
```

## Data Flow

```
JSON files → GitHub push → n8n sync → Supabase → Lovable dashboard
```

## Supabase Tables

### Core Tables
| Table | Purpose |
|-------|---------|
| `n8n_workflows` | Full workflow inventory with category, priority, execution stats |
| `claude_projects` | Projects and knowledge bases |
| `claude_agents` | AI agent definitions |
| `claude_skills` | Skill registry |

### Dashboard Enhancement Tables (Added 2026-01-19)
| Table | Purpose |
|-------|---------|
| `workflow_categories` | Workflow categorization (Production, Development, Integration, etc.) |
| `workflow_executions_summary` | Daily success/error counts per workflow |
| `workflow_dependencies` | Track workflow interconnections |
| `dashboard_sections` | Configurable UI sections with icons/colors |

## Development Notes

- Claude Code is interactive-only
- n8n handles scheduled tasks via Claude API
- Data syncs: JSON → Supabase → Dashboard

## Telegram Bot System

**Master Workflow:** `stlQoP2huGVmGzRS` (Master Telegram Bot Conversations)

All project bots share one workflow with dynamic context injection from Supabase.

| Bot | Project | Purpose |
|-----|---------|---------|
| @JGLCapitalBot | jgl-capital | Trading assistant (CIO persona) |
| @L7PartnersBot | l7-partners | Property management |
| @Magic_agent1_bot | magic-agent | Magic knowledge base |

**Key Tables:**
- `telegram_bot_configs` - Bot → project mapping, context templates
- `telegram_context_templates` - Detailed context with agent rosters
- `quick_responses` - Quick response cache (reduces API calls)

**Adding New Bots:**
1. Create bot in BotFather
2. Add n8n credential
3. Insert into `telegram_bot_configs`
4. Add trigger node to Master workflow

**Full Documentation:** `docs/telegram-context-injection-system.md`

---

## Related Docs

| Document | Purpose |
|----------|---------|
| `docs/master-business-plan.md` | Operations overview |
| `docs/session-notes.md` | Session accomplishments |
| `docs/telegram-context-injection-system.md` | Telegram bot architecture |
| `docs/telegram-bot-prompts.md` | Per-project prompt templates |

For coaching behaviors, MCP servers, and skills: see `~/CLAUDE.md`
