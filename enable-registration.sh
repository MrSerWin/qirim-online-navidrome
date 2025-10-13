#!/bin/bash
set -e

SERVER="root@93.127.197.163"

echo "🔧 Enabling self-registration in Navidrome..."

ssh "${SERVER}" << 'ENDSSH'
    cd /opt/navidrome

    echo "=== Current environment variables ==="
    grep -A 20 "environment:" docker-compose.yml | grep -E "ND_|environment:" | head -20

    echo ""
    echo "=== Creating backup ==="
    cp docker-compose.yml docker-compose.yml.backup-$(date +%Y%m%d-%H%M%S)

    echo ""
    echo "=== Adding registration settings ==="

    # Check if ND_ENABLESELFREGISTRATION exists
    if grep -q "ND_ENABLESELFREGISTRATION" docker-compose.yml; then
        echo "ND_ENABLESELFREGISTRATION found, updating..."
        sed -i 's|ND_ENABLESELFREGISTRATION:.*|ND_ENABLESELFREGISTRATION: "true"|g' docker-compose.yml
    else
        echo "ND_ENABLESELFREGISTRATION not found, adding..."
        sed -i '/ND_UIWELCOMEMESSAGE:/a\      ND_ENABLESELFREGISTRATION: "true"' docker-compose.yml
    fi

    # Also add other settings from your config
    if ! grep -q "ND_DEFAULTTHEME" docker-compose.yml; then
        sed -i '/ND_ENABLESELFREGISTRATION:/a\      ND_DEFAULTTHEME: "NordTheme"' docker-compose.yml
    fi

    if ! grep -q "ND_ENABLEDOWNLOADS" docker-compose.yml; then
        sed -i '/ND_DEFAULTTHEME:/a\      ND_ENABLEDOWNLOADS: "false"' docker-compose.yml
    fi

    echo ""
    echo "=== Updated environment variables ==="
    grep -A 25 "environment:" docker-compose.yml | grep -E "ND_|environment:" | head -30

    echo ""
    echo "=== Restarting Navidrome ==="
    docker compose up -d navidrome

    echo ""
    echo "=== Waiting 5 seconds ==="
    sleep 5

    echo ""
    echo "=== Checking environment in running container ==="
    docker exec navidrome-qo env | grep ND_ | sort

    echo ""
    echo "=== Recent logs ==="
    docker compose logs --tail=20 navidrome
ENDSSH

echo ""
echo "✅ Self-registration enabled!"
echo "🌐 Check: https://qirim.cloud"
