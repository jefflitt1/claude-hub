# System Monitoring Setup

## Overview

Unified monitoring infrastructure for Mac Studio and Raspberry Pi using:
- **Beszel** - System metrics (CPU, RAM, disk, Docker containers)
- **Uptime Kuma** - HTTP endpoint uptime monitoring
- **n8n workflows** - Service health checks and alerting

## Incident Log

### 2026-01-27: Raspberry Pi Offline / Beszel Hub Down

**Symptom:** Beszel showed down on Kuma.
**Root Cause:** The entire Raspberry Pi (100.77.124.12) went offline. Since the Pi hosted the Beszel hub, Uptime Kuma, AND n8n, all three services went down simultaneously. The Pi is a single point of failure for monitoring and automation.

**Impact:**
- Beszel Hub (Pi :8090) — DOWN
- Uptime Kuma (Pi :3001) — DOWN
- n8n (Pi :5678) — DOWN
- All Pi Cloudflare tunnels (n8n, kuma, webhooks, metabase) — DOWN
- Mac Studio Beszel agent orphaned (reporting to dead hub)

**Temporary Fix:**
- Created a new Beszel hub on Mac Studio (:8090) with `--restart unless-stopped`
- Recreated Mac Studio agent with new hub's SSH key
- Admin: jglittell@gmail.com / Beszel#Mac2026!
- Mac Studio monitoring itself only (Pi agent unreachable)

**Permanent Fix: Cross-Monitoring Resilience (Implemented 2026-01-27)**

3-layer symmetric monitoring eliminates the single point of failure:

```
Layer 3: WATCHDOG (bash scripts, zero dependencies, last resort)
  Pi cron ←──ping+curl──→ Mac Studio launchd
  Each alerts via Telegram if the other is unreachable (5 min interval)

Layer 2: DUAL UPTIME KUMA (HTTP endpoint monitoring)
  Pi Kuma (:3001) monitors ALL services (existing)
  Mac Studio Kuma (:3001) monitors ALL services (NEW)
  Either one survives → full alerting coverage

Layer 1: BESZEL (system metrics)
  Pi Hub (primary) ← both agents report here
  Mac Studio Hub (hot standby) ← monitors itself when Pi is down

Layer 0: n8n SELF-HEALING (existing, Pi-based, no changes needed)
```

**Failure scenarios:**
- Pi down → Studio watchdog alerts (5min), Studio Kuma alerts (1min)
- Studio down → Pi watchdog alerts (5min), Pi Kuma alerts (1min), n8n self-healing (15min)
- Both down → First to recover alerts about the other

---

## Uptime Kuma Setup (Dual Instance)

### Pi Instance (Primary)
- **Public URL:** https://kuma.l7-partners.com
- **Internal URL:** http://100.77.124.12:3001 (Tailscale)
- **Container:** `uptime-kuma`
- **Data:** `/opt/uptime-kuma/data`
- **Credentials:** `jeff` / `L7monitors!`

### Mac Studio Instance (Redundant)
- **Internal URL:** http://100.67.99.120:3001 (Tailscale)
- **Container:** `uptime-kuma`
- **Data:** Docker volume `uptime-kuma-data`
- **Credentials:** `jglittell@gmail.com` (set during first-run setup)
- **Deploy:** `docker run -d --name uptime-kuma --restart unless-stopped -p 3001:3001 -v uptime-kuma-data:/app/data louislam/uptime-kuma:1`
- **Monitor setup:** `scripts/setup-studio-kuma.sh YOUR_API_KEY`

Both instances monitor all services. Either one surviving provides full alerting coverage.

### Initial Setup (Completed 2026-01-27)
1. Access https://kuma.l7-partners.com
2. Login with credentials above
3. Telegram notifications configured:
   - Bot Token: `8169830247:AAF_BStYa7AqKPbHCeErAl2oij17d7cJhyI`
   - Chat ID: `7938188628`
   - Default enabled on all monitors
4. 15 monitors configured (see subdomain table below)

