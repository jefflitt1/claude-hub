#!/usr/bin/env python3
"""
Universal System Monitor Agent
Collects metrics and reports to Supabase for centralized monitoring.
Works on Mac, Windows, and Linux.
"""

import os
import sys
import json
import socket
import platform
import subprocess
from datetime import datetime
from pathlib import Path

# Optional imports with fallbacks
try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False
    print("Warning: psutil not installed. Install with: pip install psutil")

try:
    from supabase import create_client
    HAS_SUPABASE = True
except ImportError:
    HAS_SUPABASE = False
    print("Warning: supabase not installed. Install with: pip install supabase")

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

# Configuration
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://jbwmrqfbgvjivemkquao.supabase.co')
SUPABASE_KEY = os.environ.get('SUPABASE_ANON_KEY', '')
WEBHOOK_URL = os.environ.get('MONITOR_WEBHOOK_URL', '')  # n8n webhook for alerts

# Services to monitor per system type
SERVICES_CONFIG = {
    'mac': [
        {'name': 'Docker', 'process': 'Docker', 'type': 'process'},
        {'name': 'Claude Code MCP', 'process': 'node', 'contains': 'mcp', 'type': 'process'},
        {'name': 'Ollama', 'process': 'ollama', 'type': 'process'},
    ],
    'windows': [
        {'name': 'TradeStation', 'process': 'TradeStation', 'type': 'process'},
        {'name': 'ORPlat', 'process': 'ORPlat', 'type': 'process'},
        {'name': 'ORCAL', 'process': 'ORCAL', 'type': 'process'},
    ],
    'linux': [
        {'name': 'n8n', 'process': 'n8n', 'type': 'process'},
        {'name': 'Docker', 'process': 'docker', 'type': 'process'},
        {'name': 'Node', 'process': 'node', 'type': 'process'},
    ]
}


def get_system_type():
    """Detect system type."""
    system = platform.system().lower()
    if system == 'darwin':
        return 'mac'
    elif system == 'windows':
        return 'windows'
    else:
        # Check if Raspberry Pi
        try:
            with open('/proc/cpuinfo', 'r') as f:
                if 'raspberry' in f.read().lower():
                    return 'raspberry_pi'
        except:
            pass
        return 'linux'


def get_hostname():
    """Get system hostname."""
    return socket.gethostname()


def get_system_metrics():
    """Collect system metrics using psutil."""
    if not HAS_PSUTIL:
        return get_system_metrics_fallback()

    metrics = {
        'hostname': get_hostname(),
        'timestamp': datetime.utcnow().isoformat(),
        'system_type': get_system_type(),
    }

    # CPU
    metrics['cpu_percent'] = psutil.cpu_percent(interval=1)

    # Memory
    mem = psutil.virtual_memory()
    metrics['memory_percent'] = mem.percent
    metrics['memory_used_gb'] = round(mem.used / (1024**3), 2)
    metrics['memory_total_gb'] = round(mem.total / (1024**3), 2)

    # Disk
    disk = psutil.disk_usage('/')
    metrics['disk_percent'] = disk.percent
    metrics['disk_used_gb'] = round(disk.used / (1024**3), 2)
    metrics['disk_total_gb'] = round(disk.total / (1024**3), 2)

    # Load average (not available on Windows)
    try:
        load = os.getloadavg()
        metrics['load_avg_1m'] = round(load[0], 2)
        metrics['load_avg_5m'] = round(load[1], 2)
        metrics['load_avg_15m'] = round(load[2], 2)
    except (AttributeError, OSError):
        metrics['load_avg_1m'] = None
        metrics['load_avg_5m'] = None
        metrics['load_avg_15m'] = None

    # Uptime
    metrics['uptime_seconds'] = int(datetime.now().timestamp() - psutil.boot_time())

    # Process count
    metrics['process_count'] = len(psutil.pids())

    return metrics


def get_system_metrics_fallback():
    """Fallback metrics collection without psutil."""
    metrics = {
        'hostname': get_hostname(),
        'timestamp': datetime.utcnow().isoformat(),
        'system_type': get_system_type(),
    }

    system_type = get_system_type()

    if system_type == 'windows':
        # Windows fallback using wmic
        try:
            cpu = subprocess.check_output('wmic cpu get loadpercentage', shell=True).decode()
            metrics['cpu_percent'] = float(cpu.split('\n')[1].strip())
        except:
            metrics['cpu_percent'] = None
    else:
        # Unix fallback
        try:
            load = os.getloadavg()
            metrics['load_avg_1m'] = round(load[0], 2)
            # Estimate CPU percent from load avg
            cpu_count = os.cpu_count() or 1
            metrics['cpu_percent'] = round((load[0] / cpu_count) * 100, 2)
        except:
            metrics['cpu_percent'] = None

    return metrics


