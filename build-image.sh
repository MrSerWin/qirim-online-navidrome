#!/bin/bash

# Build Navidrome Docker image locally
# Usage: ./build-image.sh

set -e

echo "🏗️  Building Navidrome Docker image..."

# Get version info
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "dev")
GIT_TAG="v0.58.0-QO"

echo "📦 Version: ${GIT_TAG} (${GIT_SHA})"
echo ""

# Build the image for AMD64 (server architecture)
echo "🔧 Building for linux/amd64 platform (server architecture)..."
docker build \
  --platform linux/amd64 \
  -f Dockerfile.simple \
  --build-arg GIT_SHA="${GIT_SHA}" \
  --build-arg GIT_TAG="${GIT_TAG}" \
  -t navidrome-qo:latest \
  -t navidrome-qo:${GIT_TAG} \
  .

echo ""
echo "✅ Image built successfully!"
echo ""
echo "📊 Image info:"
docker images | grep navidrome-qo

echo ""
echo "🚀 To run locally:"
echo "   docker run -d -p 4533:4533 -v \$(pwd)/data:/data -v /path/to/music:/music navidrome-qo:latest"
echo ""
echo "📤 To push to server, update docker-compose.yml and run:"
echo "   docker compose up -d"