### Monitored Endpoints
**Public (via Cloudflare):**
| Subdomain | Backend | Status (2026-01-27) |
|-----------|---------|---------------------|
| n8n.l7-partners.com | Pi (tunnel) | UP |
| metabase.l7-partners.com | Pi (tunnel) | UP |
| webhooks.l7-partners.com | Pi (tunnel) | UP |
| kuma.l7-partners.com | Pi (tunnel) | UP |
| chat.l7-partners.com | Mac Studio (tunnel) | UP |
| l7-partners.com | Netlify | UP |
| claude.l7-partners.com | Netlify | UP |
| jglcap.l7-partners.com | Netlify | UP |
| admin.l7-partners.com | Netlify | UP |
| 191.l7-partners.com | Netlify | UP |

**Internal (via Tailscale):**
| Service | URL | Status (2026-01-27) |
|---------|-----|---------------------|
| Beszel Hub | http://100.77.124.12:8090 | UP |
| Claude HTTP Server | http://100.67.99.120:3847/health | UP |
| Ollama API | http://100.67.99.120:11434/api/tags | UP |

**Paused (known issues):**
- Metabase - Not deployed on Pi (no container/image)
- Supabase (Cloud) - Monitor URL returns 404 at root; needs correct health endpoint

**Recently Unpaused (2026-01-30):**
- Claude HTTP Server - Unpaused after confirming it binds to `0.0.0.0:3847`. Auto-heal enabled.

**Removed DNS (internal-only, no public DNS needed):**
- `supabase.l7-partners.com` - Supabase Studio not deployed; using Supabase cloud
- `claude-api.l7-partners.com` - Behind Cloudflare Access; internal monitor covers it
- `ollama.l7-partners.com` - Internal service; internal monitor covers it

### Public Status Page
- **URL:** https://status.l7-partners.com (or http://100.77.124.12:3001/status/l7)
- **Slug:** `l7`
- **Monitors shown:** 10 public-facing services
- Shows "Partially Degraded Service" when any monitor is down

## Beszel Setup

### Hub (on Pi)
- **Location:** Raspberry Pi (jeffn8nhost)
- **Port:** 8090
- **Container:** `beszel`
- **Data:** `/opt/beszel/data`

**Access URL:** `http://100.77.124.12:8090` (Tailscale)

### Credentials
- **Email:** `jglittell@gmail.com`
- **Password:** `hiRdif-2kitti-baddyn`
- **Auth endpoint:** `/api/collections/users/auth-with-password` (NOT `/api/admins/`)

### SSH Key
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMqXC1HMNdYSJJBVhZm2wLg6GD3tlISuz4g3KDkDAW1r
```

### Agents
| Host | IP | Port | Container | Network | Docker Run |
|------|-----|------|-----------|---------|------------|
| Pi (jeffn8nhost) | 100.77.124.12 | 45876 | beszel-agent | `beszel_default` | `-p 45876:45876` |
| Mac Studio | 100.67.99.120 | 45876 | beszel-agent | bridge | `-p 45876:45876` |

### System Records
| System | ID | Host (in Beszel) | Status (2026-01-27) |
|--------|-----|-------------------|---------------------|
| jeffn8nhost (Pi) | q25yktxjvxgyhhv | `beszel-agent` (Docker DNS) | UP - CPU ~31%, Mem ~12% |
| mac-studio | f76lb0zqd68qkpi | `100.67.99.120` | UP - CPU ~0.2%, Mem ~32% |

### Docker Networking Notes

**Mac Studio:** Docker Desktop for Mac runs containers in a LinuxKit VM. `--network host` does NOT expose ports to the macOS host. Must use `-p 45876:45876` port mapping.

**Pi:** Beszel hub runs on `beszel_default` bridge network. The agent must be on the same Docker network for the hub to reach it. The Pi agent uses Docker DNS hostname `beszel-agent` instead of Tailscale IP.

### Agent Docker Run Commands
```bash
# Pi agent (on beszel_default network)
docker run -d --name beszel-agent --restart unless-stopped \
  --network beszel_default -p 45876:45876 \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -e PORT=45876 \
  -e 'KEY=ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMqXC1HMNdYSJJBVhZm2wLg6GD3tlISuz4g3KDkDAW1r' \
  henrygd/beszel-agent:latest

