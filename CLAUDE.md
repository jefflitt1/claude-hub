# Claude Hub

**URL:** https://claude.l7-partners.com
**Data Repo:** https://github.com/jefflitt1/claude-hub
**Frontend Repo:** https://github.com/jefflitt1/l7partners-rewrite (shared with L7 Partners site)

## Overview

Knowledge graph & dashboard for Claude agents, prompts, MCP servers, and n8n workflows.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           REPOSITORIES                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  claude-hub (this repo)              l7partners-rewrite                  │
│  ├── data/ (JSON)                    ├── src/components/sections/        │
│  ├── docs/                           │   └── HomeSection.tsx             │
│  ├── prompts/                        ├── src/pages/claude/               │
│  ├── workflows/                      │   └── ClaudeLogin.tsx             │
│  └── scripts/                        └── src/pages/ClaudeCatalog.tsx     │
│       ↓                                        ↓                         │
│  Data & Documentation                 React Frontend (Lovable)           │
└─────────────────────────────────────────────────────────────────────────┘
                    ↓                              ↓
              Supabase DB  ←────────────→  Dashboard UI
                    ↓
              n8n Workflows (Raspberry Pi)
```

## Tech Stack

- **Frontend:** Lovable (React + Vite + TypeScript) - lives in `l7partners-rewrite`
- **Database:** Supabase (PostgreSQL)
- **Automation:** n8n at https://n8n.l7-partners.com
- **Hosting:** Cloudflare + Raspberry Pi

## Project Structure

```
claude-agents/                          # THIS REPO - Data & Docs
├── CLAUDE.md                           # This file
├── data/                               # JSON data (synced to Supabase)
├── docs/
│   ├── session-notes.md                # Running session notes
│   ├── session-logs/                   # Per-terminal recap logs
│   └── operations/                     # Operational docs
├── scripts/                            # Maintenance & utility scripts
├── skills/                             # Custom Claude skills
├── prompts/                            # System instruction files (inc. Lovable prompts)
├── workflows/                          # n8n workflow exports
└── projects/
    └── l7partners-rewrite/             # FRONTEND REPO (git subproject)
        └── src/
            ├── components/sections/HomeSection.tsx
            ├── components/CommandPalette.tsx
            ├── components/PinnedItemsSection.tsx
            ├── pages/claude/ClaudeLogin.tsx
            └── pages/ClaudeCatalog.tsx
```

## Lovable ↔ GitHub ↔ Claude Code Sync

**IMPORTANT:** The Claude Hub dashboard frontend is part of the `l7partners-rewrite` Lovable project.

### Two-Way Sync Setup
```
Lovable Project (0623dc91-517d-423f-8ad2-54a46bcdd8ac)
         ↕ automatic 2-way sync
GitHub: jefflitt1/l7partners-rewrite
         ↕ git pull/push
Local: ~/Documents/Claude Code/claude-agents/projects/l7partners-rewrite/
```

### Workflow for Changes

| Edit Location | Sync Steps |
|---------------|------------|
| **Lovable** | Auto-pushes to GitHub → Run `git pull` locally |
| **Claude Code** | Edit locally → `git push` → Lovable syncs in ~30s |

### Best Practices
- Always `git pull` before starting work in Claude Code
- Commit frequently with clear messages
- Avoid editing same file in both places simultaneously
- If conflicts occur, resolve in Git (Lovable's merge handling is limited)

### Key Frontend Files
| File | Purpose |
|------|---------|
| `src/components/sections/HomeSection.tsx` | Dashboard home with stats, activity, errors |
| `src/components/CommandPalette.tsx` | Cmd+K global search |
| `src/components/PinnedItemsSection.tsx` | Favorites/pinned items |
| `src/pages/claude/ClaudeLogin.tsx` | Claude Hub authentication |
| `src/pages/ClaudeCatalog.tsx` | Main Claude Hub page |

## Data Flow

```
JSON files → GitHub push → n8n sync → Supabase → Lovable dashboard
                                          ↑
                              n8n API (execution stats)
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
**Conversational memory enabled** - Claude remembers previous messages via session tracking (`telegram-{bot}-{chatId}`).

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
| `docs/operations/mcp-servers.md` | MCP server details |
| `docs/operations/pending-sql.md` | Pending SQL migrations |
| `scripts/README.md` | Maintenance script documentation |

For coaching behaviors, MCP servers, and skills: see `~/CLAUDE.md`
