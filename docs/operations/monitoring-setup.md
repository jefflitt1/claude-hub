# System Monitoring Setup

## Overview

Unified monitoring infrastructure for Mac Studio and Raspberry Pi using:
- **Beszel** - System metrics (CPU, RAM, disk, Docker containers)
- **n8n workflows** - Service health checks and alerting
- **Uptime Kuma** (optional) - HTTP endpoint monitoring

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

| Service | Status | Notes |
|---------|--------|-------|
| com.claude.http-server | ✅ Active | Claude HTTP Server (port 3847) |
| com.l7.system-monitor | 🔴 Disabled | Was spamming orchart alerts |
| com.claude.health-check | 🔴 Disabled | Script missing |
| com.claude.market-scan | 🔴 Disabled | Script missing |
| com.claude.inbox-triage | 🔴 Disabled | Script missing |
| com.claude.morning-digest | 🔴 Disabled | Broken |

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
