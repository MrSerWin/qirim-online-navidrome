#!/bin/bash

# Restart Navidrome Docker container
# Usage: ./restart.sh

set -e

echo "🔄 Restarting Navidrome..."

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found"
    echo "Please run this script from the navidrome directory"
    exit 1
fi

# Restart the container
docker compose restart navidrome

echo "✅ Navidrome restarted successfully"
echo ""
echo "📊 Container status:"
docker compose ps navidrome

echo ""
echo "📝 Recent logs:"
docker compose logs --tail=20 navidrome
