# Claude Hub Session Notes
**Last Updated:** 2026-01-16 (Session 4)
**Resume context for next session**

---

## Session Summary: 2026-01-16 (Session 4)

### L7 Partners Design Review
- Comprehensive site review from Graphic Designer perspective (brand, colors, typography, UI/UX)
- Comprehensive site review from Real Estate Consultant perspective (industry language, features, tenant experience)
- Priority recommendations compiled (high/medium/low)

### L7 Partners Code Fixes (Pushed)
- Footer: Replaced text "L7" badge with actual logo image
- Footer: Replaced placeholder Twitter link with functional phone link
- Contact form: Added visual divider with "Space Requirements" label

### Magic Infrastructure Documentation
- Reviewed all magic components on Resources page
- Documented app integrations: WebFX (card), CubeSmith (cube), Streets Pro (maps), Inject (Something Extra), Modern Oracle (8 Ball)
- Updated `~/magic.md` with full "L7 Partners Magic Infrastructure" section
- Updated `~/l7partners-rewrite/CLAUDE.md` with magic infrastructure summary

### Magic Widget Real-Time Updates (Pushed)
- Card Prediction (WebFX): 3-second polling for real-time updates
- Cube Prediction (CubeSmith): 3-second polling for real-time updates
- MagicMapsWidget: Supabase real-time subscription for instant updates
- MagicMapsWidget: 30-second expiration polling (preserves natural revert)
- Cross-fade transitions when images change
- Fixed blob URL memory cleanup bug
- Each widget now operates with isolated state

### Recap Skill Updated
- Auto-merge now runs automatically after `/recap` (no prompt needed)

---

## Session Summary: 2026-01-16 (Session 3)

### Completed

1. **Recap Skill Registered** - Created `~/.claude/skills/recap.md` with YAML frontmatter
   - `/recap` - save session log
   - `/recap merge` - consolidate logs
   - `/recap status` - show pending logs

2. **SSH Access to Pi Established**
   - Generated SSH key (`~/.ssh/id_ed25519`)
   - Added `pi-local` alias for direct LAN access
   - `pi` alias uses cloudflared tunnel (remote access)

3. **Pi GitHub Sync Set Up**
   - Created `~/sync-claude-hub.sh` on Pi
   - Cron job runs every 5 minutes
   - Auto-pulls changes from GitHub

4. **Entity Types Added**
   - `data/agents.json` - Claude agents (recap, magic, explore)
   - `data/skills.json` - Claude Code skills (recap, frontend-design, n8n)

5. **Webhook Added to l7partners-rewrite** - Now syncs to dashboard on push

---

## Session Summary: 2026-01-15

### Completed

1. **Pi Disk Space Fixed** - Freed 47GB (98% → 55%)
2. **Pi Setup Completed** - Claude Hub on pm2, MCP servers, cloudflared
3. **GitHub → Supabase Pipeline Built** - n8n workflow with webhook
4. **Lovable Dashboard Live** - https://claude.l7-partners.com
5. **Data Schema Enhanced** - Added prompts.json, workflows.json, mcp-servers.json

---

## Open Items / Next Steps

### High Priority

1. **Verify n8n workflow syncs new entity types** - Check if agents/skills sync to Supabase
2. **Add `claude_skills` table to Supabase** - If not auto-created by workflow
3. **Update Lovable dashboard** - Display agents and skills sections
4. **Submit Lovable prompt** - Hero section and WhyChoose card visual enhancements (ready in conversation)

### Deferred

5. **Portal/TMS backend work** - Payment history views, lease views, communication logs, clear heights field
6. **Dashboard enhancements** - Filtering, search, detailed views
7. **Consider Pi redundancy** - For n8n workflows

---

## Architecture (Current)

```
Mac (Development)              Raspberry Pi (Production)
├── Claude Code CLI            ├── Claude Code CLI
├── ~/.claude/skills/          ├── n8n (Docker) - workflows
├── ~/claude-agents/ (repo)    ├── ~/claude-hub/ (auto-syncs)
└── Push to GitHub ──────────► └── Cron pulls every 5 min
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

| Server | Mac | Pi | URL |
|--------|-----|-----|-----|
| n8n-mcp | ✅ | ✅ | https://n8n.l7-partners.com |
| gdrive-JGL | ✅ | ✅ | - |
| gdrive-L7 | ✅ | ✅ | - |

---

## Entity Types Tracked

| Type | File | Supabase Table |
|------|------|----------------|
| Projects | data/projects.json | claude_projects |
| Agents | data/agents.json | claude_agents |
| Skills | data/skills.json | claude_skills (TBD) |
| Prompts | data/prompts.json | claude_prompts |
| Workflows | data/workflows.json | claude_workflows |
| MCP Servers | data/mcp-servers.json | claude_mcp_servers |

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

# Add webhook to a repo
gh api repos/jefflitt1/REPO_NAME/hooks --method POST -f name='web' -F active=true -f 'events[]=push' -f 'config[url]=https://webhooks.l7-partners.com/webhook/github-project-sync' -f 'config[content_type]=json'
```