# Mac Studio agent (port mapping, no host network)
docker run -d --name beszel-agent --restart unless-stopped \
  -p 45876:45876 \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -e PORT=45876 \
  -e 'KEY=ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMqXC1HMNdYSJJBVhZm2wLg6GD3tlISuz4g3KDkDAW1r' \
  henrygd/beszel-agent:latest
```

### Restart Agents (if needed)
```bash
# Pi
ssh root@100.77.124.12 "docker restart beszel-agent"

# Mac Studio
ssh jgl@100.67.99.120 "source ~/.zshrc; docker restart beszel-agent"

# If Pi agent shows "down", restart the hub too
ssh root@100.77.124.12 "docker restart beszel"
```

## n8n Monitoring Workflows

| Workflow | ID | Purpose | Trigger |
|----------|----|---------|---------|
| Self-Healing Monitor | `JaTL7b6ka9mH4MuJ` | 9-service health sweep | Every 15 min + webhook |
| Kuma Auto-Heal | `erMLnL303h0f9y1V` | Event-driven auto-remediation | Kuma DOWN webhook |
| Unified Error Handler | `U68p4Rbpu1BSznNc` | Catch all workflow errors | Error trigger |

**Location:** n8n.l7-partners.com

### Self-Healing Monitor (Updated 2026-01-30)
Checks **9 services** in parallel every 15 minutes:
- Claude HTTP Server (`http://192.168.5.38:3847/health`)
- iMessage Bridge (`http://192.168.5.38:3848/health`)
- Ollama (`http://192.168.5.38:11434/api/tags`)
- Open WebUI (`https://chat.l7-partners.com`)
- Studio Kuma (`http://192.168.5.38:3001`)
- n8n (`https://n8n.l7-partners.com/healthz`)
- Beszel Hub (`http://100.77.124.12:8090`)
- Cloudflare Tunnel (`https://kuma.l7-partners.com`)
- Docker API (`http://192.168.5.38:2375/version`)

Unhealthy services trigger Telegram alert. All results logged to `system_health_checks` table.

### Kuma Auto-Heal Workflow (Added 2026-01-30)
Event-driven auto-remediation triggered by Uptime Kuma DOWN webhooks.

**Webhook:** `https://webhooks.l7-partners.com/webhook/kuma-auto-heal`

**Flow:**
```
Kuma DOWN event → Parse → Cooldown check (30min) → Fetch runbooks →
  Match by regex → Execute fix via Claude HTTP Server →
  Wait 30s → Re-check → Log to Supabase →
  If recovered: silent (Jeff never knows)
  If failed: Telegram alert with diagnosis
```

**Runbooks (12 patterns in `self_healing_runbooks` table):**
- Service restarts: Ollama, Claude HTTP, Open WebUI, iMessage Bridge, Kuma, n8n, Beszel, Cloudflare
- System issues: disk full, high memory, connection refused

**Cooldown:** 30 minutes between attempts per service (tracked in `self_healing_attempts`).

## LaunchAgents (Mac Studio)

| Service | Status | Script | Notes |
|---------|--------|--------|-------|
| com.claude.http-server | ✅ Active | N/A | Claude HTTP Server (port 3847) |
| com.claude.health-check | ✅ Fixed | `~/.claude/scripts/health-check.sh` | Hourly health check |
| com.claude.market-scan | ✅ Fixed | `~/.claude/scripts/market-scan.sh` | Market overview |
| com.claude.inbox-triage | ✅ Fixed | `~/.claude/scripts/inbox-triage.sh` | Email prioritization |
| com.claude.morning-digest | ✅ Fixed | `~/.claude/scripts/morning-digest.sh` | 6:30am Feedly digest |
| com.l7.system-monitor | 🔴 Disabled | central_collector.py | Was spamming orchart alerts |

### Re-enable LaunchAgents
```bash
# Load individual agent
ssh jgl@100.67.99.120 "launchctl load ~/Library/LaunchAgents/com.claude.health-check.plist"

# Check status
ssh jgl@100.67.99.120 "launchctl list | grep claude"
```

