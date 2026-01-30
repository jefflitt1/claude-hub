# JLDesktop (PC1) - VERIFIED WORKING CONFIGURATION
**Last Verified:** 2026-01-29
**Status:** Production Ready

## Overview
Primary TradeStation workstation - HP OMEN desktop configured for headless 24/7 trading operations.

## Hardware Specifications
| Component | Specification |
|-----------|--------------|
| Model | HP OMEN Desktop |
| CPU | Intel i5-10400 (6 cores, 12 threads) |
| RAM | 16GB |
| GPU | NVIDIA GTX 1660 Ti |
| Storage | ~450GB SSD |
| OS | Windows 11 Pro |

## Network Configuration
| Property | Value |
|----------|-------|
| **Tailscale IP** | 100.69.59.111 |
| **Local IP** | 192.168.4.45 |
| **RDP Port** | 3389 |
| **SSH Port** | 22 (OpenSSH Server) |

## User Accounts
| Username | Password | Type | Purpose |
|----------|----------|------|---------|
| **claudeadmin** | Trading2026 | Local | Auto-login, primary RDP access |
| **Administrator** | Trading2026 | Local | UAC prompts, system tasks |
| **jglit** | 0924 | Microsoft | SSH access (key auth only) |

### Authentication Details
- **RDP:** Uses claudeadmin with password
- **SSH:** Uses jglit with SSH key authentication (password disabled)
- **Auto-login:** claudeadmin account logs in automatically on boot

## Auto-Start Sequence (TESTED & WORKING)
```
1. PC boots
2. claudeadmin auto-logs in (automatic)
3. Tailscale connects (before login screen)
4. TradeStation launches from Startup folder
5. SSH becomes available
```

### TradeStation Auto-Start Location
```
C:\Users\claudeadmin\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\TradeStation.lnk
```

## Power & Headless Configuration
| Setting | Value | Purpose |
|---------|-------|---------|
| Auto-login | claudeadmin | Boots without user interaction |
| Sleep (AC Power) | Never | Always available for trading |
| Monitor Timeout | 5 minutes | Saves power when headless |
| Hibernate | Disabled | Prevents unexpected shutdowns |
| Windows Search | Disabled | Reduces CPU/disk usage |
| Diagnostics | Disabled | Reduces network/disk usage |
| SysMain/Superfetch | Disabled | Improves performance |

## Windows Licensing
- **Edition:** Windows 11 Pro
- **Product Key:** HQN4V-HWBRB-KKM8P-YJG4D-YBHX3
- **Status:** Activated

## Services & Background Tasks

### Critical Services
- **Tailscale:** Auto-starts before user login
- **OpenSSH Server:** Available after auto-login
- **TradeStation:** Auto-launches from Startup folder

### Disabled Services (Performance)
- Windows Search (SearchIndexer)
- Connected User Experiences and Telemetry
- SysMain (Superfetch)
- Windows Error Reporting

## Remote Access Methods

### 1. RDP (Jump Desktop / Remote Desktop)
```
Host: 100.69.59.111:3389
Username: claudeadmin
Password: Trading2026
```

### 2. SSH (Key Authentication)
```bash
# From Mac/Linux
ssh jglit@100.69.59.111

# SSH key location (on client)
~/.ssh/id_ed25519

# Windows OpenSSH location
C:\ProgramData\ssh\administrators_authorized_keys
```

**Note:** SSH password authentication is disabled for security. Only key-based auth works.

### 3. Tailscale (Network Layer)
- Automatically connects on boot
- Available before user login
- Provides secure mesh networking
- IP: 100.69.59.111

## Headless Operation Verification
**Test Results (2026-01-29):**
- ✅ Boots without monitor
- ✅ Auto-login works
- ✅ Tailscale connects automatically
- ✅ TradeStation launches
- ✅ RDP access functional
- ✅ SSH access functional
- ✅ Remote desktop session active and responsive

## Troubleshooting

### If PC is unreachable:
1. Check if it's on the local network: `ping 192.168.4.45`
2. Check Tailscale status: `ping 100.69.59.111`
3. Verify power (ensure AC power, not battery backup failure)
4. Check router for DHCP lease confirmation

### If Tailscale isn't connecting:
1. Verify machine is powered on
2. RDP via local IP (192.168.4.45) if on same network
3. Restart Tailscale service: `net stop tailscale && net start tailscale`

### If TradeStation didn't auto-start:
1. Verify shortcut exists in Startup folder
2. Check Windows Event Viewer for startup errors
3. Manually launch: `C:\Program Files\TradeStation\TradeStation.exe`

## Migration Notes
This PC replaces the following deprecated systems:
- ❌ Windows VM 1 (Tailscale IP: 100.95.217.59) - Decommissioned
- ❌ Windows VM 2 (Tailscale IP: 100.117.154.92) - Decommissioned

