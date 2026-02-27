#!/bin/bash
# ============================================================
# Add a new site with nginx reverse proxy + SSL
# Run on server: bash /opt/navidrome/scripts/add-site.sh <domain> <backend>
#
# Examples:
#   bash /opt/navidrome/scripts/add-site.sh myapp.qirim.online localhost:3000
#   bash /opt/navidrome/scripts/add-site.sh myapp.qirim.online localhost:3000 --prefix 30
#   bash /opt/navidrome/scripts/add-site.sh myapp.qirim.online localhost:3000 --websocket
#
# What it does:
#   1. Validates domain DNS points to this server
#   2. Creates nginx HTTP config (for certbot)
#   3. Obtains SSL certificate via Let's Encrypt
#   4. Deploys full HTTPS reverse proxy config
#   5. Adds domain to cert renewal list
#   6. Verifies everything works
#
# To remove a site later:
#   bash /opt/navidrome/scripts/remove-site.sh <domain>
# ============================================================

set -euo pipefail

# ── Defaults ──────────────────────────────────────────────
PREFIX="50"
WEBSOCKET=false
CERTBOT_WEBROOT="/var/www/certbot"
CONF_DIR="/etc/nginx/conf.d"
SNIPPETS_DIR="/etc/nginx/snippets"
RENEW_SCRIPT="/opt/navidrome/scripts/renew-certs.sh"
SERVER_IP=$(curl -s --max-time 5 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')

# ── Parse arguments ───────────────────────────────────────
usage() {
    echo "Usage: $0 <domain> <backend> [options]"
    echo ""
    echo "Arguments:"
    echo "  domain    Domain name (e.g., myapp.qirim.online)"
    echo "  backend   Backend address (e.g., localhost:3000 or 172.17.0.2:8080)"
    echo ""
    echo "Options:"
    echo "  --prefix N    Nginx config file prefix number (default: 50)"
    echo "  --websocket   Enable WebSocket proxy support"
    echo "  --help        Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 blog.qirim.online localhost:4000"
    echo "  $0 api.example.com 127.0.0.1:8080 --prefix 35 --websocket"
    exit 1
}

if [ $# -lt 2 ]; then
    usage
fi

DOMAIN="$1"
BACKEND="$2"
shift 2

while [ $# -gt 0 ]; do
    case "$1" in
        --prefix)
            PREFIX="$2"
            shift 2
            ;;
        --websocket)
            WEBSOCKET=true
            shift
            ;;
        --help)
            usage
            ;;
        *)
            echo "ERROR: Unknown option: $1"
            usage
            ;;
    esac
done

# Sanitize domain for filename
DOMAIN_SLUG=$(echo "$DOMAIN" | tr '.' '-')
CONF_FILE="${CONF_DIR}/${PREFIX}-${DOMAIN_SLUG}.conf"

echo "============================================================"
echo " Add Site: ${DOMAIN}"
echo " Backend:  ${BACKEND}"
echo " Config:   ${CONF_FILE}"
echo " WebSocket: ${WEBSOCKET}"
echo "============================================================"
echo ""

# ── Pre-flight checks ────────────────────────────────────

# Check running as root
if [ "$(id -u)" -ne 0 ]; then
    echo "ERROR: Run as root (sudo bash $0 ...)"
    exit 1
fi

# Check nginx is installed
if ! command -v nginx &>/dev/null; then
    echo "ERROR: nginx not found"
    exit 1
fi

# Check certbot is installed
if ! command -v certbot &>/dev/null; then
    echo "ERROR: certbot not found. Install: apt install certbot -y"
    exit 1
fi

# Check config doesn't already exist
if [ -f "$CONF_FILE" ]; then
    echo "ERROR: Config already exists: ${CONF_FILE}"
    echo "Remove it first or use a different --prefix"
    exit 1
fi

# Check domain DNS
echo "[..] Checking DNS for ${DOMAIN}..."
DOMAIN_IP=$(dig +short "$DOMAIN" A 2>/dev/null | tail -1)
if [ -z "$DOMAIN_IP" ]; then
    echo "WARNING: Could not resolve ${DOMAIN}"
    echo "         Make sure DNS A record points to ${SERVER_IP}"
    read -r -p "Continue anyway? [y/N] " REPLY
    if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
        exit 1
    fi
