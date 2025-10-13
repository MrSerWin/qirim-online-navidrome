#!/bin/bash

# Push Navidrome Docker image to server
# This script saves the image locally, transfers it via SSH, and loads it on the server

set -e

# Configuration
SERVER="root@93.127.197.163"
IMAGE_NAME="navidrome-qo:latest"
TEMP_FILE="/tmp/navidrome-qo-latest.tar"

echo "📦 Pushing Navidrome image to server..."
echo ""

# Check if image exists
if ! docker images | grep -q "navidrome-qo"; then
    echo "❌ Error: Image 'navidrome-qo:latest' not found"
    echo "Please build the image first: ./build-image.sh"
    exit 1
fi

# Step 1: Save image to tar file
echo "💾 Step 1/3: Saving Docker image to tar file..."
docker save -o "${TEMP_FILE}" "${IMAGE_NAME}"
echo "✅ Image saved: ${TEMP_FILE}"
echo ""

# Step 2: Transfer to server
echo "📤 Step 2/3: Transferring image to server (this may take a few minutes)..."
scp "${TEMP_FILE}" "${SERVER}:/tmp/"
echo "✅ Image transferred to server"
echo ""

# Step 3: Load image on server
echo "📥 Step 3/3: Loading image on server..."
ssh "${SERVER}" "docker load -i /tmp/navidrome-qo-latest.tar && rm /tmp/navidrome-qo-latest.tar"
echo "✅ Image loaded on server"
echo ""

# Cleanup local temp file
rm "${TEMP_FILE}"
echo "🧹 Cleaned up local temp file"
echo ""

echo "✅ Done! Image is now available on the server"
echo ""
echo "🚀 Next steps:"
echo "   1. SSH to server: ssh ${SERVER}"
echo "   2. Navigate to Navidrome directory: cd /opt/navidrome"
echo "   3. Update docker-compose.yml to use: navidrome-qo:latest"
echo "   4. Restart container: docker compose up -d --force-recreate"
echo ""
echo "Or run the complete deployment script on the server."
