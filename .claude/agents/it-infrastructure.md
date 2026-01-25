# IT Infrastructure Agent

Read-only infrastructure documentation and system administration reference.

## Tools Available
- Read, Grep, Glob (file inspection)
- Bash (system commands, read-only preferred)
- **Cloudflare MCP** - DNS record management (list, create, update, delete)

## Capabilities
- Infrastructure documentation lookup
- System configuration reference
- Migration status tracking
- Network and service topology

---

# Mac Studio Migration (2026-01-21)

## Status: READY FOR TOMORROW

Migration package created at: `~/Desktop/mac-studio-migration/`

## Current Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   MacBook Pro   │     │  Raspberry Pi 5 │     │   Mac Studio    │
│   (Current)     │     │   (Always-On)   │     │  (ARRIVING)     │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ • Claude Code   │     │ • n8n server    │     │ (Tomorrow)      │
│ • All MCP Svrs  │     │ • cloudflared   │     │                 │
│ • HTTP API:3847 │     │                 │     │                 │
│ • mac-ssh tun   │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Target Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                    Mac Studio "jgl" (Always-On)                     │
├────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │ Windows VM 1     │  │ Windows VM 2     │  │ macOS Host       │ │
│  │ (VMware Fusion)  │  │ (VMware Fusion)  │  │                  │ │
│  ├──────────────────┤  ├──────────────────┤  │ • Claude Code    │ │
│  │ • TradeStation   │  │ • TradeStation   │  │ • Docker MCPs    │ │
│  │ • Strategy 1     │  │ • Strategy 2     │  │ • Tailscale      │ │
│  │ • Auto-trading   │  │ • Auto-trading   │  │ • HTTP API:3847  │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
         │
         │ Tailscale mesh + Cloudflare (public endpoints)
         ▼
┌─────────────────┐     ┌─────────────────┐
│   MacBook Pro   │     │  Raspberry Pi 5 │
│  (Thin Client)  │     │   (Always-On)   │
├─────────────────┤     ├─────────────────┤
│ • SSH + tmux    │     │ • n8n server    │
│ • Local dev     │     │ • Frigate NVR   │
│ • Jump Desktop  │     │ • AI HAT 2 NPU  │
└─────────────────┘     └─────────────────┘
```

## Migration Package Contents

Location: `~/Desktop/mac-studio-migration/`

| File | Purpose |
|------|---------|
| `secrets.tar.gz` | OAuth tokens, Cloudflare creds, Claude configs (7KB) |
| `01-mac-studio-initial-setup.sh` | Homebrew, tools, system config |
| `02-extract-secrets.sh` | Extract credentials to paths |
| `03-cloudflare-tunnel.sh` | Create mac-studio tunnel |
| `04-clone-repos.sh` | Clone repos, build meta-tools |
| `05-launch-agents.sh` | LaunchAgents for auto-start |
| `06-tmux-setup.sh` | tmux + session scripts |
| `macbook-ssh-config.txt` | SSH config for thin client |
| `mcp-servers-config.md` | Full MCP documentation |
| `docker-compose.mcp.yml` | Docker Compose for MCPs |
| `.env.template` | Environment variables |
| `windows-vms-setup.md` | TradeStation VM guide |
| `README.md` | Quick start guide |

## Tomorrow's Execution Plan

### Step 1: Physical Setup
- Unbox Mac Studio
- Connect to network (Ethernet preferred)
- Complete macOS initial setup
- Note local IP address: `192.168.4.XXX`

### Step 2: Transfer Migration Package
```bash
# Option A: AirDrop
# Option B: USB drive
# Option C: scp from MacBook (after SSH enabled)
```

### Step 3: Run Setup Scripts
```bash
cd ~/Desktop/mac-studio-migration
chmod +x *.sh

