# /it - IT Infrastructure Skill

## Trigger
- `/it` command
- Questions about: infrastructure, network, devices, credentials, MCP servers, Tailscale, Cloudflare, system settings

## Purpose
Quick access to IT infrastructure information, diagnostics, and credential tracking.

## Quick Commands

| Command | Action |
|---------|--------|
| `/it` | General IT status overview |
| `/it status` | Infrastructure health check |
| `/it credentials` | Credential inventory and expiry status |
| `/it network` | Network topology and device IPs |
| `/it mcp` | MCP server status and troubleshooting |
| `/it [device]` | Info about specific device (e.g., `/it mac-studio`, `/it pi`) |

## Subagent Invocation

For complex IT tasks, spawn the full IT agent:
```
Use it-agent to diagnose the n8n connectivity issue
```

The `it-agent` subagent has:
- Read access to all config files and documentation
- Cloudflare MCP for DNS/tunnel/Access management
- Bash for network diagnostics
- Supabase queries for credential tracking

## Quick Reference

### Device IPs (Tailscale)
| Device | IP |
|--------|-----|
| Mac Studio | 100.67.99.120 |
| MacBook Pro | 100.85.201.111 |
| Pi (n8n) | 100.77.124.12 |
| Pi (secondary) | 100.95.8.67 |
| iPhone | 100.102.117.40 |

### SSH Quick Access
```bash
ssh jgl@100.67.99.120      # Mac Studio
ssh jeffn8n@100.77.124.12  # n8n Pi
ssh jglit@100.95.8.67      # Secondary Pi
```

### Service Endpoints
| Service | URL |
|---------|-----|
| n8n | https://n8n.l7-partners.com |
| Uptime Kuma | https://kuma.l7-partners.com |
| Ollama | http://100.67.99.120:11434 |
| Claude HTTP | http://localhost:3847 |

### MCP Servers (by type)
**API Key (shared via env vars):**
- l7-business, jeff-agent, session-context, feedly

**OAuth (machine-specific):**
- unified-comms, google-calendar, google-sheets, google-tasks

**No auth:**
- unified-browser, sequential-thinking, context7, apple-notes

### Credential Alerts
Check `credentials_inventory` table for:
- Expired credentials
- Credentials expiring in < 30 days
- Credentials not rotated in 90+ days

## Related Documentation
- `~/CLAUDE.md` - Master reference
- `~/.claude/agents/it-agent.md` - Full IT agent context
- `~/Documents/Claude Code/claude-agents/docs/it-agent/tech-stack-inventory.md` - Tech inventory
