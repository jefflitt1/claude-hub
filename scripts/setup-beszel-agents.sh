#!/bin/bash
# Beszel Agent Setup Script
# Run this after creating admin account in Beszel UI and getting the public key

# Usage: ./setup-beszel-agents.sh "YOUR_PUBLIC_KEY_FROM_BESZEL_UI"

KEY="$1"

if [ -z "$KEY" ]; then
    echo "Usage: $0 'YOUR_PUBLIC_KEY_FROM_BESZEL_UI'"
    echo ""
    echo "Steps:"
    echo "1. Open http://100.77.124.12:8090 (Tailscale) or http://jeffn8nhost:8090"
    echo "2. Create admin account"
    echo "3. Click 'Add System' → Copy the public key shown"
    echo "4. Run: $0 'paste-key-here'"
    exit 1
fi

echo "Setting up Beszel agents with provided key..."

# Pi Agent
echo ""
echo "=== Setting up Pi Agent (jeffn8nhost) ==="
ssh root@100.77.124.12 "docker rm -f beszel-agent 2>/dev/null; docker run -d \
  --name beszel-agent \
  --restart unless-stopped \
  --network host \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -e PORT=45876 \
  -e KEY='$KEY' \
  henrygd/beszel-agent:latest"

if [ $? -eq 0 ]; then
    echo "✅ Pi agent started"
else
    echo "❌ Pi agent failed"
fi

# Mac Studio Agent
echo ""
echo "=== Setting up Mac Studio Agent ==="
ssh jgl@100.67.99.120 "source ~/.zshrc 2>/dev/null; docker rm -f beszel-agent 2>/dev/null; docker run -d \
  --name beszel-agent \
  --restart unless-stopped \
  --network host \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -e PORT=45876 \
  -e KEY='$KEY' \
  henrygd/beszel-agent:latest"

if [ $? -eq 0 ]; then
    echo "✅ Mac Studio agent started"
else
    echo "❌ Mac Studio agent failed"
fi

echo ""
echo "=== Agent Status ==="
echo "Pi:"
ssh root@100.77.124.12 "docker ps --filter name=beszel-agent --format '  {{.Names}} - {{.Status}}'"
echo "Mac Studio:"
ssh jgl@100.67.99.120 "source ~/.zshrc 2>/dev/null; docker ps --filter name=beszel-agent --format '  {{.Names}} - {{.Status}}'"

echo ""
echo "Now add systems in Beszel UI:"
echo "  Pi:         100.77.124.12:45876 (hostname: jeffn8nhost)"
echo "  Mac Studio: 100.67.99.120:45876 (hostname: mac-studio)"
