# JLDesktop2 (PC2) - VERIFIED WORKING CONFIGURATION
**Last Verified:** 2026-01-30
**Status:** Production Ready

## Overview
Secondary TradeStation workstation - HP OMEN desktop configured for headless 24/7 trading operations.

## Hardware Specifications
| Component | Specification |
|-----------|--------------|
| Model | HP OMEN Desktop |
| CPU | Intel i5-10400 (6 cores, 12 threads) |
| RAM | 16GB |
| GPU | NVIDIA GTX 1660 Ti |
| Storage | ~450GB SSD |
| OS | Windows 11 Pro 25H2 |

## Network Configuration
| Property | Value |
|----------|-------|
| **Tailscale IP** | 100.68.163.47 |
| **Local IP** | 192.168.4.46 |
| **RDP Port** | 3389 |
| **SSH Port** | 22 (OpenSSH Server) |

## User Accounts
| Username | Password | Type | Purpose |
|----------|----------|------|---------|
| **ITadmin** | Trading2026 | Local | Auto-login, primary RDP access |
| **jglit** | 0924 | Local | SSH access (key auth), admin |

### Authentication Details
- **RDP:** Uses ITadmin with password
- **SSH:** Uses jglit with SSH key authentication
- **Auto-login:** ITadmin account logs in automatically on boot

## Auto-Start Sequence (TESTED & WORKING)
```
1. PC boots
2. ITadmin auto-logs in (automatic)
3. Tailscale connects (before login screen)
4. TradeStation launches via scheduled task "TradeStation Startup"
5. SSH becomes available
```

### TradeStation Auto-Start
- Scheduled task: "TradeStation Startup" (runs on logon as ITadmin)
- Executable: `C:\Program Files (x86)\TradeStation 10.0\Program\ORPlat.exe`

## Power & Headless Configuration
| Setting | Value | Purpose |
|---------|-------|---------|
| Auto-login | ITadmin | Boots without user interaction |
| Sleep (AC Power) | Never | Always available for trading |
| Monitor Timeout | 5 minutes | Saves power when headless |
| Hibernate | Disabled | Prevents unexpected shutdowns |
| Windows Search | Disabled | Reduces CPU/disk usage |
| Diagnostics | Disabled | Reduces network/disk usage |
| SysMain/Superfetch | Disabled | Improves performance |

## Notifications
- Toast notifications: Disabled
- Notification Center: Disabled
- Tips & suggestions: Disabled
- Windows Error Reporting: Disabled

## Removed Software (2026-01-30)
- NordVPN: Uninstalled
- NordUpdater: Uninstalled
- TeamViewer: Uninstalled

## Remote Access Methods

### 1. RDP (Jump Desktop / Remote Desktop)
```
Host: 100.68.163.47:3389
Username: ITadmin
Password: Trading2026
```

### 2. SSH (Key Authentication)
```bash
# From Mac/Linux
ssh jglit@100.68.163.47

# SSH key location (on client)
~/.ssh/id_ed25519

# Windows OpenSSH locations
C:\Users\jglit\.ssh\authorized_keys
C:\ProgramData\ssh\administrators_authorized_keys
```

### 3. Tailscale (Network Layer)
- Automatically connects on boot
- Available before user login
- Provides secure mesh networking
- IP: 100.68.163.47

## Firewall Rules
| Rule | Direction | Protocol | Port | Interface |
|------|-----------|----------|------|-----------|
| AllowTailscaleIn | Inbound | Any | Any | Tailscale |
| AllowSSH | Inbound | TCP | 22 | Any |
| AllowRDP | Inbound | TCP | 3389 | Any |
| OpenSSH Server | Inbound | TCP | 22 | Any |

## Headless Operation Verification
**Test Results (2026-01-30):**
- ✅ Boots without monitor
- ✅ Auto-login works (ITadmin)
- ✅ Tailscale connects automatically
- ✅ TradeStation scheduled task created
- ✅ RDP access functional
- ✅ SSH access functional (jglit via Tailscale)
- ✅ NordVPN/TeamViewer removed
- ✅ Notifications disabled

## Troubleshooting

### If PC is unreachable:
1. Check local network: `ping 192.168.4.46`
2. Check Tailscale: `tailscale ping 100.68.163.47`
3. Verify power (ensure AC power)
4. Check router for DHCP lease

### If Tailscale isn't connecting:
1. Verify machine is powered on
2. RDP via local IP (192.168.4.46) if on same network
3. Restart Tailscale service: `net stop tailscale && net start tailscale`

### If TradeStation didn't auto-start:
1. Check scheduled task: `schtasks /query /tn "TradeStation Startup"`
2. Check Windows Event Viewer for startup errors
3. Manually launch: `"C:\Program Files (x86)\TradeStation 10.0\Program\ORPlat.exe"`

## Integration with Infrastructure

### Tailscale Network
- **Role:** Trading workstation 2, TradeStation host
- **Exit Node:** No
- **SSH:** Yes (via OpenSSH Server)

### TradeStation Integration
- Connected to TradeStation MCP server (Mac Studio)
- API credentials stored in environment variables
- Simulation and live environments supported

## Pending Configuration
- [ ] Rename in Tailscale admin console to `JLDesktop2` (currently shows `desktop-ts`)
- [ ] Disable key expiry in Tailscale admin
- [ ] **Power On after AC loss** - BIOS setting (requires physical access, F10 on HP OMEN)

## Quick Reference Commands

### From Mac/Linux:
```bash
# SSH into PC2
ssh jglit@100.68.163.47

# RDP via Jump Desktop
# Host: 100.68.163.47, User: ITadmin, Pass: Trading2026

# Check if online
tailscale ping 100.68.163.47
```

### On Windows PC (via SSH):
```powershell
# Check Tailscale status
tailscale status

# Restart Tailscale
net stop tailscale && net start tailscale

# Check TradeStation process
Get-Process | Where-Object {$_.ProcessName -like "*TradeStation*" -or $_.ProcessName -like "*ORPlat*"}

# Check scheduled task
schtasks /query /tn "TradeStation Startup"

# Check disk space
Get-PSDrive C
```

---

**Documentation Owner:** IT Infrastructure Agent
**Contact:** Jeff Littell (jglittell@gmail.com)
**Last Updated:** 2026-01-30