## Cloudflare Tunnels

### Pi Tunnel (`c5935af7-7aba-453a-888e-73059ac1489d`)
| Hostname | Service |
|----------|---------|
| n8n.l7-partners.com | `http://localhost:5678` |
| webhooks.l7-partners.com | `http://localhost:5678` |
| metabase.l7-partners.com | `http://127.0.0.1:3000` |
| ssh.l7-partners.com | `ssh://localhost:22` |
| kuma.l7-partners.com | `http://localhost:3001` |

### Mac Studio Tunnel (`01ac78e0-43fc-4c6a-896c-60167a00b893`)
| Hostname | Service |
|----------|---------|
| claude-api.l7-partners.com | Claude HTTP Server (behind Cloudflare Access) |
| chat.l7-partners.com | Open WebUI |

### Public Access via Cloudflare Access
| Subdomain | Access Policy | Session |
|-----------|---------------|---------|
| beszel.l7-partners.com | Jeff only (jglittell@gmail.com) | 7 days |

**Note:** `ollama.l7-partners.com` and `supabase.l7-partners.com` DNS records removed - these are internal-only services monitored via Tailscale.

## Cross-Device Watchdog

Zero-dependency bash script that runs on both devices, monitoring the other via ping and HTTP checks. Alerts directly via Telegram API (no Docker, no n8n dependency).

### Script
- **Source:** `scripts/cross-watchdog.sh`
- **Mac Studio:** `/Users/jgl/.claude/scripts/cross-watchdog.sh` (LaunchAgent, every 5 min)
- **Pi:** `/opt/scripts/cross-watchdog.sh` (cron, every 5 min)

### Mac Studio LaunchAgent
- **Plist:** `/Users/jgl/Library/LaunchAgents/com.l7.cross-watchdog.plist`
- **Interval:** 300 seconds (5 minutes)
- **Env:** `WATCHDOG_DEVICE=mac-studio`
- **Log:** `~/.claude/logs/watchdog.log`

### Pi Cron
```
WATCHDOG_DEVICE=pi
*/5 * * * * /bin/bash /opt/scripts/cross-watchdog.sh >> /var/log/watchdog.log 2>&1
```

### What Each Device Monitors

| Mac Studio monitors (Pi) | Pi monitors (Mac Studio) |
|---------------------------|--------------------------|
| Pi Network (ping) | Studio Network (ping) |
| Pi n8n (:5678/healthz) | Studio Ollama (:11434) |
| Pi Beszel Hub (:8090) | Studio Beszel Hub (:8090) |
| Pi Uptime Kuma (:3001) | Studio Uptime Kuma (:3001) |

### Features
- **Auto-fix before alerting** (added 2026-01-30): On first DOWN detection, attempts SSH restart of the service, waits 30s, re-checks. Jeff only gets alerted if the fix fails.
- Recovery notifications when service comes back
- State persisted in `watchdog-state.json`
- Dry run mode: `WATCHDOG_DRY_RUN=1`

### Auto-Fix Commands (Cross-Watchdog)
| Check Key | Fix Command |
|-----------|-------------|
| `pi_n8n` | `ssh root@PI_IP 'docker restart n8n'` |
| `pi_beszel_hub` | `ssh root@PI_IP 'docker restart beszel'` |
| `pi_uptime_kuma` | `ssh root@PI_IP 'docker restart uptime-kuma'` |
| `studio_ollama` | `ssh jgl@STUDIO_IP 'brew services restart ollama'` |
| `studio_beszel_hub` | `ssh jgl@STUDIO_IP 'docker restart beszel'` |
| `studio_uptime_kuma` | `ssh jgl@STUDIO_IP 'docker restart uptime-kuma'` |

---