**Reasons for migration:**
- Native hardware provides better performance
- Eliminates VM overhead and complexity
- More reliable for 24/7 trading operations
- Headless operation proven and tested

## Integration with Infrastructure

### Tailscale Network
- **Role:** Trading workstation, TradeStation host
- **Exit Node:** No (consumes from Mac Studio exit node if needed)
- **SSH:** Yes (via OpenSSH Server)
- **Subnet Routes:** None

### TradeStation Integration
- Connected to TradeStation MCP server (Mac Studio)
- API credentials stored in environment variables
- Simulation and live environments supported
- Requires manual re-auth every 24 hours (refresh token expiry)

### Backup & Monitoring
- **No local backups** (ephemeral trading data only)
- **Monitoring:** Should be added to n8n health checks
- **Logs:** Windows Event Viewer for system events

## Security Considerations
- **Firewall:** Windows Defender enabled
- **SSH:** Key-based authentication only (no passwords)
- **RDP:** Password-protected (consider switching to key auth)
- **Network:** Tailscale provides encrypted mesh (no port forwarding needed)
- **Auto-login:** Acceptable for headless trading PC (physical security assumed)

## Maintenance Checklist
- [ ] Weekly Windows Updates (manually schedule during off-hours)
- [ ] Monthly TradeStation software updates
- [ ] Quarterly Tailscale client updates
- [ ] As needed: TradeStation API re-authentication (24hr expiry)

## Future Enhancements
- [ ] Add to n8n Self-Healing Monitor workflow
- [ ] Configure Windows Event Log forwarding to monitoring stack
- [ ] Set up automated TradeStation health checks
- [ ] Consider BitLocker encryption for disk (if storing credentials locally)

---

## Quick Reference Commands

### From Mac/Linux:
```bash
# SSH into PC
ssh jglit@100.69.59.111

# RDP via Jump Desktop
# Host: 100.69.59.111, User: claudeadmin, Pass: Trading2026

# Check if online
ping 100.69.59.111

# Wake over Tailscale (if Wake-on-LAN configured)
# Not currently configured
```

### On Windows PC (via SSH):
```powershell
# Check Tailscale status
tailscale status

# Restart Tailscale
net stop tailscale && net start tailscale

# Check TradeStation process
Get-Process | Where-Object {$_.ProcessName -like "*TradeStation*"}

# View recent system events
Get-EventLog -LogName System -Newest 20

# Check disk space
Get-PSDrive C
```

---

**Documentation Owner:** IT Infrastructure Agent  
**Contact:** Jeff Littell (jglittell@gmail.com)  
**Last Updated:** 2026-01-30

---

## Jump Desktop Connect Resolution (2026-01-30)

### Problem
Couldn't connect via Jump Desktop RDP. Error: "Connection closed by server - Another user connected to the session. Code: 0x5"

### Root Cause
Windows 11 Pro only allows **one interactive session per user**. ITadmin on console (running TradeStation) triggers "session arbitration" when RDP connects as same user — console always wins, kicks RDP.

### Solution: Jump Desktop Connect (Fluid Protocol)
Installed **Jump Desktop Connect** which uses the **Fluid protocol** instead of RDP. Fluid mirrors the existing console screen directly — no session conflict.

#### Installation Steps:
1. Downloaded installer via SSH: `https://jumpdesktop.com/downloads/connect/win`
2. Silent install via SSH failed (UAC blocks it) — Jeff connected monitor to complete install
3. Signed into Jump Desktop account on PC
4. PC appeared under "My Computers" in Jump Desktop sidebar on Mac (Fluid protocol)
5. Confirmed working — headless console access with no session conflicts

#### Services Installed:
| Service | Status | StartType |
|---------|--------|-----------|
| `JumpConnect` | Running | Automatic |

#### Registry Changes Applied (didn't fix core RDP issue, but good defaults):
```cmd
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Terminal Server" /v fSingleSessionPerUser /t REG_DWORD /d 0 /f
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp" /v Shadow /t REG_DWORD /d 2 /f
```

### Updated Remote Access Methods
| Priority | Method | Protocol | Address | Notes |
|----------|--------|----------|---------|-------|
| **Primary** | Jump Desktop Connect | Fluid | "My Computers" sidebar | Mirrors console, no conflict |
| Fallback | RDP | RDP | `100.69.59.111:3389` | Only if console unoccupied |
| CLI | SSH | SSH | `jglit@100.69.59.111` | Key auth only |

### Cloudflare Tunnel Status
**No Cloudflare tunnel exists for JLDesktop1.** The `trading-pc1.l7-partners.com` reference was from the old VM setup. Cloudflared is not installed. Only existing tunnels: `mac-studio` and `n8n-tunnel`.
