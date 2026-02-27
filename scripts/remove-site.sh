#!/bin/bash
# ============================================================
# Remove a site: nginx config + optionally SSL certificate
# Run on server: bash /opt/navidrome/scripts/remove-site.sh <domain>
# ============================================================

set -euo pipefail

CONF_DIR="/etc/nginx/conf.d"
RENEW_SCRIPT="/opt/navidrome/scripts/renew-certs.sh"

if [ $# -lt 1 ]; then
    echo "Usage: $0 <domain>"
    echo "Example: $0 myapp.qirim.online"
    exit 1
fi

DOMAIN="$1"
DOMAIN_SLUG=$(echo "$DOMAIN" | tr '.' '-')

# Check running as root
if [ "$(id -u)" -ne 0 ]; then
    echo "ERROR: Run as root"
    exit 1
fi

echo "============================================================"
echo " Remove Site: ${DOMAIN}"
echo "============================================================"
echo ""

# Find and remove nginx config
FOUND_CONF=$(ls "${CONF_DIR}"/*-"${DOMAIN_SLUG}.conf" 2>/dev/null || true)

if [ -n "$FOUND_CONF" ]; then
    echo "Found config: ${FOUND_CONF}"
    rm "$FOUND_CONF"
    echo "[OK] Nginx config removed"
    nginx -t && systemctl reload nginx
    echo "[OK] Nginx reloaded"
else
    echo "[SKIP] No nginx config found for ${DOMAIN}"
fi

# Remove from renewal script
if [ -f "$RENEW_SCRIPT" ] && grep -q "\"${DOMAIN}\"" "$RENEW_SCRIPT"; then
    sed -i "/\"${DOMAIN}\"/d" "$RENEW_SCRIPT"
    echo "[OK] Removed from cert renewal list"
fi

# Ask about SSL certificate
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"
if [ -d "$CERT_DIR" ]; then
    echo ""
    read -r -p "Also delete SSL certificate for ${DOMAIN}? [y/N] " REPLY
    if [[ "$REPLY" =~ ^[Yy]$ ]]; then
        certbot delete --cert-name "$DOMAIN" --non-interactive
        echo "[OK] SSL certificate deleted"
    else
        echo "[SKIP] SSL certificate kept"
    fi
fi

# Remove log files
if ls /var/log/nginx/"${DOMAIN}".* &>/dev/null; then
    rm -f /var/log/nginx/"${DOMAIN}".*
    echo "[OK] Log files removed"
fi

echo ""
echo "=== Done ==="
echo "Site ${DOMAIN} has been removed."
