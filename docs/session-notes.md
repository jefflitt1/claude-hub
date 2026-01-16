# Claude Hub Session Notes
**Last Updated:** 2026-01-15 (Session 2)
**Resume context for next session**

---

## Session Summary: 2026-01-15 (Evening)

### Completed This Session

1. **Pi Disk Space Fixed** - Freed 47GB (98% → 55%)
   - Moved `~/backups` (18GB) to USB at `/media/jeffn8n/PIUSB/pi-backups/home-backups`
   - Moved `/var/backups/n8n` (31GB) to `/media/jeffn8n/PIUSB/pi-backups/var-n8n-backups`
   - Moved n8n backup tarballs to USB

2. **Pi Setup Completed**
   - Claude Hub running on pm2 (port 3003)
   - MCP servers configured (n8n-mcp, gdrive-jgl, gdrive-l7)
   - cloudflared routing working

3. **GitHub → Supabase Sync Pipeline Built**
   - n8n workflow: `GitHub → Supabase Project Sync`
   - Webhook URL: `https://webhooks.l7-partners.com/webhook/github-project-sync`
   - Flow: GitHub push → n8n webhook → Extract data → Upsert to Supabase → Lovable displays
   - Fixed Supabase auth (switched from legacy to new secret key)
   - Fixed RLS policies for frontend read access

4. **GitHub Webhook Added**
   - Added to `jefflitt1/claude-hub` repo
   - Tested end-to-end: push → n8n → Supabase → Lovable dashboard updates

5. **Lovable Dashboard Live**
   - URL: https://claude.l7-partners.com
   - Connected to Supabase tables: `claude_projects`, `claude_agents`, `claude_mcp_servers`, `claude_prompts`, `claude_workflows`
   - Auto-updates when GitHub repos are pushed

---

## Open Items / Next Steps

### High Priority

1. **Add GitHub webhooks to other repos** - Any repo you want tracked needs the webhook:
   ```bash
   gh api repos/jefflitt1/REPO_NAME/hooks \
     --method POST \
     -f name='web' \
     -F active=true \
     -f 'events[]=push' \
     -f 'config[url]=https://webhooks.l7-partners.com/webhook/github-project-sync' \
     -f 'config[content_type]=json'
   ```

2. **Session Recap Agent** - Create a skill/agent that:
   - Reads current session context
   - Updates session-notes.md automatically
   - Tracks open items and completed work
   - Can be called with `/recap` or similar

### Optional

3. **Pi GitHub Sync** - Clone repos on Pi and set up git pull automation
4. **Add more project types** - Track agents, prompts, workflows in addition to projects
5. **Dashboard enhancements** - Ask Lovable to add filtering, search, detailed views

---

## Architecture (Current)

```
Mac (Development)              Raspberry Pi (Production)
├── Claude Code CLI            ├── Claude Code CLI
├── Interactive editing        ├── n8n (Docker) - workflows
├── ~/magic.md knowledge base  ├── Claude Hub (pm2, port 3003)
├── ~/claude-agents/ (repo)    ├── cloudflared tunnel
└── Push to GitHub ──────────► └── Webhook receives pushes
         │
         ▼
    GitHub Webhook
         │
         ▼
    n8n Workflow (webhooks.l7-partners.com)
         │
         ▼
    Supabase (donnmhbwhpjlmpnwgdqr.supabase.co)
         │
         ▼
    Lovable Dashboard (claude.l7-partners.com)
```

---

## Key Credentials & URLs

| Service | URL/Key |
|---------|---------|
| Lovable Dashboard | https://claude.l7-partners.com |
| n8n | https://n8n.l7-partners.com |
| n8n Webhooks | https://webhooks.l7-partners.com |
| Supabase | https://donnmhbwhpjlmpnwgdqr.supabase.co |
| GitHub Repo | https://github.com/jefflitt1/claude-hub |

---

## MCP Servers

| Server | Mac | Pi | URL |
|--------|-----|-----|-----|
| n8n-mcp | ✅ | ✅ | https://n8n.l7-partners.com |
| gdrive-JGL | ✅ | ✅ | - |
| gdrive-L7 | ✅ | ✅ | - |

---

## Key Files

| File | Location | Purpose |
|------|----------|---------|
| magic.md | ~/magic.md | Magic agent knowledge base |
| CLAUDE.md | ~/claude-agents/CLAUDE.md | Project context |
| session-notes.md | ~/claude-agents/docs/session-notes.md | This file - session continuity |
| server.js | ~/claude-agents/app/server.js | Claude Hub Express app (legacy) |

---

## Commands Reference

```bash
# Push changes and auto-sync to dashboard
cd ~/claude-agents && git add -A && git commit -m "Update" && git push

# Add webhook to a new repo
gh api repos/jefflitt1/REPO_NAME/hooks --method POST -f name='web' -F active=true -f 'events[]=push' -f 'config[url]=https://webhooks.l7-partners.com/webhook/github-project-sync' -f 'config[content_type]=json'

# Check n8n workflow executions
# Visit https://n8n.l7-partners.com → Executions

# SSH to Pi
ssh jeffn8n@<pi-ip>

# Check Claude Hub on Pi
pm2 status
pm2 logs claude-hub
```
