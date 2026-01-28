#!/bin/bash
#
# Setup Uptime Kuma Monitors on Mac Studio Instance
#
# This mirrors the Pi Kuma monitors but runs on Mac Studio (:3001)
# so monitoring survives Pi outages.
#
# Prerequisites:
#   1. Deploy Kuma on Mac Studio:
#      docker run -d --name uptime-kuma --restart unless-stopped \
#        -p 3001:3001 -v uptime-kuma-data:/app/data louislam/uptime-kuma:1
#   2. Create admin account (jglittell@gmail.com)
#   3. Configure Telegram notification:
#      - Bot Token: 8169830247:AAF_BStYa7AqKPbHCeErAl2oij17d7cJhyI
#      - Chat ID: 7938188628
#   4. Go to Settings -> API Keys -> Create API Key
#   5. Run: ./setup-studio-kuma.sh YOUR_API_KEY
#

KUMA_URL="http://100.67.99.120:3001"
API_KEY="$1"

if [ -z "$API_KEY" ]; then
    echo "Usage: $0 YOUR_KUMA_API_KEY"
    echo ""
    echo "Get your API key from: ${KUMA_URL}/settings/api-keys"
    exit 1
fi

# Function to add a monitor
add_monitor() {
    local name="$1"
    local url="$2"
    local type="${3:-http}"
    local interval="${4:-60}"

    echo "Adding monitor: $name ($url)..."

    curl -s -X POST "${KUMA_URL}/api/monitors" \
        -H "Authorization: Bearer ${API_KEY}" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"${name}\",
            \"type\": \"${type}\",
            \"url\": \"${url}\",
            \"interval\": ${interval},
            \"retryInterval\": 30,
            \"maxretries\": 3,
            \"accepted_statuscodes\": [\"200-299\"],
            \"active\": true
        }" | jq -r '.msg // .error // "OK"'
}

echo "=========================================="
echo "  Mac Studio Uptime Kuma - Monitor Setup"
echo "=========================================="
echo ""
echo "Kuma URL: ${KUMA_URL}"
echo ""

# --- Pi Services (Tailscale) ---
echo "--- Pi Services (Tailscale) ---"
add_monitor "[Pi] n8n"              "http://100.77.124.12:5678/healthz"
add_monitor "[Pi] Beszel Hub"       "http://100.77.124.12:8090"
add_monitor "[Pi] Uptime Kuma"      "http://100.77.124.12:3001"

# --- Mac Studio Services (local/Tailscale) ---
echo ""
echo "--- Mac Studio Services ---"
add_monitor "[Studio] Ollama API"   "http://100.67.99.120:11434/api/tags"
add_monitor "[Studio] Beszel Hub"   "http://100.67.99.120:8090"

# --- Public Services (Cloudflare Tunnel - Pi) ---
echo ""
echo "--- Public Services (Pi Tunnel) ---"
add_monitor "n8n (public)"          "https://n8n.l7-partners.com"
add_monitor "Webhooks"              "https://webhooks.l7-partners.com"
add_monitor "Kuma (public)"         "https://kuma.l7-partners.com"

# --- Public Services (Cloudflare Tunnel - Studio) ---
echo ""
echo "--- Public Services (Studio Tunnel) ---"
add_monitor "Chat (Open WebUI)"     "https://chat.l7-partners.com"

# --- Netlify Sites ---
echo ""
echo "--- Netlify Sites ---"
add_monitor "L7 Partners (main)"    "https://l7-partners.com"
add_monitor "Claude Hub"            "https://claude.l7-partners.com"
add_monitor "JGL Capital"           "https://jglcap.l7-partners.com"
add_monitor "Admin Portal"          "https://admin.l7-partners.com"
add_monitor "191 E 2nd"             "https://191.l7-partners.com"

echo ""
echo "=========================================="
echo "  Setup complete!"
echo "  Check ${KUMA_URL} for monitor status."
echo ""
echo "  Don't forget to:"
echo "  1. Configure Telegram notification in Kuma UI"
echo "  2. Apply Telegram notification to all monitors"
echo "=========================================="
