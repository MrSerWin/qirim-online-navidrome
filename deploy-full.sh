#!/bin/bash

# Complete deployment script: build, push, and restart on server
# Usage: ./deploy-full.sh

set -e

SERVER="root@93.127.197.163"
IMAGE_NAME="navidrome-qo:latest"
TEMP_FILE="/tmp/navidrome-qo-latest.tar"
REMOTE_DIR="/opt/navidrome"

echo "🚀 Complete Navidrome Deployment"
echo "================================="
echo ""

# Step 1: Build image
echo "📦 Step 1/5: Building Docker image locally..."
./build-image.sh
echo ""

# Step 2: Save image
echo "💾 Step 2/5: Saving Docker image to tar file..."
docker save -o "${TEMP_FILE}" "${IMAGE_NAME}"
SIZE=$(ls -lh "${TEMP_FILE}" | awk '{print $5}')
echo "✅ Image saved (${SIZE})"
echo ""

# Step 3: Transfer to server
echo "📤 Step 3/5: Transferring image to server..."
echo "This may take a few minutes depending on your connection..."
scp "${TEMP_FILE}" "${SERVER}:/tmp/"
echo "✅ Image transferred"
echo ""

# Step 4: Load and restart on server
echo "📥 Step 4/5: Loading image and restarting container on server..."
ssh "${SERVER}" << 'ENDSSH'
    set -e

    echo "  → Loading Docker image..."
    docker load -i /tmp/navidrome-qo-latest.tar

    echo "  → Cleaning up temp file..."
    rm /tmp/navidrome-qo-latest.tar

    echo "  → Navigating to Navidrome directory..."
    cd /opt/navidrome

    echo "  → Restarting container..."
    docker compose up -d --force-recreate navidrome

    echo "  → Waiting for container to be healthy..."
    sleep 5

    echo "  → Container status:"
    docker compose ps navidrome
ENDSSH
echo "✅ Container restarted on server"
echo ""

# Step 5: Cleanup local temp file
echo "🧹 Step 5/5: Cleaning up local files..."
rm "${TEMP_FILE}"
echo "✅ Cleanup complete"
echo ""

echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Your Navidrome should now be running with the fix at:"
echo "   https://qirim.cloud"
echo ""
echo "💡 If you still see the error, clear your browser cache (Ctrl+Shift+R or Cmd+Shift+R)"
