#!/usr/bin/env python3
"""
Central System Collector
Runs on Mac Studio, collects metrics from all systems via SSH, and reports to Supabase.
"""

import os
import sys
import json
import subprocess
import socket
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

try:
    from supabase import create_client
    HAS_SUPABASE = True
except ImportError:
    HAS_SUPABASE = False

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

# Load .env file if present
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ.setdefault(key.strip(), value.strip())

# Configuration
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://donnmhbwhpjlmpnwgdqr.supabase.co')
SUPABASE_KEY = os.environ.get('SUPABASE_ANON_KEY', os.environ.get('SUPABASE_SERVICE_ROLE_KEY', ''))
N8N_WEBHOOK_URL = os.environ.get('N8N_ALERT_WEBHOOK', '')
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID', '')

# Systems to monitor
SYSTEMS = [
    {
        'hostname': 'Jeffs-Mac-Studio',
        'display_name': 'Mac Studio',
        'type': 'mac',
        'method': 'local',
        'services': ['Docker', 'Ollama', 'node'],
    },
    {
        'hostname': 'WIN-FIUHCFK9UL6',
        'display_name': 'Windows VM1 (TradeStation)',
        'type': 'windows',
        'method': 'ssh',
        'ssh_user': 'jeff',
        'ssh_host': '192.168.64.2',
        'services': ['TradeStation', 'ORPlat', 'ORCAL'],
    },
    {
        'hostname': 'raspberrypi',
        'display_name': 'Raspberry Pi (n8n)',
        'type': 'linux',
        'method': 'ssh',
        'ssh_user': 'pi',
        'ssh_host': 'raspberrypi.local',  # Update with actual IP when on network
        'services': ['n8n', 'docker', 'node'],
    },
]


def run_ssh_command(host, user, command, timeout=30):
    """Execute command on remote host via SSH."""
    try:
        result = subprocess.run(
            ['ssh', '-o', 'ConnectTimeout=10', '-o', 'StrictHostKeyChecking=no',
             f'{user}@{host}', command],
            capture_output=True,
            text=True,
            timeout=timeout
        )
        return result.stdout.strip(), result.returncode == 0
    except subprocess.TimeoutExpired:
        return "Timeout", False
    except Exception as e:
        return str(e), False


