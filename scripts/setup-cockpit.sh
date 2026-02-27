#!/bin/bash
# ============================================================
# Setup Cockpit admin panel with nginx reverse proxy + SSL
# Run on server: bash /opt/navidrome/scripts/setup-cockpit.sh
# ============================================================

set -euo pipefail

DOMAIN="admin.qirim.online"
NGINX_CONF="/etc/nginx/conf.d/05-admin-cockpit.conf"
COCKPIT_CONF="/etc/cockpit/cockpit.conf"

echo "=== Cockpit Setup ==="

# 1. Check Cockpit is installed
if ! systemctl is-active --quiet cockpit.socket; then
    echo "ERROR: cockpit.socket is not running. Install first: apt install cockpit -y"
    exit 1
fi
echo "[OK] Cockpit is running"

# 2. Configure Cockpit for reverse proxy
echo "[..] Configuring Cockpit..."
mkdir -p /etc/cockpit
cat > "$COCKPIT_CONF" << EOF
[WebService]
Origins = https://${DOMAIN}
ProtocolHeader = X-Forwarded-Proto
AllowUnencrypted = false
EOF
systemctl restart cockpit.socket
echo "[OK] Cockpit configured for ${DOMAIN}"

# 3. Block direct access to port 9090 from outside
# (only allow localhost — nginx will proxy)
if command -v ufw &>/dev/null; then
    ufw deny 9090/tcp 2>/dev/null || true
    echo "[OK] Blocked port 9090 via ufw"
elif command -v iptables &>/dev/null; then
    # Drop external access to 9090, keep localhost
    iptables -C INPUT -p tcp --dport 9090 -s 127.0.0.1 -j ACCEPT 2>/dev/null || \
        iptables -I INPUT -p tcp --dport 9090 -s 127.0.0.1 -j ACCEPT
    iptables -C INPUT -p tcp --dport 9090 -j DROP 2>/dev/null || \
        iptables -A INPUT -p tcp --dport 9090 -j DROP
    echo "[OK] Blocked external access to port 9090 via iptables"
fi

# 4. Deploy nginx config (HTTP-only first, for certbot)
echo "[..] Setting up nginx (HTTP only for cert)..."
cat > "$NGINX_CONF" << 'NGINX'
# Cockpit — temporary HTTP-only config for certbot
server {
    listen 80;
    server_name admin.qirim.online;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 503;
    }
}
NGINX

nginx -t && systemctl reload nginx
echo "[OK] Nginx HTTP config deployed"

# 5. Get SSL certificate
echo "[..] Obtaining SSL certificate for ${DOMAIN}..."
certbot certonly --webroot -w /var/www/certbot -d "${DOMAIN}" --non-interactive --agree-tos
echo "[OK] SSL certificate obtained"

# 6. Deploy full nginx config with HTTPS
echo "[..] Deploying full nginx config..."
cp /opt/navidrome/nginx/conf.d/05-admin-cockpit.conf "$NGINX_CONF"
nginx -t && systemctl reload nginx
echo "[OK] Nginx HTTPS config deployed"

# 7. Verify
echo ""
echo "=== Verification ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN}/")
echo "https://${DOMAIN}/ → HTTP ${HTTP_CODE}"

if [ "$HTTP_CODE" = "200" ]; then
    echo ""
    echo "=== SUCCESS ==="
    echo "Cockpit is available at: https://${DOMAIN}"
    echo "Login with your server root/user credentials"
else
    echo ""
    echo "=== WARNING ==="
    echo "Got HTTP ${HTTP_CODE}. Check: nginx -t && journalctl -u cockpit"
fi
