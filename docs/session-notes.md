# Claude Hub Session Notes
**Last Updated:** 2025-01-15
**Resume context for next session**

---

## Session Summary: 2025-01-15

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

### On Pi (need to complete)

```bash
# 1. Clone the repo
cd ~
git clone https://github.com/jefflitt1/claude-hub.git
cd claude-hub/app
npm install

# 2. Set up n8n MCP server
claude mcp add n8n-mcp --transport stdio -- npx n8n-mcp --stdio
claude mcp add-env n8n-mcp N8N_API_URL https://n8n.l7-partners.com
claude mcp add-env n8n-mcp N8N_API_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiYWFmZmY3OS00YjE2LTRkZTItYTg1OC0yYzcyYTQwZmU3ZGIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU2ODM3MzUxfQ.Zv9rHt2_u2a-Tbb2YsluqxlM8QH8W5z1bznmo6Qgzf8"
claude mcp add-env n8n-mcp MCP_MODE stdio

# 3. Verify MCP working
claude
# Type: /mcp

# 4. Deploy Claude Hub
cd ~/claude-hub/app
pm2 start server.js --name claude-hub

# 5. Add cloudflared route (edit ~/.cloudflared/config.yml)
# Add:
#   - hostname: claude.l7-partners.com
#     service: http://localhost:3000

# 6. Restart cloudflared
sudo systemctl restart cloudflared

# 7. Add DNS in Cloudflare: claude.l7-partners.com → CNAME → tunnel
```

### Google Drive MCPs (optional for Pi)
- Need to copy OAuth credentials from Mac to Pi
- Files needed:
  - `~/.config/gdrive-mcp/jgl/gcp-oauth.keys.json`
  - `~/.config/gdrive-mcp/jgl/.gdrive-server-credentials.json`
  - `~/.config/gdrive-mcp/l7/gcp-oauth.keys.json`
  - `~/.config/gdrive-mcp/l7/.gdrive-server-credentials.json`

### Disk Space Warning
- Pi main disk at 98% (2.4GB free)
- Consider cleanup or moving data to `/media/jeffn8n/PIUSB` (95GB free)

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
| n8n-mcp | ✅ | Pending | https://n8n.l7-partners.com |
| gdrive-JGL | ✅ | Optional | - |
| gdrive-L7 | ✅ | Optional | - |

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
