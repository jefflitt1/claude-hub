# PC2 TradeStation Migration Gameplan

> **Created:** 2026-01-29 | **Purpose:** Migrate VM2 workload to PC2

## CRITICAL: Lessons from PC1 (Read First)

> **Windows 11 Pro only allows one interactive session per user.** RDP will always conflict with the console session (where TradeStation runs). **Install Jump Desktop Connect (Fluid protocol) BEFORE going headless.** Do NOT rely on RDP for headless access.

## Phase 1: Information Gathering & Preparation

### PC2 Hardware/Network Discovery
- [ ] Power on PC2 and verify physical condition
- [ ] Document hardware specs (CPU, RAM, GPU, storage)
- [ ] Check Windows version (should be Windows 11 Pro for RDP)
- [ ] Record current hostname
- [ ] Check current network connectivity (WiFi vs Ethernet)
- [ ] Verify router DHCP lease or note current local IP
- [ ] Test internet connectivity

### Pre-Migration Cleanup
- [ ] Shutdown Windows VM 2 gracefully (100.117.154.92)
- [ ] Document any active TradeStation positions/settings from VM
- [ ] Note TradeStation login credentials (if not already documented)
- [ ] Verify TradeStation can be installed on 2 simultaneous devices

### Required Materials
- [ ] **Jump Desktop Connect installer** (PRIORITY 1 — download from `https://jumpdesktop.com/downloads/connect/win`)
- [ ] TradeStation installer (download latest from tradestation.com)
- [ ] Tailscale installer (download from tailscale.com)
- [ ] SSH public key for jglit account (`~/.ssh/id_ed25519.pub` from Mac)
- [ ] Network credentials (WiFi password if needed)

---

## Phase 2: Base System Configuration

### Initial Access & Updates
- [ ] Login to PC2 with existing account
- [ ] Run Windows Update, install all critical updates
- [ ] Reboot if required
- [ ] Set computer name to `JLDesktop2` (Settings → System → About → Rename)
- [ ] Reboot to apply name change

### Create ITadmin Account
- [ ] Settings → Accounts → Family & other users → Add account
- [ ] Create local account "ITadmin" with password "Trading2026"
- [ ] Set account type to Administrator
- [ ] Test login to ITadmin account
- [ ] Return to ITadmin account for remaining setup

### Auto-Login Configuration
```cmd
# Run as Administrator - PowerShell or CMD
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v AutoAdminLogon /t REG_SZ /d 1 /f
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v DefaultUserName /t REG_SZ /d ITadmin /f
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v DefaultPassword /t REG_SZ /d Trading2026 /f
reg delete "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v AutoLogonCount /f 2>nul
```

---

## Phase 2.5: Jump Desktop Connect (DO BEFORE GOING HEADLESS)

> **MUST complete while monitor is still connected.**

### Installation
- [ ] Download Jump Desktop Connect: `https://jumpdesktop.com/downloads/connect/win`
- [ ] Run installer on PC2
- [ ] Sign into Jump Desktop account (same account as on Mac)
- [ ] Verify `JumpConnect` service is running: `Get-Service JumpConnect`

### Verification (Monitor Still Connected)
- [ ] Open Jump Desktop on Mac
- [ ] Check "My Computers" sidebar — PC2 should appear
- [ ] Connect using Fluid protocol — confirm you see the desktop
- [ ] Test keyboard/mouse control
- [ ] Disconnect and reconnect to verify stability
- [ ] **ONLY remove monitor after this passes**

### Registry Defaults (apply now)
```cmd
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Terminal Server" /v fSingleSessionPerUser /t REG_DWORD /d 0 /f
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp" /v Shadow /t REG_DWORD /d 2 /f
```

---

## Phase 3: Network & Remote Access

### Tailscale Installation
- [ ] Download Tailscale Windows installer
- [ ] Install Tailscale (use default options)
- [ ] Login to Tailscale with Jeff's account
- [ ] Verify Tailscale IP assigned (note it down)
- [ ] Test connectivity: `ping 100.67.99.120` (Mac Studio)
- [ ] Disable Tailscale key expiry in admin console
- [ ] Set machine name in Tailscale admin to "JLDesktop2"

### SSH Setup (OpenSSH Server)
```powershell
# Run as Administrator
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
Start-Service sshd
Set-Service -Name sshd -StartupType 'Automatic'
```
- [ ] Create jglit local account (standard user)
- [ ] Set jglit password
- [ ] Create `C:\Users\jglit\.ssh\` directory
- [ ] Copy SSH public key to `C:\Users\jglit\.ssh\authorized_keys`
- [ ] Test SSH from Mac: `ssh jglit@<tailscale-ip>`

### RDP Configuration (Fallback Only — use Fluid as primary)
- [ ] Settings → System → Remote Desktop → Enable
- [ ] Add ITadmin and jglit to allowed users
- [ ] Test RDP from Jump Desktop: `<tailscale-ip>:3389`
- [ ] Note: RDP is fallback only — Fluid protocol is primary for headless access

---

## Phase 4: Power & Performance Optimization

### Power Settings
```cmd
# Run as Administrator
powercfg /hibernate off
powercfg /change standby-timeout-ac 0
powercfg /change standby-timeout-dc 0
powercfg /change monitor-timeout-ac 5
powercfg /change disk-timeout-ac 0
```

### Disable Unnecessary Services
```cmd
sc config WSearch start=disabled && sc stop WSearch
sc config DiagTrack start=disabled && sc stop DiagTrack
sc config SysMain start=disabled && sc stop SysMain
```

### Disable Notifications & Background Apps
- [ ] Settings → System → Notifications → Disable all
- [ ] Settings → Privacy → Background apps → Turn off
- [ ] System Properties → Advanced → Performance → Adjust for best performance

---

## Phase 5: TradeStation Installation

### Installation
- [ ] Download latest TradeStation Desktop
- [ ] Install with ITadmin account
- [ ] Login and configure workspaces
- [ ] Note executable path

### Auto-Start Scheduled Task
```cmd
schtasks /create /tn "TradeStation Startup" /tr "\"C:\Program Files (x86)\TradeStation 10.0\Program\ORPlat.exe\"" /sc onlogon /ru ITadmin /rp Trading2026 /rl highest /f
```

---

## Phase 6: Verification

### Reboot Test
- [ ] Reboot PC2
- [ ] Verify ITadmin auto-login
- [ ] Verify Tailscale connects
- [ ] Verify TradeStation starts (wait 30s)

### Remote Access Tests
- [ ] **Fluid:** Jump Desktop Connect (My Computers sidebar) — PRIMARY
- [ ] SSH: `ssh jglit@<tailscale-ip>`
- [ ] RDP (fallback): Jump Desktop to `<tailscale-ip>:3389`
- [ ] Verify TradeStation visible and functional
- [ ] **Remove monitor — confirm headless Fluid access still works**

---

## Phase 7: Documentation

### Update CLAUDE.md
- [ ] Add PC2 to Tailscale network table
- [ ] Add JLDesktop2 Quick Reference section
- [ ] Update TradeStation device tracking

### Decommission VM2
- [ ] Verify PC2 stable for 24-48 hours
- [ ] Shutdown and delete VM2 from Mac Studio
- [ ] Remove VM2 from Tailscale network
- [ ] Update docs

---

## Key Differences from PC1

| Item | PC1 | PC2 |
|------|-----|-----|
| Hostname | JLDesktop | JLDesktop2 |
| Tailscale IP | 100.69.59.111 | TBD |
| Local IP | 192.168.4.45 | TBD |

---

## Emergency Rollback

If PC2 fails: Re-enable Windows VM 2 (100.117.154.92)