elif [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
    echo "WARNING: ${DOMAIN} points to ${DOMAIN_IP}, but this server is ${SERVER_IP}"
    read -r -p "Continue anyway? [y/N] " REPLY
    if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "[OK] DNS: ${DOMAIN} → ${DOMAIN_IP}"
fi

# Check backend is reachable
echo "[..] Checking backend ${BACKEND}..."
BACKEND_HOST=$(echo "$BACKEND" | cut -d: -f1)
BACKEND_PORT=$(echo "$BACKEND" | cut -d: -f2)
if timeout 2 bash -c "echo >/dev/tcp/${BACKEND_HOST}/${BACKEND_PORT}" 2>/dev/null; then
    echo "[OK] Backend ${BACKEND} is reachable"
else
    echo "WARNING: Backend ${BACKEND} is not reachable right now"
    echo "         Make sure the service is running before testing the site"
fi

# ── Step 1: HTTP-only config for certbot ──────────────────
echo ""
echo "[..] Step 1: Deploying temporary HTTP config for certbot..."

cat > "$CONF_FILE" << EOF
# ${DOMAIN} — temporary HTTP-only config for certbot
server {
    listen 80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root ${CERTBOT_WEBROOT};
    }

    location / {
        return 503;
    }
}
EOF

nginx -t 2>/dev/null
systemctl reload nginx
echo "[OK] HTTP config deployed"

# ── Step 2: Obtain SSL certificate ────────────────────────
echo ""
echo "[..] Step 2: Obtaining SSL certificate..."

mkdir -p "$CERTBOT_WEBROOT"
certbot certonly \
    --webroot -w "$CERTBOT_WEBROOT" \
    -d "$DOMAIN" \
    --non-interactive \
    --agree-tos \
    --register-unsafely-without-email 2>/dev/null \
    || certbot certonly \
        --webroot -w "$CERTBOT_WEBROOT" \
        -d "$DOMAIN" \
        --non-interactive \
        --agree-tos

echo "[OK] SSL certificate obtained"

# ── Step 3: Deploy full HTTPS config ──────────────────────
echo ""
echo "[..] Step 3: Deploying full HTTPS config..."

# Build WebSocket block if needed
WS_BLOCK=""
if [ "$WEBSOCKET" = true ]; then
    WS_BLOCK="
        # WebSocket support
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
"
fi

cat > "$CONF_FILE" << EOF
# ============================================================
# ${DOMAIN}
# Backend: ${BACKEND}
# Added: $(date '+%Y-%m-%d')
# ============================================================

# HTTP → HTTPS redirect
server {
    listen 80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root ${CERTBOT_WEBROOT};
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS — reverse proxy
server {
    listen 443 ssl;
    http2 on;
    server_name ${DOMAIN};

    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    include ${SNIPPETS_DIR}/ssl-params.conf;
    include ${SNIPPETS_DIR}/security-headers.conf;

    access_log /var/log/nginx/${DOMAIN}.access.log;
    error_log  /var/log/nginx/${DOMAIN}.error.log;

    location / {
        proxy_pass http://${BACKEND};
        include ${SNIPPETS_DIR}/proxy-params.conf;
${WS_BLOCK}
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
EOF

nginx -t
systemctl reload nginx
echo "[OK] HTTPS config deployed"

# ── Step 4: Add domain to renewal script ──────────────────
echo ""
echo "[..] Step 4: Updating cert renewal list..."

if [ -f "$RENEW_SCRIPT" ]; then
    if grep -q "\"${DOMAIN}\"" "$RENEW_SCRIPT"; then
        echo "[OK] Domain already in renewal list"
    else
        # Insert before the closing parenthesis of DOMAINS array
        sed -i "/^)/i\\    \"${DOMAIN}\"" "$RENEW_SCRIPT"
        echo "[OK] Added ${DOMAIN} to ${RENEW_SCRIPT}"
    fi
else
    echo "[SKIP] Renewal script not found at ${RENEW_SCRIPT}"
fi

# ── Step 5: Verify ────────────────────────────────────────
echo ""
echo "============================================================"
echo " Verification"
echo "============================================================"

sleep 1
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN}/" --max-time 10 2>/dev/null || echo "000")
echo "https://${DOMAIN}/ → HTTP ${HTTP_CODE}"

# Check SSL certificate
CERT_EXPIRY=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN":443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
if [ -n "$CERT_EXPIRY" ]; then
    echo "SSL certificate expires: ${CERT_EXPIRY}"
fi

echo ""
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo "=== SUCCESS ==="
    echo "Site is live at: https://${DOMAIN}"
elif [ "$HTTP_CODE" = "502" ] || [ "$HTTP_CODE" = "503" ]; then
    echo "=== PARTIAL SUCCESS ==="
    echo "Nginx + SSL work, but backend ${BACKEND} is not responding."
    echo "Start your service and it will be available at: https://${DOMAIN}"
else
    echo "=== WARNING ==="
    echo "Got HTTP ${HTTP_CODE}. Debug:"
    echo "  nginx -t"
    echo "  curl -I https://${DOMAIN}/"
    echo "  tail -20 /var/log/nginx/${DOMAIN}.error.log"
fi

echo ""
echo "Config file: ${CONF_FILE}"
echo "Access log:  /var/log/nginx/${DOMAIN}.access.log"
echo "Error log:   /var/log/nginx/${DOMAIN}.error.log"
