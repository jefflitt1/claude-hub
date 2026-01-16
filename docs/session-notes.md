# Claude Hub Session Notes
**Last Updated:** 2026-01-15
**Resume context for next session**

---

## Session Summary: 2026-01-15

### Completed This Session

1. **Magic Agent Knowledge Base** - Added "Craft Principles" section to `~/magic.md`
   - Extracted from Ted's Sterling Magic learning pages
   - Covers: shell/insert systems, rough & smooth cards, sleights, combination strategies
   - ~260 lines added to knowledge base

2. **GitHub Setup**
   - Installed `gh` CLI on Mac
   - Authenticated as `jefflitt1`
   - Created repo: https://github.com/jefflitt1/claude-hub

3. **Claude Hub MVP Built**
   - Express.js server with JSON data store
   - Landing page with expandable project cards
   - API endpoints: `/api/projects`, `/api/graph`
   - Tracks: Magic Agent, Claude Hub, MCP servers

4. **Pi Setup Started**
   - Installed Claude Code CLI on Pi (`sudo npm install -g @anthropic-ai/claude-code`)
   - Authenticated Claude on Pi
   - Pi specs: Debian Bookworm ARM64, Node v18.20.8, n8n in Docker

---

## Open Items / Next Steps

### In Progress (Jeff handling separately)
- **Pi Storage** - Main disk at 98%, fixing before continuing
- **Pi MCP Setup** - n8n-mcp and gdrive credentials being configured

### On Pi (after storage fix)

```bash
# 1. Clone the repo
cd ~
git clone https://github.com/jefflitt1/claude-hub.git
cd claude-hub/app
npm install

# 2. Deploy with pm2
pm2 start server.js --name claude-hub
```

*Note: cloudflared already configured and working - claude.l7-partners.com is live*

### UI Configuration (Claude + Lovable)

**Goal:** Better dashboard UI at https://claude.l7-partners.com

**Claude's tasks:**
1. Structure data correctly in JSON files (projects, MCP servers, workflows)
2. Create prompts for Lovable to build the visual components

**Deliverables:**
- Clean data schema for dashboard
- Lovable prompts for: project cards, knowledge graph visualization, MCP server status

---

## Architecture

```
Mac (Development)              Raspberry Pi (Production)
├── Claude Code CLI            ├── Claude Code CLI (just installed)
├── Interactive editing        ├── n8n (Docker)
├── ~/magic.md knowledge base  ├── Claude Hub web app (to deploy)
├── ~/claude-agents/ (repo)    ├── cloudflared tunnel
└── Push to GitHub             └── Pulls from GitHub
```

**Domain:** claude.l7-partners.com → Pi via cloudflared

---

## MCP Servers

| Server | Mac | Pi | URL |
|--------|-----|-----|-----|
| n8n-mcp | ✅ | In progress | https://n8n.l7-partners.com |
| gdrive-JGL | ✅ | In progress | - |
| gdrive-L7 | ✅ | In progress | - |

---

## Key Files

| File | Location | Purpose |
|------|----------|---------|
| magic.md | ~/magic.md | Magic agent knowledge base |
| CLAUDE.md | ~/claude-agents/CLAUDE.md | Project context |
| projects.json | ~/claude-agents/data/projects.json | Tracked projects |
| server.js | ~/claude-agents/app/server.js | Claude Hub Express app |

---

## Commands to Resume

```bash
# On Mac - test Claude Hub locally
cd ~/claude-agents/app && npm start
# Visit http://localhost:3000

# On Pi - complete setup
# Follow "Open Items" section above

# Push changes from Mac
cd ~/claude-agents && git add -A && git commit -m "Update" && git push

# Pull changes on Pi
cd ~/claude-hub && git pull
```
