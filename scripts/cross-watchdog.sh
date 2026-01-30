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

set -eu

# --- Configuration ---
TELEGRAM_BOT_TOKEN="8169830247:AAF_BStYa7AqKPbHCeErAl2oij17d7cJhyI"
TELEGRAM_CHAT_ID="7938188628"

PI_IP="100.77.124.12"
STUDIO_IP="100.67.99.120"

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

# --- Auto-Fix Commands ---
# Maps check key to restart command (bash associative arrays not available on all systems, use case)
get_fix_command() {
    local key="$1"
    case "$key" in
        pi_n8n)           echo "ssh root@${PI_IP} 'docker restart n8n'" ;;
        pi_beszel_hub)    echo "ssh root@${PI_IP} 'docker restart beszel'" ;;
        pi_uptime_kuma)   echo "ssh root@${PI_IP} 'docker restart uptime-kuma'" ;;
        studio_ollama)    echo "ssh jgl@${STUDIO_IP} 'brew services restart ollama'" ;;
        studio_beszel_hub) echo "ssh jgl@${STUDIO_IP} 'source ~/.zshrc; docker restart beszel'" ;;
        studio_uptime_kuma) echo "ssh jgl@${STUDIO_IP} 'source ~/.zshrc; docker restart uptime-kuma'" ;;
        *)                echo "" ;;  # No auto-fix for ping checks
    esac
}

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

# Get the stored state for a check key ("up", "down", or "" if unknown)
get_state() {
    local key="$1"
    if [ -f "$STATE_FILE" ]; then
        grep "^${key}=" "$STATE_FILE" 2>/dev/null | cut -d= -f2 || echo ""
    else
        echo ""
    fi
}

# Store the state for a check key
set_state() {
    local key="$1"
    local state="$2"
    mkdir -p "$(dirname "$STATE_FILE")"
    if [ -f "$STATE_FILE" ]; then
        grep -v "^${key}=" "$STATE_FILE" > "${STATE_FILE}.tmp" 2>/dev/null || true
        echo "${key}=${state}" >> "${STATE_FILE}.tmp"
        mv "${STATE_FILE}.tmp" "$STATE_FILE"
    else
        echo "${key}=${state}" > "$STATE_FILE"
    fi
}

# Attempt auto-fix for a service, return 0 if fix succeeded
attempt_auto_fix() {
    local name="$1"
    local check_type="$2"
    local target="$3"
    local key="$4"

    local fix_cmd
    fix_cmd=$(get_fix_command "$key")

    if [ -z "$fix_cmd" ]; then
        log "AUTO-FIX: No fix command for $name"
        return 1
    fi

    log "AUTO-FIX: Attempting restart for $name: $fix_cmd"
    if eval "$fix_cmd" > /dev/null 2>&1; then
        log "AUTO-FIX: Command executed, waiting 30s for recovery..."
        sleep 30

        # Re-check the service
        local recovered=false
        if [ "$check_type" = "ping" ]; then
            check_ping "$target" && recovered=true
        elif [ "$check_type" = "http" ]; then
            check_http "$target" && recovered=true
        fi

        if [ "$recovered" = true ]; then
            log "AUTO-FIX: $name recovered after restart"
            return 0
        else
            log "AUTO-FIX: $name still down after restart"
            return 1
        fi
    else
        log "AUTO-FIX: Command failed for $name"
        return 1
    fi
}

# Run a check, attempt auto-fix on failure, alert only if fix fails
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

    local prev_state
    prev_state=$(get_state "$key")

    if [ "$success" = true ]; then
        # Service is UP
        if [ "$prev_state" = "down" ]; then
            log "RECOVERED: $name"
            send_telegram "$(printf '\xe2\x9c\x85') <b>RECOVERED:</b> $name is back online
Source: ${WATCHDOG_DEVICE}
Time: $(date '+%Y-%m-%d %H:%M:%S')"
        else
            log "OK: $name"
        fi
        set_state "$key" "up"
    else
        # Service is DOWN - attempt auto-fix before alerting
        if [ "$prev_state" != "down" ]; then
            # First detection: try auto-fix
            if attempt_auto_fix "$name" "$check_type" "$target" "$key"; then
                # Auto-fix worked! Log silently, no Telegram needed
                log "AUTO-HEALED: $name (Jeff never knows)"
                set_state "$key" "up"
            else
                # Auto-fix failed or unavailable - alert Jeff
                local fix_cmd
                fix_cmd=$(get_fix_command "$key")
                local tried_msg=""
                if [ -n "$fix_cmd" ]; then
                    tried_msg="
Tried: <code>${fix_cmd}</code> (failed)"
                fi
                log "DOWN: $name ($target) -- auto-fix failed, ALERTING"
                send_telegram "$(printf '\xf0\x9f\x94\xb4') <b>DOWN:</b> $name unreachable
Target: <code>$target</code>
Source: ${WATCHDOG_DEVICE}${tried_msg}
Time: $(date '+%Y-%m-%d %H:%M:%S')"
                set_state "$key" "down"
            fi
        else
            # Already known to be down, stay silent
            log "DOWN: $name ($target) (still down, no re-alert)"
        fi
    fi
}

# --- Main ---

log "Cross-watchdog starting (device=${WATCHDOG_DEVICE})"

if [ "$WATCHDOG_DEVICE" = "mac-studio" ]; then
    # Mac Studio monitors Pi
    log "Monitoring Pi ($PI_IP)..."

    run_check "Pi Network"     "ping" "$PI_IP"
    run_check "Pi n8n"         "http" "https://n8n.l7-partners.com"
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
