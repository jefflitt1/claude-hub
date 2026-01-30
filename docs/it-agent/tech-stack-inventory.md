# Tech Stack Inventory
*Last updated: 2026-01-30*

## Devices

### JLDesktop (PC1) - Trading Workstation
| Property | Value |
|----------|-------|
| **Model** | Dell XPS 8940 |
| **CPU** | Intel i5-10400 (6C/12T) |
| **RAM** | 16 GB |
| **GPU** | NVIDIA GTX 1660 Ti |
| **Storage** | C: 235GB SSD + D: 1TB HDD |
| **OS** | Windows 11 Pro |
| **Tailscale IP** | 100.69.59.111 |
| **Local IP** | 192.168.4.45 |
| **SSH** | `ssh ITadmin@100.69.59.111` (key auth) |
| **RDP** | `100.69.59.111:3389` (ITadmin / Trading2026) |
| **Jump Desktop** | Fluid protocol via "My Computers" (primary) |
| **Purpose** | Dedicated TradeStation trading workstation |

**User Accounts:** ITadmin (auto-login, primary), Administrator (UAC)
> `jglit` account deleted 2026-01-30. All data migrated to ITadmin (profile folder: `claudeadmin`).
> Desktop files backed up to `D:\jglit-backup\Desktop\`.

**Auto-Start Sequence:** Boot → ITadmin auto-login → Tailscale → TradeStation (scheduled task) → SSH available

**Scheduled Tasks (all run as ITadmin):**
- TradeStation Startup (at logon)
- TradeStation AutoStart (at logon)
- TradeStation Watchdog (at logon, PowerShell)
- TradeStation Backup - Weekly (Mon 12:01 AM)
- TradeStation Backup - Weekly - CloudDrive (Fri 7:01 PM)
- TradeStation Backup - Monthly (1st Mon 12:01 AM)
- TradeStation Backup - Monthly - CloudDrive (1st Mon 8:01 PM)

**Pending:** BIOS "Power On after AC loss" (requires physical access, F10 at boot on Dell XPS)

**Full docs:** `docs/it-agent/JLDesktop-PC1-verified-config.md`

---

## Infrastructure Overview

### Cloudflare (DNS & Security)
**Zone:** l7-partners.com

| Subdomain | Type | Target | Status |
|-----------|------|--------|--------|
| admin | CNAME | Tunnel (n8n-tunnel) | Proxied |
| n8n | CNAME | Tunnel (n8n-tunnel) | Proxied |
| metabase | CNAME | Tunnel (n8n-tunnel) | Proxied |
| kibana | CNAME | Tunnel (n8n-tunnel) | Proxied |
| kuma | CNAME | Tunnel (n8n-tunnel) | Proxied |
| supabase | CNAME | Tunnel (n8n-tunnel) | Proxied |
| vnc | CNAME | Tunnel (n8n-tunnel) | Proxied |
| webhooks | CNAME | Tunnel (n8n-tunnel) | Proxied |
| bot | CNAME | Tunnel (n8n-tunnel) | Proxied |
| ssh | CNAME | Tunnel (n8n-tunnel) | Proxied |
| mac-ssh | CNAME | Tunnel (mac-ssh) | Proxied |
| claude-api | CNAME | Tunnel (mac-ssh) | Proxied |
| claude | CNAME | Netlify | Proxied |
| www | CNAME | Netlify | DNS only |

### Cloudflare Tunnels
| Tunnel | ID | Status | Services |
|--------|-----|--------|----------|
| n8n-tunnel | c5935af7-... | Healthy | n8n, admin, metabase, kibana, kuma, etc. |
| mac-ssh | 5e5111af-... | Healthy | mac-ssh, claude-api |
| pi-vnc | f451e610-... | Healthy | VNC (192.168.4.149) |

### Cloudflare Zero Trust Access Apps
- JGL Capital (jglcap.l7-partners.com) - Protected
- Claude Dashboard
- Uptime Kuma
- Admin
- Metabase
- Kibana
- N8N
- VNC
- Webhook bypass rules

---

## Database (Supabase)

### Table Categories

**Claude Operations (15 tables)**
- claude_agents, claude_approvals, claude_always_approvals
- claude_mcp_servers, claude_projects, claude_prompts
- claude_session_context, claude_session_logs, claude_sessions
- claude_skill_usage, claude_skills, claude_tasks
- claude_token_usage, claude_usage_stats, claude_workflows

**Jeff Personal Assistant (12 tables)**
- jeff_tasks, jeff_associations, jeff_contacts
- jeff_email_rules, jeff_email_threads
- jeff_family_members, jeff_calendar_cache
- jeff_habits, jeff_habit_logs
- jeff_recurring_items, jeff_wellbeing_logs
- jeff_project_activity

**JGL Trading (7 tables)**
- jgl_backtests, jgl_portfolio_snapshots, jgl_positions
- jgl_price_data, jgl_signal_states, jgl_symbols, jgl_trades

**L7 Property Management (10+ tables)**
- properties_legacy, property_financials
- leases_legacy, lease_tenant_mapping
- maintenance_requests, insurance_certificates
- tenant_documents, tenant_notifications
- vendor_details, documents, document_templates

**System/Security**
- credentials_inventory
- security_audit_log
- system_health_checks
- access_requests, access_request_rate_limits

---

## Automation (n8n)

**Instance:** https://n8n.l7-partners.com
**Status:** Healthy
**Total Workflows:** 50+

### Active Critical Workflows
| Workflow | Purpose |
|----------|---------|
| Daily Agent Status Digest | System monitoring |
| System Health Check | Infrastructure health |
| Daily Workflow Health Report | n8n monitoring |
| Claude Code Mobile Approvals | Approval system |
| Claude Analytics Sync | Usage tracking |
| Error trigger | Error handling |
| Master Telegram Bot Conversations | Bot orchestration |

### Google Tasks Bidirectional Sync (Added 2026-01-30)
| Workflow | ID | Purpose |
|----------|----|---------|
| Google Tasks Import | `FG5BHxNtd7EpiIQy` | Import tasks from Google Tasks → jeff_tasks |
| Google Tasks Completion Sync | `6Bmnyc4KubPGUujA` | Sync completions from DB → Google Tasks |
| Google Tasks Status Sync | `suOxWBLe645wsvrG` | Hourly poll for Google-side completions/deletions |

### By Category
- **Claude Operations:** 8 workflows
- **L7 Property:** 5 workflows
- **JGL Personal:** 7 workflows (includes Google Tasks sync)
- **Scraping/Data:** 6 workflows
- **System Health:** 4 workflows

---

## External Services

### Hosting
- **Lovable** - JGL Capital Dashboard (jglcap.lovable.app)
- **Netlify** - L7 Partners website, Claude dashboard

### APIs & Integrations
- **TradeStation** - Trading data & execution
- **Google Workspace** - Gmail, Drive, Calendar, Sheets
- **Telegram** - Bot communications
- **Feedly** - RSS aggregation (149 feeds)
- **Brave Search** - Web search
- **Apify** - Web scraping

### MCP Servers Active
| Server | Purpose |
|--------|---------|
| l7-business | Supabase + n8n + GDrive |
| unified-comms | Email routing |
| unified-browser | Browser automation |
| jeff-agent | Personal task management |
| session-context | Session persistence |
| feedly | RSS reader |
| tradestation | Trading |
| google-calendar | Calendar |
| google-sheets | Spreadsheets |
| telegram | Messaging |
| google-tasks | Google Tasks (jglittell@gmail.com) |

---

## Security Posture

### Protected Services (Cloudflare Access)
- ✅ admin.l7-partners.com
- ✅ n8n.l7-partners.com
- ✅ metabase.l7-partners.com
- ✅ kibana.l7-partners.com
- ✅ kuma.l7-partners.com
- ✅ jglcap.l7-partners.com (DNS removed, Access configured)

### Monitoring
- **Uptime Kuma** - Service availability
- **Kibana** - Log analysis
- **n8n Error Trigger** - Workflow failures

### Audit Logging
- security_audit_log table
- Claude session logging
- Workflow execution tracking

---

## Network Topology

```
Internet
    │
    ▼
Cloudflare Edge (WAF, Access, DNS)
    │
    ├─► Cloudflare Tunnel (n8n-tunnel)
    │       └─► Self-hosted server
    │           ├── n8n
    │           ├── Metabase
    │           ├── Kibana
    │           ├── Uptime Kuma
    │           └── Other services
    │
    ├─► Cloudflare Tunnel (mac-ssh)
    │       └─► Mac (SSH, Claude API)
    │
    ├─► Netlify (L7 website, Claude dashboard)
    │
    └─► Lovable (JGL Capital app)

Supabase (Database) ◄─── All services
```

---

## TODO: IT Agent Capabilities Needed

1. **Network Discovery**
   - Scan local networks
   - Map service dependencies
   - Detect new devices

2. **Configuration Audit**
   - Review Cloudflare settings
   - Check Access policies
   - Validate tunnel health

3. **Security Assessment**
   - Identify exposed services
   - Check credential rotation
   - Review access logs

4. **Inventory Management**
   - Track all credentials
   - Monitor service versions
   - Document API keys

5. **Alerting**
   - Tunnel disconnections
   - Failed Access attempts
   - Unusual traffic patterns
