#!/bin/bash
# ============================================================
# Replace Cockpit with Portainer CE (Docker Management UI)
# Run on server: bash /opt/navidrome/scripts/setup-portainer.sh
# ============================================================

set -euo pipefail

DOMAIN="admin.qirim.online"
NGINX_CONF="/etc/nginx/conf.d/05-admin-cockpit.conf"
NGINX_NEW_CONF="/etc/nginx/conf.d/05-admin-portainer.conf"
PORTAINER_DATA="/opt/portainer/data"

echo "=== Portainer Setup ==="

# 1. Stop and disable Cockpit
echo "[..] Removing Cockpit..."
systemctl stop cockpit.socket cockpit 2>/dev/null || true
systemctl disable cockpit.socket 2>/dev/null || true
echo "[OK] Cockpit stopped and disabled"

# 2. Remove old Cockpit nginx config
if [ -f "$NGINX_CONF" ]; then
    rm "$NGINX_CONF"
    echo "[OK] Removed old Cockpit nginx config"
fi

# 3. Create Portainer data directory
mkdir -p "$PORTAINER_DATA"
echo "[OK] Portainer data directory created"

# 4. Stop existing Portainer if running
docker stop portainer 2>/dev/null || true
docker rm portainer 2>/dev/null || true

# 5. Start Portainer CE container
echo "[..] Starting Portainer CE..."
docker run -d \
    --name portainer \
    --restart=always \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v "$PORTAINER_DATA":/data \
    -p 127.0.0.1:9000:9000 \
    portainer/portainer-ce:latest

echo "[OK] Portainer container started"

# 6. Deploy nginx config
echo "[..] Deploying nginx config..."
cp /opt/navidrome/nginx/conf.d/05-admin-portainer.conf "$NGINX_NEW_CONF"
nginx -t && systemctl reload nginx
echo "[OK] Nginx config deployed"

# 7. Wait for Portainer to start
echo "[..] Waiting for Portainer to start..."
for i in {1..15}; do
    if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:9000/ | grep -q "200\|302"; then
        break
    fi
    sleep 1
done
echo "[OK] Portainer is running"

# 8. Verify
echo ""
echo "=== Verification ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN}/")
echo "https://${DOMAIN}/ → HTTP ${HTTP_CODE}"

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ]; then
    echo ""
    echo "=== SUCCESS ==="
    echo "Portainer is available at: https://${DOMAIN}"
    echo ""
    echo "IMPORTANT: Open https://${DOMAIN} NOW and create your admin account!"
    echo "The first user to register becomes the admin."
    echo "If you wait too long, Portainer will require restart for security."
else
    echo ""
    echo "=== WARNING ==="
    echo "Got HTTP ${HTTP_CODE}. Check: docker logs portainer"
fi
