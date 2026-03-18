#!/bin/bash
set -euo pipefail

# ─── Navidrome QO Deploy Script (qirim.online) ────────────────────────────────
# Builds Docker image (linux/amd64), uploads to server, and restarts.
# Uses SSH ControlMaster to authenticate only once.
# Usage: ./rebuild-and-deploy-qirim-online.sh

SERVER="root@93.127.197.163"
REMOTE_DIR="/opt/navidrome"
IMAGE_NAME="navidrome-qo:latest"
TMP_FILE="/tmp/navidrome-qo-qirim-online.tar.gz"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ─── SSH ControlMaster (single auth for entire script) ────────────────────────
SSH_SOCK="/tmp/navidrome-deploy-$$"
ssh -fNM -S "$SSH_SOCK" "$SERVER"
trap 'ssh -S "$SSH_SOCK" -O exit "$SERVER" 2>/dev/null; rm -f "$TMP_FILE"' EXIT
SSH="ssh -S $SSH_SOCK $SERVER"
SCP="scp -o ControlPath=$SSH_SOCK"

cd "$SCRIPT_DIR"

echo "══════════════════════════════════════════════════"
echo "  Navidrome QO — Deploy (qirim.online)"
echo "══════════════════════════════════════════════════"

# ─── 1. Build ────────────────────────────────────────────────────────────────
echo ""
echo "▸ [1/5] Building Docker image (linux/amd64)..."
./build-image.sh

# ─── 2. Save & compress ─────────────────────────────────────────────────────
echo ""
echo "▸ [2/5] Saving and compressing image..."
docker save "$IMAGE_NAME" | gzip > "$TMP_FILE"
SIZE=$(du -h "$TMP_FILE" | cut -f1)
echo "  Image size: $SIZE"

# ─── 3. Upload ───────────────────────────────────────────────────────────────
echo ""
echo "▸ [3/5] Uploading to server..."
$SCP "$TMP_FILE" "$SERVER:$REMOTE_DIR/"

# ─── 4. Load & restart ───────────────────────────────────────────────────────
echo ""
echo "▸ [4/5] Loading image and restarting..."
$SSH bash -s <<'REMOTE'
cd /opt/navidrome
docker load < navidrome-qo-qirim-online.tar.gz
rm -f navidrome-qo-qirim-online.tar.gz
docker compose -f docker-compose.qirim-online.yml stop navidrome
docker compose -f docker-compose.qirim-online.yml up -d navidrome
REMOTE

# ─── 5. Verify ───────────────────────────────────────────────────────────────
echo ""
echo "▸ [5/5] Checking status..."
sleep 10
$SSH bash -s <<'REMOTE'
cd /opt/navidrome
echo "Container:"
docker compose -f docker-compose.qirim-online.yml ps navidrome
echo ""
echo "Logs:"
docker compose -f docker-compose.qirim-online.yml logs --tail 30 navidrome
REMOTE

# ─── Cleanup ──────────────────────────────────────────────────────────────────
echo "▸ Cleaning up local files..."
docker builder prune -f 2>/dev/null || true

echo ""
echo "══════════════════════════════════════════════════"
echo "  Deploy complete!"
echo "  https://qirim.online"
echo "══════════════════════════════════════════════════"