## Network Topology

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Tailscale Mesh                               │
│                                                                      │
│  MacBook Pro            Raspberry Pi           Mac Studio            │
│  (jeff-probis)          (jeffn8nhost)          (jgl)                │
│                         100.77.124.12          100.67.99.120         │
│                              │                      │                │
│                         ┌────┴─────┐           ┌────┴─────┐         │
│                         │ Beszel   │           │ Beszel   │         │
│                         │  Hub     │◄──────────│ Agent    │         │
│                         │ :8090    │ Tailscale │ :45876   │         │
│                         │          │           ├──────────┤         │
│                         │ Beszel   │           │ Beszel   │         │
│                         │ Agent    │ (Docker)  │  Hub     │         │
│                         │ :45876   │           │ :8090    │ standby │
│                         ├──────────┤           ├──────────┤         │
│                         │ Kuma     │◄─────────►│ Kuma     │         │
│                         │ :3001    │ symmetric │ :3001    │         │
│                         ├──────────┤           ├──────────┤         │
│                         │ n8n      │           │ Ollama   │         │
│                         │ :5678    │           │ :11434   │         │
│                         └────┬─────┘           └────┬─────┘         │
│                              │                      │                │
│                         ┌────┴──────────────────────┴────┐          │
│                         │     WATCHDOG (bash, cron/       │          │
│                         │     launchd, Telegram alerts)   │          │
│                         └────────────────────────────────┘          │
│                                                                      │
│  CF Tunnel (Pi): c5935af7     CF Tunnel (Studio): 01ac78e0         │
└─────────────────────────────────────────────────────────────────────┘
```

## Quick Commands

```bash
# Check Beszel hub status
ssh root@100.77.124.12 "docker ps --filter name=beszel"

# Check agent logs
ssh root@100.77.124.12 "docker logs beszel-agent --tail 20"
ssh jgl@100.67.99.120 "source ~/.zshrc; docker logs beszel-agent --tail 20"

# Test Claude HTTP Server
curl http://100.67.99.120:3847/health

# Check n8n workflow status
curl -s https://n8n.l7-partners.com/api/v1/workflows | jq '.data[] | {name, active}'
```

## Alert Thresholds

### Beszel System Alerts
| Metric | Threshold | Duration | Systems |
|--------|-----------|----------|---------|
| Status | Up/Down toggle | Immediate | Mac Studio, Pi |
| CPU | > 80% | 10 min sustained | Mac Studio, Pi |
| Memory | > 90% | 10 min sustained | Mac Studio, Pi |
| Disk | > 85% | 10 min sustained | Mac Studio, Pi |

### Beszel Notifications (Configured 2026-01-27)
- **Channel:** Telegram via Shoutrrr
- **Shoutrrr URL:** `telegram://8169830247:AAF_BStYa7AqKPbHCeErAl2oij17d7cJhyI@telegram?chats=7938188628`
- **Scope:** All alerts on all systems auto-notify to Telegram
- **Duration:** 10 minutes sustained before triggering

### Uptime Kuma Notifications
- **Channel:** Telegram (same bot/chat as Beszel)
- **Default:** Applied to all monitors
- **Test:** Verified working 2026-01-27

## Dashboard Integration

### Supabase Tables
| Table | Purpose | Sync Source |
|-------|---------|-------------|
| `beszel_systems` | Server hardware metrics (CPU, RAM, disk) | Beszel Hub API |
| `uptime_kuma_monitors` | HTTP endpoint uptime and latency | Kuma Status Page API |

**SQL Migration:** `docs/operations/monitoring-tables.sql`
**Run in:** Supabase SQL Editor

### n8n Sync Workflow
- **Name:** `Monitoring Sync (Beszel + Kuma → Supabase)`
- **Interval:** Every 15 minutes
- **Import from:** `workflows/monitoring-sync.json`
- **Flow:** Schedule → Fetch Beszel API + Kuma public API → Transform → Upsert to Supabase
- **Beszel auth:** localhost:8090 (same Pi as n8n)
- **Kuma API:** localhost:3001 (same Pi as n8n) — public status page endpoints, no auth needed

### Dashboard Component
- **Lovable Prompt:** `prompts/lovable-monitoring-section.md`
- **Component:** `src/components/sections/MonitoringSection.tsx` (to be created)
- **Data:** React Query polling `beszel_systems` and `uptime_kuma_monitors` every 30s

## Alerting Flow (Updated 2026-01-30)

