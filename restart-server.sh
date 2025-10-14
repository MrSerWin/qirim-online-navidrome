#!/bin/bash

# Restart Navidrome on server
# Usage: SERVER_IP=root@YOUR_SERVER_IP ./restart-server.sh

SERVER="${SERVER_IP:-root@YOUR_SERVER_IP}"

echo "🔄 Restarting Navidrome on server..."
echo ""
echo "You will be prompted for your SSH password..."
echo ""

ssh "${SERVER}" << 'ENDSSH'
    echo "📍 Navigating to Navidrome directory..."
    cd /opt/navidrome

    echo "🛑 Stopping container..."
    docker compose stop navidrome

    echo "🚀 Starting container..."
    docker compose up -d navidrome

    echo ""
    echo "⏳ Waiting for container to be ready..."
    sleep 5

    echo ""
    echo "📊 Container status:"
    docker compose ps navidrome

    echo ""
    echo "📝 Recent logs:"
    docker compose logs --tail=10 navidrome
ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Restart completed!"
    echo ""
    echo "🌐 Check your site: https://qirim.cloud"
    echo "💡 Remember to clear browser cache (Cmd+Shift+R)"
else
    echo ""
    echo "❌ Restart failed"
    exit 1
fi
