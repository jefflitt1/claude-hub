# Claude Hub Session Notes
**Last Updated:** 2026-01-17 (Session 17)
**Resume context for next session**
**Apple Notes:** Auto-syncs on commit (cleaned for readability)

---

## Session Summary: 2026-01-17 (Session 17)

### /done Skill Created
Created end-of-session skill to ensure progress is always logged:
- `/done` runs recap, merges to session-notes.md, commits, and confirms ready to exit
- Use instead of typing `exit` directly
- Location: `~/.claude/skills/done/SKILL.md`

### Session Management Hooks Verified
Confirmed Claude Code supports `SessionEnd` hook event:
- Fires when user exits, logs out, or clears session
- Could be used for automated cleanup/reminders
- Hooks can run shell commands but NOT Claude skills directly

### Daily Digest Workflow Verified Working
- Tested execution 4771 succeeded (2:34pm today)
- Emails sent successfully to jglittell@gmail.com
- 6am scheduled run failed due to OLD workflow version (before JSON fix)
- Current version with Code node approach is working

### claude.l7-partners.com DNS Verified Working
- Site is live and protected by Cloudflare Access
- Returns 302 redirect to Cloudflare Access login (as intended)
- Main site l7-partners.com also working (HTTP 200 via Netlify)

### Supabase MCP Blocker Identified
- Supabase NOT in Docker Desktop MCP catalog (only in CLI registry)
- Supabase legacy API keys disabled since 2025-09-16
- Need to re-enable legacy keys OR get new publishable/secret keys
- Dashboard: https://supabase.com/dashboard/project/donnmhbwhpjlmpnwgdqr/settings/api

---

## Session Summary: 2026-01-17 (Session 16)

### Parent-Child Project Hierarchy Implemented
Designed and implemented hierarchical project structure with `parentId` field:

