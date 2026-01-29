# Decommissioned Devices Registry

Track retired hardware and migration details for reference.

---

## JLDesktop (Windows 11 Pro PC)

**Decommissioned:** 2026-01-28
**Migration Lead:** Claude Code IT Agent

### Hardware Specs
| Component | Details |
|-----------|---------|
| Model | Dell XPS 8940 |
| CPU | Intel Core i5-10400 (6-core, 12-thread) |
| RAM | 16 GB |
| GPU | NVIDIA GeForce GTX 1660 Ti |
| Storage | C: (OS) + D: (Data) |
| Network | 192.168.4.45 (local IP) |

### Operating System
| Property | Value |
|----------|-------|
| OS | Windows 11 Pro (Insider Build 26200) |
| License Type | RETAIL (transferable) |
| Product Key | H7XCQ-KNDBQ-HB6WT-PM4WY-X4R9G |
| OEM Key | HQN4V-HWBRB-KKM8P-YJG4D-YBHX3 (hardware-locked, do not use) |

### Installed Software (Pre-Decommission)
- TradeStation 10.0
- TradeStation 9.5
- MultiCharts64
- Portfolio Maestro

### Files Migrated to Mac

**Archive Location:** `~/Desktop/JLDesktop-Archive/`

| Folder | Size | Contents |
|--------|------|----------|
| Investing/ | 1.1 GB | IBD screenshots, ELD strategy exports, trading notes |
| pMaestroKit/ | 19 MB | Portfolio Maestro kit files |
| Properties/ | 5.4 MB | L7 property PDFs |
| Photos/ | 108 KB | L7 branding images |
| TradeStation-Workspaces-Archive/ | 114 MB | 146 TS workspaces from D: drive |

**Total Transferred:** ~1.25 GB

### Data Deleted (Pre-Decommission)
| Item | Size | Reason |
|------|------|--------|
| D:\Market Snapshots | 3.2 GB | Outdated charts |
| D:\Evernote | 4 GB | Archived elsewhere |
| D:\Spotify | 70 MB | Streaming service |
| Desktop\roms | 268 MB | Personal files |
| D:\Tradestation Files\Desktop Backups | 435 GB | Auto-backup bloat (.tsa files) |

**Total Freed:** ~443 GB

### Remaining on System (Not Migrated)
- MultiCharts folders (D:\MC, MCDatabases, MCStudies) - kept for potential VM use
- TradeStation 10.0 installation files
- Windows system files

### Access Credentials
| Type | Details |
|------|---------|
| SSH | Administrator@192.168.4.45 (password: MyPass99) |
| SSH Key | Configured on Mac for passwordless access |
| RDP | Not configured |

### Migration to VMs

**Replacement Strategy:**
- Mac Studio Windows VM 1 (100.95.217.59) - Primary TradeStation
- Mac Studio Windows VM 2 (100.117.154.92) - Backup/failover

**Windows License Transfer:**
- RETAIL key (H7XCQ-...) can be transferred to VM
- Activate on primary VM after decommission

### TradeStation Workspaces

**Archive Format:** 146 `.TSW` workspace files
**Backup Location:** `~/Desktop/JLDesktop-Archive/TradeStation-Workspaces-Archive/`
**VM Import Plan:** Copy to Windows VM and import via TS File menu

### Decommission Checklist

- [ ] Sign out of TradeStation 10.0
- [ ] Sign out of TradeStation 9.5
- [ ] Clear browser saved passwords
- [ ] Sign out of Windows Store
- [ ] Export any additional software licenses
- [ ] Verify all files readable on Mac
- [ ] Remove from network (if in Tailscale)
- [ ] Document any special Windows settings
- [ ] Capture final program list
- [ ] Power down and store/repurpose

### Replacement VM Setup

**To replicate JLDesktop environment on VM:**
1. Install Windows 11 Pro using RETAIL key
2. Install TradeStation 10.0
3. Copy workspace archive to VM
4. Import workspaces via TradeStation
5. Install MultiCharts64 (if needed)
6. Configure Tailscale for remote access

### Notes
- This PC served as primary trading workstation before Mac Studio VMs
- GTX 1660 Ti GPU not needed for VM trading (software-based charts)
- MultiCharts files kept in archive for potential future use
- All critical trading data backed up independently

---

## Template for Future Decommissions

```markdown
## [Device Name]

**Decommissioned:** YYYY-MM-DD
**Migration Lead:** [Who handled it]

### Hardware Specs
- Model:
- CPU:
- RAM:
- Storage:
- Network:

### Operating System
- OS:
- License:
- Product Key:

### Files Migrated
- Location:
- Size:
- Contents:

### Replacement Strategy
- New device/VM:
- Migration plan:

### Decommission Checklist
- [ ] Sign out of accounts
- [ ] Export licenses
- [ ] Verify data transfer
- [ ] Remove from networks
- [ ] Document special configs
- [ ] Power down

### Notes
[Any special considerations]
```