# Run in order:
./01-mac-studio-initial-setup.sh   # ~10 min, installs everything
claude login                        # Authenticate with Anthropic
./02-extract-secrets.sh            # Extract OAuth tokens
./03-cloudflare-tunnel.sh          # Create tunnel, DNS routes
./04-clone-repos.sh                # Clone and build (~5 min)
./05-launch-agents.sh              # Start services
./06-tmux-setup.sh                 # Configure sessions
```

### Step 4: Verify Services
```bash
# Check tunnel
curl -I https://studio-ssh.l7-partners.com

# Check HTTP API
curl http://localhost:3847/health

# Check services
launchctl list | grep -E "(cloudflare|claude)"
```

### Step 5: Configure MacBook Thin Client
```bash
# On MacBook:
cat ~/Desktop/mac-studio-migration/macbook-ssh-config.txt >> ~/.ssh/config

# Edit IP for local access:
nano ~/.ssh/config

# Add aliases:
echo 'alias studio="ssh studio -t ~/.claude/start-session.sh"' >> ~/.zshrc
source ~/.zshrc

# Test:
studio
```

## MCP Servers to Migrate

### Meta-Tools (built from repo)
- unified-browser
- unified-comms (Gmail OAuth in ~/.config/unified-comms/)
- l7-business (Supabase + n8n)
- jeff-agent (Supabase)
- feedly (access token)
- session-context (Supabase)

### External NPX Servers
- n8n-mcp
- google-calendar (@cocal/google-calendar-mcp)
- google-sheets (@mcp-z/mcp-sheets)
- sequential-thinking
- context7
- codex-cli
- gemini-cli

### Custom Servers
- apple-notes (bun, macOS native)
- telegram (uv/python)
- MCP_DOCKER (Docker gateway)
- tradestation (JGL Capital)

## Credentials Locations

### Preserved in secrets.tar.gz:
- `~/.config/unified-comms/` - Gmail OAuth (personal + L7)
- `~/.config/gdrive-mcp/` - Drive OAuth (L7 + JGL)
- `~/.config/google-calendar-mcp/` - Calendar OAuth
- `~/.config/google-sheets-mcp/` - Sheets credentials
- `~/.cloudflared/` - Tunnel credentials + cert
- `~/.claude/claude-http-server.js` - HTTP API server
- `~/.claude/claude-http-key.txt` - API key

### Environment Variables (in .env.template):
- SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
- N8N_URL / N8N_API_KEY
- FEEDLY_ACCESS_TOKEN
- GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
- TRADESTATION_* (placeholder, need real creds)

## Cloudflare Tunnel Configuration

### Current (MacBook):
- Tunnel: `mac-ssh`
- Routes:
  - `mac-ssh.l7-partners.com` -> SSH
  - `claude-api.l7-partners.com` -> HTTP API

### New (Mac Studio):
- Tunnel: `mac-studio`
- Routes:
  - `studio-ssh.l7-partners.com` -> SSH
  - `claude-api.l7-partners.com` -> HTTP API (migrate after verify)

## Windows VMs for Trading

### Platform: VMware Fusion Pro (Free)
> ⚠️ Parallels has documented freezing issues with TradeStation on Mac Studio Ultra

- **Install**: `brew install --cask vmware-fusion`
- **Why VMware**: More stable for real-time trading, no network I/O bottlenecks

### Per VM Configuration:
- Windows 11 ARM64 + Prism (x86 translation)
- 4 CPU cores, 16 GB RAM, 128 GB disk
- TradeStation Desktop installed
- Auto-start on boot via LaunchAgent
- Bridged networking for stable IPs

### Two VMs Purpose:
- VM 1: Trading Strategy 1 (`trading-vm1.l7-partners.com`)
- VM 2: Trading Strategy 2 (`trading-vm2.l7-partners.com`)
- Both connect to JGL Capital system

### Remote Access (Tailscale + Jump Desktop)

**Stack:** Tailscale (network) + Jump Desktop (visuals) = $53 total ($35 Mac + $18 iOS)

| Device | Protocol | Tailscale Hostname |
|--------|----------|-------------------|
| Mac Studio | Fluid | `mac-studio` |
| Windows VM 1 | RDP | `trading-vm1` |
| Windows VM 2 | RDP | `trading-vm2` |
| Pi 5 | VNC | `pi5` |

**Setup:**
```bash
# All devices
brew install tailscale && sudo tailscale up  # Mac
curl -fsSL https://tailscale.com/install.sh | sh && sudo tailscale up  # Pi
# Windows: Download installer from tailscale.com
```

**Access from anywhere:**
```bash
ssh mac-studio           # CLI access
# Jump Desktop app → select device → instant GUI
```

**Replaces:** RealVNC, Cloudflare access tunnels, complex DNS routing

## Pi 5 + AI HAT 2

### Current Role:
- n8n server (https://n8n.l7-partners.com)
- Cloudflare tunnel

### Future Role (Decided):
- **n8n automation** (continues)
- **Frigate NVR** - Security camera management with AI detection
- **Hailo NPU** - Real-time object detection (person, vehicle, package, animal)
- Primary camera processing hub (local inference, no cloud)

### Frigate Setup (Future):
```bash
# Install Frigate with Hailo support
docker run -d \
  --name frigate \
  --restart unless-stopped \
  --privileged \
  -v /dev/hailo0:/dev/hailo0 \
  -v /path/to/config:/config \
  -v /path/to/storage:/media/frigate \
  -p 5000:5000 \
  ghcr.io/blakeblackshear/frigate:stable