**Data Model Changes (`projects.json`):**
- Added `parentId` field to all projects (null = top-level, parent's id = child)
- L7 Partners (parentId: null) - top-level business umbrella
- l7partners-rewrite (parentId: "l7-partners") - child app under L7 Partners
- Magic Agent (parentId: null) - top-level standalone
- Claude Hub (parentId: null) - top-level standalone

**Structural Changes:**
- Moved repo link from L7 Partners to l7partners-rewrite (where code lives)
- Split agents: business-level on parent (chatbot, realestate, deals, investor), codebase-level on child (codebase, designer, docs)

**Duplicate Claude Hub Issue Identified:**
- Dashboard showing two Claude Hub entries from Supabase (not local JSON)
- One "building" status, one "active" with URL - keep the active one

**Pending Supabase Changes (needs MCP auth):**
```sql
ALTER TABLE projects ADD COLUMN parent_id TEXT REFERENCES projects(id);
-- Then update: l7partners-rewrite.parent_id = 'l7-partners'
-- Consider: L7 Knowledge Base.parent_id = 'l7-partners'
-- Delete: duplicate Claude Hub entry
```

---

## Session Summary: 2026-01-17 (Session 15)

### Daily Digest Workflow Fixed
Fixed JSON escaping issue in "Daily Agent Status Digest" workflow:
- Problem: `JSON.stringify()` inside n8n expressions produced nested JSON that broke outer structure
- Solution: Build complete API body as JavaScript object in Code node, serialize once with `JSON.stringify($json.apiBody)`
- Workflow ID: 2fwvrmN2I3PDcXRz

### GitHub to Supabase Sync Workflow Enhanced
Updated sync workflow to fetch and sync agents/skills on push:

**New Flow:**
```
Webhook -> Extract -> Upsert Project -> Is Claude Hub?
                                              | Yes
                        +---------------------+---------------------+
                        v                                           v
               Fetch Agents JSON                           Fetch Skills JSON
                        v                                           v
               Transform Agents                            Transform Skills
                        v                                           v
                Upsert Agents                               Upsert Skills
```

- Fetches from raw.githubusercontent.com/jefflitt1/claude-hub/main/data/
- Transforms JSON to match Supabase table schemas
- Workflow ID: KQ2bleG4vj728I4f

### Supabase API Key Issue Discovered
Sync workflow triggered successfully but failed at Supabase upsert:
- Error: "Legacy API keys are disabled" (disabled 2025-09-16)
- Fix needed: Re-enable legacy keys in Supabase dashboard OR update workflow with new publishable/secret keys

---

## Session Summary: 2026-01-17 (Session 14)

### L7 Partners Business Infrastructure Built
Expanded L7 Partners from a "website project" to a comprehensive business entity:

**Project Structure Expansion (`projects.json`):**
- 5 business domains: Property Management (active), Acquisitions (building), Investor Relations (planned), Asset Management (planned), Leasing (planned)
- Integrations tracking: Google Drive, Sheets (active), QuickBooks, CoStar (planned)
- Connections to agents and skills

**New Agents Added (`agents.json`):**
- `l7-deals-agent` - Acquisitions consultant with screening, underwriting, pro forma capabilities
- `l7-investor-agent` - Investor relations consultant (planned)
- `l7-docs-agent` - Document processor for OMs, rent rolls, leases (planned)

**Deals Agent Knowledge Base Created (`~/claude-agents/prompts/l7-deals.md`):**
- L7 investment criteria (shallow-bay industrial, 20k-150k SF, NE US, 7-9.5% cap rates)
- Return targets (15-20% IRR, 1.8-2.2x equity multiple)
- Deal killer checklist
- Pro forma framework
- Due diligence checklist
- Investment memo template

**Deal Analysis Skill Created (`~/.claude/skills/deal-analysis/skill.md`):**
- `/deal-analysis` - Interactive deal screening
- `/deal-analysis quick` - Rapid go/no-go with minimal inputs
- `/deal-analysis full` - Comprehensive analysis with pro forma

**Supabase MCP Configured:**
- Added `supabase-l7` HTTP MCP server to `~/.claude.json`
- Uses OAuth method (browser-based, no PAT needed)
- Restricted to L7 project: `donnmhbwhpjlmpnwgdqr`
- Status: Pending authentication (restart Claude Code, then browser popup on first use)

**Database Schema Reviewed:**
- L7 data lives in `l7` schema with public views: `properties_l7`, `tenants_l7`, `leases_l7`, `units_l7`
- Found 2 of 3 properties in migrations: '200' (200 East 2nd), '191' (191 East 2nd - development)
- 261 Suburban Ave may be in live database only

---

## Session Summary: 2026-01-17 (Session 13)

### Telegram Approval Cleanup Feature Implemented
Fixed issue where Telegram approval messages stayed active after terminal approval:

**Changes Made:**
- `~/.claude/approval-handler.py` - Added cleanup webhook call on timeout/exit, signal handlers (SIGTERM, SIGINT), atexit handlers
- n8n workflow "Claude Code Mobile Approvals" - Added 7 new nodes for cleanup flow

**New Nodes Added to Workflow:**
- Store Message ID (Redis) - Saves message_id after sending Telegram
- Cleanup Webhook - New endpoint `/webhook/claude-cleanup`
- Get Message ID (Redis) - Retrieves stored message_id
- Parse Cleanup (Code) - Determines status text/emoji
- Has Message? (If) - Checks if message exists
- Edit Message (Cleanup) - Updates Telegram message
- Delete Message Key (Redis) - Cleans up Redis

**Behavior:**
- Timeout (120s) → Telegram shows "⏱️ EXPIRED"
- Ctrl+C → Telegram shows "🚫 CANCELLED"
- Telegram approval → Shows "✅ APPROVED by {user}" (existing)

**Infrastructure:**
- Configured Cloudflare Access `/api/*` bypass for n8n API programmatic access
- n8n API key already configured in MCP (no .zshrc needed)

---

## Session Summary: 2026-01-17 (Session 12)

### Consistent Formatting for Apple Notes and Email Digest
Unified the markdown formatting between Apple Notes sync and n8n email digest:
- Found Apple Notes formatting in `.git/hooks/post-commit` (pandoc GFM to HTML)
- Updated n8n "Daily Agent Status Digest" workflow Claude API prompt
- Both outputs now use consistent formatting rules:
  - `#` main, `##` sections, `###` subsections
  - `---` horizontal rules between sections
  - `**Bold:**` for inline labels
  - `-` dash for bullets (not asterisks)
  - No emojis, concise one-line bullets

**Workflow updated:** Daily Agent Status Digest (ID: 2fwvrmN2I3PDcXRz)

---

## Session Summary: 2026-01-16 (Session 11)

### Apple Notes Sync Implemented
Set up automatic sync of session-notes.md to Apple Notes for mobile access:
- Created Apple Note "Claude Session Notes"
- Git post-commit hook triggers sync when session-notes.md is committed
- Installed pandoc for markdown-to-HTML conversion
- Fixed UTF-8 encoding (arrows, box-drawing chars converted to ASCII)

**How it works:**
```
/recap runs -> commits session-notes.md -> post-commit hook
    -> pandoc converts to HTML -> updates Apple Note
```

**Files created:**
- `.git/hooks/post-commit` - Sync hook script

---

## Session Summary: 2026-01-16 (Session 9)

### DNS/Hosting Architecture Clarified
Documented relationship between services for L7 Partners:
```
Lovable (IDE) → GitHub (code) → Netlify (hosting)
                                    ↓
User → Cloudflare DNS → Netlify (for Lovable apps)
                     → Cloudflare Tunnel → Pi (for n8n, etc.)
```

### claude.l7-partners.com Issues Investigated
- Original problem: Site was accessible but needed Cloudflare Access protection
- Incorrectly attempted DNS fixes which broke things
- Discovered: claude.l7 should point to Netlify (same app as main site with subdomain routing)
- Netlify shows "Pending DNS verification" - needs CNAME to `apex-loadbalancer.netlify.com`

---

## RESUME HERE: Fix claude.l7-partners.com (2026-01-17)

### Background / What Happened
- `claude.l7-partners.com` was WORKING but publicly accessible
- User wanted to add Cloudflare Access protection (login gate)
- We incorrectly tried to fix DNS, breaking things
- The site is part of the l7partners-rewrite Lovable app (same codebase as l7-partners.com)
- React app detects subdomain and shows ClaudeCatalog component at root

### Current Broken State
- `l7-partners.com` - May have DNS issues (Netlify shows "Pending DNS verification")
- `claude.l7-partners.com` - DNS not configured, getting errors

### Architecture Understanding
```
┌─────────────────────────────────────────────────────────────┐
│  Lovable (visual IDE) - https://lovable.dev/projects/...    │
│     │                                                       │
│     ├── Pushes code to → GitHub (jefflitt1/l7partners-rewrite)
│     │                                                       │
│     └── Auto-deploys to → Netlify                           │
│            │                                                │
│            │  Netlify subdomain: peaceful-meringue-0d4813.netlify.app
│            │  Netlify load balancer: apex-loadbalancer.netlify.com
│            │                                                │
│  User → Cloudflare DNS → Netlify servers                    │
│                                                             │
│  For Pi services (n8n, etc.):                               │
│  User → Cloudflare DNS → Cloudflare Tunnel → Raspberry Pi   │
└─────────────────────────────────────────────────────────────┘
```

### Key URLs & Dashboards

| Service | URL |
|---------|-----|
| Cloudflare DNS | https://dash.cloudflare.com → l7-partners.com → DNS |
| Cloudflare Tunnels | https://one.dash.cloudflare.com → Networks → Tunnels |
| Cloudflare Access | https://one.dash.cloudflare.com → Access → Applications |
| Netlify Dashboard | https://app.netlify.com → L7 Partners → l7-partners.com project |
| Lovable Project | https://lovable.dev/projects/0623dc91-517d-423f-8ad2-54a46bcdd8ac |

### Netlify's DNS Requirements (from their dashboard)
For apex domain (l7-partners.com):
- **Recommended:** CNAME to `apex-loadbalancer.netlify.com`
- **Fallback:** A record to `75.2.60.5`

For subdomains (claude.l7-partners.com):
- CNAME to `peaceful-meringue-0d4813.netlify.app`

### What Cloudflare DNS Should Look Like (Target State)

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | l7-partners.com (or @) | apex-loadbalancer.netlify.com | DNS only (gray) |
| CNAME | www | peaceful-meringue-0d4813.netlify.app | DNS only (gray) |
| CNAME | claude | peaceful-meringue-0d4813.netlify.app | DNS only (gray) |
| CNAME | n8n | c5935af7-7aba-453a-888e-73059ac1489d.cfargotunnel.com | Proxied (orange) |
| CNAME | admin | c5935af7-7aba-453a-888e-73059ac1489d.cfargotunnel.com | Proxied (orange) |
| ... other tunnel subdomains ... | | |

**Important:** Netlify domains need "DNS only" (gray cloud) for SSL verification to work.
Tunnel domains need "Proxied" (orange cloud) for Cloudflare protection.

### Step-by-Step Fix Instructions

#### Step 1: Fix Main Domain (l7-partners.com)
1. Go to Cloudflare DNS: https://dash.cloudflare.com → l7-partners.com → DNS
2. **DELETE** any A records for `l7-partners.com` (there were two: 99.83.229.7 and 75.2.60.5)
3. **ADD** new record:
   - Type: CNAME
   - Name: `@` (or `l7-partners.com`)
   - Target: `apex-loadbalancer.netlify.com`
   - Proxy status: DNS only (gray cloud)
4. Wait 1-2 minutes
5. Test: `dig @8.8.8.8 l7-partners.com +short` - should show Netlify IPs
6. Test: Visit https://l7-partners.com in incognito

#### Step 2: Verify Netlify DNS Verification
1. Go to Netlify: https://app.netlify.com → l7-partners.com project → Domain settings
2. Check if `l7-partners.com` shows "Live" instead of "Pending DNS verification"
3. If still pending, wait a few more minutes for propagation

#### Step 3: Add claude Subdomain in Netlify
1. In Netlify Domain settings, click "Add domain alias"
2. Enter: `claude.l7-partners.com`
3. It should verify quickly (TXT record `_lovable.claude` already exists in Cloudflare)

#### Step 4: Add claude DNS Record in Cloudflare
1. Go to Cloudflare DNS
2. **ADD** new record:
   - Type: CNAME
   - Name: `claude`
   - Target: `peaceful-meringue-0d4813.netlify.app`
   - Proxy status: DNS only (gray cloud)
3. Wait 1-2 minutes
4. Test: Visit https://claude.l7-partners.com in incognito
5. Should show the Claude Catalog page

#### Step 5: Add Cloudflare Access Protection
1. Go to Cloudflare Zero Trust: https://one.dash.cloudflare.com
2. Navigate: Access → Applications → Add an application
3. Select: Self-hosted
4. Configure:
   - Application name: Claude Catalog
   - Session duration: 24 hours (or preference)
   - Application domain: `claude.l7-partners.com`
5. Add policy:
   - Policy name: Allow Jeff
   - Action: Allow
   - Include rule: Emails ending in `@yourdomain.com` OR specific email `your@email.com`
6. Save

#### Step 6: Test Everything
1. https://l7-partners.com - Should load main site
2. https://claude.l7-partners.com - Should show Cloudflare Access login, then Claude Catalog after auth
3. https://n8n.l7-partners.com - Should still work (unchanged)

### Troubleshooting

**If main site still broken after Step 1:**
- Flush local DNS: `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`
- Test with Google DNS: `dig @8.8.8.8 l7-partners.com +short`
- Check Netlify dashboard for specific error messages

**If claude subdomain shows "Site not found" from Netlify:**
- Make sure Step 3 was completed (added as domain alias in Netlify)
- Check Netlify Domain settings shows `claude.l7-partners.com` as verified

**If Cloudflare Access not triggering:**
- Make sure the application domain exactly matches `claude.l7-partners.com`
- Check that DNS is set to "DNS only" (gray cloud) - Access works with both, but verify

### Commands for Debugging
```bash
# Check what DNS returns
dig @8.8.8.8 l7-partners.com +short
dig @8.8.8.8 claude.l7-partners.com +short

# Flush local DNS cache (Mac)
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

# Check nameservers
whois l7-partners.com | grep -i "name server"

# Test HTTP response
curl -I https://l7-partners.com
curl -I https://claude.l7-partners.com
```

---

### Current Cloudflare DNS Records (as of tonight)
These are the tunnel subdomains that SHOULD remain unchanged:
- admin → cfargotunnel.com (Proxied)
- bot → cfargotunnel.com (Proxied)
- kibana → cfargotunnel.com (Proxied)
- kuma → cfargotunnel.com (Proxied)
- metabase → cfargotunnel.com (Proxied)
- n8n → cfargotunnel.com (Proxied)
- ssh → cfargotunnel.com (Proxied)
- supabase → cfargotunnel.com (Proxied)
- vnc → cfargotunnel.com (Proxied)
- webhooks → cfargotunnel.com (Proxied)

These need to be fixed:
- l7-partners.com → CNAME to apex-loadbalancer.netlify.com (DNS only)
- www → CNAME to peaceful-meringue-0d4813.netlify.app (DNS only) [may already be correct]
- claude → CNAME to peaceful-meringue-0d4813.netlify.app (DNS only) [needs to be added]

---

## Session Summary: 2026-01-16 (Session 8)

### Claude Code Mobile Approval System
Built end-to-end mobile approval system for Claude Code permission requests:

**Components Created:**
- `~/.claude/approval-handler.py` - Hook script that sends requests to n8n, polls Redis for responses
- `~/.claude/settings.json` - PermissionRequest hook configuration
- n8n workflow "Claude Code Mobile Approvals" - Telegram notifications with inline Approve/Deny buttons
- Telegram bot @claudeterminal1463bot

**Infrastructure:**
- Standalone Redis installed on Pi (192.168.4.147:6379)
- Firewall ports opened (6379, 6380)
- Telegram webhook → n8n callback URL
- Environment variables in `~/.zshrc`

**Flow:**
```
Claude Code → approval-handler.py → n8n webhook → Telegram notification
     ↑                                                    ↓
     └──────────── Redis ←──────────────────── Approve/Deny button
```

**Note:** Hook only fires for tools NOT in allowedTools list (Bash, Read, Write are pre-approved)

---

## Session Summary: 2026-01-16 (Session 7)

### MCP Gateway Installed on Pi
- Installed Supergateway to expose MCP servers over HTTP/SSE
- 7 MCP servers running in Docker containers
- Location: `~/mcp-gateway/docker-compose.yml`

### MCP Servers Running

| Service | Port | Endpoint | Status |
|---------|------|----------|--------|
| Filesystem | 8808 | `http://localhost:8808/sse` | ✅ Working |
| Memory | 8810 | `http://localhost:8810/sse` | ✅ Working |
| GitHub | 8812 | `http://localhost:8812/sse` | ✅ Working |
| Brave Search | 8813 | `http://localhost:8813/sse` | Needs API key |
| Puppeteer | 8814 | `http://localhost:8814/sse` | ✅ Working |
| Slack | 8815 | `http://localhost:8815/sse` | Needs token |
| PostgreSQL | 8816 | `http://localhost:8816/sse` | Needs connection URL |

### Files Created on Pi
| File | Purpose |
|------|---------|
| `~/mcp-gateway/docker-compose.yml` | 7 MCP server definitions |
| `~/mcp-gateway/.env.example` | Template for API keys |

### Still Pending
1. **Cloudflare tunnel routes** - Add `mcp-fs.l7-partners.com` etc. in Cloudflare dashboard
2. **n8n workflow for MCP** - n8n API blocked by Cloudflare Access (needs service token)
3. **API keys** - Configure Brave, Slack, PostgreSQL credentials in `.env`

### Management Commands
```bash
# SSH to Pi (use local when on same network)
ssh pi-local

# View MCP logs
cd ~/mcp-gateway && docker compose logs -f

# Restart all MCP servers
cd ~/mcp-gateway && docker compose restart

# Test endpoint
curl -s http://localhost:8808/sse -H 'Accept: text/event-stream' | head -2
```

---

## Session Summary: 2026-01-16 (Session 6)

### Daily Agent Digest Workflow Fixed
- Diagnosed missing connection from "Get Session Notes" to Merge node
- Discovered n8n Merge v3 only supports 2 inputs (not 3)
- Redesigned workflow: removed Merge node, connected all 3 data sources directly to Code node
- Updated workflow via n8n MCP API (multiple iterations)
- Workflow URL: https://n8n.l7-partners.com/workflow/2fwvrmN2I3PDcXRz

### Workflow Architecture
```
Trigger (6am) → Get Projects  ─┐
              → Get Agents    ─┼→ Code Node → Claude API → Gmail → If Urgent → SMS
              → Get Session   ─┘
```

- Email: jglittell@gmail.com (via jeff@l7-partners.com Gmail)
- SMS: 6318383779@vtext.com (Verizon gateway, free)

---

## Session Summary: 2026-01-16 (Session 5) - JGL Capital

### Markplex Scraper v2 Completed
- Built Playwright-based scraper (`~/jgl-capital/scripts/markplex-scraper.js`)
- Fixed login URL issue (site changed from `/wp-login.php` to `/login/`)
- Successfully scraped **445 files** (103 programs, 232 tutorials, 104 quicktips, 6 training)
- Total content: **4.5MB** of markdown with embedded EasyLanguage code blocks

### Quant Knowledge Base Created
- Updated `~/jgl-capital/.claude/skills/tradestation/markplex-knowledge.md` with actual code examples:
  - Vector Operations, QuickSort, Dictionary Class patterns
  - Global Dictionary Sender/Receiver for cross-chart communication
  - Price Series Provider for multi-timeframe calculations
  - Trailing Stop visualization patterns
- Added "Patterns for Self-Weighting Portfolio System" section

### Strategy Recommendations Document
- Created `~/jgl-capital/data/analysis/markplex-learnings-summary.md`
- Recommended architecture: Master Trading App + GlobalDictionary + Individual Charts
- 4-phase implementation roadmap
- Key gotchas from Markplex content analysis

### Files Created/Updated
| File | Purpose |
|------|---------|
| `~/jgl-capital/scripts/markplex-scraper.js` | Playwright scraper for Markplex |
| `~/jgl-capital/data/markplex-tutorials/` | 445 scraped content files |
| `~/jgl-capital/.claude/skills/tradestation/markplex-knowledge.md` | EasyLanguage patterns KB |
| `~/jgl-capital/data/analysis/markplex-learnings-summary.md` | Strategy recommendations |
| `~/jgl-capital/.claude/agents/quant.md` | Updated with Markplex patterns |

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

1. **Update Supabase schema for parent-child hierarchy** - Add `parent_id` column, update records, delete duplicate Claude Hub
2. **Activate Supabase MCP** - Restart Claude Code, authenticate via browser popup on first use
2. **Query L7 property data** - Test Supabase MCP with 3 properties (200 East 2nd, 261 Suburban, 191 East 2nd)
3. **Fix claude.l7-partners.com DNS** - Restore access and add Cloudflare Access protection
   - Fix Cloudflare DNS for l7-partners.com (CNAME to apex-loadbalancer.netlify.com)
   - Verify Netlify DNS verification passes
   - Add claude as domain alias in Netlify
   - Add CNAME for claude pointing to Netlify subdomain
   - Add Cloudflare Access policy
2. **Test Daily Digest workflow** - Run test to confirm end-to-end execution and email delivery
3. **Verify n8n workflow syncs new entity types** - Check if agents/skills sync to Supabase
4. **Add `claude_skills` table to Supabase** - If not auto-created by workflow
5. **Update Lovable dashboard** - Display agents and skills sections

### Deferred

1. **Build l7-investor-agent knowledge base** - Create prompts/l7-investor.md with investor relations guidance
2. **Build l7-docs-agent knowledge base** - Create prompts/l7-docs.md for document processing
3. **Create additional L7 skills** - /lease-summary, /investor-update, /market-report
4. **Portal/TMS backend work** - Payment history views, lease views, communication logs, clear heights field
5. **Dashboard enhancements** - Filtering, search, detailed views
6. **Consider Pi redundancy** - For n8n workflows

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
| supabase-l7 | Pending | - | https://mcp.supabase.com (OAuth) |

### MCP Gateway (Pi - Supergateway over SSE)
| Server | Port | Local URL | Status |
|--------|------|-----------|--------|
| Filesystem | 8808 | http://localhost:8808/sse | ✅ |
| Memory | 8810 | http://localhost:8810/sse | ✅ |
| GitHub | 8812 | http://localhost:8812/sse | ✅ |
| Brave | 8813 | http://localhost:8813/sse | Needs key |
| Puppeteer | 8814 | http://localhost:8814/sse | ✅ |
| Slack | 8815 | http://localhost:8815/sse | Needs token |
| PostgreSQL | 8816 | http://localhost:8816/sse | Needs URL |

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

# MCP Gateway management
ssh pi-local "cd ~/mcp-gateway && docker compose ps"           # Status
ssh pi-local "cd ~/mcp-gateway && docker compose logs -f"      # Logs
ssh pi-local "cd ~/mcp-gateway && docker compose restart"      # Restart all
ssh pi-local "curl -s http://localhost:8808/sse | head -2"     # Test endpoint

# Add webhook to a repo
gh api repos/jefflitt1/REPO_NAME/hooks --method POST -f name='web' -F active=true -f 'events[]=push' -f 'config[url]=https://webhooks.l7-partners.com/webhook/github-project-sync' -f 'config[content_type]=json'
```
