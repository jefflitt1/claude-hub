# Claude Hub

**URL:** https://claude.l7-partners.com
**Repo:** https://github.com/jefflitt1/claude-hub

## Overview

A knowledge graph & dashboard to track and visualize Claude agents, knowledge bases, prompts, MCP servers, and n8n workflows.

## Architecture

```
Mac (Development)          Raspberry Pi (Production)
├── Claude Code CLI        ├── n8n (self-hosted)
├── Interactive editing    ├── Claude Hub web app
├── Test & refine          ├── cloudflared tunnel
└── Push to this repo      └── Pulls shared configs
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

1. **Long session** - Conversation exceeds ~50 turns or significant work completed
2. **Major milestone** - Feature completed, bug fixed, or deployment done
3. **Session ending** - User says "done", "thanks", "bye", or similar
4. **Context getting full** - Before context window compression would lose details

After auto-recap, run `/recap merge` if there are 3+ pending session logs.

Do NOT ask "should I run recap?" - just do it when thresholds are met.

## Project Structure

```
claude-hub/
├── CLAUDE.md              # This file - project context
├── skills/                # Custom Claude skills
│   └── recap.md           # Session recap skill
├── docs/
│   ├── session-notes.md   # Running session notes
│   └── session-logs/      # Per-terminal recap logs
├── app/                   # Legacy Express app (replaced by Lovable)
├── data/                  # Legacy JSON data (replaced by Supabase)
├── prompts/               # System instruction files
├── projects/              # Project-specific configs
└── configs/               # Machine-specific configs
```

## Quick Start

```bash
cd app
npm install
npm run dev
# Visit http://localhost:3000
```

## MCP Servers

| Server | Purpose |
|--------|---------|
| n8n-mcp | Connect to n8n at https://n8n.l7-partners.com |
| gdrive-JGL | Google Drive access (JGL account) |
| gdrive-L7 | Google Drive access (L7 account) |

## Tracked Projects

| Project | Type | Location |
|---------|------|----------|
| Magic Agent | Knowledge Base | ~/magic.md |
| Claude Hub | App | This repo |

## Development Notes

- Claude Code is interactive-only, can't run headlessly
- n8n handles all scheduled/automated tasks via Claude API
- MCP connects Claude Code → n8n (not reverse)
- Data stored in JSON for simplicity; can migrate to SQLite later

## Deployment

1. Clone repo on Pi
2. `cd app && npm install && npm start`
3. Configure cloudflared tunnel to point to localhost:3000
4. DNS: claude.l7-partners.com → cloudflared tunnel
