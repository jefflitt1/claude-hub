# Agent Tracker App - Design Spec
**Status:** Draft - to be reviewed next session

---

## Overview

A simple web dashboard to track and manage Claude agents, prompts, MCP servers, and n8n workflows across Mac and Pi environments.

---

## Core Features

### 1. Prompt Library
- List all saved prompts/system instructions
- View, edit, duplicate prompts
- Tag by purpose (sports, automation, research, etc.)
- Track which machine/workflow uses each prompt

### 2. MCP Server Status
- Show connected MCP servers
- Health check status (up/down)
- Last successful connection
- Quick links to server configs

### 3. n8n Workflow Registry
- List workflows that use Claude
- Show active/inactive status
- Link to n8n editor
- Execution history summary

### 4. Machine Configs
- Pi configuration
- Mac configuration
- What's running where
- Sync status between machines

### 5. Run History
- Log of automated runs
- Success/failure status
- Timestamp and duration
- Link to outputs

---

## Tech Stack Options (Simple)

### Option A: Static + JSON (Simplest)
- Single HTML file with vanilla JS
- JSON files for data storage
- No backend needed
- Host anywhere (Pi, GitHub Pages)
- **Limitation:** No real-time updates, manual refresh

### Option B: Node.js + SQLite
- Express.js backend
- SQLite database (single file)
- Simple REST API
- EJS or vanilla HTML frontend
- Host on Pi
- **Pro:** Can poll MCP/n8n for live status

### Option C: Python + Flask
- Flask backend
- SQLite or JSON storage
- Jinja2 templates
- Host on Pi
- **Pro:** Lightweight, Pi-friendly

### Option D: Next.js (if you want polish)
- React-based
- Can be static or server-rendered
- More setup, but nicer UI potential
- Host on Pi or Vercel

---

## Recommended: Option B or C

For your use case (Pi-hosted, simple, functional):
- **Node.js + SQLite** if you prefer JavaScript
- **Flask + SQLite** if you prefer Python

Both can:
- Run on Pi behind your custom domain
- Pull live status from n8n API
- Read prompt files from ~/claude-agents/prompts/
- Be simple enough to maintain

---

## Data Model (Draft)

```
prompts
├── id
├── name
├── content (the prompt text)
├── tags[]
├── used_by[] (workflow IDs)
├── machine (mac|pi|both)
├── created_at
└── updated_at

mcp_servers
├── id
├── name
├── url
├── status (connected|disconnected)
├── last_check
└── config_path

workflows
├── id
├── name
├── n8n_workflow_id
├── active (boolean)
├── trigger_type (schedule|webhook|manual)
├── schedule (cron string if applicable)
├── prompts_used[]
└── last_run

run_history
├── id
├── workflow_id
├── timestamp
├── status (success|error)
├── duration_ms
├── output_summary
└── error_message (if failed)

machines
├── id (mac|pi)
├── hostname
├── claude_code_version
├── mcp_servers[]
├── last_seen
└── notes
```

---

## Hosting on Custom Domain

Assuming Pi is at home:
1. Run app on Pi (e.g., port 3000)
2. Use Cloudflare Tunnel or ngrok for public access
3. Point your custom domain to the tunnel
4. Optional: Add basic auth for security

---

## Questions for Next Session

1. Node.js or Python preference?
2. Do you have a custom domain already configured?
3. Is Pi accessible from internet currently (tunnel, port forwarding)?
4. Any UI preferences (dark mode, minimal, etc.)?

---

## Next Steps

1. Finalize tech stack choice
2. Set up basic project structure
3. Build MVP with prompt library first
4. Add n8n integration
5. Add MCP status checking
6. Deploy to Pi + domain
