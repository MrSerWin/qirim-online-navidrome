#!/bin/bash
# ============================================================
# List all sites managed by nginx on this server
# Run on server: bash /opt/navidrome/scripts/list-sites.sh
# ============================================================

CONF_DIR="/etc/nginx/conf.d"

echo "============================================================"
echo " Sites on this server"
echo "============================================================"
echo ""

printf "%-35s %-25s %s\n" "DOMAIN" "BACKEND" "CONFIG"
printf "%-35s %-25s %s\n" "------" "-------" "------"

for conf in "${CONF_DIR}"/*.conf; do
    [ -f "$conf" ] || continue
    FILENAME=$(basename "$conf")

    # Skip common/shared configs
    [[ "$FILENAME" == "00-"* ]] && continue

    # Extract server_name from HTTPS block (443)
    DOMAINS=$(grep -A1 "listen 443" "$conf" 2>/dev/null | grep "server_name" | sed 's/.*server_name //;s/;//' | head -1)
    [ -z "$DOMAINS" ] && continue

    # Extract proxy_pass
    BACKEND=$(grep "proxy_pass" "$conf" 2>/dev/null | head -1 | sed 's/.*proxy_pass //;s/;//;s/^ *//')

    # Check SSL cert expiry
    FIRST_DOMAIN=$(echo "$DOMAINS" | awk '{print $1}')
    CERT_FILE="/etc/letsencrypt/live/${FIRST_DOMAIN}/fullchain.pem"
    if [ -f "$CERT_FILE" ]; then
        EXPIRY=$(openssl x509 -noout -enddate -in "$CERT_FILE" 2>/dev/null | cut -d= -f2)
        DAYS_LEFT=$(( ($(date -d "$EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$EXPIRY" +%s 2>/dev/null) - $(date +%s)) / 86400 ))
        if [ "$DAYS_LEFT" -lt 14 ]; then
            SSL_STATUS="SSL: ${DAYS_LEFT}d !!!"
        else
            SSL_STATUS="SSL: ${DAYS_LEFT}d"
        fi
    else
        SSL_STATUS="NO CERT"
    fi

    printf "%-35s %-25s %s  [%s]\n" "$FIRST_DOMAIN" "$BACKEND" "$FILENAME" "$SSL_STATUS"
done

echo ""
