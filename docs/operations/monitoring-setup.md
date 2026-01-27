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

### Initial Setup
1. Access https://kuma.l7-partners.com
2. Create admin account (first-time setup)
3. Configure notifications:
   - Settings → Notifications → Add Telegram
   - Bot Token: `8169830247:AAF_BStYa7AqKPbHCeErAl2oij17d7cJhyI`
   - Chat ID: `7938188628`
4. Run monitor setup script:
   ```bash
   ~/Documents/Claude\ Code/claude-agents/scripts/setup-kuma-monitors.sh "YOUR_API_KEY"
   ```

### Subdomains to Monitor
| Subdomain | Backend | Type |
|-----------|---------|------|
| n8n.l7-partners.com | Pi (tunnel) | HTTP |
| metabase.l7-partners.com | Pi (tunnel) | HTTP |
| supabase.l7-partners.com | Pi (tunnel) | HTTP |
| webhooks.l7-partners.com | Pi (tunnel) | HTTP |
| kuma.l7-partners.com | Pi (tunnel) | HTTP |
| claude-api.l7-partners.com | Mac Studio (tunnel) | HTTP |
| chat.l7-partners.com | Mac Studio (tunnel) | HTTP |
| ollama.l7-partners.com | Mac Studio (tunnel) | HTTP |
| l7-partners.com | Netlify | HTTP |
| claude.l7-partners.com | Netlify | HTTP |
| jglcap.l7-partners.com | Netlify | HTTP |
| admin.l7-partners.com | Netlify | HTTP |
| 191.l7-partners.com | Netlify | HTTP |

## Beszel Setup

### Hub (on Pi)
- **Location:** Raspberry Pi (jeffn8nhost)
- **Port:** 8090
- **Container:** `beszel`
- **Data:** `/opt/beszel/data`

**Access URL:** `http://100.77.124.12:8090` (Tailscale)

### Agents
| Host | IP | Port | Container |
|------|-----|------|-----------|
| Pi (jeffn8nhost) | 100.77.124.12 | 45876 | beszel-agent |
| Mac Studio | 100.67.99.120 | 45876 | beszel-agent |

### Initial Setup

1. Access Beszel UI: `http://100.77.124.12:8090`
2. Create admin account (first-time setup)
3. Click "Add System" → Copy the public key
4. Run setup script:
   ```bash
   ~/Documents/Claude\ Code/claude-agents/scripts/setup-beszel-agents.sh "YOUR_KEY"
   ```
5. Add systems in UI:
   - Pi: `100.77.124.12:45876` (name: jeffn8nhost)
   - Mac Studio: `100.67.99.120:45876` (name: mac-studio)

### Restart Agents (if needed)
```bash
# Pi
ssh root@100.77.124.12 "docker restart beszel-agent"

# Mac Studio
ssh jgl@100.67.99.120 "source ~/.zshrc; docker restart beszel-agent"
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

## Network Topology

```
┌─────────────────────────────────────────────────────────┐
│                    Tailscale Mesh                        │
│                                                          │
│  MacBook Pro          Raspberry Pi        Mac Studio     │
│  (jeff-probis)        (jeffn8nhost)       (jgl)         │
│                       100.77.124.12       100.67.99.120  │
│                            │                   │         │
│                       ┌────┴────┐         ┌────┴────┐   │
│                       │ Beszel  │         │ Beszel  │   │
│                       │  Hub    │◄────────│ Agent   │   │
│                       │ :8090   │         │ :45876  │   │
│                       │         │         └─────────┘   │
│                       │ Beszel  │                        │
│                       │ Agent   │                        │
│                       │ :45876  │                        │
│                       └─────────┘                        │
│                                                          │
│                       n8n :5678                          │
│                       (health workflows)                 │
└─────────────────────────────────────────────────────────┘
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

## Alerting Flow

1. **Beszel** → Telegram (system metrics alerts)
2. **n8n Self-Healing Monitor** → Telegram (Claude Server status)
3. **n8n Unified System Monitor** → Telegram (service health)

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
