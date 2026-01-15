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

- **Backend:** Node.js + Express
- **Data:** JSON files (upgradeable to SQLite)
- **Frontend:** Vanilla HTML/CSS/JS
- **Hosting:** Raspberry Pi via cloudflared

## Project Structure

```
claude-hub/
├── CLAUDE.md              # This file - project context
├── app/                   # Web application
│   ├── server.js          # Express server
│   ├── package.json       # Dependencies
│   └── public/            # Static frontend
│       └── index.html     # Dashboard UI
├── data/                  # JSON data store
│   ├── projects.json      # Projects & knowledge bases
│   ├── mcp-servers.json   # MCP server registry
│   ├── prompts.json       # Saved prompts
│   └── workflows.json     # n8n workflow registry
├── docs/                  # Design specs and notes
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
