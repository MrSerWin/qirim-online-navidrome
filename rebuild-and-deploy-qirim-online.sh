#!/bin/bash
set -e

SERVER="${SERVER_IP:-root@93.127.197.163}"
IMAGE_NAME="navidrome-qo:latest"
TEMP_FILE="/tmp/navidrome-qo-qirim-online.tar"

echo "🏗️  Step 1: Building AMD64 image..."
./build-image.sh

echo ""
echo "💾 Step 2: Saving Docker image..."
docker save -o "${TEMP_FILE}" "${IMAGE_NAME}"
ls -lh "${TEMP_FILE}"

echo ""
echo "📤 Step 3: Transferring image to server (this may take a few minutes)..."
scp "${TEMP_FILE}" "${SERVER}:/tmp/"

echo ""
echo "🚀 Step 4: Loading and restarting on server..."
ssh root@93.127.197.163 << 'ENDSSH'
    echo "Loading image..."
    docker load -i /tmp/navidrome-qo-qirim-online.tar

    echo "Cleaning up tar file..."
    rm /tmp/navidrome-qo-qirim-online.tar

    echo "Navigating to Navidrome directory..."
    cd /opt/navidrome

    echo "Stopping containers..."
    docker compose -f docker-compose.qirim-online.yml stop

    echo "Starting with new image..."
    docker compose -f docker-compose.qirim-online.yml up -d

    echo "Waiting 10 seconds..."
    sleep 10

    echo ""
    echo "=== Container Status ==="
    docker compose -f docker-compose.qirim-online.yml ps

    echo ""
    echo "=== Recent Logs ==="
    docker compose -f docker-compose.qirim-online.yml logs --tail=30 navidrome
ENDSSH

echo ""
echo "🧹 Step 5: Cleaning up local tar file..."
rm "${TEMP_FILE}"

echo ""
echo "✅ Deployment complete!"
echo "🌐 Check: https://qirim.online"
