# Decommissioned Devices Registry

Track retired hardware and migration details for reference.

---

## JLDesktop (Windows 11 Pro PC)

**Decommissioned:** 2026-01-28 → **RECOMMISSIONED:** 2026-01-29 as PC1 (TradeStation workstation)
**Current Config:** See `JLDesktop-PC1-verified-config.md`
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

### Migration History

**Original plan (2026-01-21):** Replace with Mac Studio Windows VMs (UTM)
- VM 1 (100.95.217.59) and VM 2 (100.117.154.92) were created
- VMs proved suboptimal for 24/7 trading (ARM translation overhead, VM management complexity)

**Final outcome (2026-01-29):** Recommissioned as JLDesktop PC1 — dedicated physical hardware
- See `JLDesktop-PC1-verified-config.md` for current configuration
- VMs decommissioned and UTM deleted from Mac Studio (2026-01-30)

### TradeStation Workspaces

**Archive Format:** 146 `.TSW` workspace files
**Backup Location:** `~/Desktop/JLDesktop-Archive/TradeStation-Workspaces-Archive/`

### Notes
- PC went through decommission → VM replacement → recommission cycle (Jan 2026)
- Now the sole TradeStation/Windows machine in the infrastructure
- OEM Windows key (HQN4V-...) activated on this hardware
- RETAIL key (H7XCQ-...) available as spare (deactivated from VMs)

---

## Mac Studio Windows VMs (UTM)

**Decommissioned:** 2026-01-30
**Migration Lead:** Claude Code IT Agent

### VM Details
| VM | Tailscale IP | Purpose |
|----|--------------|---------|
| Windows VM 1 | 100.95.217.59 | TradeStation (primary) |
| Windows VM 2 | 100.117.154.92 | TradeStation (backup/failover) |

### Decommission Steps Completed
- [x] Windows product keys deactivated on both VMs (`slmgr /upk` + `slmgr /cpky`)
- [x] VMs removed from Tailscale network (2026-01-29)
- [x] VMs removed from Cloudflare (2026-01-29)
- [x] UTM app quit and deleted from Mac Studio
- [x] UTM preferences, caches, saved state cleaned
- [x] Mac Studio rebooted
- [x] All services verified healthy post-reboot (Ollama, Claude HTTP, iMsg bridge)

### What Remains
- 104KB of SIP-protected container stubs in `~/Library/Containers/com.utmapp.*` (inert, harmless)
- macOS `containermanagerd` prevents deletion even with sudo

### Replacement
JLDesktop (PC1) — Dell XPS 8940 dedicated hardware. See `JLDesktop-PC1-verified-config.md`.

### Reasons for Decommission
- Dedicated physical hardware (PC1) provides better native x86 performance
- Eliminates VM overhead, ARM translation, and UTM management
- More reliable for 24/7 trading operations
- Headless operation proven and tested on PC1

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
