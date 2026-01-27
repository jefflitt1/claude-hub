# System Monitoring Setup

## Overview

Unified monitoring infrastructure for Mac Studio and Raspberry Pi using:
- **Beszel** - System metrics (CPU, RAM, disk, Docker containers)
- **Uptime Kuma** - HTTP endpoint uptime monitoring
- **n8n workflows** - Service health checks and alerting

## Uptime Kuma Setup

### Access
- **Public URL:** https://kuma.l7-partners.com
- **Internal URL:** http://100.77.124.12:3001 (Tailscale)
- **Container:** `uptime-kuma`
- **Data:** `/opt/uptime-kuma/data`

### Credentials
- **Username:** `jeff`
- **Password:** `L7monitors!`

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

**Removed (internal-only, no public DNS needed):**
- `supabase.l7-partners.com` - Supabase Studio not deployed; using Supabase cloud
- `claude-api.l7-partners.com` - Behind Cloudflare Access; internal monitor covers it
- `ollama.l7-partners.com` - Internal service; internal monitor covers it

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

| Workflow | Purpose | Interval |
|----------|---------|----------|
| Self-Healing Monitor | Claude Server health | 15 min |
| Unified System Monitor | Multi-service health | - |
| System Health Check | General health | - |

**Location:** n8n.l7-partners.com

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

**Note:** `ollama.l7-partners.com` and `supabase.l7-partners.com` DNS records removed - these are internal-only services monitored via Tailscale.

## Network Topology

```
┌──────────────────────────────────────────────────────────────┐
│                      Tailscale Mesh                           │
│                                                               │
│  MacBook Pro           Raspberry Pi          Mac Studio       │
│  (jeff-probis)         (jeffn8nhost)         (jgl)           │
│                        100.77.124.12         100.67.99.120    │
│                             │                     │           │
│                        ┌────┴─────┐          ┌────┴─────┐    │
│                        │ Beszel   │          │ Beszel   │    │
│                        │  Hub     │◄─────────│ Agent    │    │
│                        │ :8090    │ Tailscale│ :45876   │    │
│                        │          │          └──────────┘    │
│                        │ Beszel   │                           │
│                        │ Agent    │ (Docker DNS:              │
│                        │ :45876   │  beszel-agent)            │
│                        ├──────────┤                           │
│                        │ Kuma     │                           │
│                        │ :3001    │                           │
│                        ├──────────┤                           │
│                        │ n8n      │                           │
│                        │ :5678    │                           │
│                        └──────────┘                           │
│                                                               │
│  CF Tunnel (Pi): c5935af7    CF Tunnel (Studio): 01ac78e0    │
└──────────────────────────────────────────────────────────────┘
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

## Alerting Flow

1. **Beszel** → Telegram (system metrics: CPU, RAM, disk threshold alerts)
2. **Uptime Kuma** → Telegram (HTTP endpoint down/up transitions)
3. **n8n Self-Healing Monitor** → Telegram (Claude Server status, 15 min interval)
4. **n8n Unified System Monitor** → Telegram (multi-service health)

## Troubleshooting

### Beszel agent won't start
- Check if KEY env var is set
- Verify Docker socket is mounted
- Check hub is reachable: `curl http://100.77.124.12:8090`

### n8n alerts not working
- Check workflow is active
- Verify Telegram bot token
- Check error workflow: OSKEDUq7HqOKiwWw

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
