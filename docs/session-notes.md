# Claude Hub Session Notes
**Last Updated:** 2026-01-21 (Session 1)
**Purpose:** Active items and current state only. Historical session logs are in `session-logs/archive/`.

---

## Completed This Session

### Session 1 - 2026-01-21 (n8n Workflow Fixes)
- Fixed Master Telegram Bot Code node return formats (Process + Format nodes)
- Migrated deprecated `continueOnFail` to `onError` on Save History nodes
- Added retry logic (3 retries, 5s wait) to Claude API nodes
- Fixed Mobile Approvals workflow error handling

---

## Open Items / Next Steps

### High Priority

1. **Delete unnamed Telegram bot** - Bot ID 8471835561 (orphaned) - delete manually in Telegram app
2. **Query L7 property data** - Test Supabase MCP with 3 properties (200 East 2nd, 261 Suburban, 191 East 2nd)
3. **n8n node typeVersion upgrades** - IF nodes 2.2→2.3, HTTP Request 4.2→4.4 (cosmetic only)

### Pending Migrations

1. **telegram_bot_context_tables.sql** - Run in Supabase SQL Editor (adds Q&A cache table)
2. **dashboard-schema-migration.sql** - workflow_categories, workflow_executions_summary tables

### Deferred

1. **Build l7-investor-agent knowledge base** - Create prompts/l7-investor.md with investor relations guidance
2. **Build l7-docs-agent knowledge base** - Create prompts/l7-docs.md for document processing
3. **Create additional L7 skills** - /lease-summary, /investor-update, /market-report
4. **Portal/TMS backend work** - Payment history views, lease views, communication logs, clear heights field
5. **Dashboard enhancements** - Filtering, search, detailed views
6. **Consider Pi redundancy** - For n8n workflows
7. **Separate Claude Hub from L7 Partners app** - Low priority, works fine as-is

---

## Architecture (Current)

```
Mac (Development)              Raspberry Pi (Production)
├── Claude Code CLI            ├── Claude Code CLI
├── ~/.claude/skills/          ├── n8n (Docker) - workflows
├── ~/claude-agents/ (repo)    ├── ~/claude-hub/ (auto-syncs)
├── MCP: n8n, gdrive           ├── MCP Gateway (ports 8808-8816)
└── Push to GitHub ──────────► │   ├── Filesystem, Memory, GitHub
         │                     │   ├── Puppeteer, Brave, Slack
         │                     │   └── PostgreSQL
         │                     └── Cron pulls every 5 min
         ▼
    GitHub Webhook
         │
         ▼
    n8n Workflow (webhooks.l7-partners.com)
         │                              │
         ▼                              ▼
    Supabase                    MCP Gateway (local)
         │                      n8n → localhost:880x/sse
         ▼
    Lovable Dashboard (claude.l7-partners.com)
```

---

## Key Credentials & URLs

| Service | URL |
|---------|-----|
| Lovable Dashboard | https://claude.l7-partners.com |
| n8n | https://n8n.l7-partners.com |
| n8n Webhooks | https://webhooks.l7-partners.com |
| Supabase | https://donnmhbwhpjlmpnwgdqr.supabase.co |
| GitHub Repo | https://github.com/jefflitt1/claude-hub |

---

## SSH Access

| Alias | Command | Use Case |
|-------|---------|----------|
| pi-local | `ssh pi-local` | Direct LAN (faster) |
| pi | `ssh pi` | Via cloudflared (remote) |

---

## MCP Servers

### Claude Desktop / Claude Code MCP
| Server | Mac | Pi | URL |
|--------|-----|-----|-----|
| n8n-mcp | ✅ | ✅ | https://n8n.l7-partners.com |
| gdrive-JGL | ✅ | ✅ | - |
| gdrive-L7 | ✅ | ✅ | - |
| supabase-l7 | ✅ | - | https://mcp.supabase.com (OAuth) |

### MCP Gateway (Pi - Supergateway over SSE)
| Server | Port | Local URL | Status |
|--------|------|-----------|--------|
| Filesystem | 8808 | http://localhost:8808/sse | ✅ |
| Memory | 8810 | http://localhost:8810/sse | ✅ |
| GitHub | 8812 | http://localhost:8812/sse | ✅ |
| Brave | 8813 | http://localhost:8813/sse | ✅ |
| Puppeteer | 8814 | http://localhost:8814/sse | ✅ |
| Slack | 8815 | http://localhost:8815/sse | Needs Slack app |
| PostgreSQL | 8816 | http://localhost:8816/sse | ✅ |

---

## Commands Reference

```bash
# Push changes (triggers webhook → Supabase → dashboard)
cd ~/claude-agents && git add -A && git commit -m "Update" && git push

# SSH to Pi
ssh pi-local    # LAN
ssh pi          # Remote (cloudflared)

# Check Pi services
ssh pi-local "pm2 status; tail -5 ~/claude-hub/sync.log"

# MCP Gateway management
ssh pi-local "cd ~/mcp-gateway && docker compose ps"           # Status
ssh pi-local "cd ~/mcp-gateway && docker compose logs -f"      # Logs
ssh pi-local "cd ~/mcp-gateway && docker compose restart"      # Restart all
ssh pi-local "curl -s http://localhost:8808/sse | head -2"     # Test endpoint
```
