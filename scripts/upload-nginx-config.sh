#!/bin/bash

# Upload nginx configuration to server and reload
# This script uploads the nginx config and reloads nginx to apply cache headers

set -e

SERVER="root@93.127.197.163"
NGINX_CONFIG="nginx/nginx-qirim-online.conf"
REMOTE_PATH="/opt/navidrome/nginx/nginx-qirim-online.conf"

echo "Uploading nginx configuration to server..."
scp "$NGINX_CONFIG" "$SERVER:$REMOTE_PATH"

echo "Testing nginx configuration..."
ssh "$SERVER" 'cd /opt/navidrome && docker compose -f docker-compose.qirim-online.yml exec nginx nginx -t'

echo "Reloading nginx..."
ssh "$SERVER" 'cd /opt/navidrome && docker compose -f docker-compose.qirim-online.yml exec nginx nginx -s reload'

echo "✓ Nginx configuration updated and reloaded successfully!"
echo ""
echo "Cache headers are now configured:"
echo "  - JS/CSS/Fonts with hash: 1 year (immutable)"
echo "  - Images: 1 year"
echo "  - Service Worker: 1 hour (with revalidation)"
echo "  - HTML: 1 hour (with revalidation)"
