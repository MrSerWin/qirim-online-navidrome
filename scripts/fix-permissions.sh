#!/bin/bash

# Fix permissions for all scripts in /opt/navidrome/scripts
# Run this on the server after deployment

set -e

SCRIPTS_DIR="/opt/navidrome/scripts"

echo "=== Fixing script permissions ==="

# Make all .sh files executable
chmod +x "$SCRIPTS_DIR"/*.sh

echo "Permissions fixed for:"
ls -la "$SCRIPTS_DIR"/*.sh

echo "=== Done! ==="