```

**Benefits:**
- 26 TOPS NPU for vision tasks
- Local processing = full privacy
- Runs alongside n8n (lightweight)

## Outstanding Tasks

### ⚠️ BLOCKING: Windows PC Software Audit
**Status:** Needs IP addresses and credentials

Two physical Windows PCs currently running TradeStation need to be audited before creating VM replacements:
- **Purpose:** Identify all installed software for VM image
- **Required info:** IP addresses + login credentials (captured earlier on 2026-01-23)
- **Audit scope:** Installed programs, TradeStation version, EasyLanguage strategies, Windows licenses

**Once IPs provided, run:**
```bash
# SSH or RDP into each PC and document:
# - Installed software list
# - TradeStation version and workspace
# - Windows license key (for transfer attempt)
# - Any custom scripts or automation
```

---

## Decisions Finalized (2026-01-21)

1. ✅ **Mac Studio username**: `jgl` (different from MacBook)
2. ✅ **Windows VM platform**: VMware Fusion Pro (free, avoids Parallels freezing)
3. ✅ **Pi 5 AI HAT task**: Security camera AI processing (Frigate NVR + Hailo NPU)
4. ✅ **Docker vs Native MCPs**: Docker (single docker-compose.mcp.yml)
5. ✅ **Windows licenses**: Try transfer first, then Kinguin keys (~$30-60 total)
6. ✅ **Grok integration**: `grok-mcp` MCP server (not full CLI)

## Rollback Procedure

If Mac Studio issues arise:
```bash
# On MacBook - re-enable services:
launchctl load ~/Library/LaunchAgents/com.cloudflare.mac-ssh.plist
launchctl load ~/Library/LaunchAgents/com.claude.http-server.plist

# Update Cloudflare DNS to point back to MacBook tunnel
```

## Network Reference

| Host | IP | Purpose |
|------|-----|---------|
| MacBook | (DHCP) | Development, thin client |
| Mac Studio | 192.168.4.XXX | Primary Claude Code server |
| Pi 5 | 192.168.4.YYY | n8n, AI HAT |
| n8n.l7-partners.com | Cloudflare | n8n automation |
| studio-ssh.l7-partners.com | Cloudflare | Mac Studio SSH |
| claude-api.l7-partners.com | Cloudflare | Claude HTTP API |

---

*Last updated: 2026-01-21*
*Session: Mac Studio migration preparation*