def collect_local_metrics():
    """Collect metrics from local Mac."""
    if not HAS_PSUTIL:
        return None

    metrics = {
        'hostname': socket.gethostname(),
        'timestamp': datetime.utcnow().isoformat(),
        'system_type': 'mac',
        'status': 'online',
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

    # Load
    try:
        load = os.getloadavg()
        metrics['load_avg_1m'] = round(load[0], 2)
        metrics['load_avg_5m'] = round(load[1], 2)
        metrics['load_avg_15m'] = round(load[2], 2)
    except:
        pass

    # Uptime
    metrics['uptime_seconds'] = int(datetime.now().timestamp() - psutil.boot_time())
    metrics['process_count'] = len(psutil.pids())

    return metrics


def collect_windows_metrics(system):
    """Collect metrics from Windows VM via SSH."""
    host = system['ssh_host']
    user = system['ssh_user']

    # Simple Python command with short keys to avoid SSH escaping issues
    python_cmd = "python -c \"import json,psutil;m=psutil.virtual_memory();d=psutil.disk_usage('C:/');print(json.dumps({'c':psutil.cpu_percent(interval=1),'m':m.percent,'mu':round(m.used/(1024**3),2),'mt':round(m.total/(1024**3),2),'d':d.percent,'du':round(d.used/(1024**3),2),'dt':round(d.total/(1024**3),2),'p':len(psutil.pids())}))\""

    output, success = run_ssh_command(host, user, python_cmd)

    if success:
        try:
            data = json.loads(output)
            # Map short keys to full names (for SSH escaping simplicity)
            metrics = {
                'hostname': system['hostname'],
                'timestamp': datetime.utcnow().isoformat(),
                'system_type': 'windows',
                'status': 'online',
                'cpu_percent': data.get('c', data.get('cpu_percent')),
                'memory_percent': data.get('m', data.get('memory_percent')),
                'memory_used_gb': data.get('mu', data.get('memory_used_gb')),
                'memory_total_gb': data.get('mt', data.get('memory_total_gb')),
                'disk_percent': data.get('d', data.get('disk_percent')),
                'disk_used_gb': data.get('du', data.get('disk_used_gb')),
                'disk_total_gb': data.get('dt', data.get('disk_total_gb')),
                'process_count': data.get('p', data.get('process_count')),
            }
            return metrics
        except json.JSONDecodeError:
            pass

    return {
        'hostname': system['hostname'],
        'timestamp': datetime.utcnow().isoformat(),
        'system_type': 'windows',
        'status': 'offline',
        'error': output if not success else 'Parse error',
    }


def collect_linux_metrics(system):
    """Collect metrics from Linux/Pi via SSH."""
    host = system['ssh_host']
    user = system['ssh_user']

    # Simple shell commands that work without psutil
    cmd = '''
    echo "{
        \\"cpu_percent\\": $(top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1 || echo 0),
        \\"memory_percent\\": $(free | grep Mem | awk '{printf \\"%.1f\\", $3/$2 * 100}'),
        \\"disk_percent\\": $(df / | tail -1 | awk '{print $5}' | tr -d '%'),
        \\"uptime_seconds\\": $(cat /proc/uptime | awk '{print int($1)}')
    }"
    '''

    output, success = run_ssh_command(host, user, cmd)

    if success:
        try:
            metrics = json.loads(output)
            metrics['hostname'] = system['hostname']
            metrics['timestamp'] = datetime.utcnow().isoformat()
            metrics['system_type'] = system['type']
            metrics['status'] = 'online'
            return metrics
        except:
            pass

    # Fallback - just check if SSH works
    ping_output, ping_success = run_ssh_command(host, user, 'echo online')

    return {
        'hostname': system['hostname'],
        'timestamp': datetime.utcnow().isoformat(),
        'system_type': system['type'],
        'status': 'online' if ping_success else 'offline',
        'error': None if ping_success else 'SSH connection failed',
    }


def collect_service_status(system, metrics):
    """Check service status on a system."""
    services = []

    if system['method'] == 'local':
        # Local Mac - use psutil
        if HAS_PSUTIL:
            for svc_name in system.get('services', []):
                is_running = False
                for proc in psutil.process_iter(['name']):
                    try:
                        if svc_name.lower() in proc.info['name'].lower():
                            is_running = True
                            break
                    except:
                        continue
                services.append({
                    'service_name': svc_name,
                    'is_running': is_running,
                })
    elif system['type'] == 'windows':
        # Windows via SSH
        host = system['ssh_host']
        user = system['ssh_user']
        for svc_name in system.get('services', []):
            cmd = f'powershell -Command "Get-Process {svc_name} -ErrorAction SilentlyContinue | Select-Object -First 1 Name"'
            output, success = run_ssh_command(host, user, cmd)
            services.append({
                'service_name': svc_name,
                'is_running': bool(output and svc_name.lower() in output.lower()),
            })
    else:
        # Linux via SSH
        host = system['ssh_host']
        user = system['ssh_user']
        for svc_name in system.get('services', []):
            cmd = f'pgrep -x {svc_name} >/dev/null && echo running || echo stopped'
            output, success = run_ssh_command(host, user, cmd)
            services.append({
                'service_name': svc_name,
                'is_running': 'running' in output.lower(),
            })

    return services


def check_alerts(all_metrics):
    """Check all metrics for alert conditions."""
    alerts = []

    for system_data in all_metrics:
        metrics = system_data['metrics']
        services = system_data.get('services', [])
        hostname = metrics.get('hostname', 'unknown')

        # System offline
        if metrics.get('status') == 'offline':
            alerts.append({
                'hostname': hostname,
                'type': 'system_offline',
                'severity': 'critical',
                'message': f"🔴 {hostname} is OFFLINE",
            })
            continue

        # CPU alert
        cpu = metrics.get('cpu_percent')
        if cpu and float(cpu) > 90:
            alerts.append({
                'hostname': hostname,
                'type': 'high_cpu',
                'severity': 'critical' if float(cpu) > 95 else 'warning',
                'message': f"⚠️ High CPU on {hostname}: {cpu}%",
                'value': cpu,
            })

        # Memory alert
        mem = metrics.get('memory_percent')
        if mem and float(mem) > 85:
            alerts.append({
                'hostname': hostname,
                'type': 'high_memory',
                'severity': 'critical' if float(mem) > 95 else 'warning',
                'message': f"⚠️ High Memory on {hostname}: {mem}%",
                'value': mem,
            })

        # Disk alert
        disk = metrics.get('disk_percent')
        if disk and float(disk) > 80:
            alerts.append({
                'hostname': hostname,
                'type': 'disk_space',
                'severity': 'critical' if float(disk) > 90 else 'warning',
                'message': f"💾 Low Disk Space on {hostname}: {disk}%",
                'value': disk,
            })

        # Service alerts
        for svc in services:
            if not svc['is_running']:
                alerts.append({
                    'hostname': hostname,
                    'type': 'service_down',
                    'severity': 'critical',
                    'message': f"🔴 {svc['service_name']} is DOWN on {hostname}",
                    'service': svc['service_name'],
                })

    return alerts


def send_telegram_alert(message):
    """Send alert via Telegram."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return False

    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        response = requests.post(url, json={
            'chat_id': TELEGRAM_CHAT_ID,
            'text': message,
            'parse_mode': 'HTML',
        }, timeout=10)
        return response.status_code == 200
    except Exception as e:
        print(f"Telegram error: {e}")
        return False


def send_to_supabase(all_metrics):
    """Store metrics in Supabase."""
    if not HAS_SUPABASE or not SUPABASE_KEY:
        return False

    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

        for system_data in all_metrics:
            metrics = system_data['metrics']
            # Insert metrics
            supabase.table('system_metrics').insert({
                'hostname': metrics['hostname'],
                'timestamp': metrics['timestamp'],
                'cpu_percent': metrics.get('cpu_percent'),
                'memory_percent': metrics.get('memory_percent'),
                'memory_used_gb': metrics.get('memory_used_gb'),
                'memory_total_gb': metrics.get('memory_total_gb'),
                'disk_percent': metrics.get('disk_percent'),
                'disk_used_gb': metrics.get('disk_used_gb'),
                'disk_total_gb': metrics.get('disk_total_gb'),
                'uptime_seconds': metrics.get('uptime_seconds'),
                'process_count': metrics.get('process_count'),
                'extra_data': {'status': metrics.get('status')},
            }).execute()

        return True
    except Exception as e:
        print(f"Supabase error: {e}")
        return False


def format_summary(all_metrics, alerts):
    """Format a summary for display."""
    lines = [
        "=" * 60,
        f"SYSTEM MONITOR - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "=" * 60,
    ]

    for system_data in all_metrics:
        m = system_data['metrics']
        services = system_data.get('services', [])
        status_icon = "🟢" if m.get('status') == 'online' else "🔴"

        lines.append(f"\n{status_icon} {m.get('hostname', 'Unknown')} ({m.get('system_type', '')})")
        lines.append("-" * 40)

        if m.get('status') == 'online':
            lines.append(f"  CPU: {m.get('cpu_percent', 'N/A')}%")
            lines.append(f"  Memory: {m.get('memory_percent', 'N/A')}% ({m.get('memory_used_gb', '?')}/{m.get('memory_total_gb', '?')} GB)")
            lines.append(f"  Disk: {m.get('disk_percent', 'N/A')}%")

            if services:
                svc_status = []
                for svc in services:
                    icon = "✓" if svc['is_running'] else "✗"
                    svc_status.append(f"{icon} {svc['service_name']}")
                lines.append(f"  Services: {', '.join(svc_status)}")
        else:
            lines.append(f"  Status: OFFLINE")
            if m.get('error'):
                lines.append(f"  Error: {m.get('error')}")

    if alerts:
        lines.append(f"\n{'!'*60}")
        lines.append(f"ALERTS ({len(alerts)}):")
        for alert in alerts:
            lines.append(f"  [{alert['severity'].upper()}] {alert['message']}")

    lines.append("\n" + "=" * 60)
    return "\n".join(lines)


def collect_all():
    """Collect metrics from all systems."""
    all_metrics = []

    for system in SYSTEMS:
        print(f"Collecting from {system['display_name']}...", end=" ", flush=True)

        if system['method'] == 'local':
            metrics = collect_local_metrics()
        elif system['type'] == 'windows':
            metrics = collect_windows_metrics(system)
        else:
            metrics = collect_linux_metrics(system)

        services = collect_service_status(system, metrics) if metrics else []

        all_metrics.append({
            'system': system,
            'metrics': metrics or {'hostname': system['hostname'], 'status': 'error'},
            'services': services,
        })

        status = "✓" if metrics and metrics.get('status') == 'online' else "✗"
        print(status)

    return all_metrics


def main():
    """Main entry point."""
    print("Starting system collection...\n")

    # Collect from all systems
    all_metrics = collect_all()

    # Check for alerts
    alerts = check_alerts(all_metrics)

    # Print summary
    summary = format_summary(all_metrics, alerts)
    print(summary)

    # Send to Supabase
    if HAS_SUPABASE and SUPABASE_KEY:
        print("\nSending to Supabase...", end=" ")
        if send_to_supabase(all_metrics):
            print("✓")
        else:
            print("✗")

    # Send alerts via Telegram
    if alerts and TELEGRAM_BOT_TOKEN:
        alert_msg = "🚨 <b>System Alert</b>\n\n"
        for alert in alerts:
            alert_msg += f"• {alert['message']}\n"
        send_telegram_alert(alert_msg)

    # Return data for potential webhook/API use
    return {
        'timestamp': datetime.utcnow().isoformat(),
        'systems': all_metrics,
        'alerts': alerts,
        'summary': summary,
    }


if __name__ == '__main__':
    result = main()
    if '--json' in sys.argv:
        print(json.dumps(result, default=str, indent=2))
