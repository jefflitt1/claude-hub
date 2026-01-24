# System Monitor

Centralized monitoring for all L7 infrastructure systems.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Mac Studio    │     │   Windows VM    │     │  Raspberry Pi   │
│   (collector)   │────▶│  (TradeStation) │     │     (n8n)       │
│                 │     │                 │     │                 │
│  local metrics  │     │   SSH metrics   │     │   SSH metrics   │
└────────┬────────┘     └─────────────────┘     └─────────────────┘
         │
         ▼
    ┌─────────┐        ┌─────────┐
    │ Supabase│◀───────│  n8n    │
    │ metrics │        │ alerts  │
    └─────────┘        └────┬────┘
                            │
                            ▼
                      ┌──────────┐
                      │ Telegram │
                      │  alerts  │
                      └──────────┘
```

## Files

| File | Purpose |
|------|---------|
| `central_collector.py` | Runs on Mac, collects from all systems via SSH |
| `monitor_agent.py` | Universal agent for individual systems |
| `schema.sql` | Supabase database schema |
| `.env` | Configuration (copy from .env and fill in) |

## Setup

### 1. Create Supabase Tables

Run `schema.sql` in Supabase SQL Editor:
- Go to https://supabase.com/dashboard/project/donnmhbwhpjlmpnwgdqr/sql
- Paste contents of schema.sql
- Click "Run"

### 2. Configure Environment

Edit `.env`:
```bash
SUPABASE_URL=https://donnmhbwhpjlmpnwgdqr.supabase.co
SUPABASE_ANON_KEY=<your_anon_key>
TELEGRAM_BOT_TOKEN=<from_botfather>
TELEGRAM_CHAT_ID=<your_chat_id>
```

### 3. Install Dependencies

```bash
pip3 install psutil supabase requests
```

### 4. Test Collection

```bash
cd ~/Documents/Claude\ Code/claude-agents/projects/meta-tools/system-monitor
python3 central_collector.py
```

### 5. Enable Scheduled Monitoring

```bash
# Load the launchd service (runs every 5 minutes)
launchctl load ~/Library/LaunchAgents/com.l7.system-monitor.plist

# Check status
launchctl list | grep system-monitor

# View logs
tail -f /tmp/system-monitor.log
```

### 6. Stop Monitoring

```bash
launchctl unload ~/Library/LaunchAgents/com.l7.system-monitor.plist
```

## Systems Monitored

| System | Method | Services |
|--------|--------|----------|
| Mac Studio | Local | Docker, Ollama, Node |
| Windows VM1 | SSH (192.168.64.2) | TradeStation, ORPlat, ORCAL |
| Raspberry Pi | SSH | n8n, Docker, Node |

## Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| CPU | >90% | >95% |
| Memory | >85% | >95% |
| Disk | >80% | >90% |
| Service Down | - | Critical |
| System Offline | - | Critical |

## Adding New Systems

Edit `SYSTEMS` in `central_collector.py`:

```python
{
    'hostname': 'new-server',
    'display_name': 'New Server',
    'type': 'linux',
    'method': 'ssh',
    'ssh_user': 'admin',
    'ssh_host': '192.168.1.100',
    'services': ['nginx', 'postgres'],
}
```

## Troubleshooting

### SSH Connection Issues

```bash
# Test SSH manually
ssh jeff@192.168.64.2 "echo test"

# Check SSH agent
ssh-add -l
```

### Windows Metrics Failing

```bash
# Verify psutil on Windows
ssh jeff@192.168.64.2 "python -c \"import psutil; print(psutil.cpu_percent())\""
```

### Pi Not Accessible

The Pi must be on the local network and SSH must be enabled:
```bash
# Check if Pi responds
ping raspberrypi.local
ssh pi@raspberrypi.local
```
