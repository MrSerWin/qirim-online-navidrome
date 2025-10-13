#!/bin/bash

# Quick server diagnostics script
# Usage: ./check-server.sh

SERVER="root@93.127.197.163"

echo "🔍 Checking Navidrome server status..."
echo ""

# Check if server is reachable
echo "1️⃣ Checking network connectivity..."
if ping -c 2 93.127.197.163 > /dev/null 2>&1; then
    echo "   ✅ Server is reachable"
else
    echo "   ❌ Server is NOT reachable"
    exit 1
fi
echo ""

# Check SSH connection
echo "2️⃣ Connecting to server via SSH..."
echo "   (You will be prompted for password)"
echo ""

ssh "${SERVER}" << 'ENDSSH'
    echo "   ✅ SSH connection successful"
    echo ""

    echo "3️⃣ Checking Docker status..."
    if ! command -v docker &> /dev/null; then
        echo "   ❌ Docker is not installed"
        exit 1
    fi
    echo "   ✅ Docker is installed"
    echo ""

    echo "4️⃣ Checking Navidrome directory..."
    if [ ! -d "/opt/navidrome" ]; then
        echo "   ❌ /opt/navidrome directory not found"
        exit 1
    fi
    cd /opt/navidrome
    echo "   ✅ Directory exists"
    echo ""

    echo "5️⃣ Checking Docker Compose file..."
    if [ ! -f "docker-compose.yml" ]; then
        echo "   ❌ docker-compose.yml not found"
        exit 1
    fi
    echo "   ✅ docker-compose.yml exists"
    echo ""

    echo "6️⃣ Container status:"
    docker compose ps
    echo ""

    echo "7️⃣ Recent logs (last 20 lines):"
    docker compose logs --tail=20 navidrome
    echo ""

    echo "8️⃣ Checking if container is running..."
    if docker compose ps | grep -q "navidrome.*Up"; then
        echo "   ✅ Container is running"
    else
        echo "   ❌ Container is NOT running"
        echo ""
        echo "   Attempting to start container..."
        docker compose up -d navidrome
        sleep 3
        echo ""
        echo "   New status:"
        docker compose ps navidrome
    fi
    echo ""

    echo "9️⃣ Checking running processes..."
    ps aux | grep navidrome | grep -v grep || echo "   No navidrome process found"
    echo ""

    echo "🔟 Checking ports..."
    netstat -tlnp | grep 4533 || ss -tlnp | grep 4533 || echo "   Port 4533 not listening"
    echo ""
ENDSSH

if [ $? -eq 0 ]; then
    echo "✅ Diagnostics completed successfully"
else
    echo "❌ Diagnostics failed"
    exit 1
fi
