#!/bin/bash

# Manual deployment script with password prompt
# Usage: SERVER_IP=root@YOUR_SERVER_IP ./deploy-manual.sh

set -e

SERVER="${SERVER_IP:-root@YOUR_SERVER_IP}"
IMAGE_NAME="navidrome-qo:latest"
TEMP_FILE="/tmp/navidrome-qo-latest.tar"

echo "🚀 Manual Navidrome Deployment"
echo "================================="
echo ""
echo "This script will guide you through deploying Navidrome to your server."
echo "You will be prompted for your SSH password multiple times."
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."
echo ""

# Step 1: Check if image exists
if ! docker images | grep -q "navidrome-qo.*latest"; then
    echo "❌ Error: Image 'navidrome-qo:latest' not found"
    echo "Please build the image first: ./build-image.sh"
    exit 1
fi

# Step 2: Save image
echo "💾 Step 1/3: Saving Docker image to tar file..."
docker save -o "${TEMP_FILE}" "${IMAGE_NAME}"
SIZE=$(ls -lh "${TEMP_FILE}" | awk '{print $5}')
echo "✅ Image saved (${SIZE})"
echo ""

# Step 3: Transfer to server
echo "📤 Step 2/3: Transferring image to server..."
echo "You will be prompted for your SSH password..."
scp "${TEMP_FILE}" "${SERVER}:/tmp/" || {
    echo "❌ Transfer failed. Please check:"
    echo "  1. Server is accessible"
    echo "  2. You have the correct password"
    echo "  3. SSH is configured properly"
    rm "${TEMP_FILE}"
    exit 1
}
echo "✅ Image transferred"
echo ""

# Step 4: Load and restart on server
echo "📥 Step 3/3: Loading image and restarting container on server..."
echo "You will be prompted for your SSH password again..."
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

if [ $? -ne 0 ]; then
    echo "❌ Failed to load image on server"
    rm "${TEMP_FILE}"
    exit 1
fi

echo "✅ Container restarted on server"
echo ""

# Step 5: Cleanup
echo "🧹 Cleaning up local files..."
rm "${TEMP_FILE}"
echo "✅ Cleanup complete"
echo ""

echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Your Navidrome should now be running with the fix at:"
echo "   https://qirim.cloud"
echo ""
echo "💡 If you still see the error, clear your browser cache (Ctrl+Shift+R or Cmd+Shift+R)"
