#!/bin/bash
# ============================================================
# SSL Certificate Renewal for all domains on VPS 93.127.197.163
# Runs via cron, uses host nginx (not Docker)
#
# Crontab:
#   0 3 * * * /opt/navidrome/scripts/renew-certs.sh >> /var/log/ssl-renew.log 2>&1
#
# Replaces: ssl-auto-renew.sh, sync-ssl-certs.sh
# ============================================================

set -euo pipefail

LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')]"

# All domains managed on this server
DOMAINS=(
    "qirim.online"
    "mail.qirim.online"
    "sevil.chat"
    # Uncomment after DNS is set and certs obtained:
    # "ana-yurt.dev"
    # "shareapp.ana-yurt.dev"
    # "qirim.cloud"
)

echo "$LOG_PREFIX Starting certificate renewal check..."

# Renew all certs (certbot only renews those expiring within 30 days)
certbot renew --quiet --deploy-hook "nginx -t && systemctl reload nginx"
RENEW_STATUS=$?

if [ $RENEW_STATUS -eq 0 ]; then
    echo "$LOG_PREFIX Certbot renew completed successfully"
else
    echo "$LOG_PREFIX ERROR: certbot renew failed with status $RENEW_STATUS"
fi

# Check certificate expiry dates
echo "$LOG_PREFIX Certificate expiry check:"
for domain in "${DOMAINS[@]}"; do
    CERT_FILE="/etc/letsencrypt/live/$domain/fullchain.pem"
    if [ -f "$CERT_FILE" ]; then
        EXPIRY=$(openssl x509 -noout -enddate -in "$CERT_FILE" 2>/dev/null | cut -d= -f2)
        DAYS_LEFT=$(( ($(date -d "$EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$EXPIRY" +%s 2>/dev/null) - $(date +%s)) / 86400 ))
        if [ "$DAYS_LEFT" -lt 14 ]; then
            echo "$LOG_PREFIX  WARNING: $domain expires in ${DAYS_LEFT} days ($EXPIRY)"
        else
            echo "$LOG_PREFIX  OK: $domain expires in ${DAYS_LEFT} days ($EXPIRY)"
        fi
    else
        echo "$LOG_PREFIX  SKIP: $domain - no certificate found"
    fi
done

echo "$LOG_PREFIX Done."
