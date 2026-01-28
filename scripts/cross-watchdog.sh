#!/bin/bash
#
# Cross-Device Watchdog Monitor
#
# Monitors the OTHER device and alerts via Telegram when unreachable.
# Zero dependencies beyond bash, curl, and ping.
#
# Usage:
#   WATCHDOG_DEVICE=mac-studio ./cross-watchdog.sh   # Mac Studio monitors Pi
#   WATCHDOG_DEVICE=pi ./cross-watchdog.sh            # Pi monitors Mac Studio
#
# Environment Variables:
#   WATCHDOG_DEVICE  - "mac-studio" or "pi" (required)
#   WATCHDOG_DRY_RUN - set to "1" to skip Telegram alerts (optional)
#
# Deploy:
#   Mac Studio: /Users/jgl/.claude/scripts/cross-watchdog.sh (LaunchAgent, every 5 min)
#   Pi:         /opt/scripts/cross-watchdog.sh (cron, every 5 min)

set -euo pipefail

# --- Configuration ---
TELEGRAM_BOT_TOKEN="8169830247:AAF_BStYa7AqKPbHCeErAl2oij17d7cJhyI"
TELEGRAM_CHAT_ID="7938188628"

PI_IP="100.77.124.12"
STUDIO_IP="100.67.99.120"

# Cooldown: don't re-alert for same issue within this window (seconds)
COOLDOWN_SECONDS=900  # 15 minutes

# State file location (device-specific)
if [ "${WATCHDOG_DEVICE:-}" = "mac-studio" ]; then
    STATE_DIR="/Users/jgl/.claude/logs"
elif [ "${WATCHDOG_DEVICE:-}" = "pi" ]; then
    STATE_DIR="/var/log"
else
    echo "ERROR: Set WATCHDOG_DEVICE to 'mac-studio' or 'pi'"
    exit 1
fi
STATE_FILE="${STATE_DIR}/watchdog-state.json"

# --- Functions ---

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

send_telegram() {
    local message="$1"
    if [ "${WATCHDOG_DRY_RUN:-}" = "1" ]; then
        log "DRY RUN: Would send Telegram: $message"
        return 0
    fi
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -d "chat_id=${TELEGRAM_CHAT_ID}" \
        -d "text=${message}" \
        -d "parse_mode=HTML" \
        > /dev/null 2>&1
}

check_ping() {
    local host="$1"
    ping -c 1 -W 5 "$host" > /dev/null 2>&1
}

check_http() {
    local url="$1"
    local timeout="${2:-10}"
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout "$timeout" --max-time "$timeout" "$url" 2>/dev/null || echo "000")
    [ "$http_code" -ge 200 ] && [ "$http_code" -lt 500 ] 2>/dev/null
}

# Read last alert time for a given check key from state file
get_last_alert_time() {
    local key="$1"
    if [ -f "$STATE_FILE" ]; then
        grep "^${key}=" "$STATE_FILE" 2>/dev/null | cut -d= -f2 || echo "0"
    else
        echo "0"
    fi
}

# Write alert time for a given check key to state file
set_last_alert_time() {
    local key="$1"
    local timestamp="$2"
    mkdir -p "$(dirname "$STATE_FILE")"
    if [ -f "$STATE_FILE" ]; then
        # Remove old entry, add new
        grep -v "^${key}=" "$STATE_FILE" > "${STATE_FILE}.tmp" 2>/dev/null || true
        echo "${key}=${timestamp}" >> "${STATE_FILE}.tmp"
        mv "${STATE_FILE}.tmp" "$STATE_FILE"
    else
        echo "${key}=${timestamp}" > "$STATE_FILE"
    fi
}

# Check if we should alert (respects cooldown)
should_alert() {
    local key="$1"
    local now
    now=$(date +%s)
    local last
    last=$(get_last_alert_time "$key")
    local diff=$((now - last))
    [ "$diff" -ge "$COOLDOWN_SECONDS" ]
}

# Clear alert state (for recovery notifications)
clear_alert() {
    local key="$1"
    set_last_alert_time "$key" "0"
}

# Check if a service was previously down (last alert time > 0)
was_down() {
    local key="$1"
    local last
    last=$(get_last_alert_time "$key")
    [ "$last" -gt 0 ] 2>/dev/null
}

# Run a check, alert on failure, notify on recovery
run_check() {
    local name="$1"
    local check_type="$2"  # "ping" or "http"
    local target="$3"
    local key
    key=$(echo "$name" | tr ' ' '_' | tr '[:upper:]' '[:lower:]')

    local success=false
    if [ "$check_type" = "ping" ]; then
        check_ping "$target" && success=true
    elif [ "$check_type" = "http" ]; then
        check_http "$target" && success=true
    fi

    if [ "$success" = true ]; then
        # Service is UP
        if was_down "$key"; then
            log "RECOVERED: $name"
            send_telegram "$(printf '\xe2\x9c\x85') <b>RECOVERED:</b> $name is back online"
            clear_alert "$key"
        else
            log "OK: $name"
        fi
    else
        # Service is DOWN
        log "DOWN: $name ($target)"
        if should_alert "$key"; then
            send_telegram "$(printf '\xf0\x9f\x94\xb4') <b>DOWN:</b> $name unreachable
Target: <code>$target</code>
Source: ${WATCHDOG_DEVICE}
Time: $(date '+%Y-%m-%d %H:%M:%S')"
            set_last_alert_time "$key" "$(date +%s)"
        else
            log "  (cooldown active, skipping alert)"
        fi
    fi
}

# --- Main ---

log "Cross-watchdog starting (device=${WATCHDOG_DEVICE})"

if [ "$WATCHDOG_DEVICE" = "mac-studio" ]; then
    # Mac Studio monitors Pi
    log "Monitoring Pi ($PI_IP)..."

    run_check "Pi Network"     "ping" "$PI_IP"
    run_check "Pi n8n"         "http" "http://${PI_IP}:5678/healthz"
    run_check "Pi Beszel Hub"  "http" "http://${PI_IP}:8090"
    run_check "Pi Uptime Kuma" "http" "http://${PI_IP}:3001"

elif [ "$WATCHDOG_DEVICE" = "pi" ]; then
    # Pi monitors Mac Studio
    log "Monitoring Mac Studio ($STUDIO_IP)..."

    run_check "Studio Network"     "ping" "$STUDIO_IP"
    run_check "Studio Ollama"      "http" "http://${STUDIO_IP}:11434/api/tags"
    run_check "Studio Beszel Hub"  "http" "http://${STUDIO_IP}:8090"
    run_check "Studio Uptime Kuma" "http" "http://${STUDIO_IP}:3001"
fi

log "Cross-watchdog complete"
