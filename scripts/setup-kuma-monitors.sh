#!/bin/bash
#
# Setup Uptime Kuma Monitors for L7 Subdomains
#
# Prerequisites:
#   1. Access https://kuma.l7-partners.com
#   2. Create admin account
#   3. Go to Settings → API Keys → Create API Key
#   4. Run: ./setup-kuma-monitors.sh YOUR_API_KEY
#

KUMA_URL="http://100.77.124.12:3001"
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

    echo "Adding monitor: $name ($url)..."

    curl -s -X POST "${KUMA_URL}/api/monitors" \
        -H "Authorization: Bearer ${API_KEY}" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"${name}\",
            \"type\": \"${type}\",
            \"url\": \"${url}\",
            \"interval\": 60,
            \"retryInterval\": 30,
            \"maxretries\": 3,
            \"accepted_statuscodes\": [\"200-299\"],
            \"active\": true
        }" | jq -r '.msg // .error // "OK"'
}

echo "Adding L7 Partners Subdomains to Uptime Kuma..."
echo ""

# Pi Services (Cloudflare Tunnel)
add_monitor "n8n" "https://n8n.l7-partners.com"
add_monitor "Metabase" "https://metabase.l7-partners.com"
add_monitor "Supabase Studio" "https://supabase.l7-partners.com"
add_monitor "Webhooks" "https://webhooks.l7-partners.com"

# Mac Studio Services (Cloudflare Tunnel)
add_monitor "Claude API" "https://claude-api.l7-partners.com"
add_monitor "Chat (Open WebUI)" "https://chat.l7-partners.com"
add_monitor "Ollama API" "https://ollama.l7-partners.com"

# Netlify Sites
add_monitor "L7 Partners (main)" "https://l7-partners.com"
add_monitor "Claude Hub" "https://claude.l7-partners.com"
add_monitor "JGL Capital" "https://jglcap.l7-partners.com"
add_monitor "Admin Portal" "https://admin.l7-partners.com"
add_monitor "191 E 2nd" "https://191.l7-partners.com"

# Internal Services (via Tailscale - only if running on Tailscale network)
add_monitor "[Internal] Claude HTTP" "http://100.67.99.120:3847/health"
add_monitor "[Internal] Ollama" "http://100.67.99.120:11434/api/tags"
add_monitor "[Internal] Beszel Hub" "http://100.77.124.12:8090"

echo ""
echo "Done! Check ${KUMA_URL} for monitor status."