def get_service_status(services_config):
    """Check status of configured services."""
    if not HAS_PSUTIL:
        return []

    services = []
    system_type = get_system_type()
    config = services_config.get(system_type, [])

    for svc in config:
        status = {
            'hostname': get_hostname(),
            'service_name': svc['name'],
            'service_type': svc.get('type', 'process'),
            'is_running': False,
            'cpu_percent': None,
            'memory_mb': None,
            'last_checked': datetime.utcnow().isoformat(),
        }

        # Find matching process
        for proc in psutil.process_iter(['name', 'cmdline', 'cpu_percent', 'memory_info']):
            try:
                name = proc.info['name'].lower()
                cmdline = ' '.join(proc.info.get('cmdline') or []).lower()

                match = False
                if svc['process'].lower() in name:
                    match = True
                elif 'contains' in svc and svc['contains'].lower() in cmdline:
                    match = True

                if match:
                    status['is_running'] = True
                    status['cpu_percent'] = proc.info.get('cpu_percent')
                    mem = proc.info.get('memory_info')
                    if mem:
                        status['memory_mb'] = round(mem.rss / (1024**2), 2)
                    break
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

        services.append(status)

    return services


def get_backup_status():
    """Check backup status for TradeStation and other backups."""
    backups = []
    hostname = get_hostname()

    # TradeStation backups (Windows)
    ts_backup_paths = [
        Path(r'C:\Users\jeff\Desktop\TS Backups'),
        Path.home() / 'Desktop' / 'TS Backups',
    ]

    for backup_path in ts_backup_paths:
        if backup_path.exists():
            for f in backup_path.glob('*.tsa'):
                backups.append({
                    'hostname': hostname,
                    'backup_type': 'tradestation',
                    'backup_name': f.name,
                    'backup_path': str(f),
                    'size_bytes': f.stat().st_size,
                    'created_at': datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
                })

    return backups


def send_to_supabase(metrics, services, backups):
    """Send collected data to Supabase."""
    if not HAS_SUPABASE or not SUPABASE_KEY:
        print("Supabase not configured, printing locally:")
        print(json.dumps({'metrics': metrics, 'services': services}, indent=2))
        return False

    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

        # Insert metrics
        supabase.table('system_metrics').insert(metrics).execute()

        # Upsert service status
        for svc in services:
            supabase.table('service_status').upsert(
                svc,
                on_conflict='hostname,service_name'
            ).execute()

        # Update system registry last_seen
        supabase.table('system_registry').update({
            'last_seen': datetime.utcnow().isoformat(),
            'ip_address': get_local_ip()
        }).eq('hostname', metrics['hostname']).execute()

        print(f"[{datetime.now()}] Metrics sent successfully")
        return True
    except Exception as e:
        print(f"Error sending to Supabase: {e}")
        return False


def send_to_webhook(data):
    """Send data to n8n webhook for processing."""
    if not HAS_REQUESTS or not WEBHOOK_URL:
        return False

    try:
        response = requests.post(WEBHOOK_URL, json=data, timeout=10)
        return response.status_code == 200
    except Exception as e:
        print(f"Error sending to webhook: {e}")
        return False


def get_local_ip():
    """Get local IP address."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return None


def check_alerts(metrics, services):
    """Check metrics against thresholds and return alerts."""
    alerts = []

    # CPU alerts
    if metrics.get('cpu_percent') and metrics['cpu_percent'] > 90:
        alerts.append({
            'type': 'high_cpu',
            'severity': 'critical' if metrics['cpu_percent'] > 95 else 'warning',
            'message': f"CPU at {metrics['cpu_percent']}% on {metrics['hostname']}",
            'value': metrics['cpu_percent'],
        })

    # Memory alerts
    if metrics.get('memory_percent') and metrics['memory_percent'] > 85:
        alerts.append({
            'type': 'high_memory',
            'severity': 'critical' if metrics['memory_percent'] > 95 else 'warning',
            'message': f"Memory at {metrics['memory_percent']}% on {metrics['hostname']}",
            'value': metrics['memory_percent'],
        })

    # Disk alerts
    if metrics.get('disk_percent') and metrics['disk_percent'] > 80:
        alerts.append({
            'type': 'disk_space',
            'severity': 'critical' if metrics['disk_percent'] > 90 else 'warning',
            'message': f"Disk at {metrics['disk_percent']}% on {metrics['hostname']}",
            'value': metrics['disk_percent'],
        })

    # Service alerts
    for svc in services:
        if not svc['is_running']:
            alerts.append({
                'type': 'service_down',
                'severity': 'critical',
                'message': f"{svc['service_name']} is DOWN on {metrics['hostname']}",
                'service': svc['service_name'],
            })

    return alerts


def main():
    """Main monitoring loop."""
    print(f"System Monitor Agent starting on {get_hostname()} ({get_system_type()})")

    # Collect metrics
    metrics = get_system_metrics()
    services = get_service_status(SERVICES_CONFIG)
    backups = get_backup_status()

    # Check for alerts
    alerts = check_alerts(metrics, services)

    # Prepare payload
    payload = {
        'metrics': metrics,
        'services': services,
        'backups': backups,
        'alerts': alerts,
        'collected_at': datetime.utcnow().isoformat(),
    }

    # Send to Supabase
    send_to_supabase(metrics, services, backups)

    # Send to webhook if there are alerts
    if alerts:
        print(f"Alerts detected: {len(alerts)}")
        for alert in alerts:
            print(f"  [{alert['severity'].upper()}] {alert['message']}")
        send_to_webhook(payload)

    # Print summary
    print(f"CPU: {metrics.get('cpu_percent', 'N/A')}% | "
          f"Memory: {metrics.get('memory_percent', 'N/A')}% | "
          f"Disk: {metrics.get('disk_percent', 'N/A')}%")

    return payload


if __name__ == '__main__':
    result = main()
    if '--json' in sys.argv:
        print(json.dumps(result, indent=2))
