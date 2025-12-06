#!/bin/bash
#
# Deploy YouTube Sync Script to Production Server
# Uploads sync.py, requirements.txt, and config.prod.json
#

set -e

SERVER="root@SERVER_IP_OR_HOSTNAME"
REMOTE_DIR="/opt/navidrome/youtube-sync"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SYNC_DIR="$SCRIPT_DIR/youtube-sync"

echo "=== Deploying YouTube Sync to Production ==="
echo ""

# Check if files exist
if [ ! -f "$SYNC_DIR/sync.py" ]; then
    echo "Error: sync.py not found in $SYNC_DIR"
    exit 1
fi

if [ ! -f "$SYNC_DIR/config.prod.json" ]; then
    echo "Error: config.prod.json not found in $SYNC_DIR"
    exit 1
fi

# Create remote directory
echo "Creating remote directory..."
ssh $SERVER "mkdir -p $REMOTE_DIR"

# Upload files
echo "Uploading sync.py..."
scp "$SYNC_DIR/sync.py" "$SERVER:$REMOTE_DIR/sync.py"

echo "Uploading requirements.txt..."
scp "$SYNC_DIR/requirements.txt" "$SERVER:$REMOTE_DIR/requirements.txt"

echo "Uploading config.prod.json as config.json..."
scp "$SYNC_DIR/config.prod.json" "$SERVER:$REMOTE_DIR/config.json"

# Install dependencies and set up on server
echo ""
echo "Setting up Python environment on server..."
ssh $SERVER << 'EOF'
cd /opt/navidrome/youtube-sync

# Check if python3 is available
if ! command -v python3 &> /dev/null; then
    echo "Installing Python3..."
    apt-get update && apt-get install -y python3 python3-pip python3-venv
fi

# Create virtual environment if not exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Install dependencies
echo "Installing Python dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Make sync.py executable
chmod +x sync.py

echo ""
echo "Setup complete!"
echo ""
echo "To run sync manually:"
echo "  cd /opt/navidrome/youtube-sync"
echo "  source venv/bin/activate"
echo "  python sync.py --check      # Check config"
echo "  python sync.py --dry-run    # Preview what would be added"
echo "  python sync.py              # Run full sync"
echo ""
echo "To add to crontab for daily sync:"
echo "  crontab -e"
echo "  Add: 0 3 * * * cd /opt/navidrome/youtube-sync && source venv/bin/activate && python sync.py >> sync.log 2>&1"
EOF

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Connect to server and run:"
echo "  cd /opt/navidrome/youtube-sync"
echo "  source venv/bin/activate"
echo "  python sync.py --check"