Jeff only hears about things that **can't be auto-fixed**. Every outage goes through auto-remediation first.

### Monitoring Layers
```
Layer 0: Cross-Watchdog (bash/cron, 5min)     ← Zero-dependency fallback + auto-fix
Layer 1: Uptime Kuma x2 (Pi + Studio, 60s)    ← Detection + webhook trigger
Layer 2: Self-Healing Monitor (n8n, 15min)     ← Comprehensive 9-service sweep
Layer 3: Kuma Auto-Heal (n8n, event-driven)    ← Instant runbook remediation
Layer 4: Claude HTTP Server (AI brain)         ← Intelligent diagnosis + execution
Layer 5: Unified Error Handler (n8n)           ← Catches workflow failures
```

### When Jeff Gets Alerted
| Scenario | Auto-Fix? | Jeff Hears? | Delay |
|----------|-----------|-------------|-------|
| Service down, runbook fixes it | Yes | No | ~1 min |
| Service down, AI fixes it | Yes | No | ~3 min |
| Service down, fix fails | Yes (tried) | Yes + context | ~5 min |
| n8n down (Pi issue) | Watchdog SSH | Yes if fails | ~5 min |
| Both devices down | N/A | N/A | N/A |

### Notification Channels
1. **Beszel** → Telegram (system metrics: CPU, RAM, disk threshold alerts)
2. **Uptime Kuma** → Webhook (Auto-Heal) + Telegram (3 retries delay)
3. **n8n Self-Healing Monitor** → Telegram (9-service sweep, 15 min)
4. **n8n Kuma Auto-Heal** → Telegram (only on failed remediation)
5. **n8n Unified Error Handler** → Telegram + Email (workflow errors)
6. **Cross-Watchdog** → Telegram (only after auto-fix fails)

### Kuma Notification Setup
| Channel | Type | Behavior |
|---------|------|----------|
| Telegram | Default | Fires after 3 retries (~3 min delay) |
| Auto-Heal Webhook | Webhook | Fires immediately on first DOWN, triggers n8n auto-remediation |

Both channels applied to all monitors. The webhook gives auto-heal a head start before Telegram notifies Jeff.

## Troubleshooting

### Beszel agent won't start
- Check if KEY env var is set
- Verify Docker socket is mounted
- Check hub is reachable: `curl http://100.77.124.12:8090`

### n8n alerts not working
- Check workflow is active
- Verify Telegram bot token
- Check error workflow: U68p4Rbpu1BSznNc (Unified Error Handler)

### Claude HTTP Server unreachable
- Check launchd: `launchctl list | grep claude`
- Check port: `lsof -i :3847`
- Restart: `launchctl kickstart -k gui/$(id -u)/com.claude.http-server`

---

## Local LLM Configuration (Mac Studio)

### Ollama Models with Extended Context

Default Ollama context is 4096 tokens. Extended models created for larger context windows:

| Model | Context | Memory Impact |
|-------|---------|---------------|
| `deepseek-r1:32b` | 4K (default) | 19GB base |
| `deepseek-r1:32b-ext` | 32K (8x) | ~23GB |
| `deepseek-r1:14b` | 4K (default) | 9GB base |
| `deepseek-r1:14b-ext` | 64K (16x) | ~11GB |

### Usage
```bash
# Use extended context model
ollama run deepseek-r1:32b-ext

# Or set context at runtime
ollama run deepseek-r1:32b
>>> /set parameter num_ctx 32768
```

### Modelfiles Location
`~/.ollama/modelfiles/` on Mac Studio

### Create Custom Extended Model
```bash
# Create Modelfile
cat > ~/.ollama/modelfiles/my-model-extended << 'EOF'
FROM llama3.2:1b
PARAMETER num_ctx 16384
EOF

# Build model
ollama create llama3.2:1b-ext -f ~/.ollama/modelfiles/my-model-extended
```

### Memory/Performance Trade-offs
- Each 4K increase in context ≈ 1GB additional VRAM
- Larger context = slower inference
- Mac Studio (32GB) can handle up to ~64K context on 14B models
